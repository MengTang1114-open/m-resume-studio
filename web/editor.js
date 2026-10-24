/** Content workspace rendering. Structure ops stay in modules.js. */

import { escapeHtml } from './core.js?v=profile-en-20261024-r3';
import {
  MODULE_DEFS,
  degreeOptions,
  entrySummary,
  matchDegree,
  moduleTitle,
} from './modules.js?v=profile-en-20261024-r3';

export const EDITOR_COPY = {
  zh: {
    tabContent: '模块编辑',
    markdown: 'Markdown（高级）',
    markdownHint: '结构化编辑即可增删、复制和排序。Markdown 供导入和精细调整。',
    hint: '勾选要显示的模块，点击条目填写。拖动左侧手柄可排序；取消勾选后内容仍保留。',
    undo: '撤销',
    redo: '重做',
    undone: '已撤销',
    redone: '已重做',
    nothingUndo: '没有可撤销的操作',
    nothingRedo: '没有可重做的操作',
    profile: '基础信息',
    name: '姓名',
    contact: '联系方式',
    picker: '显示模块',
    entries: (n) => `${n} 条`,
    add: '添加一段',
    collapse: '折叠',
    expand: '展开',
    deleteEntry: '删除此段',
    duplicate: '复制',
    moveUp: '上移',
    moveDown: '下移',
    gripModule: '拖动模块',
    gripEntry: '拖动条目',
    start: '开始',
    end: '结束',
    present: '至今',
    dateRaw: '日期原文',
    school: '学校',
    dept: '院系',
    major: '专业',
    degree: '学历',
    degreeEmpty: '未选',
    org: '机构 / 组织',
    role: '岗位 / 职务',
    location: '地点',
    details: '经历说明',
    project: '项目内容',
    notes: '补充说明',
    skill: '条目',
    raw: '原文',
    untitled: '未命名',
    deleted: '已删除该段',
    copied: '已复制该段',
    added: '已添加一段',
    moved: '已调整顺序',
    hidden: (name) => `已隐藏「${name}」`,
    shown: (name) => `已显示「${name}」`,
    item: '第',
  },
  en: {
    tabContent: 'Modules',
    markdown: 'Markdown',
    markdownHint: 'Add, delete, duplicate and reorder here. Markdown is for import and fine edits.',
    hint: 'Tick modules to show on the resume. Delete, duplicate or reorder entries; drag handles do not interrupt typing.',
    undo: 'Undo',
    redo: 'Redo',
    undone: 'Undone',
    redone: 'Redone',
    nothingUndo: 'Nothing to undo',
    nothingRedo: 'Nothing to redo',
    profile: 'Profile',
    name: 'Name',
    contact: 'Contact',
    picker: 'Modules',
    entries: (n) => `${n} items`,
    add: 'Add entry',
    collapse: 'Collapse',
    expand: 'Expand',
    deleteEntry: 'Delete entry',
    duplicate: 'Duplicate',
    moveUp: 'Move up',
    moveDown: 'Move down',
    gripModule: 'Drag module',
    gripEntry: 'Drag entry',
    start: 'Start',
    end: 'End',
    present: 'Present',
    dateRaw: 'Original date',
    school: 'School',
    dept: 'Department',
    major: 'Major',
    degree: 'Degree',
    degreeEmpty: 'Not set',
    org: 'Organization',
    role: 'Role',
    location: 'Location',
    details: 'Description',
    project: 'Project',
    notes: 'Notes',
    skill: 'Item',
    raw: 'Original text',
    untitled: 'Untitled',
    deleted: 'Entry deleted',
    copied: 'Entry duplicated',
    added: 'Entry added',
    moved: 'Order updated',
    hidden: (name) => `Hidden “${name}”`,
    shown: (name) => `Showing “${name}”`,
    item: '',
  },
};

function attr(s) {
  return escapeHtml(s);
}

function val(s) {
  return escapeHtml(s ?? '');
}

function collapsed(map, key, fallback) {
  if (map && Object.prototype.hasOwnProperty.call(map, key)) return Boolean(map[key]);
  return fallback;
}

export function renderProfile(doc, copy, open = false) {
  const name = doc.profile?.name || '';
  const contact = doc.profile?.contact || '';
  return `<details class="profile-card" data-scope="profile" ${open ? 'open' : ''}>
    <summary><strong>${attr(copy.profile)}</strong><span>${attr(name)}</span></summary>
    <div class="profile-fields">
    <label class="field"><span>${attr(copy.name)}</span>
      <input type="text" data-scope="profile" data-field="name" value="${val(name)}" autocomplete="name">
    </label>
    <label class="field"><span>${attr(copy.contact)}</span>
      <textarea data-scope="profile" data-field="contact" rows="2">${val(contact)}</textarea>
    </label>
    </div>
  </details>`;
}

export function renderPicker(doc, copy, lang) {
  const buttons = MODULE_DEFS.map((def) => {
    const mod = doc.modules.find((m) => m.id === def.id);
    const on = Boolean(mod?.enabled);
    const title = def.titles[lang === 'en' ? 'en' : 'zh'];
    return `<label class="mod-chip">
      <input type="checkbox" data-action="toggle-module" data-module="${attr(def.id)}" ${on ? 'checked' : ''}>
      <span>${attr(title)}</span>
    </label>`;
  }).join('');
  return `<fieldset class="mod-picker">
    <legend>${attr(copy.picker)}</legend>
    <div class="mod-chips">${buttons}</div>
  </fieldset>`;
}

function dateFields(entry, copy, lang, moduleId) {
  const date = entry.date || { start: '', end: '', present: false, raw: '', parsed: true };
  const rawBox = !date.parsed && date.raw
    ? `<label class="field"><span>${attr(copy.dateRaw)}</span>
        <input type="text" data-module="${attr(moduleId)}" data-entry="${attr(entry.id)}" data-field="dateRaw" value="${val(date.raw)}">
      </label>`
    : '';
  return `<div class="date-row">
    <label class="field"><span>${attr(copy.start)}</span>
      <input type="month" data-module="${attr(moduleId)}" data-entry="${attr(entry.id)}" data-field="start" value="${val(date.start)}">
    </label>
    <label class="field"><span>${attr(copy.end)}</span>
      <input type="month" data-module="${attr(moduleId)}" data-entry="${attr(entry.id)}" data-field="end" value="${val(date.end)}" ${date.present ? 'disabled' : ''}>
    </label>
    <label class="check-inline">
      <input type="checkbox" data-module="${attr(moduleId)}" data-entry="${attr(entry.id)}" data-field="present" ${date.present ? 'checked' : ''}>
      <span>${attr(copy.present)}</span>
    </label>
  </div>${rawBox}`;
}

function degreeSelect(entry, copy, lang, moduleId) {
  const current = matchDegree(entry.fields.degree, lang);
  const opts = degreeOptions(lang);
  const extra = current && !opts.includes(current) ? `<option value="${val(current)}" selected>${attr(current)}</option>` : '';
  const options = [`<option value="">${attr(copy.degreeEmpty)}</option>`]
    .concat(opts.map((opt) => `<option value="${val(opt)}" ${opt === current ? 'selected' : ''}>${attr(opt)}</option>`))
    .concat(extra)
    .join('');
  return `<label class="field"><span>${attr(copy.degree)}</span>
    <select data-module="${attr(moduleId)}" data-entry="${attr(entry.id)}" data-field="degree">${options}</select>
  </label>`;
}

function fieldInput(copy, moduleId, entryId, key, label, value, multiline) {
  if (multiline) {
    return `<label class="field field-wide"><span>${attr(label)}</span>
      <textarea data-module="${attr(moduleId)}" data-entry="${attr(entryId)}" data-field="${attr(key)}" rows="4">${val(value)}</textarea>
    </label>`;
  }
  return `<label class="field"><span>${attr(label)}</span>
    <input type="text" data-module="${attr(moduleId)}" data-entry="${attr(entryId)}" data-field="${attr(key)}" value="${val(value)}">
  </label>`;
}

function entryFields(mod, entry, copy, lang) {
  const id = mod.id;
  if (entry.kind === 'edu-row') {
    return `${dateFields(entry, copy, lang, id)}
      <div class="field-grid">
        ${fieldInput(copy, id, entry.id, 'school', copy.school, entry.fields.school)}
        ${fieldInput(copy, id, entry.id, 'dept', copy.dept, entry.fields.dept)}
        ${fieldInput(copy, id, entry.id, 'major', copy.major, entry.fields.major)}
        ${degreeSelect(entry, copy, lang, id)}
      </div>`;
  }
  if (entry.kind === 'project-row') {
    return `${dateFields(entry, copy, lang, id)}
      ${fieldInput(copy, id, entry.id, 'content', copy.project, entry.fields.content, true)}`;
  }
  if (entry.kind === 'h3') {
    return `${dateFields(entry, copy, lang, id)}
      <div class="field-grid">
        ${fieldInput(copy, id, entry.id, 'org', copy.org, entry.fields.org)}
        ${fieldInput(copy, id, entry.id, 'role', copy.role, entry.fields.role)}
        ${fieldInput(copy, id, entry.id, 'location', copy.location, entry.fields.location)}
      </div>
      ${fieldInput(copy, id, entry.id, 'details', copy.details, entry.fields.details, true)}`;
  }
  return fieldInput(copy, id, entry.id, 'text', entry.kind === 'skill' ? copy.skill : copy.raw, entry.fields.text || entry.raw, true);
}

function entryCard(mod, entry, index, copy, lang, collapsedEntries) {
  const key = `${mod.id}:${entry.id}`;
  const isClosed = collapsed(collapsedEntries, key, true);
  const summary = entrySummary(entry);
  return `<article class="entry-card" data-entry="${attr(entry.id)}" data-module="${attr(mod.id)}" draggable="false">
    <header class="entry-head">
      <button type="button" class="grip" draggable="true" data-grip="entry" data-module="${attr(mod.id)}" data-entry="${attr(entry.id)}" aria-label="${attr(copy.gripEntry)}">⋮⋮</button>
      <button type="button" class="entry-toggle" data-action="collapse-entry" data-module="${attr(mod.id)}" data-entry="${attr(entry.id)}" aria-expanded="${isClosed ? 'false' : 'true'}">
        <span class="entry-index">${index + 1}</span>
        <span class="entry-summary">${attr(summary)}</span>
      </button>
      <div class="entry-actions">
        <button type="button" data-action="move-entry-up" data-module="${attr(mod.id)}" data-entry="${attr(entry.id)}" ${index === 0 ? 'disabled' : ''}>${attr(copy.moveUp)}</button>
        <button type="button" data-action="move-entry-down" data-module="${attr(mod.id)}" data-entry="${attr(entry.id)}" ${index === mod.entries.length - 1 ? 'disabled' : ''}>${attr(copy.moveDown)}</button>
        <button type="button" data-action="duplicate-entry" data-module="${attr(mod.id)}" data-entry="${attr(entry.id)}">${attr(copy.duplicate)}</button>
        <button type="button" class="danger" data-action="delete-entry" data-module="${attr(mod.id)}" data-entry="${attr(entry.id)}">${attr(copy.deleteEntry)}</button>
      </div>
    </header>
    <div class="entry-body" ${isClosed ? 'hidden' : ''}>
      ${entryFields(mod, entry, copy, lang)}
    </div>
  </article>`;
}

function extrasBox(mod, copy) {
  if (mod.kind !== 'education' && !mod.extras) return '';
  if (mod.kind !== 'education' && mod.kind !== 'projects') return '';
  return `<label class="field field-wide extras-field"><span>${attr(copy.notes)}</span>
    <textarea data-module="${attr(mod.id)}" data-field="extras" rows="3">${val(mod.extras || '')}</textarea>
  </label>`;
}

function moduleCard(mod, copy, lang, collapsedModules, collapsedEntries, index, count) {
  const closed = collapsed(collapsedModules, mod.id, false);
  const title = mod.known ? (mod.title || moduleTitle(mod.id, lang)) : (mod.title || copy.untitled);
  const titleField = mod.known
    ? `<h3 class="card-title">${attr(title)}</h3>`
    : `<input class="card-title-input" data-module="${attr(mod.id)}" data-field="title" value="${val(title)}" aria-label="${attr(copy.untitled)}">`;
  return `<section class="mod-card ${mod.enabled ? '' : 'is-hidden'}" data-module="${attr(mod.id)}">
    <header class="mod-head">
      <button type="button" class="grip" draggable="true" data-grip="module" data-module="${attr(mod.id)}" aria-label="${attr(copy.gripModule)}">⋮⋮</button>
      ${titleField}
      <span class="mod-count">${attr(copy.entries(mod.entries.length))}</span>
      <div class="mod-actions">
        <button type="button" data-action="move-module-up" data-module="${attr(mod.id)}" ${index === 0 ? 'disabled' : ''}>${attr(copy.moveUp)}</button>
        <button type="button" data-action="move-module-down" data-module="${attr(mod.id)}" ${index === count - 1 ? 'disabled' : ''}>${attr(copy.moveDown)}</button>
        <button type="button" data-action="collapse-module" data-module="${attr(mod.id)}" aria-expanded="${closed ? 'false' : 'true'}">${attr(closed ? copy.expand : copy.collapse)}</button>
        <button type="button" class="accent-ghost" data-action="add-entry" data-module="${attr(mod.id)}">${attr(copy.add)}</button>
      </div>
    </header>
    <div class="mod-body" ${closed ? 'hidden' : ''}>
      ${mod.entries.map((entry, i) => entryCard(mod, entry, i, copy, lang, collapsedEntries)).join('')}
      ${extrasBox(mod, copy)}
    </div>
  </section>`;
}

export function renderModuleList(doc, copy, lang, collapsedModules, collapsedEntries) {
  const visible = doc.modules.filter((m) => m.enabled);
  return visible.map((mod, index) => moduleCard(mod, copy, lang, collapsedModules, collapsedEntries, index, visible.length)).join('');
}

export function bindDrag(root, { onModuleDrop, onEntryDrop }) {
  let drag = null;
  root.addEventListener('dragstart', (event) => {
    const grip = event.target.closest('[data-grip]');
    if (!grip || !root.contains(grip)) return;
    const type = grip.dataset.grip;
    drag = {
      type,
      module: grip.dataset.module,
      entry: grip.dataset.entry || '',
    };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', type);
    const card = type === 'module' ? grip.closest('.mod-card') : grip.closest('.entry-card');
    card?.classList.add('is-dragging');
  });
  root.addEventListener('dragend', () => {
    drag = null;
    root.querySelectorAll('.is-dragging, .is-drop').forEach((el) => el.classList.remove('is-dragging', 'is-drop'));
  });
  root.addEventListener('dragover', (event) => {
    if (!drag) return;
    const card = drag.type === 'module'
      ? event.target.closest('.mod-card')
      : event.target.closest('.entry-card');
    if (!card) return;
    if (drag.type === 'entry' && card.dataset.module !== drag.module) return;
    event.preventDefault();
    root.querySelectorAll('.is-drop').forEach((el) => el.classList.remove('is-drop'));
    card.classList.add('is-drop');
  });
  root.addEventListener('drop', (event) => {
    if (!drag) return;
    event.preventDefault();
    if (drag.type === 'module') {
      const card = event.target.closest('.mod-card');
      if (card?.dataset.module && card.dataset.module !== drag.module) {
        onModuleDrop(drag.module, card.dataset.module);
      }
    } else {
      const card = event.target.closest('.entry-card');
      if (card?.dataset.entry && card.dataset.module === drag.module && card.dataset.entry !== drag.entry) {
        onEntryDrop(drag.module, drag.entry, card.dataset.entry);
      }
    }
    drag = null;
  });
}

export function isEditorField(el) {
  if (!el || el === document.body) return false;
  return Boolean(el.closest?.('input, textarea, select, [contenteditable="true"]'));
}
