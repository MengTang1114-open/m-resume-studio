#!/usr/bin/env python3
"""Behavior checks for private workspace creation and static packaging."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile


def main():
    root = Path(__file__).resolve().parents[1]
    command = [sys.executable, str(root / 'scripts/create_workspace.py')]
    original = hashlib.sha256((root / 'web/content.js').read_bytes()).hexdigest()
    with tempfile.TemporaryDirectory(prefix='resume-workspace-check-') as directory:
        base = Path(directory)
        zh = '# [测试姓名]\n电话：13800000000\n\n## 教育背景\n'
        en = '# [TEST NAME]\nEmail: example@example.invalid\n'
        for lang, text in [('zh', zh), ('en', en)]:
            (base / f'{lang}.md').write_text(text, encoding='utf-8')
        target = base / 'personal-editor'
        subprocess.run(command + [str(target), '--zh', str(base / 'zh.md'), '--en', str(base / 'en.md')], check=True, capture_output=True)
        assert (target / 'index.html').is_file()
        assert not (target / 'tests').exists()
        content = (target / 'content.js').read_text(encoding='utf-8')
        assert json.dumps(zh, ensure_ascii=True) in content
        assert json.dumps(en, ensure_ascii=True) in content
        assert (target / 'resume.zh.md').read_text(encoding='utf-8') == zh
        before = (target / 'content.js').read_bytes()
        assert subprocess.run(command + [str(target)], capture_output=True).returncode != 0
        assert (target / 'content.js').read_bytes() == before
        forbidden = root / 'workspaces/should-not-write'
        assert subprocess.run(command + [str(forbidden)], capture_output=True).returncode != 0
        assert not forbidden.exists()
        assert subprocess.run(command + [str(base / 'missing-input'), '--zh', str(base / 'absent.md')], capture_output=True).returncode != 0
        assert not (base / 'missing-input').exists()
    assert hashlib.sha256((root / 'web/content.js').read_bytes()).hexdigest() == original
    subprocess.run([sys.executable, str(root / 'scripts/package_site.py')], check=True, capture_output=True)
    with zipfile.ZipFile(root / 'build/resume-studio.zip') as archive:
        assert len(archive.namelist()) == 9
        assert 'index.html' in archive.namelist()
        assert not any('/' in name for name in archive.namelist())
        for name in archive.namelist():
            assert archive.read(name) == (root / 'web' / name).read_bytes()
    print('PASS: workspace creation, imported defaults, no overwrite, private-directory guard, missing-input handling, unchanged shared template, exact 9-file static package')


if __name__ == '__main__':
    main()
