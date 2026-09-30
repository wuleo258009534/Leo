"""Build an offline classroom HTML deck; Python standard library only."""
import argparse
import base64
import copy
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ID = re.compile(r'^[A-Za-z0-9_-]+$')

def require(ok, message):
    if not ok:
        raise ValueError(message)

def identifier(value):
    return isinstance(value, str) and bool(ID.fullmatch(value))

def string(obj, key, required=False):
    value = obj.get(key, '')
    require(isinstance(value, str), f'{key} must be text')
    if required:
        require(bool(value.strip()), f'{key} must not be blank')
    return value

def content(block, base):
    require(isinstance(block, dict), 'Content block must be an object')
    string(block, 'label')
    kind = block.get('type')
    require(kind in ('text', 'image', 'table'), 'Unsupported block type')
    if kind == 'text':
        string(block, 'text', True)
    elif kind == 'table':
        headers, rows = block.get('headers'), block.get('rows')
        require(isinstance(headers, list) and bool(headers), 'Table requires headers')
        require(all(isinstance(x, str) for x in headers), 'Headers must be text')
        require(isinstance(rows, list) and all(isinstance(r, list) and len(r) == len(headers) and all(isinstance(x, str) for x in r) for r in rows), 'Table rows must match headers and contain text')
    else:
        string(block, 'alt', True)
        string(block, 'caption')
        src = string(block, 'src', True)
        require(not re.match(r'^(?:https?:|data:|//)', src, re.I), 'Images must be local paths')
        path = (base / src).resolve()
        raw = path.read_bytes()
        mime = None
        if raw.startswith(b'\x89PNG\r\n\x1a\n'): mime = 'image/png'
        elif raw.startswith(b'\xff\xd8\xff'): mime = 'image/jpeg'
        elif raw[:4] == b'RIFF' and raw[8:12] == b'WEBP': mime = 'image/webp'
        require(mime is not None, 'Image must be PNG, JPEG or WebP')
        block['src'] = 'data:' + mime + ';base64,' + base64.b64encode(raw).decode('ascii')

def prepare(source, base):
    doc = copy.deepcopy(source)
    require(isinstance(doc, dict), 'Root must be an object')
    require(identifier(doc.get('id')), 'Invalid lesson id')
    string(doc, 'title', True)
    string(doc, 'badge')
    topics = doc.get('topics')
    require(isinstance(topics, list) and bool(topics), 'At least one topic required')
    topic_ids, question_ids = set(), set()
    for t in topics:
        require(isinstance(t, dict), 'Topic must be an object')
        tid = t.get('id')
        require(identifier(tid) and tid != 'overview' and tid not in topic_ids, 'Invalid/duplicate/reserved topic id')
        topic_ids.add(tid)
        for key in ('label', 'title'): string(t, key, True)
        for key in ('summary', 'materialLabel'): string(t, key)
        blocks, questions = t.get('blocks'), t.get('questions')
        require(isinstance(blocks, list) and bool(blocks), 'Topic needs material blocks')
        require(isinstance(questions, list) and bool(questions), 'Topic needs questions')
        bids, qids = set(), set()
        for b in blocks:
            require(isinstance(b, dict), 'Block must be an object')
            bid = b.get('id')
            require(identifier(bid) and bid not in bids, 'Invalid/duplicate material id')
            bids.add(bid)
            content(b, base)
        for q in questions:
            require(isinstance(q, dict), 'Question must be an object')
            qid = q.get('id')
            require(identifier(qid) and qid not in question_ids, 'Invalid/duplicate question id')
            qids.add(qid); question_ids.add(qid)
            for key in ('number', 'prompt'): string(q, key, True)
            require(q.get('status') in ('confirmed', 'unverified'), 'Question status is required')
            string(q, 'answer', q['status'] == 'confirmed')
            for key in ('answerKind', 'approach', 'pitfall'): string(q, key)
            opts = q.get('options', [])
            require(isinstance(opts, list) and all(isinstance(o, str) for o in opts), 'Options must be text array')
            ev = q.get('evidence', [])
            require(isinstance(ev, list) and all(isinstance(x, str) and x in bids for x in ev), 'Evidence must reference material in the same topic')
            steps = q.get('steps', [])
            require(isinstance(steps, list), 'Steps must be content array')
            for b in steps: content(b, base)
        for b in blocks:
            for ref in re.findall(r'\[\[([^\[\]]+)\]\]', b.get('text', '')):
                require(ref in qids, f'Unknown blank reference: {ref}')
    return doc

def build(source, output, force=False):
    source, output = Path(source).resolve(), Path(output).resolve()
    require(source != output, 'Output cannot replace input')
    require(output.suffix.lower() == '.html', 'Output must be .html')
    if output.exists() and not force:
        raise FileExistsError(f'Output exists: {output}; use --force for an intended update')
    doc = prepare(json.loads(source.read_text(encoding='utf-8-sig')), source.parent)
    template = (ROOT / 'assets' / 'classroom-template.html').read_text(encoding='utf-8')
    payload = json.dumps(doc, ensure_ascii=False).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
    runtime = (ROOT / 'assets' / 'runtime.js').read_text(encoding='utf-8')
    result = template.replace('__DOCUMENT_TITLE__', html.escape(doc['title'])).replace('__LESSON_JSON__', payload) + '<script>\n' + runtime + '\n</script></body></html>'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(result, encoding='utf-8')
    return len(doc['topics']), sum(len(t['questions']) for t in doc['topics'])

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    try:
        topics, questions = build(args.source, args.output, args.force)
        print(f'Built {topics} topics / {questions} questions: {args.output}')
    except (ValueError, OSError, TypeError) as exc:
        parser.exit(1, f'Build failed: {exc}\n')
