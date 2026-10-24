import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_PHOTO_DATA_URL_LENGTH,
  MAX_PHOTO_INPUT_BYTES,
  MAX_TRANSLATE_BYTES,
  acceptPhotoFileMeta,
  applyFieldEdit,
  applyPhotoToHtml,
  buildBackupPayload,
  buildOfflineHtml,
  buildTranslationPlan,
  collectPhotoIds,
  collectTranslateJobs,
  coverCropRect,
  englishLooksEdited,
  inspectPhotoDataUrl,
  parseBackupJson,
  parseMarkdownImport,
  parseTableBlock,
  photoIdForData,
  photoObjectPosition,
  prunePhotoStore,
  renderMarkdown,
  sanitizeHistory,
  serializeTranslationPlan,
  sniffImageMagic,
  splitUtf8,
  translateResume,
  utf8ByteLength,
  writingChecks,
} from '../core.js';

test('splitUtf8 keeps every chunk strictly under 500 bytes', () => {
  const ascii = 'a'.repeat(500);
  const asciiChunks = splitUtf8(ascii);
  assert.ok(asciiChunks.length >= 2);
  for (const chunk of asciiChunks) {
    assert.ok(utf8ByteLength(chunk) < 500);
    assert.ok(utf8ByteLength(chunk) <= MAX_TRANSLATE_BYTES);
  }
  const han = '测'.repeat(200);
  assert.equal(utf8ByteLength('测'), 3);
  const hanChunks = splitUtf8(han);
  assert.ok(hanChunks.length >= 2);
  for (const chunk of hanChunks) {
    assert.ok(utf8ByteLength(chunk) < 500);
    assert.equal(utf8ByteLength(chunk) % 3, 0);
  }
  assert.deepEqual(splitUtf8(''), []);
  assert.deepEqual(splitUtf8('ok'), ['ok']);
});

test('empty and separator-only tables do not crash', () => {
  const empty = parseTableBlock(['| --- | --- |'], 0);
  assert.equal(empty.dataRows.length, 0);
  assert.equal(renderMarkdown('| --- |\n| --- |'), '<table class="mdtable cols-0"><tbody></tbody></table>');
  assert.equal(renderMarkdown('|'), '<table class="mdtable cols-1"><thead><tr><th></th></tr></thead><tbody></tbody></table>');
  const mixed = parseTableBlock([
    '| 时间 | 学校 |',
    '| --- | --- |',
    '| 2020 | 示例 |',
  ], 0);
  assert.equal(mixed.dataRows.length, 2);
  assert.equal(mixed.dataRows[0].cells[0], '时间');
});

test('renderMarkdown escapes HTML instead of injecting it', () => {
  const html = renderMarkdown('# <script>alert(1)</script>\n联系方式：<img src=x onerror=alert(1)>');
  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('<img'), false);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&lt;img'));
});

test('import validation rejects empty markdown and invalid JSON backups', () => {
  assert.equal(parseMarkdownImport('').ok, false);
  assert.equal(parseMarkdownImport('   \n').ok, false);
  assert.equal(parseMarkdownImport('# 姓名\n').ok, true);
  assert.equal(parseBackupJson('{').ok, false);
  assert.equal(parseBackupJson('[]').ok, false);
  assert.equal(parseBackupJson('{"drafts":{"zh":1}}').ok, false);
  assert.equal(parseBackupJson('{"hello":1}').ok, false);
  const ok = parseBackupJson('{"drafts":{"zh":"# A","en":"# B"},"layout":{"preset":"modern","size":9.5,"lead":1.6,"pad":30,"accent":"#c4452c"}}');
  assert.equal(ok.ok, true);
  assert.equal(ok.backup.drafts.zh, '# A');
  assert.equal(ok.backup.layout.preset, 'modern');
});

test('translation plan keeps name/contact, localizes sections, preserves markdown tokens', () => {
  const md = `# 姓名
联系方式：13800000000 ｜ a@b.com

## 教育背景
| 时间 | 学校 |
| --- | --- |
| 2020 | **示例大学** |

### 机构 | 2021
- **调研：** 完成报告并交付主管。
- English only line stays.
`;
  const plan = buildTranslationPlan(md);
  const jobs = collectTranslateJobs(plan);
  const serializedKeep = serializeTranslationPlan(plan);
  assert.match(serializedKeep, /^# 姓名/m);
  assert.match(serializedKeep, /Contact: 13800000000/);
  assert.equal(jobs.some((j) => j.text.includes('13800000000')), false);
  assert.equal(jobs.some((j) => j.text === '姓名'), false);
  assert.ok(jobs.some((j) => j.kind === 'bold' && j.text.includes('调研')));
  const localLine = plan.recipes.find((r) => r.type === 'line' && r.parts.some((p) => p.kind === 'local' && p.value === 'Education'));
  assert.ok(localLine);
  assert.equal(jobs.some((j) => j.text === '教育背景'), false);
  assert.equal(jobs.some((j) => j.text.includes('English only')), false);
});

test('translateResume commits only after every chunk succeeds and restores bold markers', async () => {
  const md = `# 姓名
电话：123

## 教育背景
- **完成** 一项可核实成果。
`;
  const seen = [];
  const result = await translateResume(md, {
    async translateChunk(chunk) {
      seen.push(chunk);
      assert.ok(utf8ByteLength(chunk) < 500);
      if (chunk.includes('完成')) return 'Completed';
      if (chunk.includes('可核实')) return ' a verifiable outcome.';
      return `EN:${chunk}`;
    },
  });
  assert.match(result.markdown, /^# 姓名/m);
  assert.match(result.markdown, /Phone: 123/);
  assert.match(result.markdown, /## Education/);
  assert.match(result.markdown, /\*\*Completed\*\*/);
  assert.equal(result.skippedContact, true);
  assert.ok(seen.length > 0);
});

test('English profile placeholders are localized offline and never sent for translation', async () => {
  let requests = 0;
  const result = await translateResume('# [姓名]\n联系方式：[手机号码] ｜ 邮箱：[电子邮箱]\n\n## 教育背景', {
    async translateChunk() { requests += 1; throw new Error('Profile must stay local'); },
  });
  assert.equal(requests, 0);
  assert.equal(result.markdown, '# [YOUR NAME]\nContact: [phone number] ｜ Email: [email address]\n\n## Education');
});

test('local profile labels preserve real names, contact values and Markdown formatting', async () => {
  const md = '# 张三 (San Zhang)\n**电话：** +86 13800000000\n- 邮箱：san.zhang@example.invalid\n微信：zhang_san_123\nhttps://example.invalid/san\n\n## 项目经历\n- 完成报告。';
  const requests = [];
  const result = await translateResume(md, {
    async translateChunk(text) { requests.push(text); return 'Completed a report.'; },
  });
  assert.match(result.markdown, /^# 张三 \(San Zhang\)$/m);
  assert.match(result.markdown, /^\*\*Phone:\*\* \+86 13800000000$/m);
  assert.match(result.markdown, /^- Email: san.zhang@example.invalid$/m);
  assert.match(result.markdown, /^WeChat: zhang_san_123$/m);
  assert.match(result.markdown, /^https:\/\/example.invalid\/san$/m);
  assert.equal(requests.length, 1);
  assert.equal(requests[0], '完成报告。');
});

test('translateResume failure leaves caller able to keep the original English', async () => {
  const original = '# Keep me';
  let threw = false;
  try {
    await translateResume('# 姓名\n电话\n\n## 项目经历\n- 完成调研。', {
      async translateChunk() {
        throw Object.assign(new Error('network'), { code: 'network' });
      },
    });
  } catch (err) {
    threw = true;
    assert.equal(err.code, 'network');
  }
  assert.equal(threw, true);
  assert.equal(original, '# Keep me');
});

test('applyFieldEdit keeps pipes from being injected and writingChecks stay conservative', () => {
  const md = '# Name\n\n## A\n| 时间 | 学校 |\n| --- | --- |\n| 2020 | 甲 |';
  const next = applyFieldEdit(md, 5, 1, 'table', '乙 | <script>');
  assert.match(next, /乙 ｜ &lt;script&gt;|乙 ｜ <script>/);
  assert.equal(next.includes('| 乙 |'), false);
  const edited = applyFieldEdit('# 名\n- 负责', 1, 0, 'text', '新 | 行');
  assert.match(edited, /新 ｜ 行/);
  const checks = writingChecks('# [姓名]\n\n## 实习经历\n- 很好\n- 负责调研并完成报告，交付主管用于周会。\n- ');
  assert.ok(checks.counts.placeholder >= 1);
  assert.ok(checks.issues.some((i) => i.code === 'empty_bullet' || i.type === 'empty'));
  assert.ok(checks.issues.some((i) => i.code === 'thin_bullet'));
});

test('englishLooksEdited distinguishes template from user text', () => {
  assert.equal(englishLooksEdited('# A', '# A'), false);
  assert.equal(englishLooksEdited('# A\nHello', '# A'), true);
});

function rasterDataUrl(mime, bytes) {
  return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
}

const JPEG_BYTES = Uint8Array.from([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9,
]);
const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0, 0, 0, 0, 0,
]);
const JPEG_URL = rasterDataUrl('image/jpeg', JPEG_BYTES);

test('photo inspectors reject svg, urls, oversize files and keep raster data', () => {
  assert.equal(sniffImageMagic(JPEG_BYTES).ok, true);
  assert.equal(sniffImageMagic(PNG_BYTES).mime, 'image/png');
  assert.equal(sniffImageMagic(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).code, 'svg');
  assert.equal(inspectPhotoDataUrl(JPEG_URL).ok, true);
  assert.equal(inspectPhotoDataUrl('https://example.com/a.jpg').code, 'external_url');
  assert.equal(inspectPhotoDataUrl('data:image/svg+xml;base64,PHN2Zy8+').code, 'svg');
  assert.equal(inspectPhotoDataUrl('data:image/gif;base64,R0lGODlhAQABAAAAACw=').code, 'non_raster');
  assert.equal(inspectPhotoDataUrl(`data:image/jpeg;base64,${'A'.repeat(MAX_PHOTO_DATA_URL_LENGTH)}`).code, 'too_large');
  assert.equal(acceptPhotoFileMeta({ type: 'image/jpeg', name: 'a.jpg', size: 12 }).ok, true);
  assert.equal(acceptPhotoFileMeta({ type: 'image/svg+xml', name: 'a.svg', size: 12 }).code, 'svg');
  assert.equal(acceptPhotoFileMeta({ type: 'image/jpeg', name: 'a.jpg', size: MAX_PHOTO_INPUT_BYTES + 1 }).code, 'too_large');
  const cropTop = coverCropRect(100, 200, 50, 70, -1);
  assert.equal(cropTop.sy, 0);
  const cropBottom = coverCropRect(100, 200, 50, 70, 1);
  assert.ok(cropBottom.sy > cropTop.sy);
  assert.equal(photoObjectPosition(-1), '50% 0%');
  assert.equal(photoObjectPosition(0), '50% 50%');
});

test('old JSON backups import without photo and invalid photo data does not drop drafts', () => {
  const old = parseBackupJson('{"drafts":{"zh":"# A","en":"# B"},"layout":{"preset":"modern","size":9.5,"lead":1.6,"pad":30,"accent":"#c4452c"}}');
  assert.equal(old.ok, true);
  assert.equal(old.backup.photo.enabled, false);
  assert.equal(old.backup.photoData, null);
  const poisoned = parseBackupJson(JSON.stringify({
    drafts: { zh: '# 保留', en: '# Keep' },
    photo: { enabled: true, offsetY: 0.25, data: 'https://evil.example/photo.png' },
  }));
  assert.equal(poisoned.ok, true);
  assert.equal(poisoned.backup.drafts.zh, '# 保留');
  assert.equal(poisoned.backup.photo.enabled, true);
  assert.equal(poisoned.backup.photoData, null);
  const round = parseBackupJson(JSON.stringify(buildBackupPayload({
    drafts: { zh: '# A', en: '# B' },
    layout: { preset: 'classic', size: 9, lead: 1.73, pad: 36, accent: '#111111' },
    theme: 'light',
    lang: 'zh',
    photo: { enabled: true, offsetY: -0.5, id: photoIdForData(JPEG_URL) },
    photoStore: { [photoIdForData(JPEG_URL)]: JPEG_URL },
  })));
  assert.equal(round.ok, true);
  assert.equal(round.backup.photo.enabled, true);
  assert.equal(round.backup.photoData, JPEG_URL);
});

test('history sanitizer accepts old entries and does not copy photo bytes into each snapshot', () => {
  const id = photoIdForData(JPEG_URL);
  const cleaned = sanitizeHistory([
    {
      at: '2026-10-23T00:00:00.000Z',
      lang: 'zh',
      sections: ['教育背景'],
      drafts: { zh: '# 旧', en: '# Old' },
    },
    {
      at: '2026-10-23T01:00:00.000Z',
      lang: 'en',
      sections: ['__photo'],
      drafts: { zh: '# 新', en: '# New' },
      photo: { enabled: true, offsetY: 0, id, data: JPEG_URL },
    },
    { lang: 'zh' },
  ]);
  assert.equal(cleaned.length, 2);
  assert.equal(cleaned[0].photo.enabled, false);
  assert.equal(cleaned[1].photo.id, id);
  assert.equal('data' in cleaned[1].photo, false);
  const store = prunePhotoStore({ [id]: JPEG_URL, pdead: 'https://x' }, collectPhotoIds({ id }, cleaned));
  assert.equal(store[id], JPEG_URL);
  assert.equal(store.pdead, undefined);
});

test('offline HTML embeds a 35x49mm photo on export and omits placeholders without data', () => {
  const md = renderMarkdown('# 姓名\n电话：123\n\n## 教育背景\n- 条目');
  const withPhoto = buildOfflineHtml({
    title: '姓名',
    lang: 'zh',
    bodyHtml: md,
    layout: { preset: 'classic', size: 9, lead: 1.73, pad: 36, accent: '#111111' },
    photo: { enabled: true, offsetY: 0, data: JPEG_URL },
  });
  assert.match(withPhoto, /35mm/);
  assert.match(withPhoto, /49mm/);
  assert.match(withPhoto, /<div class="resume-photo"><img /);
  assert.match(withPhoto, /data:image\/jpeg;base64,/);
  assert.equal(withPhoto.includes('class="resume-photo resume-photo-placeholder"'), false);
  const pending = applyPhotoToHtml(md, { enabled: true }, { mode: 'export', placeholder: '上传照片' });
  assert.equal(pending.includes('class="resume-photo'), false);
  assert.equal(pending.includes('上传照片'), false);
  const screen = applyPhotoToHtml(md, { enabled: true }, { mode: 'screen', placeholder: '二寸照片' });
  assert.match(screen, /resume-photo-placeholder/);
  assert.match(screen, /二寸照片/);
  assert.equal(screen.includes('<img'), false);
  const plain = buildOfflineHtml({
    title: '姓名',
    lang: 'zh',
    bodyHtml: md,
    layout: { preset: 'classic' },
  });
  const plainArticle = plain.slice(plain.indexOf('<article'));
  assert.equal(plainArticle.includes('resumehead-with-photo'), false);
  assert.equal(plainArticle.includes('has-photo'), false);
  assert.equal(md.includes('resume-photo'), false);
});
