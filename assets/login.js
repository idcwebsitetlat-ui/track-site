/* דף הכניסה */
(function () {
  if (Site.session()) { location.replace("index.html"); return; }

  var form = document.getElementById("login-form");
  var first = document.getElementById("first");
  var last = document.getElementById("last");
  var err = document.getElementById("login-err");
  var btn = document.getElementById("login-btn");

  function fail(text, field) {
    err.textContent = text;
    err.hidden = false;
    form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake");
    if (field) { field.setAttribute("aria-invalid", "true"); field.focus(); }
  }

  [first, last].forEach(function (f) {
    f.setAttribute("aria-describedby", "login-err");
    f.addEventListener("input", function () { f.removeAttribute("aria-invalid"); });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    err.hidden = true;
    if (!first.value.trim()) return fail("צריך למלא שם פרטי.", first);
    if (!last.value.trim()) return fail("צריך למלא שם משפחה.", last);

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> בודקים את השם…';
    Site.api("login", { first: first.value, last: last.value }).then(function (res) {
      if (!res.ok) throw new Error(res.error);
      Site.store("track-session", { token: res.token, name: res.name, admin: !!res.admin, at: Date.now() });
      var next = "index.html";
      try { next = sessionStorage.getItem("track-next") || next; sessionStorage.removeItem("track-next"); } catch (x) {}
      if (!/^(index|inquiry)\.html/.test(next)) next = "index.html";
      location.replace(next);
    }).catch(function (x) {
      btn.disabled = false;
      btn.textContent = "כניסה";
      fail(x && x.message && x.message !== "Failed to fetch" ? x.message : "אין חיבור לשרת כרגע. בדקו את החיבור לאינטרנט ונסו שוב.");
    });
  });
})();
