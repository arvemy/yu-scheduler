from pathlib import Path

from yu_data.obs.models import EXCLUDED_PROGRAM
from yu_data.obs.programs import merge_languages, parse_program_list

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_parse_bachelor_list_en():
    programs = parse_program_list(_load("unitSelection_lis_en.html"), "bachelor", "en")

    assert len(programs) > 20
    assert all(p.degree == "bachelor" for p in programs)
    # curUnit/curSunit are parsed from the showPac links
    agri = next(p for p in programs if p.cur_sunit == 401264)
    assert agri.cur_unit == 12
    assert "AGRICULTURAL" in (agri.name_en or "")
    assert "FACULTY OF AGRICULTURAL" in (agri.faculty_en or "")


def test_excluded_pseudo_program_is_parsed_but_identifiable():
    programs = parse_program_list(_load("unitSelection_lis_en.html"), "bachelor", "en")
    # parse_program_list stays pure; exclusion happens in the crawl orchestrator.
    assert any((p.cur_unit, p.cur_sunit) == EXCLUDED_PROGRAM for p in programs)


def test_program_and_faculty_names_have_whitespace_collapsed():
    # OBS ships doubled spaces inside a single text node (e.g. the live catalog's
    # "SOFTWARE  ENGINEERING"); parsing should canonicalize them to single spaces.
    html = """
    <div id="accordion">
      <div class="panel panel-default">
        <a data-bs-toggle="collapse" href="#x">ENGINEERING  FACULTY</a>
        <ul class="list-group">
          <li><a href="index.aspx?curOp=showPac&curUnit=1&curSunit=2">SOFTWARE  ENGINEERING</a></li>
        </ul>
      </div>
    </div>
    """
    programs = parse_program_list(html, "bachelor", "en")

    assert len(programs) == 1
    assert programs[0].name_en == "SOFTWARE ENGINEERING"
    assert programs[0].faculty_en == "ENGINEERING FACULTY"


def test_merge_languages_produces_bilingual_entries():
    tr = parse_program_list(_load("unitSelection_lis_tr.html"), "bachelor", "tr")
    en = parse_program_list(_load("unitSelection_lis_en.html"), "bachelor", "en")

    merged = merge_languages(tr, en)

    bilingual = [p for p in merged if p.name_tr and p.name_en]
    assert len(bilingual) >= 20
    sample = bilingual[0]
    assert sample.faculty_tr and sample.faculty_en
    # the merge keys on (cur_unit, cur_sunit), so there are no duplicate keys
    keys = [(p.cur_unit, p.cur_sunit) for p in merged]
    assert len(keys) == len(set(keys))
