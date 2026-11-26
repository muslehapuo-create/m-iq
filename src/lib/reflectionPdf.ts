import { jsPDF } from 'jspdf';
import { renderIRefleksiLogoDataUrl } from '../components/IRefleksiIcon';
import {
  normalizeGuidedPrompt,
  type GuidedReflectionAnswer,
  type StudentReflection,
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

function parseColorToRgb(colorStr: string | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!colorStr) return fallback;
  const trimmed = colorStr.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return [
      parseInt(trimmed.slice(1, 3), 16),
      parseInt(trimmed.slice(3, 5), 16),
      parseInt(trimmed.slice(5, 7), 16),
    ];
  }
  const rgbMatch = trimmed.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
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
      return 9.5;
    case 'lg':
      return 11.5;
    case 'xl':
      return 12.5;
    case 'base':
    default:
      return 10.2;
  }
}

function extractInlineStyle(el: Element, inherited: Omit<InlineRun, 'text'>): Omit<InlineRun, 'text'> {
  const next = { ...inherited };
  const tag = el.tagName.toUpperCase();
  if (tag === 'STRONG' || tag === 'B' || tag === 'H2' || tag === 'H3' || tag === 'H4') {
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

  const pushBlock = (runs: InlineRun[], align: TopicTextAlign, bulletPrefix?: string, isHeading?: boolean) => {
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
      pushBlock(runs, align, undefined, tag === 'H2' || tag === 'H3' || tag === 'H4');
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

export async function buildIRefleksiPdfDocument(
  reflection: StudentReflection,
  fallbackStudentName = 'Pelajar'
): Promise<{ doc: jsPDF; filename: string }> {
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
  const bottomLimit = pageHeight - 20;

  const style: TopicStyle = reflection.style || {
    fontFamily: 'sans',
    fontSize: 'base',
    textColor: '#1E293B',
    backgroundColor: 'transparent',
    textAlign: 'justify',
  };
  const pdfFont = mapFontFamily(style.fontFamily);
  const baseFontPt = mapFontSizePt(style.fontSize);
  const baseRgb = parseColorToRgb(style.textColor, [30, 41, 59]);
  const lineHeightMm = baseFontPt * 0.48;

  const generatedDate = new Date().toLocaleString('ms-MY', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const logoDataUrl = await renderIRefleksiLogoDataUrl();

  let cursorY = 12;

  const ensureSpace = (neededMm: number) => {
    if (cursorY + neededMm > bottomLimit) {
      doc.addPage();
      cursorY = 18;
      // Compact running header on continuation pages
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(76, 29, 149);
      doc.text('M-IQ (Mindset Itqan)  |  i-REFLEKSI M-IQ', marginX, 11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      let headerTitle = normalizePdfText(reflection.assignmentTitle || reflection.title);
      const maxHeaderTitleW = contentWidth - 78;
      if (doc.getTextWidth(headerTitle) > maxHeaderTitleW) {
        while (headerTitle.length > 3 && doc.getTextWidth(`${headerTitle}...`) > maxHeaderTitleW) {
          headerTitle = headerTitle.slice(0, -1);
        }
        headerTitle = `${headerTitle}...`;
      }
      doc.text(headerTitle, pageWidth - marginX, 11, { align: 'right' });
      doc.setDrawColor(197, 155, 39);
      doc.setLineWidth(0.4);
      doc.line(marginX, 13.5, pageWidth - marginX, 13.5);
    }
  };

  // --- 1. OFFICIAL TOP BANNER ---
  doc.setFillColor(10, 17, 40); // #0A1128 Navy
  doc.roundedRect(marginX, cursorY, contentWidth, 26, 2.5, 2.5, 'F');
  // Purple side accent
  doc.setFillColor(76, 29, 149); // #4C1D95
  doc.roundedRect(marginX, cursorY, 4.5, 26, 1.5, 1.5, 'F');
  // Gold bottom border rule
  doc.setFillColor(197, 155, 39); // #C59B27
  doc.rect(marginX, cursorY + 24.8, contentWidth, 1.2, 'F');

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', marginX + 8, cursorY + 4, 17, 17);
  } else {
    doc.setFillColor(76, 29, 149);
    doc.roundedRect(marginX + 8, cursorY + 4, 17, 17, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(245, 230, 184);
    doc.text('iR', marginX + 16.5, cursorY + 14, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(245, 230, 184); // Soft Gold #F5E6B8
  doc.text('M-IQ (Mindset Itqan)', marginX + 29, cursorY + 8.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15.5);
  doc.setTextColor(255, 255, 255);
  doc.text('i-REFLEKSI M-IQ', marginX + 29, cursorY + 15.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(226, 232, 240);
  doc.text('Refleksi Tugasan Berteraskan Nilai Itqan', marginX + 29, cursorY + 20.6);

  cursorY += 32;

  // --- 2. OFFICIAL DOCUMENT TITLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(
    'Refleksi Pelaksanaan Tugasan Berteraskan Nilai Itqan',
    pageWidth / 2,
    cursorY,
    { align: 'center' }
  );
  cursorY += 3;
  doc.setDrawColor(197, 155, 39);
  doc.setLineWidth(0.7);
  doc.line(marginX + 28, cursorY, pageWidth - marginX - 28, cursorY);
  cursorY += 6;

  // --- 3. STUDENT & ASSIGNMENT METADATA TABLE ---
  const assignmentTitle = normalizePdfText(
    reflection.assignmentTitle?.trim() || reflection.title || '-'
  );
  const courseDisplay =
    [reflection.courseCode?.trim(), reflection.courseName?.trim()]
      .filter((v): v is string => Boolean(v))
      .map(normalizePdfText)
      .join(' - ') || '-';
  const studentDisplay = normalizePdfText(
    reflection.userName?.trim() || fallbackStudentName
  );
  const regNoDisplay = normalizePdfText(reflection.studentRegNo?.trim() || '-');
  const programDisplay = normalizePdfText(reflection.program?.trim() || '-');
  const lecturerDisplay = normalizePdfText(reflection.lecturerName?.trim() || '-');
  const moduleDisplay = normalizePdfText(reflection.moduleTitle?.trim() || '-');
  const statusDisplay =
    reflection.status === 'draft' ? 'Draf (Belum Dimuktamadkan)' : 'Lengkap';

  const metaRows: Array<[string, string, string, string]> = [
    ['Tajuk Tugasan', assignmentTitle, 'Kursus', courseDisplay],
    ['Nama Pelajar', studentDisplay, 'No. Pendaftaran', regNoDisplay],
    ['Program', programDisplay, 'Pensyarah', lecturerDisplay],
    ['Modul M-IQ', moduleDisplay, 'Tarikh Dijana', normalizePdfText(`${generatedDate} (${statusDisplay})`)],
  ];

  const halfW = contentWidth / 2;
  const labelW = 28;
  const valW = halfW - labelW;

  for (const [l1, v1, l2, v2] of metaRows) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    const v1Lines = doc.splitTextToSize(v1, valW - 4) as string[];
    const v2Lines = doc.splitTextToSize(v2, valW - 4) as string[];
    const rowH = Math.max(v1Lines.length, v2Lines.length, 1) * 4.2 + 3.2;

    ensureSpace(rowH);

    // Label backgrounds
    doc.setFillColor(248, 249, 252);
    doc.rect(marginX, cursorY, labelW, rowH, 'F');
    doc.rect(marginX + halfW, cursorY, labelW, rowH, 'F');

    // Borders
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.rect(marginX, cursorY, halfW, rowH);
    doc.rect(marginX + halfW, cursorY, halfW, rowH);
    doc.line(marginX + labelW, cursorY, marginX + labelW, cursorY + rowH);
    doc.line(marginX + halfW + labelW, cursorY, marginX + halfW + labelW, cursorY + rowH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(76, 29, 149);
    doc.text(l1, marginX + 2, cursorY + 4.8);
    doc.text(l2, marginX + halfW + 2, cursorY + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    doc.text(v1Lines, marginX + labelW + 2, cursorY + 4.8);
    doc.text(v2Lines, marginX + halfW + labelW + 2, cursorY + 4.8);

    cursorY += rowH;
  }

  cursorY += 7;

  // --- 4. RICH TEXT BLOCK RENDERER ---
  const setPdfFontStyle = (bold: boolean, italic: boolean, fontSizePt: number) => {
    const weight =
      bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal';
    doc.setFont(pdfFont, weight);
    doc.setFontSize(fontSizePt);
  };

  const renderParsedBlock = (block: ParsedBlock) => {
    const fontSizePt = block.isHeading ? baseFontPt + 1.5 : baseFontPt;
    const indentMm = block.bulletPrefix ? 6 : 0;
    const usableW = contentWidth - indentMm;

    // Split runs into lines separated by explicit '\n'
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
              // Break oversized unbreakable tokens (e.g. long URLs) so zero text clips past A4 margin
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
      // Trim trailing space token
      while (tokens.length > 0 && tokens[tokens.length - 1].word === ' ') {
        tokens.pop();
      }
      if (tokens.length === 0) continue;

      // Wrap tokens into visual lines
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

    cursorY += 1.8;
  };

  const renderSection = (heading: string, htmlOrText: string) => {
    const blocks = parseHtmlToBlocks(htmlOrText, style.textAlign, baseRgb);
    if (blocks.length === 0) return;

    ensureSpace(16);
    // Question / Section Prompt Banner
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.6);
    const headingLines = doc.splitTextToSize(normalizePdfText(heading), contentWidth - 6) as string[];
    const boxH = headingLines.length * 4.4 + 3.6;
    ensureSpace(boxH + 8);

    doc.setFillColor(243, 232, 255); // Soft lavender tint #F3E8FF
    doc.setDrawColor(216, 180, 254);
    doc.setLineWidth(0.25);
    doc.roundedRect(marginX, cursorY, contentWidth, boxH, 1.5, 1.5, 'FD');

    doc.setTextColor(76, 29, 149); // #4C1D95
    doc.text(headingLines, marginX + 3, cursorY + 4.8);
    cursorY += boxH + 4.2;

    for (const block of blocks) {
      renderParsedBlock(block);
    }
    cursorY += 2.5;
  };

  if (reflection.guidedAnswers && reflection.guidedAnswers.length > 0) {
    for (const item of reflection.guidedAnswers as GuidedReflectionAnswer[]) {
      const answerContent = item.answer?.trim()
        ? item.answer
        : '<p><em>(Tiada jawapan direkodkan bagi soalan ini.)</em></p>';
      renderSection(normalizeGuidedPrompt(item.id, item.prompt), answerContent);
    }
    if (reflection.itqanTakeaway?.trim()) {
      renderSection('Komitmen Nilai Itqan Seterusnya', reflection.itqanTakeaway);
    }
  } else {
    renderSection('Refleksi Keseluruhan Pelaksanaan Tugasan', reflection.body);
    if (reflection.strengths?.trim()) {
      renderSection('Kekuatan Hasil Kerja', reflection.strengths);
    }
    if (reflection.weaknesses?.trim()) {
      renderSection('Kelemahan yang Dikenal Pasti', reflection.weaknesses);
    }
    if (reflection.improvements?.trim()) {
      renderSection('Penambahbaikan yang Perlu Dilakukan', reflection.improvements);
    }
    if (reflection.itqanTakeaway?.trim()) {
      renderSection('Komitmen Nilai Itqan Seterusnya', reflection.itqanTakeaway);
    }
  }

  // --- 5. SIGNATURE / VERIFICATION FOOTER ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Dokumen Rasmi i-Refleksi M-IQ  |  Dijana pada ${normalizePdfText(generatedDate)}`,
      marginX,
      pageHeight - 9.2
    );
    doc.text(
      `Muka ${p} daripada ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 9.2,
      { align: 'right' }
    );
  }

  const safeSlug = (reflection.assignmentTitle || reflection.title || 'refleksi')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return {
    doc,
    filename: `i-refleksi-m-iq-${safeSlug || 'tugasan'}.pdf`,
  };
}

export async function generateIRefleksiPdf(
  reflection: StudentReflection,
  fallbackStudentName = 'Pelajar'
): Promise<void> {
  const { doc, filename } = await buildIRefleksiPdfDocument(
    reflection,
    fallbackStudentName
  );
  doc.save(filename);
}
