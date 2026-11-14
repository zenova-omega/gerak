import { PlatformLabel } from "./PlatformIcon";
import React from 'react';
import { observedProfile } from '../../../lib/pulseChronology.js';
import { pulseDate } from '../../../lib/pulseData.js';

export default function ChronologyProfile({ node, account }) {
  if (!node) return null;
  const profile = observedProfile(node, account);
  return <section className="nx-observed-profile" aria-label="Profil berdasarkan bukti">
    <h3>Profil berdasarkan bukti</h3>
    <p>Hanya atribut publik dalam bukti yang dimuat. Bukan verifikasi identitas.</p>
    <dl>
      <dt>Nama akun di sumber</dt><dd>{profile.label}</dd>
      <dt>Platform</dt><dd><PlatformLabel platform={profile.platform} /></dd>
      <dt>Status bukti</dt><dd>{profile.status}</dd>
      <dt>Posting dalam rentang ini</dt><dd>{profile.count} · {profile.unknown} tanpa tanggal</dd>
      <dt>Publikasi pertama teramati</dt><dd>{pulseDate(profile.first)}</dd>
      <dt>Publikasi terakhir teramati</dt><dd>{pulseDate(profile.last)}</dd>
      <dt>Bio</dt><dd>{profile.bio}</dd>
      <dt>Demografi</dt><dd>{profile.demography}</dd>
    </dl>
    <p>Tidak menyimpulkan umur, gender, agama, etnis, lokasi atau afiliasi. Tidak mencocokkan identitas lintas akun. Sumber bukti tercantum di bawah.</p>
  </section>;
}
