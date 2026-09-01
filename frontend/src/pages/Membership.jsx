import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, QrCode, ShieldCheck, Info, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ErrorState, Loading, SectionHeading } from "@/components/States";
import { Seo } from "@/components/Seo";

export default function Membership() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [upi, setUpi] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/plans");
      setPlans(data.plans);
      setUpi(data.upi_id);
      if (user) {
        const s = await api.get("/membership/status");
        setStatus(s.data);
      }
    } catch (err) {
      setError(apiError(err, "Membership plans could not be loaded. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const premiumPlan = plans.find((p) => p.code !== "free");
  const pending = status?.claims?.find((c) => c.status === "pending");

  const submitClaim = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/membership/claim", {
        plan_code: premiumPlan.code,
        method: "qr_upi",
        reference,
        note,
      });
      toast.success(data.message);
      setReference("");
      setNote("");
      await load();
      await refresh();
    } catch (err) {
      toast.error(apiError(err, "Could not submit your payment reference."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Seo title="Membership" description="Free membership and a configurable one-month premium plan. Pay by scanning the QR code; premium activates after manual verification." path="/membership" />

      <header className="dv-aurora border-b border-slate-800/70">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-20">
          <p className="font-data mb-4 text-[11px] uppercase tracking-[0.3em] text-amber-400">Membership</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
            Free to explore, premium for depth
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Plan names, prices and features are stored in the database, so they can be changed from the admin
            dashboard without touching the code.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        {loading && <Loading label="Loading plans…" />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && (
          <>
            {user && (
              <div data-testid="membership-status" className="dv-surface mb-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6">
                <div>
                  <p className="font-data text-[10px] uppercase tracking-[0.2em] text-slate-500">Your status</p>
                  <p className="font-display mt-2 text-2xl text-slate-50">
                    {user.premium ? "Premium active" : "Free membership"}
                  </p>
                  {user.premium_until && (
                    <p className="font-data mt-1 text-xs text-emerald-300">
                      Valid until {new Date(user.premium_until).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {pending && (
                  <p data-testid="pending-claim-notice" className="max-w-sm rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-xs text-amber-200">
                    Payment reference <span className="font-data">{pending.reference}</span> is awaiting admin
                    verification. Premium activates once it is approved.
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {plans.map((plan) => (
                <div
                  key={plan.code}
                  data-testid={`plan-card-${plan.code}`}
                  className={`rounded-3xl border p-8 ${
                    plan.code === "free" ? "border-slate-800 bg-[#0f1626]" : "border-amber-500/35 bg-amber-500/5"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-slate-50">{plan.name}</h2>
                      <p className="mt-1 text-xs text-slate-400">{plan.tagline}</p>
                    </div>
                    {plan.code !== "free" && <Crown className="h-5 w-5 text-amber-400" />}
                  </div>
                  <p className="font-display mt-6 text-4xl font-bold text-emerald-300" data-testid={`plan-price-${plan.code}`}>
                    {plan.price === 0 ? "Free" : `₹${plan.price}`}
                    {plan.duration_days ? (
                      <span className="font-data ml-2 text-xs text-slate-500">/ {plan.duration_days} days</span>
                    ) : null}
                  </p>
                  <ul className="mt-7 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2.5 text-sm text-slate-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {plan.code === "free" ? (
                    !user && (
                      <Link to="/register">
                        <Button data-testid="plan-free-cta" className="mt-8 w-full rounded-full" variant="secondary">
                          Create free account
                        </Button>
                      </Link>
                    )
                  ) : (
                    <a href="#qr">
                      <Button data-testid="plan-premium-cta" className="mt-8 w-full rounded-full bg-amber-500 text-slate-950 hover:bg-amber-400">
                        Subscribe — scan to pay
                      </Button>
                    </a>
                  )}
                </div>
              ))}
            </div>

            {/* QR payment */}
            <div id="qr" className="mt-16">
              <SectionHeading eyebrow="Scan to Subscribe" title="Pay using your preferred payment app" />
              <div className="mt-10 grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <div className="dv-surface rounded-3xl p-8 text-center">
                    <img
                      data-testid="payment-qr-image"
                      src="/payment-qr.png"
                      alt="Payment QR code for Deha Veda Ecosystem premium membership"
                      className="mx-auto h-64 w-64 rounded-2xl bg-white object-contain p-3"
                    />
                    <p className="mt-6 text-sm font-semibold text-slate-100">
                      Scan the QR code using your preferred payment app.
                    </p>
                    {upi && <p className="font-data mt-2 text-xs text-slate-500">UPI ID: {upi}</p>}
                    {premiumPlan && (
                      <p className="font-data mt-1 text-xs text-emerald-300">
                        Amount: ₹{premiumPlan.price} for {premiumPlan.duration_days} days
                      </p>
                    )}
                    <p className="mt-5 flex gap-2 text-left text-[11px] leading-relaxed text-amber-300/85">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        This image is a placeholder. Replace the file
                        <span className="font-data block break-all text-amber-200">frontend/public/payment-qr.png</span>
                        with your real QR code, and set PAYMENT_UPI_ID in the backend environment.
                      </span>
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <form onSubmit={submitClaim} data-testid="claim-form" className="dv-surface rounded-3xl p-8">
                    <QrCode className="mb-5 h-5 w-5 text-amber-400" />
                    <h3 className="font-display text-xl font-semibold text-slate-50">
                      After paying, submit your reference
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400">
                      Enter the transaction or UTR number from your payment app. An administrator verifies it before
                      premium is activated — clicking a button alone never grants premium access.
                    </p>
                    <label className="mt-6 block text-xs text-slate-400">
                      Transaction / UTR reference
                      <Input
                        data-testid="claim-reference-input"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="e.g. 402312345678"
                        required
                        minLength={4}
                        className="mt-2 bg-slate-900/60"
                      />
                    </label>
                    <label className="mt-4 block text-xs text-slate-400">
                      Note (optional)
                      <Input
                        data-testid="claim-note-input"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Payment app used, time of payment…"
                        className="mt-2 bg-slate-900/60"
                      />
                    </label>
                    <Button
                      data-testid="claim-submit-button"
                      type="submit"
                      disabled={busy || !!pending}
                      className="mt-6 w-full rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    >
                      {!user ? "Log in to submit" : pending ? "Awaiting verification" : busy ? "Submitting…" : "Submit for verification"}
                    </Button>
                    <p className="mt-5 flex gap-2 text-[11px] leading-relaxed text-slate-500">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      We never store card details. Online checkout with a payment provider such as Stripe or Razorpay
                      can be enabled by adding the provider keys to the backend environment.
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
