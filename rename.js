'use strict';

function _split(filename) {
  const i = filename.lastIndexOf('.');
  if (i <= 0) return { stem: filename, ext: '' };
  return { stem: filename.slice(0, i), ext: filename.slice(i) };
}

function _applyDelete(stem, opts) {
  let s = stem;
  if (opts.chars) s = s.split(opts.chars).join('');
  const head = Math.max(0, parseInt(opts.fromStart) || 0);
  const tail = Math.max(0, parseInt(opts.fromEnd)   || 0);
  if (head > 0) s = s.slice(head);
  if (tail > 0) s = s.length > tail ? s.slice(0, -tail) : '';
  return s;
}

function _applyReplace(stem, opts) {
  if (!opts.find) return stem;
  const escaped = opts.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const flags   = opts.caseSensitive ? 'g' : 'gi';
  return stem.replace(new RegExp(escaped, flags), opts.to || '');
}

function _applyCase(stem, opts) {
  if (opts.type === 'upper') return stem.toUpperCase();
  if (opts.type === 'lower') return stem.toLowerCase();
  if (opts.type === 'title') return stem.replace(/\b\w/g, c => c.toUpperCase());
  return stem;
}

function _applyNumber(stem, index, opts) {
  const n = String((parseInt(opts.start) || 1) + index).padStart(parseInt(opts.digits) || 1, '0');
  if (!opts.keepOriginal) return n;
  return opts.position === 'suffix' ? stem + '_' + n : n + '_' + stem;
}

function applyRules(originalName, index, rules) {
  const { stem: origStem, ext: origExt } = _split(originalName);
  let stem = origStem;
  let ext  = origExt;

  if (rules.delete?.enabled)  stem = _applyDelete(stem, rules.delete);
  if (rules.replace?.enabled) stem = _applyReplace(stem, rules.replace);
  if (rules.case?.enabled)    stem = _applyCase(stem, rules.case);
  if (rules.prefix?.enabled)  stem = (rules.prefix.value || '') + stem;
  if (rules.suffix?.enabled)  stem = stem + (rules.suffix.value || '');
  if (rules.number?.enabled)  stem = _applyNumber(stem, index, rules.number);
  if (rules.ext?.enabled) {
    const v = (rules.ext.value || '').trim();
    if (v) ext = v.startsWith('.') ? v : '.' + v;
  }

  return stem + ext;
}

function renameAll(files, rules) {
  return files.map((file, i) => ({
    original: file.name,
    renamed:  applyRules(file.name, i, rules),
  }));
}
