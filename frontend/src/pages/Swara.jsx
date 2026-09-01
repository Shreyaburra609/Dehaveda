import { useEffect, useRef, useState } from "react";
import { Volume2, Waves, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, apiError } from "@/lib/api";
import { ErrorState, Loading, PremiumLock, SectionHeading, Reveal } from "@/components/States";
import { Seo } from "@/components/Seo";

const BASE_HZ = 240;

export default function Swara() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: d } = await api.get("/swara");
      setData(d);
    } catch (err) {
      setError(apiError(err, "Swara information could not be loaded. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => ctxRef.current?.close?.();
  }, []);

  const playNote = (ratio) => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!ctxRef.current) ctxRef.current = new Ctx();
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = BASE_HZ * ratio;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.7);
      setPlaying(true);
      setTimeout(() => setPlaying(false), 1200);
    } catch {
      /* audio unsupported */
    }
  };

  const active = data?.swaras?.[selected];

  return (
    <>
      <Seo title="Swara — Sound & Swara" description="How sound is produced, how we hear it, and the seven swaras of Indian classical music with an interactive selector and audio." path="/swara" />

      <header className="dv-aurora border-b border-slate-800/70">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-20">
          <p className="font-data mb-4 text-[11px] uppercase tracking-[0.3em] text-purple-400">03 — Swara</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
            Sound &amp; Swara
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Start with the physics of sound, then meet the seven swaras of Indian classical music. Scientific
            explanations and traditional understanding are kept clearly separate.
          </p>
        </div>
      </header>

      {loading && <div className="mx-auto max-w-7xl px-4 lg:px-8"><Loading label="Loading sound and swara content…" /></div>}
      {!loading && error && <div className="mx-auto max-w-2xl px-4 py-16"><ErrorState message={error} onRetry={load} /></div>}

      {!loading && data && (
        <>
          <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
            <SectionHeading eyebrow="Modern Scientific Understanding" title="The physics of sound" />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {data.basics.map((b, i) => (
                <Reveal key={b.title} delay={Math.min(i, 8) * 50}>
                  <article data-testid={`sound-basic-${i}`} className="dv-surface h-full rounded-2xl p-6">
                    <Waves className="mb-4 h-5 w-5 text-purple-400" />
                    <h3 className="font-display text-lg font-semibold text-slate-50">{b.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400">{b.detail}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          <section className="border-y border-slate-800/70 bg-[#0b1020]">
            <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
              <SectionHeading
                eyebrow="Traditional & Cultural Understanding"
                title="The seven swaras"
                subtitle="Sa · Re · Ga · Ma · Pa · Dha · Ni — select a swara to read about it and hear an illustrative tone."
              />

              <div data-testid="swara-selector" className="mt-10 grid grid-cols-4 gap-3 sm:grid-cols-7">
                {data.swaras.map((s, i) => (
                  <button
                    key={s.index}
                    data-testid={`swara-button-${s.short}`}
                    onClick={() => {
                      setSelected(i);
                      if (!s.locked) playNote(s.ratio);
                    }}
                    className={`group relative rounded-2xl border px-2 py-5 text-center transition-all duration-300 ${
                      selected === i
                        ? "border-purple-400/70 bg-purple-500/15 shadow-lg shadow-purple-500/10"
                        : "border-slate-800 hover:border-purple-500/40"
                    }`}
                  >
                    <span className="font-display block text-2xl text-slate-100">{s.symbol || "•"}</span>
                    <span className="font-data mt-1.5 block text-[11px] uppercase tracking-[0.16em] text-purple-300">
                      {s.short || s.name}
                    </span>
                    {s.locked && <span className="font-data mt-1 block text-[8px] uppercase text-amber-400">Premium</span>}
                  </button>
                ))}
              </div>

              <div className="mt-8">
                {active?.locked ? (
                  <PremiumLock title={`${active.name || "This swara"}`} testid="swara-locked" />
                ) : (
                  <div data-testid="swara-detail" className="dv-surface grid gap-8 rounded-3xl p-8 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                      <div className="flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/10">
                        <span className={`font-display text-7xl text-purple-200 ${playing ? "dv-pulse-ring" : ""}`}>
                          {active.symbol}
                        </span>
                      </div>
                      <Button
                        data-testid="swara-play-button"
                        onClick={() => playNote(active.ratio)}
                        className="mt-5 w-full rounded-full bg-purple-500 text-slate-950 hover:bg-purple-400"
                      >
                        <Volume2 className="mr-2 h-4 w-4" /> Play tone ({Math.round(BASE_HZ * active.ratio)} Hz)
                      </Button>
                      <p className="font-data mt-3 text-[10px] leading-relaxed text-slate-600">
                        Illustrative sine tone using just-intonation ratios with Sa set to {BASE_HZ} Hz.
                      </p>
                    </div>
                    <div className="lg:col-span-8">
                      <h3 className="font-display text-3xl font-bold text-slate-50">
                        {active.name} <span className="text-lg text-purple-300">({active.short})</span>
                      </h3>
                      <p className="font-data mt-2 text-xs text-slate-500">Pronounced: {active.pronunciation}</p>
                      <dl className="mt-6 space-y-5">
                        {[
                          ["Musical role", active.role],
                          ["Cultural & historical background", active.culture],
                          ["Example", active.example],
                        ].map(([label, text]) => (
                          <div key={label}>
                            <dt className="font-data text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</dt>
                            <dd className="mt-1.5 text-sm leading-relaxed text-slate-300">{text}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-10 grid gap-5 sm:grid-cols-3">
                {data.variants.map((v) => (
                  <div key={v.name} data-testid={`swara-variant-${v.name.toLowerCase()}`} className="dv-surface rounded-2xl p-6">
                    <h4 className="font-display text-lg font-semibold text-slate-50">{v.name}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{v.detail}</p>
                  </div>
                ))}
              </div>

              <p className="mt-10 flex max-w-3xl gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 text-xs leading-relaxed text-amber-200/85">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                {data.note}
              </p>
            </div>
          </section>
        </>
      )}
    </>
  );
}
