"""Renders ml-paper.md into the conference DOCX and a PDF review copy, then checks the result.

    uv run --no-project --with python-docx python docs/manuscripts/build-ml-paper.py

The DOCX reuses the paragraph/table prototypes of phase7-paper-standard.docx (the verified A4 conference
template conversion). The PDF is a Chrome print of an HTML render of the same blocks, for reading only;
submit the DOCX. Provenance tags are stripped from both outputs.
"""

import copy
from datetime import datetime, timezone
import csv
import html
import json
import math
import re
import subprocess
from pathlib import Path

from docx import Document
from lxml import etree
from docx.shared import Inches

HERE = Path(__file__).parent
ROOT = HERE.parents[1]
SOURCE, BASE = HERE / "ml-paper.md", HERE / "phase7-paper-standard.docx"
DOCX, HTML, PDF = HERE / "ml-paper.docx", HERE / "ml-paper.html", ROOT / "output/pdf/matani-ml-paper.pdf"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
TAG = re.compile(r"\s*\[(?:EVID|OBS|DEC|HYP|CODE|EVAL|SPEC)[^\]]*\]")


def parse(text):
    """Blocks: (kind, payload). Kinds: title, abstract, keywords, h1, h2, h5, p, eq, table, fig, ref."""
    head, body = text.split("\n## Abstract\n", 1)
    body = body.lstrip("\n")  # the abstract paragraph belongs to its heading
    blocks = [("title", head.splitlines()[0][2:])]
    for chunk in re.split(r"\n\s*\n", "## Abstract\n" + body):
        chunk = TAG.sub("", chunk.strip())
        if not chunk:
            continue
        first, _, rest = chunk.partition("\n")
        if chunk.startswith("## Abstract"):
            blocks.append(("abstract", rest.strip()))
        elif chunk.startswith("**Index Terms:**"):
            blocks.append(("keywords", chunk.removeprefix("**Index Terms:**").strip()))
        elif chunk.startswith("## "):
            name = first[3:]
            blocks.append(("h1" if re.match(r"[IVX]+\. ", name) else "h5", name))
        elif chunk.startswith("### "):
            blocks.append(("h2", first[4:]))
        elif chunk.startswith("EQ: "):
            blocks.append(("eq", chunk[4:]))
        elif chunk.startswith("TABLE: "):
            rows = [[c.strip() for c in line.strip("|").split("|")] for line in rest.splitlines()]
            blocks.append(("table", (first[7:], [rows[0]] + rows[2:])))
        elif chunk.startswith("!["):
            caption, path = re.match(r"!\[(.*)\]\((.*)\)", chunk).groups()
            blocks.append(("fig", (caption, HERE / path)))
        elif re.match(r"\[\d+\] ", chunk):
            blocks.append(("ref", chunk))
        elif re.match(r"1\) ", chunk):
            blocks += [("p", line) for line in chunk.splitlines()]
        else:
            blocks.append(("p", " ".join(chunk.splitlines())))
    return blocks


def text_run(p, text):
    """Replaces the prototype paragraph's content with one run carrying its first run's formatting."""
    runs = p.findall(W + "r")
    rpr = copy.deepcopy(runs[0].find(W + "rPr")) if runs and runs[0].find(W + "rPr") is not None else None
    for child in [c for c in p if c.tag != W + "pPr"]:
        p.remove(child)
    r = p.makeelement(W + "r", {})
    if rpr is not None:
        r.append(rpr)
    t = r.makeelement(W + "t", {"{http://www.w3.org/XML/1998/namespace}space": "preserve"})
    t.text = text
    r.append(t)
    p.append(r)
    return p


def author_paragraph(proto, lines, column_break=False):
    p = copy.deepcopy(proto)
    runs = p.findall(W + "r")
    rpr = runs[0].find(W + "rPr")
    for child in [c for c in p if c.tag != W + "pPr"]:
        p.remove(child)
    for i, line in enumerate(lines):
        r = p.makeelement(W + "r", {})
        props = copy.deepcopy(rpr) if rpr is not None else r.makeelement(W + "rPr", {})
        if i in (1, 2):  # department and university in italics, as in the IEEE template and the reference paper
            props.append(props.makeelement(W + "i", {}))
        for tag in ("sz", "szCs"):  # 9 pt, smaller than the 10 pt body text (R15)
            old = props.find(W + tag)
            if old is not None:
                props.remove(old)
            props.append(props.makeelement(W + tag, {W + "val": "18"}))
        r.append(props)
        if column_break and i == 0:
            r.append(r.makeelement(W + "br", {W + "type": "column"}))
        if i:
            r.append(r.makeelement(W + "br", {}))
        t = r.makeelement(W + "t", {"{http://www.w3.org/XML/1998/namespace}space": "preserve"})
        t.text = line
        r.append(t)
        p.append(r)
    return p


def build_docx(blocks, authors):
    doc = Document(BASE)
    doc.core_properties.title = blocks[0][1]  # not the template's old title (review N29)
    doc.core_properties.subject = doc.core_properties.keywords = doc.core_properties.last_modified_by = ""
    doc.core_properties.created = doc.core_properties.modified = datetime.now(timezone.utc).replace(microsecond=0)
    body = doc.element.body
    paras = {}
    for p in doc.paragraphs:
        key = p.style.style_id
        if p._p.find(".//" + W + "drawing") is not None:
            paras.setdefault("figure", p._p)
        elif p.text.strip():
            paras.setdefault(key, p._p)
    proto = {k: copy.deepcopy(v) for k, v in paras.items()}
    proto_tbl = copy.deepcopy(body.find(W + "tbl"))
    children = list(body)
    keep = children.index(next(c for c in children if c.find(".//" + W + "pStyle") is not None
                               and c.find(".//" + W + "pStyle").get(W + "val") == "Abstract"))
    for child in children[keep:-1]:  # drop Phase 7 body, keep title/author sections and the final sectPr
        body.remove(child)
    old = [c for c in body if c.find(".//" + W + "pStyle") is not None
           and c.find(".//" + W + "pStyle").get(W + "val") == "Author"]
    sect_p = old[-1].getnext()  # paragraph carrying the author section's sectPr
    between = list(body)[body.index(old[0]):body.index(sect_p)]  # template authors + column-break spacers
    sect_p.find(".//" + W + "cols").set(W + "num", "2")  # 2 x 2 author block (reviewer comment #1)
    order = [authors[0], authors[2], authors[1], authors[3]]  # columns fill top-down: left column, then right
    for i, a in enumerate(order):
        sect_p.addprevious(author_paragraph(old[0], a, column_break=(i == 2)))
    for p in between:
        body.remove(p)
    sect = body[-1]
    style = {"abstract": "Abstract", "keywords": "Keywords", "h1": "Heading1", "h2": "Heading2", "h5": "Heading5",
             "p": "BodyText", "eq": "equation", "ref": "references"}
    for kind, payload in blocks:
        if kind == "title":
            text_run(paras["Title"], payload)
        elif kind in style:
            text = {"abstract": f"Abstract—{payload}", "keywords": f"Index Terms—{payload}"}.get(kind, payload)
            sect.addprevious(text_run(copy.deepcopy(proto[style[kind]]), text))
        elif kind == "table":
            caption, rows = payload
            sect.addprevious(caption_paragraph(text_run(copy.deepcopy(proto["tablehead"]), caption)))
            sect.addprevious(table(proto_tbl, rows))
        elif kind == "fig":
            caption, path = payload
            holder = doc.add_paragraph()
            holder.add_run().add_picture(str(path), width=Inches(3.3))
            p = copy.deepcopy(proto["figure"])
            for child in [c for c in p if c.tag != W + "pPr"]:
                p.remove(child)
            p.find(W + "pPr").find(W + "spacing").set(W + "line", "240")
            p.extend(holder._p.findall(W + "r"))
            body.remove(holder._p)
            sect.addprevious(p)
            sect.addprevious(text_run(copy.deepcopy(proto["figurecaption"]), caption))
    for root in (body, doc.part.numbering_part.element, doc.styles.element):
        schema_order(root)
    used = set(re.findall(r'r:(?:id|embed)="([^"]+)"', etree.tostring(body).decode()))
    for rid, rel in list(doc.part.rels.items()):  # template leftovers: old reference links, unused logo, and an
        # empty bibliography store whose Strict-namespace itemProps breaks Transitional readers (Google Docs import)
        if rel.reltype.endswith("/customXml") or (rel.reltype.endswith(("/hyperlink", "/image")) and rid not in used):
            del doc.part.rels[rid]
    doc.save(DOCX)


# OOXML requires these children in schema order. Word and Google Docs reject or "repair" files that break it,
# while LibreOffice silently accepts them (review: Google Docs import failed).
SCHEMA_ORDER = {
    "rPr": "rStyle rFonts b bCs i iCs caps smallCaps strike dstrike outline shadow emboss imprint noProof snapToGrid "
           "vanish webHidden color spacing w kern position sz szCs highlight u effect bdr shd fitText vertAlign rtl cs "
           "em lang eastAsianLayout specVanish oMath".split(),
    "pPr": "pStyle keepNext keepLines pageBreakBefore framePr widowControl numPr suppressLineNumbers pBdr shd tabs "
           "suppressAutoHyphens kinsoku wordWrap overflowPunct topLinePunct autoSpaceDE autoSpaceDN bidi adjustRightInd "
           "snapToGrid spacing ind contextualSpacing mirrorIndents suppressOverlap jc textDirection textAlignment "
           "textboxTightWrap outlineLvl divId cnfStyle rPr sectPr pPrChange".split(),
}


def schema_order(root):
    for tag, order in SCHEMA_ORDER.items():
        rank = {name: i for i, name in enumerate(order)}
        for el in root.iter(W + tag):
            # extensions in other namespaces (w14:textOutline) go last; KeyError = unknown w: tag, add it above
            kids = sorted(el, key=lambda c: rank[etree.QName(c).localname] if c.tag.startswith(W) else len(rank))
            el[:] = kids
    # the template mixes in Strict-OOXML values that Transitional readers reject
    for el in root.iter(W + "jc", W + "lvlJc"):
        el.set(W + "val", {"start": "left", "end": "right"}.get(el.get(W + "val"), el.get(W + "val")))
    for el in root.iter(W + "tblHeader", W + "cantSplit"):
        if el.get(W + "val") == "true":
            del el.attrib[W + "val"]  # on/off elements default to on


def rules(tc, top, bottom):
    """Three-rule (booktabs) table as in the reference paper: no vertical lines, rules above and below the
    header and below the last row. Sizes are eighths of a point."""
    pr = tc.find(W + "tcPr")
    old = pr.find(W + "tcBorders")
    borders = pr.makeelement(W + "tcBorders", {})
    for side, size in (("top", top), ("left", 0), ("bottom", bottom), ("right", 0)):
        attrs = {W + "val": "single", W + "sz": str(size), W + "space": "0", W + "color": "000000"} if size else {W + "val": "nil"}
        borders.append(borders.makeelement(W + side, attrs))
    if old is not None:
        old.addprevious(borders)
        pr.remove(old)
    else:
        pr.insert(1, borders)


def caption_paragraph(p):
    """Table captions: plain case and left aligned ('TABLE I: …'), overriding the template's small caps."""
    ppr = p.find(W + "pPr")
    jc = ppr.find(W + "jc") if ppr is not None else None
    if jc is None and ppr is not None:
        jc = ppr.makeelement(W + "jc", {})
        ppr.append(jc)
    if jc is not None:
        jc.set(W + "val", "left")
    for rpr in p.iter(W + "rPr"):
        rpr.append(rpr.makeelement(W + "smallCaps", {W + "val": "0"}))
    return p


def table(proto, rows):
    tbl = copy.deepcopy(proto)
    trs = tbl.findall(W + "tr")
    head_tr, body_tr = trs[0], trs[1]
    width = sum(int(g.get(W + "w")) for g in tbl.find(W + "tblGrid"))
    for tr in trs:
        tbl.remove(tr)
    grid = tbl.find(W + "tblGrid")
    for g in list(grid):
        grid.remove(g)
    # Width by content (review N22): a column needs room for its longest unbreakable token (a number,
    # or a word split at spaces/hyphens) so nothing breaks mid-word; long text may wrap at spaces.
    # Widths are in character units; narrow punctuation counts half, so an interval column does not starve "F0+F1+F2".
    chars = lambda text: sum(0.5 if ch in ".,:;[]() \u00a0" else 1 for ch in text)
    token = lambda cell: max(chars(t) for t in re.split(r"[ \t\n\-–]+", cell) if t)  # a no-break space joins its token
    need = [max(max(token(c) for c in col) + 2, 0.6 * max(chars(c) for c in col), 6) for col in zip(*rows)]
    widths = [int(width * n / sum(need)) for n in need]
    for w in widths:
        grid.append(grid.makeelement(W + "gridCol", {W + "w": str(w)}))
    for i, cells in enumerate(rows):
        src = head_tr if i == 0 else body_tr
        tr = copy.deepcopy(src)
        proto_tc = copy.deepcopy(tr.find(W + "tc"))
        for tc in tr.findall(W + "tc"):
            tr.remove(tc)
        for w, value in zip(widths, cells):
            tc = copy.deepcopy(proto_tc)
            tc.find(W + "tcPr").find(W + "tcW").set(W + "w", str(w))
            rules(tc, top=8 if i == 0 else 0, bottom=4 if i == 0 else 8 if i == len(rows) - 1 else 0)
            for extra in tc.findall(W + "p")[1:]:
                tc.remove(extra)
            text_run(tc.find(W + "p"), value)
            tr.append(tc)
        tbl.append(tr)
    return tbl


CSS = """
@page { size: A4; margin: 19mm 16mm 25mm 16mm; }
body { font: 10pt/1.25 "Times New Roman", Times, serif; color: #000; margin: 0; }
h1.title { font-size: 22pt; font-weight: normal; text-align: center; margin: 0 0 10pt; line-height: 1.15; }
.authors { display: grid; grid-template-columns: 1fr 1fr; row-gap: 8pt; text-align: center; font-size: 9pt; line-height: 1.15; margin: 4pt 12% 16pt; }
.cols { column-count: 2; column-gap: 5mm; text-align: justify; hyphens: auto; }
p { margin: 0; text-indent: 1em; }
.abstract, .keywords { font-weight: bold; font-size: 9pt; text-indent: 0; margin-bottom: 6pt; }
.abstract i, .keywords i { font-style: italic; }
h2 { font-size: 10pt; font-weight: normal; font-variant: small-caps; text-align: center; margin: 10pt 0 5pt; break-after: avoid; }
h3 { font-size: 10pt; font-weight: normal; font-style: italic; margin: 7pt 0 3pt; break-after: avoid; }
h4 { font-size: 10pt; font-weight: normal; font-variant: small-caps; text-align: center; margin: 10pt 0 5pt; }
.eq { text-align: center; text-indent: 0; margin: 5pt 0; }
figure { margin: 6pt 0; break-inside: avoid; text-align: center; }
figure img { width: 100%; }
figcaption, .tcap { font-size: 8pt; text-align: left; margin-top: 3pt; text-indent: 0; }
.tcap { text-align: left; margin: 8pt 0 3pt; break-after: avoid; }
table { border-collapse: collapse; width: 100%; font-size: 7pt; margin-bottom: 6pt; break-inside: avoid; }
td, th { border: none; padding: 1.5pt 3pt; text-align: left; vertical-align: middle; }
table { border-top: 1pt solid #000; border-bottom: 1pt solid #000; }
th { border-bottom: 0.5pt solid #000; }
th { font-weight: bold; }
.ref { font-size: 8pt; text-indent: -1.8em; padding-left: 1.8em; text-align: left; margin-bottom: 2pt; overflow-wrap: anywhere; }
"""


def build_html(blocks, authors):
    out = [f"<!doctype html><meta charset=utf-8><title>{html.escape(blocks[0][1])}</title><style>{CSS}</style>",
           f"<h1 class=title>{html.escape(blocks[0][1])}</h1><div class=authors>"]
    out += [f"<div>{'<br>'.join(f'<i>{html.escape(x)}</i>' if i in (1, 2) else html.escape(x) for i, x in enumerate(a))}</div>"
            for a in authors]
    out.append("</div><div class=cols>")
    for kind, payload in blocks[1:]:
        e = html.escape
        if kind == "abstract":
            out.append(f"<p class=abstract><i>Abstract</i>—{e(payload)}</p>")
        elif kind == "keywords":
            out.append(f"<p class=keywords><i>Index Terms</i>—{e(payload)}</p>")
        elif kind == "h1":
            out.append(f"<h2>{e(payload)}</h2>")
        elif kind == "h2":
            out.append(f"<h3>{e(payload)}</h3>")
        elif kind == "h5":
            out.append(f"<h4>{e(payload)}</h4>")
        elif kind == "p":
            out.append(f"<p>{e(payload)}</p>")
        elif kind == "eq":
            out.append(f"<p class=eq>{e(payload)}</p>")
        elif kind == "ref":
            out.append(f"<p class=ref>{e(payload)}</p>")
        elif kind == "table":
            caption, rows = payload
            cells = lambda row, tag: "".join(f"<{tag}>{e(c)}</{tag}>" for c in row)
            out.append(f"<p class=tcap>{e(caption)}</p><table><tr>{cells(rows[0], 'th')}</tr>"
                       + "".join(f"<tr>{cells(r, 'td')}</tr>" for r in rows[1:]) + "</table>")
        elif kind == "fig":
            caption, path = payload
            out.append(f"<figure><img src='{path.name}'><figcaption>{e(caption)}</figcaption></figure>")
    out.append("</div>")
    HTML.write_text("\n".join(out))
    PDF.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer", f"--print-to-pdf={PDF}",
                    HTML.as_uri()], check=True, capture_output=True)


def check(source, blocks):
    body, bibliography = source.split("\n## References\n", 1)
    cited = []
    for a, b in re.findall(r"\[(\d+)\](?:–\[(\d+)\])?", TAG.sub("", body)):
        cited += range(int(a), int(b or a) + 1)
    order = list(dict.fromkeys(cited))
    refs = re.findall(r"^\[(\d+)\] .*\[(EVID-\d+)\]$", bibliography, re.M)
    assert order == list(range(1, len(refs) + 1)), f"citation order {order}"
    assert [int(n) for n, _ in refs] == order, "reference list does not match citations"
    register = (ROOT / ".agent/evidence-register.md").read_text()
    for _, evid in refs:
        assert f"{evid}" in register, f"{evid} missing from evidence register"
    rendered = " ".join(str(p[0] if k == "fig" else p) for k, p in blocks)
    assert not re.search(r"(EVID|OBS|DEC|HYP)-\d|research/private|/Users/|\bSPEC\b|\bCODE:", rendered), "internal tag"
    assert [k for k, _ in blocks].count("table") == 3 and [k for k, _ in blocks].count("fig") == 4
    # R16: no review-trace wording in the rendered paper (figure images are checked by eye, e.g. Fig. 4's model version)
    assert not re.search(r"(?i)\b(reviewer|astra|claude code|draft \d+|round \d+)\b", rendered.replace("REVIEWER-NAME", "")), "R16 review-trace wording"
    if "REVIEWER-NAME" in rendered:
        print("WARNING: Acknowledgment still has the REVIEWER-NAME placeholder")
    # paper-best-practice.md rules that can be checked mechanically
    prose = " ".join(p for k, p in blocks if k in ("abstract", "p"))
    assert not re.search(r"\b\w+n't\b", rendered), "R11 contraction"
    assert "**" not in rendered and not re.search(r"(^|\s)- \*\*", rendered), "unrendered markdown list or bold"
    assert not re.search(r"(?i)\b(we|our|proves?|perfectly|absolutely|completely|massive|simply|actually|just|"
                         r"it is important to note|for now|right now)\b", prose), "R5/R11 voice or claim size"
    for caption in [p[0] for k, p in blocks if k == "fig"] + [p[0] for k, p in blocks if k == "table"]:
        text = re.sub(r"^(Fig\. \d+|TABLE [IVX]+):\s*", "", caption)
        assert len(re.findall(r"[.;:]\s", text + " ")) <= 1, f"R4 caption is not a one-sentence label: {caption}"
    captions = "\n".join(str(p[0]) for k, p in blocks if k in ("fig", "table"))
    assert all(re.match(r"(TABLE [IVX]+|Fig\. \d+): ", c) for c in captions.splitlines()), "caption prefix must be 'TABLE I:' or 'Fig. 1:'"
    for label in re.findall(r"^(TABLE [IVX]+|Fig\. \d+):", captions, re.M):
        text_label = label.replace("TABLE", "Table")  # referred to as "Table I" in running text
        assert re.search(re.escape(text_label) + r"\b", prose), f"{label} is never referenced"
    for n, _ in refs:
        assert re.search(rf"\[{n}\]", TAG.sub("", body)), f"R13 reference [{n}] not cited"


def fmt(v, digits=3, sign=False):
    """Manuscript number style: fixed decimals, Unicode minus, optional explicit plus."""
    text = f"{v:+.{digits}f}" if sign else f"{v:.{digits}f}"
    return text.replace("-", "−") if sign or v < 0 else text


def bin_label(b):
    return b.replace("<=", "≤").replace("-", "–")


def app_cutoffs():
    """The display cutoffs as implemented, so the paper cannot drift from the app (DEC-62)."""
    code = (ROOT / "utils/estimate-timeline.ts").read_text()
    grab = lambda name: int(re.search(rf"export const {name} = (\d+);", code).group(1))
    return grab("MIN_BRACKETED_GAP_DAYS"), grab("MIN_OPEN_GAP_DAYS")


def expected_numbers(numbers):
    """Selected table rows and quoted values in the paper, recomputed from the reviewer's results (DEC-61) and our
    block-bootstrap intervals (reviewer_ci.py). Not exhaustive: other numbers are checked by reading."""
    rv, ci, kk, inv, app = numbers["reviewer"], numbers["ci"], numbers["krangkeng"], numbers["inventory"], numbers["app_display"]
    met, pair, bins, cross, pooled = ci["metrics"], ci["paired"], ci["gap_bins"], ci["crossover"], rv["pooled"]
    rows = []
    handoff = Path(numbers["sources"]["handoff"])
    per_tile = json.loads(((handoff if handoff.is_absolute() else ROOT / handoff) / "MANIFEST.json").read_text())["counts"]["per_tile"]
    for tile in ("42", "49", "55", "total"):
        i = inv[tile]
        blocks = per_tile[tile]["blocks"] if tile != "total" else numbers["blocks"]
        windows = per_tile[tile]["windows"] if tile != "total" else numbers["windows"]
        rows.append(f"| {tile.title() if tile == 'total' else tile} | {blocks} | {windows} | {i['acquisitions']:,} "
                    f"| {i['target_pass']:,} | {i['ml_rows']:,} |")
    for model, name in (("rf", "RF"), ("xgb", "XGB")):
        for fs in ("F0", "F0+F1", "F0+F1+F2", "F2"):
            p, c = pooled[f"{model} {fs}"], met[f"{model} {fs}"]
            assert abs(p["mae"] - c["mae"]) < 1e-12, "pooled MAE and interval source disagree"
            rows.append(f"| {name} | {fs} | {fmt(c['mae'])}\u00a0[{fmt(c['mae_lo'])},\u00a0{fmt(c['mae_hi'])}] | {fmt(p['rmse'])} "
                        f"| {'0.000' if abs(p['bias']) < 5e-4 else fmt(p['bias'], sign=True)} | {fmt(p['r2'], 2)} |")
    by_bin = lambda baseline, model: sorted((v for k, v in bins.items() if k.startswith(f"{baseline} {model} ") and v["bin"] != "all"),
                                            key=lambda v: v["min_days"])
    for baseline, name in (("locf", "LOCF"), ("interpolation", "Interp.")):
        for b in by_bin(baseline, "rf"):
            rows.append(f"| {name} | {bin_label(b['bin'])} | {b['n_rows']} | {fmt(b['baseline_mae'])} | {fmt(b['radar_mae'])} "
                        f"| {fmt(b['diff'], sign=True)}\u00a0[{fmt(b['lo'])},\u00a0{fmt(b['hi'])}] |")

    rf, xgb = met["rf F0+F1"], met["xgb F0+F1"]
    d = lambda key: pair[key]
    allb = lambda baseline: bins[f"{baseline} rf all"]
    binv = lambda baseline, label, model="rf": bins[f"{baseline} {model} {label}"]
    cr = lambda baseline, model: cross[f"{baseline} {model}"]
    region = rv["region"]
    ndvi = lambda label: rv["ndvi_range"][f"{label} rf"]
    offset = lambda rng: [rv["offset"][f"{rng} {direction} rf"]["mae"] for direction in ("radarBeforeOptical", "radarAfterOptical")]
    split, flag, sc = rv["split"], rv["flag_counts"], rv["showcase"]
    bracketed, open_gap = app_cutoffs()
    assert round(cr("locf", "rf")["days"]) == round(cr("locf", "xgb")["days"]), "LOCF crossovers differ: rewrite 'for both learners'"
    assert app["shown"] == app["shown_before_first"], "Fig. 4 estimates are no longer all before the first observation: rewrite IV-F"
    day = lambda iso: f"{int(iso[8:10])} {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][int(iso[5:7]) - 1]}"
    sd_max = max(v["seed_mae_sd"] for v in met.values())
    total = inv["total"]
    text = {
        "abstract/intro qualifying dates": f"only {kk['display_rule_dates']} dates in 2021",
        "longest gap": f"{kk['longest_gap'][2]} days",
        "krangkeng inventory": f"{kk['display_rule_dates']} of {kk['acquisitions_2021']} Sentinel-2 acquisitions in 2021 passed that rule",
        "leading absence": f"{kk['leading_absence_days']}-day absence",
        "rows": f"{numbers['ml_rows']} clear-sky",
        "headline": f"MAE {fmt(rf['mae'])} (95% CI {fmt(rf['mae_lo'])} to {fmt(rf['mae_hi'])}) and R² {fmt(pooled['rf F0+F1']['r2'], 2)}",
        "abstract history": f"radar history reduced error by {-d('rf F0+F1-F0')['diff']:.3f}",
        "abstract interp": f"(exploratory linear crossover at {cr('interpolation', 'rf')['days']:.0f} days, CI {cr('interpolation', 'rf')['lo']:.0f} to {cr('interpolation', 'rf')['hi']:.0f})",
        "abstract locf": f"about {cr('locf', 'rf')['days']:.0f} days (CI {cr('locf', 'rf')['lo']:.0f} to {cr('locf', 'rf')['hi']:.0f})",
        "abstract locf long": f"radar error was {-binv('locf', '>30')['diff']:.3f} lower",
        "abstract rules": f"open gaps of at least {open_gap} days and bracketed gaps of at least {bracketed} days",
        "validity share": f"{100 * total['target_pass'] / total['acquisitions']:.1f}% met",
        "matched share": f"{100 * total['ml_rows'] / total['target_pass']:.1f}% of those",
        "pool rows": f"({numbers['pool_rows']} in total)",
        "showcase rows": f"showcase block contributed {numbers['ml_rows'] - numbers['pool_rows']}",
        "orbits": f"({numbers['orbit_counts']['ASCENDING']} ascending, {numbers['orbit_counts']['DESCENDING']} descending)",
        "offset": f"{numbers['median_abs_offset_days']:.1f} days",
        "wet share": f"contributed {100 * numbers['rows_nov_apr'] / numbers['ml_rows']:.0f}% of rows",
        "ndvi range": f"from {fmt(numbers['ndvi_range'][0], 2)}, in late-December rows consistent with flooded paddies, to {numbers['ndvi_range'][1]:.3f}",
        "radar after optical": f"as it did for {numbers['radar_after_optical']} of {numbers['ml_rows']} pairs",
        "rows per block": "Pool blocks contributed {} to {} rows each".format(
            min(numbers["rows_per_pool_block"].values()), max(numbers["rows_per_pool_block"].values())),
        "evaluable": f"Persistence was available for {rv['evaluable']['locf']} of the {rv['evaluable']['rows']} rows and interpolation for {rv['evaluable']['interpolation']}",
        "seed sd": f"below {math.ceil(sd_max * 1e4) / 1e4:.4f}",
        "rf-xgb": f"{fmt(d('rf-xgb F0+F1')['diff'], 4, sign=True)} (CI {fmt(d('rf-xgb F0+F1')['lo'], 4)} to {fmt(d('rf-xgb F0+F1')['hi'], 4)})",
        "history": f"by {-d('rf F0+F1-F0')['diff']:.3f} for Random Forest (CI {fmt(d('rf F0+F1-F0')['lo'])} to {fmt(d('rf F0+F1-F0')['hi'])}) and {-d('xgb F0+F1-F0')['diff']:.3f} for XGBoost",
        "calendar terms": f"{fmt(d('rf F0+F1+F2-F0+F1')['diff'], 4, sign=True)} for Random Forest (CI {fmt(d('rf F0+F1+F2-F0+F1')['lo'], 4)} to {fmt(d('rf F0+F1+F2-F0+F1')['hi'], 4)}) and "
                          f"{fmt(d('xgb F0+F1+F2-F0+F1')['diff'], 4, sign=True)} for XGBoost (CI {fmt(d('xgb F0+F1+F2-F0+F1')['lo'], 4)} to {fmt(d('xgb F0+F1+F2-F0+F1')['hi'], 4)})",
        "calendar only": f"was {-d('rf F0+F1-F2')['diff']:.3f} less accurate than Random Forest with F0+F1 (CI {-d('rf F0+F1-F2')['hi']:.3f} to {-d('rf F0+F1-F2')['lo']:.3f})",
        "overall baselines": f"interpolation (MAE {fmt(allb('interpolation')['baseline_mae'])} on {allb('interpolation')['n_rows']} rows) and persistence ({fmt(allb('locf')['baseline_mae'])} on {allb('locf')['n_rows']} rows) "
                             f"were more accurate than Random Forest ({fmt(allb('interpolation')['radar_mae'])} and {fmt(allb('locf')['radar_mae'])} on the same rows)",
        "46-60": f"the difference was still {fmt(binv('interpolation', '46-60')['diff'])} (CI {fmt(binv('interpolation', '46-60')['lo'])} to {fmt(binv('interpolation', '46-60')['hi'])})",
        ">60": f"({fmt(binv('interpolation', '>60')['diff'], sign=True)}, CI {fmt(binv('interpolation', '>60')['lo'])} to {fmt(binv('interpolation', '>60')['hi'])}, {binv('interpolation', '>60')['n_rows']} rows)",
        "interp crossover": f"{cr('interpolation', 'rf')['days']:.0f} days for Random Forest (CI {cr('interpolation', 'rf')['lo']:.0f} to {cr('interpolation', 'rf')['hi']:.0f}) and "
                            f"{cr('interpolation', 'xgb')['days']:.0f} days for XGBoost (CI {cr('interpolation', 'xgb')['lo']:.0f} to {cr('interpolation', 'xgb')['hi']:.0f})",
        "interp range": f"observed range of {cr('interpolation', 'rf')['min_gap_days']:.0f}–{cr('interpolation', 'rf')['max_gap_days']:.0f} days",
        "locf long": f"radar was {-binv('locf', '>30')['diff']:.3f} more accurate (CI {-binv('locf', '>30')['hi']:.3f} to {-binv('locf', '>30')['lo']:.3f}, {binv('locf', '>30')['n_rows']} rows)",
        "locf crossover": f"{cr('locf', 'rf')['days']:.0f} days for both learners (Random Forest CI {cr('locf', 'rf')['lo']:.0f} to {cr('locf', 'rf')['hi']:.0f})",
        "regions": f"MAE {fmt(region['42 rf']['mae'])}, {fmt(region['49 rf']['mae'])} and {fmt(region['55 rf']['mae'])}",
        "region r2": f"R² from {min(v['r2'] for k, v in region.items() if k.endswith('rf')):.2f} to {max(v['r2'] for k, v in region.items() if k.endswith('rf')):.2f}",
        "ndvi mid": f"(MAE {fmt(ndvi('0.4-<0.6')['mae'])}, bias {fmt(ndvi('0.4-<0.6')['bias'], sign=True)})",
        "ndvi low": f"bias {fmt(ndvi('0.2-<0.4')['bias'], sign=True)} at 0.2–0.4 and {fmt(ndvi('0-<0.2')['bias'], sign=True)} from 0 to 0.2",
        "ndvi high": f"{fmt(ndvi('0.6-<0.8')['bias'], sign=True)} at 0.6–0.8 and {fmt(ndvi('>=0.8')['bias'], sign=True)} at 0.8 or more",
        "ndvi negative": f"The {ndvi('<0')['rowCount']} negative references were overestimated by {ndvi('<0')['bias']:.2f}",
        "offsets": f"MAE was {min(offset('<1')):.3f}–{max(offset('<1')):.3f} for offsets under one day and {min(offset('2-3')):.3f}–{max(offset('2-3')):.3f} for two to three days",
        "flag counts": f"{flag['flaggedObservation']} flagged rows: {flag['flagHighNdvi']} references above 0.95, {flag['flagNegativeNdvi']} below 0 and {flag['flagBrightVv']} with VV above −3 dB",
        "flagged": f"reduced Random Forest MAE from {fmt(rv['flagged']['all rf']['mae'])} to {fmt(rv['flagged']['unflagged rf']['mae'])}",
        "split": f"MAE {fmt(split['random']['mae'])} and R² {split['random']['r2']:.2f}, compared with {fmt(split['groupedWindow']['mae'])} and {split['groupedWindow']['r2']:.2f} for window-grouped folds "
                 f"and {fmt(split['spatialTile']['mae'])} and {split['spatialTile']['r2']:.2f} for tile-grouped folds, so random splitting was optimistic by about {split['groupedWindow']['mae'] - split['random']['mae']:.3f}",
        "showcase": f"On the {sc['interpolation_rows']} showcase dates where interpolation was available, Random Forest with F0+F1 reached MAE {fmt(sc['radar_mae_interp_rows'])}, compared with {fmt(sc['interpolation_mae'])} for interpolation",
        "showcase locf": f"on the {sc['locf_rows']} dates with an earlier observation, persistence reached {fmt(sc['locf_mae'])}",
        "showcase all": f"all {kk['held_out_rows']} paired dates was {fmt(kk['held_out_mae'])}",
        "in-gap estimates": f"the {'ten' if kk['applied_in_longest_gap'] == 10 else kk['applied_in_longest_gap']} estimates ranged from {kk['in_gap_range'][0]:.2f} to {kk['in_gap_range'][1]:.2f}",
        "in-gap step": f"up to {kk['in_gap_max_step']['change']:.2f} within {'eight' if kk['in_gap_max_step']['days'] == 8 else kk['in_gap_max_step']['days']} days",
        "seed range": f"averaged {fmt(kk['seed_range_mean'])}",
        "march peak": "March NDVI peak ({} and {})".format(*[f"{r:.2f}" for d_, _, r in kk["held_out"] if d_[5:7] == "03"]),
        "december refs": "December references ({} and {})".format(*[fmt(r, 2) for d_, _, r in kk["held_out"] if d_[5:7] == "12"]),
        "december estimates": "estimated at {} and {}".format(*[f"{p:.2f}" for d_, p, _ in kk["held_out"] if d_[5:7] == "12"]),
        "rmse vs mohite": f"reported an RMSE of 0.08 for rice with random forest [5], compared with {fmt(pooled['rf F0+F1']['rmse'])} here",
        "rule bracketed": f"at least {bracketed} days",
        "rule open": f"at least {open_gap} days away",
        "app display": "Of the {radar_passes} radar passes in 2021, {near_measurement} fell within three days of a qualifying observation and {short_gap} did not meet either display rule, so the chart shows {shown} estimates".format(**app),
        "app dates": f"all between {day(app['shown_dates'][0])} and {day(app['shown_dates'][-1])}, before the first observation on {day(app['first_measured'])}",
        "app panel": f"open for the estimate of {day(app['shown_dates'][-1])}",
        "app mae": f"pooled held-out MAE rounded to {rf['mae']:.2f}",
    }
    return rows, text


def verify_numbers(source):
    """Lists every selected table row or quoted value that no longer matches the evaluation files."""
    numbers = json.loads((HERE / "ml-paper-numbers.json").read_text())
    rows, text = expected_numbers(numbers)
    stale = [f"table row {r}" for r in rows if r not in source]
    stale += [f"{name}: expected “{t}”" for name, t in text.items() if t not in source]
    assert not stale, "stale numbers:\n  " + "\n  ".join(stale)
    return len(rows) + len(text)


def main():
    source = SOURCE.read_text()
    blocks = parse(source)
    check(source, blocks)
    n_checked = verify_numbers(source)
    authors_line = re.search(r"^\*\*Authors:\*\* (.*)$", source, re.M).group(1)
    names, affiliation, emails = [x.strip() for x in authors_line.split(" — ")]
    affil = [a.strip() for a in affiliation.split(",")]
    authors = [[n.strip(), affil[0], affil[1], ", ".join(affil[2:]), m.strip()]
               for n, m in zip(names.split(";"), emails.split(";"))]
    build_docx(blocks, authors)
    build_html(blocks, authors)
    words = len(" ".join(str(p) for k, p in blocks if k in ("abstract", "p", "h1", "h2")).split())
    print(f"numbers: {n_checked} table rows and quoted values match {json.loads((HERE / 'ml-paper-numbers.json').read_text())['sources']['pipelines']} + intervals")
    print(f"OK {DOCX.name}, {PDF.relative_to(ROOT)}; {words} words excluding title, tables, captions, references")


if __name__ == "__main__":
    main()
