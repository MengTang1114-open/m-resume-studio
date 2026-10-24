/** Match rendered Markdown fields to whole resume entries without changing the text. */
import { serializeEntry } from './modules.js?v=profile-en-20261024-r3';

export function directRanges(markdown, doc) {
  const lines = String(markdown || '').split('\n');
  const starts = lines.flatMap((line, i) => /^## /.test(line) ? [i] : []);
  const visible = doc.modules.filter(mod => mod.enabled);
  const ranges = [];
  starts.forEach((start, index) => {
    const mod = visible[index];
    if (!mod) return;
    const end = starts[index + 1] ?? lines.length;
    const range = { moduleId: mod.id, start, end, entries: [] };
    const body = lines.slice(start + 1, end).join('\n');
    let cursor = ['education', 'projects', 'table'].includes(mod.kind)
      ? body.indexOf('\n', body.indexOf('\n') + 1) + 1 : 0;
    for (const entry of mod.entries) {
      const fragment = serializeEntry(entry, mod, doc.lang).replace(/\n+$/, '');
      if (!fragment) continue;
      const at = body.indexOf(fragment, cursor);
      if (at < 0) continue;
      const first = start + 1 + body.slice(0, at).split('\n').length - 1;
      const last = first + fragment.split('\n').length;
      range.entries.push({ moduleId: mod.id, entryId: entry.id, start: first, end: last });
      cursor = at + fragment.length;
    }
    ranges.push(range);
  });
  return ranges;
}

export function targetAtLine(ranges, line) {
  const mod = ranges.find(range => line >= range.start && line < range.end);
  if (!mod) return null;
  const entry = mod.entries.find(range => line >= range.start && line < range.end);
  return entry ? { ...entry, line } : { moduleId: mod.moduleId, entryId: null, line: mod.start };
}
