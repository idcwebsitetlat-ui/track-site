/* דף הפנייה לנציג */
(function () {
  if (!Site.requireLogin()) return;
  var S = Site, esc = S.esc;
  var $ = function (id) { return document.getElementById(id); };
  var trackBtn = $("choose-track"), personalBtn = $("choose-personal");
  var form = $("track-form"), personal = $("personal");
  var consent = $("iq-consent"), send = $("iq-send");

  var s = S.session();
  $("who").textContent = "הפנייה תישלח בשם " + (s && s.name ? s.name : "שלך") + ", מהכניסה לאתר.";

  function choose(which) {
    trackBtn.setAttribute("aria-pressed", String(which === "track"));
    personalBtn.setAttribute("aria-pressed", String(which === "personal"));
    form.hidden = which !== "track";
    personal.hidden = which !== "personal";
    var target = which === "track" ? form : personal;
    target.classList.remove("enter"); void target.offsetWidth; target.classList.add("enter");
    if (which === "track") $("iq-course").focus();
  }
  trackBtn.addEventListener("click", function () { choose("track"); });
  personalBtn.addEventListener("click", function () { choose("personal"); });

  S.loadContent(function (d) {
    var courses = (d.tabs["קורסים"] || []).map(function (c) { return c["שם הקורס"]; }).filter(Boolean);
    var sel = $("iq-course"), cur = sel.value;
    sel.innerHTML = ["כללי"].concat(courses).map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("");
    if (cur) sel.value = cur;
    var mail = String((d.settings || {})["מייל רכזת מנהל הסטודנטים"] || "").trim();
    $("coord").innerHTML = /^[^@\s]+@[^@\s]+$/.test(mail)
      ? '<div class="row-btns" style="margin-top:0;align-items:center"><a class="btn" href="mailto:' + esc(mail) + '">כתיבת מייל לרכזת</a>' +
        '<span dir="ltr" class="num">' + esc(mail) + '</span><button type="button" class="icon-btn" id="copy-coord" aria-label="העתקת המייל של הרכזת">' +
        '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15V5a1 1 0 0 1 1-1h10"></path></svg></button></div>'
      : '<p class="empty">המייל של הרכזת יתווסף בקרוב.</p>';
    var cb = $("copy-coord");
    if (cb) cb.addEventListener("click", function () { S.copy(mail, "המייל הועתק"); });
  });

  consent.addEventListener("change", function () {
    send.disabled = !consent.checked;
    $("send-hint").hidden = consent.checked;
  });
  $("iq-topic").addEventListener("input", function () { $("topic-err").hidden = true; this.removeAttribute("aria-invalid"); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var topic = $("iq-topic").value.trim();
    $("send-err").hidden = true;
    if (!topic) {
      $("topic-err").hidden = false;
      $("iq-topic").setAttribute("aria-invalid", "true");
      $("iq-topic").focus();
      return;
    }
    if (!consent.checked) return;
    send.disabled = true;
    send.innerHTML = '<span class="spinner" aria-hidden="true"></span> שולחים…';
    S.api("inquiry", {
      course: $("iq-course").value, topic: topic, details: $("iq-details").value,
      anon: $("iq-anon").checked, consent: true
    }).then(function (res) {
      if (!res.ok) throw new Error(res.error);
      $("sent-id").textContent = res.id;
      if (res.waNumber) {
        var wa = $("wa-link");
        wa.href = "https://wa.me/" + res.waNumber + "?text=" + encodeURIComponent(res.waText);
        wa.hidden = false;
      }
      $("step-route").hidden = true;
      var sent = $("step-sent");
      sent.hidden = false;
      sent.classList.add("enter");
      sent.focus();
      window.scrollTo(0, 0);
    }).catch(function (x) {
      send.disabled = false;
      send.textContent = "שליחת הפנייה";
      $("send-err").textContent = x && x.message && x.message !== "Failed to fetch" ? x.message : "הפנייה לא נשלחה כי אין חיבור לשרת. מה שכתבת נשאר כאן, אפשר לנסות שוב.";
      $("send-err").hidden = false;
    });
  });
})();
