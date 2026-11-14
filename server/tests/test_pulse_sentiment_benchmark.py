"""Scoring and local transport tests only: no model invocation or app/database use."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

import httpx
import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'scripts/evaluate-pulse-sentiment.py'
CORPUS = ROOT / 'server/tests/fixtures/pulse_sentiment_benchmark.json'


@pytest.fixture
def benchmark():
    assert SCRIPT.exists(), 'Standalone evaluator has not been implemented'
    spec = importlib.util.spec_from_file_location('pulse_benchmark', SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_corpus_has_explicit_synthetic_provenance_and_ambiguous_abstentions(benchmark):
    corpus = benchmark.load_corpus(CORPUS)
    assert corpus['synthetic'] is True
    assert 12 <= len(corpus['cases']) <= 16
    assert {case['category'] for case in corpus['cases']} == {'informal','sarcasm','quotation','mixedlang','ambiguous'}
    ambiguous = [case for case in corpus['cases'] if case['category'] == 'ambiguous']
    assert ambiguous and all(case['expected'] is None and case['needs_review'] for case in ambiguous)


def test_accuracy_uses_only_valid_pairs_and_reports_missing_invalid_and_review(benchmark):
    cases = [
        {'id':'a','category':'informal','expected':'positive','needs_review':False},
        {'id':'b','category':'informal','expected':'negative','needs_review':False},
        {'id':'c','category':'informal','expected':'neutral','needs_review':False},
        {'id':'d','category':'ambiguous','expected':None,'needs_review':True},
        {'id':'e','category':'quotation','expected':'neutral','needs_review':False},
    ]
    report = benchmark.score(cases, {'a':'positive','b':'positive','c':'unknown','d':'negative'})
    assert report['evaluation'] == {'paired_count':2,'correct_count':1,'accuracy':0.5}
    assert report['coverage'] == 0.5  # two valid pairs / four gold-labeled examples
    assert report['categories']['informal']['coverage'] == 2/3
    assert report['categories']['ambiguous']['accuracy'] is None
    assert report['categories']['ambiguous']['coverage'] is None
    assert report['categories']['ambiguous']['needs_review_count'] == 1
    assert {(r['id'],r['status']) for r in report['misses']} == {('b','mismatch'),('c','invalid_prediction'),('e','missing_prediction')}
    assert report['cases'][3]['status'] == 'needs_review'
    assert benchmark.score(cases, {})['evaluation']['accuracy'] is None


@pytest.mark.parametrize('endpoint,model', [
    ('https://ollama.com','local'), ('http://192.168.1.2:11434','local'),
    ('http://127.0.0.1:11434/api/chat','local'), ('http://user:pass@localhost:11434','local'),
    ('http://localhost:11434','name-cloud'), ('http://localhost:11434',''),
])
def test_remote_or_ambiguous_configuration_is_rejected(benchmark, endpoint, model):
    with pytest.raises(ValueError):
        benchmark.local_config(endpoint, model)


def test_sequential_ollama_protocol_parses_output_and_never_sends_gold(benchmark):
    def respond(request):
        if request.url.path == '/api/tags':
            return httpx.Response(200, json={'models':[{'name':'installed:latest'}]})
        assert request.url.path == '/api/chat'
        body = json.loads(request.content)
        assert body['model'] == 'installed:latest' and body['stream'] is False
        assert body['messages'][1]['content'] == 'contoh teks'
        return httpx.Response(200,json={'done':True,'message':{'content':'{"label":"negative"}'}})
    with httpx.Client(transport=httpx.MockTransport(respond)) as client:
        outputs = benchmark.run_local([{'id':'x','text':'contoh teks','expected':'positive'}], 'http://127.0.0.1:11434', 'installed:latest', client, delay=0)
    assert benchmark.score([{'id':'x','category':'informal','expected':'positive','needs_review':False}], outputs)['evaluation']['accuracy'] == 0.0


def test_missing_installed_model_stops_without_generation_or_download(benchmark):
    def respond(request):
        assert request.method == 'GET' and request.url.path == '/api/tags'
        return httpx.Response(200,json={'models':[]})
    with httpx.Client(transport=httpx.MockTransport(respond)) as client, pytest.raises(ValueError,match='installed'):
        benchmark.run_local([{'id':'x','text':'text'}], 'http://127.0.0.1:11434','absent',client,delay=0)


def test_model_error_stops_without_fallback(benchmark):
    def respond(request):
        if request.url.path == '/api/tags':
            return httpx.Response(200,json={'models':[{'name':'local'}]})
        return httpx.Response(503,json={'error':'unavailable'})
    with httpx.Client(transport=httpx.MockTransport(respond)) as client, pytest.raises(httpx.HTTPStatusError):
        benchmark.run_local([{'id':'x','text':'text'}], 'http://127.0.0.1:11434','local',client,delay=0)


def test_dry_run_cli_marks_report_as_not_model_evaluation(benchmark):
    result = subprocess.run([sys.executable,str(SCRIPT),'--dry-run'],capture_output=True,text=True,check=True)
    report = json.loads(result.stdout)
    assert report['mode'] == 'dry_run' and report['model_evaluated'] is False
    assert report['evaluation'] == {'paired_count':0,'correct_count':0,'accuracy':None}


def test_fake_outputs_cli_cannot_claim_real_evaluation(benchmark, tmp_path):
    predictions = tmp_path / 'fake.json'
    predictions.write_text(json.dumps({'informal-01':'positive'}))
    result = subprocess.run([sys.executable,str(SCRIPT),'--predictions',str(predictions)],capture_output=True,text=True,check=True)
    report = json.loads(result.stdout)
    assert report['mode'] == 'offline_predictions' and report['model_evaluated'] is False
    assert report['evaluation'] == {'paired_count':1,'correct_count':1,'accuracy':1.0}
