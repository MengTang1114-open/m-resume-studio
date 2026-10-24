#!/usr/bin/env python3
"""Create a private, standalone editor copy without changing the installed Skill."""
import argparse
import json
from pathlib import Path
import shutil


def main():
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path, help='New directory outside this repository')
    parser.add_argument('--zh', type=Path, help='Optional Chinese Markdown')
    parser.add_argument('--en', type=Path, help='Optional English Markdown')
    args = parser.parse_args()
    destination = args.directory.expanduser().resolve()
    if destination.is_relative_to(root):
        parser.error('Use a private directory outside the Skill/repository.')
    if destination.exists():
        parser.error('Destination already exists; choose a new directory.')
    drafts = {}
    for lang in ('zh', 'en'):
        source = getattr(args, lang)
        if source:
            if not source.is_file():
                parser.error(f'{lang}: Markdown file does not exist.')
            drafts[lang] = source.read_text(encoding='utf-8-sig')
            if not drafts[lang].strip():
                parser.error(f'{lang}: Markdown file is empty.')
    shutil.copytree(root / 'web', destination, ignore=shutil.ignore_patterns('tests', '__pycache__'))
    if drafts:
        with (destination / 'content.js').open('a', encoding='utf-8') as output:
            output.write('\n// Personal defaults for this private workspace only.\n')
            for lang, markdown in drafts.items():
                output.write(f'RESUME_DEFAULTS.{lang} = {json.dumps(markdown, ensure_ascii=True)};\n')
                (destination / f'resume.{lang}.md').write_text(markdown, encoding='utf-8')
    print(f'Created private editor: {destination}')
    print('Serve this directory with Python HTTP server; import Markdown if this browser already has a draft.')


if __name__ == '__main__':
    main()
