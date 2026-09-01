"""Iteration 2 — premium gating switch (GET /api/settings, GET+PUT /api/admin/settings).

This module mutates GLOBAL server state, so run it on its own:
    pytest /app/backend/tests/test_gating_switch.py -n 0 -v
It always leaves gating OFF.
"""
import pytest

from conftest import API, new_user


def set_gating(admin, value):
    r = admin.put(f"{API}/admin/settings", json={"premium_gating_enabled": value})
    assert r.status_code == 200, r.text[:300]
    assert r.json()["premium_gating_enabled"] is value


@pytest.fixture(scope="module")
def free_user():
    return new_user()


class TestGatingSwitch:
    def test_default_settings_public_and_off(self, api_client, admin_client):
        set_gating(admin_client, False)
        r = api_client.get(f"{API}/settings")
        assert r.status_code == 200
        assert r.json() == {"premium_gating_enabled": False}, r.json()
        assert admin_client.get(f"{API}/admin/settings").json()["premium_gating_enabled"] is False

    def test_admin_settings_requires_admin(self, api_client, free_user):
        client, _, _ = free_user
        assert api_client.get(f"{API}/admin/settings").status_code == 401
        assert client.get(f"{API}/admin/settings").status_code == 403
        assert client.put(f"{API}/admin/settings",
                          json={"premium_gating_enabled": True}).status_code == 403
        assert api_client.get(f"{API}/settings").json()["premium_gating_enabled"] is False

    def test_invalid_settings_body_rejected(self, admin_client):
        assert admin_client.put(f"{API}/admin/settings", json={}).status_code == 422
        assert admin_client.put(f"{API}/admin/settings",
                                json={"premium_gating_enabled": "yes-please"}).status_code == 422

    def test_everything_unlocked_when_off(self, api_client, free_user):
        client, _, _ = free_user
        foods = api_client.get(f"{API}/foods").json()
        assert foods["locked_count"] == 0 and foods["is_premium"] is True
        assert foods["total"] >= 64, foods["total"]
        games = api_client.get(f"{API}/games").json()["games"]
        assert not any(g["locked"] for g in games)
        jala = api_client.get(f"{API}/jala").json()
        assert len(jala["water_types"]) >= 12
        assert not any(w.get("locked") for w in jala["water_types"])
        assert len(jala["parameters"]) >= 10
        assert not any(p.get("locked") for p in jala["parameters"])
        swaras = api_client.get(f"{API}/swara").json()["swaras"]
        assert not any(s.get("locked") for s in swaras)
        assert all(s.get("role") and s.get("culture") and s.get("example") for s in swaras)
        topics = api_client.get(f"{API}/manas").json()["topics"]
        assert len(topics) == 12 and not any(t.get("locked") for t in topics)
        # free logged-in user can post a premium game score
        assert client.post(f"{API}/games/score",
                           json={"game": "visual", "score": 4, "level": 1}).status_code == 200

    def test_zz_gating_on_locks_then_off_unlocks(self, api_client, admin_client, free_user):
        client, _, _ = free_user
        try:
            set_gating(admin_client, True)
            assert api_client.get(f"{API}/settings").json()["premium_gating_enabled"] is True

            foods = api_client.get(f"{API}/foods").json()
            assert foods["locked_count"] > 0, foods["locked_count"]
            assert foods["is_premium"] is False
            locked_food = next(i for i in foods["items"] if i.get("locked"))
            assert "calories" not in locked_food, locked_food

            games = api_client.get(f"{API}/games").json()["games"]
            assert sorted(g["code"] for g in games if g["locked"]) == ["pattern", "visual"]

            swaras = api_client.get(f"{API}/swara").json()["swaras"]
            locked = [s for s in swaras if s.get("locked")]
            assert sorted(s["short"] for s in locked) == ["Dha", "Ma", "Ni", "Pa"]
            for s in locked:
                assert isinstance(s.get("index"), int) and s.get("symbol")
                for leak in ("role", "culture", "example", "frequency_ratio"):
                    assert leak not in s, f"locked swara leaks {leak}"

            jala = api_client.get(f"{API}/jala").json()
            assert any(p.get("locked") for p in jala["parameters"])
            assert any(t.get("locked") for t in api_client.get(f"{API}/manas").json()["topics"])

            r = client.post(f"{API}/games/score", json={"game": "visual", "score": 4})
            assert r.status_code == 403, r.status_code
            assert client.post(f"{API}/games/score",
                               json={"game": "reaction", "score": 350}).status_code == 200
        finally:
            set_gating(admin_client, False)

        assert api_client.get(f"{API}/settings").json()["premium_gating_enabled"] is False
        assert api_client.get(f"{API}/foods").json()["locked_count"] == 0
        assert not any(g["locked"] for g in api_client.get(f"{API}/games").json()["games"])
        assert client.post(f"{API}/games/score",
                           json={"game": "visual", "score": 4}).status_code == 200
