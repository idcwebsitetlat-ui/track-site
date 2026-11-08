/* דף הבית: עדכונים, מועדים, מטלות, אנשי קשר, קישורים ושיעורים פרטיים. כל קטגוריה היא מסך עם כתובת (#week וכו׳) */
(function () {
  if (!Site.requireLogin()) return;
  var S = Site, esc = S.esc;
  var VIEWS = ["updates", "week", "tasks", "contacts", "links", "tutoring"];
  var TITLES = { updates: "עדכונים", week: "מועדים", tasks: "מטלות ותנאי סף", contacts: "אנשי קשר", links: "קישורים", tutoring: "שיעורים פרטיים" };
  var data = null;
  var ui = { weekFilter: "all", contactFilter: "all", linkFilter: "all", showPastTasks: false, summaryRange: "next7" };

  /* ---------- ניווט בין המסכים ---------- */

  function show(fromUser) {
    var v = location.hash.slice(1);
    if (VIEWS.indexOf(v) === -1) v = "updates";
    document.querySelectorAll(".view").forEach(function (sec) {
      var on = sec.dataset.view === v;
      sec.hidden = !on;
      if (on) { sec.classList.remove("enter"); void sec.offsetWidth; sec.classList.add("enter"); }
    });
    document.querySelectorAll(".site-nav a").forEach(function (a) {
      var target = a.getAttribute("href").split("#")[1];
      if (target === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.title = TITLES[v] + " · אתר המסלול";
    if (fromUser) {
      window.scrollTo(0, 0);
      var sec = document.querySelector('.view[data-view="' + v + '"]');
      if (sec) sec.focus({ preventScroll: true });
    }
  }
  window.addEventListener("hashchange", function () { show(true); });
  show(false);

  /* ---------- עזרי נתונים ---------- */

  function tab(name) { return (data && data.tabs && data.tabs[name]) || []; }
  function setting(name) { return (data && data.settings && data.settings[name]) || ""; }
  var todayIso = S.iso(S.today());

  function kindOf(type) {
    type = String(type || "");
    if (type.indexOf("מבחן") === 0) return "exam";
    if (type === "הגשה") return "sub";
    if (type === "חג וחופשה") return "hol";
    if (type === "אירוע מסלול") return "track";
    return "event";
  }
  var FILTERS = [["all", "הכול"], ["exam", "מבחנים"], ["sub", "הגשות"], ["hol", "חגים וחופשות"], ["event", "אירועים אקדמיים"], ["track", "אירועי מסלול"]];

  var MOODLE_URL = "https://moodle.runi.ac.il/2027/calendar/view.php?view=upcoming";

  // המטלות מהגיליון ועוד המטלות מ-Moodle. מטלה מ-Moodle שכבר יש לה שורה בגיליון (אותו קורס ואותו יום) לא מופיעה פעמיים
  function allTasks() {
    var sheet = tab("מטלות");
    var seen = {};
    sheet.forEach(function (t) { seen[(t["קורס"] || "") + "|" + t["דדליין"]] = true; });
    var moodle = (data.moodleTasks || []).filter(function (m) { return !seen[m.course + "|" + m.date]; }).map(function (m) {
      return { "קורס": m.course, "שם המטלה": m.name, "דדליין": m.date, "שעה": m.time, "אופן הגשה": "Moodle", "קישור": MOODLE_URL, moodle: true };
    });
    return sheet.concat(moodle);
  }

  // כל המועדים: לשונית המועדים ועוד הדדליינים של המטלות
  function events() {
    var list = tab("מועדים").map(function (r) {
      return { date: r["תאריך"], end: r["תאריך סיום"] || "", time: r["שעה"] || "", type: r["סוג"] || "", kind: kindOf(r["סוג"]),
               title: r["כותרת"] || "", course: r["קורס"] || "", place: r["מיקום"] || "", notes: r["הערות"] || "" };
    });
    allTasks().forEach(function (r) {
      list.push({ date: r["דדליין"], end: "", time: r["שעה"] || "", type: "הגשה", kind: "sub",
                  title: r["שם המטלה"] || "", course: r["קורס"] || "", place: r["אופן הגשה"] ? "הגשה ב-" + r["אופן הגשה"] : "", notes: r["מה נדרש"] || "" });
    });
    return list.filter(function (e) { return S.parseDate(e.date); })
      .sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
  }
  function upcoming(list) {
    return list.filter(function (e) { return e.date >= todayIso || (e.end && e.end >= todayIso); });
  }

  function tag(e) { return '<span class="tag ' + e.kind + '">' + esc(e.type) + "</span>"; }

  function when(e) {
    var s = S.dayName(e.date) + ", " + S.shortDate(e.date);
    if (e.end) s += "–" + S.shortDate(e.end);
    if (e.time) s += " · " + e.time;
    return s;
  }

  function gcal(e) {
    var d = e.date.replace(/-/g, ""), dates;
    if (/^\d{2}:\d{2}$/.test(e.time)) {
      var start = new Date(S.parseDate(e.date).getTime());
      start.setHours(+e.time.slice(0, 2), +e.time.slice(3));
      var end = new Date(start.getTime() + (e.kind === "exam" ? 3 : 1) * 36e5);
      var f = function (x) { return S.iso(x).replace(/-/g, "") + "T" + String(x.getHours()).padStart(2, "0") + String(x.getMinutes()).padStart(2, "0") + "00"; };
      dates = f(start) + "/" + f(end);
    } else {
      var last = S.parseDate(e.end || e.date); last.setDate(last.getDate() + 1);
      dates = d + "/" + S.iso(last).replace(/-/g, "");
    }
    var q = { action: "TEMPLATE", text: e.title, dates: dates, ctz: "Asia/Jerusalem", details: [e.course, e.notes].filter(Boolean).join(" · "), location: e.place };
    return "https://calendar.google.com/calendar/render?" + Object.keys(q).map(function (k) { return k + "=" + encodeURIComponent(q[k] || ""); }).join("&");
  }

  /* ---------- עדכונים (דף הבית) ---------- */

  function renderUpdates() {
    var s = S.session();
    var first = s && s.name ? s.name.split(" ")[0] : "";
    document.getElementById("hello").textContent = (first ? "שלום " + first + ". " : "") + "מה חדש במסלול, ומה מחכה לכם בימים הקרובים.";

    var main = [];
    var changes = (data.lessonChanges || []).filter(function (c) { var n = S.daysUntil(c.date); return n >= 0 && n <= 14; });
    if (changes.length) main.push(changesCard(changes, "שינויים בשיעורים בשבועיים הקרובים"));

    var posts = tab("עדכונים").filter(function (p) { return !p["תאריך פרסום"] || p["תאריך פרסום"] <= todayIso; })
      .sort(function (a, b) {
        var pa = a["נעוץ"] === "כן", pb = b["נעוץ"] === "כן";
        if (pa !== pb) return pa ? -1 : 1;
        return String(b["תאריך פרסום"]).localeCompare(String(a["תאריך פרסום"]));
      });
    main.push('<section class="card" aria-labelledby="h-feed"><h2 class="t2" id="h-feed">מהנציג</h2>' +
      (posts.length ? '<ul class="list">' + posts.map(function (p) {
        return '<li class="post"><div class="item-head">' + (p["נעוץ"] === "כן" ? '<span class="tag pin">נעוץ</span>' : "") +
          '<span class="meta" style="margin:0">' + esc(S.shortDate(p["תאריך פרסום"])) + "</span></div>" +
          "<h3>" + esc(p["כותרת"]) + "</h3><p>" + esc(p["תוכן"]) + "</p></li>";
      }).join("") + "</ul>" : '<p class="empty">עוד אין עדכונים. כשיהיו, הם יופיעו כאן.</p>') + "</section>");

    tab("סקרים").forEach(function (q) {
      var url = S.safeUrl(q["קישור לטופס"]);
      if (!url) return;
      main.push('<section class="card soft"><p class="eyebrow">סקר פתוח</p><h2 class="t2">' + esc(q["כותרת"]) + "</h2>" +
        (q["תיאור"] ? "<p>" + esc(q["תיאור"]) + "</p>" : "") +
        (q["נסגר"] ? '<p class="hint">נסגר ב-' + esc(S.shortDate(q["נסגר"])) + ".</p>" : "") +
        '<div class="row-btns"><a class="btn" href="' + esc(url) + '" target="_blank" rel="noopener">למילוי הסקר</a></div></section>');
    });
    document.getElementById("updates-main").innerHTML = main.join("");

    var side = [];
    if (s && s.admin) side.push(summaryCard());
    var all = upcoming(events());
    var exam = all.filter(function (e) { return e.kind === "exam" && e.date >= todayIso; })[0];
    if (exam) {
      var n = S.daysUntil(exam.date);
      side.push('<section class="card countdown" aria-labelledby="h-exam"><p class="eyebrow" id="h-exam">המבחן הקרוב</p>' +
        "<h2 class=\"t2\" style=\"margin:0\">" + esc(exam.course || exam.title) + "</h2>" +
        '<span class="big num">' + (n === 0 ? "היום" : n) + "</span>" +
        (n === 0 ? "" : '<span class="muted">' + (n === 1 ? "יום" : "ימים") + "</span>") +
        '<p class="meta" style="justify-content:center">' + esc(when(exam)) + "</p></section>");
    }
    var soon = all.filter(function (e) { return e !== exam; }).slice(0, 5);
    side.push('<section class="card" aria-labelledby="h-soon"><h2 class="t2" id="h-soon">בקרוב</h2>' +
      (soon.length ? '<ul class="list">' + soon.map(function (e) {
        return '<li><div class="item-head">' + tag(e) + "<b>" + esc(e.title) + '</b></div><div class="meta">' + esc(when(e)) +
          (e.course && e.course !== "כללי" ? " · " + esc(e.course) : "") + "</div></li>";
      }).join("") + '</ul><div class="row-btns"><a class="linkbtn" href="#week">לכל המועדים</a></div>' : '<p class="empty">אין מועדים קרובים.</p>') + "</section>");
    side.push('<section class="card soft" aria-labelledby="h-quick"><h2 class="t2" id="h-quick">צריכים משהו?</h2>' +
      '<p style="margin:0">שאלה, בעיה או בקשה שנוגעת לכל המסלול? אפשר לפנות לנציג.</p>' +
      '<div class="row-btns"><a class="btn" href="inquiry.html">פנייה לנציג</a><a class="btn ghost" href="takanonim/index.html">תקנונים</a></div></section>');
    document.getElementById("updates-side").innerHTML = side.join("");
  }

  function changesCard(list, title) {
    return '<section class="card warn" aria-labelledby="h-ch-' + title.length + '"><h2 class="t2" id="h-ch-' + title.length + '">' + esc(title) + "</h2>" +
      '<ul class="list">' + list.map(function (c) {
        return '<li class="change"><span class="kind">' + esc(c.kind) + " · " + esc(S.dayName(c.date)) + ", " + esc(S.shortDate(c.date)) +
          (c.start ? ", " + esc(c.start) + (c.end ? "–" + esc(c.end) : "") : "") + "</span>" +
          "<span>" + esc(c.title) + (c.type ? " (" + esc(c.type) + ")" : "") + "</span>" +
          '<span class="meta" style="color:inherit;opacity:.85">' + (c.location ? esc(c.location) + ". " : "") + (c.regular ? "בדרך כלל: " + esc(c.regular) : "") + "</span>" +
          whereBox(c.location) + "</li>";
      }).join("") + '</ul><p class="hint" style="color:inherit;margin:.75rem 0 0">מתוך היומן של תחנת המידע. שינויים בקבוצות תרגול אחרות לא תמיד מופיעים כאן, אז כדאי לבדוק גם ב-Moodle.</p></section>';
  }

  /* ---------- איפה החדר ---------- */

  // הבניין של חדר: לפי שם הבניין שמופיע בטקסט (כמו ביומן של תחנת המידע), ואם אין, לפי האותיות שבתחילת קוד החדר (A318 → A)
  function building(text) {
    text = String(text || "").trim();
    if (!text || /^zoom$/i.test(text) || text === "טרם נקבע") return null;
    var rows = tab("בניינים").filter(function (b) { return b["שם הבניין"]; });
    var byName = rows.filter(function (b) { return text.indexOf(b["שם הבניין"]) !== -1; })[0];
    if (byName) return byName;
    var m = text.toUpperCase().match(/^([A-Z]+)[.\d]/);
    if (!m) return null;
    return rows.filter(function (b) {
      return String(b["אותיות בחדר"] || "").toUpperCase().split(/[\s,]+/).indexOf(m[1]) !== -1;
    })[0] || null;
  }

  function whereHtml(b, room) {
    var map = S.safeUrl(b["קישור למפה"]) || S.safeUrl(setting("קישור למפת הקמפוס"));
    return "<p>" + (room ? "החדר " + esc(room) + " נמצא" : "זה") + " בבניין <b>" + esc(b["שם הבניין"]) + "</b>.</p>" +
      (b["איך מגיעים"] ? "<p>" + esc(b["איך מגיעים"]) + "</p>" : "") +
      (map ? '<p><a href="' + esc(map) + '" target="_blank" rel="noopener">פתיחה במפה</a></p>' : "");
  }

  function whereBox(text) {
    var b = building(text);
    if (!b) return "";
    var room = String(text).trim().split(/\s+/)[0];
    if (!/[0-9]/.test(room)) room = "";
    return '<details class="where"><summary>איפה זה?</summary>' + whereHtml(b, room) + "</details>";
  }

  function renderRoomLookup() {
    var el = document.getElementById("room-lookup");
    if (!el) return;
    if (!tab("בניינים").length) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = '<h2 class="t2" id="h-room">איפה החדר?</h2>' +
      '<form class="room-form" id="room-form"><label class="sr-only" for="room-q">קוד החדר</label>' +
      '<input class="input" id="room-q" dir="ltr" autocomplete="off" placeholder="למשל A318 או C.L05">' +
      '<button class="btn" type="submit">חיפוש</button></form><div id="room-out" aria-live="polite"></div>';
  }

  /* ---------- סיכום שבועי (רק למנהל) ---------- */

  var SITE_URL = "https://idcwebsitetlat-ui.github.io/track-site/";

  function summaryRange() {
    var from = S.today();
    if (ui.summaryRange === "week") from.setDate(from.getDate() + (7 - from.getDay()) % 7);
    var to = new Date(from.getTime()); to.setDate(to.getDate() + 6);
    return { from: S.iso(from), to: S.iso(to) };
  }

  function summaryText() {
    var r = summaryRange();
    var inRange = function (e) { return e.date <= r.to && (e.end || e.date) >= r.from; };
    var all = events().filter(inRange);
    var line = function (e) {
      return "• " + S.dayName(e.date) + " " + S.shortDate(e.date) + (e.end ? "–" + S.shortDate(e.end) : "") + (e.time ? ", " + e.time : "") +
        " · " + [e.course && e.course !== "כללי" ? e.course : "", e.title].filter(Boolean).join(", ");
    };
    var parts = ["*סיכום שבועי · " + S.shortDate(r.from) + " עד " + S.shortDate(r.to) + "*"];
    var group = function (title, list) { if (list.length) parts.push("*" + title + "*\n" + list.join("\n")); };
    group("מבחנים", all.filter(function (e) { return e.kind === "exam"; }).map(line));
    group("הגשות", all.filter(function (e) { return e.kind === "sub"; }).map(line));
    group("שינויים בשיעורים", (data.lessonChanges || []).filter(function (c) { return c.date >= r.from && c.date <= r.to; }).map(function (c) {
      return "• " + S.dayName(c.date) + " " + S.shortDate(c.date) + (c.start ? ", " + c.start : "") + " · " + c.title + ": " + c.kind +
        (c.location && c.kind !== "בזום" ? " (" + c.location.split(/\s+/)[0] + ")" : "");
    }));
    group("חגים וחופשות", all.filter(function (e) { return e.kind === "hol"; }).map(line));
    group("אירועים", all.filter(function (e) { return e.kind === "event" || e.kind === "track"; }).map(line));
    if (parts.length === 1) parts.push("שבוע שקט: אין מבחנים, הגשות או שינויים בשיעורים.");
    var exam = events().filter(function (e) { return e.kind === "exam" && e.date > r.to; })[0];
    if (exam) parts.push("עוד " + S.daysUntil(exam.date) + " ימים למבחן הקרוב (" + [exam.course, S.shortDate(exam.date)].filter(Boolean).join(", ") + ").");
    parts.push("כל הפרטים באתר המסלול: " + SITE_URL);
    return parts.join("\n\n");
  }

  function summaryCard() {
    var text = summaryText();
    return '<section class="card admin" aria-labelledby="h-sum"><p class="eyebrow">רק אתה רואה את זה</p>' +
      '<h2 class="t2" id="h-sum">סיכום שבועי לקבוצה</h2>' +
      '<div class="chips" role="group" aria-label="טווח הסיכום">' +
      [["next7", "7 הימים הקרובים"], ["week", "משבוע ראשון הקרוב"]].map(function (f) {
        return '<button type="button" class="chip" data-sum="' + f[0] + '" aria-pressed="' + ((ui.summaryRange || "next7") === f[0]) + '">' + f[1] + "</button>";
      }).join("") + "</div>" +
      '<label class="sr-only" for="sum-text">טקסט הסיכום</label><textarea class="input sum-text" id="sum-text" dir="rtl">' + esc(text) + "</textarea>" +
      '<p class="hint">אפשר לערוך את הטקסט לפני ההעתקה. כוכביות הופכות להדגשה בוואטסאפ.</p>' +
      '<div class="row-btns"><button type="button" class="btn" id="sum-copy">העתקה</button>' +
      '<a class="btn ghost" id="sum-wa" href="https://wa.me/?text=' + encodeURIComponent(text) + '" target="_blank" rel="noopener">פתיחה בוואטסאפ</a></div></section>';
  }

  /* ---------- מועדים ---------- */

  function renderWeek() {
    var all = upcoming(events());
    document.getElementById("week-filters").innerHTML = FILTERS.map(function (f) {
      return '<button type="button" class="chip" data-week="' + f[0] + '" aria-pressed="' + (ui.weekFilter === f[0]) + '">' + f[1] + "</button>";
    }).join("");

    var shown = all.filter(function (e) { return ui.weekFilter === "all" || e.kind === ui.weekFilter; });
    var months = {};
    shown.forEach(function (e) { var k = e.date.slice(0, 7); (months[k] = months[k] || []).push(e); });
    var html = Object.keys(months).map(function (k) {
      var d = S.parseDate(k + "-01");
      return '<section class="month"><h2>' + S.MONTHS[d.getMonth()] + " " + d.getFullYear() + '</h2><ul class="tl stagger">' + months[k].map(function (e) {
        var dd = S.parseDate(e.date);
        return '<li><div class="d"><b class="num">' + dd.getDate() + "</b><span>" + esc(S.dayName(e.date)) + "</span></div>" +
          '<div><div class="item-head">' + tag(e) + "<b>" + esc(e.title) + "</b></div>" +
          '<div class="meta">' + [e.end ? "עד " + esc(S.shortDate(e.end)) : "", e.time ? esc(e.time) : "", e.course && e.course !== "כללי" ? esc(e.course) : "", e.place ? esc(e.place) : ""].filter(Boolean).join(" · ") + "</div>" +
          (e.notes ? '<div class="meta">' + esc(e.notes) + "</div>" : "") + (e.kind !== "sub" ? whereBox(e.place) : "") + "</div>" +
          '<a class="cal" href="' + esc(gcal(e)) + '" target="_blank" rel="noopener" aria-label="הוספה ליומן: ' + esc(e.title) + '">הוספה ליומן</a></li>';
      }).join("") + "</ul></section>";
    }).join("");
    document.getElementById("timeline").innerHTML = html || '<p class="empty">אין מועדים מהסוג הזה בהמשך הסמסטר.</p>';

    var side = [];
    var weekEnd = S.iso(new Date(S.today().getTime() + 7 * 864e5));
    var week = all.filter(function (e) { return (e.kind === "sub" || e.kind === "event" || e.kind === "track") && e.date >= todayIso && e.date < weekEnd; });
    side.push('<section class="card" aria-labelledby="h-7"><h2 class="t2" id="h-7">השבוע הקרוב</h2><p class="hint" style="margin:-.4rem 0 .6rem">הגשות ואירועים ב-7 הימים הקרובים</p>' +
      (week.length ? '<ul class="list">' + week.map(function (e) {
        return '<li><div class="item-head">' + tag(e) + "<b>" + esc(e.title) + '</b></div><div class="meta">' + esc(S.relDays(S.daysUntil(e.date))) + " · " + esc(when(e)) + "</div></li>";
      }).join("") + "</ul>" : '<p class="empty">אין הגשות או אירועים בשבוע הקרוב.</p>') + "</section>");
    var changes = (data.lessonChanges || []);
    if (changes.length) side.push(changesCard(changes, "שינויים בשיעורים"));
    var calUrl = S.safeUrl(setting("קישור ליומן המסלול"));
    if (calUrl) side.push('<section class="card soft"><h2 class="t2">כל המועדים ביומן שלכם</h2><p style="margin:0">היומן של המסלול מתעדכן לבד כשמתווסף מועד.</p>' +
      '<div class="row-btns"><a class="btn" href="' + esc(calUrl) + '" target="_blank" rel="noopener">הוספה ליומן שלי</a></div></section>');
    var acad = S.safeUrl(setting("קישור ללוח השנה האקדמי"));
    if (acad) side.push('<p class="hint" style="margin:0">החגים והחופשות לפי <a href="' + esc(acad) + '" target="_blank" rel="noopener">לוח השנה האקדמי של רייכמן</a>.</p>');
    document.getElementById("week-side").innerHTML = side.join("");
  }

  /* ---------- מטלות ותנאי סף ---------- */

  function renderTasks() {
    var tasks = allTasks().filter(function (t) { return S.parseDate(t["דדליין"]); })
      .sort(function (a, b) { return (a["דדליין"] + (a["שעה"] || "")) < (b["דדליין"] + (b["שעה"] || "")) ? -1 : 1; });
    var past = tasks.filter(function (t) { return t["דדליין"] < todayIso; });
    var shown = ui.showPastTasks ? tasks : tasks.filter(function (t) { return t["דדליין"] >= todayIso; });
    var byCourse = {};
    shown.forEach(function (t) { var c = t["קורס"] || "כללי"; (byCourse[c] = byCourse[c] || []).push(t); });

    var html = Object.keys(byCourse).map(function (c) {
      var course = tab("קורסים").filter(function (k) { return k["שם הקורס"] === c; })[0];
      var drive = course && S.safeUrl(course["קישור לדרייב"]);
      return '<section class="card"><div class="course-row"><h2 class="course-h">' + esc(c) + "</h2>" +
        (drive ? '<a class="linkbtn" href="' + esc(drive) + '" target="_blank" rel="noopener">חומרים בדרייב</a>' : "") + '</div><ul class="list">' + byCourse[c].map(function (t) {
        var n = S.daysUntil(t["דדליין"]);
        var link = S.safeUrl(t["קישור"]);
        return '<li><div class="item-head"><b>' + esc(t["שם המטלה"]) + "</b>" + (t["סוג"] ? '<span class="tag sub">' + esc(t["סוג"]) + "</span>" : "") +
          (t["נספר לתנאי סף"] === "כן" ? '<span class="tag event">נספר לתנאי סף</span>' : "") + "</div>" +
          '<div class="meta"><span class="due' + (n >= 0 && n <= 3 ? " soon" : "") + '">' + esc(S.relDays(n)) + "</span>" +
          "<span>" + esc(S.dayName(t["דדליין"])) + ", " + esc(S.shortDate(t["דדליין"])) + (t["שעה"] ? " · " + esc(t["שעה"]) : "") + "</span>" +
          (t["אופן הגשה"] ? "<span>הגשה ב-" + esc(t["אופן הגשה"]) + "</span>" : "") + "</div>" +
          (t["מה נדרש"] ? '<p style="margin:.35rem 0 0">' + esc(t["מה נדרש"]) + "</p>" : "") +
          (link ? '<a class="linkbtn" href="' + esc(link) + '" target="_blank" rel="noopener">' + (t.moodle ? "לפרטים ב-Moodle" : "לפרטי המטלה") + "</a>" : "") + "</li>";
      }).join("") + "</ul></section>";
    }).join("");
    if (!html) html = '<section class="card"><p class="empty">' + (tasks.length ? "אין מטלות פתוחות כרגע." : "עוד לא נוספו מטלות.") + "</p></section>";
    if (data.moodleTasks) html += '<p class="hint" style="margin:0">המטלות מתעדכנות אוטומטית מ-Moodle, לפי הקבוצות של נציג המסלול. מטלה של קבוצת תרגול אחרת אולי לא תופיע כאן.</p>';
    if (past.length) html += '<div><button type="button" class="linkbtn" id="toggle-past">' + (ui.showPastTasks ? "הסתרת מטלות שמועדן עבר" : "הצגת מטלות שמועדן עבר (" + past.length + ")") + "</button></div>";
    document.getElementById("tasks-main").innerHTML = html;
    renderThresholds();
  }

  var THKEY = "track-thresholds";
  function thState() { return S.store(THKEY) || {}; }

  function renderThresholds() {
    var rows = tab("תנאי סף");
    var st = thState();
    var html = '<section class="card" aria-labelledby="h-th"><h2 class="t2" id="h-th">מעקב תנאי סף</h2>' +
      '<p class="hint" style="margin:-.4rem 0 .8rem">סמנו כמה הגשתם או כמה פעמים נעדרתם. המעקב נשמר רק בדפדפן הזה ולא נשלח לאף אחד.</p>';
    html += rows.length ? '<ul class="list">' + rows.map(function (r, i) {
      var key = (r["קורס"] || "") + "|" + (r["סוג התנאי"] || "");
      var have = st[key] || 0;
      var need = Number(r["נדרש"]) || 0;
      var absence = String(r["סוג התנאי"] || "").indexOf("היעדרויות") !== -1;
      var unit = r["יחידה"] || "";
      var pct = need ? Math.min(100, Math.round(have / need * 100)) : 0;
      var over = absence && need && have > need;
      var status = absence
        ? (need ? "השתמשת ב-" + have + " מתוך " + need + " " + unit : "נעדרת " + have + " פעמים")
        : (need ? have + " מתוך " + need + " " + unit : have + " " + unit + ". המספר הנדרש עוד לא פורסם");
      return '<li><div class="track"><div><div class="item-head"><b>' + esc(r["קורס"]) + '</b></div><div class="meta">' + esc(r["סוג התנאי"]) +
        (need && !absence ? " · נדרש " + need + (r["מתוך"] ? " מתוך " + esc(r["מתוך"]) : "") : "") + "</div></div>" +
        '<div class="stepper"><button type="button" class="icon-btn" data-th="' + i + '" data-d="-1" aria-label="הפחתה: ' + esc(r["קורס"] + ", " + r["סוג התנאי"]) + '">−</button>' +
        '<output aria-live="polite" class="num">' + have + (need ? " / " + need : "") + "</output>" +
        '<button type="button" class="icon-btn" data-th="' + i + '" data-d="1" aria-label="הוספה: ' + esc(r["קורס"] + ", " + r["סוג התנאי"]) + '">+</button></div>' +
        (need ? '<div class="bar' + (over ? " over" : "") + '" aria-hidden="true"><i style="width:' + (absence ? Math.min(100, Math.round(have / need * 100)) : pct) + '%"></i></div>' : "") +
        "</div>" + '<div class="meta"' + (over ? ' style="color:var(--danger);font-weight:700"' : "") + ">" + esc(over ? "עברת את מספר ההיעדרויות המותר. כדאי לבדוק מול המרצה." : status) + "</div>" +
        (r["הערה"] ? '<div class="meta">' + esc(r["הערה"]) + "</div>" : "") + "</li>";
    }).join("") + "</ul>" : '<p class="empty">עוד לא הוגדרו תנאי סף.</p>';
    html += "</section>";
    document.getElementById("tasks-side").innerHTML = html;
  }

  /* ---------- אנשי קשר ---------- */

  function renderContacts() {
    var rows = tab("אנשי קשר").filter(function (r) { return r["שם"] || r["מייל"]; });
    var courses = [];
    rows.forEach(function (r) { var c = r["קורס"] || "כללי"; if (courses.indexOf(c) === -1) courses.push(c); });
    if (ui.contactFilter !== "all" && courses.indexOf(ui.contactFilter) === -1) ui.contactFilter = "all";
    document.getElementById("contact-filters").innerHTML = [["all", "הכול"]].concat(courses.map(function (c) { return [c, c]; })).map(function (f) {
      return '<button type="button" class="chip" data-contact="' + esc(f[0]) + '" aria-pressed="' + (ui.contactFilter === f[0]) + '">' + esc(f[1]) + "</button>";
    }).join("");

    var html = courses.filter(function (c) { return ui.contactFilter === "all" || ui.contactFilter === c; }).map(function (c) {
      return '<section class="card"><h2 class="course-h">' + esc(c) + '</h2><ul class="list">' + rows.filter(function (r) { return (r["קורס"] || "כללי") === c; }).map(function (r) {
        var mail = String(r["מייל"] || "").trim();
        var valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail);
        return '<li class="contact"><div><b>' + esc(r["שם"] || r["תפקיד"]) + '</b><div class="meta">' + esc(r["שם"] ? r["תפקיד"] : "") +
          (r["שעות קבלה"] ? " · שעות קבלה: " + esc(r["שעות קבלה"]) : "") + "</div>" +
          (valid ? '<div class="mail"><a href="mailto:' + esc(mail) + '" dir="ltr">' + esc(mail) + "</a>" +
            '<button type="button" class="icon-btn" data-copy="' + esc(mail) + '" aria-label="העתקת המייל של ' + esc(r["שם"] || r["תפקיד"]) + '">' +
            '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15V5a1 1 0 0 1 1-1h10"></path></svg></button></div>'
            : '<div class="meta">' + esc(r["מקור המייל"] && !/סילבוס$/.test(r["מקור המייל"]) ? r["מקור המייל"] : "המייל לא פורסם") + "</div>") +
          "</div></li>";
      }).join("") + "</ul></section>";
    }).join("");
    document.getElementById("contacts").innerHTML = html || '<p class="empty">עוד אין אנשי קשר.</p>';
  }

  /* ---------- קישורים ---------- */

  function renderLinks() {
    var rows = tab("קישורים").filter(function (r) { return S.safeUrl(r["קישור"]); });
    var types = [];
    rows.forEach(function (r) { if (r["סוג"] && types.indexOf(r["סוג"]) === -1) types.push(r["סוג"]); });
    if (ui.linkFilter !== "all" && types.indexOf(ui.linkFilter) === -1) ui.linkFilter = "all";
    document.getElementById("link-filters").innerHTML = types.length > 1 ? [["all", "הכול"]].concat(types.map(function (t) { return [t, t]; })).map(function (f) {
      return '<button type="button" class="chip" data-link="' + esc(f[0]) + '" aria-pressed="' + (ui.linkFilter === f[0]) + '">' + esc(f[1]) + "</button>";
    }).join("") : "";
    var html = rows.filter(function (r) { return ui.linkFilter === "all" || r["סוג"] === ui.linkFilter; }).map(function (r) {
      return '<section class="card"><div class="item-head">' + (r["סוג"] ? '<span class="tag sub">' + esc(r["סוג"]) + "</span>" : "") +
        (r["קורס"] && r["קורס"] !== "כללי" ? '<span class="meta" style="margin:0">' + esc(r["קורס"]) + "</span>" : "") + "</div>" +
        '<h2 class="t2" style="margin:.4rem 0 .25rem">' + esc(r["כותרת"]) + "</h2>" +
        (r["תיאור"] ? '<p style="margin:0">' + esc(r["תיאור"]) + "</p>" : "") +
        '<div class="row-btns"><a class="btn ghost" href="' + esc(S.safeUrl(r["קישור"])) + '" target="_blank" rel="noopener">פתיחה</a></div></section>';
    }).join("");
    var drive = tab("קורסים").filter(function (c) { return S.safeUrl(c["קישור לדרייב"]); });
    var driveHtml = drive.length ? '<section class="card soft drive"><h2 class="t2">חומרים בדרייב לפי קורס</h2><ul class="drive-list">' + drive.map(function (c) {
      return '<li><a class="btn ghost" href="' + esc(S.safeUrl(c["קישור לדרייב"])) + '" target="_blank" rel="noopener">' + esc(c["שם הקורס"] || c["קוד"]) + "</a></li>";
    }).join("") + "</ul></section>" : "";
    document.getElementById("links").innerHTML = (driveHtml + html) || '<p class="empty">עוד אין קישורים. נציג המסלול יוסיף אותם בקרוב.</p>';
    renderRoomLookup();
  }

  /* ---------- שיעורים פרטיים ---------- */

  function renderTutoring() {
    var rows = tab("שיעורים פרטיים");
    var wa = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 0 1-11.8 7L4 20l1.1-4A8 8 0 1 1 20 12z"></path></svg>';
    document.getElementById("tutoring").innerHTML = rows.length ? rows.map(function (r) {
      var reg = S.safeUrl(r["קישור להרשמה"]), group = S.safeUrl(r["קישור לקבוצת וואטסאפ"]);
      return '<section class="card"><p class="eyebrow">' + esc([r["הערה"], r["עלות"]].filter(Boolean).join(" · ")) + "</p>" +
        '<h2 class="t2" style="margin-bottom:.35rem">' + esc(r["קורס"]) + "</h2>" +
        (r["תיאור"] ? '<p style="margin:0 0 .5rem">' + esc(r["תיאור"]) + "</p>" : "") +
        (r["איך נרשמים"] ? '<p class="meta" style="margin:0">איך נרשמים: ' + esc(r["איך נרשמים"]) + "</p>" : "") +
        '<div class="row-btns">' + (reg ? '<a class="btn" href="' + esc(reg) + '" target="_blank" rel="noopener">לקורס</a>' : "") +
        (group ? '<a class="btn ghost" href="' + esc(group) + '" target="_blank" rel="noopener">' + wa + "לקבוצת הוואטסאפ</a>" : "") + "</div></section>";
    }).join("") : '<section class="card"><p class="empty">כרגע אין שיעורים פרטיים דרך האוניברסיטה.</p></section>';
  }

  /* ---------- טעינה ואירועים ---------- */

  function renderAll(d) {
    data = d;
    renderUpdates(); renderWeek(); renderTasks(); renderContacts(); renderLinks(); renderTutoring();
  }

  ["updates-main", "updates-side", "timeline", "tasks-main", "contacts"].forEach(function (id) {
    document.getElementById(id).innerHTML = '<section class="card" aria-busy="true"><span class="sr-only">טוען…</span><div class="skeleton" style="width:40%"></div><div class="skeleton"></div><div class="skeleton" style="width:80%"></div></section>';
  });

  S.loadContent(renderAll, function () {
    document.getElementById("updates-main").innerHTML = '<section class="card warn" role="alert"><h2 class="t2">אין חיבור לשרת כרגע</h2>' +
      '<p style="margin:0">בדקו את החיבור לאינטרנט ונסו שוב. אם זה חוזר, כתבו לנציג המסלול.</p><div class="row-btns"><button type="button" class="btn" onclick="location.reload()">ניסיון נוסף</button></div></section>';
    document.getElementById("updates-side").innerHTML = "";
  });

  document.addEventListener("input", function (e) {
    if (e.target.id === "sum-text") document.getElementById("sum-wa").href = "https://wa.me/?text=" + encodeURIComponent(e.target.value);
  });

  document.addEventListener("submit", function (e) {
    if (e.target.id !== "room-form") return;
    e.preventDefault();
    var q = document.getElementById("room-q").value.trim();
    var b = building(q);
    document.getElementById("room-out").innerHTML = !q ? "" : b ? '<div class="where-out">' + whereHtml(b, /[0-9]/.test(q) ? q.toUpperCase() : "") + "</div>" :
      '<p class="hint">לא מצאתי בניין לחדר הזה. בדקו את הקוד ביומן של תחנת המידע, למשל A318 או SL401.</p>';
  });

  document.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !data) return;
    if (b.dataset.week) { ui.weekFilter = b.dataset.week; renderWeek(); document.querySelector('[data-week="' + ui.weekFilter + '"]').focus(); }
    else if (b.dataset.contact) { ui.contactFilter = b.dataset.contact; renderContacts(); document.querySelector('[data-contact="' + CSS.escape(ui.contactFilter) + '"]').focus(); }
    else if (b.dataset.link) { ui.linkFilter = b.dataset.link; renderLinks(); document.querySelector('[data-link="' + CSS.escape(ui.linkFilter) + '"]').focus(); }
    else if (b.dataset.copy) { S.copy(b.dataset.copy, "המייל הועתק"); }
    else if (b.dataset.sum) { ui.summaryRange = b.dataset.sum; renderUpdates(); document.querySelector('[data-sum="' + ui.summaryRange + '"]').focus(); }
    else if (b.id === "sum-copy") { S.copy(document.getElementById("sum-text").value, "הסיכום הועתק. אפשר להדביק בקבוצה"); }
    else if (b.id === "toggle-past") { ui.showPastTasks = !ui.showPastTasks; renderTasks(); document.getElementById("toggle-past").focus(); }
    else if (b.dataset.th) {
      var r = tab("תנאי סף")[+b.dataset.th];
      var key = (r["קורס"] || "") + "|" + (r["סוג התנאי"] || "");
      var st = thState();
      st[key] = Math.max(0, (st[key] || 0) + Number(b.dataset.d));
      S.store(THKEY, st);
      renderThresholds();
      var again = document.querySelector('[data-th="' + b.dataset.th + '"][data-d="' + b.dataset.d + '"]');
      if (again) again.focus();
    }
  });
})();
