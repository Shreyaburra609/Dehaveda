import { Link } from "react-router-dom";
import { PILLARS } from "@/lib/api";
import { SectionHeading, Reveal } from "@/components/States";
import { Seo } from "@/components/Seo";

export default function About() {
  return (
    <>
      <Seo title="About" description="Deha Veda Ecosystem brings food, water, sound, mind and cognitive games into one educational platform." path="/about" />

      <header className="dv-aurora border-b border-slate-800/70">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-20">
          <p className="font-data mb-4 text-[11px] uppercase tracking-[0.3em] text-emerald-400">About</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
            What is Deha Veda Ecosystem?
          </h1>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
        <div className="space-y-6 text-sm leading-relaxed text-slate-300 sm:text-base">
          <p>
            Deha Veda Ecosystem is an educational platform. It brings together five subjects that shape daily
            wellbeing — food, water, sound, mind and cognitive training — and presents each one as something you
            can read, try and measure rather than simply scroll past.
          </p>
          <p>
            Most information about health is either too shallow to be useful or too technical to be readable. We
            aim for the middle: plain language, real reference values, and clearly cited sources. Nutrition figures
            come from USDA FoodData Central and Indian food composition references. Water-quality limits come from
            the WHO Guidelines for Drinking-water Quality and BIS IS 10500:2012.
          </p>
          <p>
            Where a topic belongs to tradition rather than to measurement — as with the swaras of Indian classical
            music — we say so plainly, and we separate cultural understanding from scientific evidence instead of
            blending the two.
          </p>
          <p>
            Nothing on this site is medical advice, and nothing here diagnoses or treats any condition. The AI
            assistant follows the same rule and will point you towards a qualified professional for personal health
            questions.
          </p>
        </div>

        <div className="mt-14">
          <SectionHeading eyebrow="The Ecosystem" title="Five pillars, one platform" />
          <div className="mt-8 space-y-4">
            {PILLARS.map((p, i) => (
              <Reveal key={p.code} delay={i * 60}>
                <Link
                  to={p.path}
                  data-testid={`about-pillar-${p.code}`}
                  className="dv-surface flex items-start gap-5 rounded-2xl p-6 transition-colors hover:border-emerald-500/40"
                >
                  <span className="font-data text-xs" style={{ color: p.accent }}>{p.index}</span>
                  <div>
                    <p className="font-display text-xl font-semibold text-slate-50">
                      {p.name} <span className="text-sm text-slate-400">— {p.subtitle}</span>
                    </p>
                    <p className="mt-2 text-sm text-slate-400">{p.blurb}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
