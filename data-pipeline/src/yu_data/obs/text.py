"""Text normalization shared across the OBS parsers."""

from __future__ import annotations

import re

_WHITESPACE_RE = re.compile(r"\s+")


def normalize_ws(value: str) -> str:
    """Collapse internal whitespace runs to single spaces and strip the ends.

    OBS occasionally ships doubled (and non-breaking) spaces inside a single
    text node — e.g. ``SOFTWARE  ENGINEERING`` — which BeautifulSoup's
    ``strip=True`` does not touch, since it only trims the ends of each node.
    Collapsing here keeps catalog names/titles canonical so a normally typed,
    single-space query still matches them downstream.
    """
    return _WHITESPACE_RE.sub(" ", value).strip()
