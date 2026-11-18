/** Pequeno utilitário para criar elementos DOM de forma declarativa. */
type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, any> & { class?: string; style?: string; onclick?: (e: MouseEvent) => void };

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.setAttribute('style', v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') el.innerHTML = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Converte um canvas de pixel art em <img> ampliado sem suavização. */
export function pixelImg(canvas: HTMLCanvasElement, scale: number, cls = 'pixel'): HTMLImageElement {
  const img = document.createElement('img');
  img.src = canvas.toDataURL();
  img.width = canvas.width * scale;
  img.height = canvas.height * scale;
  img.className = cls;
  img.alt = '';
  return img;
}

/** Recorta um quadro de uma folha de sprites. */
export function frameCanvas(sheet: HTMLCanvasElement, fw: number, fh: number, index: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = fw;
  c.height = fh;
  c.getContext('2d')!.drawImage(sheet, index * fw, 0, fw, fh, 0, 0, fw, fh);
  return c;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
