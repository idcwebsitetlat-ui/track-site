/* קוד משותף לדפי האתר: פנייה לשרת, כניסה, טעינת התוכן ועזרי תצוגה */
(function () {
  var PROD_API = "https://script.google.com/macros/s/AKfycbyBZtw11GVERKJVmb8GyC2e__TVITftG3tyPLPaHaOyLo2JYDdPe6xEpK0pG0j2CL383Q/exec";
  // בפיתוח מקומי (tools/dev_server.py) השרת יושב באותה כתובת
  var API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? "/api" : PROD_API;
  var SESSION = "track-session";
  var CONTENT = "track-content";

  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(key) || "null");
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { return null; }
  }

  function api(action, body) {
    var payload = Object.assign({ action: action }, body || {});
    var s = store(SESSION);
    if (s && s.token && !payload.token) payload.token = s.token;
    return fetch(API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (res && res.error === "login") { logout(); return new Promise(function () {}); }
      return res;
    });
  }

  function session() { return store(SESSION); }

  function requireLogin() {
    if (session()) return true;
    try { sessionStorage.setItem("track-next", location.pathname.split("/").pop() + location.hash); } catch (e) {}
    location.replace("login.html");
    return false;
  }

  function logout() {
    store(SESSION, null);
    store(CONTENT, null);
    location.replace("login.html");
  }

  // תאריך שהוקלד בגיליון כטקסט (8.11.26, 8/11/2026) הופך ל-2026-11-08, כמו תאריך רגיל
  function normalizeDates(res) {
    Object.keys(res.tabs || {}).forEach(function (t) {
      res.tabs[t].forEach(function (row) {
        Object.keys(row).forEach(function (k) {
          var m = typeof row[k] === "string" && row[k].trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/);
          if (m) row[k] = (m[3].length === 2 ? "20" + m[3] : m[3]) + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
        });
      });
    });
    return res;
  }

  /* מציג מיד את התוכן מהביקור הקודם (אם יש), ואז מרענן מהשרת ומציג שוב רק אם משהו השתנה */
  function loadContent(render, onError) {
    var cached = store(CONTENT);
    if (cached) render(normalizeDates(cached), { fresh: false });
    api("content").then(function (res) {
      if (!res || !res.ok) throw new Error(res && res.error);
      normalizeDates(res);
      var same = cached && JSON.stringify(cached.tabs) === JSON.stringify(res.tabs) &&
        JSON.stringify(cached.settings) === JSON.stringify(res.settings) &&
        JSON.stringify(cached.lessonChanges) === JSON.stringify(res.lessonChanges);
      store(CONTENT, res);
      if (!same) render(res, { fresh: true });
    }).catch(function (err) {
      if (!cached && onError) onError(err);
    });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // רק קישורים רגילים (http/https/mailto) נכנסים ל-href
  function safeUrl(u) {
    u = String(u || "").trim();
    return /^(https?:|mailto:)/i.test(u) ? u : "";
  }

  var DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  var DAYS_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  var MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

  function parseDate(s) {
    var m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function iso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function daysUntil(s) { var d = parseDate(s); return d ? Math.round((d - today()) / 864e5) : null; }
  function shortDate(s) { var d = parseDate(s); return d ? d.getDate() + "." + (d.getMonth() + 1) : ""; }
  function dayName(s) { var d = parseDate(s); return d ? "יום " + DAYS_SHORT[d.getDay()] : ""; }
  function relDays(n) {
    if (n === 0) return "היום";
    if (n === 1) return "מחר";
    if (n === 2) return "מחרתיים";
    if (n > 0) return "בעוד " + n + " ימים";
    if (n === -1) return "אתמול";
    return "לפני " + (-n) + " ימים";
  }

  function toast(text) {
    var t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  function copy(text, label) {
    function done() { toast(label || "הועתק"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { window.prompt("להעתקה:", text); });
    } else {
      window.prompt("להעתקה:", text);
    }
  }

  // כפתור "יציאה" בכותרת
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-logout]")) logout();
  });

  window.Site = {
    api: api, session: session, requireLogin: requireLogin, logout: logout, loadContent: loadContent,
    store: store, esc: esc, safeUrl: safeUrl, toast: toast, copy: copy,
    parseDate: parseDate, iso: iso, today: today, daysUntil: daysUntil, shortDate: shortDate,
    dayName: dayName, relDays: relDays, DAYS: DAYS, MONTHS: MONTHS
  };
})();
