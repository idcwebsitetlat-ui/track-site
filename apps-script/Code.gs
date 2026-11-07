/**
 * אתר המסלול: השרת (Google Apps Script)
 *
 * שלוש פעולות, כולן ב-POST עם גוף JSON (Content-Type: text/plain, כדי שהדפדפן לא ישלח בקשת preflight):
 *   {action: "login",   first, last}                     → {ok, token, name} או {ok:false, error}
 *   {action: "content", token}                           → {ok, tabs, settings}
 *   {action: "inquiry", token, course, topic, details, anon, consent} → {ok, id, waNumber, waText}
 *
 * הסוד לאסימוני הכניסה (TOKEN_SECRET) נשמר ב-Script properties ונוצר אוטומטית בהרצה הראשונה של setup().
 */

// המזהים מהכתובות של הגיליונות (החלק שבין /d/ ל-/edit)
var CONTENT_SHEET_ID = '1eNZPQeE3RjBze3OMqmRLoh_Ru7FLRujHyEjH_BSJYWc';  // אתר המסלול - תוכן
var PRIVATE_SHEET_ID = '1UriqimIdZeBpVWvIOXWhMaVEkoUcufSkXsIZp3VjgSg';  // אתר המסלול - פרטי

var TZ = 'Asia/Jerusalem';
var TOKEN_DAYS = 30;
var CACHE_SECONDS = 300;
var EXAMPLE_PREFIX = '(דוגמה)';
// לשוניות שלא נשלחות לאתר
var HIDDEN_TABS = ['מקרא'];
// שדות בלשונית "הגדרות" שהאתר לא צריך
var HIDDEN_SETTINGS = ['מייל לקבלת התראות על פניות'];

// ---------- נקודת הכניסה ----------

function doPost(e) {
  var req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'הבקשה לא תקינה.' });
  }
  try {
    if (req.action === 'login') return json_(login_(req));
    if (req.action === 'content') return json_(content_(req));
    if (req.action === 'inquiry') return json_(inquiry_(req));
    return json_({ ok: false, error: 'פעולה לא מוכרת.' });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'משהו השתבש בשרת. נסו שוב בעוד דקה.' });
  }
}

// בדיקה מהירה שהשרת חי, בלי לחשוף מידע
function doGet() {
  return json_({ ok: true, service: 'אתר המסלול' });
}

// ---------- כניסה ----------

function login_(req) {
  var input = normalizeName_(String(req.first || '') + ' ' + String(req.last || ''));
  if (input.split(' ').length < 2) {
    return { ok: false, error: 'צריך למלא גם שם פרטי וגם שם משפחה.' };
  }
  var match = findStudent_(input, readStudents_());
  if (!match) {
    Utilities.sleep(700);
    return { ok: false, error: 'השם לא מופיע ברשימת המסלול. בדקו את האיות, ואם זה לא עוזר, כתבו לנציג.' };
  }
  return { ok: true, token: makeToken_(match), name: match };
}

function readStudents_() {
  var sh = privateSheet_().getSheetByName('סטודנטים');
  var rows = sh.getDataRange().getValues().slice(1);
  return rows
    .filter(function (r) { return r[0] && String(r[1]).trim() !== 'לא'; })
    .map(function (r) { return String(r[0]).trim(); });
}

// מתעלם מרווחים כפולים, מקפים ומירכאות, ומאחד את צורות הגרש
function normalizeName_(s) {
  return String(s)
    .replace(/[֑-ׇ]/g, '')          // ניקוד וטעמים
    .replace(/[-־‐-―]/g, ' ')  // מקף רגיל, מקף עברי ומקפים ארוכים
    .replace(/["'׳״‘’“”`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// מקבל גם סדר הפוך: לכל נקודת חיתוך בשם המלא בודק גם "משפחה פרטי"
function findStudent_(input, students) {
  for (var i = 0; i < students.length; i++) {
    var words = normalizeName_(students[i]).split(' ');
    for (var k = 0; k < words.length; k++) {
      var rotated = words.slice(k).concat(words.slice(0, k)).join(' ');
      if (rotated === input) return students[i];
    }
  }
  return null;
}

// ---------- אסימון כניסה ----------

function makeToken_(name) {
  var payload = Utilities.base64EncodeWebSafe(JSON.stringify({
    n: name,
    exp: Date.now() + TOKEN_DAYS * 864e5
  }), Utilities.Charset.UTF_8);
  return payload + '.' + sign_(payload);
}

function readToken_(token) {
  var parts = String(token || '').split('.');
  if (parts.length !== 2 || sign_(parts[0]) !== parts[1]) return null;
  try {
    var data = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString('UTF-8'));
    return data.exp > Date.now() ? data : null;
  } catch (err) {
    return null;
  }
}

function sign_(text) {
  var secret = PropertiesService.getScriptProperties().getProperty('TOKEN_SECRET');
  if (!secret) throw new Error('TOKEN_SECRET חסר. הריצו את setup().');
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(text, secret));
}

function requireLogin_(req) {
  return readToken_(req.token);
}

// ---------- תוכן ----------

function content_(req) {
  if (!requireLogin_(req)) return { ok: false, error: 'login', message: 'צריך להיכנס מחדש.' };
  var cache = CacheService.getScriptCache();
  var hit = cache.get('content');
  if (hit) return JSON.parse(hit);

  var out = { ok: true, tabs: {}, settings: {}, updated: formatDate_(new Date(), 'yyyy-MM-dd HH:mm') };
  contentSheet_().getSheets().forEach(function (sh) {
    var name = sh.getName();
    if (HIDDEN_TABS.indexOf(name) !== -1) return;
    var rows = rowsToObjects_(sh.getDataRange().getValues());
    if (name === 'הגדרות') {
      rows.forEach(function (r) {
        if (r['שדה'] && HIDDEN_SETTINGS.indexOf(r['שדה']) === -1) out.settings[r['שדה']] = r['ערך'];
      });
      return;
    }
    out.tabs[name] = filterRows_(name, rows, new Date());
  });

  // אם אחד היומנים לא זמין, שאר התוכן עדיין נשלח, ונציג המסלול מקבל מייל
  var today = formatDate_(new Date(), 'yyyy-MM-dd');
  try {
    out.lessonChanges = lessonChanges_(fetchCalendar_('UNIV_CALENDAR_URL'), today);
  } catch (err) {
    console.error(err);
    out.lessonChanges = null;
    alertBrokenFeed_('UNIV_CALENDAR_URL', 'היומן של תחנת המידע (שינויים בשיעורים)', err);
  }
  try {
    out.moodleTasks = moodleTasks_(fetchCalendar_('MOODLE_CALENDAR_URL'), out.tabs['קורסים'] || []);
  } catch (err) {
    console.error(err);
    out.moodleTasks = null;
    alertBrokenFeed_('MOODLE_CALENDAR_URL', 'היומן של Moodle (מטלות)', err);
  }

  try { cache.put('content', JSON.stringify(out), CACHE_SECONDS); } catch (err) { /* גדול מדי לזיכרון המטמון */ }
  return out;
}

// השורה הראשונה היא הכותרות. תאריכים הופכים ל-yyyy-MM-dd ושעות ל-HH:mm
function rowsToObjects_(values) {
  var head = values[0].map(function (h) { return String(h).trim(); });
  return values.slice(1)
    .filter(function (r) { return r.some(function (c) { return c !== '' && c !== null; }); })
    .map(function (r) {
      var o = {};
      head.forEach(function (h, i) { if (h) o[h] = cell_(r[i]); });
      return o;
    });
}

function cell_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    // תא של שעה בלבד נשמר בגיליונות כתאריך בשנת 1899
    return v.getFullYear() < 1901 ? formatDate_(v, 'HH:mm') : formatDate_(v, 'yyyy-MM-dd');
  }
  // תאריך שהוקלד כטקסט, למשל 8.11.26 או 8/11/2026
  var m = typeof v === 'string' && v.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/);
  if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return v === null ? '' : v;
}

// שורות דוגמה, "פעיל = לא", "זמין = לא" וסקרים סגורים לא נשלחים לאתר
function filterRows_(tab, rows, now) {
  var today = formatDate_(now, 'yyyy-MM-dd');
  return rows.filter(function (r) {
    var first = String(r[Object.keys(r)[0]] || '');
    if (first.indexOf(EXAMPLE_PREFIX) === 0) return false;
    if (String(r['כותרת'] || '').indexOf(EXAMPLE_PREFIX) === 0) return false;
    if (String(r['שם המטלה'] || '').indexOf(EXAMPLE_PREFIX) === 0) return false;
    if (r['פעיל'] === 'לא' || r['זמין'] === 'לא') return false;
    if (tab === 'סקרים') {
      if (!r['קישור לטופס']) return false;
      if (r['נפתח'] && r['נפתח'] > today) return false;
      if (r['נסגר'] && r['נסגר'] < today) return false;
    }
    return true;
  });
}

// ---------- יומנים חיצוניים: תחנת המידע ו-Moodle ----------
// הקישורים נשמרים ב-Script properties (UNIV_CALENDAR_URL, MOODLE_CALENDAR_URL), כי יש בהם אסימון אישי

var CALENDAR_CACHE_SECONDS = 3600;
var REGULAR_MIN_COUNT = 3;  // מועד שחוזר לפחות 3 פעמים בקורס נחשב למועד הקבוע

function fetchCalendar_(key) {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('cal-' + key);
  if (hit) return hit;
  var url = PropertiesService.getScriptProperties().getProperty(key);
  if (!url) throw new Error(key + ' חסר ב-Script properties.');
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var text = res.getContentText('UTF-8');
  // קישור שפג תוקפו מחזיר בדרך כלל דף שגיאה ולא יומן
  if (res.getResponseCode() !== 200 || text.indexOf('BEGIN:VCALENDAR') === -1) {
    throw new Error('הקישור החזיר ' + res.getResponseCode() + ' בלי יומן');
  }
  try { cache.put('cal-' + key, text, CALENDAR_CACHE_SECONDS); } catch (err) { /* גדול מדי לזיכרון המטמון */ }
  return text;
}

// מייל אחד ביום לכל היותר, לכל יומן שהפסיק לעבוד
function alertBrokenFeed_(key, label, err) {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty(key)) return;  // יומן שעוד לא הוגדר הוא לא תקלה
  var today = formatDate_(new Date(), 'yyyy-MM-dd');
  if (props.getProperty('ALERT_' + key) === today) return;
  var to = readSettings_()['מייל לקבלת התראות על פניות'];
  if (!to) return;
  props.setProperty('ALERT_' + key, today);
  MailApp.sendEmail({
    to: to,
    subject: 'אתר המסלול: ' + label + ' הפסיק לעבוד',
    body: 'השרת לא הצליח לקרוא את ' + label + '.\n\n' +
      'הסיבה הנפוצה: החלפת סיסמה, או מעבר לשנה חדשה. צריך להוציא קישור חדש ולהחליף אותו ב-Apps Script, ' +
      'בגלגל השיניים תחת Script properties, בשדה ' + key + '.\n\n' +
      'עד אז האתר ממשיך לעבוד, בלי המידע מהיומן הזה.\n\nהשגיאה: ' + err
  });
}

function parseIcs_(text) {
  var unfolded = String(text).replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  var blocks = unfolded.split('BEGIN:VEVENT').slice(1);
  return blocks.map(function (b) {
    var e = {};
    b.split('END:VEVENT')[0].split('\n').forEach(function (line) {
      var i = line.indexOf(':');
      if (i > 0) e[line.slice(0, i).split(';')[0]] = line.slice(i + 1).replace(/\\,/g, ',').replace(/\\n/g, ' ').trim();
    });
    return e;
  });
}

// 20261018T094500 → {date: '2026-10-18', time: '09:45', day: 0}. שעה ב-UTC (עם Z בסוף) מומרת לשעון ישראל
function icsTime_(v) {
  v = String(v || '');
  if (/T\d{6}Z$/.test(v)) {
    var u = v.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/);
    var d = new Date(Date.UTC(+u[1], +u[2] - 1, +u[3], +u[4], +u[5], +u[6]));
    v = formatDate_(d, "yyyyMMdd'T'HHmmss");
  }
  var m = v.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
  if (!m) return null;
  return {
    date: m[1] + '-' + m[2] + '-' + m[3],
    time: m[4] ? m[4] + ':' + m[5] : '',
    day: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()
  };
}

/**
 * מוצא מפגשים שחורגים מהמועד הקבוע של הקורס: יום או שעה אחרים, חדר אחר, זום,
 * או מפגש שהסטטוס שלו הוא לא "מתקיים". מחזיר רק מהיום והלאה.
 */
function lessonChanges_(icsText, today) {
  var lessons = parseIcs_(icsText)
    .filter(function (e) { return String(e.DESCRIPTION || '').indexOf('סוג מפגש:') === 0; })
    .map(function (e) {
      var s = icsTime_(e.DTSTART), end = icsTime_(e.DTEND);
      var type = (String(e.DESCRIPTION).match(/סוג מפגש:\s*(\S+)/) || [])[1] || '';
      var status = (String(e.DESCRIPTION).match(/\(([^)]+)\)/) || [])[1] || '';
      var room = String(e.LOCATION || '').split(' ')[0];
      return { title: e.SUMMARY || '', type: type, status: status, date: s.date, day: s.day,
               start: s.time, end: end ? end.time : '', room: room, location: e.LOCATION || '' };
    });

  // המועדים הקבועים של כל קורס: יום, שעה וחדר שחוזרים לפחות REGULAR_MIN_COUNT פעמים
  var slots = {};
  lessons.forEach(function (l) {
    var key = l.title + '|' + l.type;
    var slot = l.day + '|' + l.start + '|' + l.room;
    slots[key] = slots[key] || {};
    slots[key][slot] = (slots[key][slot] || 0) + 1;
  });
  var regular = {};
  Object.keys(slots).forEach(function (key) {
    regular[key] = Object.keys(slots[key])
      .filter(function (s) { return slots[key][s] >= REGULAR_MIN_COUNT; })
      .map(function (s) { var p = s.split('|'); return { day: +p[0], start: p[1], room: p[2] }; });
  });

  var DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  var out = [];
  lessons.forEach(function (l) {
    if (l.date < today) return;
    var reg = regular[l.title + '|' + l.type] || [];
    var cancelled = l.status && l.status !== 'מתקיים';
    var exact = reg.some(function (r) { return r.day === l.day && r.start === l.start && r.room === l.room; });
    if (exact && !cancelled) return;
    if (!reg.length && !cancelled) return;  // קורס בלי מועד קבוע, אין למה להשוות

    var kind;
    if (cancelled) kind = l.status;
    else if (/zoom/i.test(l.room)) kind = 'בזום';
    else if (reg.some(function (r) { return r.day === l.day && r.start === l.start; })) kind = 'חדר אחר';
    else if (reg.some(function (r) { return r.day === l.day; })) kind = 'שעה אחרת';
    else kind = 'מפגש נוסף או שהוזז';

    out.push({
      date: l.date, start: l.start, end: l.end, title: l.title, type: l.type, kind: kind,
      location: l.location,
      regular: reg.map(function (r) { return 'יום ' + DAYS[r.day] + ' ' + r.start + ', ' + r.room; }).join(' · ')
    });
  });
  return out.sort(function (a, b) { return (a.date + a.start) < (b.date + b.start) ? -1 : 1; });
}

/**
 * מטלות מ-Moodle. הקורס מזוהה לפי הקוד שב-CATEGORIES (למשל "מבוא לחשבונאות-985-2027/1 - 2701418"),
 * כדי שיופיע באותו שם כמו בלשונית "קורסים". התיאור של המרצה לא מועתק: באתר יש קישור ל-Moodle.
 */
function moodleTasks_(icsText, courses) {
  var byCode = {};
  courses.forEach(function (c) { if (c['קוד']) byCode[String(c['קוד']).trim()] = c['שם הקורס']; });
  return parseIcs_(icsText).map(function (e) {
    var cat = String(e.CATEGORIES || '');
    var m = cat.match(/^(.*?)-(\d+)-/);
    var course = m ? (byCode[m[2]] || m[1].trim()) : cat;
    var summary = String(e.SUMMARY || '');
    var name = (summary.match(/['׳"״](.+)['׳"״]/) || [])[1] || summary;
    var t = icsTime_(e.DTSTART);
    return t ? { course: course, name: name, date: t.date, time: t.time } : null;
  }).filter(Boolean).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
}

// ---------- פניות ----------

function inquiry_(req) {
  var who = requireLogin_(req);
  if (!who) return { ok: false, error: 'login', message: 'צריך להיכנס מחדש.' };
  if (req.consent !== true) return { ok: false, error: 'צריך לאשר את הצהרת הפרטיות לפני השליחה.' };
  var topic = clip_(req.topic, 120);
  var details = clip_(req.details, 3000);
  var course = clip_(req.course, 60) || 'כללי';
  if (!topic) return { ok: false, error: 'צריך לכתוב נושא לפנייה.' };
  var anon = req.anon === true;

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  var id;
  try {
    var sh = privateSheet_().getSheetByName('פניות');
    id = ('000' + sh.getLastRow()).slice(-4);  // שורת הכותרות היא 1, ולכן הפנייה הראשונה מקבלת 0001
    sh.appendRow([id, new Date(), who.n, course, topic, details, anon ? 'כן' : 'לא', 'כן', 'חדשה', 'לא', '']);
  } finally {
    lock.releaseLock();
  }

  var settings = readSettings_();
  var notify = settings['מייל לקבלת התראות על פניות'];
  if (notify) {
    MailApp.sendEmail({
      to: notify,
      subject: 'פנייה ' + id + ' · ' + course + ' · ' + topic,
      body: [
        'פנייה חדשה מהאתר',
        '',
        'מספר: ' + id,
        'שם: ' + who.n + (anon ? ' (ביקש/ה בלי שם מול הסגל)' : ''),
        'קורס: ' + course,
        'נושא: ' + topic,
        '',
        details,
        '',
        'הפנייה נרשמה בלשונית "פניות" בגיליון הפרטי.'
      ].join('\n')
    });
  }

  return {
    ok: true,
    id: id,
    waNumber: String(settings['מספר וואטסאפ לפניות'] || '').replace(/\D/g, ''),
    waText: 'פנייה מספר ' + id + ' · ' + course + ' · ' + topic
  };
}

function clip_(v, max) {
  return String(v || '').trim().slice(0, max);
}

function readSettings_() {
  var rows = rowsToObjects_(contentSheet_().getSheetByName('הגדרות').getDataRange().getValues());
  var o = {};
  rows.forEach(function (r) { o[r['שדה']] = r['ערך']; });
  return o;
}

// ---------- עזר ----------

function contentSheet_() {
  return SpreadsheetApp.openById(CONTENT_SHEET_ID);
}

function privateSheet_() {
  return SpreadsheetApp.openById(PRIVATE_SHEET_ID);
}

function formatDate_(d, pattern) {
  return Utilities.formatDate(d, TZ, pattern);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- הרצה ידנית מהעורך ----------

/** מריצים פעם אחת אחרי ההדבקה: יוצר סוד לאסימונים ובודק שהגיליונות נפתחים */
function setup() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('TOKEN_SECRET')) {
    props.setProperty('TOKEN_SECRET', Utilities.getUuid() + Utilities.getUuid());
    console.log('נוצר TOKEN_SECRET');
  }
  var students = readStudents_();
  console.log('גיליון פרטי: ' + students.length + ' סטודנטים פעילים');
  var tabs = contentSheet_().getSheets().map(function (s) { return s.getName(); });
  console.log('גיליון תוכן: ' + tabs.join(', '));
  var s = readSettings_();
  console.log('מייל להתראות: ' + (s['מייל לקבלת התראות על פניות'] || 'חסר'));
  console.log('מספר וואטסאפ: ' + (s['מספר וואטסאפ לפניות'] ? 'קיים' : 'חסר'));
}

/** בדיקת היומן של האוניברסיטה: כמה שינויים בשיעורים יש מהיום והלאה */
function testLessonChanges() {
  CacheService.getScriptCache().remove('cal-UNIV_CALENDAR_URL');
  var changes = lessonChanges_(fetchCalendar_('UNIV_CALENDAR_URL'), formatDate_(new Date(), 'yyyy-MM-dd'));
  console.log('שינויים בשיעורים מהיום והלאה: ' + changes.length);
  changes.forEach(function (c) { console.log(c.date + ' ' + c.start + ' · ' + c.kind + ' · ' + c.title); });
}

/** אבחון: מה בדיוק מחזיר הקישור של Moodle לשרתים של Google (קוד, כותרות ותחילת התשובה) */
function debugMoodleFeed() {
  var url = PropertiesService.getScriptProperties().getProperty('MOODLE_CALENDAR_URL') || '';
  console.log('אורך הקישור: ' + url.length + ', מתחיל ב: ' + url.slice(0, 45) + ', מסתיים ב: ' + url.slice(-30));
  var res = UrlFetchApp.fetch(url.trim(), { muteHttpExceptions: true, followRedirects: false });
  console.log('קוד: ' + res.getResponseCode());
  console.log('כותרות: ' + JSON.stringify(res.getHeaders()));
  console.log('תחילת התשובה: ' + res.getContentText().slice(0, 600));
}

/** בדיקת היומן של Moodle: אילו מטלות השרת מוצא */
function testMoodleTasks() {
  CacheService.getScriptCache().remove('cal-MOODLE_CALENDAR_URL');
  var courses = rowsToObjects_(contentSheet_().getSheetByName('קורסים').getDataRange().getValues());
  var tasks = moodleTasks_(fetchCalendar_('MOODLE_CALENDAR_URL'), courses);
  console.log('מטלות מ-Moodle: ' + tasks.length);
  tasks.forEach(function (t) { console.log(t.date + ' ' + t.time + ' · ' + t.course + ' · ' + t.name); });
  CacheService.getScriptCache().remove('content');
}

/** בדיקת כניסה עם השם הראשון ברשימה, ובדיקת קריאת התוכן */
function testLoginAndContent() {
  var first = readStudents_()[0].split(' ');
  var res = login_({ first: first.slice(0, -1).join(' '), last: first.slice(-1)[0] });
  console.log('כניסה: ' + res.ok);
  var reversed = login_({ first: first.slice(-1)[0], last: first.slice(0, -1).join(' ') });
  console.log('כניסה בסדר הפוך: ' + reversed.ok);
  console.log('שם שלא ברשימה נדחה: ' + !login_({ first: 'ישראל', last: 'ישראלי' }).ok);
  CacheService.getScriptCache().remove('content');
  var c = content_({ token: res.token });
  Object.keys(c.tabs).forEach(function (t) { console.log(t + ': ' + c.tabs[t].length + ' שורות'); });
}
