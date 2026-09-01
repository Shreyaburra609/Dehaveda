import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Crown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loading, SectionHeading } from "@/components/States";
import { Seo } from "@/components/Seo";

export default function Profile() {
  const { user, checking, logout } = useAuth();
  const navigate = useNavigate();
  const [dash, setDash] = useState(null);
  const [claims, setClaims] = useState([]);

  useEffect(() => {
    if (!checking && !user) navigate("/login");
  }, [checking, user, navigate]);

  useEffect(() => {
    if (!user) return;
    api.get("/games/dashboard").then(({ data }) => setDash(data)).catch(() => setDash(null));
    api.get("/membership/status").then(({ data }) => setClaims(data.claims)).catch(() => {});
  }, [user]);

  if (checking || !user) return <div className="mx-auto max-w-7xl px-4 py-20"><Loading /></div>;

  return (
    <>
      <Seo title="My Profile" description="Your Deha Veda membership status, saved game statistics and payment history." path="/profile" />
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <SectionHeading eyebrow="My Account" title={user.name} subtitle={user.email} />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="dv-surface rounded-2xl p-6">
            <Crown className={`mb-4 h-5 w-5 ${user.premium ? "text-amber-400" : "text-slate-600"}`} />
            <p data-testid="profile-membership" className="font-display text-xl text-slate-50">
              {user.premium ? "Premium" : "Free"}
            </p>
            <p className="font-data mt-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">Membership</p>
            {user.premium_until && (
              <p className="font-data mt-2 text-xs text-emerald-300">
                Until {new Date(user.premium_until).toLocaleDateString()}
              </p>
            )}
          </div>
          <Metric label="Games played" value={dash?.games_played ?? "—"} testid="profile-games-played" />
          <Metric label="Total score" value={dash?.total_score ?? "—"} testid="profile-total-score" />
          <Metric
            label="Best reaction"
            value={dash?.personal_bests?.reaction ? `${Math.round(dash.personal_bests.reaction.score)} ms` : "—"}
            testid="profile-best-reaction"
          />
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="dv-surface rounded-2xl p-6">
            <p className="font-data mb-4 text-[10px] uppercase tracking-[0.2em] text-slate-500">Payment history</p>
            {claims.length === 0 ? (
              <p className="text-sm text-slate-500">No payment submissions yet.</p>
            ) : (
              <ul data-testid="profile-claims" className="space-y-2.5">
                {claims.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-xs">
                    <span className="font-data text-slate-400">{c.reference}</span>
                    <span className="text-slate-500">₹{c.amount}</span>
                    <span
                      className={
                        c.status === "verified" ? "text-emerald-300" : c.status === "rejected" ? "text-red-300" : "text-amber-300"
                      }
                    >
                      {c.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="dv-surface rounded-2xl p-6">
            <p className="font-data mb-4 text-[10px] uppercase tracking-[0.2em] text-slate-500">Quick links</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/membership"><Button size="sm" variant="secondary" className="rounded-full" data-testid="profile-membership-link">Membership</Button></Link>
              <Link to="/games"><Button size="sm" variant="secondary" className="rounded-full" data-testid="profile-games-link">Games</Button></Link>
              {user.role === "admin" && (
                <Link to="/admin"><Button size="sm" className="rounded-full bg-sky-500 text-slate-950" data-testid="profile-admin-link">Admin dashboard</Button></Link>
              )}
              <Button
                size="sm"
                variant="ghost"
                data-testid="profile-logout-button"
                className="rounded-full text-slate-400"
                onClick={async () => {
                  await logout();
                  navigate("/");
                }}
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" /> Log out
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, testid }) {
  return (
    <div className="dv-surface rounded-2xl p-6">
      <p data-testid={testid} className="font-display text-3xl font-bold text-slate-50">{value}</p>
      <p className="font-data mt-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
    </div>
  );
}
