import { lazy, Suspense, useEffect, useState } from "react";
import { Info, Leaf } from "lucide-react";
import { api, apiError, GALLERIES } from "@/lib/api";
import { AutoCarousel } from "@/components/AutoCarousel";
import { ErrorState, Loading, PremiumLock, SectionHeading, Reveal } from "@/components/States";
import { Seo } from "@/components/Seo";

const Brain3D = lazy(() => import("@/components/Brain3D").then((m) => ({ default: m.Brain3D })));

export default function Manas() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [region, setRegion] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: d } = await api.get("/manas");
      setData(d);
      setRegion(d.brain_regions[0]);
    } catch (err) {
      setError(apiError(err, "Mind content could not be loaded. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Seo title="Manas — Mind" description="Brain and mind, thoughts, attention, memory, emotion and sleep, plus an interactive 3D brain model with clickable regions." path="/manas" />

      <header className="dv-aurora border-b border-slate-200">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-12 lg:px-8 lg:py-20">
          <div className="lg:col-span-7">
            <p className="font-data mb-4 text-[11px] uppercase tracking-[0.3em] text-emerald-600">04 — Manas</p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Mind
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              The brain is an organ. The mind is the set of functions we experience through it. This page explains
              both in plain language, and lets you explore a simplified brain model in three dimensions.
            </p>
          </div>
          <div className="lg:col-span-5">
            <img
              src="/images/pillar-manas.jpg"
              alt="Translucent illustration of a human brain with glowing neural pathways"
              className="h-64 w-full rounded-2xl border border-slate-200 object-cover shadow-sm sm:h-72"
            />
          </div>
        </div>
      </header>

      {loading && <div className="mx-auto max-w-7xl px-4 lg:px-8"><Loading label="Loading mind content…" /></div>}
      {!loading && error && <div className="mx-auto max-w-2xl px-4 py-16"><ErrorState message={error} onRetry={load} /></div>}

      {!loading && data && (
        <>
          <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
            <SectionHeading eyebrow="Foundations" title="How the mind is described" />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.topics.map((t, i) =>
                t.locked ? (
                  <PremiumLock key={t.title} title={t.title} testid={`manas-topic-locked-${i}`} />
                ) : (
                  <Reveal key={t.title} delay={Math.min(i, 8) * 40}>
                    <article data-testid={`manas-topic-${i}`} className="dv-surface h-full rounded-2xl p-6">
                      <h3 className="font-display text-lg font-semibold text-slate-900">{t.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">{t.detail}</p>
                    </article>
                  </Reveal>
                ),
              )}
            </div>
          </section>

          <section id="brain" className="border-y border-slate-200 bg-[#F6F5F1]">
            <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
              <SectionHeading
                eyebrow="Interactive Brain Model"
                title="Explore a 3D brain model"
                subtitle="Drag to rotate in any direction, zoom with the buttons or scroll, and tap a glowing marker to read about that region. This is a simplified educational model, not a medical illustration."
              />
              <div className="mt-10 grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <Suspense fallback={<div className="h-[380px] rounded-3xl border border-slate-200 bg-[#F6F5F1]"><Loading label="Loading 3D model…" /></div>}>
                    <Brain3D regions={data.brain_regions} active={region} onSelect={setRegion} />
                  </Suspense>
                </div>
                <div className="lg:col-span-5">
                  <div data-testid="brain-region-detail" className="dv-surface rounded-3xl p-7">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: region?.color }} />
                    <h3 className="font-display mt-4 text-2xl font-bold text-slate-900">{region?.name}</h3>
                    <p className="mt-4 text-sm leading-relaxed text-slate-600">{region?.detail}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {data.brain_regions.map((r) => (
                      <button
                        key={r.key}
                        data-testid={`brain-region-${r.key}`}
                        onClick={() => setRegion(r)}
                        className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
                          region?.key === r.key ? "border-emerald-500/50 bg-emerald-600/10 text-emerald-800" : "border-slate-200 text-slate-600 hover:text-slate-800"
                        }`}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-8 flex max-w-3xl gap-2 rounded-2xl border border-sky-500/25 bg-sky-500/5 p-5 text-xs leading-relaxed text-sky-800">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                {data.note}
              </p>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
            <SectionHeading
              eyebrow="Peaceful Mind"
              title="What contributes to a calmer mental state"
              subtitle="These are general wellbeing factors supported by population research. They are not treatments, and nothing on this site cures psychological or medical conditions."
            />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.peaceful_mind.map((p, i) => (
                <Reveal key={p.title} delay={Math.min(i, 8) * 40}>
                  <article data-testid={`peaceful-${i}`} className="dv-surface h-full rounded-2xl p-6">
                    <Leaf className="mb-4 h-5 w-5 text-emerald-600" />
                    <h3 className="font-display text-lg font-semibold text-slate-900">{p.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{p.detail}</p>
                  </article>
                </Reveal>
              ))}
            </div>
            <div className="mt-12">
              <AutoCarousel slides={GALLERIES.manas} testid="manas-gallery" interval={6500} />
            </div>
          </section>
        </>
      )}
    </>
  );
}
