import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import { Upload, FileText, AlertTriangle, Trash2, Stethoscope, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api, apiError, API, TOKEN_KEY } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ErrorState, Loading, SectionHeading, EmptyState } from "@/components/States";
import { Seo } from "@/components/Seo";

const STATUS_COLOR = { normal: "#059669", high: "#DC2626", low: "#D97706", unknown: "#94A3B8" };

export default function HealthReports() {
  const { user, checking } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!checking && !user) navigate("/login");
  }, [checking, user, navigate]);

  const load = async () => {
    setError("");
    try {
      const [p, r] = await Promise.all([api.get("/health/profile"), api.get("/health/reports")]);
      setProfile(p.data);
      setReports(r.data.reports);
      setSelected(r.data.reports[0] || null);
    } catch (err) {
      setError(apiError(err, "Your report dashboard could not be loaded. Please try again."));
    }
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`${API}/health/reports`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
        credentials: "include",
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Upload failed");
      toast.success("Report analysed");
      await load();
      setSelected(data.report);
    } catch (err) {
      toast.error(err.message || "The report could not be analysed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/health/reports/${id}`);
      toast.success("Report deleted");
      await load();
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  if (checking || !user) return <div className="mx-auto max-w-7xl px-4 py-20"><Loading /></div>;

  const pie = profile
    ? ["normal", "high", "low", "unknown"].map((k) => ({ name: k, value: profile.totals[k] })).filter((d) => d.value)
    : [];

  return (
    <>
      <Seo title="Health Report Analysis" description="Upload your own lab report and get a plain-language dashboard of what each value means." path="/health" />

      <header className="dv-aurora border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
          <p className="font-data mb-4 text-[11px] uppercase tracking-[0.3em] text-emerald-600">Health Reports</p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Understand your own reports
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Upload a lab report as a PDF or a clear photo. Each printed value is read back to you with its
            reference range and a one-line explanation of what the test measures.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="dv-surface rounded-3xl p-7">
          <div className="flex flex-wrap items-center gap-4">
            <input
              ref={fileRef}
              data-testid="health-file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
              onChange={(e) => upload(e.target.files?.[0])}
              className="hidden"
            />
            <Button
              data-testid="health-upload-button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Upload className="mr-2 h-4 w-4" />
              {busy ? "Analysing your report…" : "Upload a report"}
            </Button>
            <p className="text-xs text-slate-500">PDF, JPG, PNG, WEBP or TXT · up to 10 MB</p>
          </div>
          <p className="mt-5 flex gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-[11px] leading-relaxed text-amber-800">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span data-testid="health-disclaimer">
              {profile?.disclaimer ||
                "This is an automated reading of your own document for educational understanding only. It is not a diagnosis and not medical advice. Always discuss your results with a qualified clinician."}
            </span>
          </p>
        </div>

        {error && <div className="mt-8"><ErrorState message={error} onRetry={load} /></div>}
        {!profile && !error && <Loading label="Loading your dashboard…" />}

        {profile && profile.reports_count === 0 && (
          <div className="mt-8">
            <EmptyState message="No reports yet. Upload your first report to see the dashboard." testid="health-empty" />
          </div>
        )}

        {profile && profile.reports_count > 0 && (
          <>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Reports analysed" value={profile.reports_count} testid="health-reports-count" />
              <Metric label="Values read" value={profile.totals.total} testid="health-values-total" />
              <Metric label="Within range" value={profile.totals.normal} testid="health-values-normal" />
              <Metric
                label="Outside range"
                value={profile.totals.high + profile.totals.low}
                testid="health-values-flagged"
              />
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <Panel title="Profile summary" testid="health-summary">
                <p className="text-sm leading-relaxed text-slate-700">
                  {profile.latest_summary || "No narrative summary was printed in this report."}
                </p>
                {profile.lifestyle_notes?.length > 0 && (
                  <>
                    <p className="font-data mt-6 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      General lifestyle notes
                    </p>
                    <ul className="mt-3 space-y-2">
                      {profile.lifestyle_notes.map((n) => (
                        <li key={n} className="flex gap-2 text-xs text-slate-600">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-600" />
                          {n}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {profile.questions_for_doctor?.length > 0 && (
                  <>
                    <p className="font-data mt-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      <Stethoscope className="h-3.5 w-3.5" /> Questions to ask your doctor
                    </p>
                    <ul className="mt-3 space-y-2">
                      {profile.questions_for_doctor.map((q) => (
                        <li key={q} className="text-xs text-slate-600">• {q}</li>
                      ))}
                    </ul>
                  </>
                )}
              </Panel>

              <Panel title="Values by status" testid="health-chart-status">
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={pie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88} paddingAngle={3}>
                      {pie.map((d) => (
                        <Cell key={d.name} fill={STATUS_COLOR[d.name]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={profile.timeline}>
                    <CartesianGrid stroke="#eef2f6" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 }} />
                    <Bar dataKey="normal" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="flagged" stackId="a" fill="#DC2626" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>

            {profile.attention.length > 0 && (
              <div className="mt-8">
                <Panel title="Values outside the printed reference range" testid="health-attention">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {profile.attention.map((a, i) => (
                      <div key={`${a.name}-${i}`} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{a.name}</p>
                          <span
                            className="font-data rounded-full px-2 py-0.5 text-[10px] uppercase"
                            style={{ background: `${STATUS_COLOR[a.status]}18`, color: STATUS_COLOR[a.status] }}
                          >
                            {a.status}
                          </span>
                        </div>
                        <p className="font-data mt-2 text-lg text-slate-900">
                          {a.value} <span className="text-xs text-slate-500">{a.unit}</span>
                        </p>
                        <p className="font-data mt-1 text-[10px] text-slate-500">Range {a.reference_range || "—"}</p>
                        {a.plain_english && <p className="mt-2 text-xs leading-relaxed text-slate-600">{a.plain_english}</p>}
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            )}

            <div className="mt-8 grid gap-5 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <Panel title={`Your reports (${reports.length})`} testid="health-report-list">
                  <ul className="space-y-2">
                    {reports.map((r) => (
                      <li key={r.id} className="flex items-center gap-2">
                        <button
                          data-testid={`health-report-${r.id}`}
                          onClick={() => setSelected(r)}
                          className={`flex-1 rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
                            selected?.id === r.id
                              ? "border-emerald-500/50 bg-emerald-500/8 text-emerald-800"
                              : "border-slate-200 text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <span className="block font-semibold">{r.report_title}</span>
                          <span className="font-data text-[10px] text-slate-500">
                            {r.report_date || new Date(r.created_at).toLocaleDateString()} · {r.counts.total} values
                          </span>
                        </button>
                        <button
                          data-testid={`health-delete-${r.id}`}
                          onClick={() => remove(r.id)}
                          aria-label="Delete report"
                          className="rounded-lg p-2 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>

              <div className="lg:col-span-8">
                {selected && (
                  <Panel title={selected.report_title} testid="health-report-detail">
                    <p className="font-data text-[10px] text-slate-500">
                      {[selected.lab_name, selected.report_date, selected.patient_age, selected.patient_sex]
                        .filter(Boolean)
                        .join(" · ") || "No header details printed"}
                    </p>
                    {selected.key_findings?.length > 0 && (
                      <ul className="mt-4 space-y-2">
                        {selected.key_findings.map((k) => (
                          <li key={k} className="flex gap-2 text-xs text-slate-700">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                            {k}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-5 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-slate-500">
                          <tr>
                            {["Test", "Value", "Unit", "Reference", "Status"].map((h) => (
                              <th key={h} className="pb-3 pr-4 font-medium uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="text-slate-700">
                          {selected.tests.map((t, i) => (
                            <tr key={`${t.name}-${i}`} className="border-t border-slate-200">
                              <td className="py-2.5 pr-4">
                                {t.name}
                                {t.plain_english && (
                                  <span className="block text-[10px] text-slate-500">{t.plain_english}</span>
                                )}
                              </td>
                              <td className="font-data py-2.5 pr-4">{t.value}</td>
                              <td className="py-2.5 pr-4 text-slate-500">{t.unit}</td>
                              <td className="font-data py-2.5 pr-4 text-slate-500">{t.reference_range}</td>
                              <td className="py-2.5" style={{ color: STATUS_COLOR[t.status] || "#64748B" }}>
                                {t.status}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {selected.tests.length === 0 && (
                      <p className="mt-4 flex gap-2 text-xs text-slate-500">
                        <FileText className="h-3.5 w-3.5" /> No individual test values could be read from this file.
                      </p>
                    )}
                  </Panel>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function Metric({ label, value, testid }) {
  return (
    <div className="dv-surface rounded-2xl p-6">
      <p data-testid={testid} className="font-display text-3xl font-bold text-slate-900">{value}</p>
      <p className="font-data mt-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
    </div>
  );
}

function Panel({ title, children, testid }) {
  return (
    <div data-testid={testid} className="dv-surface h-full rounded-3xl p-6">
      <p className="font-data mb-5 text-[10px] uppercase tracking-[0.2em] text-slate-500">{title}</p>
      {children}
    </div>
  );
}
