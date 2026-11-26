import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Palette,
  Underline,
} from 'lucide-react';
import { plainTextToRichHtml, sanitizeHtmlForStorage } from '../../lib/sanitizeHtml';
import {
  getTopicAlignClass,
  getTopicFontClass,
  getTopicFontSizeClass,
  type TopicStyle,
  type TopicTextAlign,
} from '../../types/miq';

interface ReflectionRichEditorProps {
  editorKey: string;
  value: string;
  placeholder?: string;
  style: TopicStyle;
  onChange: (html: string) => void;
  minHeightClass?: string;
}

const QUICK_TEXT_COLORS = [
  { label: 'Navy Gelap', hex: '#0F172A' },
  { label: 'Kelabu Teks', hex: '#1E293B' },
  { label: 'Ungu Diraja', hex: '#4C1D95' },
  { label: 'Emas Gelap', hex: '#854D0E' },
  { label: 'Hijau Zamrud', hex: '#065F46' },
];

export function ReflectionRichEditor({
  editorKey,
  value,
  placeholder = 'Tulis jawapan refleksi anda di sini...',
  style,
  onChange,
  minHeightClass = 'min-h-[130px]',
}: ReflectionRichEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [inlineColor, setInlineColor] = useState('#1E293B');
  const [isEmpty, setIsEmpty] = useState(
    () => !value || value.replace(/<[^>]+>/g, '').trim().length === 0
  );

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = value ? sanitizeHtmlForStorage(plainTextToRichHtml(value)) : '';
    if (el.innerHTML !== html) {
      el.innerHTML = html;
    }
    setIsEmpty(!el.textContent || el.textContent.trim().length === 0);
    // Re-sync DOM only when switching reflection sessions (editorKey changes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorKey]);

  const captureSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
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
    const textOnly = (el.textContent || '').trim();
    setIsEmpty(textOnly.length === 0);
    if (textOnly.length === 0) {
      onChange('');
      return;
    }
    const cleaned = sanitizeHtmlForStorage(el.innerHTML);
    onChange(cleaned);
  };

  const exec = (command: string, val?: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, val);
    captureSelection();
    emitChange();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-[#4C1D95] transition-colors">
      {/* Compact Formatting Toolbar */}
      <div className="px-3 py-2 bg-[#F8F9FC] border-b border-slate-200 flex flex-wrap items-center gap-1">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('bold')}
          title="Tebal (Bold)"
          aria-label="Tebal"
          className="p-1.5 rounded-md border border-slate-200 bg-white text-[#0F172A] hover:bg-slate-50"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('italic')}
          title="Condong (Italic)"
          aria-label="Condong"
          className="p-1.5 rounded-md border border-slate-200 bg-white text-[#0F172A] hover:bg-slate-50"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('underline')}
          title="Bergaris (Underline)"
          aria-label="Bergaris"
          className="p-1.5 rounded-md border border-slate-200 bg-white text-[#0F172A] hover:bg-slate-50"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('insertUnorderedList')}
          title="Senarai Berbulet"
          aria-label="Senarai Berbulet"
          className="p-1.5 rounded-md border border-slate-200 bg-white text-[#0F172A] hover:bg-slate-50"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('insertOrderedList')}
          title="Senarai Bernombor"
          aria-label="Senarai Bernombor"
          className="p-1.5 rounded-md border border-slate-200 bg-white text-[#0F172A] hover:bg-slate-50"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {(
          [
            ['justify', AlignJustify, 'Justify (Rata Kiri & Kanan)', 'justifyFull'],
            ['left', AlignLeft, 'Jajar Kiri', 'justifyLeft'],
            ['center', AlignCenter, 'Jajar Tengah', 'justifyCenter'],
            ['right', AlignRight, 'Jajar Kanan', 'justifyRight'],
          ] as Array<
            [
              TopicTextAlign,
              React.ComponentType<{ className?: string }>,
              string,
              string,
            ]
          >
        ).map(([, IconComp, label, cmd]) => (
          <button
            key={cmd}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(cmd)}
            title={label}
            aria-label={label}
            className="p-1.5 rounded-md border border-slate-200 bg-white text-[#0F172A] hover:bg-slate-50"
          >
            <IconComp className="w-3.5 h-3.5" />
          </button>
        ))}

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Text color swatches & picker */}
        <div className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md border border-slate-200 bg-white">
          <Palette className="w-3 h-3 text-slate-500" />
          {QUICK_TEXT_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setInlineColor(c.hex);
                exec('foreColor', c.hex);
              }}
              title={c.label}
              className="w-4 h-4 rounded border border-slate-300"
              style={{ backgroundColor: c.hex }}
            />
          ))}
          <input
            type="color"
            value={inlineColor}
            onChange={(e) => {
              setInlineColor(e.target.value);
              exec('foreColor', e.target.value);
            }}
            title="Pilih warna teks"
            className="w-4 h-4 cursor-pointer bg-transparent border-0 p-0"
          />
        </div>
      </div>

      {/* Editable Content Surface with Clean Placeholder */}
      <div className="relative">
        {isEmpty && (
          <div className="pointer-events-none absolute top-3.5 left-4 right-4 text-xs text-slate-400 leading-relaxed">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onKeyUp={captureSelection}
          onMouseUp={captureSelection}
          onBlur={captureSelection}
          className={`${minHeightClass} max-h-[340px] overflow-y-auto px-4 py-3.5 focus:outline-none [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-1.5 ${getTopicFontClass(
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
    </div>
  );
}
