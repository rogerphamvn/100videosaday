"""Check the local design package; does not validate app runtime or providers."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib
import json
import struct

ROOT = Path(__file__).resolve().parents[1]

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ('href', 'src') and value and not value.startswith(('http:', 'https:', '#')):
                self.paths.append(value)

parser = Links()
parser.feed((ROOT / 'REVIEW.html').read_text(encoding='utf-8-sig'))
missing = sorted({p for p in parser.paths if not (ROOT / p).is_file()})
json_files = sorted(p for d in ['contracts', 'examples', 'mockups'] for p in (ROOT / d).rglob('*.json'))
for path in json_files:
    json.loads(path.read_text(encoding='utf-8-sig'))
images = []
for name in ['01-product-insight.png', '02-creative-lab.png', '03-winners-remix.png']:
    path = ROOT / 'mockups' / name
    data = path.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', f'Not PNG: {name}'
    width, height = struct.unpack('>II', data[16:24])
    assert width > height and width >= 1200, f'Unexpected concept size: {name}'
    images.append({'file': str(path.relative_to(ROOT)), 'width': width, 'height': height, 'sha256': hashlib.sha256(data).hexdigest()})
report = {'scope': 'design package paths, JSON syntax and PNG headers only; not runtime/browser/provider validation', 'local_html_links': len(parser.paths), 'missing_links': missing, 'parsed_json_files': len(json_files), 'images': images, 'passed': not missing}
(ROOT / 'evidence' / 'package-verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
raise SystemExit(0 if report['passed'] else 1)
