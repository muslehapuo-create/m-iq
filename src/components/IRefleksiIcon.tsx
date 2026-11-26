import React from 'react';

interface IRefleksiIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadgeBackground?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<IRefleksiIconProps['size']>, string> = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-11 h-11',
  xl: 'w-14 h-14',
};

/**
 * Raw SVG markup for the bespoke i-Refleksi M-IQ emblem (notebook + pen + checkmark)
 * in M-IQ palette: deep navy (#0A1128), royal purple (#4C1D95), and soft gold (#C59B27 / #F5E6B8).
 * Used both as React SVG and rendered onto an offscreen canvas for official PDF exports.
 */
export const I_REFLEKSI_SVG_MARKUP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="256" height="256" fill="none">
  <defs>
    <linearGradient id="irefleksi-bg" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0A1128" />
      <stop offset="65%" stop-color="#2E1065" />
      <stop offset="100%" stop-color="#4C1D95" />
    </linearGradient>
    <linearGradient id="irefleksi-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F5E6B8" />
      <stop offset="55%" stop-color="#D4AF37" />
      <stop offset="100%" stop-color="#C59B27" />
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#irefleksi-bg)" stroke="#C59B27" stroke-width="2" />
  <!-- Notebook Cover & Page -->
  <rect x="14" y="12" width="30" height="40" rx="4" fill="#FFFFFF" stroke="#F5E6B8" stroke-width="1.5" />
  <!-- Notebook Spine Band -->
  <rect x="14" y="12" width="6.5" height="40" rx="2.5" fill="#4C1D95" />
  <!-- Spine Rings -->
  <rect x="11" y="18" width="6" height="2.6" rx="1.3" fill="#F5E6B8" />
  <rect x="11" y="26" width="6" height="2.6" rx="1.3" fill="#F5E6B8" />
  <rect x="11" y="34" width="6" height="2.6" rx="1.3" fill="#F5E6B8" />
  <rect x="11" y="42" width="6" height="2.6" rx="1.3" fill="#F5E6B8" />
  <!-- Checkmark Badge Inside Notebook -->
  <circle cx="32.5" cy="24.5" r="7" fill="#F3E8FF" stroke="#4C1D95" stroke-width="1.5" />
  <path d="M29.2 24.7 L31.6 27.1 L36.3 22.1" stroke="#C59B27" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
  <!-- Ruled Reflection Lines -->
  <line x1="24.5" y1="36" x2="39.5" y2="36" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round" />
  <line x1="24.5" y1="41.5" x2="36" y2="41.5" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round" />
  <!-- Pen Overlaid Diagonally -->
  <g transform="translate(32 28) rotate(38)">
    <rect x="11" y="-4" width="6" height="24" rx="2" fill="url(#irefleksi-gold)" stroke="#0A1128" stroke-width="1.2" />
    <rect x="11" y="1" width="6" height="3.2" fill="#4C1D95" />
    <path d="M11 20 L14 27 L17 20 Z" fill="#F5E6B8" stroke="#0A1128" stroke-width="1.1" stroke-linejoin="round" />
    <circle cx="14" cy="25.5" r="0.9" fill="#0A1128" />
  </g>
</svg>`;

export function IRefleksiIcon({
  className = '',
  size = 'md',
  showBadgeBackground = true,
}: IRefleksiIconProps) {
  const sizeCls = className || SIZE_CLASSES[size];

  if (!showBadgeBackground) {
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={sizeCls}
        aria-hidden="true"
      >
        <rect
          x="12"
          y="10"
          width="32"
          height="44"
          rx="4"
          fill="#FFFFFF"
          stroke="#C59B27"
          strokeWidth="2.4"
        />
        <rect x="12" y="10" width="7" height="44" rx="2.5" fill="#4C1D95" />
        <rect x="9" y="17" width="6" height="2.8" rx="1.4" fill="#F5E6B8" />
        <rect x="9" y="26" width="6" height="2.8" rx="1.4" fill="#F5E6B8" />
        <rect x="9" y="35" width="6" height="2.8" rx="1.4" fill="#F5E6B8" />
        <rect x="9" y="44" width="6" height="2.8" rx="1.4" fill="#F5E6B8" />
        <circle cx="32" cy="24" r="7.2" fill="#F3E8FF" stroke="#4C1D95" strokeWidth="1.8" />
        <path
          d="M28.6 24.2 L31.2 26.8 L35.8 21.6"
          stroke="#C59B27"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="23.5" y1="36.5" x2="39" y2="36.5" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="23.5" y1="42" x2="35.5" y2="42" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" />
        <g transform="translate(32 27) rotate(38)">
          <rect
            x="11"
            y="-4"
            width="6.4"
            height="24"
            rx="2"
            fill="#C59B27"
            stroke="#0A1128"
            strokeWidth="1.4"
          />
          <rect x="11" y="1" width="6.4" height="3.2" fill="#4C1D95" />
          <path
            d="M11 20 L14.2 27 L17.4 20 Z"
            fill="#F5E6B8"
            stroke="#0A1128"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={sizeCls}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="irefleksi-ui-bg" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0A1128" />
          <stop offset="65%" stopColor="#2E1065" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
        <linearGradient id="irefleksi-ui-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5E6B8" />
          <stop offset="55%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#C59B27" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#irefleksi-ui-bg)" stroke="#C59B27" strokeWidth="2" />
      <rect x="14" y="12" width="30" height="40" rx="4" fill="#FFFFFF" stroke="#F5E6B8" strokeWidth="1.5" />
      <rect x="14" y="12" width="6.5" height="40" rx="2.5" fill="#4C1D95" />
      <rect x="11" y="18" width="6" height="2.6" rx="1.3" fill="#F5E6B8" />
      <rect x="11" y="26" width="6" height="2.6" rx="1.3" fill="#F5E6B8" />
      <rect x="11" y="34" width="6" height="2.6" rx="1.3" fill="#F5E6B8" />
      <rect x="11" y="42" width="6" height="2.6" rx="1.3" fill="#F5E6B8" />
      <circle cx="32.5" cy="24.5" r="7" fill="#F3E8FF" stroke="#4C1D95" strokeWidth="1.5" />
      <path
        d="M29.2 24.7 L31.6 27.1 L36.3 22.1"
        stroke="#C59B27"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="24.5" y1="36" x2="39.5" y2="36" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <line x1="24.5" y1="41.5" x2="36" y2="41.5" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <g transform="translate(32 28) rotate(38)">
        <rect
          x="11"
          y="-4"
          width="6"
          height="24"
          rx="2"
          fill="url(#irefleksi-ui-gold)"
          stroke="#0A1128"
          strokeWidth="1.2"
        />
        <rect x="11" y="1" width="6" height="3.2" fill="#4C1D95" />
        <path
          d="M11 20 L14 27 L17 20 Z"
          fill="#F5E6B8"
          stroke="#0A1128"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <circle cx="14" cy="25.5" r="0.9" fill="#0A1128" />
      </g>
    </svg>
  );
}

/**
 * Renders the bespoke i-Refleksi M-IQ SVG emblem into a crisp PNG data URL for jsPDF embedding.
 */
export async function renderIRefleksiLogoDataUrl(): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  return new Promise((resolve) => {
    const svgBlob = new Blob([I_REFLEKSI_SVG_MARKUP], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, 256, 256);
        const dataUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      } catch {
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
