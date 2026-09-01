import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Stat } from "@/games/ReactionTime";
import { useScoreRecorder } from "@/games/useScoreRecorder";

const SHAPES = ["●", "■", "▲", "◆", "★", "✚"];

function makePuzzle(level) {
  const kind = level % 3;
  if (kind === 0) {
    const start = 1 + Math.floor(Math.random() * 6);
    const diff = 2 + Math.floor(Math.random() * (2 + level));
    const seq = [start, start + diff, start + 2 * diff, start + 3 * diff];
    const answer = start + 4 * diff;
    return {
      prompt: seq.join("  ,  ") + "  ,  ?",
      answer: String(answer),
      options: shuffle([answer, answer + diff, answer - diff, answer + 1].map(String)),
      hint: "Arithmetic sequence",
    };
  }
  if (kind === 1) {
    const start = 1 + Math.floor(Math.random() * 4);
    const ratio = 2 + (level % 2);
    const seq = [start, start * ratio, start * ratio ** 2, start * ratio ** 3];
    const answer = start * ratio ** 4;
    return {
      prompt: seq.join("  ,  ") + "  ,  ?",
      answer: String(answer),
      options: shuffle([answer, answer * ratio, Math.round(answer / ratio), answer + ratio].map(String)),
      hint: "Geometric sequence",
    };
  }
  const period = 2 + (level % 3);
  const pool = shuffle([...SHAPES]).slice(0, period);
  const seq = Array.from({ length: 5 }, (_, i) => pool[i % period]);
  const answer = pool[5 % period];
  return {
    prompt: seq.join("   ") + "   ?",
    answer,
    options: shuffle([...new Set([answer, ...shuffle(SHAPES).slice(0, 3)])].slice(0, 4)),
    hint: "Repeating visual pattern",
  };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PatternRecognition() {
  const [level, setLevel] = useState(1);
  const [puzzle, setPuzzle] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState("");
  const record = useScoreRecorder("pattern");

  const next = useCallback((lvl) => {
    setPuzzle(makePuzzle(lvl));
    setFeedback("");
  }, []);

  useEffect(() => {
    next(1);
  }, [next]);

  const answer = (opt) => {
    if (!puzzle || feedback) return;
    const ok = opt === puzzle.answer;
    setAttempts((a) => a + 1);
    if (ok) {
      const newCorrect = correct + 1;
      setCorrect(newCorrect);
      setFeedback("correct");
      record(newCorrect * 20, level);
      setTimeout(() => {
        const lvl = level + 1;
        setLevel(lvl);
        next(lvl);
      }, 750);
    } else {
      setFeedback("wrong");
      setTimeout(() => next(level), 1100);
    }
  };

  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;

  return (
    <div data-testid="game-pattern">
      <div className="dv-surface rounded-3xl p-8 text-center">
        <p className="font-data text-[10px] uppercase tracking-[0.2em] text-slate-500">{puzzle?.hint}</p>
        <p data-testid="pattern-prompt" className="font-data mt-5 text-2xl text-slate-900 sm:text-3xl">
          {puzzle?.prompt}
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {puzzle?.options.map((o) => (
            <button
              key={o}
              data-testid={`pattern-option-${o}`}
              onClick={() => answer(o)}
              className="font-data rounded-xl border border-slate-300 py-4 text-lg text-slate-900 transition-colors hover:border-indigo-400/70 hover:bg-indigo-600/10"
            >
              {o}
            </button>
          ))}
        </div>
        {feedback && (
          <p
            data-testid="pattern-feedback"
            className={`mt-6 text-sm ${feedback === "correct" ? "text-emerald-700" : "text-red-600"}`}
          >
            {feedback === "correct" ? "Correct — next level." : `Not that one. The answer was ${puzzle.answer}.`}
          </p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Level" value={level} testid="pattern-level" />
        <Stat label="Score" value={correct * 20} testid="pattern-score" />
        <Stat label="Accuracy" value={`${accuracy}%`} testid="pattern-accuracy" />
      </div>

      <Button
        data-testid="pattern-reset"
        variant="ghost"
        className="mt-4 rounded-full text-slate-600"
        onClick={() => {
          setLevel(1);
          setCorrect(0);
          setAttempts(0);
          next(1);
        }}
      >
        Reset session
      </Button>
    </div>
  );
}
