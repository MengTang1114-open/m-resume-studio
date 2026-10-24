/** Pure resume-studio logic. Safe in browsers and Node tests. */

const HAN = /[\u3400-\u9FFF\uF900-\uFAFF]/;
const PLACEHOLDER_RE = /\[[^\]\n]{0,80}\]|待补充|待核实|20XX|YYYY|\bTODO\b|\bTBD\b/i;
const ACTION_RE = /负责|完成|撰写|分析|整理|设计|协调|推进|参与|使用|开展|交付|优化|核对|搭建|组织|策划|调研|支持|跟进|记录|梳理|比较|识别|拆分|验证|Built|Analyzed|Prepared|Coordinated|Developed|Created|Reviewed|Supported|Organized|Examined/i;
const RESULT_RE = /结果|成果|提升|缩短|完成|获得|形成|交付|达到|采用|通过|评|奖|reduced|increased|delivered|resulting|awarded|produced|improved/i;

export const MAX_TRANSLATE_BYTES = 499;
export const STATE_KEY = 'resume-studio-state-v1';
export const HISTORY_LIMIT = 50;

/** Standard 2-inch ID photo: 35mm × 49mm (5:7) at 300 dpi. */
export const PHOTO_WIDTH_MM = 35;
export const PHOTO_HEIGHT_MM = 49;
export const PHOTO_PIXEL_WIDTH = 413;
export const PHOTO_PIXEL_HEIGHT = 579;
export const MAX_PHOTO_INPUT_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTO_DATA_URL_LENGTH = 280000;
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const DEFAULT_PHOTO = { enabled: false, offsetY: 0, id: null };

export const SECTION_I18N = {
  教育背景: 'Education',
  教育经历: 'Education',
  教育: 'Education',
  项目经历: 'Project Experience',
  项目经验: 'Project Experience',
  学术项目: 'Academic Projects',
  实习经历: 'Internship Experience',
  工作经历: 'Work Experience',
  工作经验: 'Work Experience',
  职业经历: 'Professional Experience',
  学生工作: 'Leadership & Student Associations',
  校园经历: 'Campus Experience',
  社团经历: 'Leadership & Student Associations',
  领导力: 'Leadership',
  技能及爱好: 'Additional Information',
  技能特长: 'Skills',
  个人技能: 'Skills',
  技能: 'Skills',
  其他信息: 'Additional Information',
  获奖情况: 'Awards',
  荣誉奖项: 'Honors & Awards',
  证书: 'Certificates',
  科研成果: 'Research',
  科研经历: 'Research Experience',
  自我评价: 'Profile',
  个人总结: 'Summary',
  志愿者经历: 'Volunteer Experience',
  志愿经历: 'Volunteer Experience',
};

export const TABLE_HEADER_I18N = {
  时间: 'Period',
  学校: 'School',
  院系: 'Department',
  专业: 'Major',
  学位: 'Degree',
  项目内容: 'Project',
  内容: 'Description',
  经历: 'Experience',
};

export const LAYOUT_PRESETS = {
  classic: { preset: 'classic', size: 9, lead: 1.73, pad: 36, accent: '#111111', family: 'classic' },
  compact: { preset: 'compact', size: 8, lead: 1.42, pad: 22, accent: '#111111', family: 'classic' },
  modern: { preset: 'modern', size: 9.5, lead: 1.62, pad: 30, accent: '#2340D8', family: 'modern' },
};

export const DEFAULT_LAYOUT = { ...LAYOUT_PRESETS.classic };

export const ACCENT_SWATCHES = ['#FFB12B', '#111111', '#2340D8'];

export function hasChinese(s) {
  return HAN.test(String(s || ''));
}

export function utf8ByteLength(s) {
  return new TextEncoder().encode(String(s)).length;
}

/** Split so every chunk is strictly fewer than 500 UTF-8 bytes. */
export function splitUtf8(str, maxBytes = MAX_TRANSLATE_BYTES) {
  const limit = Math.min(maxBytes, MAX_TRANSLATE_BYTES);
  const text = String(str ?? '');
  if (!text) return [];
  if (utf8ByteLength(text) < limit) return [text];
  const chunks = [];
  let current = '';
  for (const char of text) {
    const next = current + char;
    if (utf8ByteLength(next) >= limit) {
      if (current) chunks.push(current);
      if (utf8ByteLength(char) >= limit) {
        chunks.push(char);
        current = '';
      } else {
        current = char;
      }
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

export function tokenizeInline(s) {
  const text = String(s);
  const parts = [];
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('**', i)) {
      const close = text.indexOf('**', i + 2);
      if (close === -1) {
        parts.push({ kind: 'text', text: text.slice(i) });
        break;
      }
      parts.push({ kind: 'bold', text: text.slice(i + 2, close) });
      i = close + 2;
    } else {
      const next = text.indexOf('**', i);
      const end = next === -1 ? text.length : next;
      parts.push({ kind: 'text', text: text.slice(i, end) });
      i = end;
    }
  }
  return parts.filter((p) => p.text !== '');
}

export function inlineHtml(s) {
  return tokenizeInline(s).map((p) => {
    const t = escapeHtml(p.text);
    return p.kind === 'bold' ? `<strong>${t}</strong>` : t;
  }).join('');
}

export function parseTableLine(line) {
  const trimmed = String(line).trim();
  if (!trimmed.startsWith('|')) return null;
  const inner = trimmed.endsWith('|') && trimmed.length > 1
    ? trimmed.slice(1, -1)
    : trimmed.slice(1);
  const cells = inner.split('|').map((c) => c.trim());
  const isSeparator = cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
  return { cells, isSeparator };
}

/** Collect consecutive table rows. Empty or separator-only tables do not throw. */
export function parseTableBlock(lines, startIndex) {
  const rows = [];
  let i = startIndex;
  while (i < lines.length) {
    const parsed = parseTableLine(lines[i]);
    if (!parsed) break;
    rows.push({ ...parsed, line: i, raw: lines[i] });
    i += 1;
  }
  const dataRows = rows.filter((row) => !row.isSeparator);
  return { end: i, rows, dataRows };
}

function editAttr(editable, line, part, kind, lang) {
  if (!editable) return '';
  const label = lang === 'en' ? 'Edit text' : '编辑文字';
  return ` contenteditable="true" role="textbox" tabindex="0" data-line="${line}" data-part="${part}" data-kind="${kind}" aria-label="${label}"`;
}

function renderSplit(s, editable, line, lang) {
  return String(s).split(' | ').map((chunk, part) => (
    `<span${editAttr(editable, line, part, 'text', lang)}>${inlineHtml(chunk)}</span>`
  )).join('');
}

function renderTableHtml(dataRows, editable, lang) {
  if (!dataRows.length) {
    return '<table class="mdtable cols-0"><tbody></tbody></table>';
  }
  const cols = dataRows[0].cells.length || 0;
  const colgroup = cols === 2
    ? '<colgroup><col style="width:76pt"><col></colgroup>'
    : cols === 5
      ? '<colgroup><col style="width:90pt"><col style="width:112pt"><col style="width:126pt"><col style="width:101pt"><col></colgroup>'
      : '';
  const head = dataRows[0];
  const body = dataRows.slice(1);
  const th = head.cells.map((cell, part) => (
    `<th${editAttr(editable, head.line, part, 'table', lang)}>${inlineHtml(cell)}</th>`
  )).join('');
  const tr = body.map((row) => {
    const tds = row.cells.map((cell, part) => (
      `<td${editAttr(editable, row.line, part, 'table', lang)}>${inlineHtml(cell)}</td>`
    )).join('');
    return `<tr>${tds}</tr>`;
  }).join('');
  return `<table class="mdtable cols-${cols}">${colgroup}<thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

export function renderMarkdown(md, { editable = false, lang = 'zh' } = {}) {
  const lines = String(md || '').split('\n');
  let html = '';
  let section = false;
  let list = false;
  let header = false;
  const endList = () => {
    if (list) {
      html += '</ul>';
      list = false;
    }
  };
  for (let i = 0; i < lines.length; i += 1) {
    const s = lines[i].trim();
    if (!s) {
      endList();
      continue;
    }
    if (s.startsWith('|')) {
      endList();
      const block = parseTableBlock(lines, i);
      html += renderTableHtml(block.dataRows, editable, lang);
      i = block.end - 1;
      continue;
    }
    if (s.startsWith('# ')) {
      endList();
      if (header) html += '</div>';
      html += `<div class="resumehead"><h1${editAttr(editable, i, 0, 'text', lang)}>${inlineHtml(s.slice(2))}</h1>`;
      header = true;
    } else if (s.startsWith('## ')) {
      endList();
      if (header) {
        html += '</div>';
        header = false;
      }
      if (section) html += '</div></section>';
      html += `<section><h2 class="sectiontitle"${editAttr(editable, i, 0, 'text', lang)}>${inlineHtml(s.slice(3))}</h2><div class="sectionbody">`;
      section = true;
    } else if (s.startsWith('### ')) {
      endList();
      html += `<h3>${renderSplit(s.slice(4), editable, i, lang)}</h3>`;
    } else if (s.startsWith('- ')) {
      if (!list) {
        html += '<ul>';
        list = true;
      }
      html += `<li${s.includes(' | ') ? ' class="labeled"' : ''}>${renderSplit(s.slice(2), editable, i, lang)}</li>`;
    } else {
      endList();
      const cls = header ? 'contact' : (s.includes(' | ') ? 'role' : '');
      html += `<p class="${cls}">${renderSplit(s, editable, i, lang)}</p>`;
    }
  }
  endList();
  if (header) html += '</div>';
  if (section) html += '</div></section>';
  return html;
}

export function markdownFromField(node) {
  if (!node) return '';
  if (node.nodeType === 3) return node.textContent || '';
  if (node.nodeType !== 1) return '';
  const text = [...node.childNodes].map(markdownFromField).join('');
  if (/^(STRONG|B)$/.test(node.tagName)) return text ? `**${text}**` : '';
  if (node.tagName === 'BR') return ' ';
  return text;
}

export function applyFieldEdit(md, lineIndex, part, kind, text) {
  const lines = String(md).split('\n');
  if (lineIndex < 0 || lineIndex >= lines.length) return md;
  const cleaned = String(text).replace(/[\r\n]+/g, ' ').replace(/\|/g, '｜');
  if (kind === 'table') {
    const parsed = parseTableLine(lines[lineIndex]);
    if (!parsed || parsed.isSeparator) return md;
    if (part < 0 || part >= parsed.cells.length) return md;
    parsed.cells[part] = cleaned.trim();
    lines[lineIndex] = `| ${parsed.cells.join(' | ')} |`;
  } else {
    const match = lines[lineIndex].match(/^(\s*(?:#{1,3} |-[ \t]+))?(.*)$/);
    const prefix = match[1] || '';
    const parts = match[2].split(' | ');
    if (part >= parts.length) return md;
    parts[part] = cleaned;
    lines[lineIndex] = prefix + parts.join(' | ');
  }
  return lines.join('\n');
}

export function sectionMap(md) {
  const map = Object.create(null);
  let title = '__profile';
  map[title] = '';
  for (const line of String(md).split('\n')) {
    if (line.startsWith('## ')) {
      title = line.slice(3);
      map[title] = '';
    } else {
      map[title] += `\n${line}`;
    }
  }
  return map;
}

export function changedSections(before, after) {
  const a = sectionMap(before);
  const b = sectionMap(after);
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((key) => a[key] !== b[key]);
}

export function headingName(md) {
  const match = String(md).match(/^# (.+)$/m);
  return match ? match[1].trim() : '';
}

function splitPrefix(line) {
  const match = line.match(/^(\s*(?:#{1,3} |- ))(.*)$/);
  if (match) return { prefix: match[1], rest: match[2] };
  return { prefix: '', rest: line };
}

function localForHeading(text) {
  const trimmed = text.trim();
  if (SECTION_I18N[trimmed]) return SECTION_I18N[trimmed];
  if (TABLE_HEADER_I18N[trimmed]) return TABLE_HEADER_I18N[trimmed];
  return null;
}

function partsFromInline(text, { allowLocal = false } = {}) {
  return tokenizeInline(text).map((token) => {
    if (allowLocal && token.kind === 'text') {
      const local = localForHeading(token.text);
      if (local) return { kind: 'local', value: local };
    }
    if (!hasChinese(token.text)) {
      return { kind: 'raw', value: token.kind === 'bold' ? `**${token.text}**` : token.text };
    }
    return { kind: token.kind, text: token.text };
  });
}

function lineRecipe(line, { skipTranslate = false, allowLocal = false } = {}) {
  if (skipTranslate) return { type: 'raw', value: line };
  const table = parseTableLine(line);
  if (table) {
    if (table.isSeparator) return { type: 'raw', value: line };
    return {
      type: 'table',
      cells: table.cells.map((cell) => ({
        parts: skipTranslate ? [{ kind: 'raw', value: cell }] : partsFromInline(cell, { allowLocal: true }),
      })),
    };
  }
  const { prefix, rest } = splitPrefix(line);
  const segments = rest.split(' | ');
  const parts = [];
  if (prefix) parts.push({ kind: 'raw', value: prefix });
  segments.forEach((segment, index) => {
    if (index) parts.push({ kind: 'raw', value: ' | ' });
    const local = allowLocal ? localForHeading(segment) : null;
    if (local) parts.push({ kind: 'local', value: local });
    else parts.push(...partsFromInline(segment, { allowLocal }));
  });
  return { type: 'line', parts };
}

/** Translate only known profile labels/placeholders, without a network request. */
export function localizeEnglishProfileLine(line) {
  const placeholders = {
    '姓名': 'YOUR NAME',
    '手机号码': 'phone number',
    '手机号': 'phone number',
    '电话号码': 'phone number',
    '电子邮箱': 'email address',
    '邮箱': 'email address',
  };
  const labels = {
    '联系方式': 'Contact',
    '联系电话': 'Phone',
    '手机号码': 'Phone',
    '手机号': 'Phone',
    '电话': 'Phone',
    '手机': 'Phone',
    '电子邮箱': 'Email',
    '邮箱': 'Email',
    '姓名': 'Name',
    '微信': 'WeChat',
    '地址': 'Address',
    '现居地': 'Location',
    '所在地': 'Location',
  };
  return String(line)
    .replace(/\[(姓名|手机号码|手机号|电话号码|电子邮箱|邮箱)\]/g, (_, key) => `[${placeholders[key]}]`)
    .replace(/(^|[ \t|｜])((?:[-*]\s+)?(?:\*\*)?)(联系方式|联系电话|手机号码|手机号|电话|手机|电子邮箱|邮箱|姓名|微信|地址|现居地|所在地)(\s*[:：])(\*\*)?[ \t]*/g,
      (_, boundary, opening, key, colon, closing) => `${boundary}${opening}${labels[key]}:${closing || ''} `);
}

/**
 * Keep profile values, name headings and recognizable contact fields local.
 * Imported resumes may contain leading blank lines or multiline contact fields.
 */
export function buildTranslationPlan(md) {
  const lines = String(md).split('\n');
  const recipes = [];
  let skippedContact = false;
  const firstSection = lines.findIndex(line => /^\s*##\s/.test(line));
  const hasNameHeading = lines.some(line => /^\s*#\s/.test(line));
  const contact = /(?:[\w.+-]+@[\w.-]+\.[a-z]{2,}|联系方式|联系电话|电子邮箱|手机|电话|(?:e-?mail|phone|telephone|linkedin|微信|wechat)\s*[:：]|(?:^|[\s:：|｜])(?:\+?\d{1,3}[- ]?)?1[3-9]\d{9}(?=$|[\s|｜]))/i;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    const inProfile = hasNameHeading && (firstSection < 0 || i < firstSection);
    if (inProfile || /^\s*#\s/.test(line) || contact.test(line)) {
      recipes.push(lineRecipe(localizeEnglishProfileLine(line), { skipTranslate: true }));
      skippedContact = skippedContact || Boolean(trimmed);
      continue;
    }
    if (!trimmed) {
      recipes.push({ type: 'raw', value: line });
      continue;
    }
    const allowLocal = trimmed.startsWith('## ') || Boolean(parseTableLine(line));
    recipes.push(lineRecipe(line, { allowLocal }));
  }
  return { recipes, skippedContact };
}

export function collectTranslateJobs(plan) {
  const jobs = [];
  const visit = (part) => {
    if (part.kind === 'text' || part.kind === 'bold') {
      if (part.text && hasChinese(part.text)) jobs.push(part);
      else part.result = part.text || '';
    }
  };
  for (const recipe of plan.recipes) {
    if (recipe.type === 'table') {
      for (const cell of recipe.cells) cell.parts.forEach(visit);
    } else if (recipe.type === 'line') {
      recipe.parts.forEach(visit);
    }
  }
  return jobs;
}

function serializeParts(parts) {
  const rendered = parts.map((part) => {
    if (part.kind === 'raw' || part.kind === 'local') return part.value;
    const value = part.result != null ? part.result : part.text;
    if (part.kind === 'bold') return value ? `**${value}**` : '';
    return value || '';
  });
  return rendered.reduce((text, part) => {
    const last = text.replace(/\*\*/g, '').slice(-1);
    const first = part.replace(/\*\*/g, '').charAt(0);
    const needsSpace = /[a-z0-9]/i.test(last) && /[a-z0-9]/i.test(first);
    return text + (needsSpace ? ' ' : '') + part;
  }, '');
}

export function serializeTranslationPlan(plan) {
  return plan.recipes.map((recipe) => {
    if (recipe.type === 'raw') return recipe.value;
    if (recipe.type === 'table') {
      return `| ${recipe.cells.map((cell) => serializeParts(cell.parts)).join(' | ')} |`;
    }
    return serializeParts(recipe.parts);
  }).join('\n');
}

export function createTranslateError(code, cause) {
  const err = new Error(code);
  err.code = code;
  if (cause) err.cause = cause;
  return err;
}

export async function translateResume(md, { translateChunk, signal, onProgress } = {}) {
  if (typeof translateChunk !== 'function') {
    throw createTranslateError('misconfigured');
  }
  const plan = buildTranslationPlan(md);
  const jobs = collectTranslateJobs(plan);
  for (let i = 0; i < jobs.length; i += 1) {
    if (signal?.aborted) throw createTranslateError('cancelled');
    onProgress?.(i + 1, jobs.length);
    const chunks = splitUtf8(jobs[i].text, MAX_TRANSLATE_BYTES);
    let acc = '';
    for (const chunk of chunks) {
      if (signal?.aborted) throw createTranslateError('cancelled');
      if (utf8ByteLength(chunk) >= 500) throw createTranslateError('chunk_too_large');
      const translated = await translateChunk(chunk, signal);
      if (typeof translated !== 'string') throw createTranslateError('empty');
      acc += decodeEntities(translated);
    }
    const leading = jobs[i].text.match(/^\s+/)?.[0] || '';
    const trailing = jobs[i].text.match(/\s+$/)?.[0] || '';
    jobs[i].result = leading + acc.trim() + trailing;
  }
  if (!jobs.length) onProgress?.(0, 0);
  return {
    markdown: serializeTranslationPlan(plan),
    skippedContact: plan.skippedContact,
    jobCount: jobs.length,
  };
}

export function writingChecks(md) {
  const issues = [];
  const lines = String(md || '').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const n = i + 1;
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (PLACEHOLDER_RE.test(line)) {
      issues.push({ type: 'placeholder', line: n, code: 'placeholder' });
    }
    if (trimmed === '-' || trimmed === '- ** **' || /^[-*]\s*$/.test(trimmed)) {
      issues.push({ type: 'empty', line: n, code: 'empty_bullet' });
    } else if (trimmed.startsWith('- ')) {
      const body = trimmed.slice(2).replace(/\*\*/g, '').trim();
      if (!body) {
        issues.push({ type: 'empty', line: n, code: 'empty_bullet' });
      } else if (body.length < 10) {
        issues.push({ type: 'thin', line: n, code: 'thin_bullet' });
      } else {
        const hasAction = ACTION_RE.test(body);
        const hasResult = RESULT_RE.test(body);
        if (!hasAction && !hasResult) {
          issues.push({ type: 'weak', line: n, code: 'weak_bullet' });
        } else if (hasAction && !hasResult && body.length > 18) {
          issues.push({ type: 'result', line: n, code: 'missing_result' });
        }
      }
    }
  }
  return {
    issues,
    tips: [
      { code: 'star', type: 'star' },
      { code: 'no_invent', type: 'star' },
    ],
    counts: {
      placeholder: issues.filter((x) => x.type === 'placeholder').length,
      empty: issues.filter((x) => x.type === 'empty').length,
      weak: issues.filter((x) => x.type === 'weak' || x.type === 'thin' || x.type === 'result').length,
    },
  };
}

export function parseMarkdownImport(text) {
  if (typeof text !== 'string') return { ok: false, code: 'not_text' };
  const markdown = text.replace(/^\uFEFF/, '');
  if (!markdown.trim()) return { ok: false, code: 'empty' };
  return { ok: true, markdown };
}

export function acceptPhotoFileMeta({ type, name, size } = {}) {
  if (Number(size) > MAX_PHOTO_INPUT_BYTES) return { ok: false, code: 'too_large' };
  if (Number(size) === 0) return { ok: false, code: 'empty' };
  const mime = String(type || '').toLowerCase();
  const fileName = String(name || '').toLowerCase();
  if (mime.includes('svg') || fileName.endsWith('.svg')) return { ok: false, code: 'svg' };
  if (/^https?:/i.test(fileName) || mime === 'text/uri-list') return { ok: false, code: 'external_url' };
  const mimeOk = PHOTO_MIME_TYPES.includes(mime) || mime === 'image/jpg';
  const extOk = /\.(jpe?g|png|webp)$/.test(fileName);
  const unknownMime = !mime || mime === 'application/octet-stream';
  if (!unknownMime && !mimeOk) return { ok: false, code: 'type' };
  if (unknownMime && !extOk) return { ok: false, code: 'type' };
  return { ok: true };
}

export function sniffImageMagic(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (view.length < 12) return { ok: false, code: 'corrupt' };
  if (view[0] === 0xFF && view[1] === 0xD8 && view[2] === 0xFF) {
    return { ok: true, mime: 'image/jpeg' };
  }
  if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4E && view[3] === 0x47) {
    return { ok: true, mime: 'image/png' };
  }
  if (
    view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46
    && view[8] === 0x57 && view[9] === 0x45 && view[10] === 0x42 && view[11] === 0x50
  ) {
    return { ok: true, mime: 'image/webp' };
  }
  let head = '';
  const n = Math.min(view.length, 80);
  for (let i = 0; i < n; i += 1) head += String.fromCharCode(view[i]);
  if (/^\s*<\?xml/i.test(head) || /^\s*<svg/i.test(head) || /<svg[\s>]/i.test(head)) {
    return { ok: false, code: 'svg' };
  }
  return { ok: false, code: 'non_raster' };
}

export function inspectPhotoDataUrl(value) {
  if (typeof value !== 'string') return { ok: false, code: 'not_string' };
  const text = value.trim();
  if (!text) return { ok: false, code: 'empty' };
  if (text.length > MAX_PHOTO_DATA_URL_LENGTH) return { ok: false, code: 'too_large' };
  const lower = text.slice(0, 48).toLowerCase();
  if (
    /^(https?:|\/\/|blob:|file:|data:text)/i.test(text)
    || lower.startsWith('http')
  ) {
    return { ok: false, code: 'external_url' };
  }
  if (lower.includes('image/svg') || lower.includes('svg+xml')) {
    return { ok: false, code: 'svg' };
  }
  const match = text.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/i);
  if (!match) {
    if (text.startsWith('data:')) return { ok: false, code: 'non_raster' };
    return { ok: false, code: 'invalid' };
  }
  const kind = match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase();
  let binary = '';
  try {
    binary = atob(match[2].slice(0, 32));
  } catch {
    return { ok: false, code: 'corrupt' };
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const magic = sniffImageMagic(bytes);
  if (!magic.ok) return magic;
  if (magic.mime !== `image/${kind}` && !(kind === 'jpeg' && magic.mime === 'image/jpeg')) {
    return { ok: false, code: 'mime_mismatch' };
  }
  return { ok: true, mime: magic.mime, dataUrl: text };
}

export function photoIdForData(dataUrl) {
  const inspected = inspectPhotoDataUrl(dataUrl);
  if (!inspected.ok) return null;
  let hash = 2166136261;
  const text = inspected.dataUrl;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `p${(hash >>> 0).toString(16)}${text.length.toString(16)}`;
}

export function normalizePhoto(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_PHOTO };
  const offsetY = Number(raw.offsetY);
  const id = typeof raw.id === 'string' && /^p[0-9a-f]+$/i.test(raw.id) ? raw.id : null;
  return {
    enabled: raw.enabled === true,
    offsetY: Number.isFinite(offsetY) ? Math.min(1, Math.max(-1, offsetY)) : 0,
    id,
  };
}

export function photoObjectPosition(offsetY) {
  const y = Math.min(1, Math.max(-1, Number(offsetY) || 0));
  return `50% ${(y + 1) * 50}%`;
}

/**
 * Source crop rectangle for a 5:7 cover without stretching.
 * offsetY -1 keeps the top (avoid cutting a head), 0 is center, 1 keeps the bottom.
 */
export function coverCropRect(sourceW, sourceH, targetW = PHOTO_PIXEL_WIDTH, targetH = PHOTO_PIXEL_HEIGHT, offsetY = 0) {
  const sw = Number(sourceW);
  const sh = Number(sourceH);
  const tw = Number(targetW);
  const th = Number(targetH);
  if (!(sw > 0 && sh > 0 && tw > 0 && th > 0)) {
    return { sx: 0, sy: 0, sw: 0, sh: 0 };
  }
  const scale = Math.max(tw / sw, th / sh);
  const cropW = tw / scale;
  const cropH = th / scale;
  const extraX = sw - cropW;
  const extraY = sh - cropH;
  const t = Math.min(1, Math.max(-1, Number(offsetY) || 0));
  return {
    sx: extraX / 2,
    sy: extraY * ((t + 1) / 2),
    sw: cropW,
    sh: cropH,
  };
}

export function resolvePhoto(photo, store = {}) {
  const meta = normalizePhoto(photo);
  let data = null;
  if (photo && inspectPhotoDataUrl(photo.data).ok) {
    data = photo.data.trim();
  } else if (meta.id && inspectPhotoDataUrl(store?.[meta.id]).ok) {
    data = store[meta.id];
  }
  return { ...meta, data };
}

export function collectPhotoIds(photo, history) {
  const ids = [];
  const push = (id) => {
    if (id && !ids.includes(id)) ids.push(id);
  };
  push(normalizePhoto(photo).id);
  if (Array.isArray(history)) {
    for (const entry of history) push(normalizePhoto(entry?.photo).id);
  }
  return ids;
}

export function prunePhotoStore(store, ids) {
  const out = {};
  const list = Array.isArray(ids) ? ids : [];
  for (const id of list) {
    const data = store?.[id];
    if (typeof id === 'string' && inspectPhotoDataUrl(data).ok) out[id] = data;
  }
  return out;
}

export function sanitizePhotoStore(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [id, data] of Object.entries(raw)) {
    if (!/^p[0-9a-f]+$/i.test(id)) continue;
    if (inspectPhotoDataUrl(data).ok) out[id] = data;
  }
  return out;
}

export function photoMetaEqual(a, b) {
  const left = normalizePhoto(a);
  const right = normalizePhoto(b);
  return left.enabled === right.enabled && left.offsetY === right.offsetY && left.id === right.id;
}

export function applyPhotoToHtml(html, photo, { mode = 'screen', placeholder = '' } = {}) {
  const view = resolvePhoto(photo, photo?.store);
  if (!view.enabled) return String(html || '');
  const forScreen = mode === 'screen';
  if (!view.data && !forScreen) return String(html || '');
  const slot = view.data
    ? `<div class="resume-photo"><img src="${escapeHtml(view.data)}" alt="" width="${PHOTO_PIXEL_WIDTH}" height="${PHOTO_PIXEL_HEIGHT}" style="object-fit:cover;object-position:${photoObjectPosition(view.offsetY)}"></div>`
    : `<div class="resume-photo resume-photo-placeholder">${placeholder ? `<span>${escapeHtml(placeholder)}</span>` : ''}</div>`;
  const wrap = (inner) => `<div class="resumehead resumehead-with-photo"><div class="resumehead-main">${inner}</div>${slot}</div>`;
  const source = String(html || '');
  if (source.includes('class="resumehead"')) {
    return source.replace(/<div class="resumehead">([\s\S]*?)<\/div>/, (_, inner) => wrap(inner));
  }
  return wrap('') + source;
}

export function normalizeLayout(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_LAYOUT };
  const preset = LAYOUT_PRESETS[raw.preset] ? raw.preset : 'classic';
  const base = LAYOUT_PRESETS[preset];
  const size = Number(raw.size);
  const lead = Number(raw.lead);
  const pad = Number(raw.pad);
  const accent = typeof raw.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.accent)
    ? raw.accent
    : base.accent;
  return {
    preset,
    family: raw.family === 'modern' ? 'modern' : (base.family || 'classic'),
    size: Number.isFinite(size) ? Math.min(12, Math.max(8, size)) : base.size,
    lead: Number.isFinite(lead) ? Math.min(2, Math.max(1.2, lead)) : base.lead,
    pad: Number.isFinite(pad) ? Math.min(56, Math.max(16, pad)) : base.pad,
    accent,
  };
}

function sanitizeModulesLang(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { enabled: null, hidden: {}, order: null };
  }
  const enabled = {};
  if (raw.enabled && typeof raw.enabled === 'object' && !Array.isArray(raw.enabled)) {
    for (const [key, value] of Object.entries(raw.enabled)) {
      if (typeof key === 'string' && typeof value === 'boolean') enabled[key] = value;
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

export function sanitizeModulesBag(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const bag = {};
  for (const lang of ['zh', 'en']) {
    if (raw[lang] && typeof raw[lang] === 'object' && !Array.isArray(raw[lang])) {
      bag[lang] = sanitizeModulesLang(raw[lang]);
    }
  }
  return Object.keys(bag).length ? bag : null;
}

export function parseBackupJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, code: 'invalid_json' };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, code: 'invalid_shape' };
  }
  const drafts = data.drafts;
  if (!drafts || typeof drafts !== 'object' || Array.isArray(drafts)) {
    return { ok: false, code: 'missing_drafts' };
  }
  const zh = drafts.zh;
  const en = drafts.en;
  if (zh !== undefined && typeof zh !== 'string') return { ok: false, code: 'invalid_drafts' };
  if (en !== undefined && typeof en !== 'string') return { ok: false, code: 'invalid_drafts' };
  if (typeof zh !== 'string' && typeof en !== 'string') return { ok: false, code: 'missing_drafts' };
  const lang = data.lang === 'en' ? 'en' : (data.lang === 'zh' ? 'zh' : undefined);
  const theme = data.theme === 'dark' || data.theme === 'light' ? data.theme : undefined;
  const photoIn = data.photo && typeof data.photo === 'object' && !Array.isArray(data.photo)
    ? data.photo
    : null;
  const photoMeta = normalizePhoto(photoIn || {});
  const photoData = photoIn && inspectPhotoDataUrl(photoIn.data).ok ? photoIn.data.trim() : null;
  if (photoData && !photoMeta.id) photoMeta.id = photoIdForData(photoData);
  return {
    ok: true,
    backup: {
      drafts: {
        zh: typeof zh === 'string' ? zh : undefined,
        en: typeof en === 'string' ? en : undefined,
      },
      layout: data.layout ? normalizeLayout(data.layout) : null,
      theme,
      lang,
      photo: photoMeta,
      photoData,
      modules: sanitizeModulesBag(data.modules),
    },
  };
}

export function buildBackupPayload({ drafts, layout, theme, lang, photo, photoStore, modules }) {
  const meta = normalizePhoto(photo);
  const resolved = resolvePhoto(meta, photoStore || {});
  const payload = {
    version: 2,
    app: 'resume-studio',
    savedAt: new Date().toISOString(),
    lang,
    theme,
    layout,
    drafts: {
      zh: String(drafts.zh || ''),
      en: String(drafts.en || ''),
    },
    photo: {
      enabled: meta.enabled,
      offsetY: meta.offsetY,
      data: resolved.data || null,
    },
  };
  const bag = sanitizeModulesBag(modules);
  if (bag) payload.modules = bag;
  return payload;
}

export function applyLayoutToStyle(layout) {
  const next = normalizeLayout(layout);
  return {
    '--resume-size': `${next.size}pt`,
    '--resume-lead': String(next.lead),
    '--resume-pad': `${next.pad}pt`,
    '--resume-accent': next.accent,
  };
}

export function englishLooksEdited(current, original) {
  return String(current || '').trim() !== String(original || '').trim();
}

export function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry) => (
    entry
    && ['zh', 'en'].includes(entry.lang)
    && !Number.isNaN(Date.parse(entry.at))
    && Array.isArray(entry.sections)
    && entry.sections.every((x) => typeof x === 'string')
    && entry.drafts
    && typeof entry.drafts === 'object'
    && (typeof entry.drafts.zh === 'string' || typeof entry.drafts.en === 'string')
  )).slice(0, HISTORY_LIMIT).map((entry) => {
    const next = {
      at: entry.at,
      lang: entry.lang,
      sections: entry.sections,
      drafts: {
        zh: typeof entry.drafts.zh === 'string' ? entry.drafts.zh : undefined,
        en: typeof entry.drafts.en === 'string' ? entry.drafts.en : undefined,
      },
      layout: entry.layout ? normalizeLayout(entry.layout) : undefined,
      photo: entry.photo ? normalizePhoto(entry.photo) : { ...DEFAULT_PHOTO },
    };
    const modules = sanitizeModulesBag(entry.modules);
    if (modules) next.modules = modules;
    return next;
  });
}

export function paperCss({ forExport = false } = {}) {
  const hideUi = forExport ? `
html, body { margin: 0; background: #fff; }
.paper { margin: 0 auto; box-shadow: none; }
` : '';
  return `${hideUi}
@font-face { font-family: ResumeChinese; src: local('STXihei'), local('Heiti SC Light'); font-weight: 400; }
@font-face { font-family: ResumeChinese; src: local('STHeiti'), local('Heiti SC Medium'); font-weight: 700; }
.paper {
  --resume-size: 9pt;
  --resume-lead: 1.73;
  --resume-pad: 36pt;
  --resume-accent: #111111;
  box-sizing: border-box;
  width: 210mm;
  min-height: 297mm;
  height: auto;
  overflow: visible;
  padding: var(--resume-pad);
  background: #fff;
  color: #111111;
  font: 400 var(--resume-size)/var(--resume-lead) ResumeChinese, 'STXihei', 'Heiti SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color-scheme: light;
}
.paper * { box-sizing: border-box; }
.paper .resumehead { text-align: center; margin-bottom: 8pt; }
.paper .resumehead-with-photo {
  display: grid;
  grid-template-columns: minmax(0, 1fr) ${PHOTO_WIDTH_MM}mm;
  column-gap: 8mm;
  align-items: start;
  text-align: left;
  min-height: ${PHOTO_HEIGHT_MM}mm;
  margin-bottom: 10pt;
  break-inside: avoid;
  page-break-inside: avoid;
}
.paper .resumehead-main { min-width: 0; overflow-wrap: anywhere; }
.paper .resume-photo {
  width: ${PHOTO_WIDTH_MM}mm;
  height: ${PHOTO_HEIGHT_MM}mm;
  overflow: hidden;
  background: #fff;
  justify-self: end;
  break-inside: avoid;
  page-break-inside: avoid;
}
.paper .resume-photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.paper .resume-photo-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.4pt dashed #2340D8;
  color: #2340D8;
  font-size: 8pt;
  text-align: center;
  background: #EEF1FF;
}
.paper h1 { font: 400 calc(var(--resume-size) * 1.55)/1.3 ResumeChinese, 'STXihei', 'Heiti SC', sans-serif; margin: 0 0 6pt; }
.paper .contact { font: inherit; margin: 0; }
.paper section { display: block; border: 0; margin: 0 0 6pt; }
.paper h2.sectiontitle {
  font: 700 calc(var(--resume-size) * 1.16)/1.25 ResumeChinese, 'STXihei', 'Heiti SC', sans-serif;
  padding: 0; margin: 0; border-bottom: 1.2pt solid var(--resume-accent);
}
.paper .sectionbody { padding: 0; font: inherit; }
.paper .sectionbody p { margin: 0; line-height: inherit; }
.paper h3 {
  font: 700 var(--resume-size)/1.35 ResumeChinese, 'STXihei', 'Heiti SC', sans-serif;
  display: flex; justify-content: space-between; gap: 6pt;
  border-bottom: .5pt dashed #111111; margin: 2pt 0 0;
}
.paper h3 span:last-child { text-align: right; }
.paper h3 span:nth-child(2):not(:last-child) { text-align: center; }
.paper .role { display: flex; justify-content: space-between; gap: 6pt; }
.paper .sectionbody ul { padding: 0; margin: 0; list-style: none; }
.paper .sectionbody li { position: relative; margin: 0; padding: 0 0 0 10pt; line-height: inherit; }
.paper .sectionbody li:before { content: '•'; position: absolute; left: 0; }
.paper .mdtable { width: 100%; border-collapse: collapse; table-layout: fixed; font: inherit; line-height: inherit; }
.paper .mdtable thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.paper .mdtable td, .paper .mdtable th { padding: 0; vertical-align: top; border: 0; font-weight: 400; text-align: left; }
.paper .cols-5 td:last-child:before { content: '▶'; color: #ccc; margin-right: 8pt; font-size: 8pt; }
.paper .cols-2 td:first-child { white-space: nowrap; letter-spacing: -.3pt; }
.paper .cols-2 td:nth-child(2) { padding-left: 3pt; text-align: justify; }
.paper strong { font-weight: 700; }
.paper[data-family="modern"] {
  font-family: 'PingFang SC', 'Segoe UI', system-ui, sans-serif;
}
.paper[data-family="modern"] h2.sectiontitle { border-bottom-width: 2pt; letter-spacing: .04em; }
.paper[data-family="modern"] h3 { border-bottom: 0; }
html[lang="en"] .paper, .paper[data-lang="en"] {
  font-family: 'Times New Roman', Times, serif;
}
html[lang="en"] .paper[data-family="modern"], .paper[data-lang="en"][data-family="modern"] {
  font-family: 'Segoe UI', system-ui, sans-serif;
}
html[lang="en"] .paper h1, .paper[data-lang="en"] h1 { font-weight: 700; }
html[lang="en"] .paper h3, .paper[data-lang="en"] h3 { border: 0; font-weight: 400; }
html[lang="en"] .paper .role, .paper[data-lang="en"] .role { font-style: italic; }
html[lang="en"] .paper li, .paper[data-lang="en"] li { padding-left: 0; }
html[lang="en"] .paper li:before, .paper[data-lang="en"] li:before { position: static; margin-right: 3pt; }
html[lang="en"] .paper li.labeled, .paper[data-lang="en"] li.labeled {
  display: grid; grid-template-columns: 94pt 1fr; padding-left: 5pt;
}
html[lang="en"] .paper li.labeled:before, .paper[data-lang="en"] li.labeled:before {
  position: absolute; left: 0; margin: 0;
}
@media print {
  @page { size: A4; margin: 0; }
  html, body { margin: 0; background: #fff; }
  .paper { box-shadow: none; width: 210mm; min-height: 0; height: auto; overflow: visible; }
  .resume-photo-placeholder { display: none !important; }
  .paper.has-photo-pending .resumehead-with-photo {
    display: block;
    grid-template-columns: none;
    min-height: 0;
    text-align: center;
  }
}
`;
}

export function buildOfflineHtml({ title, lang, bodyHtml, layout, photo } = {}) {
  const safeTitle = escapeHtml(title || 'Resume');
  const safeLang = lang === 'en' ? 'en' : 'zh-CN';
  const vars = applyLayoutToStyle(layout);
  const varCss = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
  const family = (layout && layout.family) === 'modern' ? 'modern' : 'classic';
  const paperLang = lang === 'en' ? 'en' : 'zh';
  const view = resolvePhoto(photo, photo?.store);
  const decorated = applyPhotoToHtml(bodyHtml, view, { mode: 'export' });
  const photoClass = view.enabled && view.data ? ' has-photo' : '';
  return `<!doctype html>
<html lang="${safeLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>
${paperCss({ forExport: true })}
@media print { @page { size: A4; margin: ${normalizeLayout(layout).pad}pt; } .paper { width: auto; padding: 0; } }
</style>
</head>
<body>
<article class="paper${photoClass}" data-family="${family}" data-lang="${paperLang}" style="${varCss}">${decorated}</article>
</body>
</html>
`;
}
