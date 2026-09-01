"""Iteration 2 — Hanuman Chalisa content + TTS audio endpoints."""
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


def has_script(text, lang):
    lo, hi = SCRIPTS[lang]
    return any(lo <= ord(ch) <= hi for ch in text)


# ---------------- GET /api/swara/chalisa ----------------
class TestChalisaContent:
    @pytest.fixture(scope="class")
    def chalisa(self):
        r = requests.get(f"{API}/swara/chalisa")
        assert r.status_code == 200, r.text[:300]
        return r.json()

    def test_structure(self, chalisa):
        assert chalisa["title"] == "Hanuman Chalisa"
        assert chalisa["author"]
        assert chalisa["notice"] and chalisa["audio_notice"]
        codes = [x["code"] for x in chalisa["languages"]]
        assert codes == ["en", "hi", "te", "ta", "kn"], codes
        for lang in chalisa["languages"]:
            assert lang["label"] and lang["native"]

    def test_43_verses_3_dohas_40_chaupais(self, chalisa):
        verses = chalisa["verses"]
        assert len(verses) == 43, len(verses)
        dohas = [v for v in verses if v["kind"] == "doha"]
        chaupais = [v for v in verses if v["kind"] == "chaupai"]
        assert len(dohas) == 3, [v["id"] for v in dohas]
        assert len(chaupais) == 40, len(chaupais)
        ids = [v["id"] for v in verses]
        assert len(set(ids)) == 43, "duplicate verse ids"
        assert "doha-1" in ids and "chaupai-1" in ids and "chaupai-40" in ids

    def test_every_verse_has_devanagari_transliteration_and_5_meanings(self, chalisa):
        for v in chalisa["verses"]:
            assert has_script(v["devanagari"], "hi"), v["id"]
            assert v["transliteration"].strip(), v["id"]
            assert re.search(r"[A-Za-z]", v["transliteration"]), v["id"]
            assert sorted(v["meanings"].keys()) == ["en", "hi", "kn", "ta", "te"], v["id"]
            for code, text in v["meanings"].items():
                assert text and text.strip(), f"{v['id']}/{code} empty meaning"
                if code in SCRIPTS:
                    assert has_script(text, code), f"{v['id']}/{code} not native script: {text[:60]}"
                else:
                    assert re.search(r"[A-Za-z]", text), f"{v['id']}/en not latin"

    def test_intro_available_in_all_five_languages(self, chalisa):
        intro = chalisa["intro"]
        assert sorted(intro.keys()) == ["en", "hi", "kn", "ta", "te"], list(intro)
        for code, text in intro.items():
            assert len(text.strip()) > 20, f"{code} intro too short"
            if code in SCRIPTS:
                assert has_script(text, code), f"{code} intro not in native script"

    def test_no_llm_key_leak_in_payload(self, chalisa):
        blob = str(chalisa)
        assert "sk-" not in blob
        assert "EMERGENT" not in blob.upper()


# ---------------- POST /api/swara/chalisa/audio + GET /api/tts/{key}.mp3 ----------------
class TestChalisaAudio:
    def test_recitation_audio_doha_1(self):
        r = requests.post(f"{API}/swara/chalisa/audio",
                          json={"verse_id": "doha-1", "lang": "sa"}, timeout=180)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["verse_id"] == "doha-1" and d["lang"] == "sa"
        assert re.fullmatch(r"/api/tts/[a-f0-9]{16,64}\.mp3", d["url"]), d["url"]

        a = requests.get(f"{BASE_URL}{d['url']}", timeout=60)
        assert a.status_code == 200, a.status_code
        assert a.headers["content-type"] == "audio/mpeg", a.headers.get("content-type")
        assert len(a.content) > 5000, len(a.content)
        assert "sk-" not in a.text[:200] if a.headers.get("content-type") != "audio/mpeg" else True

        # cached: second identical call must be fast and return the same key
        t0 = time.time()
        r2 = requests.post(f"{API}/swara/chalisa/audio",
                           json={"verse_id": "doha-1", "lang": "sa"}, timeout=180)
        elapsed = time.time() - t0
        assert r2.status_code == 200
        assert r2.json()["url"] == d["url"], "cache key changed between calls"
        assert elapsed < 8, f"cached TTS call took {elapsed:.1f}s"

    def test_meaning_audio_telugu_chaupai_1(self):
        r = requests.post(f"{API}/swara/chalisa/audio",
                          json={"verse_id": "chaupai-1", "lang": "te"}, timeout=180)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["lang"] == "te"
        a = requests.get(f"{BASE_URL}{d['url']}", timeout=60)
        assert a.status_code == 200
        assert a.headers["content-type"] == "audio/mpeg"
        assert len(a.content) > 5000, len(a.content)

    def test_unknown_verse_404(self):
        r = requests.post(f"{API}/swara/chalisa/audio", json={"verse_id": "chaupai-99", "lang": "sa"})
        assert r.status_code == 404, r.status_code

    @pytest.mark.parametrize("body", [
        {"verse_id": "doha-1", "lang": "zz"},
        {"verse_id": "ab", "lang": "sa"},
        {"lang": "sa"},
    ])
    def test_invalid_body_422(self, body):
        assert requests.post(f"{API}/swara/chalisa/audio", json=body).status_code == 422, body

    def test_tts_invalid_key_rejected(self):
        assert requests.get(f"{BASE_URL}/api/tts/zzzz.mp3").status_code == 400
        assert requests.get(f"{BASE_URL}/api/tts/{'a' * 40}.mp3").status_code == 404
