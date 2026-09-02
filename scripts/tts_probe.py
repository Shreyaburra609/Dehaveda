import asyncio, os, inspect
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
from emergentintegrations.llm.openai import OpenAITextToSpeech

print(inspect.signature(OpenAITextToSpeech.generate_speech))


async def main():
    t = OpenAITextToSpeech(api_key=os.environ["EMERGENT_LLM_KEY"])
    try:
        b = await t.generate_speech(
            text="తెల్లని వస్త్రధారి విష్ణువును ధ్యానించు.",
            model="gpt-4o-mini-tts", voice="sage",
            instructions="Speak as a native Telugu speaker with authentic Telugu phonetics.",
        )
        print("instructions OK", len(b))
    except Exception as e:
        print("FAIL instructions:", type(e).__name__, str(e)[:250])
        try:
            b = await t.generate_speech(text="తెల్లని వస్త్రధారి", model="gpt-4o-mini-tts", voice="sage")
            print("model-only OK", len(b))
        except Exception as e2:
            print("FAIL model:", str(e2)[:250])

asyncio.run(main())
