# -*- coding: utf-8 -*-
import html, re, os, urllib.parse
from data1 import DOCS
from data2 import DOCS2
from data3 import DOCS3

_all = {d["slug"]: d for d in DOCS + DOCS2 + DOCS3}
ORDER = ["takanon-limudim","takanon-schar-limud","takanon-mishmaat","hok-zchuyot-hastudent","takanon-sifria",
         "maabadot-mahshevim","takanon-hatrada-minit","takanon-sport","takanon-aguda","nohalei-bhirot"]
ALL = [_all[k] for k in ORDER]
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
os.makedirs(OUT, exist_ok=True)

DISCLAIMER = ("זהו תמצית לנוחות בלבד, שנכתבה על ידי נציג המסלול ואינה מסמך רשמי של האוניברסיטה. "
              "הנוסח המחייב הוא התקנון המקורי. לפני שמסתמכים על סעיף מסוים, יש לעיין בו בתקנון המקורי.")

CSS = r"""
:root{
  --paper:#F3F5FA; --surface:#FFFFFF; --ink:#172154; --text:#1F2747; --muted:#5A6386;
  --rule:#D5DAEA; --accent:#2B3FA8; --hl:#FFE45C; --warn-bg:#FFF6DB; --warn-ink:#6B4E00;
  color-scheme: light;
}
@media (prefers-color-scheme: dark){
  :root{
    --paper:#0D1230; --surface:#151C42; --ink:#E9ECF8; --text:#D9DDF0; --muted:#A1A8CA;
    --rule:#2A3366; --accent:#A9B8FF; --hl:rgba(255,212,64,.5); --warn-bg:#2B2610; --warn-ink:#F3DC8A;
    color-scheme: dark;
  }
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--text);
  font-family:"Assistant","Arial Hebrew","Segoe UI",Arial,sans-serif;font-size:1.0625rem;line-height:1.65}
.wrap{max-width:46rem;margin:0 auto;padding:2.5rem 1.25rem 4rem}
a{color:var(--accent)}
a:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:3px;border-radius:2px}
.back{display:inline-block;font-size:.95rem;margin-bottom:2rem;text-decoration:none}
.back:hover{text-decoration:underline}
h1,h2{font-family:"Frank Ruhl Libre","David","Times New Roman",serif;color:var(--ink);font-weight:700;margin:0}
h1{font-size:clamp(2.1rem,6vw,3.1rem);line-height:1.12;letter-spacing:-.01em}
.lead{font-size:1.2rem;color:var(--text);margin:1rem 0 .4rem;max-width:38rem}
.srcnote{font-size:.9rem;color:var(--muted);margin:0}
mark{background:linear-gradient(transparent 52%, var(--hl) 52%, var(--hl) 92%, transparent 92%);
  color:inherit;padding:0 .08em;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.notice{margin:1.75rem 0;padding:1rem 1.15rem;border:1px solid var(--rule);border-radius:10px;background:var(--surface);font-size:.97rem}
.notice p{margin:0 0 .5rem}
.notice p:last-child{margin:0}
.notice strong{color:var(--ink)}
.caveat{margin:1.25rem 0;padding:.9rem 1.15rem;border-radius:10px;background:var(--warn-bg);color:var(--warn-ink);font-size:.97rem}
.caveat strong{display:block;margin-bottom:.15rem}
.key{margin:2.25rem 0 2.5rem;padding:1.4rem 1.4rem 1.2rem;background:var(--surface);border-radius:14px;border-start-start-radius:4px;border-end-start-radius:4px;
  border-inline-start:6px solid var(--hl)}
.key h2{font-size:1.35rem;margin-bottom:.8rem}
.key ul{list-style:none;margin:0;padding:0}
.key li{padding:.55rem 0;border-top:1px solid var(--rule);display:grid;grid-template-columns:1fr auto;gap:.25rem 1rem}
.key li:first-child{border-top:0}
.key .t{font-size:1.08rem}
nav.toc{margin:0 0 2.5rem}
nav.toc ul{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:.45rem}
nav.toc a{display:inline-block;padding:.28rem .75rem;border:1px solid var(--rule);border-radius:999px;font-size:.92rem;
  text-decoration:none;color:var(--ink);background:var(--surface)}
nav.toc a:hover{border-color:var(--accent)}
section.s{margin:0 0 2.6rem;scroll-margin-top:1rem}
section.s h2{font-size:1.6rem;padding-bottom:.45rem;border-bottom:2px solid var(--ink);margin-bottom:.35rem}
ul.pts{list-style:none;margin:0;padding:0}
ul.pts li{display:grid;grid-template-columns:1fr minmax(6.5rem,11rem);gap:.2rem 1.25rem;padding:.75rem 0;border-bottom:1px solid var(--rule)}
.cite{font-size:.82rem;color:var(--muted);line-height:1.4;padding-top:.2rem;text-align:start}
.key .cite{max-width:11rem}
footer{margin-top:3rem;padding-top:1.25rem;border-top:1px solid var(--rule);font-size:.93rem;color:var(--muted)}
footer p{margin:0 0 .5rem}
@media (max-width:560px){
  .wrap{padding-top:1.5rem}
  ul.pts li,.key li{grid-template-columns:1fr}
  .cite{padding-top:0}
}
/* index */
.docs{list-style:none;padding:0;margin:2rem 0 0;border-top:2px solid var(--ink)}
.docs li{border-bottom:1px solid var(--rule)}
.docs a{display:block;padding:1.05rem 0;text-decoration:none;color:inherit}
.docs a:hover .dt{text-decoration:underline}
.dt{font-family:"Frank Ruhl Libre","David",serif;font-size:1.4rem;color:var(--ink);font-weight:700;display:block}
.dd{color:var(--muted);font-size:.98rem}
@media print{
  :root{--paper:#fff;--surface:#fff}
  .back,nav.toc{display:none}
  .wrap{max-width:none;padding:0}
  section.s{break-inside:auto}
  ul.pts li{break-inside:avoid}
  a{color:inherit;text-decoration:none}
}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
html{scroll-behavior:smooth}
"""

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600&family=Frank+Ruhl+Libre:wght@700&display=swap" rel="stylesheet">')

def fmt(s):
    s = html.escape(s, quote=False)
    return re.sub(r"\*\*(.+?)\*\*", r"<mark>\1</mark>", s)

def head(title, desc):
    return f"""<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)} · תמצית</title>
<meta name="description" content="{html.escape(desc)}">
{FONTS}
<style>{CSS}</style>
</head>
<body>
<div class="wrap">
"""

def orig_href(d):
    return "originals/" + urllib.parse.quote(d["source_file"])

def page(d):
    out = [head(d["title"], d["short"])]
    out.append('<a class="back" href="index.html">כל התקנונים</a>')
    out.append('<header>')
    out.append(f'<h1>{html.escape(d["title"])}</h1>')
    out.append(f'<p class="lead">{fmt(d["lead"])}</p>')
    if d["source_note"]:
        out.append(f'<p class="srcnote">{fmt(d["source_note"])}</p>')
    out.append('</header>')
    out.append('<aside class="notice" role="note">'
               f'<p><strong>תמצית, לא התקנון עצמו.</strong> {html.escape(DISCLAIMER)}</p>'
               f'<p>ליד כל נקודה מופיע מספר הסעיף בתקנון המקורי. <a href="{orig_href(d)}">לתקנון המקורי (PDF)</a></p>'
               '</aside>')
    if d.get("caveat"):
        out.append(f'<aside class="caveat" role="note"><strong>לתשומת לב</strong>{fmt(d["caveat"])}</aside>')
    out.append('<section class="key" aria-labelledby="k"><h2 id="k">שלושה דברים שכדאי לזכור</h2><ul>')
    for t, c in d["key3"]:
        out.append(f'<li><span class="t">{fmt(t)}</span><span class="cite">{html.escape(c)}</span></li>')
    out.append('</ul></section>')
    out.append('<nav class="toc" aria-label="פרקים"><ul>')
    for i, (st, _) in enumerate(d["sections"], 1):
        out.append(f'<li><a href="#s{i}">{html.escape(st)}</a></li>')
    out.append('</ul></nav>')
    for i, (st, pts) in enumerate(d["sections"], 1):
        out.append(f'<section class="s" id="s{i}"><h2>{html.escape(st)}</h2><ul class="pts">')
        for t, c in pts:
            out.append(f'<li><span>{fmt(t)}</span><span class="cite">{html.escape(c)}</span></li>')
        out.append('</ul></section>')
    out.append('<footer>'
               f'<p>{html.escape(DISCLAIMER)}</p>'
               f'<p>מקור: <a href="{orig_href(d)}">{html.escape(d["source_file"])}</a>. '
               'מצאת טעות או אי־התאמה? כדאי לעדכן את נציג המסלול.</p>'
               '</footer></div></body></html>')
    return "\n".join(out)

def index():
    out = [head("תקנונים", "תמציות של תקנוני אוניברסיטת רייכמן")]
    out.append('<header><h1>התקנונים, בקצרה</h1>'
               '<p class="lead">תמצית של כל תקנון, עם מספרי הסעיפים במקור, כדי שתדעו מה מגיע לכם ואיפה לחפש.</p></header>')
    out.append(f'<aside class="notice" role="note"><p><strong>תמצית, לא התקנון עצמו.</strong> {html.escape(DISCLAIMER)}</p></aside>')
    out.append('<ul class="docs">')
    for d in ALL:
        out.append(f'<li><a href="{d["slug"]}.html"><span class="dt">{html.escape(d["title"])}</span>'
                   f'<span class="dd">{html.escape(d["short"])}</span></a></li>')
    out.append('</ul></div></body></html>')
    return "\n".join(out)

for d in ALL:
    with open(f'{OUT}/{d["slug"]}.html', "w", encoding="utf-8") as f:
        f.write(page(d))
with open(f"{OUT}/index.html", "w", encoding="utf-8") as f:
    f.write(index())
print(len(ALL), "pages;", sum(len(p) for d in ALL for _, p in d["sections"]), "points")

# ---------- FAQ ----------
from faq import FAQ
TITLES = {d["slug"]: d["title"] for d in ALL}
FAQ_CSS = """
.faq-g{margin:0 0 2.4rem}
.faq-g h2{font-size:1.6rem;padding-bottom:.45rem;border-bottom:2px solid var(--ink);margin-bottom:.2rem}
details{border-bottom:1px solid var(--rule)}
summary{cursor:pointer;list-style:none;padding:.9rem 0;font-weight:600;color:var(--ink);font-size:1.08rem;display:flex;gap:.75rem;justify-content:space-between}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";font-weight:400;font-size:1.3rem;line-height:1;color:var(--muted);flex:none}
details[open] summary::after{content:"−"}
.ans{padding:0 0 1rem;max-width:40rem}
.ans p{margin:0 0 .5rem}
.src{font-size:.85rem;color:var(--muted)}
.featured{display:block;margin:1.5rem 0 0;padding:1rem 1.15rem;background:var(--surface);border-radius:10px;border-inline-start:6px solid var(--hl);text-decoration:none;color:inherit}
.featured .dt{font-size:1.3rem}
@media print{details{break-inside:avoid}.ans{display:block}}
"""
def faq_page():
    out=[head("שאלות נפוצות","שאלות נפוצות על תקנוני אוניברסיטת רייכמן").replace("</style>",FAQ_CSS+"</style>")]
    out.append('<a class="back" href="index.html">כל התקנונים</a>')
    out.append('<header><h1>שאלות נפוצות</h1><p class="lead">התשובות הקצרות לשאלות שעולות הכי הרבה. ליד כל תשובה מופיע המקור, כדי שתוכלו לבדוק את הנוסח המדויק.</p></header>')
    out.append(f'<aside class="notice" role="note"><p><strong>תשובה קצרה, לא התקנון עצמו.</strong> {html.escape(DISCLAIMER)}</p></aside>')
    out.append('<nav class="toc" aria-label="נושאים"><ul>')
    for i,(g,_) in enumerate(FAQ,1): out.append(f'<li><a href="#g{i}">{html.escape(g)}</a></li>')
    out.append('</ul></nav>')
    for i,(g,qs) in enumerate(FAQ,1):
        out.append(f'<section class="faq-g" id="g{i}"><h2>{html.escape(g)}</h2>')
        for q,a,srcs in qs:
            s="; ".join(f'<a href="{sl}.html">{html.escape(TITLES[sl])}</a>, {html.escape(c)}' for sl,c in srcs)
            out.append(f'<details><summary>{html.escape(q)}</summary><div class="ans"><p>{fmt(a)}</p><p class="src">מקור: {s}</p></div></details>')
        out.append('</section>')
    out.append(f'<footer><p>{html.escape(DISCLAIMER)}</p><p>לא מצאת תשובה? אפשר לפנות לנציג המסלול.</p></footer></div></body></html>')
    return "\n".join(out)
with open(f"{OUT}/faq.html","w",encoding="utf-8") as f: f.write(faq_page())
# add FAQ link to index
idx=open(f"{OUT}/index.html",encoding="utf-8").read()
idx=idx.replace("</style>",FAQ_CSS+"</style>").replace('<ul class="docs">',
  '<a class="featured" href="faq.html"><span class="dt">שאלות נפוצות</span><span class="dd">כמה מותר להיעדר, איך מערערים, מתי מגיע מועד מיוחד ועוד</span></a>\n<ul class="docs">',1)
open(f"{OUT}/index.html","w",encoding="utf-8").write(idx)
print("faq:", sum(len(q) for _,q in FAQ), "questions")
