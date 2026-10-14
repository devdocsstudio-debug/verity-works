// Mobile nav toggle. Progressive enhancement: the nav is already a visible, stacked
// list on narrow screens with zero JS (see base.css) -- this only adds a collapse
// behind a button once script has actually loaded, so a failed/blocked load never
// hides navigation from anyone.
(function () {
  if (typeof document === "undefined") return;
  var nav = document.querySelector(".site-nav");
  var wrap = document.querySelector(".site-header .wrap");
  if (!nav || !wrap) return;

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nav-toggle";
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", "site-nav");
  btn.setAttribute("aria-label", "Toggle navigation menu");
  btn.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">' +
    '<path d="M2 4.5h12M2 8h12M2 11.5h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
    "</svg>";

  nav.id = "site-nav";
  nav.classList.add("js-collapsible");
  wrap.insertBefore(btn, nav);

  function setOpen(open) {
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  }

  btn.addEventListener("click", function () {
    setOpen(!nav.classList.contains("open"));
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });
  nav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") setOpen(false);
  });
})();
