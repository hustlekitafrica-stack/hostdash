'use client';

import { useEffect } from 'react';

function applyFavicon(url: string) {
  if (!url) return;
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

export function DynamicFavicon() {
  useEffect(() => {
    const stored = localStorage.getItem('brand_favicon');
    if (stored) applyFavicon(stored);

    fetch('/api/settings/brand')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.favicon_url) {
          localStorage.setItem('brand_favicon', d.favicon_url);
          applyFavicon(d.favicon_url);
        }
      })
      .catch(() => {});

    const handler = () => {
      const url = localStorage.getItem('brand_favicon');
      if (url) applyFavicon(url);
    };
    window.addEventListener('brandUpdated', handler);
    return () => window.removeEventListener('brandUpdated', handler);
  }, []);

  return null;
}
