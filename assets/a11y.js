/* תפריט נגישות משותף לכל דפי האתר */
(function () {
  var KEY = "a11y-settings";
  var root = document.documentElement;
  var FLAGS = ["contrast", "links", "font", "still", "spacing", "cursor"];
  var state = { size: 1, flags: {} };
  try { state = Object.assign(state, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}

  function apply() {
    root.style.fontSize = state.size === 1 ? "" : (state.size * 100) + "%";
    FLAGS.forEach(function (f) { root.classList.toggle("a11y-" + f, !!state.flags[f]); });
    document.querySelectorAll("#a11y-panel [data-size]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(Number(b.dataset.size) === state.size));
    });
    document.querySelectorAll("#a11y-panel [data-flag]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(!!state.flags[b.dataset.flag]));
    });
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  apply();

  var panel = document.getElementById("a11y-panel");
  var open = document.getElementById("a11y-open");
  if (!panel || !open) return;
  function show(v) {
    panel.hidden = !v;
    open.setAttribute("aria-expanded", String(v));
    if (v) { var first = panel.querySelector("button"); if (first) first.focus(); } else { open.focus(); }
  }
  open.addEventListener("click", function () { show(panel.hidden); });
  document.getElementById("a11y-close").addEventListener("click", function () { show(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) show(false); });
  panel.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.size) { state.size = Number(b.dataset.size); apply(); }
    else if (b.dataset.flag) { state.flags[b.dataset.flag] = !state.flags[b.dataset.flag]; apply(); }
    else if (b.id === "a11y-reset") { state = { size: 1, flags: {} }; apply(); }
  });
})();

/* בנייד: גלילת פריט הניווט הפעיל לתוך התצוגה */
(function () {
  var cur = document.querySelector('.site-nav a[aria-current="page"]');
  if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest", inline: "center" });
})();
