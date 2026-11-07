/**
 * ייבוא חד־פעמי: לוח השנה האקדמי תשפ״ז, מספר הוואטסאפ והקישור ללוח השנה.
 * מריצים את importAcademicCalendar פעם אחת, ואז אפשר למחוק את הקובץ הזה מהפרויקט.
 * הרצה חוזרת לא יוצרת כפילויות: שורה שהכותרת שלה כבר קיימת בלשונית לא נוספת שוב.
 */

// [תאריך, סוג, כותרת, הערות, תאריך סיום]. חודשים מתחילים מ-0, כמו ב-JavaScript
// באתר מוצג רק הסמסטר הקרוב, ולכן מייבאים עכשיו רק את סמסטר א׳
var ACADEMIC_CALENDAR = [
  [[2026, 11, 6], 'חג וחופשה', 'חופשת חנוכה', 'אין לימודים', null],
  [[2027, 0, 15], 'אירוע אקדמי', 'סיום סמסטר א׳', '', null],
  [[2027, 0, 17], 'אירוע אקדמי', 'תחילת תקופת הבחינות של סמסטר א׳', 'המבחן הראשון של המסלול ב-20.1', null],
  [[2027, 2, 7], 'אירוע אקדמי', 'תחילת סמסטר ב׳', '', null]
];

// לייבוא לפני סמסטר ב׳: מעבירים את השורות לרשימה שלמעלה ומריצים שוב
var SEMESTER_B = [
  [[2027, 2, 23], 'חג וחופשה', 'חופשת פורים', 'הקמפוס סגור, אין לימודים', null],
  [[2027, 3, 18], 'חג וחופשה', 'חופשת פסח', 'אין לימודים. חוזרים ללימודים ביום א׳, 2.5', [2027, 3, 30]],
  [[2027, 4, 4], 'אירוע אקדמי', 'טקס יום השואה', 'בין 9:45 ל-10:30. השיעורים נעצרים בזמן הטקס', null],
  [[2027, 4, 10], 'אירוע אקדמי', 'טקס יום הזיכרון לחללי מערכות ישראל', 'בין 10:30 ל-11:15. השיעורים נעצרים בזמן הטקס', null],
  [[2027, 4, 11], 'חג וחופשה', 'יום הזיכרון לחללי מערכות ישראל', 'אין לימודים', null],
  [[2027, 4, 12], 'חג וחופשה', 'יום העצמאות', 'אין לימודים', null],
  [[2027, 5, 3], 'אירוע אקדמי', 'טקס יום הזיכרון ליהודי אתיופיה שנספו בדרכם לישראל', 'בין 10:30 ל-11:15. השיעורים מתקיימים כרגיל', null],
  [[2027, 5, 10], 'חג וחופשה', 'חופשת שבועות', 'אין לימודים', [2027, 5, 11]],
  [[2027, 5, 25], 'אירוע אקדמי', 'סיום סמסטר ב׳', '', null],
  [[2027, 5, 27], 'אירוע אקדמי', 'תחילת תקופת הבחינות של סמסטר ב׳', '', null]
];

var IMPORT_SETTINGS = {
  'מספר וואטסאפ לפניות': '972543488211',
  'קישור ללוח השנה האקדמי': 'https://www.runi.ac.il/students/academic-calendar'
};

function importAcademicCalendar() {
  var ss = contentSheet_();
  var sh = ss.getSheetByName('מועדים');
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];

  // עמודה חדשה לאירועים של כמה ימים, כמו חופשת פסח
  var endCol = head.indexOf('תאריך סיום') + 1;
  if (!endCol) {
    endCol = head.length + 1;
    sh.getRange(1, head.length).copyTo(sh.getRange(1, endCol), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    sh.getRange(1, endCol).setValue('תאריך סיום');
  }

  // מחיקת שורת הדוגמה של החגים
  var values = sh.getDataRange().getValues();
  for (var r = values.length - 1; r >= 1; r--) {
    if (String(values[r][3]).indexOf(EXAMPLE_PREFIX) === 0) sh.deleteRow(r + 1);
  }

  var titles = sh.getDataRange().getValues().map(function (row) { return row[3]; });
  var dateFormat = sh.getRange(2, 1).getNumberFormat();
  var added = 0;
  ACADEMIC_CALENDAR.forEach(function (e) {
    if (titles.indexOf(e[2]) !== -1) return;
    var row = new Array(endCol).fill('');
    row[0] = new Date(e[0][0], e[0][1], e[0][2]);
    row[2] = e[1];
    row[3] = e[2];
    row[4] = 'כללי';
    row[6] = e[3];
    row[7] = 'כן';
    if (e[4]) row[endCol - 1] = new Date(e[4][0], e[4][1], e[4][2]);
    sh.appendRow(row);
    sh.getRange(sh.getLastRow(), 1).setNumberFormat(dateFormat);
    sh.getRange(sh.getLastRow(), endCol).setNumberFormat(dateFormat);
    added++;
  });
  sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).sort(1);
  console.log('מועדים: נוספו ' + added + ' שורות');

  var st = ss.getSheetByName('הגדרות');
  var rows = st.getDataRange().getValues();
  Object.keys(IMPORT_SETTINGS).forEach(function (field) {
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === field) {
        st.getRange(i + 1, 2).setNumberFormat('@').setValue(IMPORT_SETTINGS[field]);
        console.log('הגדרות: ' + field + ' עודכן');
      }
    }
  });
  CacheService.getScriptCache().remove('content');
}
