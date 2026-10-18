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
  // %20, not "+". A mailto body is percent-encoded (RFC 6068), not form-encoded, so a literal "+"
  // stays a plus sign in the email the visitor sends: measured in a real browser on the deployed
  // page, 2026-10-18, the body read "Source:+camp-3e40de03928dfc33". The engine's intake pattern
  // tolerates both now, because links already published cannot be edited, but new links should
  // carry the separator that actually means a space.
  var note = "Source%3A%20" + encodeURIComponent(ref);
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
