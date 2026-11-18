/** Alterna o modo de tela cheia (API Fullscreen). */
export function toggleFullscreen(): void {
  const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  if (document.fullscreenElement || doc.webkitFullscreenElement) {
    try { void Promise.resolve((document.exitFullscreen?.bind(document) ?? doc.webkitExitFullscreen?.bind(doc))?.()).catch(() => {}); } catch { /* indisponível */ }
  } else {
    try { void Promise.resolve((el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el))?.()).catch(() => {}); } catch { /* indisponível (ex.: celular) */ }
  }
}
