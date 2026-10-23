"""Parse the #grdBolognaDersler curriculum grid from progCourses.aspx.

Grid columns (8):
    [0] info / expand control
    [1] course (or elective-group) code
    [2] course / group name
    [3] T+A+L (theory+application+lab); '-' for group headers
    [4] Compulsory/Elective (Zorunlu/Seçmeli)
    [5] ECTS / AKTS
    [6] group's required course count (only on group-header rows)
    [7] mode of delivery

Row types are identified structurally, not by content:
    * semester header  -> bgcolor #f2f2f2 ("N.Semester Course Plan")
    * column header     -> bgcolor #f7f7f7 (repeats every semester; skipped)
    * elective group    -> row carries toggleRow(this, GROUP_ID)
    * group option      -> row class contains collapse_GROUP_ID (bgcolor White)
    * plain course      -> any other data row (compulsory or standalone elective)
"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup
from bs4.element import Tag

from .models import Curriculum, GridRow
from .text import normalize_ws

_TOGGLE_RE = re.compile(r"toggleRow\(this,\s*(\d+)\)")
_COLLAPSE_RE = re.compile(r"^collapse_(\d+)$")
_SEMESTER_RE = re.compile(r"(\d+)")
_COMPULSORY = {"compulsory", "zorunlu"}
_ELECTIVE = {"elective", "seçmeli", "secmeli"}


def _to_number(text: str | None) -> float | int | None:
    text = (text or "").strip().replace(",", ".")
    if not text or text == "-":
        return None
    try:
        value = float(text)
    except ValueError:
        return None
    return int(value) if value.is_integer() else value


def _to_int(text: str | None) -> int | None:
    match = re.search(r"\d+", text or "")
    return int(match.group()) if match else None


def _selected_curriculum(soup: BeautifulSoup) -> tuple[str | None, str | None]:
    select = soup.find("select", id="cmbYillar")
    if select is None:
        return None, None
    option = select.find("option", selected=True) or select.find("option")
    if option is None:
        return None, None
    return option.get_text(strip=True) or None, option.get("value")


def _grid_rows(table: Tag) -> list[Tag]:
    body = table.find("tbody")
    container = body if body is not None else table
    return container.find_all("tr", recursive=False)


def parse_curriculum(html: str) -> Curriculum:
    soup = BeautifulSoup(html, "html.parser")
    label, value = _selected_curriculum(soup)
    curriculum = Curriculum(selected_label=label, selected_value=value)

    table = soup.find("table", id="grdBolognaDersler")
    if table is None:
        return curriculum

    current_semester: int | None = None
    for tr in _grid_rows(table):
        bgcolor = (tr.get("bgcolor") or "").lower()
        classes = tr.get("class") or []
        raw = str(tr)
        myid = _to_int(tr.get("myid"))

        if bgcolor == "#f2f2f2":  # semester header
            match = _SEMESTER_RE.search(tr.get_text(" ", strip=True))
            current_semester = int(match.group(1)) if match else current_semester
            curriculum.rows.append(
                GridRow(myid=myid, kind="semester", semester=current_semester)
            )
            continue
        if bgcolor == "#f7f7f7":  # repeated column header
            continue

        cells = [
            normalize_ws(td.get_text(" ", strip=True))
            for td in tr.find_all("td", recursive=False)
        ]
        if len(cells) < 8:
            continue
        code = cells[1] or None
        if code is None:
            continue

        type_text = (cells[4] or "").strip().lower()
        compulsory: bool | None
        if type_text in _COMPULSORY:
            compulsory = True
        elif type_text in _ELECTIVE:
            compulsory = False
        else:
            compulsory = None

        toggle = _TOGGLE_RE.search(raw)
        option_group = next(
            (m.group(1) for c in classes if (m := _COLLAPSE_RE.match(c))), None
        )

        if toggle is not None:  # elective group header
            curriculum.rows.append(
                GridRow(
                    myid=myid,
                    kind="group",
                    semester=current_semester,
                    code=code,
                    title=cells[2] or None,
                    tal=cells[3] or None,
                    compulsory=compulsory,
                    akts=_to_number(cells[5]),
                    required_count=_to_int(cells[6]),
                    mode=cells[7] or None,
                    group_id=toggle.group(1),
                )
            )
            continue

        if compulsory is None and option_group is None:
            # Not a recognizable course/group row (e.g. a totals row); skip.
            continue

        curriculum.rows.append(
            GridRow(
                myid=myid,
                kind="course",
                semester=current_semester,
                code=code,
                title=cells[2] or None,
                tal=cells[3] or None,
                compulsory=compulsory,
                akts=_to_number(cells[5]),
                mode=cells[7] or None,
                group_id=option_group,
                is_option=option_group is not None,
            )
        )

    return curriculum
