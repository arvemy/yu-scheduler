# yu-data (data pipeline)

Crawlers and parsers for Yaşar University academic data.

Two things live here:

1. **OBS Bologna catalog crawler** — fetches the current curriculum of every
   associate / bachelor / master program from the OBS Bologna information system
   (<https://obs.yasar.edu.tr/oibs/bologna/>) and emits one canonical, bilingual
   (TR + EN) catalog JSON plus a diagnostics report.
2. **Term course-list PDF parser** — converts the registrar's "AÇILACAK DERS
   LİSTESİ" PDF for any term (fall, spring or summer school, e.g.
   `2026-2027-GUZ-DONEMI-ACILAN-DERSLER.pdf`) into YuScheduler term JSON.

## Relationship to YuScheduler

This directory lives inside the [YuScheduler](../README.md) repository and feeds its web app: it crawls, parses, and exports normalized Yaşar University academic data into the scheduler's `static/data/`. All commands below are run from this `data-pipeline/` directory.

## Setup

```bash
uv sync
```

The term-PDF parser additionally needs `pdftotext` (poppler-utils) on `PATH`.

## Usage

```bash
# Crawl OBS and write dist/catalog/2026-2027.json + dist/reports/2026-2027-crawl-report.json
uv run yu-data crawl-obs --academic-year 2026-2027

# Quick dry run: one program per degree
uv run yu-data crawl-obs --limit-per-degree 1

# Parse a term PDF into ../static/data/terms/2026-2027_fall.json and add it to
# the top of ../static/data/terms/index.json (--no-manifest -o <path> for a preview)
uv run yu-data parse-term-pdf data/raw/2026-2027-GUZ-DONEMI-ACILAN-DERSLER.pdf \
    --term "2026-2027 Fall"

# Slim dist/catalog/<year>.json into the scheduler's static data
# (writes ../static/data/catalog/<year>.json by default)
uv run yu-data export-catalog --academic-year 2026-2027
```

## Crawl scope (v1)

The crawler reads **curriculum tables only** (`#grdBolognaDersler` on
`progCourses.aspx`): course codes, bilingual names, AKTS, and elective-group
structure. It stores only the curriculum OBS currently shows as selected.

Per-course detail pages (`progCourseDetails.aspx`) are **not** fetched, so
`instructors` / `coordinator` / `prerequisites` are left empty and courses are
keyed by course code (the OBS `curCourse` id comes from the detail pages). The
schema already reserves those fields for a later pass. The standalone elective
pseudo-program (`curUnit=98 & curSunit=401109`) is excluded and recorded in the
report.

## Output

- `dist/catalog/<year>.json` — `academic_year`, `generated_at`, `source`,
  `programs[]` (bilingual names, faculty, selected-curriculum metadata,
  `requirements[]` of either a course or an elective group with `options[]`),
  and a `courses{}` map keyed by course code.
- `dist/reports/<year>-crawl-report.json` — counts, skipped programs, parse
  warnings, missing translations, and duplicate course-code conflicts.

`export-catalog` then projects the catalog onto the slim schema YuScheduler
consumes — `courses{}` (bilingual `title`, `akts`, `obs` links) and `programs[]`
(`id`, `degree`, bilingual `name`/`faculty`, and the flat list of member
`courses`) — written to `../static/data/catalog/<year>.json`.

## Layout

```
src/yu_data/
  cli.py                 # `yu-data` entrypoint (crawl-obs, parse-term-pdf, export-catalog)
  obs/                   # OBS Bologna crawler (client, programs, curriculum, catalog)
  schedules/term_pdf.py
data/raw/                # source PDFs
dist/                    # generated catalog + reports (gitignored)
tests/fixtures/          # saved OBS HTML + a PDF-text fixture
```

## Tests

```bash
uv run pytest
```

Tests run fully offline against saved fixtures in `tests/fixtures/`.

## License

MIT License. See [LICENSE](LICENSE).
