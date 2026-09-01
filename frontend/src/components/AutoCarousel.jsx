import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

export function AutoCarousel({ slides, interval = 5000, testid = "carousel", heightClass = "h-[300px] sm:h-[420px]" }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const go = useCallback(
    (dir) => setIndex((i) => (i + dir + slides.length) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    if (!playing || slides.length < 2) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return undefined;
    const id = setInterval(() => go(1), interval);
    return () => clearInterval(id);
  }, [playing, interval, go, slides.length]);

  if (!slides?.length) return null;

  return (
    <div data-testid={testid} className="relative overflow-hidden rounded-3xl border border-slate-800">
      <div className={`relative w-full ${heightClass} bg-slate-900`}>
        {slides.map((s, i) => (
          <img
            key={s.url}
            src={s.url}
            alt={s.alt || s.caption}
            loading={i === 0 ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms]"
            style={{ opacity: i === index ? 1 : 0 }}
          />
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#060910] via-[#060910]/20 to-transparent" />
        <p
          data-testid={`${testid}-caption`}
          className="absolute bottom-16 left-5 right-5 font-display text-lg font-semibold text-slate-50 sm:bottom-20 sm:text-2xl"
        >
          {slides[index].caption}
        </p>
      </div>

      <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
        <div className="flex gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.url}
              aria-label={`Show slide ${i + 1}`}
              data-testid={`${testid}-dot-${i}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-7 bg-emerald-400" : "w-2.5 bg-slate-600 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            aria-label={playing ? "Pause carousel" : "Play carousel"}
            data-testid={`${testid}-playpause`}
            onClick={() => setPlaying((p) => !p)}
            className="rounded-full border border-slate-700 bg-slate-900/80 p-2 text-slate-300 hover:text-emerald-300"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            aria-label="Previous slide"
            data-testid={`${testid}-prev`}
            onClick={() => go(-1)}
            className="rounded-full border border-slate-700 bg-slate-900/80 p-2 text-slate-300 hover:text-emerald-300"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label="Next slide"
            data-testid={`${testid}-next`}
            onClick={() => go(1)}
            className="rounded-full border border-slate-700 bg-slate-900/80 p-2 text-slate-300 hover:text-emerald-300"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
