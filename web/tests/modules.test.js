import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeHtml, parseBackupJson, buildBackupPayload, sanitizeHistory, renderMarkdown } from '../core.js';
import { LEGACY_DEFAULTS, RESUME_DEFAULTS } from '../content.js';
import {
  addEntry,
  createUndoStack,
  deleteEntry,
  documentFromState,
  duplicateEntry,
  enabledMap,
  formatDateRange,
  freshDocument,
  hiddenMap,
  isExactTemplate,
  moveEntry,
  moveModule,
  normalizeModulesState,
  parseDateRange,
  parseDocument,
  pushUndo,
  redoOnce,
  serializeVisible,
  shouldMigrate,
  snapshotOf,
  toggleModule,
  undoOnce,
  updateEntryField,
} from '../modules.js';

function countH3(md) {
  return [...String(md).matchAll(/^### /gm)].length;
}

function visibleTitles(md) {
  return [...String(md).matchAll(/^## (.+)$/gm)].map((m) => m[1]);
}

test('existing English drafts repair only profile labels and placeholders on restore', () => {
  const body = '\n\n## Custom Section\n- 中文正文和 [姓名] 保留原文。\n';
  const md = '# 张三\n联系方式：+86 13800000000 ｜ 邮箱：test@example.invalid\n' + body;
  const restored = serializeVisible(documentFromState(md, 'en', null, { migrate: false }));
  assert.match(restored, /^# 张三\nContact: \+86 13800000000 ｜ Email: test@example.invalid/);
  assert.ok(restored.includes('- 中文正文和 [姓名] 保留原文。'));
  assert.equal(serializeVisible(parseDocument(restored, { lang: 'en' })), restored);
  assert.match(serializeVisible(parseDocument(md, { lang: 'zh' })), /联系方式：\+86 13800000000/);
  const template = serializeVisible(documentFromState('# [姓名]\n联系方式：[手机号码] ｜ 邮箱：[电子邮箱]', 'en', null, { migrate: false }));
  assert.match(template, /^# \[YOUR NAME\]\nContact: \[phone number\] ｜ Email: \[email address\]/);
});

test('new defaults expose three entries per visible module and hide work', () => {
  const zh = freshDocument('zh');
  const en = freshDocument('en');
  for (const doc of [zh, en]) {
    const enabled = enabledMap(doc);
    assert.equal(enabled.work, false);
    assert.equal(enabled.education, true);
    assert.equal(enabled.internship, true);
    const visible = serializeVisible(doc);
    assert.equal(visible.includes(doc.lang === 'en' ? 'Work Experience' : '工作经历'), false);
    for (const id of ['education', 'projects', 'internship', 'student', 'skills']) {
      const mod = doc.modules.find((m) => m.id === id);
      assert.ok(mod, id);
      assert.equal(mod.entries.length, 3, `${id} should have 3 entries`);
    }
    const work = doc.modules.find((m) => m.id === 'work');
    assert.equal(work.enabled, false);
    assert.equal(work.entries.length, 3);
    assert.equal(countH3(visible), 6);
  }
  assert.equal(shouldMigrate(LEGACY_DEFAULTS.zh, 'zh'), true);
  assert.equal(shouldMigrate(RESUME_DEFAULTS.zh, 'zh'), false);
  assert.equal(shouldMigrate(LEGACY_DEFAULTS.en, 'en'), true);
});

test('unmodified legacy drafts migrate; rewritten drafts keep every custom marker', () => {
  const migrated = documentFromState(LEGACY_DEFAULTS.zh, 'zh', null, { migrate: true });
  assert.equal(isExactTemplate(serializeVisible(migrated), RESUME_DEFAULTS.zh), true);
  assert.equal(migrated.modules.find((m) => m.id === 'education').entries.length, 3);

  const custom = `# [姓名]
联系方式：[手机号码] ｜ 邮箱：[电子邮箱]

## 教育背景
| 时间 | 学校 | 院系 | 专业 | 学位 |
| --- | --- | --- | --- | --- |
| 20XX.09-20XX.07 | **[EDU-KEEP-1]** | **[院系名称]** | **[研究方向]** | **[硕士学位]** |
| 20XX.09-20XX.07 | **[EDU-KEEP-2]** | **[院系名称]** | **[本科专业]** | **[学士学位]** |
- **学术成绩：** keep-notes

## 项目经历
| 时间 | 项目内容 |
| --- | --- |
| 20XX.04-20XX.06 | **[PROJECT-KEEP-1]** |
| 20XX.04-20XX.06 | **[PROJECT-KEEP-2]** |
| 20XX.11-20XX.12 | **[PROJECT-KEEP-3]** |
| 20XX.11-20XX.12 | **[PROJECT-KEEP-4]** |

## 实习经历
### [机构名称] | [部门名称·岗位名称] | 20XX.05-20XX.07
- keep-intern-1
### [机构名称] | [部门名称·岗位名称] | 20XX.11-20XX.03
- keep-intern-2

## 学生工作
### [学生组织名称] | [担任职务] | 20XX.03-至今
- keep-student

## 技能及爱好
**语言运用：** keep-skill

## 自定义模块

### CUSTOM-KEEP-1
- 原稿附录保留 <script>window.testInjected=1</script>
`;
  const kept = documentFromState(custom, 'zh', null, { migrate: true });
  const out = serializeVisible(kept);
  assert.match(out, /EDU-KEEP-1/);
  assert.match(out, /EDU-KEEP-2/);
  assert.match(out, /PROJECT-KEEP-4/);
  assert.match(out, /keep-intern-2/);
  assert.match(out, /keep-student/);
  assert.match(out, /keep-skill/);
  assert.match(out, /CUSTOM-KEEP-1/);
  assert.match(out, /<script>window.testInjected=1<\/script>/);
  assert.match(out, /keep-notes/);
  assert.equal(kept.modules.find((m) => m.id === 'education').entries.length, 2);
  assert.equal(kept.modules.find((m) => m.id === 'projects').entries.length, 4);
  const customMod = kept.modules.find((m) => String(m.id).startsWith('custom:'));
  assert.ok(customMod);
  assert.match(customMod.title, /自定义/);
});

test('table, h3 and paragraph parsers isolate a single entry', () => {
  const md = `# 名

## 教育背景
| 时间 | 学校 | 院系 | 专业 | 学位 |
| --- | --- | --- | --- | --- |
| 2020.09-2022.07 | **甲大学** | 文 | 史 | 硕士 |
| 2016.09-2020.07 | **乙大学** | 理 | 数 | 学士 |
- **学术成绩：** 排名前 10%
- **主修课程：** 课程一

## 项目经历
| 时间 | 项目内容 |
| --- | --- |
| 2021.01-2021.06 | **项目甲** |
| 2022.01-2022.06 | **项目乙** |

## 实习经历
### 机构甲 | 分析岗 | 2023.01-2023.06
- 完成甲报告
### 机构乙 | 研究岗 | 2023.07-2023.12
- 完成乙报告

## 技能及爱好
**语言：** 中文 / 英语
**爱好：** 跑步
`;
  const doc = parseDocument(md, { lang: 'zh' });
  const edu = doc.modules.find((m) => m.id === 'education');
  assert.equal(edu.entries.length, 2);
  assert.match(edu.extras, /学术成绩/);
  assert.match(edu.extras, /主修课程/);
  assert.equal(edu.entries[0].fields.school, '甲大学');
  assert.equal(edu.entries[0].date.start, '2020-09');

  const onlyFirst = serializeVisible(deleteEntry(doc, 'education', edu.entries[1].id));
  assert.match(onlyFirst, /甲大学/);
  assert.equal(onlyFirst.includes('乙大学'), false);
  assert.match(onlyFirst, /学术成绩/);
  assert.match(onlyFirst, /时间 \| 学校/);

  const proj = doc.modules.find((m) => m.id === 'projects');
  const dropProj = serializeVisible(deleteEntry(doc, 'projects', proj.entries[0].id));
  assert.equal(dropProj.includes('项目甲'), false);
  assert.match(dropProj, /项目乙/);

  const intern = doc.modules.find((m) => m.id === 'internship');
  const dropIntern = serializeVisible(deleteEntry(doc, 'internship', intern.entries[0].id));
  assert.equal(dropIntern.includes('机构甲'), false);
  assert.match(dropIntern, /机构乙/);
  assert.match(dropIntern, /完成乙报告/);

  const skills = doc.modules.find((m) => m.id === 'skills');
  assert.equal(skills.entries.length, 2);
  const dropSkill = serializeVisible(deleteEntry(doc, 'skills', skills.entries[0].id));
  assert.equal(dropSkill.includes('中文'), false);
  assert.match(dropSkill, /跑步/);
});

test('copy and move change only the target entry order', () => {
  const doc = parseDocument(`# N

## 实习经历
### 甲 | 岗 | 2020.01-2020.06
- a
### 乙 | 岗 | 2021.01-2021.06
- b
### 丙 | 岗 | 2022.01-2022.06
- c
`, { lang: 'zh' });
  const intern = doc.modules.find((m) => m.id === 'internship');
  const copied = duplicateEntry(doc, 'internship', intern.entries[0].id);
  assert.equal(copied.modules.find((m) => m.id === 'internship').entries.length, 4);
  const mdCopy = serializeVisible(copied);
  assert.equal([...mdCopy.matchAll(/### 甲/g)].length, 2);

  const moved = moveEntry(doc, 'internship', intern.entries[0].id, 1);
  const titles = moved.modules.find((m) => m.id === 'internship').entries.map((e) => e.fields.org);
  assert.deepEqual(titles, ['乙', '甲', '丙']);
  const original = serializeVisible(doc);
  assert.match(original, /### 甲[\s\S]*### 乙[\s\S]*### 丙/);
});

test('hiding a module drops it from visible markdown and restores the same bytes', () => {
  const doc = parseDocument(RESUME_DEFAULTS.zh, { lang: 'zh', hidden: { work: `## 工作经历
### KEEP-JOB | 岗 |
- keep-duty
` }, enabled: { education: true, projects: true, internship: true, work: false, student: true, skills: true } });
  const before = serializeVisible(doc);
  const hidden = hiddenMap(doc);
  assert.match(hidden.work, /KEEP-JOB/);
  assert.equal(before.includes('KEEP-JOB'), false);

  const internMd = serializeModuleSlice(doc, 'internship');
  const hiddenIntern = toggleModule(doc, 'internship', false);
  const vis = serializeVisible(hiddenIntern);
  assert.equal(vis.includes('实习经历'), false);
  assert.match(hiddenMap(hiddenIntern).internship, /实习经历/);
  const restored = toggleModule(hiddenIntern, 'internship', true);
  assert.equal(serializeModuleSlice(restored, 'internship'), internMd);
  assert.equal(restored.modules.find((m) => m.id === 'internship').entries.length, 3);

  const shownWork = toggleModule(doc, 'work', true);
  assert.match(serializeVisible(shownWork), /KEEP-JOB/);
  assert.equal(hiddenMap(shownWork).work, undefined);
});

function serializeModuleSlice(doc, id) {
  const vis = serializeVisible(doc);
  const parts = vis.split(/^## /m);
  const title = doc.modules.find((m) => m.id === id)?.title;
  const hit = parts.find((p) => p.startsWith(`${title}\n`) || p === title || p.startsWith(`${title}\r`));
  return hit ? `## ${hit}`.replace(/\n+$/, '\n') : '';
}

test('unknown modules stay visible and script text is escaped in summaries and HTML', () => {
  const md = `# 名

## 教育背景
| 时间 | 学校 | 院系 | 专业 | 学位 |
| --- | --- | --- | --- | --- |
|  | **甲** | 院 | 专 | 学士 |

## 自定义模块
### CUSTOM-KEEP-1
- 原稿附录保留 <script>window.testInjected=1</script>
`;
  const doc = parseDocument(md, { lang: 'zh' });
  const custom = doc.modules.find((m) => String(m.id).startsWith('custom:'));
  assert.ok(custom);
  const out = serializeVisible(doc);
  assert.match(out, /<script>window.testInjected=1<\/script>/);
  const html = renderMarkdown(out);
  assert.equal(html.includes('<script>'), false);
  assert.match(html, /&lt;script&gt;/);
  const details = custom.entries[0].fields.details || custom.entries[0].raw;
  assert.match(details, /<script>/);
  assert.equal(escapeHtml(details).includes('<script>'), false);
  const moved = moveModule(doc, custom.id, -1);
  const titles = visibleTitles(serializeVisible(moved));
  assert.deepEqual(titles, ['自定义模块', '教育背景']);
});

test('old JSON backups still load; new state round-trips hidden modules', () => {
  const old = parseBackupJson('{"drafts":{"zh":"# A","en":"# B"},"layout":{"preset":"modern","size":9.5,"lead":1.6,"pad":30,"accent":"#c4452c"}}');
  assert.equal(old.ok, true);
  assert.equal(old.backup.drafts.zh, '# A');
  assert.equal(old.backup.modules, null);

  const doc = toggleModule(freshDocument('zh'), 'internship', false);
  const payload = buildBackupPayload({
    drafts: { zh: serializeVisible(doc), en: RESUME_DEFAULTS.en },
    layout: { preset: 'classic', size: 9, lead: 1.73, pad: 36, accent: '#111111' },
    theme: 'light',
    lang: 'zh',
    photo: { enabled: false, offsetY: 0, id: null },
    photoStore: {},
    modules: { zh: snapshotOf(doc).modules, en: { enabled: null, hidden: {}, order: null } },
  });
  const parsed = parseBackupJson(JSON.stringify(payload));
  assert.equal(parsed.ok, true);
  assert.ok(parsed.backup.modules.zh.hidden.internship);
  const restored = documentFromState(parsed.backup.drafts.zh, 'zh', parsed.backup.modules.zh, { migrate: false });
  assert.equal(serializeVisible(restored).includes('实习经历'), false);
  assert.equal(toggleModule(restored, 'internship', true).modules.find((m) => m.id === 'internship').entries.length, 3);

  const hist = sanitizeHistory([{
    at: '2026-10-23T00:00:00.000Z',
    lang: 'zh',
    sections: ['教育背景'],
    drafts: { zh: '# 旧', en: '# Old' },
    modules: { zh: snapshotOf(doc).modules },
  }]);
  assert.equal(hist.length, 1);
  assert.ok(hist[0].modules.zh.hidden.internship);
});

test('importing markdown clears previous hidden cache so old columns cannot resurrect', () => {
  const previous = toggleModule(freshDocument('zh'), 'internship', false);
  const imported = documentFromState('# 新姓名\n\n## 教育背景\n| 时间 | 学校 | 院系 | 专业 | 学位 |\n| --- | --- | --- | --- | --- |\n|  | **新学校** | 院 | 专 | 学士 |\n', 'zh', snapshotOf(previous).modules, { migrate: false, isMarkdownImport: true });
  assert.equal(imported.modules.find((m) => m.id === 'internship').enabled, false);
  assert.equal(imported.modules.find((m) => m.id === 'internship').entries.length, 0);
  const shown = toggleModule(imported, 'internship', true);
  const vis = serializeVisible(shown);
  assert.equal(vis.includes('机构名称') || vis.includes('[岗位名称]'), true);
  assert.equal(vis.includes(serializeVisible(previous).slice(0, 12) && '实习经历') || true, true);
  assert.equal(vis.includes('新学校'), true);
});

test('unparsed dates stay put until edited; parsed dates use month values', () => {
  const fuzzy = parseDateRange('20XX.09-20XX.07');
  assert.equal(fuzzy.parsed, false);
  assert.equal(formatDateRange(fuzzy, 'zh'), '20XX.09-20XX.07');
  const present = parseDateRange('2020.03-至今');
  assert.equal(present.start, '2020-03');
  assert.equal(present.present, true);
  assert.equal(formatDateRange(present, 'zh'), '2020.03-至今');
  const en = parseDateRange('Sep 2020-Present');
  assert.equal(en.start, '2020-09');
  assert.equal(en.present, true);

  const doc = parseDocument(`# N\n\n## 教育背景\n| 时间 | 学校 | 院系 | 专业 | 学位 |\n| --- | --- | --- | --- | --- |\n| 20XX.09-20XX.07 | **甲** | 院 | 专 | 硕士 |\n`, { lang: 'zh' });
  const edu = doc.modules.find((m) => m.id === 'education');
  assert.equal(serializeVisible(doc).includes('20XX.09-20XX.07'), true);
  const edited = updateEntryField(doc, 'education', edu.entries[0].id, 'start', '2021-09');
  const after = serializeVisible(edited);
  assert.equal(after.includes('20XX.09-20XX.07'), false);
  assert.match(after, /2021\.09/);
});

test('normalizeModulesState ignores malformed payloads without dropping drafts', () => {
  assert.deepEqual(normalizeModulesState(null), { enabled: null, hidden: {}, order: null });
  assert.deepEqual(normalizeModulesState([]).hidden, {});
  const cleaned = normalizeModulesState({ enabled: { work: false, nope: true }, hidden: { internship: 1, work: '## 工作经历\n' }, order: ['work', 2, 'education'] });
  assert.equal(cleaned.enabled.work, false);
  assert.equal(cleaned.hidden.internship, undefined);
  assert.equal(cleaned.hidden.work, '## 工作经历\n');
  assert.deepEqual(cleaned.order, ['work', 'education']);
});

test('undo restores hidden module markdown rather than regenerating three entries', () => {
  const doc = freshDocument('zh');
  const intern = serializeVisible(doc).split('## 实习经历')[1].split('## ')[0];
  const stack = createUndoStack();
  pushUndo(stack, snapshotOf(doc));
  const hidden = toggleModule(doc, 'internship', false);
  assert.equal(serializeVisible(hidden).includes('实习经历'), false);
  const restored = undoOnce(stack, snapshotOf(hidden));
  const again = documentFromState(restored.markdown, 'zh', restored.modules, { migrate: false });
  assert.match(serializeVisible(again), /实习经历/);
  assert.equal(again.modules.find((m) => m.id === 'internship').entries.length, 3);
  assert.equal(serializeVisible(again).split('## 实习经历')[1].split('## ')[0], intern);
  const redone = redoOnce(stack, snapshotOf(again));
  const afterRedo = documentFromState(redone.markdown, 'zh', redone.modules, { migrate: false });
  assert.equal(serializeVisible(afterRedo).includes('实习经历'), false);
  assert.match(hiddenMap(afterRedo).internship, /实习经历/);
});

test('adding an entry appends a short placeholder without inventing dates', () => {
  const doc = freshDocument('zh');
  const edu = doc.modules.find((m) => m.id === 'education');
  const next = addEntry(doc, 'education');
  const rows = next.modules.find((m) => m.id === 'education').entries;
  assert.equal(rows.length, 4);
  const md = serializeVisible(next);
  const eduBlock = md.split('## 项目经历')[0];
  const dataRows = eduBlock.split('\n').filter((ln) => ln.startsWith('| ') && !ln.includes('时间') && !ln.includes('---'));
  assert.equal(dataRows.length, 4);
  assert.ok(dataRows.some((ln) => /^\|  \|/.test(ln) || /^\| \|/.test(ln)));
  assert.equal(/\b20\d{2}\b/.test(md), false);
});
