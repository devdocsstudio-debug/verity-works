const assert = require("assert");
const { appendRefToMailto } = require("./ref-tracking.js");

// no existing query string
assert.strictEqual(
  appendRefToMailto("mailto:a@b.com", "reddit-forhire"),
  "mailto:a@b.com?body=Source%3A+reddit-forhire"
);

// existing subject, no body
assert.strictEqual(
  appendRefToMailto("mailto:a@b.com?subject=Hi", "reddit-forhire"),
  "mailto:a@b.com?subject=Hi&body=Source%3A+reddit-forhire"
);

// existing body is appended to, not replaced
assert.strictEqual(
  appendRefToMailto("mailto:a@b.com?subject=Hi&body=Library%3A", "gh-discussions-bettersqlite3"),
  "mailto:a@b.com?subject=Hi&body=Library%3A%0A%0ASource%3A+gh-discussions-bettersqlite3"
);

console.log("ref-tracking: all tests passed");
