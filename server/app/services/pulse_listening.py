"""Evidence rules for stored-data listening. No provider calls on reads."""
import json
import math

from .pulse_spikes import MINIMUM_RATIO, RULE_ID, find_spikes


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


# The `volume_spike` alert reads one conversation group in windows of 30 minutes over six hours: the window that
# just ended and the eleven before it. Fewer than ten posts in half an hour are too few to raise an alert for.
SPIKE_WINDOW_MINUTES = 30
SPIKE_WINDOWS = 12
SPIKE_MINIMUM_POSTS = 10


def spike_evidence(windows):
    """What a `volume_spike` alert stores, or None when the latest window is not a spike.

    `windows` is the group's posts per 30 minutes, oldest first; the last number is the window that just ended and the
    others are its baseline. The decision is the product's one spike rule (pulse_spikes.find_spikes) with a floor of
    ten posts, so an alert and a mark on the trend chart mean the same thing. `ratio` is the latest window against the
    usual one, or None when the usual window is empty. Alerts stored before 15 Nov 2026 carry `volume_spike_v1` and
    `previous_posts` instead: at least three times the 30 minutes before."""
    latest = len(windows) - 1
    # Every spike, not the chart's highest three: three higher windows earlier in the six hours do not make this one less.
    spike = next((found for found in find_spikes(windows, SPIKE_MINIMUM_POSTS, most=None) if found['index'] == latest), None)
    if spike is None:
        return None
    return {'rule': RULE_ID, 'posts': spike['value'], 'usual_posts': spike['usual'],
            'ratio': None if spike['times'] is None else round(spike['times'], 2),
            'window_minutes': SPIKE_WINDOW_MINUTES, 'baseline_windows': latest,
            'minimum_posts': SPIKE_MINIMUM_POSTS, 'minimum_ratio': MINIMUM_RATIO,
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
