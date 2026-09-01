import re, pathlib

M = {
    # surfaces
    "bg-[#090d16]/92": "bg-white/90",
    "bg-[#090d16]": "bg-white",
    "bg-[#0b1120]": "bg-white",
    "bg-[#0b1020]": "bg-[#F6F5F1]",
    "bg-[#0f1626]": "bg-white",
    "bg-[#070a12]": "bg-[#F1F0EB]",
    "bg-[#0d1424]": "bg-[#F6F5F1]",
    "from-[#0d1424]": "from-slate-100",
    "to-[#070a12]": "to-white",
    "from-[#0f1626]": "from-white",
    "via-[#0f1626]/35": "via-white/45",
    "bg-red-900/70": "bg-red-100",
    # text ramp
    "text-slate-50": "text-slate-900",
    "text-slate-100": "text-slate-900",
    "text-slate-200": "text-slate-800",
    "text-slate-300": "text-slate-700",
    "text-slate-400": "text-slate-600",
    "text-slate-600": "text-slate-400",
    "text-slate-700": "text-slate-300",
    "text-slate-950": "text-white",
    # borders
    "border-slate-800/80": "border-slate-200",
    "border-slate-800/70": "border-slate-200",
    "border-slate-800": "border-slate-200",
    "border-slate-700": "border-slate-300",
    "border-slate-600": "border-slate-300",
    # muted fills
    "bg-slate-900/85": "bg-white/95",
    "bg-slate-900/80": "bg-white/95",
    "bg-slate-900/70": "bg-white",
    "bg-slate-900/60": "bg-white",
    "bg-slate-900": "bg-slate-100",
    "bg-slate-800/70": "bg-slate-200/70",
    "bg-slate-800/60": "bg-slate-100",
    "bg-slate-800": "bg-slate-200",
    # accents
    "text-emerald-400": "text-emerald-600",
    "text-emerald-300": "text-emerald-700",
    "text-emerald-200/85": "text-emerald-800",
    "text-emerald-50": "text-emerald-900",
    "text-sky-400": "text-sky-600",
    "text-sky-300/90": "text-sky-700",
    "text-sky-300": "text-sky-700",
    "text-sky-200/85": "text-sky-800",
    "text-sky-100/85": "text-sky-800",
    "text-purple-400": "text-purple-600",
    "text-purple-300": "text-purple-700",
    "text-purple-200": "text-purple-700",
    "text-amber-400": "text-amber-600",
    "text-amber-300/85": "text-amber-700",
    "text-amber-300/80": "text-amber-700",
    "text-amber-300": "text-amber-700",
    "text-amber-200/85": "text-amber-800",
    "text-amber-200": "text-amber-800",
    "text-amber-100/80": "text-amber-800",
    "text-indigo-300": "text-indigo-600",
    "text-red-400": "text-red-600",
    "text-red-300": "text-red-600",
    "text-red-200": "text-red-700",
    "from-emerald-400": "from-emerald-600",
    "via-sky-400": "via-sky-600",
    "to-purple-400": "to-purple-600",
    "text-purple-100": "text-purple-800",
    # solid buttons
    "bg-emerald-500": "bg-emerald-600",
    "hover:bg-emerald-400": "hover:bg-emerald-700",
    "bg-amber-500": "bg-amber-600",
    "hover:bg-amber-400": "hover:bg-amber-700",
    "bg-purple-500": "bg-purple-600",
    "hover:bg-purple-400": "hover:bg-purple-700",
    "bg-indigo-500": "bg-indigo-600",
    "hover:bg-indigo-400": "hover:bg-indigo-700",
    "bg-sky-500": "bg-sky-600",
    "bg-emerald-400": "bg-emerald-500",
}

keys = sorted(M, key=len, reverse=True)
pattern = re.compile("|".join(re.escape(k) for k in keys) + r"(?![-/\w])")

root = pathlib.Path("/app/frontend/src")
changed = 0
for p in list(root.rglob("*.js")) + list(root.rglob("*.jsx")):
    if "/components/ui/" in str(p):
        continue
    text = p.read_text()
    new = pattern.sub(lambda m: M[m.group(0)], text)
    if new != text:
        p.write_text(new)
        changed += 1
print("files updated:", changed)
