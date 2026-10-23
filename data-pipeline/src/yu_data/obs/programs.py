"""Parse program listings from unitSelection.aspx.

The page is a Bootstrap accordion: one ``div.panel.panel-default`` per faculty/
school, whose collapsible body lists each program as a link to
``index.aspx?curOp=showPac&curUnit=..&curSunit=..``.
"""

from __future__ import annotations

from urllib.parse import parse_qs, urlparse

from bs4 import BeautifulSoup

from .models import ProgramRef
from .text import normalize_ws


def _query_int(href: str, key: str) -> int | None:
    values = parse_qs(urlparse(href).query).get(key)
    if not values:
        return None
    try:
        return int(values[0])
    except ValueError:
        return None


def parse_program_list(html: str, degree: str, lang: str) -> list[ProgramRef]:
    """Parse one unitSelection page into single-language ProgramRefs."""
    soup = BeautifulSoup(html, "html.parser")
    accordion = soup.find(id="accordion")
    programs: list[ProgramRef] = []
    if accordion is None:
        return programs

    for panel in accordion.find_all("div", class_="panel"):
        heading = panel.find("a", attrs={"data-bs-toggle": "collapse"})
        faculty = normalize_ws(heading.get_text(strip=True)) if heading else None

        for link in panel.select("ul.list-group li a[href*='curOp=showPac']"):
            href = link.get("href", "")
            cur_unit = _query_int(href, "curUnit")
            cur_sunit = _query_int(href, "curSunit")
            if cur_unit is None or cur_sunit is None:
                continue
            name = normalize_ws(link.get_text(strip=True)) or None
            program = ProgramRef(degree=degree, cur_unit=cur_unit, cur_sunit=cur_sunit)
            if lang == "tr":
                program.name_tr, program.faculty_tr = name, faculty
            else:
                program.name_en, program.faculty_en = name, faculty
            programs.append(program)

    return programs


def merge_languages(
    tr_programs: list[ProgramRef], en_programs: list[ProgramRef]
) -> list[ProgramRef]:
    """Merge TR + EN listings by (cur_unit, cur_sunit), preserving TR order."""
    merged: dict[tuple[int, int], ProgramRef] = {}
    for program in tr_programs:
        merged[(program.cur_unit, program.cur_sunit)] = program
    for program in en_programs:
        key = (program.cur_unit, program.cur_sunit)
        existing = merged.get(key)
        if existing is None:
            merged[key] = program
        else:
            existing.name_en = program.name_en
            existing.faculty_en = program.faculty_en
    return list(merged.values())
