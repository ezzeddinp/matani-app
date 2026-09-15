import csv
import hashlib
import json
import re
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

root = Path(__file__).resolve().parents[2]
out = root / 'docs/manuscripts'
paper = (out / 'phase6-paper.md').read_text()
body, bibliography = paper.split('## References\n', 1)
refs = json.loads((out / 'phase7-reference-audit.json').read_text())
assert len(refs) == 36
assert [r['number'] for r in refs] == list(range(1, 37))
assert [int(n) for n in re.findall(r'^\[(\d+)\]', bibliography, re.M)] == list(range(1, 37))
assert list(dict.fromkeys(map(int, re.findall(r'\[(\d+)\]', body)))) == list(range(1, 37))
registry = (root / '.agent/evidence-register.md').read_text()
for ref in refs:
    assert ref['evidence'] in registry and ref['claim'] and ref['section']
    assert ref['url'].startswith('https://') and ref['checked']
assert len(re.findall(r'^\| \d+ \|', (out / 'phase7-reference-audit.md').read_text(), re.M)) == 38
with ZipFile(out / 'phase7-paper.docx') as archive:
    document = ET.fromstring(archive.read('word/document.xml'))
    ns = {'w': 'http://purl.oclc.org/ooxml/wordprocessingml/main'}
    text = '\n'.join(n.text or '' for n in document.findall('.//w:t', ns))
    paragraphs = [''.join(n.text or '' for n in p.findall('.//w:t', ns)) for p in document.findall('.//w:p', ns)]
    start = next(i for i, p in enumerate(paragraphs) if p.startswith('Abstract'))
    end = next(i for i, p in enumerate(paragraphs) if p.strip().lower() == 'references')
    word_count = len(' '.join(paragraphs[start:end]).split())
    assert 6000 <= word_count <= 7000, word_count
    assert not re.search(r'OBS-\d|EVID-\d|DEC-\d|HYP-\d|\[@|line 1:|Paper Title\*', text)
    assert len(document.findall('.//w:tbl', ns)) == 7
    assert len(document.findall('.//w:drawing', ns)) == 1
    assert all(f'({i})' in text for i in range(1, 5))
    assert 'Normalized Difference Moisture Index' in text
    assert len(document.findall('.//w:sectPr', ns)) == 3
results = json.loads((root / 'research/private/replacement-study/phase4-20260915-analysis-01/results.json').read_text())
snapshot = root / 'research/private/replacement-study/phase3-20260915-frozen-02/snapshot.json'
assert hashlib.sha256(snapshot.read_bytes()).hexdigest() == results['snapshot_sha256']
assert results['accounting']['calendar_days'] == 365
assert results['accounting']['catalogue_days'] == 71
assert results['accounting']['no_acquisition_days'] == 294
assert results['accounting']['unresolved_days'] == 0
for geometry in results['results'].values():
    for policy in geometry['policies'].values():
        for metric in policy.values():
            assert metric['known_days'] == 23
            assert round(metric['lower_percent'], 2) == 6.30
            assert metric['lower_percent'] == metric['upper_percent']
            assert metric['longest_gap_days'] == 65
            assert metric['leading_absent_days'] == 75
            assert metric['trailing_absent_days'] == 4
rows = list(csv.DictReader((root / 'research/private/replacement-study/phase4-20260915-analysis-01/daily-pixels.csv').open()))
sets = [{r['day'] for r in rows if r['geometry'] == g and r['index'] == i and r['passes'] == 'True'} for g in ['original', 'buffered'] for i in ['ndvi', 'ndmi']]
assert all(dates == sets[0] and len(dates) == 23 for dates in sets)
manifest_path = out / 'phase7-manifest.json'
if manifest_path.exists():
    manifest = json.loads(manifest_path.read_text())
    for name, digest in manifest['files_sha256'].items():
        assert hashlib.sha256((root / name).read_bytes()).hexdigest() == digest, name
print(json.dumps({'status': 'passed', 'words_excluding_references': word_count, 'references': 36, 'previous_references_screened': 38, 'tables': 7, 'figures': 1, 'snapshot_sha256': results['snapshot_sha256']}))
