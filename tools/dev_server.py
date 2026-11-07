# -*- coding: utf-8 -*-
"""
שרת פיתוח מקומי: מגיש את האתר ומחקה את השרת של Apps Script בכתובת /api,
עם התוכן מהעותק המקומי של הגיליון (data/אתר המסלול - תוכן.xlsx).

  python3 tools/dev_server.py        ואז  http://localhost:8000

בפיתוח כל שם פרטי ושם משפחה מתקבלים בכניסה, חוץ מ"ישראל ישראלי" (כדי לבדוק דחייה).
פניות לא נשמרות ולא נשלח מייל.
"""
import os, json, datetime as dt, http.server, socketserver
import openpyxl

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
XLSX = os.path.join(ROOT, "data", "אתר המסלול - תוכן.xlsx")
PORT = int(os.environ.get("PORT", "8000"))
HIDDEN_TABS = ["מקרא"]
HIDDEN_SETTINGS = ["מייל לקבלת התראות על פניות"]

# דוגמה לשינויים בשיעורים, בפורמט שהשרת האמיתי מחזיר
SAMPLE_CHANGES = [
    {"date": "2026-11-11", "start": "11:30", "end": "13:00", "title": "מבוא לחשבונאות רו\"ח אילן עופר", "type": "שיעור",
     "kind": "שעה אחרת", "location": "C.L05 אודיטוריום צ'ייס ארזי עופר", "regular": "יום ד׳ 09:45, C.L05"},
    {"date": "2026-12-04", "start": "08:45", "end": "11:15", "title": "מתמטיקה לכלכלנים א' מר מחלין מקס", "type": "שיעור",
     "kind": "בזום", "location": "ZOOM", "regular": "יום א׳ 13:45, A318"},
]


def cell(v):
    if isinstance(v, dt.datetime):
        return v.strftime("%H:%M") if v.year < 1901 else v.strftime("%Y-%m-%d")
    if isinstance(v, dt.time):
        return v.strftime("%H:%M")
    if isinstance(v, float) and v.is_integer():
        return int(v)
    return "" if v is None else v


def content():
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    today = dt.date.today().isoformat()
    out = {"ok": True, "tabs": {}, "settings": {}, "lessonChanges": SAMPLE_CHANGES}
    for ws in wb.worksheets:
        if ws.title in HIDDEN_TABS:
            continue
        rows = list(ws.iter_rows(values_only=True))
        head = [str(h).strip() if h else "" for h in rows[0]]
        objs = []
        for r in rows[1:]:
            if not any(c not in (None, "") for c in r):
                continue
            objs.append({h: cell(r[i]) if i < len(r) else "" for i, h in enumerate(head) if h})
        if ws.title == "הגדרות":
            out["settings"] = {o["שדה"]: o.get("ערך", "") for o in objs if o.get("שדה") and o["שדה"] not in HIDDEN_SETTINGS}
            continue
        def keep(o):
            vals = list(o.values())
            if str(vals[0] if vals else "").startswith("(דוגמה)"): return False
            if str(o.get("כותרת", "")).startswith("(דוגמה)") or str(o.get("שם המטלה", "")).startswith("(דוגמה)"): return False
            if o.get("פעיל") == "לא" or o.get("זמין") == "לא": return False
            if ws.title == "סקרים":
                if not o.get("קישור לטופס"): return False
                if o.get("נפתח") and o["נפתח"] > today: return False
                if o.get("נסגר") and o["נסגר"] < today: return False
            return True
        out["tabs"][ws.title] = [o for o in objs if keep(o)]
    return out


class Handler(http.server.SimpleHTTPRequestHandler):
    counter = 0

    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def do_POST(self):
        if self.path != "/api":
            return self.send_error(404)
        req = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        act = req.get("action")
        if act == "login":
            first, last = str(req.get("first", "")).strip(), str(req.get("last", "")).strip()
            if not first or not last:
                res = {"ok": False, "error": "צריך למלא גם שם פרטי וגם שם משפחה."}
            elif (first, last) == ("ישראל", "ישראלי"):
                res = {"ok": False, "error": "השם לא מופיע ברשימת המסלול. בדקו את האיות, ואם זה לא עוזר, כתבו לנציג."}
            else:
                res = {"ok": True, "token": "dev-token", "name": first + " " + last}
        elif not req.get("token"):
            res = {"ok": False, "error": "login", "message": "צריך להיכנס מחדש."}
        elif act == "content":
            res = content()
        elif act == "inquiry":
            if req.get("consent") is not True:
                res = {"ok": False, "error": "צריך לאשר את הצהרת הפרטיות לפני השליחה."}
            elif not str(req.get("topic", "")).strip():
                res = {"ok": False, "error": "צריך לכתוב נושא לפנייה."}
            else:
                Handler.counter += 1
                pid = "%04d" % Handler.counter
                wa = "".join(ch for ch in str(content()["settings"].get("מספר וואטסאפ לפניות", "")) if ch.isdigit())
                res = {"ok": True, "id": pid, "waNumber": wa,
                       "waText": "פנייה מספר %s · %s · %s" % (pid, req.get("course") or "כללי", req["topic"])}
        else:
            res = {"ok": False, "error": "פעולה לא מוכרת."}
        body = json.dumps(res, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
    print("http://localhost:%d" % PORT)
    httpd.serve_forever()
