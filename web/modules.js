/** Parse resume Markdown into modules, apply lossless structure ops, serialize back. */

import { parseTableBlock, parseTableLine, escapeHtml, localizeEnglishProfileLine } from './core.js?v=profile-en-20261024-r3';
import { DEFAULT_HIDDEN, LEGACY_DEFAULTS, RESUME_DEFAULTS } from './content.js?v=profile-en-20261024-r3';

export const MODULE_IDS = ['education', 'projects', 'internship', 'work', 'student', 'skills'];

export const MODULE_DEFS = [
  {
    id: 'education',
    kind: 'education',
    defaultOn: true,
    titles: { zh: '教育背景', en: 'Education' },
    aliases: ['教育背景', '教育经历', '教育', 'education', 'education & academic research', 'education and academic research'],
  },
  {
    id: 'projects',
    kind: 'projects',
    defaultOn: true,
    titles: { zh: '项目经历', en: 'Project Experience' },
    aliases: ['项目经历', '项目经验', '学术项目', 'project experience', 'academic projects', 'projects'],
  },
  {
    id: 'internship',
    kind: 'h3',
    defaultOn: true,
    titles: { zh: '实习经历', en: 'Internship Experience' },
    aliases: ['实习经历', 'internship experience', 'internships', 'experience'],
  },
  {
    id: 'work',
    kind: 'h3',
    defaultOn: false,
    titles: { zh: '工作经历', en: 'Work Experience' },
    aliases: ['工作经历', '工作经验', '职业经历', 'work experience', 'professional experience', 'employment'],
  },
  {
    id: 'student',
    kind: 'h3',
    defaultOn: true,
    titles: { zh: '学生工作', en: 'Leadership & Student Associations' },
    aliases: ['学生工作', '校园经历', '社团经历', '领导力', 'leadership & student associations', 'leadership and student associations', 'campus experience', 'leadership'],
  },
  {
    id: 'skills',
    kind: 'skills',
    defaultOn: true,
    titles: { zh: '技能及爱好', en: 'Additional Information' },
    aliases: ['技能及爱好', '技能特长', '个人技能', '技能', '其他信息', 'additional information', 'skills', 'skills & interests'],
  },
];

const DEGREE_ZH = ['学士', '硕士', '博士', '专科', '其他'];
const DEGREE_EN = ['Bachelor', 'Master', 'PhD', 'Associate', 'Other'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ALIAS_TO_ID = (() => {
  const map = Object.create(null);
  for (const def of MODULE_DEFS) {
    map[def.id] = def.id;
    map[normTitle(def.titles.zh)] = def.id;
    map[normTitle(def.titles.en)] = def.id;
    for (const alias of def.aliases) map[normTitle(alias)] = def.id;
  }
  return map;
})();

export function normTitle(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function moduleDef(id) {
  return MODULE_DEFS.find((d) => d.id === id) || null;
}

export function moduleTitle(id, lang) {
  const def = moduleDef(id);
  if (!def) return id;
  return def.titles[lang === 'en' ? 'en' : 'zh'];
}

export function isKnownModule(id) {
  return MODULE_IDS.includes(id);
}

export function defaultEnabledMap() {
  const out = {};
  for (const def of MODULE_DEFS) out[def.id] = def.defaultOn;
  return out;
}

export function cloneDoc(doc) {
  return JSON.parse(JSON.stringify(doc));
}

export function normalizeMd(md) {
  return String(md || '').replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
}

export function isExactTemplate(md, template) {
  return normalizeMd(md) === normalizeMd(template);
}

export function shouldMigrate(md, lang) {
  const key = lang === 'en' ? 'en' : 'zh';
  return isExactTemplate(md, LEGACY_DEFAULTS[key]);
}

function nid(doc) {
  doc.seq = (doc.seq || 0) + 1;
  return `n${doc.seq}`;
}

function pipeSafe(s) {
  return String(s ?? '').replace(/[\r\n]+/g, ' ').replace(/\|/g, '｜');
}

export function stripBold(s) {
  return String(s ?? '').replace(/^\*\*([\s\S]*)\*\*$/, '$1');
}

export function looksBold(s) {
  return /^\*\*[\s\S]*\*\*$/.test(String(s ?? '').trim());
}

function wrapBold(s, bold) {
  const t = String(s ?? '');
  if (!t) return '';
  if (looksBold(t)) return t;
  return bold ? `**${t}**` : t;
}

export function parseDateRange(text) {
  const raw = String(text || '').trim();
  const result = { start: '', end: '', present: false, raw, parsed: !raw };
  if (!raw || /20xx|xxxx|yyyy|\[\s*mon/i.test(raw)) return result;
  if (/^(至今|现在|present|now|current)$/i.test(raw)) {
    return { ...result, present: true, parsed: true };
  }
  const token = '(?:\\d{4}[./-]\\d{1,2}|\\d{4}年\\d{1,2}月?|[A-Za-z]{3,9}\\s*,?\\s*\\d{4})';
  const present = raw.match(new RegExp('^(' + token + ')\\s*(?:[-–—~到至]\\s*)?(?:至今|现在|present|now|current)$', 'i'));
  if (present) {
    const start = parseMonthToken(present[1]);
    return start ? { ...result, start, present: true, parsed: true } : result;
  }
  const pair = raw.match(new RegExp('^(' + token + ')\\s*[-–—~到至]\\s*(' + token + ')$', 'i'));
  if (pair) {
    const start = parseMonthToken(pair[1]), end = parseMonthToken(pair[2]);
    return start && end ? { ...result, start, end, parsed: true } : result;
  }
  const single = new RegExp('^' + token + '$', 'i').test(raw) ? parseMonthToken(raw) : '';
  return single ? { ...result, start: single, end: single, parsed: true } : result;
}

function parseMonthToken(token) {
  const t = String(token || '').trim().replace(/[,，]/g, ' ').replace(/\s+/g, ' ');
  let m = t.match(/^(\d{4})[./-](\d{1,2})$/);
  if (m) return toYearMonth(m[1], m[2]);
  m = t.match(/^(\d{4})年(\d{1,2})月?$/);
  if (m) return toYearMonth(m[1], m[2]);
  m = t.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (m) {
    const idx = monthIndex(m[1]);
    if (idx >= 0) return `${m[2]}-${String(idx + 1).padStart(2, '0')}`;
  }
  return '';
}

function monthIndex(name) {
  const n = name.slice(0, 3).toLowerCase();
  const short = MONTHS_EN.map((x) => x.toLowerCase());
  return short.indexOf(n);
}

function toYearMonth(year, month) {
  const y = Number(year);
  const mo = Number(month);
  if (!Number.isInteger(y) || y < 1900 || y > 2100) return '';
  if (!Number.isInteger(mo) || mo < 1 || mo > 12) return '';
  return `${y}-${String(mo).padStart(2, '0')}`;
}

export function formatDateRange(range, lang = 'zh') {
  if (!range) return '';
  if (range.raw) return range.raw;
  if (!range.start && !range.end && !range.present) return range.raw || '';
  const start = formatMonth(range.start, lang);
  if (range.present) {
    return start ? `${start}-${lang === 'en' ? 'Present' : '至今'}` : (lang === 'en' ? 'Present' : '至今');
  }
  const end = formatMonth(range.end, lang);
  if (start && end && start !== end) return `${start}-${end}`;
  return start || end || '';
}

function formatMonth(ym, lang) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return '';
  const [y, m] = ym.split('-');
  if (lang === 'en') return `${MONTHS_EN[Number(m) - 1]} ${y}`;
  return `${y}.${m}`;
}

export function degreeOptions(lang) {
  return lang === 'en' ? DEGREE_EN : DEGREE_ZH;
}

export function matchDegree(value, lang) {
  const t = stripBold(String(value || ''))
    .replace(/[\[\]]/g, '')
    .replace(/学位/g, '')
    .replace(/\s*degree$/i, '')
    .trim();
  if (!t) return '';
  const opts = degreeOptions(lang);
  const lower = t.toLowerCase();
  for (const opt of opts) {
    if (opt.toLowerCase() === lower) return opt;
    if (t.includes(opt)) return opt;
  }
  if (/^(?:bachelor\b|b\.?[as]\.?$|学士|本科)/i.test(t)) return lang === 'en' ? 'Bachelor' : '学士';
  if (/^(?:master\b|m\.?(?:a|s|eng)\.?$|m[bfmp]a$|硕士|研究生)/i.test(t)) return lang === 'en' ? 'Master' : '硕士';
  if (/^(?:ph\.?d\.?$|doctor\b|博士)/i.test(t)) return lang === 'en' ? 'PhD' : '博士';
  return t;
}

function splitProfile(lines) {
  let name = '';
  const contact = [];
  for (const line of lines) {
    if (!name && /^\s*#\s+/.test(line)) {
      name = line.replace(/^\s*#\s+/, '');
    } else {
      contact.push(line);
    }
  }
  while (contact.length && contact[0].trim() === '') contact.shift();
  while (contact.length && contact[contact.length - 1].trim() === '') contact.pop();
  return { name, contact: contact.join('\n') };
}

function splitSections(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  const profileLines = [];
  const sections = [];
  let current = null;
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      if (current) sections.push(current);
      current = { title: line.replace(/^##\s+/, '').trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      profileLines.push(line);
    }
  }
  if (current) sections.push(current);
  return { profileLines, sections };
}

function identifyModule(title, used) {
  const id = ALIAS_TO_ID[normTitle(title)];
  if (id && !used.has(id)) {
    used.add(id);
    return id;
  }
  const base = `custom:${title || 'untitled'}`;
  let key = base;
  let n = 2;
  while (used.has(key)) {
    key = `${base}:${n}`;
    n += 1;
  }
  used.add(key);
  return key;
}

function bodyText(lines) {
  const copy = [...lines];
  while (copy.length && copy[0].trim() === '') copy.shift();
  while (copy.length && copy[copy.length - 1].trim() === '') copy.pop();
  return copy.join('\n');
}

function parseSectionBody(doc, lines, hintedKind) {
  const trimmed = [];
  let start = 0;
  let end = lines.length;
  while (start < end && String(lines[start]).trim() === '') start += 1;
  while (end > start && String(lines[end - 1]).trim() === '') end -= 1;
  for (let i = start; i < end; i += 1) trimmed.push(lines[i]);
  if (!trimmed.length) {
    return { kind: hintedKind || 'raw', header: null, entries: [], extras: '', raw: '' };
  }
  const joined = trimmed.join('\n');
  const first = trimmed[0].trim();
  if (first.startsWith('|')) {
    return parseTableSection(doc, trimmed, hintedKind);
  }
  if (trimmed.some((ln) => ln.trim().startsWith('### '))) {
    return parseH3Section(doc, trimmed);
  }
  if (hintedKind === 'skills' || hintedKind === 'education' || hintedKind === 'projects') {
    return parseParagraphSection(doc, trimmed, hintedKind === 'skills' ? 'skills' : 'raw');
  }
  return parseParagraphSection(doc, trimmed, 'skills');
}

function parseTableSection(doc, lines, hintedKind) {
  const block = parseTableBlock(lines, 0);
  const dataRows = block.dataRows;
  const headerRow = dataRows[0] || null;
  const rows = dataRows.slice(1);
  const cols = headerRow ? headerRow.cells.length : (dataRows[0]?.cells.length || 0);
  let kind = hintedKind;
  if (cols === 5) kind = 'education';
  else if (cols === 2) kind = 'projects';
  else kind = kind || 'table';
  const after = lines.slice(block.end);
  const extras = bodyText(after);
  const headerRaw = headerRow ? headerRow.raw : '';
  const sep = lines.find((ln) => parseTableLine(ln)?.isSeparator) || '| --- |';
  const entries = rows.map((row) => tableEntry(doc, row, kind));
  return {
    kind,
    header: headerRow ? { cells: headerRow.cells.slice(), raw: headerRaw, sep } : null,
    entries,
    extras,
    raw: lines.join('\n'),
  };
}

function tableEntry(doc, row, kind) {
  const cells = row.cells.slice();
  const date = parseDateRange(cells[0] || '');
  const entry = {
    id: nid(doc),
    kind: kind === 'education' ? 'edu-row' : (kind === 'projects' ? 'project-row' : 'table-row'),
    raw: row.raw,
    edited: false,
    cells,
    bold: cells.map(looksBold),
    date,
    fields: {},
  };
  if (entry.kind === 'edu-row') {
    entry.fields = {
      school: stripBold(cells[1] || ''),
      dept: stripBold(cells[2] || ''),
      major: stripBold(cells[3] || ''),
      degree: stripBold(cells[4] || ''),
    };
  } else {
    entry.fields = { content: stripBold(cells[1] || cells[0] || '') };
  }
  return entry;
}

function parseH3Section(doc, lines) {
  const entries = [];
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i += 1;
  while (i < lines.length) {
    if (!lines[i].trim().startsWith('### ')) {
      const rest = bodyText(lines.slice(i));
      if (rest) {
        entries.push({
          id: nid(doc),
          kind: 'raw',
          raw: rest,
          edited: false,
          fields: { text: rest },
          date: parseDateRange(''),
        });
      }
      break;
    }
    const start = i;
    i += 1;
    while (i < lines.length && !lines[i].trim().startsWith('### ')) i += 1;
    const chunk = lines.slice(start, i);
    entries.push(parseH3Entry(doc, chunk));
  }
  return { kind: 'h3', header: null, entries, extras: '', raw: lines.join('\n') };
}

function parseH3Entry(doc, chunk) {
  const raw = chunk.join('\n').replace(/\n+$/, '');
  const head = chunk[0].replace(/^\s*###\s+/, '');
  const parts = head.split(' | ').map((p) => p.trim());
  let org = parts[0] || '';
  let role = '';
  let location = '';
  let dateRaw = '';
  if (parts.length >= 3) {
    role = parts[1] || '';
    dateRaw = parts.slice(2).join(' | ');
  } else if (parts.length === 2) {
    if (parseDateRange(parts[1]).parsed || /至今|present|20\d{2}|20xx/i.test(parts[1])) {
      dateRaw = parts[1];
    } else {
      role = parts[1];
    }
  }
  let cursor = 1;
  while (cursor < chunk.length && chunk[cursor].trim() === '') cursor += 1;
  if (cursor < chunk.length) {
    const line = chunk[cursor].trim();
    const roleParts = line.split(' | ').map((p) => p.trim());
    const isRoleLine = /^\*\*[^*]+\*\*(?:\s+\|\s*.*)?$/.test(line)
      || (roleParts.length === 2 && (parseDateRange(roleParts[1]).parsed || /20xx|\[.*20xx/i.test(roleParts[1])));
    if (parts.length < 3 && isRoleLine) {
      if (parts.length === 2 && !dateRaw) location = parts[1];
      role = stripBold(roleParts[0] || '');
      if (roleParts[1] && !dateRaw) dateRaw = roleParts[1];
      if (parts.length === 2 && !parseDateRange(parts[1]).parsed && !/至今|present/i.test(parts[1])) {
        location = parts[1];
      }
      cursor += 1;
    }
  }
  const details = bodyText(chunk.slice(cursor));
  return {
    id: nid(doc),
    kind: 'h3',
    raw,
    edited: false,
    date: parseDateRange(dateRaw),
    fields: { org, role, location, details },
  };
}

function parseParagraphSection(doc, lines, kind) {
  const entries = [];
  let buf = [];
  const flush = () => {
    const text = bodyText(buf);
    buf = [];
    if (!text) return;
    entries.push({
      id: nid(doc),
      kind: kind === 'skills' ? 'skill' : 'raw',
      raw: text,
      edited: false,
      date: parseDateRange(''),
      fields: { text },
    });
  };
  const useBlank = lines.some((ln) => ln.trim() === '');
  if (useBlank) {
    for (const line of lines) {
      if (line.trim() === '') flush();
      else buf.push(line);
    }
    flush();
  } else {
    for (const line of lines) {
      if (line.trim()) {
        entries.push({
          id: nid(doc),
          kind: kind === 'skills' ? 'skill' : 'raw',
          raw: line,
          edited: false,
          date: parseDateRange(''),
          fields: { text: line },
        });
      }
    }
  }
  return { kind: kind || 'skills', header: null, entries, extras: '', raw: lines.join('\n') };
}

function defaultHeader(kind, lang) {
  if (kind === 'education') {
    return lang === 'en'
      ? { cells: ['Period', 'School', 'Department', 'Major', 'Degree'], raw: '| Period | School | Department | Major | Degree |', sep: '| --- | --- | --- | --- | --- |' }
      : { cells: ['时间', '学校', '院系', '专业', '学位'], raw: '| 时间 | 学校 | 院系 | 专业 | 学位 |', sep: '| --- | --- | --- | --- | --- |' };
  }
  if (kind === 'projects') {
    return lang === 'en'
      ? { cells: ['Period', 'Project'], raw: '| Period | Project |', sep: '| --- | --- |' }
      : { cells: ['时间', '项目内容'], raw: '| 时间 | 项目内容 |', sep: '| --- | --- |' };
  }
  return null;
}

export function defaultEntry(doc, kind, lang) {
  const zh = lang !== 'en';
  if (kind === 'education' || kind === 'edu-row') {
    const cells = ['', zh ? '**[学校名称]**' : '**[School]**', zh ? '**[院系名称]**' : '**[Department]**', zh ? '**[专业]**' : '**[Major]**', zh ? '**[学位]**' : '**[Degree]**'];
    return tableEntry(doc, { cells, raw: '' }, 'education');
  }
  if (kind === 'projects' || kind === 'project-row') {
    const cells = ['', zh ? '**[项目名称]**：[简要说明]' : '**[Project name]**: [one-line summary]'];
    return tableEntry(doc, { cells, raw: '' }, 'projects');
  }
  if (kind === 'h3') {
    return {
      id: nid(doc),
      kind: 'h3',
      raw: '',
      edited: true,
      date: parseDateRange(''),
      fields: {
        org: zh ? '[机构名称]' : '[Organization]',
        role: zh ? '[岗位名称]' : '[Role]',
        location: '',
        details: zh ? '- [工作内容]' : '- [What you did]',
      },
    };
  }
  return {
    id: nid(doc),
    kind: 'skill',
    raw: '',
    edited: true,
    date: parseDateRange(''),
    fields: { text: zh ? '**技能：** [请填写]' : '**Skill:** [to fill in]' },
  };
}

function hintedKindFor(id) {
  return moduleDef(id)?.kind || null;
}

function makeModule(doc, { id, title, enabled, lines, lang }) {
  const hint = hintedKindFor(id);
  const parsed = parseSectionBody(doc, lines, hint);
  const kind = parsed.kind || hint || 'raw';
  return {
    id,
    title: title || moduleTitle(id, lang) || id.replace(/^custom:/, ''),
    kind,
    enabled: enabled !== false,
    known: isKnownModule(id),
    header: parsed.header || defaultHeader(kind, lang),
    entries: parsed.entries,
    extras: parsed.extras || '',
    extrasEdited: false,
    raw: parsed.raw,
  };
}

function emptyModule(doc, id, lang) {
  const def = moduleDef(id);
  const kind = def?.kind || 'raw';
  const entries = [defaultEntry(doc, kind, lang), defaultEntry(doc, kind, lang), defaultEntry(doc, kind, lang)];
  return {
    id,
    title: moduleTitle(id, lang),
    kind,
    enabled: false,
    known: true,
    header: defaultHeader(kind, lang),
    entries,
    extras: '',
    extrasEdited: false,
    raw: '',
  };
}

function mergeOrder(parsedIds) {
  const order = [...parsedIds];
  for (const id of MODULE_IDS) {
    if (order.includes(id)) continue;
    const idx = MODULE_IDS.indexOf(id);
    let insertAt = order.length;
    for (let i = 0; i < order.length; i += 1) {
      const ci = MODULE_IDS.indexOf(order[i]);
      if (ci === -1) continue;
      if (ci > idx) {
        insertAt = i;
        break;
      }
    }
    order.splice(insertAt, 0, id);
  }
  return order;
}

export function parseDocument(md, opts = {}) {
  const lang = opts.lang === 'en' ? 'en' : 'zh';
  const doc = { lang, seq: 0, profile: { name: '', contact: '' }, modules: [] };
  const { profileLines, sections } = splitSections(md);
  doc.profile = splitProfile(lang === 'en' ? profileLines.map(localizeEnglishProfileLine) : profileLines);
  const used = new Set();
  const parsed = [];
  for (const section of sections) {
    const id = identifyModule(section.title, used);
    parsed.push(makeModule(doc, { id, title: section.title, enabled: true, lines: section.lines, lang }));
  }
  const hidden = opts.hidden && typeof opts.hidden === 'object' ? opts.hidden : {};
  const enabledOpt = opts.enabled && typeof opts.enabled === 'object' ? opts.enabled : null;
  const parsedIds = parsed.map((m) => m.id);
  const order = Array.isArray(opts.order) && opts.order.length
    ? uniqueStrings([...opts.order, ...parsedIds, ...MODULE_IDS])
    : mergeOrder(parsedIds);

  const byId = Object.create(null);
  for (const mod of parsed) byId[mod.id] = mod;

  for (const id of Object.keys(hidden)) {
    if (byId[id]) continue;
    if (typeof hidden[id] !== 'string' || !hidden[id].trim()) continue;
    const hiddenMd = hidden[id];
    const split = splitSections(hiddenMd.startsWith('## ') ? hiddenMd : `## ${moduleTitle(id, lang)}\n${hiddenMd}`);
    const sec = split.sections[0];
    const title = sec?.title || moduleTitle(id, lang);
    const lines = sec ? sec.lines : hiddenMd.split('\n');
    const hidId = byId[id] ? identifyModule(title, used) : (isKnownModule(id) ? id : identifyModule(title, used));
    if (isKnownModule(id)) used.add(id);
    byId[id] = makeModule(doc, { id: hidId === id ? id : id, title, enabled: false, lines, lang });
    byId[id].id = id;
    byId[id].enabled = false;
  }

  for (const id of MODULE_IDS) {
    if (byId[id]) continue;
    if (hidden[id]) continue;
    const fillDefault = opts.fillMissing === true && !enabledOpt;
    if (fillDefault && id === 'work') {
      const split = splitSections(DEFAULT_HIDDEN[lang]);
      const sec = split.sections[0];
      byId[id] = makeModule(doc, { id, title: sec.title, enabled: false, lines: sec.lines, lang });
    } else {
      byId[id] = emptyModule(doc, id, lang);
      byId[id].enabled = false;
      byId[id].entries = [];
      byId[id].uninitialized = true;
    }
  }

  doc.modules = [];
  const seen = new Set();
  for (const id of order) {
    if (!byId[id] || seen.has(id)) continue;
    seen.add(id);
    if (enabledOpt && isKnownModule(id) && typeof enabledOpt[id] === 'boolean') {
      byId[id].enabled = enabledOpt[id];
    }
    doc.modules.push(byId[id]);
  }
  for (const id of Object.keys(byId)) {
    if (seen.has(id)) continue;
    doc.modules.push(byId[id]);
  }
  return doc;
}

function uniqueStrings(list) {
  const out = [];
  const seen = new Set();
  for (const item of list) {
    if (typeof item !== 'string' || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

export function serializeProfile(profile) {
  const name = profile?.name != null ? String(profile.name) : '';
  const contact = profile?.contact != null ? String(profile.contact) : '';
  const lines = [];
  if (name || contact) lines.push(`# ${name}`);
  if (contact) lines.push(contact);
  return lines.join('\n');
}

function serializeTable(mod, lang) {
  const header = mod.header || defaultHeader(mod.kind, lang);
  const cols = header?.cells?.length || (mod.kind === 'education' ? 5 : 2);
  const headLine = header?.raw || `| ${header.cells.join(' | ')} |`;
  const sep = header?.sep || `| ${Array.from({ length: cols }, () => '---').join(' | ')} |`;
  const rows = mod.entries.map((entry) => serializeTableRow(entry, mod.kind, lang, cols));
  const extras = mod.extras ? `\n${mod.extras.replace(/^\n+/, '')}` : '';
  return [headLine, sep, ...rows].join('\n') + extras;
}

function serializeTableRow(entry, kind, lang, cols) {
  if (!entry.edited && entry.raw) return entry.raw;
  const date = formatDateRange(entry.date, lang);
  if (kind === 'education' || entry.kind === 'edu-row') {
    const cells = [
      pipeSafe(date),
      pipeSafe(wrapBold(entry.fields.school, entry.bold?.[1] !== false)),
      pipeSafe(wrapBold(entry.fields.dept, entry.bold?.[2] !== false)),
      pipeSafe(wrapBold(entry.fields.major, entry.bold?.[3] !== false)),
      pipeSafe(wrapBold(entry.fields.degree, entry.bold?.[4])),
    ];
    while (cells.length < cols) cells.push(entry.cells?.[cells.length] || '');
    return `| ${cells.join(' | ')} |`;
  }
  const content = entry.fields.content != null ? entry.fields.content : (entry.cells?.[1] || '');
  const cells = [pipeSafe(date), pipeSafe(wrapBold(content, entry.bold?.[1]))];
  while (cells.length < cols) cells.push(entry.cells?.[cells.length] || '');
  return `| ${cells.slice(0, cols).join(' | ')} |`;
}

function serializeH3(entry, lang) {
  if (!entry.edited && entry.raw) return entry.raw;
  const date = formatDateRange(entry.date, lang);
  const org = entry.fields.org || '';
  const role = entry.fields.role || '';
  const location = entry.fields.location || '';
  let head;
  if (location && role) {
    head = `### ${org} | ${location}`;
    const roleLine = date ? `**${stripBold(role)}** | ${date}` : `**${stripBold(role)}**`;
    const details = entry.fields.details || '';
    return [head, roleLine, details].filter((x, i) => x || i === 0).join('\n');
  }
  const parts = [org];
  if (role) parts.push(role);
  if (date) parts.push(date);
  head = `### ${parts.join(' | ')}`;
  const details = entry.fields.details || '';
  return details ? `${head}\n${details}` : head;
}

function serializeSkill(entry) {
  if (!entry.edited && entry.raw) return entry.raw;
  return String(entry.fields.text ?? entry.raw ?? '');
}

export function serializeEntry(entry, mod, lang) {
  if (entry.kind === 'edu-row' || entry.kind === 'project-row' || entry.kind === 'table-row') {
    return serializeTableRow(entry, mod.kind, lang, mod.header?.cells?.length || 2);
  }
  if (entry.kind === 'h3') return serializeH3(entry, lang);
  if (entry.kind === 'skill' || entry.kind === 'raw') return serializeSkill(entry);
  return entry.raw || '';
}

export function serializeModule(mod, lang) {
  const title = mod.title || moduleTitle(mod.id, lang) || mod.id;
  const body = serializeModuleBody(mod, lang);
  return body ? `## ${title}\n${body}` : `## ${title}`;
}

export function serializeModuleBody(mod, lang) {
  if (mod.kind === 'education' || mod.kind === 'projects' || mod.kind === 'table') {
    if (!mod.entries.length && !mod.extras) {
      const header = mod.header || defaultHeader(mod.kind, lang);
      if (!header) return '';
      return `${header.raw || `| ${header.cells.join(' | ')} |`}\n${header.sep}`;
    }
    return serializeTable(mod, lang);
  }
  const chunks = mod.entries.map((entry) => serializeEntry(entry, mod, lang)).filter((x) => x != null && String(x).length);
  const extras = mod.extras ? mod.extras.replace(/^\n+/, '') : '';
  const joined = chunks.join(mod.kind !== 'h3' && chunks.some(chunk => chunk.includes('\n')) ? '\n\n' : '\n');
  return extras ? (joined ? `${joined}\n${extras}` : extras) : joined;
}

export function serializeVisible(doc) {
  const lang = doc.lang === 'en' ? 'en' : 'zh';
  const parts = [];
  const profile = serializeProfile(doc.profile);
  if (profile) parts.push(profile);
  for (const mod of doc.modules) {
    if (!mod.enabled) continue;
    parts.push(serializeModule(mod, lang));
  }
  let out = parts.join('\n\n');
  if (out && !out.endsWith('\n')) out += '\n';
  return out;
}

export function hiddenMap(doc) {
  const lang = doc.lang === 'en' ? 'en' : 'zh';
  const out = {};
  for (const mod of doc.modules) {
    if (mod.enabled) continue;
    if (mod.uninitialized) continue;
    const md = serializeModule(mod, lang);
    if (md) out[mod.id] = md.endsWith('\n') ? md : `${md}\n`;
  }
  return out;
}

export function enabledMap(doc) {
  const out = defaultEnabledMap();
  for (const mod of doc.modules) {
    if (isKnownModule(mod.id)) out[mod.id] = Boolean(mod.enabled);
  }
  return out;
}

export function orderIds(doc) {
  return doc.modules.map((m) => m.id);
}

export function findModule(doc, id) {
  return doc.modules.find((m) => m.id === id) || null;
}

export function findEntry(mod, entryId) {
  return mod?.entries.find((e) => e.id === entryId) || null;
}

export function toggleModule(doc, id, on) {
  const next = cloneDoc(doc);
  let mod = findModule(next, id);
  if (!mod && isKnownModule(id)) {
    mod = emptyModule(next, id, next.lang);
    const idx = MODULE_IDS.indexOf(id);
    let insertAt = next.modules.length;
    for (let i = 0; i < next.modules.length; i += 1) {
      const ci = MODULE_IDS.indexOf(next.modules[i].id);
      if (ci === -1) continue;
      if (ci > idx) {
        insertAt = i;
        break;
      }
    }
    next.modules.splice(insertAt, 0, mod);
  }
  if (!mod) return next;
  const enable = on !== false;
  if (enable && mod.uninitialized && isKnownModule(id)) {
    const filled = emptyModule(next, id, next.lang);
    filled.enabled = true;
    const index = next.modules.findIndex((m) => m.id === id);
    next.modules[index] = filled;
    return next;
  }
  mod.enabled = enable;
  return next;
}

export function addEntry(doc, moduleId, afterId) {
  const next = cloneDoc(doc);
  const mod = findModule(next, moduleId);
  if (!mod) return next;
  const entry = mod.kind === 'table'
    ? tableEntry(next, { cells: Array(mod.header?.cells.length || 2).fill(''), raw: '' }, 'table')
    : defaultEntry(next, mod.kind, next.lang);
  entry.edited = true;
  const index = mod.entries.findIndex(e => e.id === afterId);
  mod.entries.splice(index < 0 ? mod.entries.length : index + 1, 0, entry);
  return next;
}

export function deleteEntry(doc, moduleId, entryId) {
  const next = cloneDoc(doc);
  const mod = findModule(next, moduleId);
  if (!mod) return next;
  mod.entries = mod.entries.filter((e) => e.id !== entryId);
  return next;
}

export function duplicateEntry(doc, moduleId, entryId) {
  const next = cloneDoc(doc);
  const mod = findModule(next, moduleId);
  if (!mod) return next;
  const index = mod.entries.findIndex((e) => e.id === entryId);
  if (index < 0) return next;
  const copy = JSON.parse(JSON.stringify(mod.entries[index]));
  copy.id = nid(next);
  mod.entries.splice(index + 1, 0, copy);
  return next;
}

export function moveEntry(doc, moduleId, entryId, dir) {
  const next = cloneDoc(doc);
  const mod = findModule(next, moduleId);
  if (!mod) return next;
  const index = mod.entries.findIndex((e) => e.id === entryId);
  const target = index + (dir < 0 ? -1 : 1);
  if (index < 0 || target < 0 || target >= mod.entries.length) return next;
  const [item] = mod.entries.splice(index, 1);
  mod.entries.splice(target, 0, item);
  return next;
}

export function reorderEntries(doc, moduleId, fromId, toId) {
  const next = cloneDoc(doc);
  const mod = findModule(next, moduleId);
  if (!mod || fromId === toId) return next;
  const from = mod.entries.findIndex((e) => e.id === fromId);
  if (from < 0) return next;
  const [item] = mod.entries.splice(from, 1);
  const insert = mod.entries.findIndex((e) => e.id === toId);
  mod.entries.splice(insert < 0 ? mod.entries.length : insert, 0, item);
  return next;
}

export function moveModule(doc, moduleId, dir) {
  const next = cloneDoc(doc);
  const index = next.modules.findIndex((m) => m.id === moduleId);
  if (index < 0) return next;
  const step = dir < 0 ? -1 : 1;
  let target = index + step;
  const movingEnabled = next.modules[index].enabled;
  while (target >= 0 && target < next.modules.length) {
    if (!movingEnabled || next.modules[target].enabled) break;
    target += step;
  }
  if (target < 0 || target >= next.modules.length) return next;
  const list = next.modules;
  const item = list[index];
  list[index] = list[target];
  list[target] = item;
  return next;
}

export function reorderModules(doc, fromId, toId) {
  const next = cloneDoc(doc);
  if (fromId === toId) return next;
  const from = next.modules.findIndex((m) => m.id === fromId);
  if (from < 0) return next;
  const [item] = next.modules.splice(from, 1);
  const insert = next.modules.findIndex((m) => m.id === toId);
  next.modules.splice(insert < 0 ? next.modules.length : insert, 0, item);
  return next;
}

export function updateProfile(doc, fields) {
  const next = cloneDoc(doc);
  if (fields.name != null) next.profile.name = String(fields.name).replace(/[\r\n]+/g, ' ');
  if (fields.contact != null) next.profile.contact = String(fields.contact);
  return next;
}

function markEdited(entry) {
  entry.edited = true;
  entry.raw = '';
}

export function updateEntryField(doc, moduleId, entryId, key, value) {
  const next = cloneDoc(doc);
  const mod = findModule(next, moduleId);
  const entry = findEntry(mod, entryId);
  if (!entry) return next;
  markEdited(entry);
  if (key === 'start' || key === 'end' || key === 'present') {
    entry.date = {
      ...entry.date,
      parsed: true,
      raw: '',
      [key]: key === 'present' ? Boolean(value) : String(value || ''),
    };
    if (key === 'present' && value) entry.date.end = '';
    return next;
  }
  if (key === 'dateRaw') {
    entry.date = parseDateRange(value);
    if (!entry.date.parsed) entry.date.raw = String(value || '');
    return next;
  }
  entry.fields[key] = value;
  return next;
}

export function updateModuleExtra(doc, moduleId, value) {
  const next = cloneDoc(doc);
  const mod = findModule(next, moduleId);
  if (!mod) return next;
  mod.extras = String(value || '');
  mod.extrasEdited = true;
  return next;
}

export function updateModuleTitle(doc, moduleId, title) {
  const next = cloneDoc(doc);
  const mod = findModule(next, moduleId);
  if (!mod) return next;
  mod.title = String(title || '').replace(/[\r\n]+/g, ' ');
  return next;
}

export function entrySummary(entry) {
  if (!entry) return '';
  const plain = (value) => String(value || '').replace(/\*\*/g, '').replace(/^[-*]\s+/, '').replace(/\s+/g, ' ').trim();
  if (entry.kind === 'edu-row') return plain(entry.fields.school) || plain(entry.fields.major) || '—';
  if (entry.kind === 'project-row') {
    const t = plain(entry.fields.content);
    return t.slice(0, 48) || '—';
  }
  if (entry.kind === 'h3') {
    const bits = [entry.fields.org, entry.fields.role].map(plain).filter(Boolean);
    return bits.join(' · ') || '—';
  }
  const t = plain(entry.fields.text || entry.raw);
  return t.slice(0, 48) || '—';
}

export function normalizeModulesState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { enabled: null, hidden: {}, order: null };
  }
  const enabled = {};
  if (raw.enabled && typeof raw.enabled === 'object' && !Array.isArray(raw.enabled)) {
    for (const id of MODULE_IDS) {
      if (typeof raw.enabled[id] === 'boolean') enabled[id] = raw.enabled[id];
    }
  }
  const hidden = {};
  if (raw.hidden && typeof raw.hidden === 'object' && !Array.isArray(raw.hidden)) {
    for (const [key, value] of Object.entries(raw.hidden)) {
      if (typeof key === 'string' && typeof value === 'string') hidden[key] = value;
    }
  }
  const order = Array.isArray(raw.order) ? raw.order.filter((x) => typeof x === 'string') : null;
  return {
    enabled: Object.keys(enabled).length ? enabled : null,
    hidden,
    order: order && order.length ? order : null,
  };
}

export function modulesPayload(doc) {
  return {
    enabled: enabledMap(doc),
    hidden: hiddenMap(doc),
    order: orderIds(doc),
  };
}

export function freshDocument(lang) {
  const key = lang === 'en' ? 'en' : 'zh';
  return parseDocument(RESUME_DEFAULTS[key], {
    lang: key,
    hidden: { work: DEFAULT_HIDDEN[key] },
    enabled: defaultEnabledMap(),
    fillMissing: true,
  });
}

export function documentFromState(md, lang, modulesState, { migrate = true, isMarkdownImport = false } = {}) {
  const key = lang === 'en' ? 'en' : 'zh';
  if (migrate && shouldMigrate(md, key)) {
    return freshDocument(key);
  }
  const normalized = normalizeModulesState(modulesState);
  if (isMarkdownImport) {
    return parseDocument(md, { lang: key, hidden: {}, enabled: null, order: null });
  }
  const isFresh = isExactTemplate(md, RESUME_DEFAULTS[key]);
  const hidden = { ...normalized.hidden };
  if (isFresh && !hidden.work && !(normalized.enabled && normalized.enabled.work)) {
    hidden.work = DEFAULT_HIDDEN[key];
  }
  return parseDocument(md, {
    lang: key,
    hidden,
    enabled: normalized.enabled,
    order: normalized.order,
    fillMissing: isFresh,
  });
}

export function snapshotOf(doc) {
  return {
    lang: doc.lang,
    markdown: serializeVisible(doc),
    modules: modulesPayload(doc),
  };
}

export function createUndoStack(limit = 50) {
  return { past: [], future: [], limit };
}

export function pushUndo(stack, snap) {
  stack.past.push(snap);
  if (stack.past.length > stack.limit) stack.past.shift();
  stack.future = [];
}

export function undoOnce(stack, current) {
  if (!stack.past.length) return null;
  const prev = stack.past.pop();
  stack.future.push(current);
  return prev;
}

export function redoOnce(stack, current) {
  if (!stack.future.length) return null;
  const next = stack.future.pop();
  stack.past.push(current);
  return next;
}

export { escapeHtml, LEGACY_DEFAULTS, RESUME_DEFAULTS, DEFAULT_HIDDEN };
