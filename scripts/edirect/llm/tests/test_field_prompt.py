"""Parser tests for the LLM response handler.

Run with: `python -m unittest discover tests` from scripts/edirect/llm/
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from lib.field_prompt import parse_response


class TestParseResponse(unittest.TestCase):
    def test_clean_json(self):
        sample = '{"fields":[{"label":"Nume","type":"text","bbox_norm":[0.1,0.2,0.5,0.02],"confidence":0.9}]}'
        out = parse_response(sample)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0].label, 'Nume')
        self.assertEqual(out[0].type, 'text')
        self.assertAlmostEqual(out[0].confidence, 0.9, places=3)

    def test_strips_markdown_fence(self):
        sample = '```json\n{"fields":[{"label":"X","type":"text","bbox_norm":[0,0,0.1,0.01],"confidence":0.5}]}\n```'
        self.assertEqual(len(parse_response(sample)), 1)

    def test_drops_offpage_bbox(self):
        sample = '{"fields":[{"label":"bad","type":"text","bbox_norm":[-1,0,2,0.02],"confidence":0.5}]}'
        self.assertEqual(parse_response(sample), [])

    def test_drops_degenerate_bbox(self):
        sample = '{"fields":[{"label":"x","type":"text","bbox_norm":[0,0,0,0.02],"confidence":0.5}]}'
        self.assertEqual(parse_response(sample), [])

    def test_clamps_partial_overflow(self):
        # x=0.95, w=0.1 → should clamp w to 0.05 and still keep the field.
        sample = '{"fields":[{"label":"edge","type":"text","bbox_norm":[0.95,0.5,0.1,0.02],"confidence":0.7}]}'
        out = parse_response(sample)
        self.assertEqual(len(out), 1)
        self.assertAlmostEqual(out[0].x_norm + out[0].w_norm, 1.0, places=3)

    def test_lenient_type(self):
        sample = '{"fields":[{"label":"x","type":"input","bbox_norm":[0,0,0.1,0.01],"confidence":0.5}]}'
        out = parse_response(sample)
        self.assertEqual(out[0].type, 'text')

    def test_extracts_inner_json(self):
        sample = 'Here is the result:\n{"fields":[{"label":"x","type":"text","bbox_norm":[0,0,0.1,0.01],"confidence":0.5}]}\nHope this helps.'
        self.assertEqual(len(parse_response(sample)), 1)

    def test_empty_array(self):
        self.assertEqual(parse_response('{"fields":[]}'), [])

    def test_malformed_returns_empty(self):
        self.assertEqual(parse_response('not json at all'), [])
        self.assertEqual(parse_response(''), [])


if __name__ == '__main__':
    unittest.main()
