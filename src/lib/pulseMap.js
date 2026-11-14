// Reference outlines only. Never creates observations or heat values.
export function referencePaths(geometry) {
  if (geometry?.type !== 'MultiPolygon') return [];
  return geometry.coordinates.flatMap(polygon => polygon.map(ring => ring.map(([lon, lat], index) => {
    const x = Math.round((58 + (lon - 106.68) / .32 * 300) * 100) / 100;
    const y = Math.round((30 + (-6.08 - lat) / .30 * 250) * 100) / 100;
    return `${index ? 'L' : 'M'}${x},${y}`;
  }).join('') + 'Z'));
}
import { validLocations } from './pulseData.js';

export function projectIndonesia(lon,lat) {
  return [20+(lon-94)*15,20+(7-lat)*15];
}
export function indonesiaPoints(locations=[]) {
  return validLocations(locations).filter(p=>p.lon>=94&&p.lon<=142&&p.lat>=-12&&p.lat<=7&&Number.isFinite(p.count)&&p.count>0);
}
export function indonesiaPaths(geometry) {
  const polygons=geometry.type==='MultiPolygon'?geometry.coordinates:[geometry.coordinates];
  return polygons.map(polygon=>polygon.map(ring=>ring.map(([lon,lat],i)=>`${i?'L':'M'}${projectIndonesia(lon,lat).map(n=>n.toFixed(2)).join(',')}`).join('')+'Z').join(''));
}
