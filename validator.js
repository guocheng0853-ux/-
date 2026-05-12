'use strict';

const ILLEGAL_CHARS = ['\\', '/', ':', '*', '?', '"', '<', '>', '|'];

function checkIllegalChars(name) {
  return ILLEGAL_CHARS.filter(c => name.includes(c));
}

function checkConflicts(names) {
  const seen = new Set(), dupes = new Set();
  for (const n of names) {
    if (seen.has(n)) dupes.add(n);
    seen.add(n);
  }
  return dupes;
}
