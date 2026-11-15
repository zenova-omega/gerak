/** What to tell people when background analysis cannot reach the AI service (`ai_state` of the progress endpoint).
 * Empty when all is well. 'access' needs a person (a rejected key, an empty credit); 'busy' clears by itself. */
export function aiStateNotice(state) {
  if (state === 'access') return 'Analisis otomatis berhenti: layanan AI menolak akses atau saldonya habis. Setelah administrator memeriksanya, analisis berlanjut sendiri.';
  if (state === 'busy') return 'Layanan AI sedang sibuk. Analisis otomatis mencoba lagi sebentar lagi.';
  return '';
}
