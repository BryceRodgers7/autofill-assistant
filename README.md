# Job Application Autofill Assistant

Personal-use Chrome extension (Manifest V3) that scans job application pages, infers field meanings from labels and related text, and fills only high-confidence matches. **It never submits forms, never clicks submit, and never navigates automatically.**

## Requirements

- Node.js 20+
- Google Chrome (recent version with side panel support)

## Setup

```bash
npm install
npm run icons
npm run build
```

Development build with HMR:

```bash
npm run dev
```

## Load the unpacked extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Choose the `dist` folder from this project (created after `npm run build` or during `npm run dev`)

## Usage

1. Open your profile in the **extension popup** (toolbar icon). **Settings** (confidence bar, toggles) are **saved automatically** to storage (debounced) so **Fill** uses them even if you do not click **Save**. Use **Save profile & settings** for profile fields and JSON blocks.
2. **Confidence bar**: Fill compares each field’s score to this value. **Include lower-confidence when filling** (popup or side panel) uses a lower *effective* cutoff: `max(0.2, storedBar − 0.35)` so borderline fields (e.g. 0.48) can still fill when the stored bar is high (e.g. 0.72 → effective 0.37).
3. On an application page, click **Scan current tab** in the popup (or **Rescan** in the side panel).
4. Open the **side panel** from the popup to review detected fields, confidence, planned values, and classification reasons.
5. Use **Dry run** to preview actions without changing the page, then **Fill** when ready. Review everything and **submit manually** on the site.

### Education in your profile (JSON)

Each entry is one degree. Fields map to Greenhouse-style rows like **School**, **Degree**, **Discipline**, **Start year**, **End year** when you use **Fill** on `*.greenhouse.io` job boards (see below).

```json
[
  {
    "school": "University of Washington",
    "degree": "Bachelor of Science",
    "fieldOfStudy": "Computer Science",
    "startDate": "2016",
    "endDate": "2020"
  },
  {
    "school": "Stanford University",
    "degree": "Master of Science",
    "fieldOfStudy": "Artificial Intelligence",
    "startDate": "2020-09",
    "endDate": "2022-06"
  }
]
```

- **`fieldOfStudy`** is your **Discipline** column (schema name is historical).
- **Years**: any string containing a 4-digit year works (e.g. `2016` or `2020-09`); the first `19xx`/`20xx` match is used for year dropdowns.

The generic classifier may still attach the key `education` to a single control and try to paste **stringified JSON** there. That is only useful for free-text “paste your education” boxes. **Greenhouse’s five dropdowns per row are filled by a separate pass** that reads `profile.education[]`, matches option **labels** to your strings, and clicks **Add another** when you have more degrees than visible rows.

## Architecture

| Part | Role |
|------|------|
| `src/background` | Service worker: typed message router, coordinates tab ↔ content, persists last scan in `chrome.storage.session` |
| `src/content` | DOM scan, classification pipeline, safe fill + highlights |
| `src/popup` | React control center: profile editor, settings, scan + open side panel |
| `src/sidepanel` | React review UI: filters, dry run / fill / rescan / clear highlights |
| `src/fieldDetection` | Visibility, labels, ARIA, context, radios/selects → `FieldDescriptor` |
| `src/classification` | Synonym dictionary + scoring → canonical `ProfileKey` + confidence |
| `src/fill` | Value set + `input`/`change` events, conservative checkbox/radio rules, no file auto-fill; Greenhouse structured education helper |
| `src/storage` | Zod schemas + `chrome.storage.local` for profile/settings |
| `src/shared` | Types, fingerprints, message contracts |
| `src/debug` | Structured logger gated by verbose setting |

```mermaid
flowchart LR
  popup[Popup_UI] --> bg[Background_SW]
  side[Side_Panel] --> bg
  bg --> cs[Content_Script]
  cs --> bg
```

## Safety constraints (MVP)

- No `form.submit()`, no programmatic submit clicks, no auto-navigation
- File inputs are detected and marked **manual** only
- Password fields are ignored by the detector
- Checkbox filling is limited (e.g. sponsorship) — consent/policy heuristics are penalized

## Tests

```bash
npm test
```

Unit tests cover the pure classification layer with common ATS-style labels.

## Limitations

- Shadow DOM / cross-origin iframes are not supported
- Some React-controlled sites may still need synonym tuning; extend `src/classification/synonyms.ts` and add tests
- **Greenhouse education**: School/Degree/Discipline must appear in the site’s dropdown lists (fuzzy label match). If your school is missing, add it in Greenhouse or pick **Other** and fill manually. Month-only fields (if shown) are not handled in this MVP.
