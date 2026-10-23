import json
from pathlib import Path

from yu_data import cli
from yu_data.schedules import term_pdf
from yu_data.schedules.term_pdf import (
    drop_redundant_placeholders,
    parse_pdf_text,
    term_file_name,
)

FIXTURES = Path(__file__).parent / "fixtures"


def _sample() -> str:
    return (FIXTURES / "term_sample.txt").read_text(encoding="utf-8")


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


def test_output_outside_manifest_dir_rejected(tmp_path):
    terms = tmp_path / "terms"
    terms.mkdir()
    manifest = terms / "index.json"
    output = tmp_path / "elsewhere" / "preview.json"

    rc = cli.main(
        [
            "parse-term-pdf",
            str(tmp_path / "missing.pdf"),
            "--term",
            "2026-2027 Fall",
            "-o",
            str(output),
            "--manifest",
            str(manifest),
        ]
    )

    # Rejected before the PDF is even read, so nothing is written.
    assert rc == 2
    assert not output.exists()
    assert not manifest.exists()


FALL_TEXT = """\
                          2026-2027 AKADEMİK YILI GÜZ DÖNEMİ AÇILACAK DERS LİSTESİ

ŞUBE          DERS KODU                DERS ADI                GÜN   DERS BAŞLANGIÇ SAATİ   DERS BİTİŞ SAATİ

1      BTYL 5522          SOSYAL MEDYADA İŞLENEN SUÇLARCuma        17:40                  18:30
1      ARCH 5699             TEZ
1      ARCH 5699-3           TEZ
2      INRL 5033-2        TEZ
1      MATH 1131          CALCULUS I                     Cumartesi    09:40                  10:30
"""


def test_any_year_header_long_titles_and_suffixed_codes():
    courses, _untimed, unknown = parse_pdf_text(FALL_TEXT, include_untimed=True)

    assert unknown == []
    # Title glued to the day column still yields the timed session.
    assert courses["BTYL 5522"] == [
        {
            "Section": "1",
            "Day": "CUMA",
            "Start Time": "17:40",
            "End Time": "18:30",
            "Classroom": None,
        }
    ]
    # "Cuma" must not shadow "Cumartesi".
    assert courses["MATH 1131"][0]["Day"] == "CUMARTESI"
    # Variant suffixes are separate offerings with their own sections.
    assert set(courses) >= {"ARCH 5699", "ARCH 5699-3", "INRL 5033-2"}
    assert courses["INRL 5033-2"][0]["Section"] == "2"


def test_term_file_name():
    assert term_file_name("2026-2027 Fall") == "2026-2027_fall.json"
    assert term_file_name("2025-2026 Summer") == "2025-2026_summer.json"


def test_default_output_follows_term_and_updates_manifest(tmp_path, monkeypatch):
    monkeypatch.setattr(term_pdf, "extract_text", lambda _path: FALL_TEXT)
    terms = tmp_path / "terms"
    terms.mkdir()
    manifest = terms / "index.json"
    manifest.write_text(
        '[{"term": "2025-2026 Summer", "file": "2025-2026_summer.json"}]',
        encoding="utf-8",
    )

    rc = cli.main(
        [
            "parse-term-pdf",
            str(tmp_path / "fall.pdf"),
            "--term",
            "2026-2027 Fall",
            "--manifest",
            str(manifest),
        ]
    )

    assert rc == 0
    assert (terms / "2026-2027_fall.json").is_file()
    entries = json.loads(manifest.read_text(encoding="utf-8"))
    assert entries[0] == {"term": "2026-2027 Fall", "file": "2026-2027_fall.json"}
    assert entries[1]["term"] == "2025-2026 Summer"


def test_term_label_validated(tmp_path, capsys):
    try:
        cli.main(["parse-term-pdf", str(tmp_path / "x.pdf"), "--term", "Fall 2026"])
    except SystemExit as exit_:
        assert exit_.code == 2
    else:  # pragma: no cover
        raise AssertionError("invalid --term was accepted")
    assert "YYYY-YYYY" in capsys.readouterr().err


def test_placeholder_dropped_only_from_partly_timed_sections():
    text = (
        "1      LAWS 1110          HUKUKA GİRİŞ        Çarşamba    08:40      09:30\n"
        "1      LAWS 1110          HUKUKA GİRİŞ\n"
        "1      TF 4405            PROJE TASARIMI      Pazartesi   15:40      16:30\n"
        "2      TF 4405            PROJE TASARIMI\n"
    )
    courses, _untimed, unknown = parse_pdf_text(text, include_untimed=True)
    assert unknown == []

    dropped = drop_redundant_placeholders(courses)

    assert dropped == ["LAWS 1110 section 1"]
    assert [s["Day"] for s in courses["LAWS 1110"]] == ["ÇARŞAMBA"]
    # A wholly untimed section is a different section and keeps its placeholder.
    assert [(s["Section"], s["Day"]) for s in courses["TF 4405"]] == [
        ("1", "PAZARTESI"),
        ("2", None),
    ]
