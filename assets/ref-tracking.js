// Carries a ?ref=<channel> query param from the landing URL into the page's mailto
// inquiry links, so a reply's body shows which channel it came from even when the
// mail client strips everything else about the visit.
function appendRefToMailto(href, ref) {
  var qIndex = href.indexOf("?");
  var base = qIndex === -1 ? href : href.slice(0, qIndex);
  var query = qIndex === -1 ? "" : href.slice(qIndex + 1);
  var parts = query.length ? query.split("&") : [];
  var bodyIndex = -1;
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].indexOf("body=") === 0) { bodyIndex = i; break; }
  }
  var note = "Source%3A+" + encodeURIComponent(ref);
  if (bodyIndex === -1) {
    parts.push("body=" + note);
  } else {
    parts[bodyIndex] = parts[bodyIndex] + "%0A%0A" + note;
  }
  return base + "?" + parts.join("&");
}

if (typeof module !== "undefined") {
  module.exports = { appendRefToMailto: appendRefToMailto };
}

if (typeof document !== "undefined") {
  (function () {
    var ref = new URLSearchParams(location.search).get("ref");
    if (!ref) return;
    document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
      a.setAttribute("href", appendRefToMailto(a.getAttribute("href"), ref));
    });
  })();
}
