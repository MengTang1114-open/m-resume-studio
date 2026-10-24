import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDateRange, formatDateRange, matchDegree, parseDocument, updateEntryField, serializeVisible, freshDocument, deleteEntry, toggleModule, documentFromState, modulesPayload } from '../modules.js';

test('English role line stays distinct from location when editing organization', () => {
  const doc = parseDocument('# N\n\n## EXPERIENCE\n### Org | London\n**Analyst, Research** | Jan 2020-Jun 2022\n- Completed report\n', { lang: 'en' });
  const mod = doc.modules.find(m => m.id === 'internship');
  const entry = mod.entries[0];
  assert.equal(entry.fields.role, 'Analyst, Research');
  assert.equal(entry.fields.location, 'London');
  const out = serializeVisible(updateEntryField(doc, mod.id, entry.id, 'org', 'New Org'));
  assert.match(out, /Analyst, Research/);
  assert.match(out, /London/);
});

test('ordinary description paragraph survives a change to the organization', () => {
  const doc = parseDocument('# 名\n\n## 实习经历\n### 单位 | 分析师 | 2021.01-2022.01\n这是一段必须保留的原文说明。\n- 工作成果\n', { lang: 'zh' });
  const mod = doc.modules.find(m => m.id === 'internship');
  const out = serializeVisible(updateEntryField(doc, mod.id, mod.entries[0].id, 'org', '新单位'));
  assert.match(out, /这是一段必须保留的原文说明。/);
  assert.match(out, /工作成果/);
});

test('year-only dates do not acquire invented months', () => {
  const out = formatDateRange(parseDateRange('2016–2020'), 'zh');
  assert.match(out, /2016/);
  assert.match(out, /2020/);
  assert.doesNotMatch(out, /(?:2016|2020)[.-]01/);
});

test('Chinese current employment and ISO month ranges restore picker values', () => {
  const present = parseDateRange('2020.03-至今');
  assert.equal(present.start, '2020-03');
  assert.equal(present.present, true);
  const iso = parseDateRange('2020-09–2024-06');
  assert.equal(iso.start, '2020-09');
  assert.equal(iso.end, '2024-06');
});

test('degree options and custom qualifications retain their text', () => {
  assert.equal(matchDegree('PhD', 'en'), 'PhD');
  assert.equal(matchDegree('Associate', 'en'), 'Associate');
  assert.equal(matchDegree('Professional Diploma', 'en'), 'Professional Diploma');
});

test('editing a known table field preserves additional custom columns', () => {
  const doc = parseDocument('# N\n\n## 教育背景\n| 时间 | 学校 | 院系 | 专业 | 学位 | GPA |\n| --- | --- | --- | --- | --- | --- |\n| 2020.09-2024.06 | Old School | Dept | Major | Bachelor | 3.91/4.0 |\n', { lang: 'en' });
  const mod = doc.modules.find(m => m.id === 'education');
  const out = serializeVisible(updateEntryField(doc, mod.id, mod.entries[0].id, 'school', 'New School'));
  assert.match(out, /New School/);
  assert.match(out, /3\.91\/4\.0/);
});

test('empty modules stay empty after hide, reload and recheck', () => {
  for (const moduleId of ['education', 'projects', 'internship', 'student', 'skills']) {
    let doc = freshDocument('zh');
    for (const entry of [...doc.modules.find(m => m.id === moduleId).entries]) {
      doc = deleteEntry(doc, moduleId, entry.id);
    }
    doc = toggleModule(doc, moduleId, false);
    doc = documentFromState(serializeVisible(doc), 'zh', modulesPayload(doc), { migrate: false });
    doc = toggleModule(doc, moduleId, true);
    assert.equal(doc.modules.find(m => m.id === moduleId).entries.length, 0, moduleId);
  }
});

test('a module absent from an imported draft starts with three entries on first check', () => {
  let doc = parseDocument('# Name\n\n## 项目经历\n', {lang: 'zh'});
  doc = documentFromState(serializeVisible(doc), 'zh', modulesPayload(doc), { migrate: false });
  doc = toggleModule(doc, 'work', true);
  assert.equal(doc.modules.find(m => m.id === 'work').entries.length, 3);
});
