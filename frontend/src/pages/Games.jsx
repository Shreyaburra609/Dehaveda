import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Trophy, RotateCcw, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, apiError, GALLERIES } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ErrorState, Loading, SectionHeading } from "@/components/States";
import { Seo } from "@/components/Seo";
import { readLocalScores } from "@/games/useScoreRecorder";
import ReactionTime from "@/games/ReactionTime";
import MemorySequence from "@/games/MemorySequence";
import NumberMemory from "@/games/NumberMemory";
import VisualMemory from "@/games/VisualMemory";
import PatternRecognition from "@/games/PatternRecognition";

const COMPONENTS = {
  reaction: ReactionTime,
  sequence: MemorySequence,
  number: NumberMemory,
  visual: VisualMemory,
  pattern: PatternRecognition,
};

export default function Games() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [dash, setDash] = useState(null);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showScores, setShowScores] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: d } = await api.get("/games");
      setData(d);
    } catch (err) {
      setError(apiError(err, "Games could not be loaded. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const loadDash = async () => {
    if (!user) {
      const local = readLocalScores();
      const bests = {};
      local.forEach((s) => {
        const cur = bests[s.game];
        const better = !cur || (s.game === "reaction" ? s.score < cur.score : s.score > cur.score);
        if (better) bests[s.game] = { score: s.score, level: s.level, at: s.created_at };
      });
      setDash({
        games_played: local.length,
        total_score: Math.round(local.filter((s) => s.game !== "reaction").reduce((a, b) => a + b.score, 0)),
        personal_bests: bests,
        recent: local.slice(0, 12),
        local: true,
      });
      return;
    }
    try {
      const { data: d } = await api.get("/games/dashboard");
      setDash({ ...d, local: false });
    } catch {
      setDash(null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadDash();
    const onScore = () => loadDash();
    window.addEventListener("dv-score-recorded", onScore);
    return () => window.removeEventListener("dv-score-recorded", onScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, active]);

  const Active = active ? COMPONENTS[active.code] : null;

  return (
    <>
      <Seo title="Games — Mind Games" description="Five original cognitive games: reaction time, memory sequence, number memory, visual memory and pattern recognition, with a personal score dashboard." path="/games" />

      <header className="dv-aurora border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-20">
          <p className="font-data mb-4 text-[11px] uppercase tracking-[0.3em] text-indigo-400">05 — Games</p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Mind Games
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Five original games for reaction speed, sequential memory, digit span, spatial memory and pattern
            reasoning. They all work with touch. Scores save to your account when you are logged in, and to this
            browser when you are not.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        {loading && <Loading label="Loading games…" />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}

        {!loading && data && (
          <>
            <div data-testid="games-grid" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.games.map((g, gi) => (
                <div
                  key={g.code}
                  data-testid={`game-card-${g.code}`}
                  className={`dv-surface flex flex-col overflow-hidden rounded-2xl ${active?.code === g.code ? "border-indigo-500/50" : ""}`}
                >
                  <img
                    src={GALLERIES.games[gi % GALLERIES.games.length]}
                    alt={`${g.name} game illustration`}
                    loading="lazy"
                    className="h-32 w-full border-b border-slate-200 object-cover"
                  />
                  <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-xl font-semibold text-slate-900">{g.name}</h3>
                  <p className="mt-1.5 text-xs text-indigo-600">{g.tagline}</p>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">{g.description}</p>
                  {g.locked ? (
                    <Link to="/membership" className="mt-5">
                      <Button data-testid={`game-locked-${g.code}`} size="sm" variant="secondary" className="w-full rounded-full">
                        <Lock className="mr-2 h-3.5 w-3.5" /> Premium game
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      data-testid={`game-play-${g.code}`}
                      size="sm"
                      onClick={() => {
                        setActive(g);
                        setTimeout(() => document.getElementById("play-area")?.scrollIntoView({ behavior: "smooth" }), 60);
                      }}
                      className="mt-5 w-full rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Play
                    </Button>
                  )}
                  </div>
                </div>
              ))}
            </div>

            <div id="play-area" className="mt-14">
              {Active ? (
                <>
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-2xl font-bold text-slate-900">{active.name}</h2>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        data-testid="play-again-button"
                        size="sm"
                        variant="secondary"
                        className="rounded-full"
                        onClick={() => {
                          const g = active;
                          setActive(null);
                          setTimeout(() => setActive(g), 40);
                        }}
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Play Again
                      </Button>
                      <Button
                        data-testid="try-another-button"
                        size="sm"
                        variant="ghost"
                        className="rounded-full text-slate-700"
                        onClick={() => {
                          const open = data.games.filter((g) => !g.locked && g.code !== active.code);
                          if (open.length) setActive(open[Math.floor(Math.random() * open.length)]);
                        }}
                      >
                        <Shuffle className="mr-1.5 h-3.5 w-3.5" /> Try Another Game
                      </Button>
                      <Button
                        data-testid="view-scores-button"
                        size="sm"
                        variant="ghost"
                        className="rounded-full text-slate-700"
                        onClick={() => {
                          setShowScores(true);
                          setTimeout(() => document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" }), 60);
                        }}
                      >
                        <Trophy className="mr-1.5 h-3.5 w-3.5" /> View My Scores
                      </Button>
                    </div>
                  </div>
                  <Active />
                </>
              ) : (
                <div className="dv-surface rounded-3xl p-10 text-center">
                  <p className="font-display text-xl text-slate-700">Choose a game above to start playing.</p>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <section id="dashboard" className="border-t border-slate-200 bg-[#F6F5F1]">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <SectionHeading
            eyebrow="Game Dashboard"
            title="Your scores"
            subtitle={
              user
                ? "Saved to your account and available on any device."
                : "Stored temporarily in this browser. Log in to keep your history permanently."
            }
          />
          {!dash ? (
            <Loading label="Loading your scores…" />
          ) : (
            <>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Games played" value={dash.games_played} testid="dash-games-played" />
                <Metric label="Total score" value={dash.total_score} testid="dash-total-score" />
                <Metric
                  label="Best reaction"
                  value={dash.personal_bests?.reaction ? `${Math.round(dash.personal_bests.reaction.score)} ms` : "—"}
                  testid="dash-best-reaction"
                />
                <Metric
                  label="Best memory level"
                  value={
                    Math.max(
                      dash.personal_bests?.sequence?.level || 0,
                      dash.personal_bests?.number?.level || 0,
                      dash.personal_bests?.visual?.level || 0,
                    ) || "—"
                  }
                  testid="dash-best-memory"
                />
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-2">
                <div className="dv-surface rounded-2xl p-6">
                  <p className="font-data mb-4 text-[10px] uppercase tracking-[0.2em] text-slate-500">Personal bests</p>
                  {Object.keys(dash.personal_bests || {}).length === 0 ? (
                    <p className="text-sm text-slate-500">No scores yet. Play a game to get started.</p>
                  ) : (
                    <ul data-testid="personal-bests" className="space-y-2.5">
                      {Object.entries(dash.personal_bests).map(([code, b]) => (
                        <li key={code} className="flex items-center justify-between text-sm">
                          <span className="capitalize text-slate-700">{code}</span>
                          <span className="font-data text-emerald-700">
                            {code === "reaction" ? `${Math.round(b.score)} ms` : `${Math.round(b.score)} pts · L${b.level}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="dv-surface rounded-2xl p-6">
                  <p className="font-data mb-4 text-[10px] uppercase tracking-[0.2em] text-slate-500">Recent games</p>
                  {!dash.recent?.length ? (
                    <p className="text-sm text-slate-500">Nothing played yet.</p>
                  ) : (
                    <ul data-testid="recent-games" className="space-y-2">
                      {dash.recent.map((r, i) => (
                        <li key={r.id || i} className="flex items-center justify-between text-xs text-slate-600">
                          <span className="capitalize">{r.game}</span>
                          <span className="font-data">{Math.round(r.score)}</span>
                          <span className="text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {!user && showScores && (
                <p className="mt-6 text-xs text-amber-700">
                  <Link to="/register" className="underline">Create a free account</Link> to keep these scores permanently.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, testid }) {
  return (
    <div className="dv-surface rounded-2xl p-6">
      <p className="font-display text-3xl font-bold text-slate-900" data-testid={testid}>{value}</p>
      <p className="font-data mt-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
    </div>
  );
}
