// Verity Works CTA instrumentation for Umami.
//
// INERT BY DEFAULT. This file attaches listeners and then calls window.umami.track() only if the
// Umami script is actually present. No Umami script is loaded on this site yet, so today this file
// runs, finds no window.umami, and sends nothing anywhere. That is deliberate: the integration can
// be reviewed and tested in place without any tracking existing.
//
// WHAT THIS DOES NOT MEASURE, stated first because conflating these would be the whole mistake:
//
//   * A CTA click is NOT an inquiry. Opening a mailto: hands a draft to the visitor's mail client.
//     We cannot see whether they sent it, edited it, or closed it. Every event below is an
//     INTENT signal only.
//   * An inquiry is NOT a paid order. A real inquiry is an email that arrives in the inbox, and it
//     is counted there, by the reply-detection pipeline -- never here.
//   * A paid order is a PayPal payment event, counted in the revenue ledger -- never here.
//
// So the funnel has four separate counters living in four separate places, and only the first comes
// from analytics:
//
//   page view      -> Umami (this integration)
//   CTA intent     -> Umami (this integration)
//   real inquiry   -> the Gmail inbox / reply-detection pipeline
//   paid order     -> state/os-revenue-payment-events.json, LIVE events only
//
// Event names are prefixed `cta_` for exactly that reason: so no dashboard reader can mistake one
// for a sale.
//
// PRIVACY. Only a service slug and which control was used are sent. No email address, no mailto
// body, no query string, no referrer, no identifier of any kind -- Umami sets no cookies and
// assigns no persistent visitor ID. Each event carries one property, because Umami Cloud bills each
// stored property as an additional event and one is enough to answer the question.
(function () {
  "use strict";

  // Derive the service from the page itself rather than hardcoding a map, so a new service page is
  // instrumented the moment it exists.
  function service() {
    var f = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "");
    return f === "" ? "index" : f;
  }

  function track(event, control) {
    // The guard is the whole safety model: with no Umami script present this is a no-op.
    if (!window.umami || typeof window.umami.track !== "function") return;
    try {
      window.umami.track(event, { service: service(), control: control });
    } catch (e) {
      // Analytics must never break an order path. Swallow and carry on.
    }
  }

  // CTA 1 -- the visitor opened a prefilled order email. INTENT, not an inquiry.
  var mailtos = document.querySelectorAll('a[href^="mailto:"]');
  Array.prototype.forEach.call(mailtos, function (a) {
    a.addEventListener("click", function () {
      // Footer/contact links and the order CTA are different actions; label them so.
      var isOrderCta = a.classList.contains("btn");
      track(isOrderCta ? "cta_order_email_opened" : "cta_contact_email_opened",
            isOrderCta ? "order_button" : "text_link");
    });
  });

  // CTA 2 -- the visitor copied the order brief. Stronger intent than opening a mailto, because it
  // is what a webmail user does, and still not an inquiry.
  var copies = document.querySelectorAll("[data-copy-brief]");
  Array.prototype.forEach.call(copies, function (b) {
    b.addEventListener("click", function () { track("cta_order_brief_copied", "copy_button"); });
  });

  // CTA 3 -- reached the terms or the privacy policy from a service page. A buying-consideration
  // signal, and the only way to tell "nobody reads the terms" from "the terms lose them".
  var policy = document.querySelectorAll('a[href*="terms.html"], a[href*="privacy-policy/"]');
  Array.prototype.forEach.call(policy, function (a) {
    a.addEventListener("click", function () {
      track("cta_policy_opened", /privacy/.test(a.getAttribute("href")) ? "privacy" : "terms");
    });
  });
})();
