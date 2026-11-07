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
  --paper:#EDF0EE; --surface:#FFFFFF; --ink:#1B2623; --text:#1B2623; --muted:#4F5E59;
  --rule:#D5DCD9; --accent:#0F6E64; --accent-soft:#DCEDEA; --on-accent:#FFFFFF;
  --hl:#BFE6DE; --warn-bg:#FBF0DB; --warn-ink:#8A5A0B;
  color-scheme: light;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --paper:#121816; --surface:#1A2320; --ink:#E7EEEB; --text:#E7EEEB; --muted:#9AABA5;
    --rule:#2C3834; --accent:#4FC1B1; --accent-soft:#1E3631; --on-accent:#0C1412;
    --hl:rgba(79,193,177,.38); --warn-bg:#352B18; --warn-ink:#E3B25A;
    color-scheme: dark;
  }
}
html.a11y-contrast{
  --paper:#000; --surface:#000; --ink:#FFF; --text:#FFF; --muted:#FFF; --rule:#FFF;
  --accent:#FFE45C; --accent-soft:#222; --on-accent:#000; --hl:#5A4A00; --warn-bg:#000; --warn-ink:#FFE45C;
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
.notice{margin:1.75rem 0;padding:1rem 1.15rem;border-radius:12px;background:var(--accent-soft);font-size:.97rem}
.notice p{margin:0 0 .5rem}
.notice p:last-child{margin:0}
.notice strong{color:var(--ink)}
.caveat{margin:1.25rem 0;padding:.9rem 1.15rem;border-radius:10px;background:var(--warn-bg);color:var(--warn-ink);font-size:.97rem}
.caveat strong{display:block;margin-bottom:.15rem}
.key{margin:2.25rem 0 2.5rem;padding:1.4rem 1.4rem 1.2rem;background:var(--surface);border:1px solid var(--rule);border-radius:16px;
  border-inline-start:6px solid var(--accent)}
.key h2{font-size:1.35rem;margin-bottom:.8rem}
.key ul{list-style:none;margin:0;padding:0}
.key li{padding:.55rem 0;border-top:1px solid var(--rule);display:grid;grid-template-columns:1fr auto;gap:.25rem 1rem}
.key li:first-child{border-top:0}
.key .t{font-size:1.08rem}
nav.toc{margin:0 0 2.5rem}
nav.toc ul{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:.45rem}
nav.toc a{display:inline-flex;align-items:center;min-height:44px;padding:0 .9rem;font-weight:600;border:1px solid var(--rule);border-radius:999px;font-size:.92rem;
  text-decoration:none;color:var(--ink);background:var(--surface)}
nav.toc a:hover{border-color:var(--accent)}
section.s{margin:0 0 2.6rem;scroll-margin-top:1rem}
section.s{background:var(--surface);border:1px solid var(--rule);border-radius:16px;padding:1.25rem 1.4rem .4rem}
section.s h2{font-size:1.6rem;padding-bottom:.45rem;border-bottom:2px solid var(--accent);margin-bottom:.35rem}
section.s ul.pts li:last-child{border-bottom:0}
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
.docs{list-style:none;padding:0 1.4rem;margin:2rem 0 0;background:var(--surface);border:1px solid var(--rule);border-radius:16px}
.docs li{border-bottom:1px solid var(--rule)}
.docs li:last-child{border-bottom:0}
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

.skip{position:absolute;inset-inline-start:-999px;top:0;background:var(--accent);color:var(--on-accent);padding:.6rem 1rem;z-index:20;border-radius:0 0 8px 8px}
.skip:focus{inset-inline-start:1rem}
.site-top{background:var(--surface);border-bottom:1px solid var(--rule);position:sticky;top:0;z-index:10}
.site-top .in{max-width:75rem;margin:0 auto;padding:.6rem 1.25rem;display:flex;align-items:center;gap:1rem}
.brand{font-family:"Frank Ruhl Libre","David",serif;font-weight:700;font-size:1.15rem;color:var(--ink);text-decoration:none;white-space:nowrap}
.site-nav{flex:1;min-width:0;overflow-x:auto}
.site-nav ul{list-style:none;margin:0;padding:0;display:flex;gap:.25rem}
.site-nav a{display:inline-flex;align-items:center;min-height:44px;padding:0 .8rem;border-radius:999px;text-decoration:none;color:var(--muted);font-weight:600;white-space:nowrap}
.site-nav a[aria-current="page"]{background:var(--accent-soft);color:var(--ink)}
.a11y-btn{flex:none;width:44px;height:44px;border-radius:999px;border:1.5px solid var(--accent);background:var(--surface);color:var(--accent);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.a11y-panel{position:fixed;inset-inline-end:1rem;top:4.5rem;width:min(22rem,calc(100vw - 2rem));background:var(--surface);color:var(--text);border:1px solid var(--rule);border-radius:16px;padding:1rem;z-index:30;box-shadow:0 12px 32px rgba(0,0,0,.18)}
.a11y-panel[hidden]{display:none}
.a11y-panel h2{font-size:1.3rem;margin:0}
.a11y-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem}
.a11y-grid{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}
.a11y-panel button{min-height:48px;border-radius:12px;border:1.5px solid var(--rule);background:var(--surface);color:var(--text);font:inherit;font-weight:600;cursor:pointer;padding:0 .5rem}
.a11y-panel button[aria-pressed="true"]{border-color:var(--accent);background:var(--accent-soft)}
.a11y-row{display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.6rem}
.a11y-row .sz{display:flex;gap:.35rem}
.a11y-row .sz button{width:3.2rem}
.a11y-foot{display:flex;justify-content:space-between;align-items:center;margin-top:.75rem}
.a11y-foot button{border:0;background:none;color:var(--accent)}
.site-foot{background:var(--surface);border-top:1px solid var(--rule);margin-top:2rem}
.site-foot .in{max-width:75rem;margin:0 auto;padding:1.1rem 1.25rem;display:flex;flex-wrap:wrap;gap:1rem 1.5rem;justify-content:space-between;font-size:.93rem;color:var(--muted)}
.site-foot .links{display:flex;flex-wrap:wrap;gap:1.25rem}
html.a11y-links a{text-decoration:underline!important;text-underline-offset:3px;outline:2px dashed var(--accent);outline-offset:2px}
html.a11y-font body,html.a11y-font h1,html.a11y-font h2,html.a11y-font .dt,html.a11y-font .brand{font-family:Arial,"Arial Hebrew",sans-serif!important}
html.a11y-spacing body{line-height:2;letter-spacing:.02em;word-spacing:.08em}
html.a11y-still *,html.a11y-still *::before,html.a11y-still *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
html.a11y-cursor,html.a11y-cursor *{cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24'%3E%3Cpath d='M4 2l16 9-7 2-3 7z' fill='%23000' stroke='%23fff' stroke-width='1.5'/%3E%3C/svg%3E") 4 2,auto!important}
.brand{flex:1}
.site-nav{flex:0 1 auto}
@media (max-width:900px){.site-top .in{flex-wrap:wrap;row-gap:.25rem}.site-nav{order:3;flex-basis:100%;margin-inline:-.5rem}}
@media print{.site-top,.site-foot,.a11y-panel,.skip{display:none}}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
html{scroll-behavior:smooth}
"""

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&family=Frank+Ruhl+Libre:wght@700;900&display=swap" rel="stylesheet">')

def fmt(s):
    s = html.escape(s, quote=False)
    return re.sub(r"\*\*(.+?)\*\*", r"<mark>\1</mark>", s)

NAV=[("../index.html#updates","עדכונים"),("../index.html#week","מועדים"),("../index.html#tasks","מטלות"),("../index.html#contacts","אנשי קשר"),
     ("index.html","תקנונים"),("../index.html#links","קישורים"),("../index.html#tutoring","שיעורים פרטיים"),("../inquiry.html","פניות")]
A11Y_ICON='<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"></circle><path d="M4 8l8 1 8-1"></path><path d="M12 9v5l-3 7"></path><path d="M12 14l3 7"></path></svg>'
SITE_TOP=('<a class="skip" href="#main">דילוג לתוכן</a>'
  '<header class="site-top"><div class="in">'
  '<a class="brand" href="../index.html">כלכלה, מנהל עסקים וחשבונאות</a>'
  '<nav class="site-nav" aria-label="ניווט ראשי"><ul>'
  + "".join('<li><a href="%s"%s>%s</a></li>' % (h, ' aria-current="page"' if l=="תקנונים" else "", l) for h,l in NAV) +
  '</ul></nav>'
  f'<button type="button" class="a11y-btn" id="a11y-open" aria-label="תפריט נגישות" aria-expanded="false" aria-controls="a11y-panel">{A11Y_ICON}</button>'
  '</div></header>'
  '<div class="a11y-panel" id="a11y-panel" role="dialog" aria-modal="false" aria-labelledby="a11y-title" hidden>'
  '<div class="a11y-head"><h2 id="a11y-title">נגישות</h2><button type="button" id="a11y-close" aria-label="סגירת תפריט הנגישות" style="width:44px">×</button></div>'
  '<div class="a11y-row"><span style="font-weight:700">גודל טקסט</span><div class="sz" role="group" aria-label="גודל טקסט">'
  '<button type="button" data-size="0.9" aria-pressed="false">א−</button><button type="button" data-size="1" aria-pressed="true">א</button><button type="button" data-size="1.15" aria-pressed="false">א+</button><button type="button" data-size="1.3" aria-pressed="false">א++</button></div></div>'
  '<div class="a11y-grid">'
  '<button type="button" data-flag="contrast" aria-pressed="false">ניגודיות גבוהה</button>'
  '<button type="button" data-flag="links" aria-pressed="false">הדגשת קישורים</button>'
  '<button type="button" data-flag="font" aria-pressed="false">גופן קריא</button>'
  '<button type="button" data-flag="still" aria-pressed="false">עצירת אנימציות</button>'
  '<button type="button" data-flag="spacing" aria-pressed="false">ריווח שורות</button>'
  '<button type="button" data-flag="cursor" aria-pressed="false">סמן מוגדל</button>'
  '</div>'
  '<div class="a11y-foot"><button type="button" id="a11y-reset">איפוס הגדרות</button><a href="../accessibility.html">הצהרת נגישות</a></div>'
  '</div>')
SITE_FOOT=('<footer class="site-foot"><div class="in"><div class="links">'
  '<a href="../accessibility.html">הצהרת נגישות</a><a href="../privacy.html">הצהרת פרטיות</a><a href="../index.html">לאתר המסלול</a></div>'
  '<div>המידע אינו מחליף את המסמכים הרשמיים של האוניברסיטה.</div></div></footer>'
  '<script src="../assets/a11y.js" defer></script>')

def finish(h):
    return h.replace("</div></body></html>", "</div></main>" + SITE_FOOT + "</body></html>")

def head(title, desc):
    return f"""<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{html.escape(title)}: תמצית | אתר המסלול</title>
<meta name="description" content="{html.escape(desc)}">
{FONTS}
<style>{CSS}</style>
</head>
<body>
{SITE_TOP}
<main id="main">
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
        f.write(finish(page(d)))
with open(f"{OUT}/index.html", "w", encoding="utf-8") as f:
    f.write(finish(index()))
print(len(ALL), "pages;", sum(len(p) for d in ALL for _, p in d["sections"]), "points")

# ---------- FAQ ----------
from faq import FAQ
TITLES = {d["slug"]: d["title"] for d in ALL}
FAQ_CSS = """
.faq-g{margin:0 0 2.4rem}
.faq-g{background:var(--surface);border:1px solid var(--rule);border-radius:16px;padding:1.25rem 1.4rem .4rem}
.faq-g h2{font-size:1.6rem;padding-bottom:.45rem;border-bottom:2px solid var(--accent);margin-bottom:.2rem}
.faq-g details:last-child{border-bottom:0}
details{border-bottom:1px solid var(--rule)}
summary{cursor:pointer;list-style:none;padding:.9rem 0;font-weight:600;color:var(--ink);font-size:1.08rem;display:flex;gap:.75rem;justify-content:space-between}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";font-weight:400;font-size:1.3rem;line-height:1;color:var(--muted);flex:none}
details[open] summary::after{content:"−"}
.ans{padding:0 0 1rem;max-width:40rem}
.ans p{margin:0 0 .5rem}
.src{font-size:.85rem;color:var(--muted)}
.featured{display:block;margin:1.5rem 0 0;padding:1.1rem 1.4rem;background:var(--accent);color:var(--on-accent);border-radius:16px;text-decoration:none}
.featured .dt,.featured .dd{color:var(--on-accent)}
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
with open(f"{OUT}/faq.html","w",encoding="utf-8") as f: f.write(finish(faq_page()))
# add FAQ link to index
idx=open(f"{OUT}/index.html",encoding="utf-8").read()
idx=idx.replace("</style>",FAQ_CSS+"</style>").replace('<ul class="docs">',
  '<a class="featured" href="faq.html"><span class="dt">שאלות נפוצות</span><span class="dd">כמה מותר להיעדר, איך מערערים, מתי מגיע מועד מיוחד ועוד</span></a>\n<ul class="docs">',1)
open(f"{OUT}/index.html","w",encoding="utf-8").write(idx)
print("faq:", sum(len(q) for _,q in FAQ), "questions")
