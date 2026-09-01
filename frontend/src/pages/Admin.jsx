import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { Check, X, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ErrorState, Loading, SectionHeading } from "@/components/States";
import { Seo } from "@/components/Seo";

const COLORS = ["#10B981", "#38BDF8", "#A855F7", "#F59E0B", "#6366F1"];
const TABS = ["Overview", "Payments", "Users", "Plans", "Food Content", "Messages"];

export default function Admin() {
  const { user, checking } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Overview");
  const [stats, setStats] = useState(null);
  const [claims, setClaims] = useState([]);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [newFood, setNewFood] = useState({
    name: "", category: "Fruits", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0,
    micronutrients: "", note: "", premium: false, serving_size: "100 g",
  });

  useEffect(() => {
    if (!checking && (!user || user.role !== "admin")) navigate("/login");
  }, [checking, user, navigate]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [s, c, u, p, m] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/claims"),
        api.get("/admin/users"),
        api.get("/plans"),
        api.get("/admin/contact"),
      ]);
      setStats(s.data);
      setClaims(c.data.claims);
      setUsers(u.data.users);
      setPlans(p.data.plans);
      setMessages(m.data.messages);
    } catch (err) {
      setError(apiError(err, "Admin data could not be loaded."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const review = async (id, action) => {
    try {
      await api.post(`/admin/claims/${id}/${action}`);
      toast.success(`Payment ${action === "verify" ? "verified — premium activated" : "rejected"}`);
      load();
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  const savePlan = async (code, price) => {
    try {
      await api.put(`/admin/plans/${code}`, { price: Number(price) });
      toast.success("Plan price updated");
      load();
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  const addFood = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/foods", {
        ...newFood,
        calories: Number(newFood.calories),
        protein_g: Number(newFood.protein_g),
        carbs_g: Number(newFood.carbs_g),
        fat_g: Number(newFood.fat_g),
        fiber_g: Number(newFood.fiber_g),
      });
      toast.success(`${newFood.name} added to the food database`);
      setNewFood({ ...newFood, name: "", micronutrients: "", note: "" });
      load();
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  if (checking || !user || user.role !== "admin") {
    return <div className="mx-auto max-w-7xl px-4 py-20"><Loading label="Checking access…" /></div>;
  }

  return (
    <>
      <Seo title="Admin Dashboard" description="Administration for Deha Veda Ecosystem." path="/admin" />
      <section className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Administration" title="Admin dashboard" />
          <Button data-testid="admin-refresh" size="sm" variant="secondary" className="rounded-full" onClick={load}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              data-testid={`admin-tab-${t.toLowerCase().replace(/\W+/g, "-")}`}
              onClick={() => setTab(t)}
              className={`rounded-full border px-4 py-2 text-xs transition-colors ${
                tab === t ? "border-sky-500/60 bg-sky-500/12 text-sky-300" : "border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading && <Loading label="Loading admin data…" />}
        {!loading && error && <div className="mt-8"><ErrorState message={error} onRetry={load} /></div>}

        {!loading && !error && stats && (
          <div className="mt-10">
            {tab === "Overview" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label="Total users" value={stats.total_users} testid="admin-total-users" />
                  <Metric label="Active subscribers" value={stats.active_subscribers} testid="admin-active-subs" />
                  <Metric label="Expired subscriptions" value={stats.expired_subscriptions} testid="admin-expired-subs" />
                  <Metric label="New in 7 days" value={stats.new_registrations_7d} testid="admin-new-7d" />
                  <Metric label="Revenue (verified)" value={`₹${stats.revenue}`} testid="admin-revenue" />
                  <Metric label="Pending payments" value={stats.pending_claims} testid="admin-pending" />
                  <Metric label="AI messages" value={stats.ai_messages} testid="admin-ai-messages" />
                  <Metric label="Contact messages" value={stats.contact_messages} testid="admin-contact-count" />
                </div>

                <div className="mt-8 grid gap-5 lg:grid-cols-2">
                  <Panel title="Registrations, last 7 days" testid="chart-registrations">
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={stats.registrations_7d}>
                        <CartesianGrid stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12 }} />
                        <Line type="monotone" dataKey="users" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Panel>

                  <Panel title="Game activity" testid="chart-games">
                    {stats.game_activity.length === 0 ? (
                      <p className="py-16 text-center text-sm text-slate-500">No games played yet.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={stats.game_activity}>
                          <CartesianGrid stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="game" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12 }} />
                          <Bar dataKey="plays" radius={[6, 6, 0, 0]}>
                            {stats.game_activity.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Panel>

                  <Panel title="Member breakdown" testid="chart-members">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Premium", value: stats.active_subscribers },
                            { name: "Free", value: Math.max(0, stats.total_users - stats.active_subscribers) },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                        >
                          <Cell fill="#F59E0B" />
                          <Cell fill="#10B981" />
                        </Pie>
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Panel>

                  <Panel title="Popular pages" testid="popular-pages">
                    {stats.popular_pages.length === 0 ? (
                      <p className="py-16 text-center text-sm text-slate-500">No page views recorded yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {stats.popular_pages.map((p) => (
                          <li key={p.path} className="flex justify-between text-xs text-slate-400">
                            <span className="font-data">{p.path}</span>
                            <span>{p.views}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>
                </div>
              </>
            )}

            {tab === "Payments" && (
              <Panel title="Manual payment verification" testid="admin-payments">
                {claims.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">No payment submissions yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-slate-500">
                        <tr>
                          {["User", "Plan", "Amount", "Reference", "Status", "Action"].map((h) => (
                            <th key={h} className="pb-3 pr-4 font-medium uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-slate-300">
                        {claims.map((c) => (
                          <tr key={c.id} data-testid={`claim-row-${c.id}`} className="border-t border-slate-800">
                            <td className="py-3 pr-4">{c.user_email}</td>
                            <td className="py-3 pr-4">{c.plan_name}</td>
                            <td className="py-3 pr-4">₹{c.amount}</td>
                            <td className="font-data py-3 pr-4">{c.reference}</td>
                            <td className="py-3 pr-4">
                              <span
                                className={
                                  c.status === "verified" ? "text-emerald-300" : c.status === "rejected" ? "text-red-300" : "text-amber-300"
                                }
                              >
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3">
                              {c.status === "pending" && (
                                <div className="flex gap-2">
                                  <Button data-testid={`verify-${c.id}`} size="sm" className="h-7 rounded-full bg-emerald-500 px-3 text-slate-950" onClick={() => review(c.id, "verify")}>
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button data-testid={`reject-${c.id}`} size="sm" variant="secondary" className="h-7 rounded-full px-3" onClick={() => review(c.id, "reject")}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            )}

            {tab === "Users" && (
              <Panel title={`Users (${users.length})`} testid="admin-users">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-500">
                      <tr>
                        {["Name", "Email", "Role", "Premium", "Joined"].map((h) => (
                          <th key={h} className="pb-3 pr-4 font-medium uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {users.map((u) => (
                        <tr key={u.id} className="border-t border-slate-800">
                          <td className="py-3 pr-4">{u.name}</td>
                          <td className="py-3 pr-4">{u.email}</td>
                          <td className="py-3 pr-4">{u.role}</td>
                          <td className="py-3 pr-4">{u.premium ? "Yes" : "No"}</td>
                          <td className="py-3">{new Date(u.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}

            {tab === "Plans" && (
              <div className="grid gap-5 lg:grid-cols-2">
                {plans.map((p) => (
                  <Panel key={p.code} title={p.name} testid={`admin-plan-${p.code}`}>
                    <p className="text-xs text-slate-500">Code: {p.code} · {p.duration_days} days</p>
                    <div className="mt-4 flex items-end gap-3">
                      <label className="flex-1 text-xs text-slate-400">
                        Price (₹)
                        <Input
                          data-testid={`plan-price-input-${p.code}`}
                          type="number"
                          defaultValue={p.price}
                          onChange={(e) => {
                            p.newPrice = e.target.value;
                          }}
                          className="mt-2 bg-slate-900/60"
                        />
                      </label>
                      <Button
                        data-testid={`plan-save-${p.code}`}
                        className="rounded-full bg-emerald-500 text-slate-950"
                        onClick={() => savePlan(p.code, p.newPrice ?? p.price)}
                      >
                        Save
                      </Button>
                    </div>
                    <ul className="mt-5 space-y-1.5">
                      {p.features.map((f) => (
                        <li key={f} className="text-xs text-slate-400">• {f}</li>
                      ))}
                    </ul>
                  </Panel>
                ))}
              </div>
            )}

            {tab === "Food Content" && (
              <Panel title="Add a food entry" testid="admin-food-form">
                <form onSubmit={addFood} className="grid gap-4 sm:grid-cols-3">
                  {[
                    ["name", "Name", "text"],
                    ["category", "Category", "text"],
                    ["serving_size", "Serving size", "text"],
                    ["calories", "Calories", "number"],
                    ["protein_g", "Protein (g)", "number"],
                    ["carbs_g", "Carbs (g)", "number"],
                    ["fat_g", "Fat (g)", "number"],
                    ["fiber_g", "Fibre (g)", "number"],
                    ["micronutrients", "Micronutrients", "text"],
                  ].map(([key, label, type]) => (
                    <label key={key} className="text-xs text-slate-400">
                      {label}
                      <Input
                        data-testid={`food-input-${key}`}
                        type={type}
                        step="any"
                        value={newFood[key]}
                        onChange={(e) => setNewFood((f) => ({ ...f, [key]: e.target.value }))}
                        required={key === "name" || key === "category"}
                        className="mt-2 bg-slate-900/60"
                      />
                    </label>
                  ))}
                  <label className="text-xs text-slate-400 sm:col-span-2">
                    Note
                    <Input
                      data-testid="food-input-note"
                      value={newFood.note}
                      onChange={(e) => setNewFood((f) => ({ ...f, note: e.target.value }))}
                      className="mt-2 bg-slate-900/60"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input
                      data-testid="food-input-premium"
                      type="checkbox"
                      checked={newFood.premium}
                      onChange={(e) => setNewFood((f) => ({ ...f, premium: e.target.checked }))}
                    />
                    Premium only
                  </label>
                  <Button data-testid="food-add-submit" type="submit" className="rounded-full bg-emerald-500 text-slate-950 sm:col-span-3">
                    <Plus className="mr-1.5 h-4 w-4" /> Add food
                  </Button>
                </form>
              </Panel>
            )}

            {tab === "Messages" && (
              <Panel title={`Contact messages (${messages.length})`} testid="admin-messages">
                {messages.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">No messages yet.</p>
                ) : (
                  <ul className="space-y-4">
                    {messages.map((m) => (
                      <li key={m.id} className="rounded-xl border border-slate-800 p-4">
                        <p className="text-sm font-semibold text-slate-100">{m.subject}</p>
                        <p className="font-data mt-1 text-[10px] text-slate-500">
                          {m.name} · {m.email} · {new Date(m.created_at).toLocaleString()}
                        </p>
                        <p className="mt-3 text-sm text-slate-400">{m.message}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            )}
          </div>
        )}
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

function Panel({ title, children, testid }) {
  return (
    <div data-testid={testid} className="dv-surface rounded-3xl p-6">
      <p className="font-data mb-5 text-[10px] uppercase tracking-[0.2em] text-slate-500">{title}</p>
      {children}
    </div>
  );
}
