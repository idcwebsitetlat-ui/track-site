# -*- coding: utf-8 -*-
"""
מחולל הדפים הראשיים של האתר: index.html, login.html, inquiry.html, accessibility.html, privacy.html.
כותב גם את assets/site.css מתוך ה-CSS של takanonim/_source/build.py, כדי שהכותרת, הכותרת התחתונה
ותפריט הנגישות ייראו בדיוק כמו בדפי התקנונים.

הרצה מתיקיית הפרויקט:  python3 tools/build_site.py
"""
import os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
src = open(os.path.join(ROOT, "takanonim/_source/build.py"), encoding="utf-8").read()
BASE_CSS = re.search(r'CSS = r"""(.*?)"""', src, re.S).group(1)
open(os.path.join(ROOT, "assets/site.css"), "w", encoding="utf-8").write(
    "/* נוצר אוטומטית מ-takanonim/_source/build.py על ידי tools/build_site.py. לא לערוך ידנית. */\n" + BASE_CSS.strip() + "\n")

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&family=Frank+Ruhl+Libre:wght@700;900&display=swap" rel="stylesheet">')

NAV = [("index.html#updates", "עדכונים", "updates"), ("index.html#week", "מועדים", "week"),
       ("index.html#tasks", "מטלות", "tasks"), ("index.html#contacts", "אנשי קשר", "contacts"),
       ("takanonim/index.html", "תקנונים", "regs"), ("index.html#links", "קישורים", "links"), ("index.html#campus", "מפת הקמפוס", "campus"),
       ("index.html#tutoring", "שיעורים פרטיים", "tutoring"), ("inquiry.html", "פניות", "inquiry")]

A11Y_ICON = ('<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
             'stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"></circle><path d="M4 8l8 1 8-1"></path>'
             '<path d="M12 9v5l-3 7"></path><path d="M12 14l3 7"></path></svg>')

A11Y_PANEL = '''<div class="a11y-panel" id="a11y-panel" role="dialog" aria-modal="false" aria-labelledby="a11y-title" hidden>
<div class="a11y-head"><h2 id="a11y-title">נגישות</h2><button type="button" id="a11y-close" aria-label="סגירת תפריט הנגישות" style="width:44px">×</button></div>
<div class="a11y-row"><span style="font-weight:700">גודל טקסט</span><div class="sz" role="group" aria-label="גודל טקסט"><button type="button" data-size="0.9" aria-pressed="false">א−</button><button type="button" data-size="1" aria-pressed="true">א</button><button type="button" data-size="1.15" aria-pressed="false">א+</button><button type="button" data-size="1.3" aria-pressed="false">א++</button></div></div>
<div class="a11y-grid">
<button type="button" data-flag="contrast" aria-pressed="false">ניגודיות גבוהה</button>
<button type="button" data-flag="links" aria-pressed="false">הדגשת קישורים</button>
<button type="button" data-flag="font" aria-pressed="false">גופן קריא</button>
<button type="button" data-flag="still" aria-pressed="false">עצירת אנימציות</button>
<button type="button" data-flag="spacing" aria-pressed="false">ריווח שורות</button>
<button type="button" data-flag="cursor" aria-pressed="false">סמן מוגדל</button>
</div>
<div class="a11y-foot"><button type="button" id="a11y-reset">איפוס הגדרות</button><a href="accessibility.html">הצהרת נגישות</a></div>
</div>'''


def top(current, nav=True, logout=True):
    items = "".join('<li><a href="%s"%s>%s</a></li>' % (h, ' aria-current="page"' if k == current else "", l)
                    for h, l, k in NAV)
    return ('<a class="skip" href="#main">דילוג לתוכן</a>\n'
            '<header class="site-top"><div class="in">\n'
            '<a class="brand" href="index.html">כלכלה, מנהל עסקים וחשבונאות</a>\n'
            + ('<nav class="site-nav" aria-label="ניווט ראשי"><ul>%s</ul></nav>\n' % items if nav else '')
            + ('<button type="button" class="logout" data-logout>יציאה</button>\n' if logout else '')
            + '<button type="button" class="a11y-btn" id="a11y-open" aria-label="תפריט נגישות" aria-expanded="false" aria-controls="a11y-panel">%s</button>\n' % A11Y_ICON
            + '</div></header>\n' + A11Y_PANEL)


FOOT = ('<footer class="site-foot"><div class="in"><div class="links">'
        '<a href="accessibility.html">הצהרת נגישות</a><a href="privacy.html">הצהרת פרטיות</a><a href="takanonim/index.html">תקנונים</a></div>'
        '<div>המידע אינו מחליף את המסמכים הרשמיים של האוניברסיטה.</div></div></footer>')


def page(name, title, desc, body, current=None, scripts=(), nav=True, logout=True, guard=False):
    # בדפים שדורשים כניסה: הפנייה לדף הכניסה עוד לפני שהדף מצויר
    guard_js = ('<script>try{if(!localStorage.getItem("track-session")){sessionStorage.setItem("track-next",location.pathname.split("/").pop()+location.hash);'
                'location.replace("login.html")}}catch(e){}</script>\n') if guard else ''
    html = f'''<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#0F6E64">
<meta name="robots" content="noindex">
{guard_js}{FONTS}
<link rel="stylesheet" href="assets/site.css">
<link rel="stylesheet" href="assets/app.css">
</head>
<body>
{top(current, nav, logout)}
<main id="main" tabindex="-1">
{body.strip()}
</main>
{FOOT}
<script src="assets/a11y.js" defer></script>
<script src="assets/site.js" defer></script>
''' + "".join(f'<script src="assets/{s}" defer></script>\n' for s in scripts) + '</body>\n</html>\n'
    open(os.path.join(ROOT, name), "w", encoding="utf-8").write(html)


def read(name):
    return open(os.path.join(ROOT, "tools/pages", name), encoding="utf-8").read()


page("index.html", "אתר המסלול · כלכלה, מנהל עסקים וחשבונאות",
     "עדכונים, מועדים, מטלות ואנשי קשר לסטודנטים במסלול התלת־חוגי ברייכמן",
     read("index.body.html"), current="updates", scripts=["home.js"], guard=True)
page("login.html", "כניסה · אתר המסלול", "כניסה לאתר המסלול עם שם פרטי ושם משפחה",
     read("login.body.html"), nav=False, logout=False, scripts=["login.js"])
page("inquiry.html", "פנייה לנציג · אתר המסלול", "פנייה לנציג המסלול",
     read("inquiry.body.html"), current="inquiry", scripts=["inquiry.js"], guard=True)
page("accessibility.html", "הצהרת נגישות · אתר המסלול", "הצהרת הנגישות של אתר המסלול",
     read("accessibility.body.html"), nav=False, logout=False)
page("privacy.html", "הצהרת פרטיות · אתר המסלול", "הצהרת הפרטיות של אתר המסלול",
     read("privacy.body.html"), nav=False, logout=False)
print("built: index, login, inquiry, accessibility, privacy + assets/site.css")
