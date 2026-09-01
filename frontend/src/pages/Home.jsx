import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Calculator, Droplets, Music4, Brain, Gamepad2, Sparkles,
  Users, Crown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, apiError, PILLARS } from "@/lib/api";
import { AutoCarousel } from "@/components/AutoCarousel";
import { Reveal, SectionHeading, ErrorState } from "@/components/States";
import { Seo } from "@/components/Seo";

const HIGHLIGHTS = [
  { icon: Calculator, title: "Calorie Calculator", text: "Estimate BMR and daily energy needs with the Mifflin-St Jeor equation.", to: "/ahara#calculator" },
  { icon: Droplets, title: "Water Knowledge", text: "Follow water from rain to your glass and read every quality parameter.", to: "/jala" },
  { icon: Music4, title: "Swara Explorer", text: "Hear each of the seven swaras and read its role and cultural background.", to: "/swara" },
  { icon: Brain, title: "3D Brain", text: "Rotate an interactive brain model and tap regions to learn what they do.", to: "/manas#brain" },
  { icon: Gamepad2, title: "Mind Games", text: "Five original games for reaction, memory, attention and pattern skills.", to: "/games" },
  { icon: Sparkles, title: "AI Assistant", text: "Ask questions about any of the five pillars and get plain-language answers.", to: "/#ai-assistant" },
];

const GALLERY = [
  { url: "https://images.unsplash.com/photo-1610492219815-f76905e3f084?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400", caption: "Ahara — whole foods across categories", alt: "Wooden board with sliced fruits, vegetables and nuts" },
  { url: "https://images.unsplash.com/photo-1696371269814-ae41fc67cf03?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400", caption: "Jala — groundwater reaching the surface", alt: "Water gushing from a borewell pipe" },
  { url: "https://images.unsplash.com/photo-1579018371841-0f7e275dd50f?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400", caption: "Swara — sound, vibration and voice", alt: "Musician playing a long-necked string instrument" },
  { url: "https://images.unsplash.com/photo-1600618528240-fb9fc964b853?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400", caption: "Manas — attention, memory and calm", alt: "Woman sitting cross-legged on a wooden deck at sunrise" },
  { url: "https://images.unsplash.com/photo-1622322977767-2c71d1787205?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400", caption: "Treatment — where water is made safe", alt: "Aerial view of a circular water treatment clarifier" },
];

function Counter({ value, testid }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (typeof value !== "number") return undefined;
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 900);
      setShown(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span data-testid={testid} className="font-display text-4xl font-bold text-slate-900 sm:text-5xl">
      {shown.toLocaleString()}
    </span>
  );
}

export default function Home() {
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const [s, p] = await Promise.all([api.get("/stats/community"), api.get("/plans")]);
      setStats(s.data);
      setPlans(p.data.plans);
    } catch (err) {
      setError(apiError(err, "Community information could not be loaded."));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const premiumPlan = plans.find((p) => p.code !== "free");

  return (
    <>
      <Seo
        title="Explore. Understand. Improve."
        description="Deha Veda Ecosystem brings food, water, sound, mind and cognitive games into one interactive educational platform."
        path="/"
      />

      {/* Hero */}
      <section className="dv-grain dv-aurora relative overflow-hidden border-b border-slate-200">
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:py-28">
          <div className="dv-rise lg:col-span-7">
            <p className="font-data mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-600/8 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.28em] text-emerald-700">
              Five Pillars · One Ecosystem
            </p>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Discover the five dimensions of{" "}
              <span className="bg-gradient-to-r from-emerald-600 via-sky-600 to-purple-600 bg-clip-text text-transparent">
                Deha Veda
              </span>
            </h1>
            <p className="mt-3 font-data text-xs uppercase tracking-[0.35em] text-slate-500">
              Explore. Understand. Improve.
            </p>
            <p className="mt-7 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Explore food, water, sound, mind and cognitive games through interactive experiences built on
              reliable sources — WHO, BIS drinking-water standards and USDA nutrition data.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href="#pillars">
                <Button data-testid="hero-explore-button" size="lg" className="rounded-full bg-emerald-600 px-7 text-white hover:bg-emerald-700">
                  Explore the Ecosystem <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <Link to="/ahara">
                <Button data-testid="hero-learn-button" size="lg" variant="secondary" className="rounded-full px-7">
                  Start Learning
                </Button>
              </Link>
              <Link to="/games">
                <Button data-testid="hero-games-button" size="lg" variant="ghost" className="rounded-full px-7 text-slate-700">
                  Play Games
                </Button>
              </Link>
            </div>
          </div>

          <div className="dv-rise lg:col-span-5" style={{ animationDelay: "160ms" }}>
            <div className="relative overflow-hidden rounded-[28px] border border-slate-200">
              <img
                src="https://images.pexels.com/photos/32629853/pexels-photo-32629853.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Calm natural landscape representing the Deha Veda ecosystem"
                className="h-[280px] w-full object-cover sm:h-[420px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/55 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/60 bg-white/95 px-5 py-4 shadow-lg">
                <p className="font-data text-[10px] uppercase tracking-[0.24em] text-emerald-700">Live community</p>
                <p className="mt-1 text-sm text-slate-700">
                  {stats ? `${stats.community_members.toLocaleString()} members · ${stats.premium_members.toLocaleString()} premium` : "Loading community data…"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Five pillars */}
      <section id="pillars" className="mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
        <SectionHeading
          eyebrow="The Dashboard"
          title="Five pillars of the ecosystem"
          subtitle="Each pillar is a full learning space with its own tools, visuals and interactive experiences."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.code} delay={i * 80}>
              <Link
                to={p.path}
                data-testid={`pillar-card-${p.code}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition-all duration-500 hover:-translate-y-1.5 hover:border-slate-300"
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={p.image}
                    alt={`${p.name} — ${p.subtitle}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/10 to-transparent" />
                  <span className="font-data absolute left-5 top-5 text-[11px] tracking-[0.3em]" style={{ color: p.accent }}>
                    {p.index}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900">{p.name}</h3>
                  <p className="mt-1 text-xs font-semibold" style={{ color: p.accentText }}>
                    {p.subtitle}
                  </p>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">{p.blurb}</p>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 transition-colors group-hover:text-emerald-700">
                    Explore <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Interactive highlights */}
      <section className="border-y border-slate-200 bg-[#F6F5F1]">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <SectionHeading
            eyebrow="Interactive Highlights"
            title="Tools you can actually use"
            subtitle="Nothing here is a static page. Every highlight is a working tool inside the ecosystem."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HIGHLIGHTS.map((h, i) => (
              <Reveal key={h.title} delay={i * 60}>
                <Link
                  to={h.to}
                  data-testid={`highlight-${h.title.toLowerCase().replace(/\W+/g, "-")}`}
                  className="dv-surface group flex h-full flex-col rounded-2xl p-6 transition-colors hover:border-emerald-500/40"
                >
                  <h.icon className="mb-4 h-5 w-5 text-emerald-600" />
                  <p className="font-display text-lg font-semibold text-slate-900">{h.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{h.text}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <SectionHeading eyebrow="Growing Together" title="Our community, counted live" subtitle="These numbers are queried from the database on every visit." />
        {error ? (
          <div className="mt-10 max-w-lg">
            <ErrorState message={error} onRetry={load} />
          </div>
        ) : (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Community Members", key: "community_members", testid: "stat-community-members", icon: Users },
              { label: "Premium Members", key: "premium_members", testid: "stat-premium-members", icon: Crown },
              { label: "Games Played", key: "games_played", testid: "stat-games-played", icon: Gamepad2 },
              { label: "Foods Catalogued", key: "foods_catalogued", testid: "stat-foods", icon: Calculator },
            ].map((s, i) => (
              <Reveal key={s.key} delay={i * 70}>
                <div className="dv-surface rounded-2xl p-7">
                  <s.icon className="mb-5 h-5 w-5 text-emerald-600" />
                  {stats ? <Counter value={stats[s.key]} testid={s.testid} /> : <span className="font-display text-4xl text-slate-300">—</span>}
                  <p className="font-data mt-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* Membership */}
      <section className="border-y border-slate-200 bg-[#F6F5F1]">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionHeading eyebrow="Membership" title="Free to start, premium when you want depth" />
              <p className="mt-6 text-sm leading-relaxed text-slate-600">
                Free membership already opens all five pillars. Premium unlocks the complete food database, every
                water-quality parameter, all seven swaras, the full Manas library, all five games and your saved
                game history.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/membership">
                  <Button data-testid="home-subscribe-button" className="rounded-full bg-amber-600 px-6 text-white hover:bg-amber-700">
                    Subscribe
                  </Button>
                </Link>
                <Link to="/membership#qr">
                  <Button data-testid="home-scan-button" variant="secondary" className="rounded-full px-6">
                    Scan to Pay
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
              {plans.map((plan) => (
                <div
                  key={plan.code}
                  data-testid={`home-plan-${plan.code}`}
                  className={`rounded-3xl border p-7 ${
                    plan.code === "free" ? "border-slate-200 bg-white" : "border-amber-500/35 bg-amber-600/5"
                  }`}
                >
                  <p className="font-display text-xl font-semibold text-slate-900">{plan.name}</p>
                  <p className="font-data mt-3 text-2xl text-emerald-700">
                    {plan.price === 0 ? "Free" : `₹${plan.price}`}
                    {plan.duration_days ? <span className="text-xs text-slate-500"> / {plan.duration_days} days</span> : null}
                  </p>
                  <ul className="mt-5 space-y-2">
                    {plan.features.slice(0, 5).map((f) => (
                      <li key={f} className="flex gap-2 text-xs text-slate-600">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {!premiumPlan && !error && <p className="text-sm text-slate-500">Loading plans…</p>}
            </div>
          </div>
        </div>
      </section>

      {/* AI assistant */}
      <section id="ai-assistant" className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="dv-glass dv-grain relative overflow-hidden rounded-3xl p-8 sm:p-14">
          <Sparkles className="mb-6 h-6 w-6 text-emerald-600" />
          <h2 className="font-display max-w-2xl text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
            Ask Deha Veda AI anything about the five pillars
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600">
            The assistant explains nutrition figures, water-quality terms, swara concepts and mind topics in plain
            language. It is not a doctor and will always point you to a qualified professional for personal health
            questions.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["How many calories are in an apple?", "What is groundwater?", "What is Sa in Swara?"].map((q) => (
              <span key={q} className="font-data rounded-full border border-slate-300 px-3.5 py-2 text-[11px] text-slate-600">
                {q}
              </span>
            ))}
          </div>
          <p className="mt-8 text-xs text-slate-500">
            Open the assistant using the circular button at the bottom-right of any page.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="mx-auto max-w-7xl px-4 pb-24 lg:px-8">
        <SectionHeading eyebrow="Gallery" title="Visuals that explain, not decorate" />
        <div className="mt-10">
          <AutoCarousel slides={GALLERY} testid="home-gallery" />
        </div>
      </section>
    </>
  );
}
