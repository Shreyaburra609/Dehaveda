"""Iteration 3 — /api/texts registry (3 devotional texts), audio per text,
voice-provider fallback disclosure, and locally hosted /images/*.jpg assets."""
import re
import time

import pytest
import requests

from conftest import API, BASE_URL

SCRIPTS = {
    "hi": (0x0900, 0x097F),
    "te": (0x0C00, 0x0C7F),
    "ta": (0x0B80, 0x0BFF),
    "kn": (0x0C80, 0x0CFF),
}

EXPECTED = {
    "hanuman-chalisa": 43,
    "aditya-hridayam": 10,
    "vishnu-sahasranama": 8,
}


def has_script(text, lang):
    lo, hi = SCRIPTS[lang]
    return any(lo <= ord(ch) <= hi for ch in text)


# ---------------- GET /api/texts ----------------
class TestTextsRegistry:
    @pytest.fixture(scope="class")
    def listing(self):
        r = requests.get(f"{API}/texts", timeout=30)
        assert r.status_code == 200, r.text[:300]
        return r.json()

    def test_three_texts_with_verse_counts(self, listing):
        got = {t["slug"]: t["verse_count"] for t in listing["texts"]}
        assert got == EXPECTED, got
        for t in listing["texts"]:
            assert t["title"].strip()
            assert t["author"].strip()
            assert t["subtitle"].strip()

    def test_voice_provider_fallback_reported(self, listing):
        assert listing["voice_provider"] == "openai", listing["voice_provider"]
        assert listing["native_voices"] is False

    def test_unknown_slug_404(self):
        r = requests.get(f"{API}/texts/does-not-exist", timeout=30)
        assert r.status_code == 404, r.status_code


# ---------------- GET /api/texts/{slug} ----------------
class TestTextDetail:
    @pytest.mark.parametrize("slug", list(EXPECTED))
    def test_full_payload(self, slug):
        r = requests.get(f"{API}/texts/{slug}", timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["slug"] == slug
        assert len(d["verses"]) == EXPECTED[slug]
        assert [x["code"] for x in d["languages"]] == ["en", "hi", "te", "ta", "kn"]
        assert d["notice"] and d["audio_notice"]
        assert d["voice_provider"] == "openai"
        assert d["native_voices"] is False
        assert "ElevenLabs" in d["audio_notice"]
        assert sorted(d["intro"].keys()) == ["en", "hi", "kn", "ta", "te"]
        for code, text in d["intro"].items():
            assert len(text.strip()) > 20, code
            if code in SCRIPTS:
                assert has_script(text, code), f"{slug}/{code} intro script"

    @pytest.mark.parametrize("slug", ["aditya-hridayam", "vishnu-sahasranama"])
    def test_verses_have_devanagari_translit_and_five_meanings(self, slug):
        d = requests.get(f"{API}/texts/{slug}", timeout=30).json()
        ids = [v["id"] for v in d["verses"]]
        assert len(set(ids)) == len(ids), "duplicate verse ids"
        prefix = "aditya" if slug == "aditya-hridayam" else "sahasranama"
        assert f"{prefix}-1" in ids, ids
        for v in d["verses"]:
            assert has_script(v["devanagari"], "hi"), v["id"]
            assert re.search(r"[A-Za-z]", v["transliteration"]), v["id"]
            assert sorted(v["meanings"].keys()) == ["en", "hi", "kn", "ta", "te"], v["id"]
            for code, text in v["meanings"].items():
                assert text and text.strip(), f"{v['id']}/{code} empty"
                if code in SCRIPTS:
                    assert has_script(text, code), f"{v['id']}/{code} wrong script: {text[:60]}"
                else:
                    assert re.search(r"[A-Za-z]", text), f"{v['id']}/en not latin"

    def test_no_key_leak(self):
        for slug in EXPECTED:
            blob = requests.get(f"{API}/texts/{slug}", timeout=30).text
            assert "sk-" not in blob
            assert "EMERGENT" not in blob.upper()
            assert "ELEVENLABS_API_KEY" not in blob

    def test_legacy_chalisa_route_still_returns_chalisa(self):
        r = requests.get(f"{API}/swara/chalisa", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["slug"] == "hanuman-chalisa"
        assert d["title"] == "Hanuman Chalisa"
        assert len(d["verses"]) == 43


# ---------------- POST /api/texts/{slug}/audio ----------------
class TestTextAudio:
    def _check_audio(self, slug, verse_id, lang):
        r = requests.post(f"{API}/texts/{slug}/audio",
                          json={"verse_id": verse_id, "lang": lang, "slug": slug}, timeout=180)
        assert r.status_code == 200, f"{slug}/{verse_id}/{lang}: {r.status_code} {r.text[:300]}"
        d = r.json()
        assert d["provider"] == "openai", d
        assert re.fullmatch(r"/api/tts/[a-f0-9]{16,64}\.mp3", d["url"]), d["url"]
        a = requests.get(f"{BASE_URL}{d['url']}", timeout=90)
        assert a.status_code == 200, a.status_code
        assert a.headers["content-type"] == "audio/mpeg"
        assert len(a.content) > 5000, len(a.content)
        return d

    @pytest.mark.parametrize("slug,verse_id", [
        ("hanuman-chalisa", "doha-1"),
        ("aditya-hridayam", "aditya-1"),
        ("vishnu-sahasranama", "sahasranama-1"),
    ])
    def test_recitation_audio_all_three_texts(self, slug, verse_id):
        self._check_audio(slug, verse_id, "sa")

    def test_meaning_audio_telugu_aditya(self):
        self._check_audio("aditya-hridayam", "aditya-2", "te")

    def test_meaning_audio_tamil_sahasranama(self):
        self._check_audio("vishnu-sahasranama", "sahasranama-2", "ta")

    def test_audio_cached_same_key(self):
        first = self._check_audio("aditya-hridayam", "aditya-3", "sa")
        t0 = time.time()
        r = requests.post(f"{API}/texts/aditya-hridayam/audio",
                          json={"verse_id": "aditya-3", "lang": "sa"}, timeout=180)
        elapsed = time.time() - t0
        assert r.status_code == 200
        assert r.json()["url"] == first["url"], "cache key changed"
        assert elapsed < 8, f"cached call took {elapsed:.1f}s"

    def test_legacy_audio_endpoint_with_slug(self):
        r = requests.post(f"{API}/swara/chalisa/audio",
                          json={"verse_id": "aditya-1", "lang": "sa",
                                "slug": "aditya-hridayam"}, timeout=180)
        assert r.status_code == 200, r.text[:300]
        assert r.json()["provider"] == "openai"

    def test_unknown_verse_404(self):
        r = requests.post(f"{API}/texts/aditya-hridayam/audio",
                          json={"verse_id": "aditya-99", "lang": "sa"}, timeout=60)
        assert r.status_code == 404, r.status_code

    def test_unknown_slug_404(self):
        r = requests.post(f"{API}/texts/nope-nope/audio",
                          json={"verse_id": "aditya-1", "lang": "sa"}, timeout=60)
        assert r.status_code == 404, r.status_code

    @pytest.mark.parametrize("body", [
        {"verse_id": "aditya-1", "lang": "zz"},
        {"verse_id": "ab", "lang": "sa"},
        {"lang": "sa"},
    ])
    def test_invalid_body_422(self, body):
        r = requests.post(f"{API}/texts/aditya-hridayam/audio", json=body, timeout=60)
        assert r.status_code == 422, (body, r.status_code)


# ---------------- locally hosted images ----------------
IMAGES = [
    "swara-musician.jpg", "hero-landscape.jpg", "jala-river.jpg",
    "jala-well.jpg", "ahara-board.jpg", "manas-calm.jpg", "game-chess.jpg",
]


class TestLocalImages:
    @pytest.mark.parametrize("name", IMAGES)
    def test_image_served_locally(self, name):
        r = requests.get(f"{BASE_URL}/images/{name}", timeout=60)
        assert r.status_code == 200, f"{name}: {r.status_code}"
        assert r.headers["content-type"].startswith("image/jpeg"), r.headers.get("content-type")
        assert len(r.content) > 5000, len(r.content)

    def test_jala_gallery_uses_local_paths(self):
        r = requests.get(f"{API}/jala", timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        gallery = d.get("gallery") or d.get("water_gallery") or []
        assert gallery, list(d.keys())
        for item in gallery:
            url = item.get("url") or item.get("image") or item.get("src")
            assert url, item
            assert url.startswith("/images/jala-"), url
            assert "unsplash" not in url and "pexels" not in url
            img = requests.get(f"{BASE_URL}{url}", timeout=60)
            assert img.status_code == 200, url

    def test_no_external_cdn_in_any_content_endpoint(self):
        for path in ["/ahara", "/jala", "/swara", "/manas", "/games", "/stats"]:
            r = requests.get(f"{API}{path}", timeout=30)
            if r.status_code != 200:
                continue
            blob = r.text
            assert "images.unsplash.com" not in blob, path
            assert "images.pexels.com" not in blob, path
