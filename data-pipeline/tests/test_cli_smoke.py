import json
from pathlib import Path

from yu_data import cli
from yu_data.obs.catalog import crawl
from yu_data.obs.models import EXCLUDED_PROGRAM

FIXTURES = Path(__file__).parent / "fixtures"
EMPTY_ACCORDION = '<html><body><div class="panel-group" id="accordion"></div></body></html>'


def _load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


class FakeClient:
    """Serves saved fixtures in place of live OBS requests."""

    def get_text(self, path: str, **params: object) -> str:
        if path == "unitSelection.aspx":
            if params.get("type") == "lis":
                return _load(f"unitSelection_lis_{params['lang']}.html")
            return EMPTY_ACCORDION  # no myo/yls programs in this fixture set
        if path == "progCourses.aspx":
            return _load(f"progCourses_{params['lang']}.html")
        raise AssertionError(f"unexpected request: {path} {params}")

    def close(self) -> None:  # pragma: no cover - parity with ObsClient
        pass

    def __enter__(self) -> "FakeClient":
        return self

    def __exit__(self, *exc: object) -> None:
        pass


def test_crawl_builds_catalog_and_report():
    catalog, report = crawl(
        FakeClient(), academic_year="2025-2026", limit_per_degree=1, log=lambda _m: None
    )

    assert catalog["academic_year"] == "2025-2026"
    assert catalog["source"].startswith("https://obs.yasar.edu.tr")
    assert len(catalog["programs"]) == 1
    program = catalog["programs"][0]
    assert program["degree"] == "bachelor"
    assert program["name"]["tr"] and program["name"]["en"]
    assert program["curriculum"]["selected_value"] == "402848"
    # requirements contain both a course and an elective group with options
    kinds = {req["type"] for req in program["requirements"]}
    assert {"course", "group"} <= kinds
    group = next(r for r in program["requirements"] if r["type"] == "group")
    assert group["required_count"] == 1
    assert len(group["options"]) == 2

    assert catalog["courses"]  # course map populated
    sample = next(iter(catalog["courses"].values()))
    assert sample["instructors"] == [] and sample["coordinator"] is None

    assert report["detail_fetch"] == "skipped_v1"
    excluded = [
        s
        for s in report["skipped_programs"]
        if (s["cur_unit"], s["cur_sunit"]) == EXCLUDED_PROGRAM
    ]
    assert len(excluded) == 1


class EmptyCurriculumClient(FakeClient):
    """Like FakeClient but every curriculum page parses to zero rows."""

    def get_text(self, path: str, **params: object) -> str:
        if path == "progCourses.aspx":
            return EMPTY_ACCORDION
        return super().get_text(path, **params)


def test_empty_curriculum_counted_as_skipped():
    catalog, report = crawl(
        EmptyCurriculumClient(),
        academic_year="2025-2026",
        limit_per_degree=1,
        log=lambda _m: None,
    )

    # The one discovered program has no rows, so it is dropped from the catalog.
    assert catalog["programs"] == []
    empty = [s for s in report["skipped_programs"] if s["reason"] == "empty curriculum"]
    assert len(empty) == 1
    # The count must reflect both discovery exclusions and empty-curriculum drops.
    assert report["counts"]["skipped_programs"] == len(report["skipped_programs"])
    assert report["counts"]["skipped_programs"] >= 2


def test_cli_writes_outputs(tmp_path, monkeypatch):
    monkeypatch.setattr(cli, "ObsClient", lambda **kwargs: FakeClient())
    output = tmp_path / "catalog.json"
    report_path = tmp_path / "report.json"

    rc = cli.main(
        [
            "crawl-obs",
            "--academic-year",
            "2025-2026",
            "--limit-per-degree",
            "1",
            "-o",
            str(output),
            "--report",
            str(report_path),
        ]
    )

    assert rc == 0
    catalog = json.loads(output.read_text(encoding="utf-8"))
    assert catalog["programs"] and "courses" in catalog
    report = json.loads(report_path.read_text(encoding="utf-8"))
    assert report["counts"]["programs"] == 1
    assert report["detail_fetch"] == "skipped_v1"
