#!/usr/bin/env python3
"""Slim the OBS catalog down to what YuScheduler's UI needs.

The full ``dist/catalog/<year>.json`` is ~7 MB and curriculum-centric. The
scheduler only needs, per course, a bilingual title + AKTS + an OBS link, and,
per program, the set of course codes that belong to it (so the picker can be
filtered to one program). This module produces that slim view and writes it
straight into ``../yu-scheduler/static/data/catalog/<year>.json`` (mirroring how
``schedules/summer_pdf.py`` writes term JSON into the scheduler repo).
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from .obs.text import normalize_ws


def _clean(text: Any) -> Any:
    """Collapse whitespace on string values; pass ``None``/non-strings through."""
    return normalize_ws(text) if isinstance(text, str) else text


def _localized(value: Any) -> dict[str, str | None]:
    """Return a ``{"tr", "en"}`` dict, tolerating missing/partial input.

    Whitespace is normalized here as a defensive net so re-running
    ``export-catalog`` against an already-crawled ``dist/`` catalog still emits
    canonical, single-spaced names/titles (the crawler also normalizes at parse
    time, but the full catalog it reads from may predate that).
    """
    source = value if isinstance(value, dict) else {}
    return {"tr": _clean(source.get("tr")), "en": _clean(source.get("en"))}


def _program_course_codes(program: dict) -> list[str]:
    """Flatten a program's requirements into a deduped, sorted code list.

    A requirement is either a plain course (``course_code``) or an elective
    group whose ``options[]`` each carry a ``course_code``.
    """
    codes: set[str] = set()
    for req in program.get("requirements", []):
        if not isinstance(req, dict):
            continue
        if req.get("type") == "course":
            code = req.get("course_code")
            if code:
                codes.add(code)
        elif req.get("type") == "group":
            for option in req.get("options", []):
                if isinstance(option, dict) and option.get("course_code"):
                    codes.add(option["course_code"])
    return sorted(codes)


# OBS occasionally returns the same English name for a program's thesis and
# non-thesis variants while the Turkish names still differ (e.g. "BİLİŞİM VE
# TEKNOLOJİ HUKUKU TÜRKÇE TEZLİ" vs "... TEZSİZ" both map to "INFORMATICS AND
# TECHNOLOGY LAW"). The scheduler's program picker shows ``name.en`` alone, so
# such a pair is indistinguishable. These tokens map the distinguishing Turkish
# words onto the "(Thesis/Language)" suffix OBS already attaches to the English
# names of most such pairs.
_THESIS_TOKENS = {"TEZSİZ": "Non-Thesis", "TEZLİ": "Thesis"}
_LANGUAGE_TOKENS = {"İNGİLİZCE": "English", "TÜRKÇE": "Turkish"}


def _en_disambiguator(name_tr: str | None) -> str | None:
    """Build an English "(Thesis/Language)" suffix from a Turkish program name.

    Catalog program names are uppercase, so the distinguishing words are matched
    as exact tokens (no casefolding, which would mangle the Turkish dotted/dotless
    i). Returns ``None`` when neither distinguishing word is present.
    """
    tokens = (name_tr or "").split()
    thesis = next((v for token, v in _THESIS_TOKENS.items() if token in tokens), None)
    language = next(
        (v for token, v in _LANGUAGE_TOKENS.items() if token in tokens), None
    )
    parts = [part for part in (thesis, language) if part]
    return f"({'/'.join(parts)})" if parts else None


def _disambiguate_en_names(programs: list[dict]) -> None:
    """Suffix duplicate English program names so the EN-only picker stays unambiguous.

    Programs are grouped by ``(degree, name.en)``; every member of a group that
    shares a non-empty English name gets a "(Thesis/Language)" suffix derived from
    its Turkish name. Mutates ``programs`` in place.
    """
    by_en: dict[tuple[Any, str], list[dict]] = {}
    for program in programs:
        name_en = program["name"]["en"]
        if name_en:
            by_en.setdefault((program["degree"], name_en), []).append(program)

    for (_degree, name_en), members in by_en.items():
        if len(members) < 2:
            continue
        for program in members:
            suffix = _en_disambiguator(program["name"]["tr"])
            if suffix:
                program["name"]["en"] = f"{name_en} {suffix}"


def build_scheduler_catalog(catalog: dict) -> dict:
    """Project the full OBS catalog onto the slim scheduler schema."""
    courses = {
        code: {
            "title": _localized(course.get("title")),
            "akts": course.get("akts"),
            "obs": _localized(course.get("source_urls")),
        }
        for code, course in (catalog.get("courses") or {}).items()
    }

    programs = [
        {
            "id": program.get("id"),
            "degree": program.get("degree"),
            "name": _localized(program.get("name")),
            "faculty": _localized(program.get("faculty")),
            "courses": _program_course_codes(program),
        }
        for program in (catalog.get("programs") or [])
    ]
    _disambiguate_en_names(programs)

    return {
        "academic_year": catalog.get("academic_year"),
        "generated_at": catalog.get("generated_at"),
        "courses": courses,
        "programs": programs,
    }


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def configure_parser(parser: argparse.ArgumentParser) -> None:
    """Register the export-catalog arguments on ``parser``."""
    parser.add_argument("--academic-year", default="2025-2026")
    parser.add_argument(
        "--catalog",
        type=Path,
        default=None,
        help="Full catalog JSON to read (default: dist/catalog/<year>.json).",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help=(
            "Slim catalog output path "
            "(default: ../yu-scheduler/static/data/catalog/<year>.json)."
        ),
    )


def run(args: argparse.Namespace) -> int:
    year = args.academic_year
    # Anchor defaults to the working directory, not __file__: after a wheel
    # install __file__ lives under site-packages. Run from the repo root, the
    # cwd is the project root and the sibling yu-scheduler resolves as documented.
    cwd = Path.cwd()
    catalog_path = args.catalog or cwd / "dist" / "catalog" / f"{year}.json"
    output = (
        args.output
        or cwd.parent / "yu-scheduler" / "static/data/catalog" / f"{year}.json"
    )

    if not catalog_path.is_file():
        raise FileNotFoundError(
            f"Catalog not found: {catalog_path}. Run `yu-data crawl-obs` first."
        )

    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    slim = build_scheduler_catalog(catalog)
    write_json(output, slim)

    print(
        f"Wrote {len(slim['courses'])} courses and {len(slim['programs'])} "
        f"programs to {output}"
    )
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Slim the OBS catalog into YuScheduler-compatible catalog JSON."
    )
    configure_parser(parser)
    return run(parser.parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main())
