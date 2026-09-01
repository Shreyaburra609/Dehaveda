import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Lock, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const Loading = ({ label = "Loading…", testid = "loading-state" }) => (
  <div data-testid={testid} className="flex items-center gap-3 py-14 text-slate-400">
    <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
    <span className="text-sm">{label}</span>
  </div>
);

export const ErrorState = ({ message, onRetry, testid = "error-state" }) => (
  <div data-testid={testid} className="dv-surface rounded-2xl p-8 text-center">
    <AlertTriangle className="mx-auto mb-3 h-7 w-7 text-amber-400" />
    <p className="text-sm text-slate-300">{message}</p>
    {onRetry && (
      <Button data-testid="retry-button" onClick={onRetry} variant="secondary" className="mt-5 rounded-full">
        Try again
      </Button>
    )}
  </div>
);

export const EmptyState = ({ message, testid = "empty-state" }) => (
  <div data-testid={testid} className="dv-surface rounded-2xl p-10 text-center">
    <Inbox className="mx-auto mb-3 h-7 w-7 text-slate-500" />
    <p className="text-sm text-slate-400">{message}</p>
  </div>
);

export const PremiumLock = ({ title, testid = "premium-lock" }) => (
  <div
    data-testid={testid}
    className="dv-surface flex h-full flex-col justify-between rounded-2xl border-dashed p-6"
  >
    <div>
      <Lock className="mb-3 h-5 w-5 text-amber-400" />
      <p className="font-display text-xl text-slate-200">{title}</p>
      <p className="mt-2 text-xs text-slate-500">Included in Premium membership.</p>
    </div>
    <Link to="/membership" className="mt-5">
      <Button data-testid="unlock-premium-button" size="sm" className="w-full rounded-full bg-amber-500 text-slate-950 hover:bg-amber-400">
        Unlock Premium
      </Button>
    </Link>
  </div>
);

export function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(24px)",
        transition: `opacity .7s cubic-bezier(.22,1,.36,1) ${delay}ms, transform .7s cubic-bezier(.22,1,.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, subtitle, id }) {
  return (
    <div id={id} className="max-w-3xl">
      {eyebrow && (
        <p className="font-data mb-3 text-xs uppercase tracking-[0.28em] text-emerald-400">{eyebrow}</p>
      )}
      <h2 className="font-display text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl lg:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">{subtitle}</p>}
    </div>
  );
}
