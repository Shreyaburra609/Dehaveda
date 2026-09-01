import { useEffect, useState } from "react";
import { Droplets, AlertTriangle, ChevronRight } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { AutoCarousel } from "@/components/AutoCarousel";
import { ErrorState, Loading, PremiumLock, SectionHeading, Reveal } from "@/components/States";
import { Seo } from "@/components/Seo";

export default function Jala() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [param, setParam] = useState(0);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: d } = await api.get("/jala");
      setData(d);
    } catch (err) {
      setError(apiError(err, "Water information could not be loaded. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeParam = data?.parameters?.[param];

  return (
    <>
      <Seo title="Jala — Water & Water Knowledge" description="What are we actually drinking? Water types, the journey from rain to tap, quality parameters and contamination explained using WHO and BIS references." path="/jala" />

      <header className="dv-aurora border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-20">
          <p className="font-data mb-4 text-[11px] uppercase tracking-[0.3em] text-sky-600">02 — Jala</p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            What are we actually drinking?
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Water is never just H₂O. It carries minerals, gases and sometimes contaminants picked up along its
            journey. This page explains each water type, every common quality parameter and where things go wrong.
          </p>
        </div>
      </header>

      {loading && <div className="mx-auto max-w-7xl px-4 lg:px-8"><Loading label="Loading water knowledge…" /></div>}
      {!loading && error && <div className="mx-auto max-w-2xl px-4 py-16"><ErrorState message={error} onRetry={load} /></div>}

      {!loading && data && (
        <>
          {/* Water types */}
          <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
            <SectionHeading eyebrow="Definitions" title="Types of water, clearly explained" />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.water_types.map((t, i) =>
                t.locked ? (
                  <PremiumLock key={t.name} title={t.name} testid={`water-type-locked-${i}`} />
                ) : (
                  <Reveal key={t.name} delay={Math.min(i, 6) * 50}>
                    <article data-testid={`water-type-${i}`} className="dv-surface h-full rounded-2xl p-6">
                      <Droplets className="mb-4 h-5 w-5 text-sky-600" />
                      <h3 className="font-display text-lg font-semibold text-slate-900">{t.name}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">{t.summary}</p>
                    </article>
                  </Reveal>
                ),
              )}
            </div>
          </section>

          {/* Water journey */}
          <section className="border-y border-slate-200 bg-[#F6F5F1]">
            <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
              <SectionHeading eyebrow="The Water Journey" title="Rain to drinking glass, step by step" subtitle="Select any stage to see what happens there and where contamination can enter." />
              <div data-testid="water-journey" className="mt-10 flex flex-wrap gap-2">
                {data.journey.map((s, i) => (
                  <button
                    key={s.step}
                    data-testid={`journey-step-${s.step}`}
                    onClick={() => setStep(i)}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition-colors ${
                      step === i ? "border-sky-500/60 bg-sky-500/12 text-sky-700" : "border-slate-300 text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    <span className="font-data text-[10px] text-slate-500">{s.step}</span>
                    {s.title}
                    {i < data.journey.length - 1 && <ChevronRight className="h-3 w-3 text-slate-400" />}
                  </button>
                ))}
              </div>
              <div data-testid="journey-detail" className="dv-surface mt-8 grid gap-6 rounded-3xl p-8 lg:grid-cols-2">
                <div>
                  <p className="font-data text-[10px] uppercase tracking-[0.2em] text-sky-600">
                    Stage {data.journey[step].step} of {data.journey.length}
                  </p>
                  <h3 className="font-display mt-3 text-2xl font-bold text-slate-900">{data.journey[step].title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">{data.journey[step].description}</p>
                </div>
                <div className="rounded-2xl border border-amber-500/25 bg-amber-600/5 p-6">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                    <AlertTriangle className="h-4 w-4" /> Contamination risk here
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-amber-800">{data.journey[step].risk}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Parameters */}
          <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
            <SectionHeading eyebrow="Water Quality" title="Parameter explorer" subtitle={data.sources} />
            <div className="mt-10 grid gap-6 lg:grid-cols-12">
              <div className="flex flex-col gap-2 lg:col-span-4">
                {data.parameters.map((p, i) => (
                  <button
                    key={p.name}
                    data-testid={`param-tab-${i}`}
                    onClick={() => setParam(i)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      param === i ? "border-sky-500/50 bg-sky-500/10 text-sky-800" : "border-slate-200 text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    {p.name}
                    {p.locked && <span className="font-data text-[9px] uppercase tracking-wider text-amber-600">Premium</span>}
                  </button>
                ))}
              </div>
              <div className="lg:col-span-8">
                {activeParam?.locked ? (
                  <PremiumLock title={activeParam.name} testid="param-locked" />
                ) : (
                  <div data-testid="param-detail" className="dv-surface rounded-3xl p-8">
                    <h3 className="font-display text-2xl font-bold text-slate-900">{activeParam.name}</h3>
                    <dl className="mt-6 space-y-5">
                      {[
                        ["What it means", activeParam.meaning],
                        ["Why it matters", activeParam.why],
                        ["How it is measured", activeParam.measured],
                        ["High values may indicate", activeParam.high],
                        ["Low values may indicate", activeParam.low],
                      ].map(([label, text]) => (
                        <div key={label}>
                          <dt className="font-data text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</dt>
                          <dd className="mt-1.5 text-sm leading-relaxed text-slate-700">{text}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-7 rounded-2xl border border-sky-500/25 bg-sky-500/5 p-5">
                      <p className="font-data text-[10px] uppercase tracking-[0.18em] text-sky-700">Reference values</p>
                      <p className="mt-2 text-sm leading-relaxed text-sky-800">{activeParam.reference}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Contamination */}
          <section className="border-y border-slate-200 bg-[#F6F5F1]">
            <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
              <SectionHeading eyebrow="Contamination" title="How water becomes unsafe" />
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.contamination.map((c, i) => (
                  <Reveal key={c.type} delay={Math.min(i, 6) * 50}>
                    <article data-testid={`contamination-${i}`} className="dv-surface h-full rounded-2xl p-6">
                      <h3 className="font-display text-lg font-semibold text-slate-900">{c.type}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">{c.detail}</p>
                      <p className="mt-4 rounded-xl bg-emerald-600/8 px-4 py-3 text-xs leading-relaxed text-emerald-800">
                        Prevention: {c.prevention}
                      </p>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          {/* Gallery */}
          <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
            <SectionHeading eyebrow="Gallery" title="Water in the real world" />
            <div className="mt-10">
              <AutoCarousel slides={data.gallery} testid="jala-gallery" interval={6000} />
            </div>
          </section>
        </>
      )}
    </>
  );
}
