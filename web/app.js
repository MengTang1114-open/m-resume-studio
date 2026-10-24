import { RESUME_DEFAULTS } from './content.js?v=profile-en-20261024-r3';
import {
  ACCENT_SWATCHES,
  DEFAULT_LAYOUT,
  DEFAULT_PHOTO,
  HISTORY_LIMIT,
  LAYOUT_PRESETS,
  PHOTO_PIXEL_HEIGHT,
  PHOTO_PIXEL_WIDTH,
  STATE_KEY,
  acceptPhotoFileMeta,
  applyLayoutToStyle,
  applyFieldEdit,
  markdownFromField,
  applyPhotoToHtml,
  buildBackupPayload,
  buildOfflineHtml,
  changedSections,
  collectPhotoIds,
  createTranslateError,
  englishLooksEdited,
  escapeHtml,
  headingName,
  inspectPhotoDataUrl,
  normalizeLayout,
  normalizePhoto,
  parseBackupJson,
  parseMarkdownImport,
  photoIdForData,
  photoMetaEqual,
  prunePhotoStore,
  renderMarkdown,
  resolvePhoto,
  sanitizeHistory,
  sanitizeModulesBag,
  sanitizePhotoStore,
  sniffImageMagic,
  translateResume,
  utf8ByteLength,
  writingChecks,
} from './core.js?v=profile-en-20261024-r3';
import { EDITOR_COPY, isEditorField, renderPicker } from './editor.js?v=profile-en-20261024-r3';
import { directRanges, targetAtLine } from './direct.js?v=profile-en-20261024-r3';
import {
  addEntry,
  createUndoStack,
  deleteEntry,
  documentFromState,
  duplicateEntry,
  hiddenMap,
  modulesPayload,
  moveEntry,
  moveModule,
  parseDocument,
  pushUndo,
  redoOnce,
  serializeVisible,
  snapshotOf,
  toggleModule,
  undoOnce,
} from './modules.js?v=profile-en-20261024-r3';

const $ = (id) => document.getElementById(id);
const copy = {
  zh: {
    title: '简历工作台',
    save: '保存',
    saved: '已保存',
    saving: '正在保存…',
    dirty: '未保存',
    storageFail: '无法写入本地存储。请导出 JSON 备份，刷新后内容可能丢失。',
    storageBlocked: '当前浏览器不可用本地存储。编辑只会留在本页，请尽快导出备份。',
    lang: '稿件语言',
    focus: '专注',
    focusExit: '退出专注',
    translate: '生成英文草稿',
    print: '打印 / PDF',
    export: '导出',
    exportMd: '导出 Markdown',
    exportHtml: '导出离线 HTML',
    exportJson: '导出 JSON 备份',
    importMd: '导入 Markdown',
    importJson: '导入 JSON 备份',
    badge: '示例模板',
    banner: '从匿名模板开始，替换为你的真实经历。草稿自动保存在本浏览器；仅主动翻译时向 MyMemory 发送正文。',
    docZh: '中文简历',
    docEn: 'English resume',
    visual: '直接编辑',
    markdown: 'Markdown（高级）',
    sync: '实时预览',
    visualHint: '像 Word 一样点击简历文字直接修改。选中一条经历后，用按钮新增、删除或调整顺序。',
    tabContent: '内容',
    tabCheck: '检查',
    tabHistory: '历史',
    layoutHint: '排版会同时作用于右侧预览和打印 / PDF。恢复默认排版不会清空文稿。照片设置独立保存，不会被快捷样式清掉。',
    preset: '快捷样式',
    classic: '经典',
    compact: '紧凑',
    modern: '现代',
    photo: '照片',
    photoOff: '无照片',
    photoOn: '有照片',
    photoHint: '二寸照片（35×49mm）。支持 JPEG / PNG / WebP，最大 8MB。照片仅保存在本浏览器。',
    photoChoose: '选择照片',
    photoReplace: '替换照片',
    photoRemove: '移除照片',
    photoOffset: '上下位置',
    photoCenter: '居中',
    photoUp: '上移',
    photoDown: '下移',
    photoPlaceholder: '二寸照片',
    photoPending: '尚未选择照片。屏幕上显示占位框；打印和离线导出不会出现此框。',
    photoReady: '已选用一张二寸照片，中英文稿共用。',
    photoOk: '已更新二寸照片。',
    photoCleared: '已移除照片。',
    photoBadType: '仅支持 JPEG、PNG 或 WebP，且不能使用 SVG 或网络图片。原照片未改动。',
    photoTooBig: '图片超过 8MB，请压缩后再选。原照片未改动。',
    photoBadFile: '无法读取该图片，已保留原来的照片和文稿。',
    mdPhotoHint: 'Markdown 是纯文本，不含照片。请用 JSON 备份或导出 HTML / PDF 来保留照片。',
    size: '字号',
    lead: '行距',
    pad: '页边距',
    accent: '强调色',
    resetLayout: '恢复默认排版',
    pageWarn: '超出 A4 一页，打印将分页，不会裁切。',
    checkHint: '检查占位符、空条目和需要补充的成果。写作提示不会拦截导出。',
    historyHint: '手动保存（含 ⌘/Ctrl+S）会留下最近 50 条记录，可恢复当时的中英文稿、排版与照片选择。',
    restoreEn: '恢复覆盖前的英文稿',
    backupNote: '已保留覆盖前的英文稿，可随时恢复。',
    noHistory: '还没有手动保存记录。',
    restore: '恢复此版本',
    restored: '已恢复所选版本。',
    savedManual: '已保存，并写入更新记录。',
    noChange: '内容未变更，无需写入记录。',
    importedMd: '已导入 Markdown，请核对后保存。',
    importedJson: '已导入 JSON 备份。',
    importFail: '无法导入该文件。请确认是 Markdown 或本工具导出的 JSON。',
    exported: '已开始下载。',
    layoutReset: '已恢复默认排版，文稿和照片未改动。',
    tdTitle: '生成英文草稿',
    tdBody: `<p>根据中文稿生成可继续编辑的英文机器草稿。</p>
<p>确认后，简历<strong>正文片段</strong>将发送至 MyMemory 公共翻译服务（api.mymemory.translated.net）。免费额度有限。</p>
<p><strong>本地保留：</strong>姓名（# 标题）、首个栏目之前的个人信息，以及识别出的电话、邮箱行。这些内容不会发送；通用标签和模板占位文字在本地转为英文，真实姓名如需拼音或英文名请直接编辑。</p>
<p><strong>发送内容：</strong>其余含中文的正文片段。标题、列表、加粗和表格结构会保留；纯数字或纯英文片段保持原样。开始前请检查正文中是否夹有需要自行移除的个人信息。</p>
<p>机器译文需要你核对公司、学校等专名，以及成果、职务和数字是否与中文一致。</p>`,
    overwrite: '我了解将覆盖当前英文稿，覆盖前会自动备份。',
    tdCancel: '取消',
    tdConfirm: '确认并开始翻译',
    pdTitle: '正在翻译',
    pdHint: '正在生成 MyMemory 机器翻译草稿，完成后可继续修改。',
    pdCancel: '取消',
    translating: (a, b) => `正在翻译 ${a} / ${b} 段`,
    translateOk: '英文草稿已填入。基本信息标签已转为英文，真实姓名与联系方式保留。请核对英文姓名、专名与成果。',
    translateCancel: '已取消，英文稿未改动。',
    translateOffline: '当前没有网络，英文稿未改动。',
    translateFail: '翻译未能完成，英文稿未改动。请稍后重试。',
    needOverwrite: '请先勾选确认覆盖英文稿。',
    checkNone: '没有检测到占位符、空条或明显偏弱的条目。',
    checkCounts: (c) => `占位 ${c.placeholder} · 空条 ${c.empty} · 偏弱 ${c.weak}`,
    placeholder: (n) => `第 ${n} 行：待补充占位或草稿标记。`,
    empty: (n) => `第 ${n} 行：条目为空。`,
    thin: (n) => `第 ${n} 行：条目过短，信息量可能不足。`,
    weak: (n) => `第 ${n} 行：缺少可观察的行动。`,
    result: (n) => `第 ${n} 行：有行动，但看不到结果或交付物。`,
    star: 'STAR 建议：情境用一句带过，把本人行动和可核实结果写清楚。没有数字就写交付物、采用情况或完成节点。',
    noInvent: '不要为了填满条目而编造业绩、规模或奖项。检查只提示结构，不代替你对事实的核对。',
    updated: '更新了',
    profile: '个人信息',
    photoSection: '照片',
    mobileEdit: '编辑',
    mobilePreview: '预览',
  },
  en: {
    title: 'Resume workspace',
    save: 'Save',
    saved: 'Saved',
    saving: 'Saving…',
    dirty: 'Unsaved',
    storageFail: 'Local storage is full or blocked. Export a JSON backup; a refresh may lose edits.',
    storageBlocked: 'Local storage is unavailable. Edits stay on this page only — export a backup.',
    lang: 'Resume language',
    focus: 'Focus',
    focusExit: 'Exit focus',
    translate: 'Draft English',
    print: 'Print / PDF',
    export: 'Export',
    exportMd: 'Export Markdown',
    exportHtml: 'Export offline HTML',
    exportJson: 'Export JSON backup',
    importMd: 'Import Markdown',
    importJson: 'Import JSON backup',
    badge: 'Sample template',
    banner: 'Start with an anonymous template. Drafts save in this browser; text is sent to MyMemory only when you choose to translate.',
    docZh: 'Chinese resume',
    docEn: 'English resume',
    visual: 'Direct edit',
    markdown: 'Markdown (advanced)',
    sync: 'Live preview',
    visualHint: 'Click resume text to edit directly. Select an entry, then add, duplicate, delete or move it with the toolbar.',
    tabContent: 'Content',
    tabCheck: 'Check',
    tabHistory: 'History',
    layoutHint: 'Layout applies to the preview and Print / PDF. Resetting layout does not clear your drafts or photo.',
    preset: 'Presets',
    classic: 'Classic',
    compact: 'Compact',
    modern: 'Modern',
    photo: 'Photo',
    photoOff: 'No photo',
    photoOn: 'With photo',
    photoHint: '2-inch photo (35×49mm). JPEG / PNG / WebP, 8MB max. Your photo stays in this browser.',
    photoChoose: 'Choose photo',
    photoReplace: 'Replace photo',
    photoRemove: 'Remove photo',
    photoOffset: 'Vertical position',
    photoCenter: 'Center',
    photoUp: 'Up',
    photoDown: 'Down',
    photoPlaceholder: '2-inch photo',
    photoPending: 'No photo selected yet. A screen-only placeholder is shown; print and offline export omit it.',
    photoReady: 'A 2-inch photo is in use and shared by both language drafts.',
    photoOk: '2-inch photo updated.',
    photoCleared: 'Photo removed.',
    photoBadType: 'Use JPEG, PNG or WebP. SVG and remote images are not accepted. The existing photo is unchanged.',
    photoTooBig: 'That file is larger than 8MB. The existing photo is unchanged.',
    photoBadFile: 'Could not read that image. The existing photo and drafts are unchanged.',
    mdPhotoHint: 'Markdown is plain text and does not store the photo. Use a JSON backup or export HTML / PDF to keep it.',
    size: 'Type size',
    lead: 'Line height',
    pad: 'Margins',
    accent: 'Accent',
    resetLayout: 'Reset layout',
    pageWarn: 'Longer than one A4 page. Printing will paginate; nothing is clipped.',
    checkHint: 'Check placeholders, empty entries and outcomes to clarify. Hints never block export.',
    historyHint: 'Manual saves (including ⌘/Ctrl+S) keep the last 50 snapshots of both drafts, layout and photo choice.',
    restoreEn: 'Restore English from before overwrite',
    backupNote: 'The previous English draft was backed up and can be restored.',
    noHistory: 'No manual saves yet.',
    restore: 'Restore this version',
    restored: 'Restored the selected version.',
    savedManual: 'Saved and added to history.',
    noChange: 'No changes to record.',
    importedMd: 'Markdown imported. Review, then save.',
    importedJson: 'JSON backup imported.',
    importFail: 'Could not import that file. Use Markdown or a backup from this tool.',
    exported: 'Download started.',
    layoutReset: 'Layout reset. Drafts unchanged.',
    tdTitle: 'Generate an English draft',
    tdBody: `<p>Create an editable English machine translation draft from your Chinese resume.</p>
<p>After you confirm, <strong>body fragments</strong> are sent to the public MyMemory API (api.mymemory.translated.net). Free quota is limited.</p>
<p><strong>Kept locally:</strong> the name (# heading), profile before the first section, and recognizable phone or email lines. These are not sent. Common labels and template placeholders are converted locally; edit your real name if you prefer pinyin or an English name.</p>
<p><strong>Sent:</strong> remaining fragments containing Chinese. Headings, lists, bold and tables are preserved. Purely numeric or English fragments stay unchanged. Check the body for any additional personal information before starting.</p>
<p>Check company and school names, titles, outcomes and figures against the Chinese source.</p>`,
    overwrite: 'I understand the current English draft will be overwritten, with an automatic backup.',
    tdCancel: 'Cancel',
    tdConfirm: 'Confirm and translate',
    pdTitle: 'Translating',
    pdHint: 'Creating a MyMemory machine translation draft you can edit afterwards.',
    pdCancel: 'Cancel',
    translating: (a, b) => `Translating ${a} / ${b}`,
    translateOk: 'English draft ready. Profile labels are in English; your real name and contact details are preserved. Check your English name, proper nouns and outcomes.',
    translateCancel: 'Cancelled. The English draft was left unchanged.',
    translateOffline: 'No network. The English draft was left unchanged.',
    translateFail: 'Translation did not finish. The English draft was left unchanged. Try again later.',
    needOverwrite: 'Tick the box to confirm overwriting the English draft.',
    checkNone: 'No placeholders, empty bullets or obviously thin entries detected.',
    checkCounts: (c) => `Placeholders ${c.placeholder} · empty ${c.empty} · thin ${c.weak}`,
    placeholder: (n) => `Line ${n}: placeholder or draft marker.`,
    empty: (n) => `Line ${n}: empty bullet.`,
    thin: (n) => `Line ${n}: very short; may lack substance.`,
    weak: (n) => `Line ${n}: no observable action.`,
    result: (n) => `Line ${n}: action without a visible result or deliverable.`,
    star: 'STAR: keep situation short; put weight on your action and a verifiable result. If you have no number, name the deliverable, adoption or finish point.',
    noInvent: 'Do not invent metrics, scale or awards to fill a line. These checks are structural, not a truth audit.',
    updated: 'Updated',
    profile: 'Profile',
    photoSection: 'Photo',
    mobileEdit: 'Edit',
    mobilePreview: 'Preview',
  },
};

const state = {
  lang: 'zh',
  theme: 'light',
  drafts: { zh: RESUME_DEFAULTS.zh, en: RESUME_DEFAULTS.en },
  docs: { zh: null, en: null },
  layout: { ...DEFAULT_LAYOUT },
  photo: { ...DEFAULT_PHOTO },
  photoStore: {},
  history: [],
  englishBackup: null,
  editorMode: 'visual',
  leftTab: 'edit',
  storageOk: true,
  dirty: false,
  undo: { zh: createUndoStack(), en: createUndoStack() },
  modulesBag: null,
};

let autosaveTimer = 0;
let toastTimer = 0;
let translateAbort = null;
let photoUploadRevision = 0;

function t() {
  return copy[document.documentElement.lang === 'en' ? 'en' : 'zh'];
}

function ed() {
  return EDITOR_COPY[uiLang()];
}

function uiLang() {
  return state.lang === 'en' ? 'en' : 'zh';
}

function currentMd() {
  return state.drafts[state.lang];
}

function currentDoc() {
  return state.docs[state.lang];
}

function modulesBag() {
  return {
    zh: state.docs.zh ? modulesPayload(state.docs.zh) : undefined,
    en: state.docs.en ? modulesPayload(state.docs.en) : undefined,
  };
}

function resetSessionIndexes(lang) {
  const keys = lang ? [lang] : ['zh', 'en'];
  for (const key of keys) {
    state.undo[key] = createUndoStack();
  }
}

function bootDocuments() {
  const bag = sanitizeModulesBag(state.modulesBag);
  for (const lang of ['zh', 'en']) {
    state.docs[lang] = documentFromState(state.drafts[lang], lang, bag?.[lang], { migrate: true });
    state.drafts[lang] = serializeVisible(state.docs[lang]);
  }
  state.modulesBag = null;
}

function writeDoc(doc, { renderForm = true } = {}) {
  state.docs[state.lang] = doc;
  const md = serializeVisible(doc);
  state.drafts[state.lang] = md;
  $('source').value = md;
  if (renderForm) refreshContentEditor();
  renderPreview();
  renderChecks();
  markDirty();
}

function setCurrentMd(md, { renderVisual = false, clearHidden = false } = {}) {
  const lang = state.lang;
  if (clearHidden) {
    state.docs[lang] = documentFromState(md, lang, null, { migrate: false, isMarkdownImport: true });
    resetSessionIndexes(lang);
  } else {
    const prev = state.docs[lang];
    state.docs[lang] = parseDocument(md, {
      lang,
      hidden: prev ? hiddenMap(prev) : {},
      order: prev ? prev.modules.map((m) => m.id) : null,
    });
  }
  state.drafts[lang] = serializeVisible(state.docs[lang]);
  $('source').value = state.drafts[lang];
  if (renderVisual) refreshContentEditor();
  renderPreview();
  renderChecks();
  markDirty();
}

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 4200);
}

function setSaveStatus(kind, text) {
  const cluster = document.querySelector('.save-cluster');
  cluster.classList.toggle('is-dirty', kind === 'dirty' || kind === 'saving');
  cluster.classList.toggle('is-error', kind === 'error');
  $('saveStatus').textContent = text;
}

function markDirty() {
  state.dirty = true;
  setSaveStatus('dirty', t().dirty);
  scheduleAutosave();
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => persist({ manual: false }), 700);
}

function persist({ manual = false } = {}) {
  syncDirectDocument();
  const ui = t();
  if (manual) setSaveStatus('saving', ui.saving);
  const payload = {
    version: 1,
    lang: state.lang,
    theme: state.theme,
    drafts: { zh: state.drafts.zh, en: state.drafts.en },
    layout: state.layout,
    photo: normalizePhoto(state.photo),
    photoStore: prunePhotoStore(state.photoStore, collectPhotoIds(state.photo, state.history)),
    history: state.history,
    englishBackup: state.englishBackup,
    modules: modulesBag(),
  };
  if (!state.storageOk) {
    setSaveStatus('error', ui.storageBlocked);
    return false;
  }
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(payload));
    state.dirty = false;
    setSaveStatus('saved', ui.saved);
    $('storageBanner').hidden = true;
    return true;
  } catch {
    state.storageOk = false;
    setSaveStatus('error', ui.storageFail);
    $('storageBanner').hidden = false;
    $('storageBanner').textContent = ui.storageFail;
    return false;
  }
}

function loadState() {
  try {
    const probe = '__rs_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
  } catch {
    state.storageOk = false;
    $('storageBanner').hidden = false;
    $('storageBanner').textContent = copy.zh.storageBlocked;
    return;
  }
  try {
    const raw = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return;
    if (typeof raw.drafts?.zh === 'string') state.drafts.zh = raw.drafts.zh;
    if (typeof raw.drafts?.en === 'string') state.drafts.en = raw.drafts.en;
    if (raw.lang === 'zh' || raw.lang === 'en') state.lang = raw.lang;
    if (raw.theme === 'dark' || raw.theme === 'light') state.theme = raw.theme;
    if (raw.layout) state.layout = normalizeLayout(raw.layout);
    state.photo = normalizePhoto(raw.photo);
    state.history = sanitizeHistory(raw.history);
    state.photoStore = prunePhotoStore(sanitizePhotoStore(raw.photoStore), collectPhotoIds(state.photo, state.history));
    if (raw.englishBackup && typeof raw.englishBackup.markdown === 'string') {
      state.englishBackup = raw.englishBackup;
    }
    state.modulesBag = sanitizeModulesBag(raw.modules);
  } catch {
    /* keep defaults */
  }
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  $('themeLight').setAttribute('aria-pressed', String(state.theme === 'light'));
  $('themeDark').setAttribute('aria-pressed', String(state.theme === 'dark'));
}

function applyLangChrome() {
  const lang = uiLang();
  const ui = copy[lang];
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  document.title = `${headingName(currentMd()) || ui.title} · Resume Studio`;
  $('langZh').setAttribute('aria-pressed', String(state.lang === 'zh'));
  $('langEn').setAttribute('aria-pressed', String(state.lang === 'en'));
  $('saveBtn').textContent = ui.save;
  $('focusBtn').textContent = document.body.classList.contains('focus-mode') ? ui.focusExit : ui.focus;
  $('translateBtn').textContent = ui.translate;
  $('printBtn').textContent = ui.print;
  $('exportMenuBtn').textContent = ui.export;
  $('exportMd').textContent = ui.exportMd;
  $('exportHtml').textContent = ui.exportHtml;
  $('exportJson').textContent = ui.exportJson;
  $('importMd').parentElement.firstChild.textContent = ui.importMd;
  $('importJson').parentElement.firstChild.textContent = ui.importJson;
  $('themeLight').textContent = lang === 'en' ? 'Light' : '浅色';
  $('themeDark').textContent = lang === 'en' ? 'Dark' : '深色';
  $('themeLight').setAttribute('aria-label', lang === 'en' ? 'Light theme' : '浅色主题');
  $('themeDark').setAttribute('aria-label', lang === 'en' ? 'Dark theme' : '深色主题');
  $('templateBadge').textContent = ui.badge;
  $('sampleBanner').textContent = ui.banner;
  $('docLabel').textContent = state.lang === 'zh' ? ui.docZh : ui.docEn;
  $('visualTab').textContent = ui.visual;
  $('markdownTab').textContent = ui.markdown;
  $('syncState').textContent = ui.sync;
  $('visualHint').textContent = ui.visualHint;
  $('undoBtn').textContent = ed().undo;
  $('redoBtn').textContent = ed().redo;
  $('layoutHint').textContent = ui.layoutHint;
  $('presetLegend').textContent = ui.preset;
  $('photoLegend').textContent = ui.photo;
  $('photoOff').textContent = ui.photoOff;
  $('photoOn').textContent = ui.photoOn;
  $('photoHint').textContent = ui.photoHint;
  $('photoRemove').textContent = ui.photoRemove;
  $('photoOffsetLabel').textContent = ui.photoOffset;
  $('mdPhotoHint').textContent = ui.mdPhotoHint;
  $('presetClassic').textContent = ui.classic;
  $('presetCompact').textContent = ui.compact;
  $('presetModern').textContent = ui.modern;
  $('sizeLabel').textContent = ui.size;
  $('leadLabel').textContent = ui.lead;
  $('padLabel').textContent = ui.pad;
  $('accentLegend').textContent = ui.accent;
  $('resetLayout').textContent = ui.resetLayout;
  $('pageWarn').textContent = ui.pageWarn;
  $('pageWarnLayout').textContent = ui.pageWarn;
  $('checkHint').textContent = ui.checkHint;
  $('historyHint').textContent = ui.historyHint;
  $('restoreEnBackup').textContent = ui.restoreEn;
  $('backupNote').textContent = ui.backupNote;
  $('tabEdit').textContent = ui.tabContent;
  $('tabLayout').textContent = lang === 'en' ? 'Layout' : '排版';
  $('tabCheck').textContent = ui.tabCheck;
  $('tabHistory').textContent = ui.tabHistory;
  $('mobileEdit').textContent = ui.mobileEdit;
  $('mobilePreview').textContent = ui.mobilePreview;
  $('tdTitle').textContent = ui.tdTitle;
  $('tdBody').innerHTML = ui.tdBody;
  $('overwriteLabel').textContent = ui.overwrite;
  $('tdCancel').textContent = ui.tdCancel;
  $('tdConfirm').textContent = ui.tdConfirm;
  $('pdTitle').textContent = ui.pdTitle;
  $('pdHint').textContent = ui.pdHint;
  $('pdCancel').textContent = ui.pdCancel;
  $('saveBtn').setAttribute('aria-label', ui.save);
  $('focusBtn').setAttribute('aria-label', ui.focus);
  $('printBtn').setAttribute('aria-label', ui.print);
  $('exportMenuBtn').setAttribute('aria-label', ui.export);
  $('translateBtn').setAttribute('aria-label', ui.translate);
  if (!state.storageOk) {
    $('storageBanner').hidden = false;
    $('storageBanner').textContent = ui.storageBlocked;
  }
  applyPhotoChrome();
}

function applyLayout() {
  const layout = normalizeLayout(state.layout);
  state.layout = layout;
  let printStyle = document.getElementById('printPageMargins');
  if (!printStyle) {
    printStyle = document.createElement('style');
    printStyle.id = 'printPageMargins';
    document.head.appendChild(printStyle);
  }
  printStyle.textContent = `@media print { @page { size: A4; margin: ${layout.pad}pt; } .paper { width: auto !important; padding: 0 !important; } }`;
  const vars = applyLayoutToStyle(layout);
  for (const paper of document.querySelectorAll('.paper')) {
    Object.entries(vars).forEach(([k, v]) => paper.style.setProperty(k, v));
    paper.dataset.family = layout.family;
    paper.dataset.lang = state.lang;
  }
  $('sizeInput').value = String(layout.size);
  $('leadInput').value = String(layout.lead);
  $('padInput').value = String(layout.pad);
  $('sizeOut').textContent = `${layout.size}pt`;
  $('leadOut').textContent = String(layout.lead);
  $('padOut').textContent = `${layout.pad}pt`;
  for (const id of ['presetClassic', 'presetCompact', 'presetModern']) {
    const btn = $(id);
    btn.setAttribute('aria-pressed', String(btn.dataset.preset === layout.preset));
  }
  for (const btn of $('accentRow').querySelectorAll('.swatch')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.color === layout.accent));
  }
}

let directSelection = null;
let directLineRanges = [];
let directDirty = false;

function refreshContentEditor() {
  if (state.editorMode !== 'visual') return;
  const doc = currentDoc();
  if (!doc || !$('visualEditor')) return;
  $('modulePicker').innerHTML = renderPicker(doc, { ...ed(), picker: state.lang === 'en' ? 'Sections' : '显示栏目' }, state.lang);
  $('visualEditor').innerHTML = applyPhotoToHtml(renderMarkdown(currentMd(), { editable: true, lang: state.lang }), currentPhotoView(), { placeholder: state.lang === 'en' ? 'Photo' : '二寸照片' });
  directLineRanges = directRanges(currentMd(), doc);
  directDirty = false;
  const mod = directLineRanges.find(m => m.moduleId === directSelection?.moduleId);
  const entry = mod?.entries.find(e => e.entryId === directSelection?.entryId);
  directSelection = entry ? { ...entry, line: entry.start } : mod ? { moduleId: mod.moduleId, entryId: null, line: mod.start } : (directLineRanges[0]?.entries[0] ? { ...directLineRanges[0].entries[0], line: directLineRanges[0].entries[0].start } : null) || (directLineRanges[0] ? { moduleId: directLineRanges[0].moduleId, entryId: null, line: directLineRanges[0].start } : null);
  applyLayout();
  updateDirectTools();
}

function updateDirectTools() {
  const en = state.lang === 'en';
  const doc = currentDoc();
  const visible = doc.modules.filter(m => m.enabled);
  const mod = visible.find(m => m.id === directSelection?.moduleId);
  const index = mod?.entries.findIndex(e => e.id === directSelection?.entryId) ?? -1;
  const mi = visible.indexOf(mod);
  $('directSelection').textContent = mod ? `${mod.title} · ${index >= 0 ? (en ? `Entry ${index + 1}` : `第 ${index + 1} 条`) : (en ? 'Section' : '整个栏目')}` : (visible.length ? (en ? 'Editing profile · click an entry for more actions' : '编辑基本信息 · 点击经历后可增删排序') : (en ? 'Choose a section to start' : '先勾选一个栏目'));
  const texts = { sectionOptionsLabel: en ? 'Sections' : '显示栏目', entryAdd: en ? 'Add entry' : '新增一段', entryCopy: en ? 'Duplicate' : '复制', entryUp: en ? 'Move up' : '上移', entryDown: en ? 'Move down' : '下移', entryDelete: en ? 'Delete entry' : '删除此段', moduleOrderLabel: en ? 'Section order' : '栏目顺序', moduleUp: en ? 'Move section up' : '栏目上移', moduleDown: en ? 'Move section down' : '栏目下移' };
  for (const [id, text] of Object.entries(texts)) $(id).textContent = text;
  $('entryAdd').disabled = !mod;
  for (const id of ['entryCopy', 'entryDelete']) $(id).disabled = index < 0;
  $('entryUp').disabled = index <= 0;
  $('entryDown').disabled = index < 0 || index === mod.entries.length - 1;
  $('moduleUp').disabled = mi <= 0;
  $('moduleDown').disabled = mi < 0 || mi === visible.length - 1;
  $('undoBtn').disabled = state.undo[state.lang].past.length === 0;
  $('redoBtn').disabled = state.undo[state.lang].future.length === 0;
  $('undoBtn').title = en ? 'Undo an entry or section action' : '撤销新增、删除或排序操作';
  $('redoBtn').title = en ? 'Redo an entry or section action' : '重做新增、删除或排序操作';
  $('visualEditor').querySelectorAll('.direct-selected').forEach(el => el.classList.remove('direct-selected'));
  const range = directLineRanges.find(m => m.moduleId === mod?.id)?.entries.find(e => e.entryId === directSelection?.entryId);
  for (const field of $('visualEditor').querySelectorAll('[data-line]')) {
    const line = Number(field.dataset.line);
    if (range && line >= range.start && line < range.end) (field.closest('tr, h3, li, p') || field).classList.add('direct-selected');
    else if (!range && mod && line === directSelection.line) field.classList.add('direct-selected');
  }
}

function syncDirectDocument() {
  if (!directDirty) return;
  const previous = currentDoc();
  const md = currentMd().replace(/^##[ \t]*$/gm, state.lang === 'en' ? '## Untitled' : '## 未命名栏目');
  state.docs[state.lang] = parseDocument(md, { lang: state.lang, hidden: hiddenMap(previous) });
  state.drafts[state.lang] = md;
  $('source').value = md;
  directLineRanges = directRanges(md, currentDoc());
  directSelection = targetAtLine(directLineRanges, directSelection?.line ?? -1);
  directDirty = false;
  updateDirectTools();
}

function saveDirectField(field) {
  if (!field) return;
  const md = applyFieldEdit(currentMd(), Number(field.dataset.line), Number(field.dataset.part), field.dataset.kind, markdownFromField(field));
  if (md === currentMd()) return;
  state.drafts[state.lang] = md;
  $('source').value = md;
  directDirty = true;
  renderPreview();
  renderChecks();
  markDirty();
}

function focusDirectSelection() {
  const range = directLineRanges.find(m => m.moduleId === directSelection?.moduleId)?.entries.find(e => e.entryId === directSelection?.entryId);
  if (!range) return;
  const fields = [...$('visualEditor').querySelectorAll('[data-line]')].filter(el => Number(el.dataset.line) >= range.start && Number(el.dataset.line) < range.end);
  const field = fields.find(el => el.textContent.trim()) || fields[0];
  if (!field) return;
  field.focus();
  const selection = window.getSelection();
  const r = document.createRange();r.selectNodeContents(field);selection.removeAllRanges();selection.addRange(r);
  field.scrollIntoView({ block: 'nearest' });
}

function currentPhotoView() {
  return resolvePhoto(state.photo, state.photoStore);
}

function photoOffsetLabel(offsetY) {
  const ui = t();
  const y = Number(offsetY) || 0;
  if (y < -0.05) return ui.photoUp;
  if (y > 0.05) return ui.photoDown;
  return ui.photoCenter;
}

function applyPhotoChrome() {
  const ui = t();
  const photo = currentPhotoView();
  $('photoOff').setAttribute('aria-pressed', String(!photo.enabled));
  $('photoOn').setAttribute('aria-pressed', String(photo.enabled));
  $('photoControls').hidden = !photo.enabled;
  $('photoRemove').hidden = !photo.data;
  $('photoOffsetRow').hidden = !photo.data;
  $('photoOffset').value = String(Math.round((Number(photo.offsetY) || 0) * 100));
  $('photoOffsetOut').textContent = photoOffsetLabel(photo.offsetY);
  $('photoChooseText').textContent = photo.data ? ui.photoReplace : ui.photoChoose;
  $('photoFile').setAttribute('aria-label', photo.data ? ui.photoReplace : ui.photoChoose);
  $('photoStatus').textContent = photo.enabled
    ? (photo.data ? ui.photoReady : ui.photoPending)
    : '';
}

function rememberPhotoData(dataUrl) {
  const id = photoIdForData(dataUrl);
  if (!id) return null;
  state.photoStore[id] = dataUrl;
  state.photo = { ...normalizePhoto(state.photo), id };
  state.photoStore = prunePhotoStore(state.photoStore, collectPhotoIds(state.photo, state.history));
  return id;
}

function renderPreview() {
  $('templateBadge').textContent = currentMd() === RESUME_DEFAULTS[state.lang]
    ? t().badge : (state.lang === 'zh' ? '本地草稿' : 'Local draft');
  const photo = currentPhotoView();
  $('resume').innerHTML = applyPhotoToHtml(
    renderMarkdown(currentMd(), { editable: false, lang: state.lang }),
    photo,
    { mode: 'screen', placeholder: t().photoPlaceholder },
  );
  $('resume').classList.toggle('has-photo', Boolean(photo.enabled && photo.data));
  $('resume').classList.toggle('has-photo-pending', Boolean(photo.enabled && !photo.data));
  applyLayout();
  applyPhotoChrome();
  requestAnimationFrame(fitPaper);
}

function fitPaper() {
  const stage = $('paperStage');
  const wrap = $('paperWrap');
  const paper = $('resume');
  if (!stage || !wrap || !paper || !wrap.offsetWidth) return;
  const available = Math.max(160, stage.clientWidth - 8);
  const scale = Math.min(1, available / wrap.offsetWidth);
  const scaleEl = $('paperScale');
  scaleEl.style.transform = 'none';
  wrap.style.transform = `scale(${scale})`;
  scaleEl.style.width = `${wrap.offsetWidth * scale}px`;
  scaleEl.style.height = `${wrap.offsetHeight * scale}px`;
  const over = paper.scrollHeight > paper.offsetWidth * (297 / 210) + 2;
  $('a4Guide').hidden = !over;
  $('pageWarn').hidden = !over;
  $('pageWarnLayout').hidden = !over;
}

function renderChecks() {
  const ui = t();
  const result = writingChecks(currentMd());
  $('checkSummary').textContent = result.issues.length ? ui.checkCounts(result.counts) : ui.checkNone;
  const labels = {
    placeholder: ui.placeholder,
    empty_bullet: ui.empty,
    thin_bullet: ui.thin,
    weak_bullet: ui.weak,
    missing_result: ui.result,
  };
  $('checkList').innerHTML = result.issues.slice(0, 24).map((issue) => {
    const fn = labels[issue.code] || ui.thin;
    return `<li>${escapeHtml(fn(issue.line))}</li>`;
  }).join('');
  $('starBox').innerHTML = `<p>${escapeHtml(ui.star)}</p><p>${escapeHtml(ui.noInvent)}</p>`;
}

function renderHistory() {
  const ui = t();
  const hasBackup = Boolean(state.englishBackup?.markdown);
  $('restoreEnBackup').hidden = !hasBackup;
  $('backupNote').hidden = !hasBackup;
  if (!state.history.length) {
    $('timeline').innerHTML = `<p class="hint">${escapeHtml(ui.noHistory)}</p>`;
    return;
  }
  $('timeline').innerHTML = state.history.map((entry, index) => {
    const when = formatTime(entry.at);
    const names = entry.sections.map((x) => (
      x === '__profile' ? ui.profile : (x === '__photo' ? ui.photoSection : x)
    ));
    const title = `${ui.updated} ${entry.lang === 'zh' ? '中文' : 'EN'}`;
    return `<article class="timeline-entry">
      <time datetime="${escapeHtml(entry.at)}">${escapeHtml(when)}</time>
      <p>${escapeHtml(title)} · ${escapeHtml(names.join(uiLang() === 'zh' ? '、' : ', ') || ui.profile)}</p>
      <button type="button" data-restore="${index}">${escapeHtml(ui.restore)}</button>
    </article>`;
  }).join('');
}

function formatTime(at) {
  return new Intl.DateTimeFormat(uiLang() === 'zh' ? 'zh-CN' : 'en-GB', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Shanghai',
  }).format(new Date(at));
}

function setLeftTab(tab) {
  state.leftTab = tab;
  for (const id of ['tabEdit', 'tabLayout', 'tabCheck', 'tabHistory']) {
    $(id).setAttribute('aria-selected', String(id === `tab${tab[0].toUpperCase()}${tab.slice(1)}`));
  }
  $('tabEdit').setAttribute('aria-selected', String(tab === 'edit'));
  $('tabLayout').setAttribute('aria-selected', String(tab === 'layout'));
  $('tabCheck').setAttribute('aria-selected', String(tab === 'check'));
  $('tabHistory').setAttribute('aria-selected', String(tab === 'history'));
  $('panelEdit').hidden = tab !== 'edit';
  $('panelLayout').hidden = tab !== 'layout';
  $('panelCheck').hidden = tab !== 'check';
  $('panelHistory').hidden = tab !== 'history';
  if (tab === 'check') renderChecks();
  if (tab === 'history') renderHistory();
  if (tab === 'edit') {
    commitActiveField();
    refreshContentEditor();
  }
}

function setEditorMode(mode) {
  if (mode === 'visual' && state.editorMode === 'markdown') flushSource();
  if (mode === 'markdown' && state.editorMode === 'visual') {
    commitActiveField();
    $('source').value = currentMd();
  }
  state.editorMode = mode;
  $('visualTab').setAttribute('aria-selected', String(mode === 'visual'));
  $('markdownTab').setAttribute('aria-selected', String(mode === 'markdown'));
  $('visualPanel').hidden = mode !== 'visual';
  $('markdownPanel').hidden = mode !== 'markdown';
  $('visualHint').hidden = mode !== 'visual';
  if (mode === 'visual') refreshContentEditor();
}

function switchLang(lang) {
  flushSource();
  state.lang = lang;
  directSelection = null;
  $('source').value = currentMd();
  applyLangChrome();
  refreshContentEditor();
  renderPreview();
  renderChecks();
  persist({ manual: false });
}

function flushSource() {
  if (state.editorMode === 'markdown') {
    const md = $('source').value;
    const prev = currentDoc();
    state.docs[state.lang] = parseDocument(md, {
      lang: state.lang,
      hidden: prev ? hiddenMap(prev) : {},
      order: prev ? prev.modules.map((m) => m.id) : null,
    });
    state.drafts[state.lang] = serializeVisible(state.docs[state.lang]);
    $('source').value = state.drafts[state.lang];
  } else {
    commitActiveField();
  }
}

function manualSave() {
  const ui = t();
  flushSource();
  const next = currentMd();
  const prevEntry = state.history[0];
  const same = prevEntry
    && prevEntry.drafts.zh === state.drafts.zh
    && prevEntry.drafts.en === state.drafts.en
    && JSON.stringify(prevEntry.layout) === JSON.stringify(state.layout)
    && photoMetaEqual(prevEntry.photo, state.photo)
    && JSON.stringify(prevEntry.modules) === JSON.stringify(modulesBag());
  if (same) {
    const saved = persist({ manual: true });
    toast(saved ? ui.noChange : ui.storageFail);
    return;
  }
  const before = prevEntry?.drafts?.[state.lang] || '';
  const sections = changedSections(before, next);
  if (!photoMetaEqual(prevEntry?.photo, state.photo) && !sections.includes('__photo')) {
    sections.push('__photo');
  }
  state.history.unshift({
    at: new Date().toISOString(),
    lang: state.lang,
    sections,
    drafts: { zh: state.drafts.zh, en: state.drafts.en },
    layout: { ...state.layout },
    photo: normalizePhoto(state.photo),
    modules: modulesBag(),
  });
  state.history = sanitizeHistory(state.history);
  state.photoStore = prunePhotoStore(state.photoStore, collectPhotoIds(state.photo, state.history));
  const saved = persist({ manual: true });
  renderHistory();
  toast(saved ? ui.savedManual : ui.storageFail);
}

function restoreHistory(index) {
  const entry = state.history[index];
  if (!entry) return;
  photoUploadRevision += 1;
  if (typeof entry.drafts.zh === 'string') state.drafts.zh = entry.drafts.zh;
  if (typeof entry.drafts.en === 'string') state.drafts.en = entry.drafts.en;
  if (entry.layout) state.layout = normalizeLayout(entry.layout);
  state.photo = entry.photo ? normalizePhoto(entry.photo) : { ...DEFAULT_PHOTO };
  const bag = sanitizeModulesBag(entry.modules);
  state.docs.zh = documentFromState(state.drafts.zh, 'zh', bag?.zh, { migrate: false });
  state.docs.en = documentFromState(state.drafts.en, 'en', bag?.en, { migrate: false });
  state.drafts.zh = serializeVisible(state.docs.zh);
  state.drafts.en = serializeVisible(state.docs.en);
  resetSessionIndexes();
  $('source').value = currentMd();
  applyLangChrome();
  applyLayout();
  refreshContentEditor();
  renderPreview();
  renderChecks();
  persist({ manual: false });
  toast(t().restored);
}

function downloadBlob(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportMarkdown() {
  flushSource();
  downloadBlob(currentMd(), `resume.${state.lang}.md`, 'text/markdown;charset=utf-8');
  toast(t().exported);
}

function exportHtml() {
  flushSource();
  const html = buildOfflineHtml({
    title: headingName(currentMd()) || 'Resume',
    lang: state.lang,
    bodyHtml: renderMarkdown(currentMd(), { editable: false, lang: state.lang }),
    layout: state.layout,
    photo: currentPhotoView(),
  });
  downloadBlob(html, `resume.${state.lang}.html`, 'text/html;charset=utf-8');
  toast(t().exported);
}

function exportJson() {
  flushSource();
  const payload = buildBackupPayload({
    drafts: state.drafts,
    layout: state.layout,
    theme: state.theme,
    lang: state.lang,
    photo: state.photo,
    photoStore: state.photoStore,
    modules: modulesBag(),
  });
  downloadBlob(JSON.stringify(payload, null, 2), 'resume-backup.json', 'application/json;charset=utf-8');
  toast(t().exported);
}

async function importMarkdownFile(file) {
  const text = await file.text();
  const parsed = parseMarkdownImport(text);
  if (!parsed.ok) {
    toast(t().importFail);
    return;
  }
  setCurrentMd(parsed.markdown, { renderVisual: true, clearHidden: true });
  toast(t().importedMd);
}

async function importJsonFile(file) {
  const text = await file.text();
  const parsed = parseBackupJson(text);
  if (!parsed.ok) {
    toast(t().importFail);
    return;
  }
  const { backup } = parsed;
  photoUploadRevision += 1;
  if (typeof backup.drafts.zh === 'string') state.drafts.zh = backup.drafts.zh;
  if (typeof backup.drafts.en === 'string') state.drafts.en = backup.drafts.en;
  if (backup.layout) state.layout = backup.layout;
  if (backup.theme) state.theme = backup.theme;
  if (backup.lang) state.lang = backup.lang;
  state.photo = normalizePhoto(backup.photo);
  if (backup.photoData) {
    const id = photoIdForData(backup.photoData);
    if (id) {
      state.photoStore[id] = backup.photoData;
      state.photo.id = id;
    }
  }
  state.photoStore = prunePhotoStore(state.photoStore, collectPhotoIds(state.photo, state.history));
  const bag = sanitizeModulesBag(backup.modules);
  for (const lang of ['zh', 'en']) {
    if (typeof backup.drafts[lang] !== 'string') continue;
    state.docs[lang] = documentFromState(state.drafts[lang], lang, bag?.[lang], { migrate: true });
  }
  state.drafts.zh = serializeVisible(state.docs.zh);
  state.drafts.en = serializeVisible(state.docs.en);
  resetSessionIndexes();
  $('source').value = currentMd();
  applyTheme();
  applyLangChrome();
  applyLayout();
  refreshContentEditor();
  renderPreview();
  renderChecks();
  persist({ manual: false });
  toast(t().importedJson);
}

function paintSwatches() {
  $('accentRow').innerHTML = ACCENT_SWATCHES.map((color) => (
    `<button type="button" class="swatch" data-color="${color}" style="background:${color}" aria-label="${color}" aria-pressed="false"></button>`
  )).join('');
}

function closeExportMenu() {
  $('exportMenu').hidden = true;
  $('exportMenuBtn').setAttribute('aria-expanded', 'false');
}

function combineSignals(signals) {
  const ctrl = new AbortController();
  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) {
      ctrl.abort(signal.reason);
      break;
    }
    signal.addEventListener('abort', () => ctrl.abort(signal.reason), { once: true });
  }
  return ctrl.signal;
}

async function translateChunk(text, signal) {
  if (utf8ByteLength(text) >= 500) throw createTranslateError('chunk_too_large');
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent('zh-CN|en')}`;
  let timer;
  const timeout = new AbortController();
  timer = setTimeout(() => timeout.abort('timeout'), 15000);
  try {
    const res = await fetch(url, { signal: combineSignals([signal, timeout.signal]) });
    if (!res.ok) throw createTranslateError('network');
    const data = await res.json();
    if (Number(data?.responseStatus) !== 200 || data?.quotaFinished === true) {
      throw createTranslateError('service_error');
    }
    const translated = data?.responseData?.translatedText;
    if (typeof translated !== 'string' || !translated) throw createTranslateError('empty');
    return translated;
  } catch (err) {
    if (signal?.aborted) throw createTranslateError('cancelled', err);
    if (err?.code) throw err;
    if (err?.name === 'AbortError' || timeout.signal.aborted) {
      throw createTranslateError(signal?.aborted ? 'cancelled' : 'timeout', err);
    }
    throw createTranslateError('network', err);
  } finally {
    clearTimeout(timer);
  }
}

function openTranslateDialog() {
  flushSource();
  const needsOverwrite = englishLooksEdited(state.drafts.en, RESUME_DEFAULTS.en);
  $('overwriteRow').hidden = !needsOverwrite;
  $('overwriteCheck').checked = false;
  $('tdConfirm').disabled = needsOverwrite;
  $('translateDialog').showModal();
}

async function runTranslation() {
  const ui = t();
  if (!navigator.onLine) {
    toast(ui.translateOffline);
    return;
  }
  const previousEn = state.drafts.en;
  const needsOverwrite = englishLooksEdited(previousEn, RESUME_DEFAULTS.en);
  translateAbort = new AbortController();
  $('pdStatus').textContent = ui.translating(0, 1);
  $('pdBar').max = 1;
  $('pdBar').value = 0;
  $('progressDialog').showModal();
  try {
    const result = await translateResume(state.drafts.zh, {
      translateChunk,
      signal: translateAbort.signal,
      onProgress(done, total) {
        const max = Math.max(total, 1);
        $('pdBar').max = max;
        $('pdBar').value = done;
        $('pdStatus').textContent = ui.translating(done, total);
      },
    });
    if (needsOverwrite) {
      state.englishBackup = { at: new Date().toISOString(), markdown: previousEn };
    }
    if (translateAbort.signal.aborted) throw createTranslateError('cancelled');
    const prevHidden = state.docs.en ? hiddenMap(state.docs.en) : {};
    state.docs.en = parseDocument(result.markdown, { lang: 'en', hidden: prevHidden });
    state.drafts.en = serializeVisible(state.docs.en);
    resetSessionIndexes('en');
    state.lang = 'en';
    $('source').value = state.drafts.en;
    applyLangChrome();
    refreshContentEditor();
    renderPreview();
    renderChecks();
    renderHistory();
    persist({ manual: false });
    if ($('progressDialog').open) $('progressDialog').close();
    toast(ui.translateOk);
  } catch (err) {
    if ($('progressDialog').open) $('progressDialog').close();
    const code = err?.code;
    if (code === 'cancelled') toast(ui.translateCancel);
    else if (!navigator.onLine) toast(ui.translateOffline);
    else toast(ui.translateFail);
  } finally {
    translateAbort = null;
  }
}

function commitActiveField() {
  const field = document.activeElement?.closest?.('#visualEditor [data-line]');
  if (field) saveDirectField(field);
  syncDirectDocument();
}

function runStructure(mutator, message) {
  commitActiveField();
  const lang = state.lang;
  pushUndo(state.undo[lang], directSnapshot());
  writeDoc(mutator(currentDoc()));
  if (message) toast(message);
}

function directSnapshot() {
  const snap = snapshotOf(currentDoc());
  const mod = currentDoc().modules.find(m => m.id === directSelection?.moduleId);
  snap.selection = mod ? { moduleId: mod.id, entryIndex: mod.entries.findIndex(e => e.id === directSelection?.entryId) } : null;
  return snap;
}

function applySnapshot(snap) {
  if (!snap) return;
  state.docs[state.lang] = documentFromState(snap.markdown, snap.lang || state.lang, snap.modules, { migrate: false });
  const mod = currentDoc().modules.find(m => m.id === snap.selection?.moduleId);
  directSelection = mod ? { moduleId: mod.id, entryId: mod.entries[snap.selection.entryIndex]?.id || null } : null;
  writeDoc(state.docs[state.lang]);
}

function undoStructure() {
  commitActiveField();
  const lang = state.lang;
  const current = directSnapshot();
  const prev = undoOnce(state.undo[lang], current);
  if (!prev) {
    toast(ed().nothingUndo);
    return;
  }
  applySnapshot(prev);
  toast(ed().undone);
}

function redoStructure() {
  commitActiveField();
  const lang = state.lang;
  const current = directSnapshot();
  const next = redoOnce(state.undo[lang], current);
  if (!next) {
    toast(ed().nothingRedo);
    return;
  }
  applySnapshot(next);
  toast(ed().redone);
}

function bindEditor() {
  $('source').addEventListener('input', () => {
    state.drafts[state.lang] = $('source').value;
    renderPreview();renderChecks();markDirty();
  });
  const editor = $('visualEditor');
  const selectField = (event) => {
    const field = event.target.closest('[data-line]');
    if (!field) return;
    directSelection = targetAtLine(directLineRanges, Number(field.dataset.line));
    updateDirectTools();
  };
  editor.addEventListener('click', selectField);
  editor.addEventListener('focusin', selectField);
  editor.addEventListener('input', (event) => saveDirectField(event.target.closest('[data-line]')));
  editor.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing) { event.preventDefault();event.target.blur(); }
  });
  editor.addEventListener('paste', (event) => {
    if (!event.target.closest('[data-line]')) return;
    event.preventDefault();
    document.execCommand('insertText', false, (event.clipboardData.getData('text/plain') || '').replace(/[\r\n]+/g, ' '));
  });
  editor.addEventListener('drop', event => event.preventDefault());
  $('visualPanel').addEventListener('pointerdown', (event) => {
    if (event.target.closest('button, summary, input')) commitActiveField();
  });
  $('modulePicker').addEventListener('change', (event) => {
    const box = event.target.closest('[data-action="toggle-module"]');
    if (!box) return;
    runStructure(doc => toggleModule(doc, box.dataset.module, box.checked), box.checked ? ed().shown(box.nextElementSibling.textContent) : ed().hidden(box.nextElementSibling.textContent));
  });
  $('visualPanel').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled) return;
    commitActiveField();
    const moduleId = directSelection?.moduleId;
    const entryId = directSelection?.entryId;
    const mod = currentDoc().modules.find(m => m.id === moduleId);
    if (!mod) return;
    const action = button.dataset.action;
    if (action === 'add-entry' || action === 'duplicate-entry') {
      runStructure(doc => {
        const next = action === 'add-entry' ? addEntry(doc, moduleId, entryId) : duplicateEntry(doc, moduleId, entryId);
        const previousIds = new Set(mod.entries.map(e => e.id));
        const entry = next.modules.find(m => m.id === moduleId).entries.find(e => !previousIds.has(e.id));
        directSelection = { moduleId, entryId: entry?.id };
        return next;
      }, action === 'add-entry' ? ed().added : ed().copied);
      focusDirectSelection();
    } else if (action === 'delete-entry') {
      const index = mod.entries.findIndex(e => e.id === entryId);
      if (index < 0) return;
      runStructure(doc => {
        const next = deleteEntry(doc, moduleId, entryId);
        const entries = next.modules.find(m => m.id === moduleId).entries;
        directSelection = { moduleId, entryId: entries[Math.min(index, entries.length - 1)]?.id || null };
        return next;
      }, ed().deleted);
    } else if (action === 'move-entry-up' || action === 'move-entry-down') {
      runStructure(doc => moveEntry(doc, moduleId, entryId, action.endsWith('up') ? -1 : 1), ed().moved);
    } else if (action === 'move-module-up' || action === 'move-module-down') {
      runStructure(doc => moveModule(doc, moduleId, action.endsWith('up') ? -1 : 1), ed().moved);
      button.closest('details').open = false;
    }
  });
  $('undoBtn').addEventListener('click', undoStructure);
  $('redoBtn').addEventListener('click', redoStructure);
}

function bindLayout() {
  for (const id of ['presetClassic', 'presetCompact', 'presetModern']) {
    $(id).addEventListener('click', () => {
      state.layout = { ...LAYOUT_PRESETS[$(id).dataset.preset] };
      applyLayout();
      renderPreview();
      markDirty();
    });
  }
  const syncSlider = () => {
    state.layout.size = Number($('sizeInput').value);
    state.layout.lead = Number($('leadInput').value);
    state.layout.pad = Number($('padInput').value);
    applyLayout();
    renderPreview();
    markDirty();
  };
  $('sizeInput').addEventListener('input', syncSlider);
  $('leadInput').addEventListener('input', syncSlider);
  $('padInput').addEventListener('input', syncSlider);
  $('accentRow').addEventListener('click', (event) => {
    const btn = event.target.closest('.swatch');
    if (!btn) return;
    state.layout.accent = btn.dataset.color;
    applyLayout();
    renderPreview();
    markDirty();
  });
  $('resetLayout').addEventListener('click', () => {
    const drafts = { zh: state.drafts.zh, en: state.drafts.en };
    const photo = { ...state.photo };
    const photoStore = state.photoStore;
    state.layout = { ...DEFAULT_LAYOUT };
    state.drafts = drafts;
    state.photo = photo;
    state.photoStore = photoStore;
    applyLayout();
    renderPreview();
    markDirty();
    toast(t().layoutReset);
  });
}

function photoErrorMessage(code) {
  const ui = t();
  if (code === 'too_large') return ui.photoTooBig;
  if (code === 'svg' || code === 'type' || code === 'external_url' || code === 'non_raster' || code === 'mime_mismatch') {
    return ui.photoBadType;
  }
  return ui.photoBadFile;
}

async function decodePhotoBitmap(blob) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {
      return createImageBitmap(blob);
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode'));
      el.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encodePhotoBitmap(bitmap) {
  const sw = bitmap.width;
  const sh = bitmap.height;
  if (!sw || !sh) return null;
  let scale = Math.max(PHOTO_PIXEL_WIDTH / sw, PHOTO_PIXEL_HEIGHT / sh);
  const maxSide = 1200;
  let outW = Math.max(1, Math.round(sw * scale));
  let outH = Math.max(1, Math.round(sh * scale));
  if (outW > maxSide || outH > maxSide) {
    scale *= maxSide / Math.max(outW, outH);
    outW = Math.max(1, Math.round(sw * scale));
    outH = Math.max(1, Math.round(sh * scale));
  }
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outW, outH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, outW, outH);
  for (const quality of [0.84, 0.72, 0.58, 0.44]) {
    let url = '';
    try {
      url = canvas.toDataURL('image/jpeg', quality);
    } catch {
      return null;
    }
    if (inspectPhotoDataUrl(url).ok) return url;
  }
  return null;
}

async function rasterizePhotoFile(file) {
  const meta = acceptPhotoFileMeta({ type: file.type, name: file.name, size: file.size });
  if (!meta.ok) return meta;
  let buffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    return { ok: false, code: 'corrupt' };
  }
  const magic = sniffImageMagic(new Uint8Array(buffer));
  if (!magic.ok) return magic;
  let bitmap;
  try {
    bitmap = await decodePhotoBitmap(new Blob([buffer], { type: magic.mime }));
  } catch {
    return { ok: false, code: 'corrupt' };
  }
  try {
    const data = encodePhotoBitmap(bitmap);
    if (!data) return { ok: false, code: 'too_large' };
    return { ok: true, data };
  } finally {
    bitmap.close?.();
  }
}

function bindPhoto() {
  const setEnabled = (enabled) => {
    photoUploadRevision += 1;
    state.photo = { ...normalizePhoto(state.photo), enabled };
    applyPhotoChrome();
    renderPreview();
    markDirty();
  };
  $('photoOff').addEventListener('click', () => setEnabled(false));
  $('photoOn').addEventListener('click', () => setEnabled(true));
  $('photoFile').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const revision = ++photoUploadRevision;
    const previous = { ...state.photo };
    const previousStore = { ...state.photoStore };
    const result = await rasterizePhotoFile(file);
    if (revision !== photoUploadRevision) return;
    if (!result.ok) {
      state.photo = previous;
      state.photoStore = previousStore;
      toast(photoErrorMessage(result.code));
      applyPhotoChrome();
      renderPreview();
      return;
    }
    state.photo.enabled = true;
    if (!rememberPhotoData(result.data)) {
      state.photo = previous;
      state.photoStore = previousStore;
      toast(photoErrorMessage('corrupt'));
      applyPhotoChrome();
      renderPreview();
      return;
    }
    applyPhotoChrome();
    renderPreview();
    markDirty();
    toast(t().photoOk);
  });
  $('photoRemove').addEventListener('click', () => {
    photoUploadRevision += 1;
    state.photo = { ...normalizePhoto(state.photo), id: null };
    state.photoStore = prunePhotoStore(state.photoStore, collectPhotoIds(state.photo, state.history));
    applyPhotoChrome();
    renderPreview();
    markDirty();
    toast(t().photoCleared);
  });
  $('photoOffset').addEventListener('input', () => {
    photoUploadRevision += 1;
    state.photo = {
      ...normalizePhoto(state.photo),
      offsetY: Number($('photoOffset').value) / 100,
    };
    applyPhotoChrome();
    renderPreview();
    markDirty();
  });
}

function bindChrome() {
  $('langZh').addEventListener('click', () => switchLang('zh'));
  $('langEn').addEventListener('click', () => switchLang('en'));
  $('themeLight').addEventListener('click', () => { state.theme = 'light'; applyTheme(); persist({ manual: false }); });
  $('themeDark').addEventListener('click', () => { state.theme = 'dark'; applyTheme(); persist({ manual: false }); });
  $('saveBtn').addEventListener('click', manualSave);
  $('printBtn').addEventListener('click', () => {
    flushSource();
    window.print();
  });
  $('focusBtn').addEventListener('click', () => {
    document.body.classList.toggle('focus-mode');
    const on = document.body.classList.contains('focus-mode');
    $('focusBtn').setAttribute('aria-pressed', String(on));
    applyLangChrome();
    requestAnimationFrame(fitPaper);
  });
  $('visualTab').addEventListener('click', () => setEditorMode('visual'));
  $('markdownTab').addEventListener('click', () => setEditorMode('markdown'));
  $('tabEdit').addEventListener('click', () => setLeftTab('edit'));
  $('tabLayout').addEventListener('click', () => setLeftTab('layout'));
  $('tabCheck').addEventListener('click', () => setLeftTab('check'));
  $('tabHistory').addEventListener('click', () => setLeftTab('history'));
  $('mobileEdit').addEventListener('click', () => {
    document.body.classList.remove('mobile-preview');
    document.body.classList.add('mobile-edit');
    $('mobileEdit').setAttribute('aria-selected', 'true');
    $('mobilePreview').setAttribute('aria-selected', 'false');
  });
  $('mobilePreview').addEventListener('click', () => {
    document.body.classList.remove('mobile-edit');
    document.body.classList.add('mobile-preview');
    $('mobileEdit').setAttribute('aria-selected', 'false');
    $('mobilePreview').setAttribute('aria-selected', 'true');
    requestAnimationFrame(fitPaper);
  });
  document.body.classList.add('mobile-edit');
  $('exportMenuBtn').addEventListener('click', () => {
    const open = $('exportMenu').hidden;
    $('exportMenu').hidden = !open;
    $('exportMenuBtn').setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('#exportWrap')) closeExportMenu();
  });
  $('exportMd').addEventListener('click', () => { closeExportMenu(); exportMarkdown(); });
  $('exportHtml').addEventListener('click', () => { closeExportMenu(); exportHtml(); });
  $('exportJson').addEventListener('click', () => { closeExportMenu(); exportJson(); });
  $('importMd').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    closeExportMenu();
    if (file) await importMarkdownFile(file);
    event.target.value = '';
  });
  $('importJson').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    closeExportMenu();
    if (file) await importJsonFile(file);
    event.target.value = '';
  });
  $('timeline').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-restore]');
    if (!btn) return;
    restoreHistory(Number(btn.dataset.restore));
  });
  $('restoreEnBackup').addEventListener('click', () => {
    if (!state.englishBackup?.markdown) return;
    state.docs.en = documentFromState(state.englishBackup.markdown, 'en', null, { migrate: false });
    state.drafts.en = serializeVisible(state.docs.en);
    resetSessionIndexes('en');
    if (state.lang === 'en') {
      $('source').value = state.drafts.en;
      refreshContentEditor();
      renderPreview();
    }
    persist({ manual: false });
    toast(t().restored);
  });
  $('translateBtn').addEventListener('click', openTranslateDialog);
  $('overwriteCheck').addEventListener('change', () => {
    const needs = !$('overwriteRow').hidden;
    $('tdConfirm').disabled = needs && !$('overwriteCheck').checked;
  });
  $('tdCancel').addEventListener('click', () => $('translateDialog').close());
  $('translateForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const needs = !$('overwriteRow').hidden;
    if (needs && !$('overwriteCheck').checked) {
      toast(t().needOverwrite);
      return;
    }
    $('translateDialog').close();
    runTranslation();
  });
  $('pdCancel').addEventListener('click', () => {
    translateAbort?.abort('cancelled');
  });
  $('progressDialog').addEventListener('cancel', (event) => {
    event.preventDefault();
    translateAbort?.abort('cancelled');
  });
  $('progressDialog').addEventListener('cancel', () => {
    translateAbort?.abort('cancelled');
  });
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      manualSave();
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      if (isEditorField(event.target)) return;
      event.preventDefault();
      if (event.shiftKey) redoStructure();
      else undoStructure();
    }
    if (event.key === 'Escape') closeExportMenu();
  });
  window.addEventListener('resize', fitPaper);
  window.addEventListener('beforeprint', () => {
    const scaleEl = $('paperScale');
    scaleEl.style.transform = 'none';
    scaleEl.style.width = 'auto';
    scaleEl.style.height = 'auto';
  });
  window.addEventListener('afterprint', fitPaper);
}

function init() {
  paintSwatches();
  loadState();
  bootDocuments();
  applyTheme();
  $('source').value = currentMd();
  applyLangChrome();
  applyLayout();
  refreshContentEditor();
  renderPreview();
  renderChecks();
  renderHistory();
  bindEditor();
  bindLayout();
  bindPhoto();
  bindChrome();
  setEditorMode('visual');
  setLeftTab('edit');
  if (state.storageOk) setSaveStatus('saved', t().saved);
}

init();
