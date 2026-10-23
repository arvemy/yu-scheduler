#!/usr/bin/env python3
"""Convert the 2025-2026 summer school PDF into YuScheduler term JSON."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from collections import OrderedDict
from pathlib import Path
from typing import Any


DEFAULT_TERM = "2025-2026 Summer"

TURKISH_DAYS = (
    "Pazartesi",
    "Salı",
    "Çarşamba",
    "Perşembe",
    "Cuma",
    "Cumartesi",
    "Pazar",
)
DAY_TO_SCHEDULER = {
    "Pazartesi": "PAZARTESI",
    "Salı": "SALI",
    "Çarşamba": "ÇARŞAMBA",
    "Perşembe": "PERŞEMBE",
    "Cuma": "CUMA",
    "Cumartesi": "CUMARTESI",
    "Pazar": "PAZAR",
}

TIMED_ROW_RE = re.compile(
    rf"^\s*(?P<section>\S+)\s+"
    rf"(?P<prefix>[A-ZÇĞİÖŞÜ]{{2,}})\s+"
    rf"(?P<number>\d{{4}})\s+"
    rf"(?P<title>.*?)\s+"
    rf"(?P<day>{'|'.join(TURKISH_DAYS)})\s+"
    rf"(?P<start>\d{{2}}:\d{{2}})\s+"
    rf"(?P<end>\d{{2}}:\d{{2}})\s*$"
)
UNTIMED_ROW_RE = re.compile(
    r"^\s*(?P<section>\S+)\s+"
    r"(?P<prefix>[A-ZÇĞİÖŞÜ]{2,})\s+"
    r"(?P<number>\d{4})\s+"
    r"(?P<title>.+?)\s*$"
)
TIME_RE = re.compile(r"^\d{2}:\d{2}$")
# A trailing clock time signals a timed row whose day/time columns slipped past
# TIMED_ROW_RE (e.g. an ASCII day spelling), not a genuinely untimed course.
TRAILING_TIME_RE = re.compile(r"\d{1,2}:\d{2}\s*$")


def configure_parser(parser: argparse.ArgumentParser) -> None:
    """Register the parse-summer-pdf arguments on ``parser``."""
    # Anchor defaults to the working directory, not __file__: after a wheel
    # install __file__ lives under site-packages (which does not ship data/raw),
    # so project-root-relative defaults would point at a nonexistent PDF inside
    # the venv and write the term JSON next to it. Run from the repo root the
    # cwd is the project root, so these resolve exactly as documented.
    cwd = Path.cwd()
    default_pdf = cwd / "data/raw/YAZ-OKULU-ACILACAK-DERSLER-2025-2026.pdf"
    scheduler_dir = cwd.parent / "yu-scheduler"
    default_output = scheduler_dir / "static/data/terms/2025-2026_summer.json"
    default_manifest = scheduler_dir / "static/data/terms/index.json"
    parser.add_argument(
        "pdf",
        nargs="?",
        type=Path,
        default=default_pdf,
        help=f"PDF to parse (default: {default_pdf})",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=default_output,
        help=f"JSON output path (default: {default_output})",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=default_manifest,
        help=f"Term manifest to update (default: {default_manifest})",
    )
    parser.add_argument(
        "--term",
        default=DEFAULT_TERM,
        help=f"Manifest term label (default: {DEFAULT_TERM!r})",
    )
    parser.add_argument(
        "--no-manifest",
        action="store_true",
        help="Only write the parsed term JSON; do not update index.json.",
    )
    parser.add_argument(
        "--skip-untimed",
        action="store_true",
        help="Skip untimed courses instead of writing null-time placeholders.",
    )


def extract_text(pdf_path: Path) -> str:
    if not pdf_path.is_file():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")
    if shutil.which("pdftotext") is None:
        raise RuntimeError("pdftotext is required. Install poppler-utils and retry.")

    result = subprocess.run(
        ["pdftotext", "-layout", str(pdf_path), "-"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return result.stdout


def is_ignorable_line(line: str) -> bool:
    stripped = line.strip()
    return (
        not stripped
        or stripped.startswith("2025-2026 AKADEMİK YILI")
        or stripped.startswith("ŞUBE")
        or stripped.startswith("DERS KODU")
    )


def parse_pdf_text(
    text: str, include_untimed: bool = True
) -> tuple[OrderedDict[str, list[dict[str, str | None]]], list[str], list[str]]:
    courses: OrderedDict[str, list[dict[str, str | None]]] = OrderedDict()
    untimed_courses: list[str] = []
    unknown_lines: list[str] = []

    for line_number, line in enumerate(text.splitlines(), start=1):
        if is_ignorable_line(line):
            continue

        timed_match = TIMED_ROW_RE.match(line)
        if timed_match:
            row = timed_match.groupdict()
            course_code = f"{row['prefix']} {row['number']}"
            start = row["start"]
            end = row["end"]
            if not TIME_RE.match(start) or not TIME_RE.match(end) or start >= end:
                unknown_lines.append(f"{line_number}: {line.rstrip()}")
                continue
            courses.setdefault(course_code, []).append(
                {
                    "Section": row["section"],
                    "Day": DAY_TO_SCHEDULER[row["day"]],
                    "Start Time": start,
                    "End Time": end,
                    "Classroom": None,
                }
            )
            continue

        untimed_match = UNTIMED_ROW_RE.match(line)
        if untimed_match:
            row = untimed_match.groupdict()
            title = row["title"].strip()
            # A timed row that fails TIMED_ROW_RE still matches here, folding its
            # day/time columns into the title. Treat those as unknown rather than
            # silently writing a null-time placeholder and losing the schedule.
            if TRAILING_TIME_RE.search(title):
                unknown_lines.append(f"{line_number}: {line.rstrip()}")
                continue
            course_code = f"{row['prefix']} {row['number']}"
            untimed_courses.append(f"{course_code} - {title}")
            if include_untimed:
                courses.setdefault(course_code, []).append(
                    {
                        "Section": row["section"],
                        "Day": None,
                        "Start Time": None,
                        "End Time": None,
                        "Classroom": None,
                    }
                )
            continue

        unknown_lines.append(f"{line_number}: {line.rstrip()}")

    return courses, untimed_courses, unknown_lines


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def update_manifest(path: Path, term: str, output_path: Path) -> None:
    existing: list[dict[str, str]] = []
    if path.exists():
        raw = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(raw, list):
            raise ValueError(f"Manifest must be a JSON array: {path}")
        for item in raw:
            if not isinstance(item, dict):
                continue
            item_term = item.get("term")
            item_file = item.get("file")
            if isinstance(item_term, str) and isinstance(item_file, str):
                existing.append({"term": item_term, "file": item_file})

    file_name = output_path.name
    next_manifest = [
        item
        for item in existing
        if item["term"] != term and item["file"] != file_name
    ]
    next_manifest.insert(0, {"term": term, "file": file_name})
    write_json(path, next_manifest)


def run(args: argparse.Namespace) -> int:
    text = extract_text(args.pdf)
    courses, untimed_courses, unknown_lines = parse_pdf_text(
        text, include_untimed=not args.skip_untimed
    )

    if unknown_lines:
        print("Unrecognized lines found; JSON was not written:", file=sys.stderr)
        for line in unknown_lines[:30]:
            print(f"  {line}", file=sys.stderr)
        if len(unknown_lines) > 30:
            print(f"  ... {len(unknown_lines) - 30} more", file=sys.stderr)
        return 1

    if not courses:
        print("No timed course rows were parsed; JSON was not written.", file=sys.stderr)
        return 1

    write_json(args.output, courses)
    if not args.no_manifest:
        update_manifest(args.manifest, args.term, args.output)

    row_count = sum(len(sessions) for sessions in courses.values())
    untimed_count = len(untimed_courses) if not args.skip_untimed else 0
    timed_count = row_count - untimed_count
    print(
        f"Wrote {len(courses)} courses and {row_count} rows "
        f"({timed_count} timed, {untimed_count} untimed) to {args.output}"
    )
    if not args.no_manifest:
        print(f"Updated manifest {args.manifest} with {args.term!r}")
    if untimed_courses and args.skip_untimed:
        print(f"Skipped {len(untimed_courses)} untimed courses:")
        for course in untimed_courses:
            print(f"  - {course}")
    elif untimed_courses:
        print(f"Included {len(untimed_courses)} untimed courses with null day/time fields.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Parse YAZ-OKULU-ACILACAK-DERSLER-2025-2026.pdf and write "
            "YuScheduler-compatible term data."
        )
    )
    configure_parser(parser)
    return run(parser.parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main())
