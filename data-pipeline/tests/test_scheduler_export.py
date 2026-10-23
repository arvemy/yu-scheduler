from yu_data.scheduler_export import build_scheduler_catalog

SAMPLE_CATALOG = {
    "academic_year": "2025-2026",
    "generated_at": "2026-06-04T13:00:48Z",
    "source": "https://obs.yasar.edu.tr/oibs/bologna/",
    "programs": [
        {
            "id": "associate-20-401110",
            "degree": "associate",
            "cur_unit": 20,
            "cur_sunit": 401110,
            "name": {"tr": "ADALET", "en": "JUSTICE"},
            "faculty": {"tr": "ADALET MYO", "en": "VOCATIONAL SCHOOL OF JUSTICE"},
            "curriculum": {"selected_label": "2024", "selected_value": "402586"},
            "source_urls": {"tr": "prog?tr", "en": "prog?en"},
            "requirements": [
                {
                    "type": "course",
                    "semester": 1,
                    "course_code": "ADLM 1001",
                    "akts": 5,
                    "compulsory": True,
                },
                {
                    "type": "group",
                    "group_code": "ELECT ADLM 1",
                    "name": {"tr": "SEÇMELİ", "en": "ELECTIVE"},
                    "semester": 1,
                    "required_count": 1,
                    "akts": 7,
                    "options": [
                        {"course_code": "ADLM 1500", "akts": 3},
                        {"course_code": "ADLM 1502", "akts": 3},
                        # A code that recurs as both a course and an option must
                        # be deduped, not double-listed.
                        {"course_code": "ADLM 1001", "akts": 5},
                    ],
                },
            ],
        }
    ],
    "courses": {
        "ADLM 1001": {
            "code": "ADLM 1001",
            "title": {"tr": "MEDENİ HUKUK BİLGİSİ", "en": "BASIC CIVIL LAW"},
            "akts": 5,
            "ects": 5,
            "instructors": [],
            "coordinator": None,
            "prerequisites": [],
            "source_urls": {
                "tr": "https://obs.yasar.edu.tr/oibs/bologna/progCourses.aspx?lang=tr&curSunit=401110",
                "en": "https://obs.yasar.edu.tr/oibs/bologna/progCourses.aspx?lang=en&curSunit=401110",
            },
        }
    },
}


def test_courses_keep_only_title_akts_obs():
    slim = build_scheduler_catalog(SAMPLE_CATALOG)

    assert slim["academic_year"] == "2025-2026"
    course = slim["courses"]["ADLM 1001"]
    assert course == {
        "title": {"tr": "MEDENİ HUKUK BİLGİSİ", "en": "BASIC CIVIL LAW"},
        "akts": 5,
        "obs": {
            "tr": "https://obs.yasar.edu.tr/oibs/bologna/progCourses.aspx?lang=tr&curSunit=401110",
            "en": "https://obs.yasar.edu.tr/oibs/bologna/progCourses.aspx?lang=en&curSunit=401110",
        },
    }
    # Curriculum-only fields are dropped.
    assert "ects" not in course
    assert "instructors" not in course
    assert "source_urls" not in course


def test_program_course_codes_flattened_deduped_sorted():
    slim = build_scheduler_catalog(SAMPLE_CATALOG)

    program = slim["programs"][0]
    assert program["id"] == "associate-20-401110"
    assert program["name"] == {"tr": "ADALET", "en": "JUSTICE"}
    assert program["faculty"]["en"] == "VOCATIONAL SCHOOL OF JUSTICE"
    # ADLM 1001 appears as both a course and a group option -> listed once.
    assert program["courses"] == ["ADLM 1001", "ADLM 1500", "ADLM 1502"]


def test_duplicate_en_names_are_disambiguated_by_thesis_and_language():
    # OBS hands both variants the same English name; the Turkish names differ.
    slim = build_scheduler_catalog(
        {
            "programs": [
                {
                    "id": "master-50-401269",
                    "degree": "master",
                    "name": {
                        "tr": "BİLİŞİM VE TEKNOLOJİ HUKUKU TÜRKÇE TEZLİ",
                        "en": "INFORMATICS AND TECHNOLOGY LAW",
                    },
                },
                {
                    "id": "master-50-401270",
                    "degree": "master",
                    "name": {
                        "tr": "BİLİŞİM VE TEKNOLOJİ HUKUKU TÜRKÇE TEZSİZ",
                        "en": "INFORMATICS AND TECHNOLOGY LAW",
                    },
                },
            ],
        }
    )

    names = {p["id"]: p["name"]["en"] for p in slim["programs"]}
    assert (
        names["master-50-401269"] == "INFORMATICS AND TECHNOLOGY LAW (Thesis/Turkish)"
    )
    assert names["master-50-401270"] == (
        "INFORMATICS AND TECHNOLOGY LAW (Non-Thesis/Turkish)"
    )


def test_unique_en_names_are_left_untouched():
    slim = build_scheduler_catalog(
        {
            "programs": [
                {
                    "id": "master-50-401269",
                    "degree": "master",
                    "name": {
                        "tr": "BİLİŞİM VE TEKNOLOJİ HUKUKU TÜRKÇE TEZLİ",
                        "en": "INFORMATICS AND TECHNOLOGY LAW",
                    },
                },
                {
                    "id": "master-1-1",
                    "degree": "master",
                    "name": {"tr": "EKONOMİ TÜRKÇE TEZSİZ", "en": "ECONOMICS"},
                },
            ],
        }
    )

    names = {p["id"]: p["name"]["en"] for p in slim["programs"]}
    # No collision -> no suffix appended, even though the Turkish names carry tokens.
    assert names["master-50-401269"] == "INFORMATICS AND TECHNOLOGY LAW"
    assert names["master-1-1"] == "ECONOMICS"


def test_names_and_titles_have_whitespace_collapsed():
    # Defensive net: even if the full catalog predates the crawler's parse-time
    # normalization, the slim export must emit single-spaced names/titles.
    slim = build_scheduler_catalog(
        {
            "programs": [
                {
                    "id": "bachelor-1-2",
                    "degree": "bachelor",
                    "name": {
                        "tr": "YAZILIM  MÜHENDİSLİĞİ",
                        "en": "SOFTWARE  ENGINEERING",
                    },
                    "faculty": {
                        "tr": "MÜHENDİSLİK  FAKÜLTESİ",
                        "en": "FACULTY  OF  ENGINEERING",
                    },
                }
            ],
            "courses": {
                "SE 101": {
                    "title": {"tr": "GİRİŞ  DERSİ", "en": "INTRO  COURSE"},
                    "akts": 6,
                }
            },
        }
    )

    program = slim["programs"][0]
    assert program["name"]["en"] == "SOFTWARE ENGINEERING"
    assert program["faculty"]["en"] == "FACULTY OF ENGINEERING"
    assert slim["courses"]["SE 101"]["title"]["en"] == "INTRO COURSE"
    assert slim["courses"]["SE 101"]["title"]["tr"] == "GİRİŞ DERSİ"


def test_tolerates_missing_fields():
    slim = build_scheduler_catalog({"courses": {"X 1": {}}, "programs": [{"id": "p"}]})

    assert slim["courses"]["X 1"] == {
        "title": {"tr": None, "en": None},
        "akts": None,
        "obs": {"tr": None, "en": None},
    }
    assert slim["programs"][0]["courses"] == []
