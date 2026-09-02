"""Iteration 4 — health report analysis feature (/api/health/*)."""
import io
import os

import pytest
import requests

from conftest import API, new_user

SAMPLE = "/app/lab_report_sample.txt"
UPLOAD_TIMEOUT = 180


def _sample_bytes():
    with open(SAMPLE, "rb") as fh:
        return fh.read()


def _upload(client, name="TEST_lab_report.txt", content=None, mime="text/plain"):
    files = {"file": (name, content if content is not None else _sample_bytes(), mime)}
    headers = {k: v for k, v in client.headers.items() if k.lower() != "content-type"}
    return requests.post(f"{API}/health/reports", files=files, headers=headers,
                         timeout=UPLOAD_TIMEOUT)


@pytest.fixture(scope="module")
def user_a():
    return new_user()


@pytest.fixture(scope="module")
def user_b():
    return new_user()


@pytest.fixture(scope="module")
def uploaded(user_a):
    """Upload the sample report once (Gemini call is slow + rate limited 12/h)."""
    client = user_a[0]
    r = _upload(client)
    assert r.status_code == 200, f"upload failed {r.status_code}: {r.text[:500]}"
    body = r.json()
    yield client, body
    rid = body.get("report", {}).get("id")
    if rid:
        client.delete(f"{API}/health/reports/{rid}", timeout=30)


# ---------- fixture sanity ----------
def test_sample_fixture_exists():
    assert os.path.exists(SAMPLE)
    assert b"Haemoglobin" in _sample_bytes()


# ---------- auth enforcement ----------
@pytest.mark.parametrize("method,path", [
    ("get", "/health/reports"),
    ("get", "/health/profile"),
    ("delete", "/health/reports/does-not-exist"),
])
def test_health_endpoints_require_auth(api_client, method, path):
    r = getattr(api_client, method)(f"{API}{path}", timeout=30)
    assert r.status_code in (401, 403), f"{path} -> {r.status_code}"


def test_upload_requires_auth():
    files = {"file": ("TEST_r.txt", _sample_bytes(), "text/plain")}
    r = requests.post(f"{API}/health/reports", files=files, timeout=60)
    assert r.status_code in (401, 403), r.status_code


# ---------- validation ----------
def test_unsupported_file_type_rejected(user_b):
    r = _upload(user_b[0], name="TEST_report.zip", content=b"PK\x03\x04zipdata",
                mime="application/zip")
    assert r.status_code == 400, r.text[:300]
    assert "PDF" in r.json().get("detail", "")


def test_docx_rejected(user_b):
    r = _upload(user_b[0], name="TEST_report.docx", content=b"PK\x03\x04docx",
                mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    assert r.status_code == 400, r.text[:300]


def test_empty_file_rejected(user_b):
    r = _upload(user_b[0], name="TEST_empty.txt", content=b"", mime="text/plain")
    assert r.status_code == 400, r.text[:300]
    assert "empty" in r.json().get("detail", "").lower()


def test_oversize_file_rejected(user_b):
    big = b"A" * (10 * 1024 * 1024 + 1024)
    r = _upload(user_b[0], name="TEST_big.txt", content=big, mime="text/plain")
    assert r.status_code == 400, r.text[:300]
    assert "10 MB" in r.json().get("detail", "")


def test_missing_file_field(user_b):
    headers = {k: v for k, v in user_b[0].headers.items() if k.lower() != "content-type"}
    r = requests.post(f"{API}/health/reports", files={"wrong": ("a.txt", b"x", "text/plain")},
                      headers=headers, timeout=60)
    assert r.status_code == 422, r.status_code


# ---------- extraction accuracy ----------
def test_upload_returns_parsed_report(uploaded):
    _, body = uploaded
    assert "disclaimer" in body and len(body["disclaimer"]) > 40
    rep = body["report"]
    assert "_id" not in rep
    for key in ("id", "tests", "counts", "summary", "lifestyle_notes", "questions_for_doctor"):
        assert key in rep, key
    assert isinstance(rep["id"], str) and len(rep["id"]) > 10
    assert len(rep["summary"]) > 20
    assert len(rep["tests"]) >= 9, f"only {len(rep['tests'])} tests parsed"


def _find(tests, needle):
    for t in tests:
        if needle.lower() in (t.get("name") or "").lower():
            return t
    return None


@pytest.mark.parametrize("needle,value,unit,ref,status", [
    ("aemoglobin", "11.2", "g/dL", "13.0", "low"),
    ("Fasting Blood Sugar", "108", "mg/dL", "70", "high"),
    ("Leucocyte", "7800", "cumm", "4000", "normal"),
    ("Vitamin D", "14.5", "ng/mL", "30", "low"),
    ("TSH", "2.4", "uIU/mL", "0.4", "normal"),
])
def test_extracted_values(uploaded, needle, value, unit, ref, status):
    _, body = uploaded
    t = _find(body["report"]["tests"], needle)
    assert t is not None, f"{needle} missing from extraction"
    assert value in str(t.get("value")), f"{needle} value={t.get('value')}"
    assert unit.lower().replace("/", "") in (t.get("unit") or "").lower().replace("/", ""), t.get("unit")
    assert ref in (t.get("reference_range") or ""), t.get("reference_range")
    assert t.get("status") == status, f"{needle} status={t.get('status')}"
    assert t.get("plain_english")


def test_counts_add_up(uploaded):
    _, body = uploaded
    c = body["report"]["counts"]
    assert c["total"] == len(body["report"]["tests"])
    assert c["normal"] + c["high"] + c["low"] + c["unknown"] == c["total"]
    assert c["low"] >= 2 and c["high"] >= 1


# ---------- list / profile / delete ----------
def test_list_reports(uploaded):
    client, body = uploaded
    r = client.get(f"{API}/health/reports", timeout=60)
    assert r.status_code == 200
    data = r.json()
    ids = [x["id"] for x in data["reports"]]
    assert body["report"]["id"] in ids
    assert data["disclaimer"]
    assert all("_id" not in x for x in data["reports"])


def test_profile(uploaded):
    client, body = uploaded
    r = client.get(f"{API}/health/profile", timeout=60)
    assert r.status_code == 200
    p = r.json()
    for key in ("reports_count", "totals", "attention", "timeline", "trends",
                "latest_summary", "lifestyle_notes", "questions_for_doctor", "disclaimer"):
        assert key in p, key
    assert p["reports_count"] >= 1
    assert p["totals"]["total"] >= 9
    assert len(p["timeline"]) == p["reports_count"]
    assert p["latest_summary"]
    assert all(a["status"] in ("high", "low") for a in p["attention"])
    names = [a["name"].lower() for a in p["attention"]]
    assert any("aemoglobin" in n for n in names), names


def test_empty_profile_for_new_user(user_b):
    r = user_b[0].get(f"{API}/health/profile", timeout=60)
    assert r.status_code == 200
    p = r.json()
    assert p["reports_count"] == 0
    assert p["totals"]["total"] == 0
    assert p["attention"] == [] and p["timeline"] == []
    assert p["latest_summary"] == ""


def test_cross_user_isolation(uploaded, user_b):
    _, body = uploaded
    rid = body["report"]["id"]
    other = user_b[0]
    r = other.get(f"{API}/health/reports", timeout=60)
    assert r.status_code == 200
    assert rid not in [x["id"] for x in r.json()["reports"]]
    d = other.delete(f"{API}/health/reports/{rid}", timeout=60)
    assert d.status_code == 404, f"user B deleted user A's report! {d.status_code}"


def test_delete_unknown_id(user_b):
    r = user_b[0].delete(f"{API}/health/reports/nope-{os.getpid()}", timeout=60)
    assert r.status_code == 404


def test_delete_own_report(user_a):
    """Upload a tiny txt report then delete it, verifying removal."""
    client = user_a[0]
    r = _upload(client, name="TEST_small.txt",
                content=b"TEST LAB\nTEST  RESULT  UNIT  REFERENCE RANGE\nTSH  2.4  uIU/mL  0.4 - 4.0\n")
    assert r.status_code == 200, r.text[:300]
    rid = r.json()["report"]["id"]
    d = client.delete(f"{API}/health/reports/{rid}", timeout=60)
    assert d.status_code == 200 and d.json().get("deleted") is True
    lst = client.get(f"{API}/health/reports", timeout=60).json()["reports"]
    assert rid not in [x["id"] for x in lst]
    again = client.delete(f"{API}/health/reports/{rid}", timeout=60)
    assert again.status_code == 404
