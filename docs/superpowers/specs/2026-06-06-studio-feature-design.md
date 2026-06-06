# Studio (AI Content) — MVP Design Spec

**Tanggal:** 2026-06-06
**Status:** Design — disetujui untuk build
**Project:** SINAR (gerak-ui)

## 1. Scope MVP (disetujui)
**Caption/Narasi AI + Meme/Image.** Clipper video DITUNDA (butuh ffmpeg/transkripsi). Build **prototype-first**: caption/teks real-capable via AI service (Claude); gambar pakai mock/komposit sampai provider gambar disiapkan.

Modul **"Studio"** baru di Command Center (aktifkan slot yang sudah ada).

## 2. Komponen
### A. Caption / Narasi
- Input: prompt/brief + **tone** (positif | negatif | netral | custom) + jumlah varian (default 4) + (opsional) `source_issue_id` dari Pulse.
- Output: N varian caption. Real via `get_ai_service().generate_text` dengan prompt tone-aware; **fallback mock** deterministik bila tak ada AI key/backend.
- Aksi: salin, simpan sebagai draft.

### B. Meme / Image
- Input: prompt.
- Output: caption pendek (top/bottom text) via AI/mock + area gambar. **Demo:** komposit klien (gambar placeholder/gradient + overlay teks) → bisa di-download. **Real (nanti):** ganti placeholder dgn provider gambar (pluggable, mis. OpenAI gpt-image/Stability).

## 3. Backend
- **AI:** pakai `app/services/ai` yang ada (`get_ai_service`, `generate_text`). Tambah `app/services/studio.py`:
  - `generate_captions(prompt, tone, n)` → AI atau `mock_captions(...)`.
  - `generate_meme(prompt)` → `{caption, top_text, bottom_text}` (AI atau mock), `image_url=None`.
- **Model:** `ContentDraft` (id, kind: caption|meme, prompt, tone, payload JSON, created_by, created_at).
- **Router** `routers/studio.py` (`require_admin`, prefix `/api/admin/studio`):
  ```
  POST /captions   {prompt, tone, n=4, source_issue_id?} -> {variants:[str]}
  POST /meme       {prompt}                               -> {caption, top_text, bottom_text, image_url}
  GET  /drafts                                            -> list
  POST /drafts     {kind, prompt, tone, payload}          -> draft
  DELETE /drafts/{id}
  ```
- Tone → instruksi prompt: positif=dukungan/optimis, negatif=kritis/waspada, netral=faktual, custom=pakai instruksi user. Caption brand sendiri (sah) — bukan komentar terkoordinasi.

## 4. Frontend
- `src/hooks/useStudio.js` — `useCaptions()`, `useMeme()`, `useDrafts()` (mock fallback).
- `src/components/admin/studio/StudioModule.jsx` — tab **Caption** | **Meme**.
  - `CaptionStudio.jsx`: prompt + tone chips + jumlah + Generate → kartu varian (salin/simpan).
  - `MemeStudio.jsx`: prompt + Generate → preview meme (area gambar + overlay top/bottom text) + Download + Simpan. Komposit via `<canvas>`/SVG di klien.
- Aktifkan `studio` (enabled) di `COMMAND_CENTER_ITEMS`; route `studio` di `CommandCenter.jsx`.

## 5. Testing
- Backend pytest: captions mock (no AI key → N varian), meme mock, drafts CRUD + require_admin.
- Frontend: build + Playwright (Studio render, generate caption muncul varian, meme preview muncul). Mock fallback demo.

## 6. Guardrail
- Studio membuat konten untuk **akun brand sendiri** (sah). Tone negatif = kritik faktual untuk konten brand, bukan serangan terkoordinasi. Tidak ada otomasi engagement.
