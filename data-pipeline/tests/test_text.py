from yu_data.obs.text import normalize_ws


def test_collapses_internal_double_spaces():
    # OBS ships e.g. "SOFTWARE  ENGINEERING"; the canonical name is single-spaced.
    assert normalize_ws("SOFTWARE  ENGINEERING") == "SOFTWARE ENGINEERING"


def test_strips_ends_and_collapses_mixed_whitespace():
    assert normalize_ws("  FACULTY \t OF\n\nLAW  ") == "FACULTY OF LAW"


def test_normalizes_non_breaking_spaces():
    assert normalize_ws("A  B") == "A B"


def test_leaves_clean_text_unchanged():
    assert normalize_ws("ARCH 1013") == "ARCH 1013"
