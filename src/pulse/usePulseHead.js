import { useEffect } from 'react';
import { icons, pageTitle, siteDescription, themeColor } from './siteMeta';

function tag(selector, create) {
  let node = document.head.querySelector(selector);
  if (!node) { node = create(); document.head.appendChild(node); }
  return node;
}
const meta = name => tag(`meta[name="${name}"]`, () => Object.assign(document.createElement('meta'), { name }));
const link = (rel, type) => tag(`link[rel="${rel}"]${type ? `[type="${type}"]` : ''}`, () => Object.assign(document.createElement('link'), { rel, ...(type ? { type } : {}) }));

/** Keeps the document head in step with the PULSE screen: the tab title names the page, and the icon,
 * description and browser chrome colour are PULSE's even when the page was served by the shared shell.
 * It updates the tags that exist and never adds a second one. */
export default function usePulseHead({ page, theme }) {
  useEffect(() => { document.title = pageTitle(page); }, [page]);
  useEffect(() => {
    document.documentElement.lang = 'id';
    meta('description').content = siteDescription;
    link('icon', 'image/svg+xml').href = icons.svg;
    link('apple-touch-icon').href = icons.touch;
  }, []);
  useEffect(() => { meta('theme-color').content = themeColor[theme] || themeColor.light; }, [theme]);
}
