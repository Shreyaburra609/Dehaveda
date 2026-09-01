import { useRef, useState } from "react";
import { Loader2, Volume2, BookOpen, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, apiError, BACKEND_URL } from "@/lib/api";
import { ErrorState, Loading, SectionHeading } from "@/components/States";

export function HanumanChalisa({ data, loading, error, onRetry }) {
  const [lang, setLang] = useState("en");
  const [busyId, setBusyId] = useState("");
  const [audioError, setAudioError] = useState("");
  const audioRef = useRef(null);

  const play = async (verseId, audioLang) => {
    setAudioError("");
    setBusyId(`${verseId}-${audioLang}`);
    try {
      const { data: res } = await api.post("/swara/chalisa/audio", { verse_id: verseId, lang: audioLang });
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.pause();
      audioRef.current.src = `${BACKEND_URL}${res.url}`;
      await audioRef.current.play();
    } catch (err) {
      setAudioError(apiError(err, "Audio could not be played. Please try again."));
    } finally {
      setBusyId("");
    }
  };

  if (loading) return <Loading label="Loading Hanuman Chalisa…" testid="chalisa-loading" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} testid="chalisa-error" />;
  if (!data) return null;

  return (
    <div data-testid="chalisa-section">
      <SectionHeading
        eyebrow="Traditional & Cultural Understanding"
        title="Hanuman Chalisa"
        subtitle={`${data.author} — 40 chaupais with three dohas. Choose a language to read the meaning of every verse, and listen to a study recitation.`}
      />

      <div className="dv-surface mt-8 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <Languages className="h-4 w-4 text-purple-600" /> Meaning language
          </span>
          <div data-testid="chalisa-language-selector" className="flex flex-wrap gap-2">
            {data.languages.map((l) => (
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
          {data.intro[lang]}
        </p>
        <p className="font-data mt-4 text-[11px] leading-relaxed text-slate-500">{data.audio_notice}</p>
        <p className="font-data mt-2 text-[11px] text-slate-500">
          The first time a verse is requested the audio is generated and can take up to a minute; after that it
          plays instantly.
        </p>
        {audioError && (
          <p data-testid="chalisa-audio-error" className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-xs text-red-600">
            {audioError}
          </p>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {data.verses.map((v) => (
          <article
            key={v.id}
            data-testid={`chalisa-verse-${v.id}`}
            className="dv-surface grid gap-6 rounded-2xl p-6 lg:grid-cols-12"
          >
            <div className="lg:col-span-5">
              <p className="font-data text-[10px] uppercase tracking-[0.2em] text-purple-600">
                {v.kind === "doha" ? `Doha ${v.number}` : `Chaupai ${v.number}`}
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
                Meaning — {data.languages.find((l) => l.code === lang)?.label}
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
        {data.notice}
      </p>
    </div>
  );
}
