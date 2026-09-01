import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useScoreRecorder } from "@/games/useScoreRecorder";

export default function ReactionTime() {
  const [phase, setPhase] = useState("idle"); // idle | waiting | ready | result | early
  const [last, setLast] = useState(null);
  const [times, setTimes] = useState([]);
  const timerRef = useRef(null);
  const startRef = useRef(0);
  const record = useScoreRecorder("reaction");

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const begin = () => {
    setPhase("waiting");
    timerRef.current = setTimeout(() => {
      startRef.current = performance.now();
      setPhase("ready");
    }, 1200 + Math.random() * 2600);
  };

  const click = () => {
    if (phase === "idle" || phase === "result" || phase === "early") {
      begin();
      return;
    }
    if (phase === "waiting") {
      clearTimeout(timerRef.current);
      setPhase("early");
      return;
    }
    const ms = Math.round(performance.now() - startRef.current);
    setLast(ms);
    setTimes((t) => [...t, ms]);
    setPhase("result");
    record(ms, 1, { attempts: times.length + 1 });
  };

  const best = times.length ? Math.min(...times) : null;
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;

  const bg =
    phase === "ready" ? "bg-emerald-500" : phase === "waiting" ? "bg-slate-800" : phase === "early" ? "bg-red-900/70" : "bg-slate-900";

  return (
    <div data-testid="game-reaction">
      <button
        data-testid="reaction-area"
        onClick={click}
        className={`flex h-72 w-full select-none items-center justify-center rounded-3xl border border-slate-800 text-center transition-colors duration-150 ${bg}`}
      >
        <div className="px-6">
          {phase === "idle" && <p className="font-display text-2xl text-slate-100">Click to begin</p>}
          {phase === "waiting" && <p className="font-display text-2xl text-slate-400">Wait for green…</p>}
          {phase === "ready" && <p className="font-display text-3xl font-bold text-slate-950">CLICK NOW</p>}
          {phase === "early" && <p className="font-display text-2xl text-red-200">Too early. Click to retry.</p>}
          {phase === "result" && (
            <>
              <p data-testid="reaction-result" className="font-display text-5xl font-bold text-emerald-300">{last} ms</p>
              <p className="mt-2 text-xs text-slate-400">Click to try again</p>
            </>
          )}
        </div>
      </button>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Attempts" value={times.length} testid="reaction-attempts" />
        <Stat label="Average" value={avg ? `${avg} ms` : "—"} testid="reaction-average" />
        <Stat label="Best" value={best ? `${best} ms` : "—"} testid="reaction-best" />
      </div>
      <Button
        data-testid="reaction-reset"
        variant="ghost"
        className="mt-4 rounded-full text-slate-400"
        onClick={() => {
          setTimes([]);
          setLast(null);
          setPhase("idle");
        }}
      >
        Reset session
      </Button>
    </div>
  );
}

export function Stat({ label, value, testid }) {
  return (
    <div className="dv-surface rounded-xl px-4 py-3">
      <p className="font-data text-[9px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p data-testid={testid} className="font-data mt-1 text-lg text-slate-100">{value}</p>
    </div>
  );
}
