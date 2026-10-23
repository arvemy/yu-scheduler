"""A single, polite HTTP session for the OBS Bologna pages.

Defaults match the agreed crawl etiquette: one connection (sequential), 20s
timeout, 2 retries with backoff, and a 500ms delay between requests.
"""

from __future__ import annotations

import time

import httpx

BASE_URL = "https://obs.yasar.edu.tr/oibs/bologna/"
USER_AGENT = (
    "yu-data-crawler/0.1 (academic schedule tool; contact 22ardakorkmaz@gmail.com)"
)


class ObsClient:
    def __init__(
        self,
        *,
        base_url: str = BASE_URL,
        timeout: float = 20.0,
        retries: int = 2,
        delay: float = 0.5,
    ) -> None:
        self.base_url = base_url
        self.retries = retries
        self.delay = delay
        self._last_request = 0.0
        self._client = httpx.Client(
            base_url=base_url,
            timeout=timeout,
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
        )

    def _throttle(self) -> None:
        elapsed = time.monotonic() - self._last_request
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)

    def get_text(self, path: str, **params: object) -> str:
        """GET ``path`` with query ``params`` and return decoded text.

        Retries transient errors with linear backoff; raises the last error if
        every attempt fails.
        """
        last_error: Exception | None = None
        for attempt in range(self.retries + 1):
            self._throttle()
            try:
                response = self._client.get(path, params=params)
                self._last_request = time.monotonic()
                response.raise_for_status()
                return response.text
            except httpx.HTTPError as error:  # network errors + non-2xx
                self._last_request = time.monotonic()
                last_error = error
                if attempt < self.retries:
                    time.sleep(self.delay * (attempt + 1))
        assert last_error is not None
        raise last_error

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "ObsClient":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()
