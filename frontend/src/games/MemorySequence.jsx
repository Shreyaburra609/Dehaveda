import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Stat } from "@/games/ReactionTime";
import { useScoreRecorder } from "@/games/useScoreRecorder";

const TILES = [
  { id: 0, color: "#10B981" },
  { id: 1, color: "#38BDF8" },
  { id: 2, color: "#A855F7" },
  { id: 3, color: "#F59E0B" },
];

export default function MemorySequence() {
  const [sequence, setSequence] = useState([]);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | showing | input | over
  const [flash, setFlash] = useState(null);
  const [best, setBest] = useState(() => Number(localStorage.getItem("dv_best_sequence") || 0));
  const timers = useRef([]);
  const record = useScoreRecorder("sequence");

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const show = (seq) => {
    setPhase("showing");
    timers.current.forEach(clearTimeout);
    timers.current = [];
    seq.forEach((tile, i) => {
      timers.current.push(setTimeout(() => setFlash(tile), 600 * i + 350));
      timers.current.push(setTimeout(() => setFlash(null), 600 * i + 700));
    });
    timers.current.push(
      setTimeout(() => {
        setPhase("input");
        setStep(0);
      }, 600 * seq.length + 400),
    );
  };

  const start = () => {
    const seq = [Math.floor(Math.random() * 4)];
    setSequence(seq);
    show(seq);
  };

  const press = (id) => {
    if (phase !== "input") return;
    setFlash(id);
    setTimeout(() => setFlash(null), 180);
    if (sequence[step] !== id) {
      const level = sequence.length - 1;
      setPhase("over");
      if (level > best) {
        setBest(level);
        localStorage.setItem("dv_best_sequence", String(level));
      }
      if (level > 0) record(level * 10, level);
      return;
    }
    if (step + 1 === sequence.length) {
      const next = [...sequence, Math.floor(Math.random() * 4)];
      setSequence(next);
      setTimeout(() => show(next), 550);
    } else {
      setStep(step + 1);
    }
  };

  const level = Math.max(0, sequence.length - (phase === "over" ? 1 : 0));

  return (
    <div data-testid="game-sequence">
      <div className="grid grid-cols-2 gap-4 sm:mx-auto sm:max-w-md">
        {TILES.map((t) => (
          <button
            key={t.id}
            data-testid={`sequence-tile-${t.id}`}
            onClick={() => press(t.id)}
            disabled={phase !== "input"}
            className="h-28 rounded-2xl border border-slate-800 transition-all duration-150 disabled:cursor-not-allowed sm:h-32"
            style={{
              background: flash === t.id ? t.color : `${t.color}22`,
              boxShadow: flash === t.id ? `0 0 34px ${t.color}88` : "none",
            }}
            aria-label={`Tile ${t.id + 1}`}
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Level" value={level} testid="sequence-level" />
        <Stat label="Score" value={level * 10} testid="sequence-score" />
        <Stat label="Best level" value={best} testid="sequence-best" />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button data-testid="sequence-start" onClick={start} className="rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400">
          {phase === "idle" ? "Start" : "Restart"}
        </Button>
        <p className="text-xs text-slate-500">
          {phase === "showing" && "Watch the pattern…"}
          {phase === "input" && `Repeat the pattern (${step}/${sequence.length})`}
          {phase === "over" && `Wrong tile. You reached level ${level}.`}
          {phase === "idle" && "One extra step is added each round."}
        </p>
      </div>
    </div>
  );
}
