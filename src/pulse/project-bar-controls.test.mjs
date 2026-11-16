// The project bar's controls are one height (the owner, 16 Nov 2026: "tingginya beda2 ... using css components"): the
// picker, the scope toggle, the search field and the buttons all take the sm control size from the control system,
// and no page rule sets a height on them from outside.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('every control in the project bar asks for the sm control size', () => {
  const bar = read('./ProjectBar.jsx');
  assert.match(bar, /<select data-size="sm" value=\{id\}/, 'the project picker');
  assert.match(bar, /className="ps-scope-toggle" data-size="sm"/, 'the scope toggle');
  assert.match(bar, /<input type="search" data-size="sm" name="find"/, 'the search field');
  assert.match(bar, /<PulseButton size="sm" aria-expanded=\{mode === 'edit'\}/, 'Pengaturan');
  assert.match(bar, /<PulseButton size="sm" aria-expanded=\{mode === 'new'\}/, 'Project baru');
  assert.match(bar, /<PulseButtonLink size="sm" className="ps-project-search-link"><Link /, 'Pencarian cepat, a link drawn as the button');
});

test('the control system gives dropdowns, fields and the scope toggle an sm size, and no page rule sizes the bar', () => {
  const kit = read('./ds/analytics-kit.css');
  assert.match(kit, /:is\(select:not\(\[multiple\], \[size\]\), input:is\([^{]*\)\[data-size=sm\] \{ height: var\(--ps-control-sm\); min-height: var\(--ps-control-sm\);/, 'dropdowns and fields');
  assert.match(kit, /\.ps-scope-toggle\[data-size=sm\] \{ min-height: var\(--ps-control-sm\);/);
  for (const sheet of [kit, read('./project-bar.css'), read('./dashboard-polish.css'), read('./workspace-layout.css')])
    assert.doesNotMatch(sheet, /(?:\.ps-project-toolbar|\.ps-project-pick|\.ps-scope-toggle|\.ps-global-search|\.ps-project-actions)[^{]*\{[^}]*min-height:\s*\d+px/, 'no px height on a toolbar control');
});
