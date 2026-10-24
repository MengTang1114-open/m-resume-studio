#!/usr/bin/env python3
"""Package only the known public runtime files for static hosting."""
from pathlib import Path
import shutil
import zipfile

FILES = ('index.html', 'style.css', 'app.js', 'core.js', 'content.js', 'editor.js', 'modules.js', 'direct.js', 'package.json')


def main():
    root = Path(__file__).resolve().parents[1]
    build = root / 'build'
    directory = build / 'site'
    if build.is_symlink() or directory.is_symlink():
        raise SystemExit('Refusing a symlinked build output.')
    if directory.exists() and any(p.name not in FILES or not p.is_file() or p.is_symlink() for p in directory.iterdir()):
        raise SystemExit('Unexpected files in build/site; inspect them before packaging.')
    directory.mkdir(parents=True, exist_ok=True)
    archive = build / 'resume-studio.zip'
    if archive.is_symlink():
        raise SystemExit('Refusing a symlinked archive.')
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as output:
        for name in FILES:
            source = root / 'web' / name
            if source.is_symlink():
                raise SystemExit(f'Refusing symlinked runtime file: {name}')
            shutil.copyfile(source, directory / name)
            output.write(source, name)
    print(f'Packaged {len(FILES)} runtime files: {archive}')
    print(f'Wrangler upload directory: {directory}')


if __name__ == '__main__':
    main()
