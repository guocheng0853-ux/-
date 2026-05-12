'use strict';

let files = [];   // { id: string, file: File }
let sortable = null;

// ── File Management ───────────────────────────────────────────────

function addFiles(fileList) {
  for (const file of Array.from(fileList)) {
    files.push({ id: crypto.randomUUID(), file });
  }
  renderFileList();
  renderPreview();
}

function removeFile(id) {
  files = files.filter(f => f.id !== id);
  renderFileList();
  renderPreview();
}

function clearFiles() {
  files = [];
  renderFileList();
  renderPreview();
}

function sortFiles(by) {
  if (by === 'name') files.sort((a, b) => a.file.name.localeCompare(b.file.name));
  if (by === 'size') files.sort((a, b) => a.file.size - b.file.size);
  renderFileList();
  renderPreview();
}

function reverseFiles() {
  files.reverse();
  renderFileList();
  renderPreview();
}

// ── Render File List ──────────────────────────────────────────────

function renderFileList() {
  const ul = document.getElementById('fileList');
  document.getElementById('fileCount').textContent = files.length;

  if (files.length === 0) {
    ul.innerHTML = '<li class="file-list-empty">暂无文件</li>';
    if (sortable) { sortable.destroy(); sortable = null; }
    return;
  }

  ul.innerHTML = files.map(({ id, file }) => `
    <li class="file-item" data-id="${id}">
      <span class="drag-handle">⠿</span>
      <span class="file-name" title="${esc(file.name)}">${esc(file.name)}</span>
      <span class="file-size">${fmtSize(file.size)}</span>
      <button class="btn-remove" onclick="removeFile('${id}')" title="删除">×</button>
    </li>
  `).join('');

  if (sortable) sortable.destroy();
  sortable = Sortable.create(ul, {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'sortable-ghost',
    onEnd() {
      const order = Array.from(ul.children).map(li => li.dataset.id).filter(Boolean);
      files = order.map(id => files.find(f => f.id === id)).filter(Boolean);
      renderPreview();
    },
  });
}

// ── Rules ─────────────────────────────────────────────────────────

const RULE_IDS = ['prefix', 'suffix', 'replace', 'number', 'case', 'delete', 'ext'];

function onRuleChange() {
  for (const id of RULE_IDS) {
    const chk  = document.getElementById(`chk-${id}`);
    const ctrl = document.getElementById(`ctrl-${id}`);
    if (!chk || !ctrl) continue;
    if (chk.checked) {
      ctrl.parentElement.setAttribute('data-active', '');
      ctrl.querySelectorAll('input').forEach(el => { el.disabled = false; });
    } else {
      ctrl.parentElement.removeAttribute('data-active');
      ctrl.querySelectorAll('input').forEach(el => { el.disabled = true; });
    }
  }
  renderPreview();
}

function getRules() {
  const $ = id => document.getElementById(id);
  const radio = name => document.querySelector(`input[name="${name}"]:checked`)?.value;
  return {
    prefix:  { enabled: $('chk-prefix').checked,  value: $('val-prefix').value },
    suffix:  { enabled: $('chk-suffix').checked,  value: $('val-suffix').value },
    replace: {
      enabled:       $('chk-replace').checked,
      find:          $('val-find').value,
      to:            $('val-to').value,
      caseSensitive: $('chk-case-sensitive').checked,
    },
    number: {
      enabled:      $('chk-number').checked,
      start:        parseInt($('val-start').value)  || 1,
      digits:       parseInt($('val-digits').value) || 1,
      position:     radio('num-pos') || 'prefix',
      keepOriginal: $('chk-keep-original').checked,
    },
    case:   { enabled: $('chk-case').checked,   type: radio('case-type') || 'lower' },
    delete: {
      enabled:   $('chk-delete').checked,
      chars:     $('val-del-chars').value,
      fromStart: parseInt($('val-del-start').value) || 0,
      fromEnd:   parseInt($('val-del-end').value)   || 0,
    },
    ext:    { enabled: $('chk-ext').checked, value: $('val-ext').value },
  };
}

// ── Preview ───────────────────────────────────────────────────────

function renderPreview() {
  const tbody      = document.getElementById('previewBody');
  const downloadBtn = document.getElementById('downloadBtn');

  if (files.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-row">请先添加文件</td></tr>';
    downloadBtn.disabled = true;
    return;
  }

  const results   = renameAll(files.map(f => f.file), getRules());
  const conflicts = checkConflicts(results.map(r => r.renamed));

  tbody.innerHTML = results.map(r => {
    const illegal    = checkIllegalChars(r.renamed);
    const isConflict = conflicts.has(r.renamed);
    let rowClass = '', statusText = '✓';
    if (isConflict)        { rowClass = 'conflict'; statusText = '重名'; }
    else if (illegal.length) { rowClass = 'illegal';  statusText = `含 ${illegal.join(' ')}`; }

    return `<tr class="${rowClass}">
      <td title="${esc(r.original)}">${esc(r.original)}</td>
      <td title="${esc(r.renamed)}">${esc(r.renamed)}</td>
      <td class="status-cell">${statusText}</td>
    </tr>`;
  }).join('');

  downloadBtn.disabled = false;
}

// ── ZIP Export ────────────────────────────────────────────────────

async function downloadZip() {
  const results   = renameAll(files.map(f => f.file), getRules());
  const conflicts = checkConflicts(results.map(r => r.renamed));

  if (conflicts.size > 0) {
    if (!confirm(`存在 ${conflicts.size} 个重复文件名，是否继续下载？`)) return;
  }

  const btn = document.getElementById('downloadBtn');
  btn.disabled    = true;
  btn.textContent = '打包中…';

  try {
    const zip = new JSZip();
    for (let i = 0; i < files.length; i++) {
      zip.file(results[i].renamed, files[i].file);
    }
    const blob    = await zip.generateAsync({ type: 'blob' });
    const zipName = (document.getElementById('zipName').value.trim() || 'renamed_files');
    const url     = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: zipName + '.zip' }).click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('打包失败：' + e.message);
  } finally {
    btn.disabled    = files.length === 0;
    btn.textContent = '下载 zip 包';
  }
}

// ── Drop Zone & File Input ────────────────────────────────────────

const dropZone  = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('click', e => { if (e.target.tagName !== 'BUTTON') fileInput.click(); });
dropZone.querySelector('button').addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', e => { if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over'); });
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  addFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });

// ── Utilities ─────────────────────────────────────────────────────

function fmtSize(bytes) {
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 ** 2)   return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 ** 2).toFixed(1) + ' MB';
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
