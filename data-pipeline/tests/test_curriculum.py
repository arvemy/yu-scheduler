from pathlib import Path

from yu_data.obs.curriculum import parse_curriculum

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_selected_curriculum_label_and_value():
    cur = parse_curriculum(_load("progCourses_en.html"))
    assert cur.selected_value == "402848"
    assert cur.selected_label.startswith("2025")


def test_semester_headers_tracked():
    cur = parse_curriculum(_load("progCourses_en.html"))
    semesters = [r.semester for r in cur.rows if r.kind == "semester"]
    assert semesters == [1, 2]


def test_required_course_row():
    cur = parse_curriculum(_load("progCourses_en.html"))
    arch = next(r for r in cur.rows if r.code == "ARCH 1013")
    assert arch.kind == "course"
    assert arch.is_option is False
    assert arch.semester == 1
    assert arch.akts == 6
    assert arch.compulsory is True
    assert arch.title == "ARCHITECTURAL GEOMETRY AND DRAWING"


def test_standalone_elective_row_is_not_compulsory():
    cur = parse_curriculum(_load("progCourses_en.html"))
    isg = next(r for r in cur.rows if r.code == "ISG 9110")
    assert isg.kind == "course"
    assert isg.is_option is False
    assert isg.compulsory is False


def test_elective_group_header():
    cur = parse_curriculum(_load("progCourses_en.html"))
    group = next(r for r in cur.rows if r.kind == "group")
    assert group.code == "UNV 1"
    assert group.required_count == 1
    assert group.akts == 2
    assert group.semester == 1
    assert group.group_id == "9001"


def test_group_option_rows_linked_to_group():
    cur = parse_curriculum(_load("progCourses_en.html"))
    group = next(r for r in cur.rows if r.kind == "group")
    options = [r for r in cur.rows if r.is_option and r.group_id == group.group_id]
    assert {o.code for o in options} == {"UFND 1820", "PHIL 0001"}
    assert all(o.semester == 1 for o in options)
    assert all(o.kind == "course" for o in options)


def test_turkish_types_and_titles():
    cur = parse_curriculum(_load("progCourses_tr.html"))
    arch = next(r for r in cur.rows if r.code == "ARCH 1013")
    isg = next(r for r in cur.rows if r.code == "ISG 9110")
    assert arch.compulsory is True
    assert isg.compulsory is False
    assert arch.title == "MİMARİ GEOMETRİ VE ÇİZİM"


def test_missing_grid_returns_empty_curriculum():
    cur = parse_curriculum("<html><body>no grid here</body></html>")
    assert cur.rows == []
    assert cur.selected_label is None
