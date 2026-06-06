# Survey / Polling Feature — Design Spec

**Tanggal:** 2026-06-06
**Status:** Design — disetujui untuk build
**Project:** SINAR (gerak-ui) — React 19 + Vite + Tailwind, FastAPI + PostgreSQL

## 1. Tujuan
Admin membuat survey/polling; survey terbit sebagai **misi** di mobile app; user menjawab lewat UI polling yang baik; admin melihat hasil sebagai grafik (Recharts) real-time.

## 2. Keputusan
- Tipe pertanyaan: **single** (poll), **multiple**, **rating 1–5**, **yesno**, **text** (singkat).
- Grafik admin: **Recharts**.
- Admin UI: modul baru **"Survey"** di **Command Center** (shell modular bersih).
- Mobile: tambah **MissionType SURVEY**; misi tipe ini membuka komponen **SurveyRunner** (terintegrasi XP/misi).

## 3. Data model (SQLAlchemy, auto-create via create_all)
```
Survey:        id, title, description, status(draft|open|closed),
               mission_id FK->missions (nullable), created_by FK->users,
               closes_at (nullable), created_at
SurveyQuestion id, survey_id FK, order(int), type(single|multiple|rating|yesno|text),
               text, options(JSON list[str]|null), rating_max(int=5), required(bool=True)
SurveyResponse id, survey_id FK, user_id FK, submitted_at   UNIQUE(survey_id,user_id)
SurveyAnswer   id, response_id FK, question_id FK, value(JSON)
               value by type: single->"opt"; multiple->["a","b"]; rating->3;
               yesno->true/false; text->"..."
```
`MissionType` enum gains `SURVEY = "SURVEY"`.

## 4. Endpoints
**Admin** (`require_admin`, prefix `/api/admin/surveys`):
```
POST   /                      create survey (+ nested questions)
GET    /                      list
GET    /{id}                  survey + questions
PUT    /{id}                  update title/desc/status/questions
DELETE /{id}
POST   /{id}/publish          status=open + create linked Mission(type=SURVEY)
GET    /{id}/results          aggregated results (see §5)
```
**User** (`get_current_user`, prefix `/api/surveys`):
```
GET    /active                open surveys not yet answered by user
GET    /{id}                  survey + questions (to render)
POST   /{id}/respond          submit answers; one response/user; award XP
```

## 5. Results aggregation shape
```json
{ "survey_id": "...", "title": "...", "response_count": 42,
  "questions": [
    { "id":"q1","text":"...","type":"single",
      "distribution":[{"label":"A","count":18,"pct":42.9}, ...] },
    { "id":"q2","type":"rating","average":3.8,
      "distribution":[{"label":"1","count":2}, ...] },
    { "id":"q3","type":"text","texts":["...","..."] } ] }
```
Charts: single/multiple/yesno → bar (yesno also donut); rating → bar dist + average; text → list.

## 6. Frontend
**Command Center module "Survey"** (`src/components/admin/survey/`):
- `SurveyList.jsx` — list + status + "Buat survey" + publish.
- `SurveyBuilder.jsx` — judul/desc + tambah pertanyaan (tipe + opsi + wajib) + simpan.
- `SurveyResults.jsx` — Recharts grafik per pertanyaan + jumlah responden.
- Hook `src/hooks/useSurvey.js` (admin + results) with mock fallback.
- Add `survey` to `COMMAND_CENTER_ITEMS` (enabled) + route in `CommandCenter.jsx`.

**Mobile** (`src/components/mobile/SurveyRunner.jsx`):
- Stepper: satu pertanyaan/kartu; kontrol per tipe (radio, checkbox, rating bintang/angka, yes-no, textarea).
- Progress + submit → `POST /api/surveys/{id}/respond`.
- Integrasi minimal di `App.jsx`: saat misi bertipe SURVEY dibuka, render `<SurveyRunner>`; sukses → tandai misi selesai + XP.

**Dependency:** add `recharts`.

## 7. Guardrail / catatan
- Internal feedback tool (anggota SINAR) — bukan tool manipulasi. Sah.
- One response per user (UNIQUE) mencegah ballot-stuffing.
- Kolom baru auto-create di DB baru; DB lama perlu migrasi/drop.

## 8. Testing
- Backend pytest: create survey+questions, publish creates mission, respond stores answers + XP + uniqueness, results aggregation per type (single/multiple/rating/yesno/text).
- Frontend: build-based + manual (no test runner). Recharts renders with mock results.
