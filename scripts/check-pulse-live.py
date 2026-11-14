"""Explicit manual smoke check: --crawl spends provider quota (one run/topic)."""
import argparse
from pathlib import Path
import httpx

args = argparse.ArgumentParser()
args.add_argument('--crawl', action='store_true')
options = args.parse_args()
root = Path(__file__).resolve().parents[1]
credentials = dict(line.split('=', 1) for line in (root / 'server/.prototype-access').read_text().splitlines())
with httpx.Client(base_url='http://127.0.0.1:8000/api', timeout=120) as client:
    login = client.post('/auth/login', json={'nrp': credentials['NRP'], 'password': credentials['PASSWORD']})
    login.raise_for_status()
    client.headers['Authorization'] = 'Bearer ' + login.json()['access_token']
    bootstrap = client.post('/admin/pulse/bootstrap')
    bootstrap.raise_for_status()
    topics = client.get('/admin/pulse/topics')
    topics.raise_for_status()
    for topic in topics.json():
        if topic['label'] not in ('GERAK', 'Isu Penyadapan Presiden'):
            continue
        if options.crawl:
            result = client.post(f"/admin/pulse/topics/{topic['id']}/crawl")
            result.raise_for_status()
            print(topic['label'], 'crawl:', result.json())
        result = client.get('/admin/pulse/analytics', params={'topic_id': topic['id']})
        result.raise_for_status()
        data = result.json()
        print(topic['label'], 'mentions:', data.get('total_mentions'),
              'platforms:', data.get('platforms'), 'unknown location:', data.get('unknown_location_count'))
