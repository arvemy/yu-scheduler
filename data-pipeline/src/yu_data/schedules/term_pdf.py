#!/usr/bin/env python3
"""Convert a term's "AÇILACAK DERS LİSTESİ" PDF into YuScheduler term JSON.

The registrar publishes the same layout every term (fall, spring and summer
school): section, course code, title, day, start and end time.
"""

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

# Some codes carry a variant suffix (``AIE 5599-2``, ``INRL 5033-2``): a separate
# offering with its own sections, so the suffix stays part of the course code.
TIMED_ROW_RE = re.compile(
    rf"^\s*(?P<section>\S+)\s+"
    rf"(?P<prefix>[A-ZÇĞİÖŞÜ]{{2,}})\s+"
    rf"(?P<number>\d{{4}}(?:-\d+)?)\s+"
    # A long title can run into the day column with no space ("SUÇLARCuma").
    # Day names are title-case while titles are upper-case, so this stays exact.
    rf"(?P<title>.*?)\s*"
    rf"(?P<day>{'|'.join(TURKISH_DAYS)})\s+"
    rf"(?P<start>\d{{2}}:\d{{2}})\s+"
    rf"(?P<end>\d{{2}}:\d{{2}})\s*$"
)
UNTIMED_ROW_RE = re.compile(
    r"^\s*(?P<section>\S+)\s+"
    r"(?P<prefix>[A-ZÇĞİÖŞÜ]{2,})\s+"
    r"(?P<number>\d{4}(?:-\d+)?)\s+"
    r"(?P<title>.+?)\s*$"
)
TIME_RE = re.compile(r"^\d{2}:\d{2}$")
# A trailing clock time signals a timed row whose day/time columns slipped past
# TIMED_ROW_RE (e.g. an ASCII day spelling), not a genuinely untimed course.
TRAILING_TIME_RE = re.compile(r"\d{1,2}:\d{2}\s*$")
PAGE_HEADER_RE = re.compile(r"^\d{4}-\d{4} AKADEMİK YILI")
TERM_RE = re.compile(r"^\d{4}-\d{4} (Fall|Spring|Summer)$")


def term_file_name(term: str) -> str:
    """``"2026-2027 Fall"`` -> ``"2026-2027_fall.json"`` (the manifest's naming)."""
    year, season = term.split(" ")
    return f"{year}_{season.lower()}.json"


def _term(value: str) -> str:
    if not TERM_RE.match(value):
        raise argparse.ArgumentTypeError(
            f"expected '<YYYY-YYYY> Fall|Spring|Summer', got {value!r}"
        )
    return value


def configure_parser(parser: argparse.ArgumentParser) -> None:
    """Register the parse-term-pdf arguments on ``parser``."""
    # Anchor defaults to the working directory, not __file__: after a wheel
    # install __file__ lives under site-packages. The pipeline lives in the
    # scheduler repo's data-pipeline/ directory, so run from there the scheduler
    # root is the parent of the working directory.
    terms_dir = Path.cwd().parent / "static/data/terms"
    default_manifest = terms_dir / "index.json"
    parser.add_argument("pdf", type=Path, help="Term course-list PDF to parse.")
    parser.add_argument(
        "--term",
        type=_term,
        required=True,
        help="Manifest term label, e.g. '2026-2027 Fall'.",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help=f"JSON output path (default: {terms_dir}/<year>_<season>.json)",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=default_manifest,
        help=f"Term manifest to update (default: {default_manifest})",
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
        or PAGE_HEADER_RE.match(stripped) is not None
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


def drop_redundant_placeholders(
    courses: OrderedDict[str, list[dict[str, str | None]]],
) -> list[str]:
    """Drop null-time rows from sections that also have timed sessions.

    The PDF sometimes lists an extra unscheduled hour next to a section's timed
    ones. YuScheduler only offers sections whose sessions are all timed, so that
    placeholder would make an otherwise schedulable section unusable. Returns a
    "<code> section <n>" entry for each section that lost a placeholder.
    """
    dropped: list[str] = []
    for code, sessions in courses.items():
        timed_sections = {s["Section"] for s in sessions if s["Day"] is not None}
        mixed = {
            s["Section"]
            for s in sessions
            if s["Day"] is None and s["Section"] in timed_sections
        }
        if not mixed:
            continue
        sessions[:] = [
            s for s in sessions if s["Day"] is not None or s["Section"] not in mixed
        ]
        dropped.extend(f"{code} section {section}" for section in sorted(mixed))
    return dropped


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
    if args.output is None:
        args.output = args.manifest.parent / term_file_name(args.term)

    # The manifest stores only the file name and the app resolves it next to
    # index.json, so registering an output written anywhere else would point the
    # app at a file that does not exist.
    if not args.no_manifest and (
        args.output.resolve().parent != args.manifest.resolve().parent
    ):
        print(
            f"Output {args.output} is not in the manifest directory "
            f"{args.manifest.parent}; pass --no-manifest or write it there.",
            file=sys.stderr,
        )
        return 2

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

    dropped_placeholders = drop_redundant_placeholders(courses)
    write_json(args.output, courses)
    if not args.no_manifest:
        update_manifest(args.manifest, args.term, args.output)

    # Count what was written: dropped placeholders are no longer in ``courses``.
    rows = [session for sessions in courses.values() for session in sessions]
    row_count = len(rows)
    untimed_count = sum(1 for session in rows if session["Day"] is None)
    timed_count = row_count - untimed_count
    print(
        f"Wrote {len(courses)} courses and {row_count} rows "
        f"({timed_count} timed, {untimed_count} untimed) to {args.output}"
    )
    if not args.no_manifest:
        print(f"Updated manifest {args.manifest} with {args.term!r}")
    if dropped_placeholders:
        print(
            f"Dropped untimed placeholders from {len(dropped_placeholders)} "
            "sections that also have timed sessions:"
        )
        for entry in dropped_placeholders:
            print(f"  - {entry}")
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
            "Parse a term's course-list PDF and write "
            "YuScheduler-compatible term data."
        )
    )
    configure_parser(parser)
    return run(parser.parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main())
