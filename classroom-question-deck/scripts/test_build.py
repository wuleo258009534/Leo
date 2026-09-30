"""Observable builder invariants; run without third-party dependencies."""
import base64
import copy
import json
from contextlib import contextmanager
from uuid import uuid4
import unittest
from pathlib import Path
from build_deck import ROOT, build, prepare

@contextmanager
def test_directory():
    # Normal inherited permissions also work in restricted Windows workspaces.
    p = Path.cwd() / ('classroom-test-' + uuid4().hex)
    p.mkdir()
    try:
        yield p
    finally:
        for name in ('pixel.png', 'lesson.json', 'deck.html'):
            (p/name).unlink(missing_ok=True)
        p.rmdir()

class BuildTests(unittest.TestCase):
    def setUp(self):
        self.doc = json.loads((ROOT/'assets/example-lesson.json').read_text(encoding='utf-8'))

    def test_valid_and_original_unchanged(self):
        before = copy.deepcopy(self.doc)
        result = prepare(self.doc, ROOT/'assets')
        self.assertEqual(self.doc, before)
        self.assertEqual(sum(len(t['questions']) for t in result['topics']), 7)
        self.assertEqual(result['topics'][0]['questions'][0]['number'], result['topics'][1]['questions'][0]['number'])

    def test_invalid_evidence(self):
        self.doc['topics'][0]['questions'][0]['evidence']=['table1']
        with self.assertRaises(ValueError): prepare(self.doc, ROOT)

    def test_duplicate_question_id(self):
        self.doc['topics'][1]['questions'][0]['id']='en-1'
        with self.assertRaises(ValueError): prepare(self.doc, ROOT)

    def test_invalid_blank(self):
        self.doc['topics'][0]['blocks'][0]['text']='Missing [[no-such-question]]'
        with self.assertRaises(ValueError): prepare(self.doc, ROOT)

    def test_unverified_and_empty_confirmed(self):
        q=self.doc['topics'][0]['questions'][0];q['status']='unverified';q['answer']=''
        self.assertEqual(prepare(self.doc, ROOT)['topics'][0]['questions'][0]['status'],'unverified')
        q['status']='confirmed'
        with self.assertRaises(ValueError): prepare(self.doc, ROOT)

    def test_embedded_image_and_script_escape_and_overwrite(self):
        with test_directory() as td:
            p=Path(td)
            raw=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=')
            (p/'pixel.png').write_bytes(raw)
            self.doc['topics'][0]['blocks'].append(dict(id='image',type='image',src='pixel.png',alt='Test image'))
            self.doc['topics'][0]['questions'][0]['prompt']='Literal </script><script>alert(1)</script>'
            source=p/'lesson.json';output=p/'deck.html'
            source.write_text(json.dumps(self.doc),encoding='utf-8')
            self.assertEqual(build(source,output),(4,7))
            result=output.read_text(encoding='utf-8')
            self.assertIn('data:image/png;base64,',result)
            self.assertNotIn('Literal </script>',result)
            payload=result.split('const LESSON = ',1)[1].split(';</script>',1)[0]
            parsed=json.loads(payload)
            self.assertEqual(parsed['topics'][0]['questions'][0]['prompt'],self.doc['topics'][0]['questions'][0]['prompt'])
            with self.assertRaises(FileExistsError): build(source,output)
            self.assertEqual(build(source,output,True),(4,7))

if __name__=='__main__': unittest.main()
