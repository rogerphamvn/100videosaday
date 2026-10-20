"""Portable checks, separate from immutable historical review receipts."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote
import json
import runpy
import struct
import jsonschema

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.verify-out'
OUT.mkdir(exist_ok=True)

class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []
    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in ('href', 'src') and value and not value.startswith(('http:', 'https:', 'data:', '#', 'mailto:')):
                self.paths.append(unquote(value.split('#', 1)[0].split('?', 1)[0]))

def main():
    schemas = sorted((ROOT / 'contracts').glob('*.schema.json'))
    for path in schemas:
        jsonschema.Draft202012Validator.check_schema(json.loads(path.read_text(encoding='utf-8-sig')))
    contract = runpy.run_path(str(ROOT / 'scripts' / 'validate-contracts.py'))
    contract['main'].__globals__['REPORT'] = OUT / 'contracts-verification.json'
    if contract['main']() != 0:
        return 1
    report = json.loads((OUT / 'contracts-verification.json').read_text(encoding='utf-8'))
    assert report['validator']['engine'] == 'python-jsonschema', 'Independent validator inactive'
    checked = 0
    routes = {'/': 'index.html', '/account': 'account.html', '/login': 'login.html', '/review': 'review.html'}
    for path in [ROOT / 'REVIEW-v3.html', *[ROOT / 'prototype-v2' / name for name in ['index.html', 'responsive-review.html', 'login.html', 'account.html', 'review.html']]]:
        refs = References()
        refs.feed(path.read_text(encoding='utf-8-sig'))
        for ref in refs.paths:
            target = (ROOT / 'prototype-v2' / routes.get(ref, ref.lstrip('/'))) if ref.startswith('/') else path.parent / ref
            if ref.startswith('/mockups/'):
                target = ROOT / 'mockups/v2' / ref.split('/')[-1]
            assert target.is_file(), f'Missing local reference: {path.relative_to(ROOT)} -> {ref}'
            checked += 1
    images = sorted((ROOT / 'mockups/v2').glob('*.png'))
    assert len(images) == 4, f'Expected four current concepts, got {len(images)}'
    for path in images:
        data = path.read_bytes()
        assert data[:8] == b'\x89PNG\r\n\x1a\n', path.name
        width, height = struct.unpack('>II', data[16:24])
        assert width >= 1200 and width > height, f'Unexpected dimensions: {path.name}'
    print(f'RELEASE PASS: {len(schemas)} meta-schemas; {report["summary"]["passed"]} fixtures; {checked} HTML references; {len(images)} current concepts')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
