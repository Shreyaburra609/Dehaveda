"""Deha Veda Ecosystem — backend API regression suite."""
import time
import uuid

import pytest
import requests

from conftest import API, BASE_URL, new_user


# ---------------- health / public content ----------------
class TestPublicContent:
    def test_root(self, api_client):
        r = api_client.get(f"{API}/")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_community_stats_shape(self, api_client):
        r = api_client.get(f"{API}/stats/community")
        assert r.status_code == 200
        d = r.json()
        for k in ("community_members", "premium_members", "games_played", "foods_catalogued"):
            assert isinstance(d[k], int), f"{k} not int"
        assert d["foods_catalogued"] >= 60, d

    def test_food_categories(self, api_client):
        r = api_client.get(f"{API}/foods/categories")
        assert r.status_code == 200
        assert len(r.json()["categories"]) > 3

    def test_foods_list_and_premium_lock_anonymous(self, api_client):
        r = api_client.get(f"{API}/foods")
        assert r.status_code == 200
        d = r.json()
        assert d["is_premium"] is False
        assert d["total"] >= 60
        assert d["locked_count"] > 0, "no premium locked foods for anonymous user"
        locked = [i for i in d["items"] if i.get("locked")]
        assert "calories" not in locked[0], "locked food leaks nutrition data"

    def test_food_search(self, api_client):
        r = api_client.get(f"{API}/foods", params={"q": "Apple"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert items and any("apple" in i["name"].lower() for i in items)
        food = items[0]
        for k in ("calories", "protein_g", "carbs_g", "fat_g", "fiber_g"):
            assert k in food, f"missing {k}"

    def test_food_search_no_results(self, api_client):
        r = api_client.get(f"{API}/foods", params={"q": "zzzqqq"})
        assert r.status_code == 200
        assert r.json()["items"] == []

    def test_food_category_filter(self, api_client):
        r = api_client.get(f"{API}/foods", params={"category": "Fruits"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert items
        assert all(i["category"] == "Fruits" for i in items)

    @pytest.mark.parametrize("path,keys", [
        ("/jala", ["water_types", "journey", "parameters", "contamination", "gallery"]),
        ("/swara", ["basics", "swaras", "variants"]),
        ("/manas", ["topics", "brain_regions", "peaceful_mind"]),
        ("/games", ["games"]),
        ("/plans", ["plans"]),
    ])
    def test_pillar_endpoints(self, api_client, path, keys):
        r = api_client.get(f"{API}{path}")
        assert r.status_code == 200
        d = r.json()
        for k in keys:
            assert d.get(k), f"{path} missing/empty {k}"

    def test_jala_journey_has_nine_steps_and_locks(self, api_client):
        d = api_client.get(f"{API}/jala").json()
        assert len(d["journey"]) == 9, len(d["journey"])
        assert len(d["parameters"]) >= 10
        assert any(p.get("locked") for p in d["parameters"]), "no locked premium parameters"

    def test_swara_locks_for_anonymous(self, api_client):
        d = api_client.get(f"{API}/swara").json()
        names = [s.get("name") for s in d["swaras"]]
        assert len(d["swaras"]) == 7, names
        locked = [s["name"] for s in d["swaras"] if s.get("locked")]
        assert len(locked) == 4, locked  # Ma/Pa/Dha/Ni are premium (full names in payload)
        assert all("frequency_ratio" not in s for s in d["swaras"] if s.get("locked"))

    def test_games_locks_for_anonymous(self, api_client):
        d = api_client.get(f"{API}/games").json()
        assert len(d["games"]) == 5
        locked = sorted(g["code"] for g in d["games"] if g["locked"])
        assert locked == ["pattern", "visual"], locked

    def test_plans_contain_free_and_premium(self, api_client):
        d = api_client.get(f"{API}/plans").json()
        codes = [p["code"] for p in d["plans"]]
        assert "free" in codes and "premium_1m" in codes, codes
        premium = next(p for p in d["plans"] if p["code"] == "premium_1m")
        assert premium["price"] > 0
        assert premium.get("duration_days") == 30


# ---------------- calorie tool ----------------
class TestCalorieTool:
    def test_calorie_male_moderate_lose(self, api_client):
        payload = {"age": 30, "sex": "male", "height_cm": 175, "weight_kg": 70,
                   "activity": "moderate", "goal": "lose"}
        r = api_client.post(f"{API}/tools/calorie", json=payload)
        assert r.status_code == 200
        d = r.json()
        expected_bmr = round(10 * 70 + 6.25 * 175 - 5 * 30 + 5)
        assert d["bmr"] == expected_bmr, d
        assert d["maintenance"] == round(expected_bmr * 1.55)
        assert d["goal_range"] == [round(expected_bmr * 1.55) - 500, round(expected_bmr * 1.55) - 250]
        assert d["bmi"] == 22.9
        assert "not medical" in d["disclaimer"].lower()

    @pytest.mark.parametrize("bad", [
        {"age": 5, "sex": "male", "height_cm": 175, "weight_kg": 70, "activity": "moderate", "goal": "lose"},
        {"age": 30, "sex": "other", "height_cm": 175, "weight_kg": 70, "activity": "moderate", "goal": "lose"},
        {"age": 30, "sex": "male", "height_cm": 175, "weight_kg": 70, "activity": "hyper", "goal": "lose"},
    ])
    def test_calorie_validation(self, api_client, bad):
        assert api_client.post(f"{API}/tools/calorie", json=bad).status_code == 422


# ---------------- auth ----------------
class TestAuth:
    def test_register_increments_community_count(self, api_client):
        before = api_client.get(f"{API}/stats/community").json()["community_members"]
        client, user, _ = new_user()
        after = api_client.get(f"{API}/stats/community").json()["community_members"]
        assert after == before + 1, f"before={before} after={after}"
        assert user["premium"] is False
        assert user["role"] == "user"

    def test_register_short_password_rejected(self, api_client):
        r = api_client.post(f"{API}/auth/register", json={
            "name": "TEST_Short", "email": f"test_{uuid.uuid4().hex[:8]}@dvtest.com", "password": "abc12"})
        assert r.status_code == 422

    def test_register_duplicate_email(self, api_client, class_user):
        _, user, password = class_user
        r = api_client.post(f"{API}/auth/register",
                            json={"name": "TEST_Dup", "email": user["email"], "password": password})
        assert r.status_code == 400
        assert "exists" in r.json()["detail"].lower()

    def test_login_sets_httponly_cookies_and_token(self, api_client, class_user):
        _, user, password = class_user
        r = api_client.post(f"{API}/auth/login", json={"email": user["email"], "password": password})
        assert r.status_code == 200
        assert r.json()["token"]
        set_cookies = r.headers.get("set-cookie", "").lower()
        assert "access_token" in set_cookies, r.headers
        assert "httponly" in set_cookies, set_cookies
        assert "samesite=none" in set_cookies and "secure" in set_cookies, set_cookies

    def test_login_invalid_password_401_string_detail(self, api_client, class_user):
        _, user, _ = class_user
        r = api_client.post(f"{API}/auth/login", json={"email": user["email"], "password": "WrongPass@123"})
        assert r.status_code == 401
        assert isinstance(r.json()["detail"], str)

    def test_me_requires_auth(self, api_client):
        assert api_client.get(f"{API}/auth/me").status_code == 401

    def test_me_returns_user_without_password(self, class_user):
        client, user, _ = class_user
        r = client.get(f"{API}/auth/me")
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == user["email"]
        assert "password_hash" not in d and "_id" not in d

    def test_zz_brute_force_lockout_after_5_failures(self, api_client, class_user):
        # runs last in this class: locks out the shared class user for 15 minutes
        _, user, _ = class_user
        statuses = []
        for _ in range(15):
            r = api_client.post(f"{API}/auth/login", json={"email": user["email"], "password": "Nope@12345"})
            statuses.append(r.status_code)
            if r.status_code == 429:
                break
        assert statuses[:5] == [401] * 5, statuses
        # lockout is keyed by request.client.host + email; the ingress uses multiple proxy IPs
        # so the counter is diluted across identifiers (see report).
        assert 429 in statuses, f"no lockout after {len(statuses)} failed logins: {statuses}"

    def test_logout_clears_cookies(self, class_user):
        client, _, _ = class_user
        r = client.post(f"{API}/auth/logout")
        assert r.status_code == 200
        assert r.json()["ok"] is True


# ---------------- games scoring ----------------
class TestGames:
    def test_score_requires_auth(self, api_client):
        r = api_client.post(f"{API}/games/score", json={"game": "reaction", "score": 300})
        assert r.status_code == 401

    def test_free_user_premium_game_forbidden(self, class_user):
        client, _, _ = class_user
        r = client.post(f"{API}/games/score", json={"game": "visual", "score": 5, "level": 2})
        assert r.status_code == 403, r.text[:200]
        r2 = client.post(f"{API}/games/score", json={"game": "pattern", "score": 5})
        assert r2.status_code == 403

    def test_unknown_game_rejected(self, class_user):
        client, _, _ = class_user
        assert client.post(f"{API}/games/score", json={"game": "chess", "score": 1}).status_code == 422

    def test_free_game_score_persists_in_dashboard(self, class_user, api_client):
        client, _, _ = class_user
        stats_before = api_client.get(f"{API}/stats/community").json()["games_played"]
        r = client.post(f"{API}/games/score", json={"game": "reaction", "score": 320, "level": 1})
        assert r.status_code == 200, r.text[:200]
        assert r.json()["saved"] is True
        r2 = client.post(f"{API}/games/score", json={"game": "number", "score": 7, "level": 7})
        assert r2.status_code == 200

        d = client.get(f"{API}/games/dashboard").json()
        assert d["games_played"] == 2, d
        assert d["personal_bests"]["reaction"]["score"] == 320
        assert d["personal_bests"]["number"]["score"] == 7
        assert d["total_score"] == 7, d  # reaction excluded
        assert all("_id" not in rec for rec in d["recent"])

        stats_after = api_client.get(f"{API}/stats/community").json()["games_played"]
        assert stats_after >= stats_before + 2

    def test_zz_reaction_personal_best_is_lowest(self, class_user):
        client, _, _ = class_user
        client.post(f"{API}/games/score", json={"game": "reaction", "score": 250})
        client.post(f"{API}/games/score", json={"game": "reaction", "score": 500})
        d = client.get(f"{API}/games/dashboard").json()
        assert d["personal_bests"]["reaction"]["score"] == 250, d["personal_bests"]


# ---------------- contact ----------------
class TestContact:
    def test_contact_valid(self, api_client):
        payload = {"name": "TEST_Contact", "email": "test_contact@dvtest.com",
                   "subject": "Testing subject", "message": "This is a test message of enough length."}
        r = api_client.post(f"{API}/contact", json=payload)
        assert r.status_code == 200, r.text[:200]
        assert r.json()["received"] is True

    @pytest.mark.parametrize("bad", [
        {"name": "A", "email": "a@b.com", "subject": "Hello", "message": "long enough message here"},
        {"name": "Valid Name", "email": "notanemail", "subject": "Hello", "message": "long enough message here"},
        {"name": "Valid Name", "email": "a@b.com", "subject": "Hi", "message": "long enough message here"},
        {"name": "Valid Name", "email": "a@b.com", "subject": "Hello", "message": "short"},
    ])
    def test_contact_validation(self, api_client, bad):
        assert api_client.post(f"{API}/contact", json=bad).status_code == 422


# ---------------- membership / manual verification (CRITICAL security flow) ----------------
class TestMembershipManualVerification:
    def test_claim_requires_auth(self, api_client):
        r = api_client.post(f"{API}/membership/claim",
                            json={"plan_code": "premium_1m", "reference": "TESTREF123"})
        assert r.status_code == 401

    def test_claim_invalid_plan(self, class_user):
        client, _, _ = class_user
        r = client.post(f"{API}/membership/claim", json={"plan_code": "free", "reference": "TESTREF123"})
        assert r.status_code == 400

    def test_claim_does_not_grant_premium_until_admin_verifies(self, class_user, admin_client, api_client):
        client, user, password = class_user
        ref = f"TESTREF{uuid.uuid4().hex[:8].upper()}"
        r = client.post(f"{API}/membership/claim",
                        json={"plan_code": "premium_1m", "method": "qr_upi", "reference": ref})
        assert r.status_code == 200, r.text[:300]
        claim = r.json()["claim"]
        assert claim["status"] == "pending"
        assert claim["amount"] > 0

        # CRITICAL: user must still be free
        status = client.get(f"{API}/membership/status").json()
        assert status["user"]["premium"] is False, "SECURITY: premium granted without admin verification"
        assert status["user"]["premium_until"] in (None, ""), status["user"]
        assert client.get(f"{API}/auth/me").json()["premium"] is False
        assert any(c.get("locked") for c in api_client.get(f"{API}/swara",
                   headers={"Authorization": client.headers["Authorization"]}).json()["swaras"])
        assert client.post(f"{API}/games/score", json={"game": "visual", "score": 3}).status_code == 403

        # duplicate pending claim rejected
        assert client.post(f"{API}/membership/claim",
                           json={"plan_code": "premium_1m", "reference": ref}).status_code == 400

        # non-admin cannot verify own claim
        assert client.post(f"{API}/admin/claims/{claim['id']}/verify").status_code == 403

        # admin verifies
        rv = admin_client.post(f"{API}/admin/claims/{claim['id']}/verify")
        assert rv.status_code == 200, rv.text[:300]
        assert rv.json()["status"] == "verified"

        # now premium active
        me = client.get(f"{API}/auth/me").json()
        assert me["premium"] is True, me
        assert me["premium_until"]
        assert client.post(f"{API}/games/score", json={"game": "visual", "score": 3}).status_code == 200
        swaras = requests.get(f"{API}/swara", headers={"Authorization": client.headers["Authorization"]}).json()
        assert not any(s.get("locked") for s in swaras["swaras"])
        foods = requests.get(f"{API}/foods", headers={"Authorization": client.headers["Authorization"]}).json()
        assert foods["locked_count"] == 0 and foods["is_premium"] is True

        # re-verify already reviewed claim rejected
        assert admin_client.post(f"{API}/admin/claims/{claim['id']}/verify").status_code == 400

    def test_admin_reject_claim_keeps_user_free(self, session_user, admin_client):
        client, _, _ = session_user
        ref = f"TESTREF{uuid.uuid4().hex[:8].upper()}"
        claim = client.post(f"{API}/membership/claim",
                            json={"plan_code": "premium_1m", "reference": ref}).json()["claim"]
        r = admin_client.post(f"{API}/admin/claims/{claim['id']}/reject")
        assert r.status_code == 200 and r.json()["status"] == "rejected"
        assert client.get(f"{API}/auth/me").json()["premium"] is False


# ---------------- admin ----------------
class TestAdmin:
    def test_admin_endpoints_require_admin(self, api_client, session_user):
        client, _, _ = session_user
        for path in ("/admin/stats", "/admin/users", "/admin/claims", "/admin/contact"):
            assert api_client.get(f"{API}{path}").status_code == 401, path
            assert client.get(f"{API}{path}").status_code == 403, path

    def test_admin_stats(self, admin_client):
        r = admin_client.get(f"{API}/admin/stats")
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        for k in ("total_users", "active_subscribers", "expired_subscriptions",
                  "new_registrations_7d", "revenue", "pending_claims",
                  "contact_messages", "ai_messages"):
            assert k in d, k
        assert len(d["registrations_7d"]) == 7
        assert all("day" in x and "users" in x for x in d["registrations_7d"])
        assert isinstance(d["game_activity"], list)

    def test_admin_users_list(self, admin_client):
        r = admin_client.get(f"{API}/admin/users")
        assert r.status_code == 200
        users = r.json()["users"]
        assert users and "password_hash" not in users[0] and "_id" not in users[0]

    def test_admin_contact_messages(self, admin_client, api_client):
        subject = f"TEST_subject_{uuid.uuid4().hex[:6]}"
        api_client.post(f"{API}/contact", json={
            "name": "TEST_Msg", "email": "test_msg@dvtest.com", "subject": subject,
            "message": "Message body long enough for validation."})
        msgs = admin_client.get(f"{API}/admin/contact").json()["messages"]
        assert any(m["subject"] == subject for m in msgs), "contact message not visible to admin"

    def test_admin_update_plan_persists(self, admin_client, api_client):
        original = next(p for p in api_client.get(f"{API}/plans").json()["plans"]
                        if p["code"] == "premium_1m")
        new_price = float(original["price"]) + 11
        r = admin_client.put(f"{API}/admin/plans/premium_1m", json={"price": new_price})
        assert r.status_code == 200, r.text[:200]
        assert r.json()["price"] == new_price
        public = next(p for p in api_client.get(f"{API}/plans").json()["plans"] if p["code"] == "premium_1m")
        assert public["price"] == new_price
        # restore
        admin_client.put(f"{API}/admin/plans/premium_1m", json={"price": float(original["price"])})

    def test_admin_update_plan_not_found(self, admin_client):
        assert admin_client.put(f"{API}/admin/plans/nope", json={"price": 5}).status_code == 404

    def test_admin_food_crud_and_search(self, admin_client, api_client):
        name = f"TEST_Food_{uuid.uuid4().hex[:6]}"
        payload = {"name": name, "category": "Fruits", "serving_size": "100 g", "calories": 50,
                   "protein_g": 1, "carbs_g": 12, "fat_g": 0.2, "fiber_g": 2,
                   "micronutrients": "Vitamin C", "note": "test", "premium": False}
        r = admin_client.post(f"{API}/admin/foods", json=payload)
        assert r.status_code == 200, r.text[:300]
        food_id = r.json()["id"]
        try:
            found = api_client.get(f"{API}/foods", params={"q": name}).json()["items"]
            assert found and found[0]["calories"] == 50
            # duplicate
            assert admin_client.post(f"{API}/admin/foods", json=payload).status_code == 400
            # update
            up = admin_client.put(f"{API}/admin/foods/{food_id}", json={**payload, "calories": 77})
            assert up.status_code == 200 and up.json()["calories"] == 77
            assert api_client.get(f"{API}/foods", params={"q": name}).json()["items"][0]["calories"] == 77
        finally:
            dr = admin_client.delete(f"{API}/admin/foods/{food_id}")
            assert dr.status_code == 200
        assert api_client.get(f"{API}/foods", params={"q": name}).json()["items"] == []
        assert admin_client.delete(f"{API}/admin/foods/{food_id}").status_code == 404


# ---------------- AI chat (SSE) ----------------
class TestAIChat:
    def test_anonymous_chat_streams_answer(self, api_client):
        session_id = str(uuid.uuid4())
        deltas = []
        with requests.post(f"{API}/chat", json={"message": "What is AHARA in one short sentence?",
                                                "session_id": session_id},
                           stream=True, timeout=120) as r:
            assert r.status_code == 200, r.text[:300]
            assert "text/event-stream" in r.headers.get("content-type", "")
            for line in r.iter_lines(decode_unicode=True):
                if line and line.startswith("data: "):
                    import json as _json
                    payload = _json.loads(line[6:])
                    assert "error" not in payload, payload
                    if "delta" in payload:
                        deltas.append(payload["delta"])
                    if payload.get("done"):
                        break
        answer = "".join(deltas)
        assert len(answer) > 20, f"empty/short AI answer: {answer!r}"

        time.sleep(1)
        hist = api_client.get(f"{API}/chat/history", params={"session_id": session_id})
        assert hist.status_code == 200
        msgs = hist.json()["messages"]
        assert len(msgs) >= 2 and msgs[0]["role"] == "user" and msgs[-1]["role"] == "assistant"

    def test_chat_validation(self, api_client):
        assert api_client.post(f"{API}/chat", json={"message": ""}).status_code == 422


# ---------------- security / infra ----------------
class TestSecurity:
    def test_bcrypt_hash_format(self):
        import subprocess
        out = subprocess.run(
            ["python", "-c",
             "import os,asyncio;from dotenv import load_dotenv;load_dotenv('/app/backend/.env');"
             "from motor.motor_asyncio import AsyncIOMotorClient;"
             "c=AsyncIOMotorClient(os.environ['MONGO_URL']);d=c[os.environ['DB_NAME']];"
             "print(asyncio.get_event_loop().run_until_complete("
             "d.users.find_one({'email':os.environ['ADMIN_EMAIL'].lower()}))['password_hash'])"],
            capture_output=True, text=True, timeout=60)
        assert out.returncode == 0, out.stderr[-500:]
        assert out.stdout.strip().startswith("$2b$"), out.stdout.strip()[:20]

    def test_cors_allows_credentials_with_explicit_origin(self, api_client):
        r = api_client.options(f"{API}/auth/login", headers={
            "Origin": BASE_URL, "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"})
        assert r.status_code in (200, 204), r.status_code
        allow_origin = r.headers.get("access-control-allow-origin")
        assert allow_origin == BASE_URL, allow_origin
        assert r.headers.get("access-control-allow-credentials") == "true", dict(r.headers)

    def test_payment_qr_asset_served(self, api_client):
        r = api_client.get(f"{BASE_URL}/payment-qr.png")
        assert r.status_code == 200, r.status_code
        assert r.headers.get("content-type", "").startswith("image/"), r.headers.get("content-type")
