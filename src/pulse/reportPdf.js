// Turns the report that is on screen into a PDF file.
// The pages are sent to the server as one self-contained HTML document: styles inline, pictures embedded, nothing
// left for the renderer to fetch. The server refuses a document that still points anywhere, so everything that could
// is removed or embedded here first.
import api from '../lib/api';

const EMBEDDED = /^data:image\/(?:png|jpeg|webp|gif);base64,/;

/** Whether one stylesheet rule may go into the printable document. A rule that would make the renderer fetch
 * (an import, a web font, a url() that is not embedded data) is left out. */
export function printableRule(cssText) {
  if (typeof cssText !== 'string' || !cssText) return false;
  if (/^\s*@(?:import|font-face|charset|namespace)\b/i.test(cssText)) return false;
  if (/expression\s*\(|-moz-binding|behavior\s*:/i.test(cssText)) return false;
  const urls = cssText.match(/url\(\s*(['"]?)([^)]*?)\1\s*\)/gi) || [];
  return urls.every(value => /url\(\s*['"]?data:image\/(?:png|jpeg|webp|gif);base64,/i.test(value));
}

/** A file name people can keep: "laporan-pulse-isu-pengunduran-diri-gibran-2026-11-14.pdf". */
export function reportFileName(label, day = new Date().toISOString().slice(0, 10)) {
  const slug = String(label || 'project').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 60) || 'project';
  return `laporan-pulse-${slug}-${day}.pdf`;
}

function printableCss() {
  const rules = [];
  for (const sheet of document.styleSheets) {
    let list;
    try { list = sheet.cssRules; } catch { continue; }   // a stylesheet from another origin cannot be read; it is not ours
    for (const rule of list) if (printableRule(rule.cssText)) rules.push(rule.cssText);
  }
  return rules.join('\n');
}

async function embedded(src) {
  try {
    const response = await fetch(src, { credentials: 'include' });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!/^image\/(?:png|jpeg|webp|gif)$/.test(blob.type) || blob.size > 400000) return null;
    return await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => resolve(null); reader.readAsDataURL(blob); });
  } catch { return null; }
}

/** The report pages under `root` as one self-contained HTML document.
 * Pictures are embedded when they can be read (ours always can; another site's only if it allows it) and dropped
 * otherwise, so the account's initials show instead. Controls marked `data-screen-only` are left out. */
export async function printableHtml(root, title = 'Laporan PULSE') {
  const clone = root.cloneNode(true);
  clone.querySelectorAll('[data-screen-only], script, iframe, object, embed, link, meta, base, form, input, select, textarea, video, audio, canvas, foreignObject').forEach(node => node.remove());
  const originals = [...root.querySelectorAll('img')], copies = [...clone.querySelectorAll('img')];
  await Promise.all(copies.map(async (image, index) => {
    const source = originals[index]?.currentSrc || originals[index]?.src || image.getAttribute('src') || '';
    const data = EMBEDDED.test(source) ? source : await embedded(source);
    for (const name of ['srcset', 'loading', 'decoding', 'referrerpolicy', 'crossorigin']) image.removeAttribute(name);
    if (data) image.setAttribute('src', data); else image.remove();
  }));
  for (const node of clone.querySelectorAll('*')) {
    for (const attribute of [...node.attributes]) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on')) node.removeAttribute(attribute.name);
      // A link may point to the web: a PDF does not fetch it. Everything else keeps only in-document references.
      else if ((name === 'href' || name === 'xlink:href') && node.tagName.toLowerCase() !== 'a' && !attribute.value.startsWith('#')) node.removeAttribute(attribute.name);
      else if (name === 'href' && node.tagName.toLowerCase() === 'a' && !/^(https?:\/\/|#)/i.test(attribute.value)) node.removeAttribute(attribute.name);
      else if (name === 'style' && !printableRule('x{' + attribute.value + '}')) node.removeAttribute(attribute.name);
    }
  }
  const safeTitle = String(title).replace(/[<>&"]/g, '');
  const frame = 'html,body{margin:0;padding:0;background:#fff}.pulse-standalone{min-height:0;background:#fff}';
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${safeTitle}</title><style>${printableCss()}\n${frame}</style></head>`
    + `<body><div class="pulse-standalone" data-theme="light">${clone.outerHTML}</div></body></html>`;
}

/** Make the PDF on the server and hand it to the browser as a download. Rejects with the API error when the server
 * cannot make PDFs (status 503): the caller then offers the browser's own print dialog. */
export async function downloadReportPdf(root, filename, title) {
  const made = await api.post('/admin/pulse/reports/pdf', { html: await printableHtml(root, title), filename });
  const bytes = Uint8Array.from(atob(made.pdf), char => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const anchor = Object.assign(document.createElement('a'), { href: url, download: made.filename || filename });
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return { filename: made.filename || filename, pages: made.pages ?? null };
}
