from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import uuid
import time
import json
import logging
import bcrypt
import jwt
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, field_validator

import content as C
import chalisa as CH

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("dehaveda")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
FREE_CHAT_LIMIT = 10
PREMIUM_CHAT_LIMIT = 100

app = FastAPI(title="Deha Veda Ecosystem API")
api = APIRouter(prefix="/api")

NO_ID = {"_id": 0}


def now() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.isoformat()


# ----------------------------- security helpers -----------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_token(user_id: str, email: str, kind: str = "access") -> str:
    delta = timedelta(days=7) if kind == "refresh" else timedelta(hours=12)
    payload = {"sub": user_id, "email": email, "exp": now() + delta, "type": kind}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def is_premium_active(user: dict) -> bool:
    if user.get("role") == "admin":
        return True
    expiry = user.get("premium_until")
    if not expiry:
        return False
    try:
        return datetime.fromisoformat(expiry) > now()
    except (TypeError, ValueError):
        return False


def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "name": user.get("name", ""),
        "email": user["email"],
        "role": user.get("role", "user"),
        "premium": is_premium_active(user),
        "premium_until": user.get("premium_until"),
        "created_at": user.get("created_at"),
    }


def bearer_token(request: Request) -> Optional[str]:
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[7:]
    return request.cookies.get("access_token")


async def get_current_user(request: Request) -> dict:
    token = bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = await db.users.find_one({"id": payload["sub"]}, NO_ID)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


async def get_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


_rate_buckets: dict = defaultdict(list)


def rate_limit(key: str, limit: int, window_seconds: int):
    bucket = _rate_buckets[key]
    cutoff = time.time() - window_seconds
    bucket[:] = [t for t in bucket if t > cutoff]
    if len(bucket) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests, please slow down.")
    bucket.append(time.time())


# ----------------------------- models -----------------------------
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class CalorieIn(BaseModel):
    age: int = Field(ge=10, le=100)
    sex: Literal["male", "female"]
    height_cm: float = Field(ge=90, le=250)
    weight_kg: float = Field(ge=25, le=300)
    activity: Literal["sedentary", "light", "moderate", "active", "very_active"]
    goal: Literal["lose", "maintain", "gain"]


class ScoreIn(BaseModel):
    game: str = Field(min_length=2, max_length=30)
    score: float = Field(ge=0, le=1_000_000)
    level: int = Field(default=1, ge=0, le=999)
    meta: dict = Field(default_factory=dict)

    @field_validator("game")
    @classmethod
    def known_game(cls, v):
        codes = {g["code"] for g in C.GAMES}
        if v not in codes:
            raise ValueError("Unknown game code")
        return v


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=1500)
    session_id: Optional[str] = None


class ContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    subject: str = Field(min_length=3, max_length=120)
    message: str = Field(min_length=10, max_length=3000)


class ClaimIn(BaseModel):
    plan_code: str = Field(min_length=2, max_length=30)
    method: Literal["qr_upi", "bank_transfer"] = "qr_upi"
    reference: str = Field(min_length=4, max_length=60)
    note: str = Field(default="", max_length=300)


class PlanUpdate(BaseModel):
    price: Optional[float] = Field(default=None, ge=0, le=1_000_000)
    name: Optional[str] = Field(default=None, max_length=80)
    tagline: Optional[str] = Field(default=None, max_length=160)
    duration_days: Optional[int] = Field(default=None, ge=0, le=3650)
    features: Optional[List[str]] = None
    active: Optional[bool] = None


class FoodIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    category: str = Field(min_length=2, max_length=40)
    serving_size: str = "100 g"
    calories: float = Field(ge=0, le=1200)
    protein_g: float = Field(ge=0, le=200)
    carbs_g: float = Field(ge=0, le=200)
    fat_g: float = Field(ge=0, le=200)
    fiber_g: float = Field(ge=0, le=100)
    micronutrients: str = ""
    note: str = ""
    premium: bool = False


class ContentIn(BaseModel):
    payload: dict


# ----------------------------- startup -----------------------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.foods.create_index([("name", 1)], unique=True)
    await db.foods.create_index("category")
    await db.scores.create_index([("user_id", 1), ("created_at", -1)])
    await db.chat_messages.create_index([("session_id", 1), ("created_at", 1)])
    await db.payment_claims.create_index([("status", 1), ("created_at", -1)])
    await db.plans.create_index("code", unique=True)
    await db.page_views.create_index("path")
    await db.settings.update_one(
        {"key": "gating"},
        {"$setOnInsert": {"premium_gating_enabled": False, "updated_at": iso(now())}},
        upsert=True,
    )

    for plan in C.PLANS:
        await db.plans.update_one(
            {"code": plan["code"]},
            {"$setOnInsert": {**plan, "created_at": iso(now())}},
            upsert=True,
        )
    if await db.foods.count_documents({}) == 0:
        await db.foods.insert_many([{**f, "id": str(uuid.uuid4())} for f in C.FOODS])

    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "name": "Deha Veda Admin", "email": admin_email,
            "password_hash": hash_password(admin_password), "role": "admin",
            "premium_until": None, "created_at": iso(now()),
        })
        logger.info("Seeded admin account %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ----------------------------- auth -----------------------------
def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")


@api.get("/")
async def root():
    return {"service": "Deha Veda Ecosystem API", "status": "ok"}


@api.post("/auth/register")
async def register(body: RegisterIn, request: Request, response: Response):
    rate_limit(f"reg:{request.client.host}", 60, 3600)
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user = {
        "id": str(uuid.uuid4()), "name": body.name.strip(), "email": email,
        "password_hash": hash_password(body.password), "role": "user",
        "premium_until": None, "created_at": iso(now()),
    }
    await db.users.insert_one(dict(user))
    access = create_token(user["id"], email)
    set_auth_cookies(response, access, create_token(user["id"], email, "refresh"))
    return {"token": access, "user": public_user(user)}


@api.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower().strip()
    ident = email
    attempt = await db.login_attempts.find_one({"identifier": ident}, NO_ID)
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = datetime.fromisoformat(attempt["locked_until"])
        if locked_until > now():
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in a few minutes.")
    user = await db.users.find_one({"email": email}, NO_ID)
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$inc": {"count": 1}, "$set": {"locked_until": iso(now() + timedelta(minutes=15))}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": ident})
    access = create_token(user["id"], email)
    set_auth_cookies(response, access, create_token(user["id"], email, "refresh"))
    return {"token": access, "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


# ----------------------------- community stats -----------------------------
@api.get("/stats/community")
async def community_stats():
    total = await db.users.count_documents({"role": {"$ne": "admin"}})
    premium = await db.users.count_documents({
        "role": {"$ne": "admin"}, "premium_until": {"$gt": iso(now())},
    })
    games_played = await db.scores.count_documents({})
    return {
        "community_members": total,
        "premium_members": premium,
        "games_played": games_played,
        "foods_catalogued": await db.foods.count_documents({}),
    }


# ----------------------------- ahara -----------------------------
@api.get("/foods/categories")
async def food_categories():
    return {"categories": C.FOOD_CATEGORIES}


@api.get("/foods")
async def list_foods(q: str = "", category: str = "", user: Optional[dict] = Depends(get_optional_user)):
    query: dict = {}
    if q.strip():
        query["name"] = {"$regex": re.escape(q.strip()), "$options": "i"}
    if category.strip() and category != "All":
        query["category"] = category.strip()
    docs = await db.foods.find(query, NO_ID).sort("name", 1).to_list(500)
    premium = await has_premium_access(user)
    items = []
    for d in docs:
        if d.get("premium") and not premium:
            items.append({
                "id": d["id"], "name": d["name"], "category": d["category"],
                "premium": True, "locked": True,
            })
        else:
            items.append({**d, "locked": False})
    return {
        "items": items,
        "total": len(items),
        "locked_count": sum(1 for i in items if i.get("locked")),
        "is_premium": premium,
    }


@api.post("/tools/calorie")
async def calorie(body: CalorieIn):
    if body.sex == "male":
        bmr = 10 * body.weight_kg + 6.25 * body.height_cm - 5 * body.age + 5
    else:
        bmr = 10 * body.weight_kg + 6.25 * body.height_cm - 5 * body.age - 161
    factors = {"sedentary": 1.2, "light": 1.375, "moderate": 1.55, "active": 1.725, "very_active": 1.9}
    maintenance = bmr * factors[body.activity]
    if body.goal == "lose":
        low, high, label = maintenance - 500, maintenance - 250, "Gradual fat loss"
    elif body.goal == "gain":
        low, high, label = maintenance + 250, maintenance + 500, "Gradual weight gain"
    else:
        low, high, label = maintenance - 100, maintenance + 100, "Weight maintenance"
    bmi = body.weight_kg / ((body.height_cm / 100) ** 2)
    return {
        "bmr": round(bmr),
        "maintenance": round(maintenance),
        "goal_label": label,
        "goal_range": [round(low), round(high)],
        "bmi": round(bmi, 1),
        "protein_g_range": [round(body.weight_kg * 1.2), round(body.weight_kg * 1.6)],
        "formula": "Mifflin-St Jeor equation with standard activity multipliers",
        "disclaimer": "These figures are population-level estimates, not medical or dietary advice. "
                      "Individual needs vary. Consult a qualified professional before making changes.",
    }


# ----------------------------- jala -----------------------------
IDENTITY_FIELDS = ("name", "title", "type", "index", "short", "symbol", "pronunciation")

AUDIO_CACHE = ROOT_DIR / "audio_cache"
AUDIO_CACHE.mkdir(exist_ok=True)


async def gating_enabled() -> bool:
    """Premium gating is a switch. While it is off, every pillar and game is free."""
    doc = await db.settings.find_one({"key": "gating"}, NO_ID)
    return bool(doc and doc.get("premium_gating_enabled"))


async def has_premium_access(user: Optional[dict]) -> bool:
    if not await gating_enabled():
        return True
    return bool(user and is_premium_active(user))


def gate(items, has_access, key="premium"):
    """Remove premium bodies for users without access, keeping identity fields."""
    out = []
    for it in items:
        if it.get(key) and not has_access:
            kept = {k: it[k] for k in IDENTITY_FIELDS if k in it}
            out.append({**kept, "locked": True, "premium": True})
        else:
            out.append({**it, "locked": False})
    return out


@api.get("/jala")
async def jala(user: Optional[dict] = Depends(get_optional_user)):
    premium = await has_premium_access(user)
    return {
        "water_types": gate(C.WATER_TYPES, premium),
        "journey": C.WATER_JOURNEY,
        "parameters": gate(C.WATER_PARAMETERS, premium),
        "contamination": C.WATER_CONTAMINATION,
        "gallery": C.WATER_GALLERY,
        "is_premium": premium,
        "sources": "WHO Guidelines for Drinking-water Quality (4th ed.) and BIS IS 10500:2012.",
    }


# ----------------------------- swara -----------------------------
@api.get("/swara")
async def swara(user: Optional[dict] = Depends(get_optional_user)):
    premium = await has_premium_access(user)
    return {
        "basics": C.SOUND_BASICS,
        "swaras": gate(C.SWARAS, premium),
        "variants": C.SWARA_VARIANTS,
        "is_premium": premium,
        "note": "Swara descriptions reflect traditional and cultural understanding of Indian classical music. "
                "Frequency ratios are the standard just-intonation ratios used for illustration. "
                "No therapeutic or curative claims are made for any note.",
    }


@api.get("/swara/chalisa")
async def swara_chalisa():
    return {
        "title": "Hanuman Chalisa",
        "author": "Tulsidas (16th century)",
        "languages": CH.LANGUAGES,
        "intro": CH.CHALISA_INTRO,
        "verses": CH.CHALISA,
        "notice": "Presented as cultural and literary heritage. Meanings are simplified study "
                  "explanations. Devotional statements in the verses are traditional belief and are "
                  "not medical or scientific claims.",
        "audio_notice": "Recitation audio is generated by text-to-speech for study purposes. "
                        "The voices are optimised for English, so pronunciation is approximate and "
                        "is not a substitute for a traditional recitation.",
    }


class TtsIn(BaseModel):
    verse_id: str = Field(min_length=3, max_length=30)
    lang: Literal["sa", "en", "hi", "te", "ta", "kn"] = "sa"


@api.get("/tts/{key}.mp3")
async def get_tts(key: str):
    from fastapi.responses import FileResponse
    if not re.fullmatch(r"[a-f0-9]{16,64}", key):
        raise HTTPException(status_code=400, detail="Invalid audio key")
    path = AUDIO_CACHE / f"{key}.mp3"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(path, media_type="audio/mpeg",
                        headers={"Cache-Control": "public, max-age=31536000"})


@api.post("/swara/chalisa/audio")
async def chalisa_audio(body: TtsIn, request: Request):
    rate_limit(f"tts:{request.client.host}", 60, 600)
    verse = next((v for v in CH.CHALISA if v["id"] == body.verse_id), None)
    if not verse:
        raise HTTPException(status_code=404, detail="Verse not found")

    if body.lang == "sa":
        text = verse["transliteration"].replace("\n", " ")
        voice = "onyx"
    else:
        text = verse["meanings"].get(body.lang)
        voice = "sage"
    if not text:
        raise HTTPException(status_code=404, detail="Text not available for this language")

    import hashlib
    key = hashlib.sha256(f"{text}|{voice}|1.0|tts-1|mp3".encode()).hexdigest()[:40]
    path = AUDIO_CACHE / f"{key}.mp3"

    if not path.exists():
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=503, detail="Audio generation is not configured on the server.")
        from emergentintegrations.llm.openai import OpenAITextToSpeech
        tts = OpenAITextToSpeech(api_key=api_key)
        try:
            audio = await tts.generate_speech(text=text[:3900], model="tts-1", voice=voice)
        except Exception as exc:  # noqa: BLE001
            logger.exception("TTS generation failed")
            raise HTTPException(status_code=502, detail="Audio could not be generated. Please try again.") from exc
        path.write_bytes(audio)

    return {"url": f"/api/tts/{key}.mp3", "verse_id": verse["id"], "lang": body.lang}


# ----------------------------- manas -----------------------------
@api.get("/manas")
async def manas(user: Optional[dict] = Depends(get_optional_user)):
    premium = await has_premium_access(user)
    return {
        "topics": gate(C.MANAS_TOPICS, premium),
        "brain_regions": C.BRAIN_REGIONS,
        "peaceful_mind": C.PEACEFUL_MIND,
        "is_premium": premium,
        "note": "This is a simplified educational brain model, not an anatomically precise medical illustration. "
                "The 'mind' is described as a set of functions, not a physical structure with a location.",
    }


# ----------------------------- games -----------------------------
@api.get("/games")
async def games(user: Optional[dict] = Depends(get_optional_user)):
    premium = await has_premium_access(user)
    return {
        "games": [{**g, "locked": bool(g["premium"]) and not premium} for g in C.GAMES],
        "is_premium": premium,
    }


@api.post("/games/score")
async def submit_score(body: ScoreIn, user: dict = Depends(get_current_user)):
    game = next(g for g in C.GAMES if g["code"] == body.game)
    if game["premium"] and not await has_premium_access(user):
        raise HTTPException(status_code=403, detail="This game is part of Premium membership")
    doc = {
        "id": str(uuid.uuid4()), "user_id": user["id"], "game": body.game,
        "score": body.score, "level": body.level, "meta": body.meta,
        "created_at": iso(now()),
    }
    await db.scores.insert_one(dict(doc))
    return {"saved": True, "score": {k: doc[k] for k in ("id", "game", "score", "level", "created_at")}}


@api.get("/games/dashboard")
async def game_dashboard(user: dict = Depends(get_current_user)):
    docs = await db.scores.find({"user_id": user["id"]}, NO_ID).sort("created_at", -1).to_list(500)
    bests = {}
    for d in docs:
        code = d["game"]
        current = bests.get(code)
        if current is None:
            better = True
        elif code == "reaction":
            better = d["score"] < current["score"]
        else:
            better = d["score"] > current["score"]
        if better:
            bests[code] = {"score": d["score"], "level": d["level"], "at": d["created_at"]}
    return {
        "games_played": len(docs),
        "total_score": round(sum(d["score"] for d in docs if d["game"] != "reaction")),
        "personal_bests": bests,
        "recent": docs[:12],
    }


# ----------------------------- AI assistant -----------------------------
SYSTEM_PROMPT = (
    "You are the Deha Veda AI Assistant for the DEHA VEDA ECOSYSTEM platform, which teaches five pillars: "
    "AHARA (food and nutrition), JALA (water and water quality), SWARA (sound and Indian musical swaras), "
    "MANAS (mind and brain), and GAMES (cognitive mind games).\n"
    "Rules you must always follow:\n"
    "1. Answer only questions related to these five pillars or to using this website. If asked something unrelated, "
    "politely redirect to the five pillars.\n"
    "2. You are NOT a doctor, dietitian or therapist and must never present yourself as one. Never diagnose, never "
    "prescribe, never claim any food, water, sound or exercise cures a disease.\n"
    "3. Give general educational information, give approximate numbers with the serving size they refer to, and say "
    "when values vary.\n"
    "4. For any personal medical, nutritional or mental-health concern, recommend consulting a qualified professional.\n"
    "5. Clearly separate traditional or cultural understanding (e.g. swara concepts) from modern scientific evidence.\n"
    "6. Keep answers concise: 2 to 5 short paragraphs or a compact list. Plain text, no markdown headings."
)


@api.get("/chat/history")
async def chat_history(session_id: str, user: Optional[dict] = Depends(get_optional_user)):
    query = {"session_id": session_id}
    if user:
        query["user_id"] = user["id"]
    docs = await db.chat_messages.find(query, NO_ID).sort("created_at", 1).to_list(100)
    return {"messages": docs}


@api.post("/chat")
async def chat(body: ChatIn, request: Request, user: Optional[dict] = Depends(get_optional_user)):
    session_id = body.session_id or str(uuid.uuid4())
    ip = request.client.host
    rate_limit(f"chat:{ip}", 30, 300)

    if user:
        limit = PREMIUM_CHAT_LIMIT if is_premium_active(user) else FREE_CHAT_LIMIT
        since = iso(now() - timedelta(days=1))
        used = await db.chat_messages.count_documents({
            "user_id": user["id"], "role": "user", "created_at": {"$gte": since},
        })
        if used >= limit:
            raise HTTPException(
                status_code=403,
                detail=f"Daily message limit reached ({limit}). Premium membership raises this limit.",
            )

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI assistant is not configured on the server.")

    prior = await db.chat_messages.find({"session_id": session_id}, NO_ID).sort("created_at", 1).to_list(20)

    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()), "session_id": session_id,
        "user_id": user["id"] if user else None, "role": "user",
        "text": body.message, "created_at": iso(now()),
    })

    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    history_text = "\n".join(f"{m['role']}: {m['text']}" for m in prior[-8:])
    chat_client = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=SYSTEM_PROMPT + (f"\n\nRecent conversation:\n{history_text}" if history_text else ""),
    ).with_model("openai", "gpt-5.5")

    async def generator():
        collected = []
        try:
            async for event in chat_client.stream_message(UserMessage(text=body.message)):
                if isinstance(event, TextDelta):
                    collected.append(event.content)
                    yield f"data: {json.dumps({'delta': event.content})}\n\n"
                elif isinstance(event, StreamDone):
                    break
        except Exception as exc:  # noqa: BLE001
            logger.exception("AI stream failed")
            yield f"data: {json.dumps({'error': 'The assistant could not respond right now.'})}\n\n"
            _ = exc
        answer = "".join(collected)
        if answer:
            await db.chat_messages.insert_one({
                "id": str(uuid.uuid4()), "session_id": session_id,
                "user_id": user["id"] if user else None, "role": "assistant",
                "text": answer, "created_at": iso(now()),
            })
        yield f"data: {json.dumps({'done': True, 'session_id': session_id})}\n\n"

    return StreamingResponse(generator(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ----------------------------- membership / payments -----------------------------
@api.get("/plans")
async def plans():
    docs = await db.plans.find({"active": True}, NO_ID).to_list(20)
    docs.sort(key=lambda p: p.get("price", 0))
    return {"plans": docs, "upi_id": os.environ.get("PAYMENT_UPI_ID", "")}


@api.get("/membership/status")
async def membership_status(user: dict = Depends(get_current_user)):
    claims = await db.payment_claims.find({"user_id": user["id"]}, NO_ID).sort("created_at", -1).to_list(20)
    return {"user": public_user(user), "claims": claims}


@api.post("/membership/claim")
async def submit_claim(body: ClaimIn, request: Request, user: dict = Depends(get_current_user)):
    rate_limit(f"claim:{user['id']}", 5, 3600)
    plan = await db.plans.find_one({"code": body.plan_code, "active": True}, NO_ID)
    if not plan or plan["price"] <= 0:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")
    pending = await db.payment_claims.find_one({"user_id": user["id"], "status": "pending"})
    if pending:
        raise HTTPException(status_code=400, detail="You already have a payment awaiting verification")
    doc = {
        "id": str(uuid.uuid4()), "user_id": user["id"], "user_email": user["email"],
        "user_name": user.get("name", ""), "plan_code": plan["code"], "plan_name": plan["name"],
        "amount": plan["price"], "currency": plan["currency"], "method": body.method,
        "reference": body.reference.strip(), "note": body.note.strip(),
        "status": "pending", "created_at": iso(now()), "reviewed_at": None,
    }
    await db.payment_claims.insert_one(dict(doc))
    return {"submitted": True, "claim": doc,
            "message": "Payment reference received. Premium activates once an admin verifies it."}


# ----------------------------- contact -----------------------------
@api.post("/contact")
async def contact(body: ContactIn, request: Request):
    rate_limit(f"contact:{request.client.host}", 5, 3600)
    doc = {
        "id": str(uuid.uuid4()), "name": body.name.strip(), "email": body.email.lower(),
        "subject": body.subject.strip(), "message": body.message.strip(),
        "status": "new", "created_at": iso(now()),
    }
    await db.contact_messages.insert_one(dict(doc))
    return {"received": True, "message": "Thank you. Your message has been recorded and we will reply by email."}


class TrackIn(BaseModel):
    path: str = Field(min_length=1, max_length=120)


@api.post("/track")
async def track(body: TrackIn):
    await db.page_views.update_one({"path": body.path}, {"$inc": {"views": 1}}, upsert=True)
    return {"ok": True}


# ----------------------------- admin -----------------------------
class SettingsIn(BaseModel):
    premium_gating_enabled: bool


@api.get("/settings")
async def public_settings():
    return {"premium_gating_enabled": await gating_enabled()}


@api.get("/admin/settings")
async def admin_get_settings(admin: dict = Depends(get_admin)):
    return {"premium_gating_enabled": await gating_enabled()}


@api.put("/admin/settings")
async def admin_put_settings(body: SettingsIn, admin: dict = Depends(get_admin)):
    await db.settings.update_one(
        {"key": "gating"},
        {"$set": {"premium_gating_enabled": body.premium_gating_enabled, "updated_at": iso(now())}},
        upsert=True,
    )
    return {"premium_gating_enabled": body.premium_gating_enabled}


@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(get_admin)):
    now_iso = iso(now())
    total_users = await db.users.count_documents({"role": {"$ne": "admin"}})
    active = await db.users.count_documents({"role": {"$ne": "admin"}, "premium_until": {"$gt": now_iso}})
    expired = await db.users.count_documents({
        "role": {"$ne": "admin"}, "premium_until": {"$ne": None, "$lte": now_iso},
    })
    week_ago = iso(now() - timedelta(days=7))
    new_week = await db.users.count_documents({"created_at": {"$gte": week_ago}, "role": {"$ne": "admin"}})

    verified = await db.payment_claims.find({"status": "verified"}, NO_ID).to_list(1000)
    revenue = sum(c.get("amount", 0) for c in verified)

    registrations = []
    for i in range(6, -1, -1):
        day = (now() - timedelta(days=i)).date().isoformat()
        count = await db.users.count_documents({
            "role": {"$ne": "admin"}, "created_at": {"$gte": day, "$lt": day + "T23:59:59.999999+00:00"},
        })
        registrations.append({"day": day[5:], "users": count})

    game_activity = await db.scores.aggregate([
        {"$group": {"_id": "$game", "plays": {"$sum": 1}}},
        {"$sort": {"plays": -1}},
    ]).to_list(20)
    pages = await db.page_views.find({}, NO_ID).sort("views", -1).to_list(12)
    ai_messages = await db.chat_messages.count_documents({"role": "user"})

    return {
        "total_users": total_users,
        "active_subscribers": active,
        "expired_subscriptions": expired,
        "new_registrations_7d": new_week,
        "revenue": revenue,
        "currency": "INR",
        "pending_claims": await db.payment_claims.count_documents({"status": "pending"}),
        "contact_messages": await db.contact_messages.count_documents({}),
        "ai_messages": ai_messages,
        "registrations_7d": registrations,
        "game_activity": [{"game": g["_id"], "plays": g["plays"]} for g in game_activity],
        "popular_pages": pages,
    }


@api.get("/admin/users")
async def admin_users(admin: dict = Depends(get_admin)):
    docs = await db.users.find({}, NO_ID).sort("created_at", -1).to_list(500)
    return {"users": [public_user(d) for d in docs]}


@api.get("/admin/claims")
async def admin_claims(status: str = "", admin: dict = Depends(get_admin)):
    query = {"status": status} if status else {}
    docs = await db.payment_claims.find(query, NO_ID).sort("created_at", -1).to_list(300)
    return {"claims": docs}


@api.post("/admin/claims/{claim_id}/{action}")
async def review_claim(claim_id: str, action: str, admin: dict = Depends(get_admin)):
    if action not in ("verify", "reject"):
        raise HTTPException(status_code=400, detail="Action must be verify or reject")
    claim = await db.payment_claims.find_one({"id": claim_id}, NO_ID)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim["status"] != "pending":
        raise HTTPException(status_code=400, detail="This claim was already reviewed")
    if action == "reject":
        await db.payment_claims.update_one({"id": claim_id},
                                          {"$set": {"status": "rejected", "reviewed_at": iso(now())}})
        return {"status": "rejected"}
    plan = await db.plans.find_one({"code": claim["plan_code"]}, NO_ID)
    days = plan.get("duration_days", 30) if plan else 30
    user = await db.users.find_one({"id": claim["user_id"]}, NO_ID)
    base = now()
    if user and user.get("premium_until"):
        try:
            current = datetime.fromisoformat(user["premium_until"])
            base = max(base, current)
        except ValueError:
            pass
    await db.users.update_one({"id": claim["user_id"]},
                              {"$set": {"premium_until": iso(base + timedelta(days=days))}})
    await db.payment_claims.update_one({"id": claim_id},
                                       {"$set": {"status": "verified", "reviewed_at": iso(now())}})
    return {"status": "verified", "premium_until": iso(base + timedelta(days=days))}


@api.put("/admin/plans/{code}")
async def update_plan(code: str, body: PlanUpdate, admin: dict = Depends(get_admin)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = await db.plans.update_one({"code": code}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return await db.plans.find_one({"code": code}, NO_ID)


@api.post("/admin/foods")
async def create_food(body: FoodIn, admin: dict = Depends(get_admin)):
    if await db.foods.find_one({"name": body.name}):
        raise HTTPException(status_code=400, detail="A food with this name already exists")
    doc = {**body.model_dump(), "id": str(uuid.uuid4()), "source": "Admin entry"}
    await db.foods.insert_one(dict(doc))
    return doc


@api.put("/admin/foods/{food_id}")
async def update_food(food_id: str, body: FoodIn, admin: dict = Depends(get_admin)):
    result = await db.foods.update_one({"id": food_id}, {"$set": body.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Food not found")
    return await db.foods.find_one({"id": food_id}, NO_ID)


@api.delete("/admin/foods/{food_id}")
async def delete_food(food_id: str, admin: dict = Depends(get_admin)):
    result = await db.foods.delete_one({"id": food_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Food not found")
    return {"deleted": True}


@api.get("/admin/contact")
async def admin_contact(admin: dict = Depends(get_admin)):
    docs = await db.contact_messages.find({}, NO_ID).sort("created_at", -1).to_list(200)
    return {"messages": docs}


@api.get("/admin/content/{key}")
async def get_editable_content(key: str, admin: dict = Depends(get_admin)):
    doc = await db.editable_content.find_one({"key": key}, NO_ID)
    return doc or {"key": key, "payload": {}}


@api.put("/admin/content/{key}")
async def put_editable_content(key: str, body: ContentIn, admin: dict = Depends(get_admin)):
    await db.editable_content.update_one(
        {"key": key},
        {"$set": {"payload": body.payload, "updated_at": iso(now())}},
        upsert=True,
    )
    return {"key": key, "payload": body.payload}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
