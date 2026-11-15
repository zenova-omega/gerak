import { colorGuide } from '../lib/pulseColorGuide';

/** The colour guide in the Settings gallery. Swatches are drawn from the live tokens, so the dark theme shows its own values.
 * The text is the same data as docs/PULSE-COLOR-GUIDE.md. */
export default function ColorGuide() {
  return <section className="pu-color-guide" aria-label="Panduan warna">
    <h3>Warna dan artinya</h3>
    <p className="pu-color-intro">Warna dipilih menurut arti, bukan selera. Semua berasal dari token <code>--ps-*</code>; tidak ada warna literal di CSS halaman. Warna tidak pernah menjadi satu-satunya penanda.</p>
    {colorGuide.map(group => <section key={group.id} className="pu-color-group" aria-labelledby={`pu-color-${group.id}`}>
      <header><h4 id={`pu-color-${group.id}`}>{group.title}</h4><p>{group.meaning}</p></header>
      <ul className="pu-color-tokens">{group.tokens.map(([token, name, use]) => <li key={token}>
        <span className="pu-color-swatch" style={{ background: `var(${token})` }} aria-hidden="true" />
        <div><strong>{name}</strong><code>{token}</code>{use && <small>{use}</small>}</div>
      </li>)}</ul>
      <p className="pu-color-rule"><b>Aturan.</b> {group.rule}</p>
    </section>)}
  </section>;
}
