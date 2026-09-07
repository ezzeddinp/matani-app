"""Create a dated thesis candidate after comparison with the latest user PDF.

Uses the editable layout source; preserves the latest PDF's RQ3 number notation
and bibliography access dates. Source traceability: DEC-34, OBS-32, dated audit.
No provider calls; no original artifact is overwritten.
"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.dom import minidom
from io import BytesIO
import argparse
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '.agent/thesis-aligned-2026-08-31.docx'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', default='.agent/thesis-aligned-2026-09-07.docx')
args = parser.parse_args()
OUTPUT = (ROOT / args.output).resolve()
if not OUTPUT.is_relative_to(ROOT) or OUTPUT == SOURCE:
    raise ValueError('Output must remain inside the workspace and preserve the source')
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

deployment = ('One explicitly approved manual worker execution on 31 August 2026 '
              'completed real-provider processing and persisted a provenance-complete '
              'hosted observation. Later authenticated device requests were accepted '
              'but deferred processing failed before persistence. Successful completion '
              'and owner readback through the deployed device flow remain unverified.')
verification = ('On 7 September 2026, local lint, application and backend type checks, '
                '18 application and security-audit tests, 44 backend tests, and three '
                'Python research tests passed. The research tests used an existing '
                'Python runtime through the supported executable override. Database '
                'migration and 26-assertion evidence remains dated 30 August; database '
                'checks were not rerun in this audit. Exact-revision remote CI, platform '
                'credential controls, user acceptance testing, and field validation '
                'remain unverified.')

def text(p):
    return ''.join(n.firstChild.data if n.firstChild else '' for n in p.getElementsByTagNameNS(W, 't'))

def set_text(p, value):
    nodes = p.getElementsByTagNameNS(W, 't')
    if not nodes:
        raise ValueError('Cannot replace an empty paragraph')
    for n in nodes:
        while n.firstChild:
            n.removeChild(n.firstChild)
    nodes[0].appendChild(p.ownerDocument.createTextNode(value))

if SOURCE.exists():
    source_bytes = SOURCE.read_bytes()
else:
    # The earlier DOCX files were removed from the worktree during the interrupted
    # session. Read the exact audited Git source without undoing those deletions.
    source_bytes = subprocess.run(
        ['git', 'show', '6536667256bb9e168f16d4c709fd0372d7d78c8f:.agent/thesis-aligned-2026-08-31.docx'],
        cwd=ROOT, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    ).stdout
figure_bytes = (ROOT / 'docs/diagrams/matani-audited-system-boundary-2026-09-07.png').read_bytes()
with ZipFile(BytesIO(source_bytes)) as source:
    document = minidom.parseString(source.read('word/document.xml'))
    paragraphs = list(document.getElementsByTagNameNS(W, 'p'))
    edits = []
    for p in paragraphs:
        old = text(p)
        new = old
        if old.startswith('Abstract'):
            cut = old.index('The public backend health')
            new = old[:cut] + deployment + ' User acceptance testing and field validation remain open.'
        elif old.startswith('Evaluation separates software behavior'):
            new = 'Evaluation separates software behavior from measurement validity; successful tests do not establish agronomic accuracy. ' + verification
        elif old.startswith('The locally verified repository state separates'):
            new = 'Software assurance is reported separately from measurement evidence. ' + verification + ' ' + deployment
        elif old.startswith('The application and worker are implemented and verified locally'):
            new = deployment + ' A newly created field may remain empty after a failed job. Only provenance-complete rows from the controlled completion path are measured; research outputs and legacy rows are not promoted.'
        elif old.startswith('The Express backend exposes protected weather'):
            new = ('The Express backend exposes protected weather, legacy satellite, optional AI, and measurement routes. '
                   'The measurement route validates authentication, field ownership, and request bounds; it returns HTTP 202 '
                   'after durable enqueue and defers processing within the same Vercel invocation. Screens poll stored '
                   'job and observation state. Acceptance of a job does not prove successful provider processing. ' + deployment)
        elif old.startswith('Supabase stores identity, exact field polygons'):
            new = ('Supabase stores identity, field polygons, notes, durable jobs, typed measurements, per-index statistics, '
                   'and an owner-scoped observation view. Hosted schema and server credentials were exercised by the '
                   'single approved manual job. Current migration parity and hosted cross-user isolation still require '
                   'a fresh audit. CDSE measurement processing and Open-Meteo weather remain separate; optional Gemini '
                   'summaries are excluded from measurement validity.')
        elif old.startswith('Fig. 2. Approved research evidence'):
            new = 'Fig. 2. Approved research evidence, implemented measurement path, scoped hosted success, and remaining device-delivery gates; alignment audited 7 September 2026.'
        elif old == 'C. Locally Implemented Measurement Path':
            new = 'C. Implemented Measurement Path and Scoped Hosted Evidence'
        elif old.startswith('The repository implements a durable exact-polygon'):
            new = old + ' Separately, the approved manual hosted run persisted an observation acquired on 28 August 2026: NDVI mean 0.734192 from 38 valid pixels and NDMI mean 0.385080 from nine valid pixels. This is one operational observation, not additional evidence for the Teluknaga study or an accuracy assessment. Later deferred device jobs failed.'
        elif old.startswith('The approved field is 0.157 ha.'):
            new = old.replace('Thirty-two acquisitions', '32 (Thirty-two) acquisitions').replace('at least nine valid', 'at least 9 (nine) valid').replace('at least three valid', 'at least 3 (three) valid')
        elif old.startswith('Matani now has a padi-only mobile DSS implementation'):
            cut = old.index('The exact-polygon measurement worker')
            new = old[:cut] + deployment + ' Field validation, user acceptance testing, platform controls, and final thesis-team/advisor approval remain necessary.'
        elif old.startswith('Both product and thesis scope are restricted'):
            cut = old.index('The stable public backend alias')
            new = old[:cut] + deployment + ' Ground truth, user acceptance testing, and production notifications remain open.'
        elif old.startswith('5) Measurement Limitations:'):
            cut = old.index('The exact-polygon measurement path')
            new = old[:cut] + 'The scoped hosted observation does not establish reliable device delivery, field-level validity, or user acceptance.'
        else:
            new = new.replace('This behavior is locally verified, while hosted persistence and authenticated device delivery remain unverified.', 'This behavior is locally verified; one manual hosted completion is recorded, while repeatable authenticated device delivery remains unverified.')
            new = new.replace('Hosted database application, server-only worker configuration, and authenticated device persistence still require verification.', deployment)
            new = new.replace('The measurement path is implemented locally, while hosted measured history remains unverified.', 'The implemented measurement path has one manually completed hosted observation; subsequent deferred device jobs failed, so repeatable delivery is unverified.')
            new = new.replace('The measured-history interface is implemented locally, while populated hosted history is not yet verified.', 'The measured-history interface is implemented; one hosted row is recorded, while successful device readback remains unverified.')
            new = new.replace('Implemented and verified locally; populated hosted history remains unverified', 'One manual hosted row; device flow open')
            new = new.replace('measurement path verified locally, hosted history unverified', 'local path verified; one manual hosted row; device delivery unverified')
            new = new.replace('The exact-polygon measurement path is implemented and verified locally; its hosted database, worker configuration, and authenticated device delivery remain deployment gates.', 'The exact-polygon path is implemented locally and has one recorded manual hosted completion. Successful delivery through the deferred device flow remains an open gate.')
        # Preserve bibliography dates in the developer-confirmed latest PDF.
        if re.match(r'^\[(?:29|3[0-8])\]', new):
            new = new.replace('Aug. 31, 2026', 'Jun. 8, 2026')
        if new != old:
            set_text(p, new)
            edits.append({'before': old, 'after': new})

    remaining = '\n'.join(text(p) for p in paragraphs)
    suspect = [text(p) for p in paragraphs if any(x in text(p) for x in [
        'its hosted database', 'hosted history unverified',
        'hosted migration, worker credentials', 'measurement migration is not confirmed',
        'hosted measurement credentials or persistence are configured',
    ])]
    if suspect:
        raise ValueError('Unresolved deployment text: ' + repr(suspect))
    if len(edits) < 16:
        raise ValueError('Unexpected source: too few replacements')

    # The editable source contains an empty first section and floating drawings.
    # Remove the empty cover and put figures into text flow to prevent overlap
    # in the new PDF render. Figure 2 spans the page for readable provenance text.
    body = document.getElementsByTagNameNS(W, 'body')[0]
    first = next(n for n in body.childNodes if n.nodeType == n.ELEMENT_NODE)
    if first.nodeName == 'w:p' and not text(first) and first.getElementsByTagNameNS(W, 'sectPr'):
        body.removeChild(first)
    WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
    A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
    for drawing in list(document.getElementsByTagNameNS(W, 'drawing')):
        anchor = drawing.getElementsByTagNameNS(WP, 'anchor')[0]
        name = anchor.getElementsByTagNameNS(WP, 'docPr')[0].getAttribute('name')
        figure = 2 if name == 'image2.png' else 1
        caption = next(p for p in paragraphs if text(p).startswith(f'Fig. {figure}.'))
        width, height = (6200000, 3875000) if figure == 2 else (3000000, 684858)
        inline = document.createElementNS(WP, 'wp:inline')
        for attr in ['distT', 'distB', 'distL', 'distR']:
            inline.setAttribute(attr, '0')
        for tag in ['extent', 'effectExtent', 'docPr', 'cNvGraphicFramePr']:
            for child in list(anchor.childNodes):
                if child.nodeType == child.ELEMENT_NODE and child.localName == tag:
                    inline.appendChild(child)
        for child in list(anchor.childNodes):
            if child.nodeType == child.ELEMENT_NODE and child.localName == 'graphic':
                inline.appendChild(child)
        for element in list(inline.getElementsByTagNameNS(WP, 'extent')) + list(inline.getElementsByTagNameNS(A, 'ext')):
            element.setAttribute('cx', str(width)); element.setAttribute('cy', str(height))
        drawing.replaceChild(inline, anchor)
        image_p = document.createElementNS(W, 'w:p')
        props = document.createElementNS(W, 'w:pPr')
        align = document.createElementNS(W, 'w:jc'); align.setAttribute('w:val', 'center')
        props.appendChild(align)
        keep = document.createElementNS(W, 'w:keepNext'); props.appendChild(keep)
        image_p.appendChild(props)
        run = document.createElementNS(W, 'w:r'); run.appendChild(drawing); image_p.appendChild(run)
        caption.parentNode.insertBefore(image_p, caption)
        if figure == 2:
            two_columns = next(s for s in document.getElementsByTagNameNS(W, 'sectPr')
                               if any(c.getAttribute('w:num') == '2' for c in s.getElementsByTagNameNS(W, 'cols')))
            boundary = document.createElementNS(W, 'w:p')
            bp = document.createElementNS(W, 'w:pPr'); bp.appendChild(two_columns.cloneNode(True))
            boundary.appendChild(bp); image_p.parentNode.insertBefore(boundary, image_p)
            one_column = two_columns.cloneNode(True)
            cols = one_column.getElementsByTagNameNS(W, 'cols')[0]
            while cols.firstChild: cols.removeChild(cols.firstChild)
            cols.setAttribute('w:num', '1'); cols.removeAttribute('w:equalWidth')
            cap_props = caption.getElementsByTagNameNS(W, 'pPr')[0]
            cap_props.appendChild(one_column)
    for p in list(body.childNodes):
        if p.nodeName == 'w:p' and not text(p) and not p.getElementsByTagNameNS(W, 'sectPr') and not p.getElementsByTagNameNS(W, 'drawing'):
            body.removeChild(p)
    result = BytesIO()
    with ZipFile(result, 'w', ZIP_DEFLATED) as out:
        for item in source.infolist():
            content = source.read(item.filename)
            if item.filename == 'word/document.xml':
                content = document.toxml(encoding='UTF-8')
            if item.filename == 'word/media/image2.png':
                content = figure_bytes
            out.writestr(item, content)
    OUTPUT.write_bytes(result.getvalue())
    print(f'Created {OUTPUT.name}; {len(edits)} paragraph/table-cell edits')
