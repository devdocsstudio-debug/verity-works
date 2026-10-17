// Progressive enhancement for the order brief on each service page.
//
// WHY. Every service's only intake was a single mailto: button. On a machine with no mail client
// registered -- which is every webmail user who has never set one up -- that click does nothing
// at all: no error, no fallback, no way to tell the visitor what to send instead. The brief is now
// visible text on the page, so the questions can be read and the address copied whether or not
// anything is registered to handle mailto:. This file only adds a one-click copy on top of that.
//
// The button ships hidden and is revealed here. If this script does not run, or the clipboard API
// is unavailable, there is no button to press rather than a button that does nothing -- the
// failure this whole file exists to remove.
(function () {
  "use strict";
  var buttons = document.querySelectorAll("[data-copy-brief]");
  if (!buttons.length || !navigator.clipboard || !navigator.clipboard.writeText) return;

  Array.prototype.forEach.call(buttons, function (button) {
    var source = document.querySelector(button.getAttribute("data-copy-brief"));
    if (!source) return;
    button.hidden = false;
    var label = button.textContent;
    var restore;

    button.addEventListener("click", function () {
      navigator.clipboard.writeText(source.textContent.trim()).then(function () {
        button.textContent = "Copied — paste it into an email";
        // The visual change is not the only signal: a screen reader user gets it announced too.
        button.setAttribute("aria-live", "polite");
        clearTimeout(restore);
        restore = setTimeout(function () { button.textContent = label; }, 4000);
      }, function () {
        // A rejected clipboard write (permissions, insecure context) must not look like success.
        button.textContent = "Couldn't copy — select the text above";
        clearTimeout(restore);
        restore = setTimeout(function () { button.textContent = label; }, 4000);
      });
    });
  });
})();
