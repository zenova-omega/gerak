"""Explicit, bounded collection via the authenticated local API; no passwords in logs."""
import json
from pathlib import Path
import httpx

root = Path(__file__).resolve().parents[1]
credentials = dict(line.split('=', 1) for line in (root / 'server/.prototype-access').read_text().splitlines())
with httpx.Client(base_url='http://127.0.0.1:8000/api', timeout=150) as client:
    login = client.post('/auth/login', json={'nrp': credentials['NRP'], 'password': credentials['PASSWORD']})
    if login.status_code != 200:
        raise SystemExit(f'Local authentication failed: {login.status_code}')
    client.headers['Authorization'] = 'Bearer ' + login.json()['access_token']
    response = client.post('/admin/pulse/topics/pulse-penyadapan-presiden/comments')
    if response.status_code != 200:
        raise SystemExit(f'Collection failed: {response.status_code}')
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))
