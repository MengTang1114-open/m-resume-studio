#!/usr/bin/env python3
"""Check public file scope, high-confidence secret patterns, links and JS syntax."""
from pathlib import Path
import re
import subprocess

ROOT_FILES = {'README.md', 'SKILL.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'AGENTS.md', '.gitignore', 'package.json'}
RUNTIME = {'index.html', 'style.css', 'app.js', 'core.js', 'content.js', 'editor.js', 'modules.js', 'direct.js', 'package.json'}
IGNORED = {'.git', 'build', '__pycache__', 'node_modules'}
DENIED = {'.env', '.openai', '.wrangler', 'evidence', 'private', 'workspaces', '.DS_Store'}
SECRET_PATTERNS = [
    re.compile(r'gh[pousr]_[A-Za-z0-9]{30,}'),
    re.compile(r'github_pat_[A-Za-z0-9_]{40,}'),
    re.compile(r'AKIA[0-9A-Z]{16}'),
    re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
]


def main():
    root = Path(__file__).resolve().parents[1]
    errors = []
    files = []
    for path in root.rglob('*'):
        relative = path.relative_to(root)
        if any(part in IGNORED for part in relative.parts):
            continue
        if any(part in DENIED or part.startswith('.env.') for part in relative.parts):
            errors.append(f'Private/host-specific path: {relative}')
            continue
        if path.is_symlink():
            errors.append(f'Public symlink: {relative}')
            continue
        if not path.is_file():
            continue
        files.append(path)
        if len(relative.parts) == 1 and path.name not in ROOT_FILES:
            errors.append(f'Unexpected root file: {relative}')
        if relative.parts[0] == 'web' and len(relative.parts) == 2 and path.name not in RUNTIME:
            errors.append(f'Unexpected runtime file: {relative}')
        if path.suffix not in {'.md', '.js', '.json', '.py', '.css', '.html', '.yml', ''} and path.name != '.gitignore':
            errors.append(f'Unexpected public asset: {relative}')
            continue
        text = path.read_text(encoding='utf-8')
        if any(pattern.search(text) for pattern in SECRET_PATTERNS):
            errors.append(f'Possible credential: {relative}')
        if re.search(r'/(?:Users|home)/[A-Za-z0-9_.-]+/', text):
            errors.append(f'Nonportable personal path: {relative}')
        if path.suffix == '.md':
            for link in re.findall(r'\]\(([^)]+)\)', text):
                if '://' in link or link.startswith(('#', 'mailto:')):
                    continue
                target = link.split('#', 1)[0]
                if target and not (path.parent / target).is_file():
                    errors.append(f'Broken local link in {relative}: {target}')
    skill = (root / 'SKILL.md').read_text(encoding='utf-8')
    if not skill.startswith('---\nname: m-resume-studio\n') or '\ndescription: ' not in skill:
        errors.append('Skill metadata is missing or has the wrong name.')
    for path in sorted((root / 'web').glob('*.js')):
        if subprocess.run(['node', '--check', str(path)], capture_output=True).returncode:
            errors.append(f'JavaScript syntax failed: {path.name}')
    if errors:
        raise SystemExit('\n'.join(errors))
    print(f'PASS: {len(files)} public source files; scope, secret patterns, links and JS syntax')


if __name__ == '__main__':
    main()
