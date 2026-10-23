"""yu-data command-line entrypoint."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from . import scheduler_export
from .obs.catalog import crawl
from .obs.client import ObsClient
from .schedules import summer_pdf

def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def _configure_crawl_obs(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--academic-year", default="2025-2026")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Catalog JSON path (default: dist/catalog/<year>.json).",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=None,
        help="Crawl report path (default: dist/reports/<year>-crawl-report.json).",
    )
    parser.add_argument(
        "--limit-per-degree",
        type=int,
        default=0,
        help="Crawl at most N programs per degree (0 = all). Useful for a dry run.",
    )
    parser.add_argument("--timeout", type=float, default=20.0)
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
        help="Seconds to wait between requests (politeness).",
    )


def run_crawl_obs(args: argparse.Namespace) -> int:
    year = args.academic_year
    # Anchor default output to the working directory, not __file__: after a wheel
    # install __file__ lives under site-packages, so a project-root-relative
    # default would write into the venv (or fail when it is read-only).
    dist = Path.cwd() / "dist"
    output = args.output or dist / "catalog" / f"{year}.json"
    report_path = args.report or dist / "reports" / f"{year}-crawl-report.json"

    with ObsClient(
        timeout=args.timeout, retries=args.retries, delay=args.delay
    ) as client:
        catalog, report = crawl(
            client,
            academic_year=year,
            limit_per_degree=args.limit_per_degree or None,
        )

    write_json(output, catalog)
    write_json(report_path, report)

    counts = report["counts"]
    print(
        f"Wrote {counts['programs']} programs, {counts['courses']} courses, "
        f"{counts['groups']} elective groups to {output}"
    )
    print(
        f"Report: {report_path} "
        f"(skipped {counts['skipped_programs']}, "
        f"warnings {len(report['parse_warnings'])}, "
        f"missing-translations {len(report['missing_translations'])}, "
        f"duplicates {len(report['duplicate_course_codes'])})"
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="yu-data",
        description="Crawlers and parsers for Yaşar University academic data.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    crawl_parser = sub.add_parser(
        "crawl-obs", help="Crawl OBS Bologna and build the catalog JSON + report."
    )
    _configure_crawl_obs(crawl_parser)
    crawl_parser.set_defaults(func=run_crawl_obs)

    pdf_parser = sub.add_parser(
        "parse-summer-pdf", help="Parse the summer-school PDF into term JSON."
    )
    summer_pdf.configure_parser(pdf_parser)
    pdf_parser.set_defaults(func=summer_pdf.run)

    export_parser = sub.add_parser(
        "export-catalog",
        help="Slim the catalog JSON into the scheduler's static data.",
    )
    scheduler_export.configure_parser(export_parser)
    export_parser.set_defaults(func=scheduler_export.run)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
