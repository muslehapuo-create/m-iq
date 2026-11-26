import { jsPDF } from 'jspdf';
import type { Timestamp } from 'firebase/firestore';
import {
  DEFAULT_TOPIC_STYLE,
  formatBytes,
  ITEMU_ASSIGNMENT_TYPE_LABELS,
  ITEMU_STATUS_META,
  type ITemuRecord,
  type TopicFontFamily,
  type TopicFontSize,
  type TopicStyle,
  type TopicTextAlign,
} from '../types/miq';

interface InlineRun {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  rgb: [number, number, number];
}

interface ParsedBlock {
  align: TopicTextAlign;
  bulletPrefix?: string;
  isHeading?: boolean;
  runs: InlineRun[];
}

interface WordToken {
  word: string;
  width: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  rgb: [number, number, number];
}

function normalizePdfText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '*')
    .replace(/\u00A0/g, ' ');
}

function parseColorToRgb(
  colorStr: string | undefined,
  fallback: [number, number, number]
): [number, number, number] {
  if (!colorStr) return fallback;
  const trimmed = colorStr.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return [
      parseInt(trimmed.slice(1, 3), 16),
      parseInt(trimmed.slice(3, 5), 16),
      parseInt(trimmed.slice(5, 7), 16),
    ];
  }
  const rgbMatch = trimmed.match(
    /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
  );
  if (rgbMatch) {
    return [
      Math.min(255, Number(rgbMatch[1])),
      Math.min(255, Number(rgbMatch[2])),
      Math.min(255, Number(rgbMatch[3])),
    ];
  }
  return fallback;
}

function mapFontFamily(fam?: TopicFontFamily): 'helvetica' | 'times' | 'courier' {
  switch (fam) {
    case 'serif':
    case 'editorial':
      return 'times';
    case 'mono':
      return 'courier';
    case 'sans':
    default:
      return 'helvetica';
  }
}

function mapFontSizePt(sz?: TopicFontSize): number {
  switch (sz) {
    case 'sm':
      return 9.2;
    case 'lg':
      return 11.0;
    case 'xl':
      return 12.0;
    case 'base':
    default:
      return 10.0;
  }
}

function extractInlineStyle(
  el: Element,
  inherited: Omit<InlineRun, 'text'>
): Omit<InlineRun, 'text'> {
  const next = { ...inherited };
  const tag = el.tagName.toUpperCase();
  if (
    tag === 'STRONG' ||
    tag === 'B' ||
    tag === 'H1' ||
    tag === 'H2' ||
    tag === 'H3' ||
    tag === 'H4'
  ) {
    next.bold = true;
  }
  if (tag === 'EM' || tag === 'I') {
    next.italic = true;
  }
  if (tag === 'U') {
    next.underline = true;
  }
  const styleAttr = el.getAttribute('style') || '';
  const colorMatch = styleAttr.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
  if (colorMatch) {
    next.rgb = parseColorToRgb(colorMatch[1], next.rgb);
  }
  const fontColorAttr = el.getAttribute('color');
  if (fontColorAttr) {
    next.rgb = parseColorToRgb(fontColorAttr, next.rgb);
  }
  return next;
}

function extractBlockAlign(el: Element, defaultAlign: TopicTextAlign): TopicTextAlign {
  const styleAttr = el.getAttribute('style') || '';
  const match = styleAttr.match(/text-align\s*:\s*(left|right|center|justify)/i);
  if (match) {
    return match[1].toLowerCase() as TopicTextAlign;
  }
  return defaultAlign;
}

function collectRuns(node: Node, style: Omit<InlineRun, 'text'>, out: InlineRun[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    const val = normalizePdfText(node.textContent || '');
    if (val.length > 0) {
      out.push({ text: val, ...style });
    }
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  const tag = el.tagName.toUpperCase();
  if (tag === 'BR') {
    out.push({ text: '\n', ...style });
    return;
  }
  const nextStyle = extractInlineStyle(el, style);
  for (const child of Array.from(el.childNodes)) {
    collectRuns(child, nextStyle, out);
  }
}

function parseHtmlToBlocks(
  html: string,
  defaultAlign: TopicTextAlign,
  defaultRgb: [number, number, number]
): ParsedBlock[] {
  const baseRunStyle: Omit<InlineRun, 'text'> = {
    bold: false,
    italic: false,
    underline: false,
    rgb: defaultRgb,
  };

  if (!html || !html.trim()) return [];
  if (!/<[a-z][\s\S]*>/i.test(html) || typeof DOMParser === 'undefined') {
    return html
      .split(/\n{1,}/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({
        align: defaultAlign,
        runs: [{ text: normalizePdfText(line), ...baseRunStyle }],
      }));
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks: ParsedBlock[] = [];

  const pushBlock = (
    runs: InlineRun[],
    align: TopicTextAlign,
    bulletPrefix?: string,
    isHeading?: boolean
  ) => {
    const hasText = runs.some((r) => r.text.trim().length > 0);
    if (hasText) {
      blocks.push({ align, bulletPrefix, isHeading, runs });
    }
  };

  const walkBlock = (el: Element, listContext?: { ordered: boolean; index: number }) => {
    const tag = el.tagName.toUpperCase();
    if (tag === 'UL' || tag === 'OL') {
      let idx = 1;
      for (const child of Array.from(el.children)) {
        if (child.tagName.toUpperCase() === 'LI') {
          walkBlock(child, { ordered: tag === 'OL', index: idx });
          idx += 1;
        }
      }
      return;
    }

    if (tag === 'LI') {
      const runs: InlineRun[] = [];
      const align = extractBlockAlign(el, defaultAlign);
      const liStyle = extractInlineStyle(el, baseRunStyle);
      for (const child of Array.from(el.childNodes)) {
        collectRuns(child, liStyle, runs);
      }
      const prefix = listContext?.ordered ? `${listContext.index}. ` : '- ';
      pushBlock(runs, align, prefix);
      return;
    }

    if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE'].includes(tag)) {
      const hasChildBlocks = Array.from(el.children).some((c) =>
        ['P', 'DIV', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE'].includes(
          c.tagName.toUpperCase()
        )
      );
      if (hasChildBlocks) {
        for (const child of Array.from(el.childNodes)) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            walkBlock(child as Element);
          } else if (child.nodeType === Node.TEXT_NODE && (child.textContent || '').trim()) {
            pushBlock(
              [{ text: normalizePdfText(child.textContent!.trim()), ...baseRunStyle }],
              extractBlockAlign(el, defaultAlign)
            );
          }
        }
        return;
      }

      const runs: InlineRun[] = [];
      const align = extractBlockAlign(el, defaultAlign);
      const blockStyle = extractInlineStyle(el, baseRunStyle);
      for (const child of Array.from(el.childNodes)) {
        collectRuns(child, blockStyle, runs);
      }
      pushBlock(
        runs,
        align,
        undefined,
        tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H4'
      );
      return;
    }

    const runs: InlineRun[] = [];
    collectRuns(el, extractInlineStyle(el, baseRunStyle), runs);
    pushBlock(runs, defaultAlign);
  };

  for (const child of Array.from(doc.body.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const txt = normalizePdfText((child.textContent || '').trim());
      if (txt) {
        blocks.push({
          align: defaultAlign,
          runs: [{ text: txt, ...baseRunStyle }],
        });
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      walkBlock(child as Element);
    }
  }

  return blocks;
}

export function formatITemuTimestamp(ts?: Timestamp): string {
  if (!ts?.seconds) return 'Belum Direkodkan';
  return new Date(ts.seconds * 1000).toLocaleString('ms-MY', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTargetDateDisplay(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) return 'Tidak dinyatakan';
  const parsed = new Date(`${dateStr.trim()}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('ms-MY', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatAssignmentTypeDisplay(record: ITemuRecord): string {
  const baseLabel = ITEMU_ASSIGNMENT_TYPE_LABELS[record.assignmentType] || record.assignmentType;
  if (record.assignmentType === 'lain_lain' && record.assignmentTypeOther?.trim()) {
    return `${baseLabel} (${record.assignmentTypeOther.trim()})`;
  }
  return baseLabel;
}

export function buildITemuPdfDocument(
  rawRecords: ITemuRecord[],
  fallbackStudentName = 'Pelajar Politeknik'
): { doc: jsPDF; filename: string } {
  const records = [...rawRecords].sort(
    (a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)
  );

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2; // 178
  const bottomLimit = pageHeight - 25; // Reserved footer & I-TEMU watermark zone

  const generatedDate = new Date().toLocaleString('ms-MY', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let cursorY = 12;
  let activeRecordLabel = '';

  const drawRunningHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(76, 29, 149);
    doc.text('i-TEMU M-IQ  |  REKOD MAKLUM BALAS AKADEMIK', marginX, 11);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    let rightLabel = normalizePdfText(activeRecordLabel);
    const maxW = contentWidth - 88;
    if (doc.getTextWidth(rightLabel) > maxW) {
      while (rightLabel.length > 3 && doc.getTextWidth(`${rightLabel}...`) > maxW) {
        rightLabel = rightLabel.slice(0, -1);
      }
      rightLabel = `${rightLabel}...`;
    }
    doc.text(rightLabel, pageWidth - marginX, 11, { align: 'right' });
    doc.setDrawColor(197, 155, 39);
    doc.setLineWidth(0.4);
    doc.line(marginX, 13.5, pageWidth - marginX, 13.5);
  };

  const ensureSpace = (neededMm: number) => {
    if (cursorY + neededMm > bottomLimit) {
      doc.addPage();
      cursorY = 18;
      drawRunningHeader();
    }
  };

  const renderSectionHeaderBar = (code: string, title: string) => {
    ensureSpace(14);
    doc.setFillColor(243, 232, 255); // #F3E8FF
    doc.setDrawColor(197, 155, 39); // Soft gold rule
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, cursorY, contentWidth, 7.2, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(76, 29, 149);
    doc.text(normalizePdfText(`${code}. ${title}`), marginX + 3, cursorY + 4.9);
    cursorY += 10.2;
  };

  const renderKeyValueTable = (rows: Array<[string, string]>) => {
    const labelW = 46;
    const valW = contentWidth - labelW;

    for (const [label, rawVal] of rows) {
      const value = normalizePdfText(rawVal || '-');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.8);
      const valLines = doc.splitTextToSize(value, valW - 5) as string[];
      const rowH = Math.max(valLines.length, 1) * 4.4 + 3.2;

      ensureSpace(rowH);

      doc.setFillColor(248, 249, 252);
      doc.rect(marginX, cursorY, labelW, rowH, 'F');

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.25);
      doc.rect(marginX, cursorY, contentWidth, rowH);
      doc.line(marginX + labelW, cursorY, marginX + labelW, cursorY + rowH);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(15, 23, 42);
      doc.text(normalizePdfText(label), marginX + 2.5, cursorY + 4.9);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.8);
      doc.setTextColor(30, 41, 59);
      doc.text(valLines, marginX + labelW + 2.5, cursorY + 4.9);

      cursorY += rowH;
    }
    cursorY += 4.5;
  };

  const renderRichBlocks = (
    htmlOrText: string,
    style: TopicStyle,
    emptyPlaceholder = 'Tiada maklumat direkodkan.'
  ) => {
    const pdfFont = mapFontFamily(style.fontFamily);
    const baseFontPt = mapFontSizePt(style.fontSize);
    const baseRgb = parseColorToRgb(style.textColor, [30, 41, 59]);
    const lineHeightMm = baseFontPt * 0.48;

    const blocks = parseHtmlToBlocks(
      htmlOrText?.trim() ? htmlOrText : `<p><em>${emptyPlaceholder}</em></p>`,
      style.textAlign || 'justify',
      baseRgb
    );

    const setPdfFontStyle = (bold: boolean, italic: boolean, fontSizePt: number) => {
      const weight =
        bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal';
      doc.setFont(pdfFont, weight);
      doc.setFontSize(fontSizePt);
    };

    for (const block of blocks) {
      const fontSizePt = block.isHeading ? baseFontPt + 1.4 : baseFontPt;
      const indentMm = block.bulletPrefix ? 6 : 0;
      const usableW = contentWidth - indentMm;

      const paragraphsOfTokens: WordToken[][] = [[]];
      for (const run of block.runs) {
        const subLines = run.text.split('\n');
        subLines.forEach((sub, subIdx) => {
          if (subIdx > 0) paragraphsOfTokens.push([]);
          const words = sub.split(/(\s+)/);
          for (const piece of words) {
            if (!piece) continue;
            if (/^\s+$/.test(piece)) {
              const currentArr = paragraphsOfTokens[paragraphsOfTokens.length - 1];
              if (currentArr.length > 0 && currentArr[currentArr.length - 1].word !== ' ') {
                setPdfFontStyle(run.bold || Boolean(block.isHeading), run.italic, fontSizePt);
                currentArr.push({
                  word: ' ',
                  width: doc.getTextWidth(' '),
                  bold: run.bold || Boolean(block.isHeading),
                  italic: run.italic,
                  underline: run.underline,
                  rgb: run.rgb,
                });
              }
            } else {
              setPdfFontStyle(run.bold || Boolean(block.isHeading), run.italic, fontSizePt);
              const fullWidth = doc.getTextWidth(piece);
              if (fullWidth <= usableW) {
                paragraphsOfTokens[paragraphsOfTokens.length - 1].push({
                  word: piece,
                  width: fullWidth,
                  bold: run.bold || Boolean(block.isHeading),
                  italic: run.italic,
                  underline: run.underline,
                  rgb: run.rgb,
                });
              } else {
                let chunk = '';
                for (const ch of piece) {
                  const candidate = chunk + ch;
                  if (chunk.length > 0 && doc.getTextWidth(candidate) > usableW) {
                    paragraphsOfTokens[paragraphsOfTokens.length - 1].push({
                      word: chunk,
                      width: doc.getTextWidth(chunk),
                      bold: run.bold || Boolean(block.isHeading),
                      italic: run.italic,
                      underline: run.underline,
                      rgb: run.rgb,
                    });
                    chunk = ch;
                  } else {
                    chunk = candidate;
                  }
                }
                if (chunk.length > 0) {
                  paragraphsOfTokens[paragraphsOfTokens.length - 1].push({
                    word: chunk,
                    width: doc.getTextWidth(chunk),
                    bold: run.bold || Boolean(block.isHeading),
                    italic: run.italic,
                    underline: run.underline,
                    rgb: run.rgb,
                  });
                }
              }
            }
          }
        });
      }

      let isFirstVisualLine = true;
      for (const tokens of paragraphsOfTokens) {
        while (tokens.length > 0 && tokens[tokens.length - 1].word === ' ') {
          tokens.pop();
        }
        if (tokens.length === 0) continue;

        const lines: WordToken[][] = [];
        let currentLine: WordToken[] = [];
        let currentW = 0;

        for (const tok of tokens) {
          if (tok.word === ' ' && currentLine.length === 0) continue;
          if (currentW + tok.width > usableW && currentLine.length > 0 && tok.word !== ' ') {
            while (currentLine.length > 0 && currentLine[currentLine.length - 1].word === ' ') {
              currentLine.pop();
            }
            lines.push(currentLine);
            currentLine = [tok];
            currentW = tok.width;
          } else {
            currentLine.push(tok);
            currentW += tok.width;
          }
        }
        if (currentLine.length > 0) {
          while (currentLine.length > 0 && currentLine[currentLine.length - 1].word === ' ') {
            currentLine.pop();
          }
          if (currentLine.length > 0) lines.push(currentLine);
        }

        lines.forEach((lineTokens, lineIdx) => {
          ensureSpace(lineHeightMm + 1.5);
          const startX = marginX + indentMm;

          if (isFirstVisualLine && block.bulletPrefix) {
            setPdfFontStyle(true, false, fontSizePt);
            doc.setTextColor(76, 29, 149);
            doc.text(block.bulletPrefix, marginX + 1, cursorY);
          }
          isFirstVisualLine = false;

          const isLastLine = lineIdx === lines.length - 1;
          const wordOnlyTokens = lineTokens.filter((t) => t.word !== ' ');
          const spaceTokensCount = lineTokens.filter((t) => t.word === ' ').length;
          const totalTokensW = lineTokens.reduce((sum, t) => sum + t.width, 0);

          let drawX = startX;
          let extraPerSpace = 0;

          if (block.align === 'center') {
            drawX = startX + Math.max(0, (usableW - totalTokensW) / 2);
          } else if (block.align === 'right') {
            drawX = startX + Math.max(0, usableW - totalTokensW);
          } else if (
            block.align === 'justify' &&
            !isLastLine &&
            wordOnlyTokens.length > 1 &&
            spaceTokensCount > 0 &&
            totalTokensW < usableW
          ) {
            extraPerSpace = (usableW - totalTokensW) / spaceTokensCount;
          }

          for (const tok of lineTokens) {
            if (tok.word === ' ') {
              drawX += tok.width + extraPerSpace;
              continue;
            }
            setPdfFontStyle(tok.bold, tok.italic, fontSizePt);
            doc.setTextColor(tok.rgb[0], tok.rgb[1], tok.rgb[2]);
            doc.text(tok.word, drawX, cursorY);
            if (tok.underline) {
              doc.setDrawColor(tok.rgb[0], tok.rgb[1], tok.rgb[2]);
              doc.setLineWidth(0.2);
              doc.line(drawX, cursorY + 0.7, drawX + tok.width, cursorY + 0.7);
            }
            drawX += tok.width;
          }

          cursorY += lineHeightMm;
        });
      }
      cursorY += 1.5;
    }
    cursorY += 2.5;
  };

  const renderLabeledSubSection = (
    subHeading: string,
    htmlOrText: string,
    style: TopicStyle,
    emptyPlaceholder: string
  ) => {
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(15, 23, 42);
    doc.text(normalizePdfText(subHeading), marginX, cursorY);
    cursorY += 4.8;
    renderRichBlocks(htmlOrText, style, emptyPlaceholder);
  };

  records.forEach((rec, recIdx) => {
    if (recIdx > 0) {
      doc.addPage();
    }
    cursorY = 12;
    activeRecordLabel = `${rec.courseCode || 'KURSUS'} - ${rec.assignmentTitle || 'Tugasan'}`;

    // --- 1. OFFICIAL i-TEMU M-IQ BANNER ---
    doc.setFillColor(10, 17, 40); // #0A1128 Navy
    doc.roundedRect(marginX, cursorY, contentWidth, 25, 2.5, 2.5, 'F');
    doc.setFillColor(76, 29, 149); // #4C1D95 Royal Purple accent
    doc.roundedRect(marginX, cursorY, 4.5, 25, 1.5, 1.5, 'F');
    doc.setFillColor(197, 155, 39); // #C59B27 Gold bar
    doc.rect(marginX, cursorY + 23.8, contentWidth, 1.2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(245, 230, 184);
    doc.text('M-IQ (Mindset Itqan)  |  i-TEMU M-IQ', marginX + 9, cursorY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14.5);
    doc.setTextColor(255, 255, 255);
    doc.text('REKOD MAKLUM BALAS AKADEMIK', marginX + 9, cursorY + 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.4);
    doc.setTextColor(226, 232, 240);
    const subBannerText =
      records.length > 1
        ? `Kompilasi Rekod ${recIdx + 1} daripada ${records.length}  |  ${normalizePdfText(
            rec.courseCode
          )} - ${normalizePdfText(rec.assignmentTitle)}`
        : 'Platform Komunikasi dan Maklum Balas Akademik antara Pelajar dengan Pensyarah';
    doc.text(subBannerText.slice(0, 95), marginX + 9, cursorY + 20.5);

    cursorY += 30;

    const feedbackStyle: TopicStyle = rec.feedbackStyle || DEFAULT_TOPIC_STYLE;
    const statusLabel = ITEMU_STATUS_META[rec.status]?.label || rec.status;

    // A. Maklumat Pelajar
    renderSectionHeaderBar('A', 'Maklumat Pelajar');
    renderKeyValueTable([
      ['Nama Pelajar', rec.studentName || fallbackStudentName],
      ['Nombor Pendaftaran', rec.studentRegNo || 'Tidak dinyatakan'],
      ['Program Pengajian', rec.program || 'Tidak dinyatakan'],
      ['Kelas', rec.studentClass || 'Tidak dinyatakan'],
      ['E-mel Rasmi', rec.studentEmail || '-'],
    ]);

    // B. Maklumat Kursus
    renderSectionHeaderBar('B', 'Maklumat Kursus');
    renderKeyValueTable([
      ['Kod Kursus', rec.courseCode || '-'],
      ['Nama Kursus', rec.courseName || '-'],
      ['Pensyarah Rujukan', rec.lecturerName || 'Pentadbir & Pensyarah M-IQ'],
    ]);

    // C. Tajuk dan Jenis Tugasan
    renderSectionHeaderBar('C', 'Tajuk dan Jenis Tugasan');
    renderKeyValueTable([
      ['Tajuk Tugasan', rec.assignmentTitle || '-'],
      ['Jenis Tugasan', formatAssignmentTypeDisplay(rec)],
      ['Tarikh Penghantaran / Sasaran', formatTargetDateDisplay(rec.targetSubmissionDate)],
    ]);

    // D. Persoalan atau Perkara Yang Dirujuk
    renderSectionHeaderBar('D', 'Persoalan atau Perkara Yang Dirujuk');
    renderLabeledSubSection(
      'Bahagian Tugasan Yang Memerlukan Panduan Pensyarah:',
      rec.guidanceArea,
      DEFAULT_TOPIC_STYLE,
      'Tiada maklumat bahagian tugasan.'
    );
    renderLabeledSubSection(
      'Persoalan atau Masalah Yang Dihadapi:',
      rec.questionOrIssue,
      DEFAULT_TOPIC_STYLE,
      'Tiada persoalan direkodkan.'
    );
    if (rec.feedbackExplanation?.trim()) {
      renderLabeledSubSection(
        'Penjelasan Perkara Yang Ingin Mendapatkan Maklum Balas:',
        rec.feedbackExplanation,
        DEFAULT_TOPIC_STYLE,
        'Tiada penjelasan tambahan.'
      );
    }

    // E. Lampiran Berkaitan
    renderSectionHeaderBar('E', 'Lampiran Berkaitan');
    if (!rec.attachments || rec.attachments.length === 0) {
      renderRichBlocks(
        '<p><em>Tiada fail lampiran dimuat naik oleh pelajar bagi permohonan ini.</em></p>',
        DEFAULT_TOPIC_STYLE
      );
    } else {
      const attachRows: Array<[string, string]> = rec.attachments.map((att, idx) => [
        `Lampiran ${idx + 1} (${att.type === 'image' ? 'Imej' : 'Dokumen'})`,
        `${att.name} (${formatBytes(att.size)})\nPautan: ${att.url}`,
      ]);
      renderKeyValueTable(attachRows);
    }

    // F. Maklum Balas Pensyarah
    renderSectionHeaderBar('F', 'Maklum Balas Pensyarah');
    renderLabeledSubSection(
      'Ulasan / Maklum Balas Terperinci:',
      rec.detailedFeedback,
      feedbackStyle,
      'Maklum balas terperinci pensyarah belum diberikan.'
    );
    renderLabeledSubSection(
      'Kekuatan Tugasan:',
      rec.strengthsReview,
      feedbackStyle,
      'Belum direkodkan.'
    );
    renderLabeledSubSection(
      'Kelemahan atau Kesilapan Yang Dikenal Pasti:',
      rec.weaknessesReview,
      feedbackStyle,
      'Belum direkodkan.'
    );

    // G. Cadangan Penambahbaikan
    renderSectionHeaderBar('G', 'Cadangan Penambahbaikan');
    renderRichBlocks(
      rec.improvementSuggestions,
      feedbackStyle,
      'Belum ada cadangan penambahbaikan direkodkan.'
    );

    // H. Tindakan Susulan Pelajar
    renderSectionHeaderBar('H', 'Tindakan Susulan Pelajar');
    renderLabeledSubSection(
      'Panduan Tindakan Seterusnya daripada Pensyarah:',
      rec.nextActionGuide,
      feedbackStyle,
      'Belum ada panduan tindakan seterusnya direkodkan.'
    );
    renderLabeledSubSection(
      'Catatan Tindakan Susulan Pelajar:',
      rec.studentFollowUpNote,
      DEFAULT_TOPIC_STYLE,
      'Belum ada catatan tindakan susulan daripada pelajar.'
    );

    // I. Tarikh Penghantaran Permohonan dan Tarikh Maklum Balas
    renderSectionHeaderBar('I', 'Tarikh Penghantaran Permohonan dan Tarikh Maklum Balas');
    renderKeyValueTable([
      ['Status Permohonan Semasa', statusLabel],
      ['Tarikh Penghantaran Permohonan', formatITemuTimestamp(rec.createdAt)],
      [
        'Tarikh Maklum Balas Diberikan',
        rec.feedbackAt
          ? formatITemuTimestamp(rec.feedbackAt)
          : 'Menunggu maklum balas pensyarah',
      ],
      [
        'Pensyarah Pemberi Maklum Balas',
        rec.feedbackByName || rec.lecturerName || 'Admin (Pensyarah) M-IQ',
      ],
    ]);
  });

  // --- PER-PAGE FOOTER, PAGE NUMBERS & BOTTOM-RIGHT I-TEMU WATERMARK ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);

    // Subtle footer rule
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 16, pageWidth - marginX, pageHeight - 16);

    // Bottom-left identity + generation time
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `i-TEMU M-IQ  |  REKOD MAKLUM BALAS AKADEMIK  |  Dijana pada ${normalizePdfText(
        generatedDate
      )}`,
      marginX,
      pageHeight - 10.6
    );

    // Page number clearly separated from bottom-right I-TEMU watermark
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.0);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Muka ${p} daripada ${totalPages}`,
      pageWidth - marginX - 28,
      pageHeight - 10.6,
      { align: 'right' }
    );

    // Bottom-right corner official I-TEMU watermark on every page
    doc.setDrawColor(197, 155, 39);
    doc.setFillColor(248, 249, 252);
    doc.setLineWidth(0.35);
    doc.roundedRect(pageWidth - marginX - 23, pageHeight - 14.3, 23, 6.2, 1.2, 1.2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(124, 108, 166); // Subtle muted royal-purple watermark tint
    doc.text('I-TEMU', pageWidth - marginX - 11.5, pageHeight - 10.1, { align: 'center' });
  }

  let filename = 'i-temu-rekod-maklum-balas.pdf';
  if (records.length === 1) {
    const slug = `${records[0].courseCode}-${records[0].assignmentTitle}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    filename = `i-temu-${slug || 'maklum-balas'}.pdf`;
  } else {
    const stuSlug = (records[0]?.studentName || fallbackStudentName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
    filename = `i-temu-semua-rekod-${stuSlug || 'pelajar'}.pdf`;
  }

  return { doc, filename };
}

export function generateSingleITemuPdf(
  record: ITemuRecord,
  fallbackStudentName = 'Pelajar Politeknik'
): void {
  const { doc, filename } = buildITemuPdfDocument([record], fallbackStudentName);
  doc.save(filename);
}

export function generateAllITemuPdf(
  records: ITemuRecord[],
  fallbackStudentName = 'Pelajar Politeknik'
): void {
  if (records.length === 0) return;
  const { doc, filename } = buildITemuPdfDocument(records, fallbackStudentName);
  doc.save(filename);
}
