# -*- coding: utf-8 -*-
"""
סנכרון מטלות מיומן ה-Moodle ללשונית "מטלות" בגיליון התוכן.

הסקריפט לא נוגע בגיליון בעצמו. הוא מקבל את התוכן הנוכחי של הלשוניות "מטלות" ו"קורסים"
(כמו שמחזיר get_values של Google Sheets), קורא את יומן ה-Moodle, ומדפיס JSON עם מה שצריך לשנות:

  python3 tools/moodle_sync.py tasks.json courses.json

  {"append": [[...שורה חדשה...]], "update": [{"range": "מטלות!E5:F5", "values": [[...]]}],
   "summary": ["..."], "missing": ["..."]}

- מטלה חדשה ב-Moodle: שורה חדשה, עם המזהה שלה בעמודה "מזהה Moodle".
- מטלה שכבר יש לה שורה עם אותו מזהה, והדדליין השתנה: עדכון של הדדליין והשעה.
- מטלה שיש לה שורה ידנית (אותו קורס ואותו שם, בלי מזהה): לא נוגעים.
- שורה עם מזהה שכבר לא מופיע ב-Moodle: לא מוחקים, רק מדווחים ב-"missing".

הקישור ליומן נשמר ב-.claude/moodle-url.txt, שלא עולה ל-GitHub.
"""
import sys, os, re, json, datetime as dt, urllib.request
from zoneinfo import ZoneInfo

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
URL_FILE = os.path.join(ROOT, ".claude", "moodle-url.txt")
MOODLE_LINK = "https://moodle.runi.ac.il/2027/calendar/view.php?view=upcoming"
TZ = ZoneInfo("Asia/Jerusalem")
HEAD = ["קורס", "שם המטלה", "סוג", "מה נדרש", "דדליין", "שעה", "אופן הגשה", "נספר לתנאי סף", "קישור", "מזהה Moodle"]


# "recentupcoming" מחזיר רק מטלות עתידיות, אז מטלה שהדדליין שלה כבר עבר לא מגיעה ממנו.
# לכן קוראים גם את החודש הנוכחי ואת החודש הבא, ומאחדים לפי המזהה
PRESETS = ["recentupcoming", "monthnow", "monthnext"]


def fetch():
    base = open(URL_FILE, encoding="utf-8").read().strip()
    texts = []
    for preset in PRESETS:
        url = re.sub(r"preset_time=[a-z]+", "preset_time=" + preset, base)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh) track-site moodle sync"})
        text = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
        if "BEGIN:VCALENDAR" not in text:
            raise RuntimeError("הקישור של Moodle לא החזיר יומן. אולי פג תוקפו (החלפת סיסמה או שנה חדשה).")
        texts.append(text)
    return "\n".join(texts)


def parse(text):
    text = re.sub(r"\r?\n[ \t]", "", text.replace("\r\n", "\n"))
    out = []
    for block in re.findall(r"BEGIN:VEVENT\n(.*?)END:VEVENT", text, re.S):
        e = {}
        for line in block.split("\n"):
            if ":" in line:
                k, v = line.split(":", 1)
                e[k.split(";")[0]] = v
        m = re.match(r"(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)", e.get("DTSTART", ""))
        if not m:
            continue
        t = dt.datetime(*map(int, m.groups()[:6]), tzinfo=dt.timezone.utc if m.group(7) else TZ).astimezone(TZ)
        name = re.search(r"['׳\"״](.+)['׳\"״]", e.get("SUMMARY", ""))
        cat = re.match(r"^(.*?)-(\d+)-", e.get("CATEGORIES", ""))
        out.append({"uid": e.get("UID", ""), "name": name.group(1) if name else e.get("SUMMARY", ""),
                    "code": cat.group(2) if cat else "", "course": cat.group(1).strip() if cat else e.get("CATEGORIES", ""),
                    "date": t.strftime("%d/%m/%Y"), "time": t.strftime("%H:%M")})
    return out


def norm_date(s):
    m = re.match(r"^\s*(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\s*$", str(s or ""))
    if m:
        y = m.group(3) if len(m.group(3)) == 4 else "20" + m.group(3)
        return "%02d/%02d/%s" % (int(m.group(1)), int(m.group(2)), y)
    m = re.match(r"^\s*(\d{4})-(\d{2})-(\d{2})", str(s or ""))
    return "%s/%s/%s" % (m.group(3), m.group(2), m.group(1)) if m else str(s or "").strip()


def norm_time(s):
    m = re.match(r"^\s*(\d{1,2}):(\d{2})", str(s or ""))
    return "%02d:%s" % (int(m.group(1)), m.group(2)) if m else str(s or "").strip()


def main():
    tasks = json.load(open(sys.argv[1], encoding="utf-8"))
    courses = json.load(open(sys.argv[2], encoding="utf-8"))
    rows = tasks.get("values", tasks)
    by_code = {str(r[0]).strip(): r[1] for r in courses.get("values", courses)[1:] if len(r) > 1}

    head = rows[0] if rows else []
    result = {"append": [], "update": [], "summary": [], "missing": []}
    if len(head) < len(HEAD) or head[len(HEAD) - 1] != HEAD[-1]:
        # הכותרת של עמודת המזהה חסרה: מוסיפים אותה
        result["update"].append({"range": "מטלות!J1", "values": [[HEAD[-1]]]})
    col = {h: i for i, h in enumerate(HEAD)}
    cell = lambda r, h: r[col[h]] if len(r) > col[h] else ""

    by_uid, manual = {}, set()
    for i, r in enumerate(rows[1:], start=2):
        uid = cell(r, "מזהה Moodle")
        if uid:
            by_uid[uid] = (i, r)
        else:
            manual.add((cell(r, "קורס").strip(), cell(r, "שם המטלה").strip()))

    feed = parse(fetch())
    seen = set()
    for e in feed:
        if e["uid"] in seen:
            continue
        course = by_code.get(e["code"], e["course"])
        seen.add(e["uid"])
        if e["uid"] in by_uid:
            i, r = by_uid[e["uid"]]
            if norm_date(cell(r, "דדליין")) != e["date"] or norm_time(cell(r, "שעה")) != e["time"]:
                result["update"].append({"range": "מטלות!E%d:F%d" % (i, i), "values": [[e["date"], e["time"]]]})
                result["summary"].append("עודכן: %s, %s → %s %s" % (course, e["name"], e["date"], e["time"]))
            continue
        if (course, e["name"]) in manual:
            continue
        kind = "תרגיל בית" if "תרגיל" in e["name"] else "מטלה"
        result["append"].append([course, e["name"], kind, "", e["date"], e["time"], "Moodle", "", MOODLE_LINK, e["uid"]])
        result["summary"].append("נוספה: %s, %s, עד %s %s" % (course, e["name"], e["date"], e["time"]))

    today = dt.datetime.now(TZ).date()
    for uid, (i, r) in by_uid.items():
        d = norm_date(cell(r, "דדליין"))
        try:
            future = dt.datetime.strptime(d, "%d/%m/%Y").date() >= today
        except ValueError:
            future = False
        if uid not in seen and future:
            result["missing"].append("שורה %d: %s, %s כבר לא מופיעה ב-Moodle" % (i, cell(r, "קורס"), cell(r, "שם המטלה")))

    print(json.dumps(result, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
