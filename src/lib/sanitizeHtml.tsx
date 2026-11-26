import React from 'react';
import {
  getTopicAlignClass,
  getTopicFontClass,
  getTopicFontSizeClass,
  isSafeHttpUrl,
  resolveAssetUrl,
  type TopicStyle,
} from '../types/miq';

const ALLOWED_FONT_FAMILIES = [
  'Plus Jakarta Sans',
  'Lora',
  'JetBrains Mono',
  'sans-serif',
  'serif',
  'monospace',
];

function sanitizeCssValue(prop: string, value: string): string | null {
  const clean = value.trim();
  if (!clean || /url\(|expression\(|javascript:/i.test(clean)) return null;

  if (prop === 'color' || prop === 'background-color') {
    if (
      /^#[0-9a-fA-F]{3,8}$/.test(clean) ||
      /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*(0|1|0?\.\d+))?\s*\)$/.test(
        clean
      ) ||
      clean === 'transparent'
    ) {
      return clean;
    }
    return null;
  }

  if (prop === 'text-align') {
    if (['left', 'right', 'center', 'justify'].includes(clean.toLowerCase())) {
      return clean.toLowerCase();
    }
    return null;
  }

  if (prop === 'font-size') {
    if (/^\d{1,2}(\.\d+)?(px|rem|em)$/.test(clean)) {
      return clean;
    }
    return null;
  }

  if (prop === 'font-family') {
    const matched = ALLOWED_FONT_FAMILIES.find((f) =>
      clean.toLowerCase().includes(f.toLowerCase())
    );
    return matched ? matched : null;
  }

  return null;
}

function parseSafeInlineStyle(el: Element): React.CSSProperties {
  const styleAttr = el.getAttribute('style');
  const out: React.CSSProperties = {};
  if (styleAttr) {
    for (const part of styleAttr.split(';')) {
      const idx = part.indexOf(':');
      if (idx === -1) continue;
      const prop = part.slice(0, idx).trim().toLowerCase();
      const val = sanitizeCssValue(prop, part.slice(idx + 1));
      if (!val) continue;
      if (prop === 'color') out.color = val;
      if (prop === 'background-color') out.backgroundColor = val;
      if (prop === 'text-align') out.textAlign = val as React.CSSProperties['textAlign'];
      if (prop === 'font-size') out.fontSize = val;
      if (prop === 'font-family') out.fontFamily = val;
    }
  }

  if (el.tagName === 'FONT') {
    const color = el.getAttribute('color');
    if (color) {
      const safe = sanitizeCssValue('color', color);
      if (safe) out.color = safe;
    }
    const size = el.getAttribute('size');
    const sizeMap: Record<string, string> = {
      '1': '12px',
      '2': '14px',
      '3': '16px',
      '4': '18px',
      '5': '20px',
      '6': '24px',
      '7': '28px',
    };
    if (size && sizeMap[size]) {
      out.fontSize = sizeMap[size];
    }
  }

  return out;
}

function domNodeToReact(node: ChildNode, key: string): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as Element;
  const tag = el.tagName.toUpperCase();
  const children = Array.from(el.childNodes).map((child, idx) =>
    domNodeToReact(child, `${key}-${idx}`)
  );
  const safeStyle = parseSafeInlineStyle(el);

  switch (tag) {
    case 'BR':
      return <br key={key} />;
    case 'P':
      return (
        <p key={key} style={safeStyle} className="leading-[1.75]">
          {children}
        </p>
      );
    case 'DIV':
      return (
        <div key={key} style={safeStyle} className="leading-[1.75]">
          {children}
        </div>
      );
    case 'H1':
    case 'H2':
      return (
        <h2
          key={key}
          style={safeStyle}
          className="text-xl sm:text-2xl font-bold text-[#0F172A] mt-4 mb-2"
        >
          {children}
        </h2>
      );
    case 'H3':
    case 'H4':
      return (
        <h3
          key={key}
          style={safeStyle}
          className="text-lg font-semibold text-[#4C1D95] mt-3 mb-1.5"
        >
          {children}
        </h3>
      );
    case 'STRONG':
    case 'B':
      return (
        <strong key={key} style={safeStyle} className="font-bold">
          {children}
        </strong>
      );
    case 'EM':
    case 'I':
      return (
        <em key={key} style={safeStyle} className="italic">
          {children}
        </em>
      );
    case 'U':
      return (
        <u key={key} style={safeStyle} className="underline underline-offset-2">
          {children}
        </u>
      );
    case 'UL':
      return (
        <ul key={key} style={safeStyle} className="list-disc pl-6 space-y-1.5 my-2">
          {children}
        </ul>
      );
    case 'OL':
      return (
        <ol key={key} style={safeStyle} className="list-decimal pl-6 space-y-1.5 my-2">
          {children}
        </ol>
      );
    case 'LI':
      return (
        <li key={key} style={safeStyle}>
          {children}
        </li>
      );
    case 'BLOCKQUOTE':
      return (
        <blockquote
          key={key}
          style={safeStyle}
          className="p-4 rounded-lg bg-[#F8F9FC] border border-slate-200 italic my-2"
        >
          {children}
        </blockquote>
      );
    case 'SPAN':
    case 'FONT':
      return (
        <span key={key} style={safeStyle}>
          {children}
        </span>
      );
    case 'A': {
      const href = el.getAttribute('href') || '';
      if (!isSafeHttpUrl(href)) {
        return <span key={key}>{children}</span>;
      }
      return (
        <a
          key={key}
          href={resolveAssetUrl(href)}
          target="_blank"
          rel="noopener noreferrer"
          style={safeStyle}
          className="text-[#4C1D95] underline underline-offset-2 hover:text-[#3B0764]"
        >
          {children}
        </a>
      );
    }
    case 'IMG': {
      const src = el.getAttribute('src') || '';
      if (!isSafeHttpUrl(src)) return null;
      const alt = el.getAttribute('alt') || 'Imej pembelajaran M-IQ';
      return (
        <img
          key={key}
          src={resolveAssetUrl(src)}
          alt={alt}
          referrerPolicy="no-referrer"
          className="max-w-full h-auto rounded-lg border border-slate-200 my-3"
        />
      );
    }
    default:
      return <React.Fragment key={key}>{children}</React.Fragment>;
  }
}

export function sanitizeHtmlForStorage(rawHtml: string): string {
  if (!rawHtml) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return rawHtml;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const cleanNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const allowed = [
      'p',
      'div',
      'h2',
      'h3',
      'h4',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'ul',
      'ol',
      'li',
      'br',
      'span',
      'font',
      'blockquote',
      'a',
      'img',
    ];
    if (!allowed.includes(tag)) {
      return Array.from(el.childNodes).map(cleanNode).join('');
    }
    if (tag === 'br') return '<br>';
    if (tag === 'img') {
      const src = el.getAttribute('src') || '';
      if (!isSafeHttpUrl(src)) return '';
      const alt = (el.getAttribute('alt') || 'Imej').replace(/"/g, '&quot;');
      return `<img src="${src.replace(/"/g, '&quot;')}" alt="${alt}">`;
    }

    const attrs: string[] = [];
    if (tag === 'a') {
      const href = el.getAttribute('href') || '';
      if (isSafeHttpUrl(href)) {
        attrs.push(`href="${href.replace(/"/g, '&quot;')}"`);
        attrs.push('target="_blank"');
        attrs.push('rel="noopener noreferrer"');
      }
    }

    const styleObj = parseSafeInlineStyle(el);
    const styleParts: string[] = [];
    if (styleObj.color) styleParts.push(`color:${styleObj.color}`);
    if (styleObj.backgroundColor)
      styleParts.push(`background-color:${styleObj.backgroundColor}`);
    if (styleObj.textAlign) styleParts.push(`text-align:${styleObj.textAlign}`);
    if (styleObj.fontSize) styleParts.push(`font-size:${styleObj.fontSize}`);
    if (styleObj.fontFamily) styleParts.push(`font-family:${styleObj.fontFamily}`);
    if (styleParts.length > 0) {
      attrs.push(`style="${styleParts.join(';')}"`);
    }

    const inner = Array.from(el.childNodes).map(cleanNode).join('');
    const attrStr = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
    const outTag = tag === 'font' ? 'span' : tag;
    return `<${outTag}${attrStr}>${inner}</${outTag}>`;
  };

  return Array.from(doc.body.childNodes).map(cleanNode).join('');
}

export function plainTextToRichHtml(text: string): string {
  if (!text) return '<p></p>';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .split(/\n{2,}/)
    .filter((p) => p.trim().length > 0)
    .map((p) => {
      const escaped = p
        .trim()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      return `<p>${escaped}</p>`;
    })
    .join('');
}

export function RichContentRenderer({
  content,
  style,
}: {
  content: string;
  style: TopicStyle;
}) {
  const containerClass = `space-y-3 ${getTopicFontClass(style.fontFamily)} ${getTopicFontSizeClass(
    style.fontSize
  )} ${getTopicAlignClass(style.textAlign)}`;

  const containerStyle: React.CSSProperties = {
    color: style.textColor || '#1E293B',
    backgroundColor:
      style.backgroundColor && style.backgroundColor !== 'transparent'
        ? style.backgroundColor
        : undefined,
    padding:
      style.backgroundColor && style.backgroundColor !== 'transparent'
        ? '1.25rem'
        : undefined,
    borderRadius:
      style.backgroundColor && style.backgroundColor !== 'transparent'
        ? '0.75rem'
        : undefined,
  };

  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);

  if (!hasHtmlTags) {
    const paragraphs = content
      .split(/\n{2,}/)
      .filter((p) => p.trim().length > 0);
    return (
      <div className={containerClass} style={containerStyle}>
        {paragraphs.length === 0 ? (
          <p className="text-slate-400 italic">Tiada teks kandungan lagi.</p>
        ) : (
          paragraphs.map((paragraph, idx) => (
            <p key={idx} className="whitespace-pre-line">
              {paragraph.trim()}
            </p>
          ))
        )}
      </div>
    );
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(content, 'text/html');
  const nodes = Array.from(parsed.body.childNodes).map((node, idx) =>
    domNodeToReact(node, `rc-${idx}`)
  );

  return (
    <div className={containerClass} style={containerStyle}>
      {nodes}
    </div>
  );
}
