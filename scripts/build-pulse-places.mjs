// Writes the place lists of src/lib/pulsePlaces.js to server/app/services/pulse_places_data.json, where the server's
// reader of place names (pulse_places.py) loads them. Run after changing a list in pulsePlaces.js:
//
//   node scripts/build-pulse-places.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { placeTables } from '../src/lib/pulsePlaces.js';

const target = fileURLToPath(new URL('../server/app/services/pulse_places_data.json', import.meta.url));
writeFileSync(target, JSON.stringify(placeTables, null, 1) + '\n');
console.log(`${Object.keys(placeTables.places).length} provinces -> ${target}`);
