# Jakarta reference geometry

Source: geoBoundaries gbOpen IDN ADM1, `IDN-ADM1-65028918`, feature `Jakarta Special Capital Region` (`ID-JK`). Boundary year represented: **2017**. Original sources: © OpenStreetMap contributors / Wambacher. Upstream license: **Open Data Commons Open Database License 1.0 (ODbL)**.

- Metadata: https://www.geoboundaries.org/api/current/gbOpen/IDN/ADM1/
- Pinned simplified geometry: https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/IDN/ADM1/geoBoundaries-IDN-ADM1_simplified.geojson
- Attribution/license: https://www.openstreetmap.org/copyright
- Full license: https://opendatacommons.org/licenses/odbl/1-0/

The Jakarta feature was extracted unmodified from the simplified geometry and is distributed locally as `src/pulse/jakarta-boundary.json`, with attribution metadata added. It remains a separate reference-layer dataset, not social-listening observations. Rendering projects/clips it into the displayed mainland rectangle; the Thousand Islands are outside that extent. The outline does not claim current legal boundaries and never supplies account coordinates, mention counts, or demographic evidence. Preserve attribution and applicable ODbL obligations when redistributing the reference layer.

# Province outlines of the spread map

Source: the same pinned file, all 34 features of geoBoundaries gbOpen IDN ADM1 (`IDN-ADM1-65028918`). Boundary year represented: **2017**. Original sources: © OpenStreetMap contributors / Wambacher. Upstream license: **ODbL 1.0**.

`scripts/build-pulse-provinces.mjs <downloaded geojson>` projects the outlines to the map's 760 x 330 drawing, thins them to what that size can show (about 9,000 of 117,000 points), leaves out islets under 0.35 square units and writes `src/pulse/indonesia-provinces.json` (about 100 KB) with one path and one label point per province. This is a modified, produced work of the source: keep this attribution with it, and keep the credit line in the footer of the map ("Peta dasar © kontributor OpenStreetMap lewat geoBoundaries, lisensi ODbL").

The outlines are a reference layer only. They do not claim current legal boundaries: the four provinces created from Papua and Papua Barat in 2022 are not drawn separately, and places in them are counted under the 2017 province that contained them. The map plots places named in the text of posts; it never plots where an author or a reader is.
