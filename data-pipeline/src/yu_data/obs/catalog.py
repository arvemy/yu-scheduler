"""Assemble the canonical catalog JSON + crawl report from OBS pages.

v1 scope: curriculum tables only. Per-course detail pages
(progCourseDetails.aspx) are intentionally not fetched, so instructors,
coordinator and prerequisites are left empty and courses are keyed by course
code (the OBS ``curCourse`` id is only available from the detail pages).
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from typing import Callable, Iterable

from .client import BASE_URL, ObsClient
from .curriculum import parse_curriculum
from .models import (
    DEGREE_BY_TYPE,
    EXCLUDED_PROGRAM,
    Curriculum,
    ProgramRef,
)
from .programs import merge_languages, parse_program_list

SOURCE = BASE_URL
DETAIL_FETCH = "skipped_v1"

Logger = Callable[[str], None]


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def _prog_courses_url(lang: str, cur_sunit: int) -> str:
    return f"{BASE_URL}progCourses.aspx?lang={lang}&curSunit={cur_sunit}"


def _bilingual(tr: str | None, en: str | None) -> dict[str, str | None]:
    return {"tr": tr, "en": en}


def discover_programs(
    client: ObsClient, *, limit_per_degree: int | None, log: Logger
) -> tuple[list[ProgramRef], list[dict]]:
    """Return (programs, skipped) across associate/bachelor/master, TR+EN."""
    programs: list[ProgramRef] = []
    skipped: list[dict] = []
    for obs_type, degree in DEGREE_BY_TYPE.items():
        tr_html = client.get_text("unitSelection.aspx", type=obs_type, lang="tr")
        en_html = client.get_text("unitSelection.aspx", type=obs_type, lang="en")
        merged = merge_languages(
            parse_program_list(tr_html, degree, "tr"),
            parse_program_list(en_html, degree, "en"),
        )
        kept: list[ProgramRef] = []
        for program in merged:
            if (program.cur_unit, program.cur_sunit) == EXCLUDED_PROGRAM:
                skipped.append(
                    {
                        "id": program.id,
                        "degree": degree,
                        "cur_unit": program.cur_unit,
                        "cur_sunit": program.cur_sunit,
                        "reason": "excluded standalone elective pseudo-program",
                    }
                )
                continue
            kept.append(program)
        if limit_per_degree:
            kept = kept[:limit_per_degree]
        log(f"discovered {len(kept)} {degree} programs")
        programs.extend(kept)
    return programs, skipped


def _fetch_curriculum(
    client: ObsClient, cur_sunit: int, lang: str, warnings: list[str], program_id: str
) -> Curriculum:
    try:
        html = client.get_text("progCourses.aspx", lang=lang, curSunit=cur_sunit)
    except Exception as error:  # noqa: BLE001 - record and continue
        warnings.append(f"{program_id}: failed to fetch {lang} curriculum: {error}")
        return Curriculum()
    return parse_curriculum(html)


def _build_program(
    program: ProgramRef,
    en: Curriculum,
    tr: Curriculum,
    courses: dict[str, dict],
    report: dict,
    conflict_codes: set[str],
) -> dict | None:
    """Build one program entry; merge its courses into the shared map."""
    canonical = en if en.rows else tr
    if not canonical.rows:
        # No rows in either language (empty pages or both fetches failed): the
        # program is omitted, so record it as skipped to keep the count honest.
        report["skipped_programs"].append(
            {
                "id": program.id,
                "degree": program.degree,
                "cur_unit": program.cur_unit,
                "cur_sunit": program.cur_sunit,
                "reason": "empty curriculum",
            }
        )
        return None

    en_title = {r.myid: r.title for r in en.rows if r.myid is not None}
    tr_title = {r.myid: r.title for r in tr.rows if r.myid is not None}

    def titles(myid: int | None) -> dict[str, str | None]:
        return _bilingual(tr_title.get(myid), en_title.get(myid))

    src_urls = _bilingual(
        _prog_courses_url("tr", program.cur_sunit),
        _prog_courses_url("en", program.cur_sunit),
    )

    def record_course(row, name: dict[str, str | None]) -> None:
        # A code legitimately recurs across semesters/elective groups, so merge
        # occurrences: keep the first, fill missing translations, and only flag a
        # genuine AKTS conflict (once per code).
        code = row.code
        if code is None:
            return
        existing = courses.get(code)
        if existing is None:
            courses[code] = {
                "code": code,
                "title": dict(name),
                "akts": row.akts,
                "ects": row.akts,
                "instructors": [],
                "coordinator": None,
                "prerequisites": [],
                "source_urls": src_urls,
            }
            return
        for side in ("tr", "en"):
            if existing["title"][side] is None and name[side] is not None:
                existing["title"][side] = name[side]
        if existing["akts"] is None:
            existing["akts"] = existing["ects"] = row.akts
        elif (
            row.akts is not None
            and row.akts != existing["akts"]
            and code not in conflict_codes
        ):
            conflict_codes.add(code)
            report["duplicate_course_codes"].append(
                {
                    "code": code,
                    "akts_values": [existing["akts"], row.akts],
                    "program": program.id,
                }
            )

    requirements: list[dict] = []
    groups_by_id: dict[str, dict] = {}
    for row in canonical.rows:
        if row.kind == "group":
            group = {
                "type": "group",
                "group_code": row.code,
                "name": titles(row.myid),
                "semester": row.semester,
                "required_count": row.required_count,
                "akts": row.akts,
                "options": [],
            }
            requirements.append(group)
            if row.group_id is not None:
                groups_by_id[row.group_id] = group
        elif row.kind == "course":
            name = titles(row.myid)
            record_course(row, name)
            if row.is_option and row.group_id in groups_by_id:
                groups_by_id[row.group_id]["options"].append(
                    {"course_code": row.code, "akts": row.akts}
                )
            else:
                requirements.append(
                    {
                        "type": "course",
                        "semester": row.semester,
                        "course_code": row.code,
                        "akts": row.akts,
                        "compulsory": bool(row.compulsory),
                    }
                )

    if program.name_tr is None or program.name_en is None:
        missing = [
            side
            for side, val in (("tr", program.name_tr), ("en", program.name_en))
            if val is None
        ]
        report["missing_translations"].append(
            {"scope": "program", "id": program.id, "missing": missing}
        )

    return {
        "id": program.id,
        "degree": program.degree,
        "cur_unit": program.cur_unit,
        "cur_sunit": program.cur_sunit,
        "name": _bilingual(program.name_tr, program.name_en),
        "faculty": _bilingual(program.faculty_tr, program.faculty_en),
        "curriculum": {
            "selected_label": canonical.selected_label,
            "selected_value": canonical.selected_value,
        },
        "source_urls": src_urls,
        "requirements": requirements,
    }


def crawl(
    client: ObsClient,
    *,
    academic_year: str,
    limit_per_degree: int | None = None,
    log: Logger | None = None,
) -> tuple[dict, dict]:
    """Crawl OBS and return (catalog, report) dicts."""
    log = log or (lambda message: print(message, file=sys.stderr))

    report: dict = {
        "academic_year": academic_year,
        "generated_at": _now(),
        "source": SOURCE,
        "counts": {},
        "skipped_programs": [],
        "parse_warnings": [],
        "missing_translations": [],
        "duplicate_course_codes": [],
        "detail_fetch": DETAIL_FETCH,
    }

    program_refs, skipped = discover_programs(
        client, limit_per_degree=limit_per_degree, log=log
    )
    report["skipped_programs"] = skipped

    courses: dict[str, dict] = {}
    conflict_codes: set[str] = set()
    program_entries: list[dict] = []
    total = len(program_refs)
    for index, program in enumerate(program_refs, start=1):
        log(f"[{index}/{total}] {program.id} ({program.name_en or program.name_tr})")
        en = _fetch_curriculum(
            client, program.cur_sunit, "en", report["parse_warnings"], program.id
        )
        tr = _fetch_curriculum(
            client, program.cur_sunit, "tr", report["parse_warnings"], program.id
        )
        entry = _build_program(program, en, tr, courses, report, conflict_codes)
        if entry is not None:
            program_entries.append(entry)

    # Course translations are reported after merging, so a title supplied by any
    # program where the course appears counts as present.
    for code, course in courses.items():
        missing = [side for side in ("tr", "en") if course["title"][side] is None]
        if missing:
            report["missing_translations"].append(
                {"scope": "course", "code": code, "missing": missing}
            )

    catalog = {
        "academic_year": academic_year,
        "generated_at": report["generated_at"],
        "source": SOURCE,
        "programs": program_entries,
        "courses": courses,
    }

    group_count = sum(
        1 for entry in program_entries for req in entry["requirements"] if req["type"] == "group"
    )
    report["counts"] = {
        "programs": len(program_entries),
        "courses": len(courses),
        "groups": group_count,
        "skipped_programs": len(report["skipped_programs"]),
    }
    return catalog, report
