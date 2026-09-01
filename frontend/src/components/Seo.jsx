import { useEffect } from "react";

export function Seo({ title, description, path = "/" }) {
  useEffect(() => {
    const fullTitle = `${title} | Deha Veda Ecosystem`;
    document.title = fullTitle;

    const set = (selector, attr, value) => {
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        const [key, val] = selector.replace(/[[\]']/g, "").split("=");
        el.setAttribute(key.replace("meta", "").trim() || "name", val);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    set('meta[name="description"]', "content", description);
    set('meta[property="og:title"]', "content", fullTitle);
    set('meta[property="og:description"]', "content", description);
    set('meta[property="og:url"]', "content", `${window.location.origin}${path}`);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}${path}`);
  }, [title, description, path]);

  return null;
}
