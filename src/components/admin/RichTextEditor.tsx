import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Palette,
  Pilcrow,
  Underline,
  Upload,
} from 'lucide-react';
import { uploadMediaToStorage, validateUploadFile } from '../../lib/firebase';
import { plainTextToRichHtml, sanitizeHtmlForStorage } from '../../lib/sanitizeHtml';
import {
  getTopicAlignClass,
  getTopicFontClass,
  getTopicFontSizeClass,
  isSafeHttpUrl,
  type TopicFontFamily,
  type TopicFontSize,
  type TopicStyle,
  type TopicTextAlign,
} from '../../types/miq';

interface RichTextEditorProps {
  topicKey: string;
  value: string;
  style: TopicStyle;
  onChangeContent: (html: string) => void;
  onChangeStyle: (updater: (prev: TopicStyle) => TopicStyle) => void;
}

const TEXT_COLORS = [
  { label: 'Navy Gelap', hex: '#0F172A' },
  { label: 'Kelabu Teks', hex: '#1E293B' },
  { label: 'Ungu Diraja', hex: '#4C1D95' },
  { label: 'Emas Gelap', hex: '#854D0E' },
  { label: 'Hijau Zamrud', hex: '#065F46' },
  { label: 'Merah Delima', hex: '#991B1B' },
];

const HIGHLIGHT_COLORS = [
  { label: 'Tiada Latar', hex: 'transparent' },
  { label: 'Emas Lembut', hex: '#FEF3C7' },
  { label: 'Ungu Lembut', hex: '#F3E8FF' },
  { label: 'Biru Lembut', hex: '#E0F2FE' },
  { label: 'Hijau Lembut', hex: '#DCFCE7' },
];

export function RichTextEditor({
  topicKey,
  value,
  style,
  onChangeContent,
  onChangeStyle,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const [inlineColor, setInlineColor] = useState('#4C1D95');
  const [inlineBg, setInlineBg] = useState('#FEF3C7');
  const [showLinkBox, setShowLinkBox] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showImageBox, setShowImageBox] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [editorErr, setEditorErr] = useState<string | null>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = sanitizeHtmlForStorage(plainTextToRichHtml(value));
    if (el.innerHTML !== html) {
      el.innerHTML = html;
    }
    // Only re-sync when switching topics (topicKey changes) or clearing editor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicKey]);

  const captureSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    const cleaned = sanitizeHtmlForStorage(el.innerHTML);
    onChangeContent(cleaned);
  };

  const exec = (command: string, val?: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, val);
    captureSelection();
    emitChange();
  };

  const applyInlineFontSize = (px: string) => {
    editorRef.current?.focus();
    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const span = document.createElement('span');
      span.style.fontSize = px;
      try {
        const range = sel.getRangeAt(0);
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
        emitChange();
      } catch {
        // Fallback if selection crosses block boundaries
      }
    }
  };

  const handleInsertLink = () => {
    const cleanUrl = linkUrl.trim();
    if (!isSafeHttpUrl(cleanUrl)) {
      setEditorErr('URL pautan tidak sah. Mesti bermula dengan https:// atau http://');
      return;
    }
    setEditorErr(null);
    editorRef.current?.focus();
    restoreSelection();
    const sel = window.getSelection();
    const label = linkText.trim() || sel?.toString().trim() || cleanUrl;
    const anchorHtml = `<a href="${cleanUrl.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer">${label
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</a>`;
    document.execCommand('insertHTML', false, anchorHtml);
    emitChange();
    setShowLinkBox(false);
    setLinkText('');
    setLinkUrl('');
  };

  const insertImageHtml = (src: string, altText: string) => {
    if (!isSafeHttpUrl(src)) {
      setEditorErr('URL gambar tidak sah.');
      return;
    }
    setEditorErr(null);
    editorRef.current?.focus();
    restoreSelection();
    const safeAlt = (altText || 'Gambar pembelajaran M-IQ').replace(/"/g, '&quot;');
    const html = `<p><img src="${src.replace(/"/g, '&quot;')}" alt="${safeAlt}"></p>`;
    document.execCommand('insertHTML', false, html);
    emitChange();
    setShowImageBox(false);
    setImageUrl('');
    setImageAlt('');
  };

  const handleUploadInlineImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateUploadFile(file, 'image');
    if (err) {
      setEditorErr(err);
      return;
    }
    setUploadingImg(true);
    setEditorErr(null);
    try {
      const uploaded = await uploadMediaToStorage(file, 'topics', setUploadPct);
      insertImageHtml(uploaded.url, imageAlt || uploaded.fileName);
    } catch (uploadErr) {
      setEditorErr(
        uploadErr instanceof Error
          ? `Muat naik gambar gagal: ${uploadErr.message}`
          : 'Muat naik gambar gagal.'
      );
    } finally {
      setUploadingImg(false);
      setUploadPct(0);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {/* Global Typography & Block Default Bar */}
      <div className="p-3.5 rounded-xl bg-[#F8F9FC] border border-slate-200 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Jenis Tulisan (Font)
          </label>
          <select
            value={style.fontFamily}
            onChange={(e) => {
              const fam = e.target.value as TopicFontFamily;
              onChangeStyle((s) => ({ ...s, fontFamily: fam }));
              const map: Record<TopicFontFamily, string> = {
                sans: 'Plus Jakarta Sans',
                serif: 'Lora',
                editorial: 'Lora',
                mono: 'JetBrains Mono',
              };
              exec('fontName', map[fam]);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
          >
            <option value="sans">Plus Jakarta Sans</option>
            <option value="serif">Lora Serif</option>
            <option value="editorial">Editorial Serif</option>
            <option value="mono">JetBrains Mono</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Saiz Tulisan
          </label>
          <select
            value={style.fontSize}
            onChange={(e) => {
              const sz = e.target.value as TopicFontSize;
              onChangeStyle((s) => ({ ...s, fontSize: sz }));
              const pxMap: Record<TopicFontSize, string> = {
                sm: '14px',
                base: '16px',
                lg: '18px',
                xl: '20px',
              };
              applyInlineFontSize(pxMap[sz]);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
          >
            <option value="sm">Kecil (14px)</option>
            <option value="base">Standard (16px)</option>
            <option value="lg">Besar (18px)</option>
            <option value="xl">Sangat Besar (20px)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Warna Teks Asal
          </label>
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={style.textColor}
              onChange={(e) =>
                onChangeStyle((s) => ({ ...s, textColor: e.target.value }))
              }
              className="w-7 h-7 rounded border border-slate-200 cursor-pointer bg-white"
              aria-label="Warna teks asal"
            />
            {TEXT_COLORS.slice(0, 4).map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.label}
                onClick={() => onChangeStyle((s) => ({ ...s, textColor: c.hex }))}
                className="w-5 h-5 rounded border border-slate-300"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Warna Latar Blok
          </label>
          <div className="flex items-center gap-1">
            {HIGHLIGHT_COLORS.map((bg) => (
              <button
                key={bg.hex}
                type="button"
                title={bg.label}
                onClick={() =>
                  onChangeStyle((s) => ({ ...s, backgroundColor: bg.hex }))
                }
                className={`w-6 h-6 rounded border text-[10px] font-bold ${
                  (style.backgroundColor || 'transparent') === bg.hex
                    ? 'border-[#4C1D95] ring-1 ring-[#4C1D95]'
                    : 'border-slate-300'
                }`}
                style={{
                  backgroundColor: bg.hex === 'transparent' ? '#FFFFFF' : bg.hex,
                }}
              >
                {bg.hex === 'transparent' ? '×' : ''}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Jajaran Teks
          </label>
          <div className="grid grid-cols-4 gap-1">
            {(
              [
                ['justify', AlignJustify, 'Justify', 'justifyFull'],
                ['left', AlignLeft, 'Kiri', 'justifyLeft'],
                ['center', AlignCenter, 'Tengah', 'justifyCenter'],
                ['right', AlignRight, 'Kanan', 'justifyRight'],
              ] as Array<
                [
                  TopicTextAlign,
                  React.ComponentType<{ className?: string }>,
                  string,
                  string,
                ]
              >
            ).map(([val, IconComp, label, cmd]) => (
              <button
                key={val}
                type="button"
                title={label}
                onClick={() => {
                  onChangeStyle((s) => ({ ...s, textAlign: val }));
                  exec(cmd);
                }}
                className={`p-1.5 rounded border flex items-center justify-center ${
                  style.textAlign === val
                    ? 'bg-[#4C1D95] text-white border-[#4C1D95]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rich Formatting Toolbar */}
      <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center gap-1.5">
        {/* Heading / Subheading / Paragraph */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('formatBlock', 'h2')}
          title="Tajuk (H2)"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#0F172A] hover:bg-slate-50"
        >
          <Heading2 className="w-3.5 h-3.5 text-[#4C1D95]" />
          <span>Tajuk</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('formatBlock', 'h3')}
          title="Subtajuk (H3)"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#0F172A] hover:bg-slate-50"
        >
          <Heading3 className="w-3.5 h-3.5 text-[#4C1D95]" />
          <span>Subtajuk</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('formatBlock', 'p')}
          title="Perenggan"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#0F172A] hover:bg-slate-50"
        >
          <Pilcrow className="w-3.5 h-3.5 text-slate-500" />
          <span>Perenggan</span>
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Bold, Italic, Underline */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('bold')}
          title="Tebal (Bold)"
          className="p-2 rounded-lg border border-slate-200 text-[#0F172A] hover:bg-slate-50"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('italic')}
          title="Condong (Italic)"
          className="p-2 rounded-lg border border-slate-200 text-[#0F172A] hover:bg-slate-50"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('underline')}
          title="Bergaris (Underline)"
          className="p-2 rounded-lg border border-slate-200 text-[#0F172A] hover:bg-slate-50"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Lists */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('insertUnorderedList')}
          title="Senarai Berbulet"
          className="p-2 rounded-lg border border-slate-200 text-[#0F172A] hover:bg-slate-50"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('insertOrderedList')}
          title="Senarai Bernombor"
          className="p-2 rounded-lg border border-slate-200 text-[#0F172A] hover:bg-slate-50"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Inline Text Color & Highlight */}
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-[#F8F9FC]">
          <Palette className="w-3.5 h-3.5 text-slate-600" />
          <input
            type="color"
            value={inlineColor}
            onChange={(e) => {
              setInlineColor(e.target.value);
              exec('foreColor', e.target.value);
            }}
            title="Warna tulisan pilihan"
            className="w-5 h-5 cursor-pointer bg-transparent border-0 p-0"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec('foreColor', inlineColor)}
            className="text-[11px] font-semibold text-[#0F172A] hover:text-[#4C1D95]"
          >
            Warna
          </button>
        </div>

        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-[#F8F9FC]">
          <Highlighter className="w-3.5 h-3.5 text-slate-600" />
          <input
            type="color"
            value={inlineBg}
            onChange={(e) => {
              setInlineBg(e.target.value);
              exec('hiliteColor', e.target.value);
            }}
            title="Warna latar teks pilihan"
            className="w-5 h-5 cursor-pointer bg-transparent border-0 p-0"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec('hiliteColor', inlineBg)}
            className="text-[11px] font-semibold text-[#0F172A] hover:text-[#4C1D95]"
          >
            Latar
          </button>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Insert Link & Image */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            captureSelection();
          }}
          onClick={() => {
            setShowLinkBox((s) => !s);
            setShowImageBox(false);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#4C1D95] hover:bg-slate-50"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Pautan</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            captureSelection();
          }}
          onClick={() => {
            setShowImageBox((s) => !s);
            setShowLinkBox(false);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#9A7414] hover:bg-slate-50"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Gambar</span>
        </button>
      </div>

      {editorErr && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
          {editorErr}
        </div>
      )}

      {/* Inline Insert Link Popover */}
      {showLinkBox && (
        <div className="p-3.5 rounded-xl bg-[#F8F9FC] border border-slate-200 grid sm:grid-cols-12 gap-2 items-center">
          <input
            type="text"
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
            placeholder="Teks pautan (pilihan)"
            className="sm:col-span-4 px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
          />
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://contoh.edu.my"
            className="sm:col-span-5 px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
          />
          <div className="sm:col-span-3 flex gap-1.5">
            <button
              type="button"
              onClick={handleInsertLink}
              className="flex-1 px-3 py-2 rounded-lg bg-[#4C1D95] text-white text-xs font-semibold"
            >
              Masukkan
            </button>
            <button
              type="button"
              onClick={() => setShowLinkBox(false)}
              className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs bg-white"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Inline Insert Image Popover */}
      {showImageBox && (
        <div className="p-3.5 rounded-xl bg-[#F8F9FC] border border-slate-200 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0F172A] text-white text-xs font-semibold cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>
                {uploadingImg
                  ? `Memuat naik ${uploadPct}%`
                  : 'Muat Naik Gambar ke Teks (Firebase Storage)'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadInlineImage}
                className="hidden"
                disabled={uploadingImg}
              />
            </label>
            <span className="text-xs text-slate-500">atau masukkan URL gambar di bawah:</span>
          </div>
          <div className="grid sm:grid-cols-12 gap-2">
            <input
              type="text"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              placeholder="Keterangan gambar (alt)"
              className="sm:col-span-4 px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
            />
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://.../gambar.jpg"
              className="sm:col-span-5 px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
            />
            <div className="sm:col-span-3 flex gap-1.5">
              <button
                type="button"
                onClick={() => insertImageHtml(imageUrl.trim(), imageAlt)}
                className="flex-1 px-3 py-2 rounded-lg bg-[#4C1D95] text-white text-xs font-semibold"
              >
                Sisip
              </button>
              <button
                type="button"
                onClick={() => setShowImageBox(false)}
                className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs bg-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editable Content Surface */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onKeyUp={captureSelection}
        onMouseUp={captureSelection}
        className={`min-h-[260px] max-h-[520px] overflow-y-auto px-5 py-4 rounded-xl border border-slate-200 focus:outline-none focus:border-[#4C1D95] [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[#4C1D95] [&_h3]:my-1.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_a]:text-[#4C1D95] [&_a]:underline [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 ${getTopicFontClass(
          style.fontFamily
        )} ${getTopicFontSizeClass(style.fontSize)} ${getTopicAlignClass(style.textAlign)}`}
        style={{
          color: style.textColor || '#1E293B',
          backgroundColor:
            style.backgroundColor && style.backgroundColor !== 'transparent'
              ? style.backgroundColor
              : '#FFFFFF',
        }}
      />
    </div>
  );
}
