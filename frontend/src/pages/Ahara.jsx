import { useEffect, useMemo, useState } from "react";
import { Search, Flame, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, apiError, GALLERIES, foodImage } from "@/lib/api";
import { AutoCarousel } from "@/components/AutoCarousel";
import { ErrorState, Loading, EmptyState, PremiumLock, SectionHeading, Reveal } from "@/components/States";
import { Seo } from "@/components/Seo";

const ACTIVITY = [
  ["sedentary", "Sedentary — little or no exercise"],
  ["light", "Light — exercise 1-3 days a week"],
  ["moderate", "Moderate — exercise 3-5 days a week"],
  ["active", "Active — exercise 6-7 days a week"],
  ["very_active", "Very active — physical job or twice-daily training"],
];

function Macro({ label, value, unit }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2.5">
      <p className="font-data text-[9px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="font-data mt-1 text-sm text-slate-800">
        {value}
        <span className="text-[10px] text-slate-500">{unit}</span>
      </p>
    </div>
  );
}

function CalorieCalculator() {
  const [form, setForm] = useState({
    age: 30, sex: "male", height_cm: 170, weight_kg: 65, activity: "moderate", goal: "maintain",
  });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/tools/calorie", {
        ...form,
        age: Number(form.age),
        height_cm: Number(form.height_cm),
        weight_kg: Number(form.weight_kg),
      });
      setResult(data);
    } catch (err) {
      setError(apiError(err, "Calculation failed. Please check your inputs."));
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div id="calculator" className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={submit} data-testid="calorie-form" className="dv-surface rounded-3xl p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-slate-600">
            Age (years)
            <Input data-testid="calorie-age" type="number" min="10" max="100" value={form.age} onChange={set("age")} className="mt-2 bg-white" required />
          </label>
          <label className="text-xs text-slate-600">
            Sex
            <select data-testid="calorie-sex" value={form.sex} onChange={set("sex")} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800">
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <label className="text-xs text-slate-600">
            Height (cm)
            <Input data-testid="calorie-height" type="number" min="90" max="250" value={form.height_cm} onChange={set("height_cm")} className="mt-2 bg-white" required />
          </label>
          <label className="text-xs text-slate-600">
            Weight (kg)
            <Input data-testid="calorie-weight" type="number" min="25" max="300" value={form.weight_kg} onChange={set("weight_kg")} className="mt-2 bg-white" required />
          </label>
          <label className="text-xs text-slate-600 sm:col-span-2">
            Activity level
            <select data-testid="calorie-activity" value={form.activity} onChange={set("activity")} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800">
              {ACTIVITY.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-600 sm:col-span-2">
            Goal
            <select data-testid="calorie-goal" value={form.goal} onChange={set("goal")} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800">
              <option value="lose">Lose weight gradually</option>
              <option value="maintain">Maintain weight</option>
              <option value="gain">Gain weight gradually</option>
            </select>
          </label>
        </div>
        <Button data-testid="calorie-submit" type="submit" disabled={busy} className="mt-6 w-full rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
          {busy ? "Calculating…" : "Calculate my estimate"}
        </Button>
        {error && <p data-testid="calorie-error" className="mt-4 text-xs text-red-600">{error}</p>}
      </form>

      <div className="dv-surface rounded-3xl p-7">
        {result ? (
          <div data-testid="calorie-result">
            <p className="font-data text-[10px] uppercase tracking-[0.2em] text-emerald-600">Your estimate</p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <p className="font-display text-4xl font-bold text-slate-900" data-testid="calorie-bmr">{result.bmr}</p>
                <p className="font-data mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">BMR kcal/day</p>
              </div>
              <div>
                <p className="font-display text-4xl font-bold text-emerald-700" data-testid="calorie-maintenance">{result.maintenance}</p>
                <p className="font-data mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">Maintenance kcal/day</p>
              </div>
            </div>
            <div className="mt-7 space-y-3">
              <div className="rounded-xl bg-white p-4">
                <p className="text-xs text-slate-600">{result.goal_label} range</p>
                <p className="font-data mt-1 text-lg text-sky-700" data-testid="calorie-goal-range">
                  {result.goal_range[0]} – {result.goal_range[1]} kcal/day
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Macro label="BMI" value={result.bmi} unit=" kg/m²" />
                <Macro label="Protein guide" value={`${result.protein_g_range[0]}–${result.protein_g_range[1]}`} unit=" g/day" />
              </div>
            </div>
            <p className="mt-6 flex gap-2 text-[11px] leading-relaxed text-amber-700">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {result.disclaimer}
            </p>
            <p className="font-data mt-3 text-[10px] text-slate-400">{result.formula}</p>
          </div>
        ) : (
          <div className="flex h-full flex-col justify-center">
            <Flame className="mb-4 h-6 w-6 text-amber-600" />
            <p className="font-display text-xl text-slate-800">Your estimate appears here</p>
            <p className="mt-3 text-sm text-slate-500">
              Fill in the form to see basal metabolic rate, maintenance calories and a goal-based range. All figures
              are estimates, not medical advice.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Ahara() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/foods/categories").then(({ data: d }) => setCategories(["All", ...d.categories])).catch(() => {});
  }, []);

  const load = async (search = q, cat = category) => {
    setLoading(true);
    setError("");
    try {
      const { data: d } = await api.get("/foods", { params: { q: search, category: cat } });
      setData(d);
    } catch (err) {
      setError(apiError(err, "Food information could not be loaded. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(q, category), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category]);

  const items = useMemo(() => data?.items || [], [data]);

  return (
    <>
      <Seo title="Ahara — Food & Nutrition" description="Search a curated food database with calories, macros and key micronutrients, and estimate your daily calorie needs." path="/ahara" />

      <header className="dv-aurora border-b border-slate-200">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-12 lg:px-8 lg:py-20">
          <div className="lg:col-span-7">
            <p className="font-data mb-4 text-[11px] uppercase tracking-[0.3em] text-amber-600">01 — Ahara</p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Food &amp; Nutrition
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Understand what you eat in simple terms. Values are per 100 g edible portion (or 100 ml for liquids)
              and are drawn from USDA FoodData Central and Indian food composition references.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:col-span-5">
            {GALLERIES.ahara.slice(0, 4).map((g) => (
              <img
                key={g.url}
                src={g.url}
                alt={g.alt}
                loading="lazy"
                className="h-32 w-full rounded-2xl border border-slate-200 object-cover shadow-sm sm:h-36"
              />
            ))}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <SectionHeading eyebrow="Food Database" title="Search any food" subtitle="Type a name such as Apple, or browse by category." />

        <div className="mt-8 flex flex-col gap-4">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              data-testid="food-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search foods…"
              className="rounded-full border-slate-300 bg-white pl-11"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                data-testid={`food-category-${c.toLowerCase().replace(/\W+/g, "-")}`}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                  category === c
                    ? "border-amber-500/60 bg-amber-600/12 text-amber-700"
                    : "border-slate-300 text-slate-600 hover:text-slate-800"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10">
          {loading && <Loading label="Loading food information…" />}
          {!loading && error && <ErrorState message={error} onRetry={() => load()} />}
          {!loading && !error && items.length === 0 && <EmptyState message={`No foods matched "${q}". Try a different name.`} />}
          {!loading && !error && items.length > 0 && (
            <>
              {data.locked_count > 0 && (
                <p data-testid="food-locked-notice" className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-600/5 px-5 py-3.5 text-xs text-amber-700">
                  {data.locked_count} of {data.total} entries are part of Premium membership.
                </p>
              )}
              <div data-testid="food-grid" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((f, i) =>
                  f.locked ? (
                    <PremiumLock key={f.id} title={f.name} testid={`food-locked-${f.id}`} />
                  ) : (
                    <Reveal key={f.id} delay={Math.min(i, 8) * 40}>
                      <article data-testid={`food-card-${f.name.toLowerCase().replace(/\W+/g, "-")}`} className="dv-surface h-full overflow-hidden rounded-2xl">
                        <div className="relative h-36 overflow-hidden border-b border-slate-200">
                          <img
                            src={foodImage(f.category)}
                            alt={`${f.category} foods including ${f.name}`}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                          />
                          <span
                            data-testid={`food-calories-${f.name.toLowerCase().replace(/\W+/g, "-")}`}
                            className="font-data absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow"
                          >
                            {f.calories} kcal
                          </span>
                        </div>
                        <div className="p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-display text-xl font-semibold text-slate-900">{f.name}</h3>
                            <p className="mt-1 text-[11px] text-amber-600">{f.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-data text-2xl text-emerald-700">{f.calories}</p>
                            <p className="font-data text-[9px] uppercase tracking-[0.14em] text-slate-500">kcal</p>
                          </div>
                        </div>
                        <p className="font-data mt-4 text-[10px] uppercase tracking-[0.14em] text-slate-400">{f.serving_size}</p>
                        <div className="mt-4 grid grid-cols-2 gap-2.5">
                          <Macro label="Protein" value={f.protein_g} unit=" g" />
                          <Macro label="Carbs" value={f.carbs_g} unit=" g" />
                          <Macro label="Fat" value={f.fat_g} unit=" g" />
                          <Macro label="Fibre" value={f.fiber_g} unit=" g" />
                        </div>
                        {f.micronutrients && (
                          <p className="mt-4 text-xs text-sky-700">{f.micronutrients}</p>
                        )}
                        {f.note && <p className="mt-3 text-xs leading-relaxed text-slate-600">{f.note}</p>}
                        </div>
                      </article>
                    </Reveal>
                  ),
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-[#F6F5F1]">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <SectionHeading eyebrow="Tool" title="Calorie calculator" subtitle="Mifflin-St Jeor equation with standard activity multipliers." />
          <div className="mt-10">
            <CalorieCalculator />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <SectionHeading eyebrow="Gallery" title="Food, as it actually looks" />
        <div className="mt-10">
          <AutoCarousel slides={GALLERIES.ahara} testid="ahara-gallery" interval={5500} />
        </div>
      </section>
    </>
  );
}
