import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as geo from './pulseMap.js';
test('Indonesia extent rejects invalid coordinates and keeps provenance required',()=>{
  assert.equal(typeof geo.indonesiaPoints,'function');
  const rows=[{lat:-6.2,lon:106.8,provenance:'Source geotag',count:2},{lat:40,lon:-74,provenance:'Source geotag',count:1},{lat:-6,lon:107,count:10},{lat:NaN,lon:105,provenance:'x'}];
  assert.equal(geo.indonesiaPoints(rows).length,1);
  assert.deepEqual(geo.projectIndonesia(94,7),[20,20]);
});
