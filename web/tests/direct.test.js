import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument, serializeVisible, addEntry, deleteEntry, duplicateEntry, moveEntry, moveModule } from '../modules.js';
import { directRanges, targetAtLine } from '../direct.js';

const fixture = '# DIRECT-NAME\n联系：qa@example.invalid ｜ 000-0000\n\n## 教育背景\n| 时间 | 学校 | 院系 | 专业 | 学位 | 备注 |\n| --- | --- | --- | --- | --- | --- |\n| 2020.09-2024.06 | **EDU-A** | 院系A | 专业A | 学士 | GPA-A |\n| 2021.09-2025.06 | **EDU-B** | 院系B | 专业B | 硕士 | GPA-B |\n| 2017-2020 | **EDU-C** | 院系C | 专业C | Professional Diploma | GPA-C |\n\n## 项目经历\n| 时间 | 项目内容 |\n| --- | --- |\n| 2023.01-2023.03 | **PROJECT-A**：项目说明A |\n| 2023.04-2023.08 | **PROJECT-B**：项目说明B |\n| 2024.01-至今 | **PROJECT-C**：项目说明C |\n\n## 实习经历\n### ORG-A | ROLE-A | 2021.01-2021.06\n- **DETAIL-A1：** 负责资料整理，完成可核实的报告。\n- DETAIL-A2：这条说明应随同机构整段移动或删除。\n### ORG-B | ROLE-B | 2022.01-2022.06\n- DETAIL-B1：第二条机构说明。\n- DETAIL-B2：第二条补充说明。\n### ORG-C | ROLE-C | 2023.01-2023.06\n普通段落说明必须保留。\n- DETAIL-C1：第三条机构说明。\n\n## 学生工作\n### STUDENT-A | ROLE-A | 2021.01-至今\n- STUDENT-DETAIL-A\n### STUDENT-B | ROLE-B | 2020.01-2020.06\n- STUDENT-DETAIL-B\n### STUDENT-C | ROLE-C | 2019.01-2019.06\n- STUDENT-DETAIL-C\n\n## 技能及爱好\n**技能A：** SKILL-A\n**技能B：** SKILL-B\n**爱好：** HOBBY-C\n\n## 自定义模块\n### CUSTOM-A\n- CUSTOM-DETAIL：保留 <script>window.directInjected=1</script>\n';
const document = () => parseDocument(fixture, { lang: 'zh' });
const linesFor = (md, range) => md.split('\n').slice(range.start, range.end).join('\n');

test('direct table selection includes exactly one row and preserves custom columns', () => {
  const doc = document();
  const range = directRanges(fixture, doc).find(m => m.moduleId === 'education');
  assert.equal(range.entries.length, 3);
  assert.match(linesFor(fixture, range.entries[0]), /EDU-A.*GPA-A/);
  assert.doesNotMatch(linesFor(fixture, range.entries[0]), /EDU-B|GPA-B/);
  assert.equal(targetAtLine([range], range.entries[0].start).entryId, range.entries[0].entryId);
  assert.equal(targetAtLine([range], range.start).entryId, null);
});

test('direct experience selection includes heading, every bullet and ordinary paragraphs', () => {
  const doc = document();
  const range = directRanges(fixture, doc).find(m => m.moduleId === 'internship');
  assert.equal(range.entries.length, 3);
  const entry = range.entries[0];
  const text = linesFor(fixture, entry);
  assert.match(text, /ORG-A/);
  assert.match(text, /DETAIL-A1/);
  assert.match(text, /DETAIL-A2/);
  assert.doesNotMatch(text, /ORG-B|DETAIL-B1/);
  assert.equal(targetAtLine([range], entry.end - 1).entryId, entry.entryId);
  assert.match(linesFor(fixture, range.entries[2]), /DETAIL-C1/);
});

test('whole experience delete removes its details while retaining neighboring entries', () => {
  const doc = document();
  const mod = doc.modules.find(m => m.id === 'internship');
  const md = serializeVisible(deleteEntry(doc, mod.id, mod.entries[0].id));
  assert.doesNotMatch(md, /ORG-A|DETAIL-A1|DETAIL-A2/);
  assert.match(md, /ORG-B/);
  assert.match(md, /DETAIL-C1/);
});

test('add inserts immediately after the selected entry', () => {
  const doc = document();
  const mod = doc.modules.find(m => m.id === 'internship');
  const next = addEntry(doc, mod.id, mod.entries[0].id).modules.find(m => m.id === mod.id);
  assert.equal(next.entries.length, 4);
  assert.equal(next.entries[0].id, mod.entries[0].id);
  assert.equal(next.entries[2].id, mod.entries[1].id);
});

test('adding to a custom table creates a selectable row with the same column count', () => {
  let doc = parseDocument('# N\n\n## 自定义成果\n| 类别 | 内容 | 备注 |\n| --- | --- | --- |\n| A | B | C |\n', { lang: 'zh' });
  const mod = doc.modules.find(m => m.enabled);
  doc = addEntry(doc, mod.id, mod.entries[0].id);
  const md = serializeVisible(doc);
  const ranges = directRanges(md, doc)[0].entries;
  assert.equal(ranges.length, 2);
  assert.match(linesFor(md, ranges[1]), /^\|  \|  \|  \|$/);
});

test('duplicate keeps exact text and bold markup; repeated entries map separately', () => {
  const doc = document();
  const mod = doc.modules.find(m => m.id === 'internship');
  const next = duplicateEntry(doc, mod.id, mod.entries[0].id);
  assert.equal(next.modules.find(m => m.id === mod.id).entries[1].raw, mod.entries[0].raw);
  const md = serializeVisible(next);
  const ranges = directRanges(md, next).find(m => m.moduleId === mod.id).entries;
  assert.equal(ranges.length, 4);
  assert.notEqual(ranges[0].entryId, ranges[1].entryId);
  assert.equal(linesFor(md, ranges[0]), linesFor(md, ranges[1]));
  assert.ok(ranges[0].end <= ranges[1].start);
});

test('mapping follows moved entries and sections after text is edited and reparsed', () => {
  let doc = parseDocument(fixture.replace('ORG-B', 'ORG-B-EDITED'), { lang: 'zh' });
  let mod = doc.modules.find(m => m.id === 'internship');
  doc = moveEntry(doc, mod.id, mod.entries[1].id, -1);
  doc = moveModule(doc, mod.id, -1);
  const md = serializeVisible(doc);
  const ranges = directRanges(md, doc);
  assert.equal(ranges[1].moduleId, 'internship');
  assert.match(linesFor(md, ranges[1].entries[0]), /ORG-B-EDITED/);
  assert.match(linesFor(md, ranges[1].entries[1]), /ORG-A/);
});

test('multiline custom paragraphs remain whole entries after a structural edit and reload', () => {
  let doc = parseDocument('# N\n\n## 自定义\nFIRST-A\nFIRST-B\n\nSECOND-A\nSECOND-B\n', { lang: 'zh' });
  const mod = doc.modules.find(m => m.enabled);
  doc = moveEntry(doc, mod.id, mod.entries[1].id, -1);
  const md = serializeVisible(doc);
  const restored = parseDocument(md, { lang: 'zh' });
  const entries = restored.modules.find(m => m.enabled).entries;
  assert.equal(entries.length, 2);
  assert.equal(entries[0].raw, 'SECOND-A\nSECOND-B');
  assert.equal(entries[1].raw, 'FIRST-A\nFIRST-B');
  assert.equal(directRanges(md, restored)[0].entries.length, 2);
});
