import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stat } from "@/games/ReactionTime";
import { useScoreRecorder } from "@/games/useScoreRecorder";

const randomDigits = (n) =>
  Array.from({ length: n }, (_, i) => (i === 0 ? 1 + Math.floor(Math.random() * 9) : Math.floor(Math.random() * 10))).join("");

export default function NumberMemory() {
  const [digits, setDigits] = useState(3);
  const [number, setNumber] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | show | input | correct | over
  const [guess, setGuess] = useState("");
  const [best, setBest] = useState(() => Number(localStorage.getItem("dv_best_number") || 0));
  const timer = useRef(null);
  const record = useScoreRecorder("number");

  useEffect(() => () => clearTimeout(timer.current), []);

  const startRound = (len) => {
    const n = randomDigits(len);
    setNumber(n);
    setGuess("");
    setPhase("show");
    timer.current = setTimeout(() => setPhase("input"), 1200 + len * 450);
  };

  const submit = (e) => {
    e.preventDefault();
    if (guess.trim() === number) {
      const nextLen = digits + 1;
      setPhase("correct");
      if (digits > best) {
        setBest(digits);
        localStorage.setItem("dv_best_number", String(digits));
      }
      record(digits * 10, digits);
      setDigits(nextLen);
      setTimeout(() => startRound(nextLen), 900);
    } else {
      setPhase("over");
      record(Math.max(0, (digits - 1) * 10), Math.max(1, digits - 1));
    }
  };

  return (
    <div data-testid="game-number">
      <div className="dv-surface flex h-52 items-center justify-center rounded-3xl">
        {phase === "idle" && <p className="text-sm text-slate-600">Press start. A number will appear briefly.</p>}
        {phase === "show" && (
          <p data-testid="number-display" className="font-data text-4xl tracking-[0.2em] text-emerald-700 sm:text-5xl">
            {number}
          </p>
        )}
        {phase === "input" && (
          <form onSubmit={submit} className="w-full max-w-xs px-6 text-center">
            <p className="mb-3 text-xs text-slate-500">Enter the number you saw</p>
            <Input
              data-testid="number-input"
              autoFocus
              inputMode="numeric"
              value={guess}
              onChange={(e) => setGuess(e.target.value.replace(/\D/g, ""))}
              className="font-data text-center text-lg tracking-[0.2em]"
            />
            <Button data-testid="number-submit" type="submit" className="mt-4 w-full rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
              Submit
            </Button>
          </form>
        )}
        {phase === "correct" && <p data-testid="number-correct" className="font-display text-2xl text-emerald-700">Correct! Adding a digit…</p>}
        {phase === "over" && (
          <div className="text-center">
            <p data-testid="number-over" className="font-display text-2xl text-red-600">Not quite.</p>
            <p className="font-data mt-2 text-sm text-slate-600">It was {number}</p>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Digits" value={digits} testid="number-digits" />
        <Stat label="Score" value={digits * 10} testid="number-score" />
        <Stat label="Best digits" value={best} testid="number-best" />
      </div>

      <Button
        data-testid="number-start"
        onClick={() => {
          setDigits(3);
          startRound(3);
        }}
        className="mt-4 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {phase === "idle" ? "Start" : "Restart"}
      </Button>
    </div>
  );
}
