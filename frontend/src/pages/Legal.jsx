import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/States";
import { Seo } from "@/components/Seo";

const DOCS = {
  privacy: {
    title: "Privacy Policy",
    path: "/privacy",
    body: [
      ["What we collect", "When you create an account we store your name, email address and a bcrypt hash of your password. We never store your password in readable form. If you play games while logged in we store your scores. If you use the AI assistant we store the messages of that conversation so the assistant can follow context."],
      ["Payments", "We do not collect or store card, UPI PIN or bank credentials. For manual QR payments we store only the transaction reference you type in, so an administrator can verify it."],
      ["Cookies", "We set an httpOnly session cookie for authentication. We do not use advertising cookies."],
      ["Sharing", "We do not sell personal data. Messages you send to the AI assistant are processed by our AI provider in order to generate a reply."],
      ["Your choices", "You may request deletion of your account and associated data by writing to us through the contact page."],
    ],
  },
  terms: {
    title: "Terms of Use",
    path: "/terms",
    body: [
      ["Educational purpose only", "All content on Deha Veda Ecosystem is educational. It is not medical, dietary, psychological or laboratory advice, and it must not be used to diagnose or treat any condition. Always consult a qualified professional for personal health decisions."],
      ["Accuracy", "We reference WHO, BIS IS 10500:2012, USDA FoodData Central and comparable sources, and we correct errors when they are reported. Values are approximations that vary with serving size, variety, region and preparation."],
      ["Accounts", "You are responsible for keeping your login credentials safe and for the activity on your account. We may suspend accounts used for abuse, scraping or attempts to break platform security."],
      ["Games", "All games on this platform are original works created for this site. Scores are for personal interest and have no clinical meaning."],
      ["Changes", "We may update these terms as the platform grows. Continued use after an update means you accept the revised terms."],
    ],
  },
  subscription: {
    title: "Subscription Policy",
    path: "/subscription-policy",
    body: [
      ["Plans", "Free membership is permanent and requires no payment. Premium is sold as a one-month plan. Plan names, prices, durations and feature lists are stored in the database and can be changed by an administrator, so the current values on the membership page always take precedence."],
      ["Activation", "For manual QR payments, premium is activated only after an administrator verifies your transaction reference. Submitting a reference or clicking a button does not by itself grant premium access."],
      ["Duration and expiry", "Premium runs for the plan duration from the moment of verification. If you renew before expiry, the remaining days are added to the new period. When premium expires your account reverts to free membership and your data is retained."],
      ["Cancellation", "Manual QR subscriptions do not auto-renew, so there is nothing to cancel; access simply ends at expiry. If online recurring checkout is enabled, cancellation is handled through the payment provider and access continues until the paid period ends."],
      ["Refunds", "Because premium unlocks digital content immediately on activation, refunds are considered case by case. Write to us through the contact page with your transaction reference."],
    ],
  },
  notfound: {
    title: "Page not found",
    path: "/",
    body: [["We could not find that page", "The link may be out of date. Use the navigation above, or return to the homepage to explore the five pillars."]],
  },
};

export default function Legal({ doc }) {
  const d = DOCS[doc] || DOCS.notfound;
  return (
    <>
      <Seo title={d.title} description={`${d.title} for Deha Veda Ecosystem.`} path={d.path} />
      <section className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
        <SectionHeading eyebrow="Legal" title={d.title} />
        <div className="mt-10 space-y-8">
          {d.body.map(([heading, text]) => (
            <div key={heading}>
              <h2 className="font-display text-xl font-semibold text-slate-100">{heading}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{text}</p>
            </div>
          ))}
        </div>
        {doc === "notfound" && (
          <Link to="/">
            <Button data-testid="notfound-home-button" className="mt-10 rounded-full bg-emerald-500 text-slate-950">
              Back to homepage
            </Button>
          </Link>
        )}
      </section>
    </>
  );
}
