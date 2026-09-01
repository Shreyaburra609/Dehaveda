import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Stat } from "@/games/ReactionTime";
import { useScoreRecorder } from "@/games/useScoreRecorder";

const gridFor = (level) => Math.min(6, 3 + Math.floor((level - 1) / 2));
const targetsFor = (level) => Math.min(gridFor(level) ** 2 - 1, 2 + level);

export default function VisualMemory() {
  const [level, setLevel] = useState(1);
  const [targets, setTargets] = useState([]);
  const [picked, setPicked] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | show | input | over
  const [best, setBest] = useState(() => Number(localStorage.getItem("dv_best_visual") || 0));
  const timer = useRef(null);
  const record = useScoreRecorder("visual");

  useEffect(() => () => clearTimeout(timer.current), []);

  const startLevel = (lvl) => {
    const size = gridFor(lvl);
    const total = size * size;
    const count = targetsFor(lvl);
    const set = new Set();
    while (set.size < count) set.add(Math.floor(Math.random() * total));
    setTargets([...set]);
    setPicked([]);
    setPhase("show");
    timer.current = setTimeout(() => setPhase("input"), 900 + count * 260);
  };

  const size = gridFor(level);

  const click = (i) => {
    if (phase !== "input" || picked.includes(i)) return;
    const next = [...picked, i];
    setPicked(next);
    if (!targets.includes(i)) {
      setPhase("over");
      if (level - 1 > best) {
        setBest(level - 1);
        localStorage.setItem("dv_best_visual", String(level - 1));
      }
      record(Math.max(0, (level - 1) * 15), Math.max(1, level - 1));
      return;
    }
    if (targets.every((t) => next.includes(t))) {
      const nextLevel = level + 1;
      setLevel(nextLevel);
      record(level * 15, level);
      setTimeout(() => startLevel(nextLevel), 700);
    }
  };

  return (
    <div data-testid="game-visual">
      <div
        className="mx-auto grid max-w-md gap-2"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: size * size }, (_, i) => {
          const revealed = phase === "show" || phase === "over";
          const isTarget = targets.includes(i);
          const isPicked = picked.includes(i);
          let cls = "bg-slate-200/70";
          if ((revealed && isTarget) || (isPicked && isTarget)) cls = "bg-emerald-500";
          else if (isPicked && !isTarget) cls = "bg-red-500/80";
          return (
            <button
              key={i}
              data-testid={`visual-cell-${i}`}
              onClick={() => click(i)}
              disabled={phase !== "input"}
              aria-label={`Cell ${i + 1}`}
              className={`aspect-square rounded-lg border border-slate-200 transition-colors duration-200 ${cls}`}
            />
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Level" value={level} testid="visual-level" />
        <Stat label="Score" value={(level - 1) * 15} testid="visual-score" />
        <Stat label="Best level" value={best} testid="visual-best" />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button
          data-testid="visual-start"
          onClick={() => {
            setLevel(1);
            startLevel(1);
          }}
          className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {phase === "idle" ? "Start" : "Restart"}
        </Button>
        <p className="text-xs text-slate-500">
          {phase === "show" && "Memorise the highlighted squares…"}
          {phase === "input" && "Select the squares that were highlighted."}
          {phase === "over" && `Missed. You reached level ${level}.`}
          {phase === "idle" && "The grid grows as you progress."}
        </p>
      </div>
    </div>
  );
}
