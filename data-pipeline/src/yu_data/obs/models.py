"""Dataclasses for the OBS Bologna crawl."""

from __future__ import annotations

from dataclasses import dataclass, field


# OBS unit-selection types -> degree levels we publish.
DEGREE_BY_TYPE = {
    "myo": "associate",
    "lis": "bachelor",
    "yls": "master",
}

# Standalone elective pseudo-program to exclude (kept only as a report entry).
EXCLUDED_PROGRAM = (98, 401109)


def _bilingual(tr: str | None, en: str | None) -> dict[str, str | None]:
    return {"tr": tr, "en": en}


@dataclass
class ProgramRef:
    """A program discovered from a unitSelection.aspx listing."""

    degree: str
    cur_unit: int
    cur_sunit: int
    name_tr: str | None = None
    name_en: str | None = None
    faculty_tr: str | None = None
    faculty_en: str | None = None

    @property
    def id(self) -> str:
        return f"{self.degree}-{self.cur_unit}-{self.cur_sunit}"


@dataclass
class GridRow:
    """One parsed row of the #grdBolognaDersler curriculum grid."""

    myid: int | None
    kind: str  # 'semester' | 'columns' | 'course' | 'group'
    semester: int | None = None
    code: str | None = None
    title: str | None = None
    tal: str | None = None
    compulsory: bool | None = None
    akts: float | int | None = None
    required_count: int | None = None
    mode: str | None = None
    group_id: str | None = None
    is_option: bool = False


@dataclass
class Curriculum:
    """A parsed (single-language) curriculum for one program."""

    selected_label: str | None = None
    selected_value: str | None = None
    rows: list[GridRow] = field(default_factory=list)
