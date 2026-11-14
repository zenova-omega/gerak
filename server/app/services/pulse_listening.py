"""Evidence rules for stored-data listening. No provider calls on reads."""
import json
import math


def parse_emotion(raw):
    """Optional independent text emotion; never derive it from polarity."""
    try:
        value = json.loads(raw).get('emotion')
        if not isinstance(value, dict) or value.get('label') not in (
                'joy', 'anger', 'sadness', 'fear', 'disgust', 'admiration', 'none'):
            return None
        confidence = value.get('confidence')
        if isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or not math.isfinite(confidence) or not 0 <= confidence <= 1:
            return None
        reason = value.get('reason')
        if not isinstance(reason, str) or not reason.strip():
            return None
        return {'label': value['label'], 'confidence': confidence, 'reason': reason[:500],
                'review_needed': confidence < .7 or value.get('review_needed') is True}
    except (ValueError, AttributeError, TypeError):
        return None


def spike_evidence(current, previous):
    if current < 10 or previous < 1 or current < previous * 3:
        return None
    return {'rule': 'volume_spike_v1', 'posts': current, 'previous_posts': previous,
            'ratio': round(current / previous, 2), 'window_minutes': 30,
            'minimum_posts': 10, 'minimum_ratio': 3,
            'note': 'Volume posting teramati, bukan seluruh percakapan sosial. Perubahan cakupan crawl dapat memengaruhi hasil.'}


def parse_sentiment(raw):
    try:
        value = json.loads(raw)
        label, confidence = value['label'], value['confidence']
        if label not in ('positive', 'neutral', 'negative'):
            raise ValueError('Invalid sentiment label')
        if isinstance(confidence, bool) or not isinstance(confidence, (float, int)) or not math.isfinite(confidence) or not 0 <= confidence <= 1:
            raise ValueError('Invalid confidence')
        reason = value.get('reason', '')
        if not isinstance(reason, str):
            raise ValueError('Invalid reason')
        return {'label': label, 'confidence': confidence, 'reason': reason[:500]}
    except (KeyError, TypeError, json.JSONDecodeError) as error:
        raise ValueError('Invalid sentiment response') from error
