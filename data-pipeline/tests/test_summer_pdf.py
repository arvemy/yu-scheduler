from pathlib import Path

from yu_data.schedules.summer_pdf import parse_pdf_text

FIXTURES = Path(__file__).parent / "fixtures"


def _sample() -> str:
    return (FIXTURES / "summer_sample.txt").read_text(encoding="utf-8")


def test_timed_rows_grouped_by_course():
    courses, untimed, unknown = parse_pdf_text(_sample(), include_untimed=True)

    assert unknown == []
    assert len(courses["ARCH 1020"]) == 2
    first = courses["ARCH 1020"][0]
    assert first == {
        "Section": "1",
        "Day": "SALI",
        "Start Time": "08:40",
        "End Time": "09:30",
        "Classroom": None,
    }
    assert courses["MATH 1011"][0]["Day"] == "PAZARTESI"


def test_untimed_included_as_placeholder():
    courses, untimed, unknown = parse_pdf_text(_sample(), include_untimed=True)

    assert "ENGL 0010" in courses
    assert courses["ENGL 0010"][0]["Day"] is None
    assert courses["ENGL 0010"][0]["Start Time"] is None
    assert any("ENGL 0010" in entry for entry in untimed)


def test_untimed_skipped_but_reported():
    courses, untimed, unknown = parse_pdf_text(_sample(), include_untimed=False)

    assert "ENGL 0010" not in courses
    assert any("ENGL 0010" in entry for entry in untimed)
    assert unknown == []


def test_timed_row_with_unparsed_day_rejected_not_untimed():
    # "Persembe" (ASCII spelling) slips past TIMED_ROW_RE; the trailing times
    # must flag the row as unknown rather than become a null-time placeholder.
    text = "1          ARCH 1020       TEMEL TASARIM      Persembe   08:40   09:30\n"
    courses, untimed, unknown = parse_pdf_text(text, include_untimed=True)

    assert courses == {}
    assert untimed == []
    assert len(unknown) == 1
    assert "ARCH 1020" in unknown[0]
