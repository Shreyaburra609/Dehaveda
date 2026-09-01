import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, apiError } from "@/lib/api";
import { SectionHeading } from "@/components/States";
import { Seo } from "@/components/Seo";

const EMPTY = { name: "", email: "", subject: "", message: "" };

export default function Contact() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Please enter your name (at least 2 characters).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Please enter a valid email address.";
    if (form.subject.trim().length < 3) e.subject = "Please enter a subject.";
    if (form.message.trim().length < 10) e.message = "Please write at least 10 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setStatus(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const { data } = await api.post("/contact", form);
      setStatus({ ok: true, message: data.message });
      setForm(EMPTY);
    } catch (err) {
      setStatus({ ok: false, message: apiError(err, "Your message could not be sent. Please try again.") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Seo title="Contact" description="Send a message to the Deha Veda Ecosystem team." path="/contact" />

      <section className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
        <SectionHeading eyebrow="Contact" title="Get in touch" subtitle="Questions, corrections or partnership ideas — we read everything." />

        <form onSubmit={submit} noValidate data-testid="contact-form" className="dv-surface mt-10 rounded-3xl p-8">
          <Mail className="mb-6 h-5 w-5 text-emerald-600" />
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-xs text-slate-600">
              Name
              <Input data-testid="contact-name" value={form.name} onChange={set("name")} className="mt-2 bg-white" />
              {errors.name && <span data-testid="contact-name-error" className="mt-1.5 block text-[11px] text-red-600">{errors.name}</span>}
            </label>
            <label className="text-xs text-slate-600">
              Email
              <Input data-testid="contact-email" value={form.email} onChange={set("email")} className="mt-2 bg-white" />
              {errors.email && <span data-testid="contact-email-error" className="mt-1.5 block text-[11px] text-red-600">{errors.email}</span>}
            </label>
            <label className="text-xs text-slate-600 sm:col-span-2">
              Subject
              <Input data-testid="contact-subject" value={form.subject} onChange={set("subject")} className="mt-2 bg-white" />
              {errors.subject && <span data-testid="contact-subject-error" className="mt-1.5 block text-[11px] text-red-600">{errors.subject}</span>}
            </label>
            <label className="text-xs text-slate-600 sm:col-span-2">
              Message
              <Textarea data-testid="contact-message" rows={6} value={form.message} onChange={set("message")} className="mt-2 bg-white" />
              {errors.message && <span data-testid="contact-message-error" className="mt-1.5 block text-[11px] text-red-600">{errors.message}</span>}
            </label>
          </div>

          {status && (
            <p
              data-testid={status.ok ? "contact-success" : "contact-error"}
              className={`mt-6 rounded-xl px-4 py-3 text-xs ${
                status.ok ? "bg-emerald-600/10 text-emerald-700" : "bg-red-500/10 text-red-600"
              }`}
            >
              {status.message}
            </p>
          )}

          <Button data-testid="contact-submit" type="submit" disabled={busy} className="mt-7 rounded-full bg-emerald-600 px-7 text-white hover:bg-emerald-700">
            <Send className="mr-2 h-4 w-4" /> {busy ? "Sending…" : "Send message"}
          </Button>
        </form>
      </section>
    </>
  );
}
