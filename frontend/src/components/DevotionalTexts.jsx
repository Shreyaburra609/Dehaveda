import { useEffect, useRef, useState } from "react";
import { Loader2, Volume2, BookOpen, Languages, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, apiError, BACKEND_URL } from "@/lib/api";
import { ErrorState, Loading, SectionHeading } from "@/components/States";

export function DevotionalTexts() {
  const [texts, setTexts] = useState([]);
  const [slug, setSlug] = useState("hanuman-chalisa");
  const [doc, setDoc] = useState(null);
  const [lang, setLang] = useState("en");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [audioError, setAudioError] = useState("");
  const audioRef = useRef(null);

  const loadList = async () => {
    try {
      const { data } = await api.get("/texts");
      setTexts(data.texts);
    } catch {
      /* the detail request surfaces the error */
    }
  };

  const loadDoc = async (s) => {
    setError("");
    setDoc(null);
    try {
      const { data } = await api.get(`/texts/${s}`);
      setDoc(data);
    } catch (err) {
      setError(apiError(err, "This text could not be loaded. Please try again."));
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    loadDoc(slug);
  }, [slug]);

  const BCP47 = { sa: "hi-IN", hi: "hi-IN", te: "te-IN", ta: "ta-IN", kn: "kn-IN", en: "en-IN" };

  const nativeVoiceFor = (code) => {
    if (!window.speechSynthesis) return null;
    const want = BCP47[code];
    const voices = window.speechSynthesis.getVoices() || [];
    return (
      voices.find((v) => v.lang?.replace("_", "-") === want) ||
      voices.find((v) => v.lang?.split(/[-_]/)[0] === want.split("-")[0]) ||
      null
    );
  };

  const play = async (verseId, audioLang) => {
    setAudioError("");
    setBusyId(`${verseId}-${audioLang}`);
    try {
      const verse = doc?.verses.find((v) => v.id === verseId);
      const speechLang = audioLang === "sa" ? "sa" : audioLang;
      const localVoice = nativeVoiceFor(speechLang);
      if (localVoice && verse) {
        // A voice installed on the device speaks the language with its own accent —
        // far better than an English-optimised cloud voice.
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(
          audioLang === "sa" ? verse.devanagari.replace(/\n/g, " ") : verse.meanings[audioLang],
        );
        utter.voice = localVoice;
        utter.lang = localVoice.lang;
        utter.rate = 0.9;
        window.speechSynthesis.speak(utter);
        setBusyId("");
        return;
      }
      const { data } = await api.post(`/texts/${slug}/audio`, { verse_id: verseId, lang: audioLang, slug });
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.pause();
      audioRef.current.src = `${BACKEND_URL}${data.url}`;
      await audioRef.current.play();
    } catch (err) {
      setAudioError(apiError(err, "Audio could not be played. Please try again."));
    } finally {
      setBusyId("");
    }
  };

  return (
    <div data-testid="devotional-texts">
      <SectionHeading
        eyebrow="Traditional & Cultural Understanding"
        title="Devotional texts, verse by verse"
        subtitle="Read every verse in Devanagari with transliteration, switch the meaning between five languages, and listen to the recitation or the meaning."
      />

      <div data-testid="text-selector" className="mt-8 grid gap-4 sm:grid-cols-3">
        {texts.map((t) => (
          <button
            key={t.slug}
            data-testid={`text-tab-${t.slug}`}
            onClick={() => setSlug(t.slug)}
            className={`rounded-2xl border p-5 text-left transition-colors ${
              slug === t.slug
                ? "border-purple-500/60 bg-purple-500/8"
                : "border-slate-200 bg-white hover:border-purple-500/40"
            }`}
          >
            <p className="font-display text-lg font-semibold text-slate-900">{t.title}</p>
            <p className="mt-1 text-xs text-slate-500">{t.author}</p>
            <p className="font-data mt-3 text-[10px] uppercase tracking-[0.16em] text-purple-700">
              {t.verse_count} verses
            </p>
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-8">
          <ErrorState message={error} onRetry={() => loadDoc(slug)} testid="devotional-error" />
        </div>
      )}
      {!doc && !error && <Loading label="Loading text…" testid="devotional-loading" />}

      {doc && (
        <>
          <div className="dv-surface mt-8 rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <Languages className="h-4 w-4 text-purple-600" /> Meaning language
              </span>
              <div data-testid="chalisa-language-selector" className="flex flex-wrap gap-2">
                {doc.languages.map((l) => (
                  <button
                    key={l.code}
                    data-testid={`chalisa-lang-${l.code}`}
                    onClick={() => setLang(l.code)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                      lang === l.code
                        ? "border-purple-500/60 bg-purple-500/10 text-purple-800"
                        : "border-slate-300 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {l.native}
                  </button>
                ))}
              </div>
            </div>

            <p data-testid="chalisa-intro" className="mt-6 text-sm leading-relaxed text-slate-700">
              {doc.intro[lang]}
            </p>
            <p
              data-testid="voice-notice"
              className={`mt-5 flex gap-2 rounded-2xl p-4 text-[11px] leading-relaxed ${
                doc.native_voices
                  ? "bg-emerald-500/8 text-emerald-800"
                  : "border border-amber-500/25 bg-amber-500/5 text-amber-800"
              }`}
            >
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {doc.audio_notice} When your device has a Hindi, Telugu, Tamil or Kannada voice installed, that
                native voice is used instead and speaks with the correct accent. Otherwise the cloud voice is
                generated on first use and can take up to a minute, then plays instantly.
              </span>
            </p>
            {audioError && (
              <p data-testid="chalisa-audio-error" className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-xs text-red-600">
                {audioError}
              </p>
            )}
          </div>

          <div className="mt-8 space-y-4">
            {doc.verses.map((v) => (
              <article
                key={v.id}
                data-testid={`chalisa-verse-${v.id}`}
                className="dv-surface grid gap-6 rounded-2xl p-6 lg:grid-cols-12"
              >
                <div className="lg:col-span-5">
                  <p className="font-data text-[10px] uppercase tracking-[0.2em] text-purple-600">
                    {v.kind === "doha"
                      ? `Doha ${v.number}`
                      : v.kind === "chaupai"
                        ? `Chaupai ${v.number}`
                        : `Shloka ${v.number}`}
                  </p>
                  <p className="font-display mt-3 whitespace-pre-line text-lg leading-relaxed text-slate-900">
                    {v.devanagari}
                  </p>
                  <p className="font-data mt-3 whitespace-pre-line text-[11px] leading-relaxed text-slate-500">
                    {v.transliteration}
                  </p>
                  <Button
                    data-testid={`chalisa-play-verse-${v.id}`}
                    size="sm"
                    variant="secondary"
                    className="mt-4 rounded-full"
                    disabled={busyId === `${v.id}-sa`}
                    onClick={() => play(v.id, "sa")}
                  >
                    {busyId === `${v.id}-sa` ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Volume2 className="mr-2 h-3.5 w-3.5" />
                    )}
                    Listen to verse
                  </Button>
                </div>

                <div className="lg:col-span-7">
                  <p className="font-data text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    Meaning — {doc.languages.find((l) => l.code === lang)?.label}
                  </p>
                  <p data-testid={`chalisa-meaning-${v.id}`} className="mt-3 text-sm leading-relaxed text-slate-700">
                    {v.meanings[lang]}
                  </p>
                  <Button
                    data-testid={`chalisa-play-meaning-${v.id}`}
                    size="sm"
                    variant="ghost"
                    className="mt-4 rounded-full text-slate-600"
                    disabled={busyId === `${v.id}-${lang}`}
                    onClick={() => play(v.id, lang)}
                  >
                    {busyId === `${v.id}-${lang}` ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <BookOpen className="mr-2 h-3.5 w-3.5" />
                    )}
                    Listen to meaning
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 text-xs leading-relaxed text-amber-800">
            {doc.notice}
          </p>
        </>
      )}
    </div>
  );
}
