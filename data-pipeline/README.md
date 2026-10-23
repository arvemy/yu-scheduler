# yu-data

Crawlers and parsers for Yaşar University academic data.

Two things live here:

1. **OBS Bologna catalog crawler** — fetches the current curriculum of every
   associate / bachelor / master program from the OBS Bologna information system
   (<https://obs.yasar.edu.tr/oibs/bologna/>) and emits one canonical, bilingual
   (TR + EN) catalog JSON plus a diagnostics report.
2. **Summer-school PDF parser** — converts `YAZ-OKULU-ACILACAK-DERSLER-*.pdf`
   into YuScheduler term JSON (migrated from the original standalone script).

## Connected Scheduler Project

`yu-data` feeds the companion [YuScheduler](https://github.com/arvemy/yu-scheduler) web app. The two repositories are connected: this project crawls, parses, and exports normalized Yaşar University academic data, while YuScheduler consumes that data for course search and schedule generation.

## Setup

```bash
uv sync
```

The summer-PDF parser additionally needs `pdftotext` (poppler-utils) on `PATH`.

## Usage

```bash
# Crawl OBS and write dist/catalog/2025-2026.json + dist/reports/2025-2026-crawl-report.json
uv run yu-data crawl-obs --academic-year 2025-2026

# Quick dry run: one program per degree
uv run yu-data crawl-obs --limit-per-degree 1

# Parse the summer-school PDF (writes term JSON; --no-manifest keeps yu-scheduler untouched)
uv run yu-data parse-summer-pdf data/raw/YAZ-OKULU-ACILACAK-DERSLER-2025-2026.pdf \
    --no-manifest -o /tmp/2025-2026_summer.json

# Slim dist/catalog/<year>.json into the scheduler's static data
# (writes ../yu-scheduler/static/data/catalog/<year>.json by default)
uv run yu-data export-catalog --academic-year 2025-2026
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
`courses`) — written to `../yu-scheduler/static/data/catalog/<year>.json`.

## Layout

```
src/yu_data/
  cli.py                 # `yu-data` entrypoint (crawl-obs, parse-summer-pdf)
  obs/                   # OBS Bologna crawler (client, programs, curriculum, catalog)
  schedules/summer_pdf.py
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
