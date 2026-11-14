import json
import pytest
from app.services.pulse_listening import parse_emotion

def test_emotion_requires_its_own_validated_label_not_sentiment():
    assert parse_emotion(json.dumps({'label':'negative','confidence':.9})) is None
    result=parse_emotion(json.dumps({'emotion':{'label':'anger','confidence':.8,'reason':'Nada marah'}}))
    assert result['label']=='anger'
    assert result['review_needed'] is False
    assert parse_emotion(json.dumps({'emotion':{'label':'none','confidence':.5,'reason':'Ambigu'}}))['review_needed'] is True

@pytest.mark.parametrize('value', [True, '0.8', -1, 2, float('nan')])
def test_emotion_rejects_invalid_confidence(value):
    assert parse_emotion(json.dumps({'emotion':{'label':'joy','confidence':value,'reason':'Senang'}})) is None
