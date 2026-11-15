"""YouTube hands the commenter's picture in the same answer as the comment. It is kept with the comment, as a link only.

Written by the session that restyled the comment cards, which by accident replaced an earlier file of this name while
another session was building the server side. The cases follow that session's contract: the field is
`profile_image_url` and the link is checked by `_public_image_url`. That session may replace this file with its own."""
import httpx
import pytest

from app.services import pulse_comments as service

PHOTO = 'https://yt3.ggpht.com/ytc/AIdro_kXq2Zc3mJtYQ0gq1mZ2bJ1x3o9l7b7c8d9e0f1g2h3i4j=s48-c-k-c0x00ffffff-no-rj'


def thread(comment_id, **snippet):
    return {'snippet': {'topLevelComment': {'id': comment_id, 'snippet': {'textDisplay': 'teks', 'authorDisplayName': '@' + comment_id, **snippet}}}}


def answering(monkeypatch, items):
    original = httpx.AsyncClient
    monkeypatch.setattr(service.httpx, 'AsyncClient', lambda **kw: original(
        transport=httpx.MockTransport(lambda request: httpx.Response(200, json={'items': items})), **kw))


@pytest.mark.asyncio
@pytest.mark.parametrize('fetch', [service.fetch_comments, service.fetch_all_comments])
async def test_youtube_comment_keeps_the_picture_link_it_came_with(monkeypatch, fetch):
    answering(monkeypatch, [thread('a', authorProfileImageUrl=PHOTO, likeCount=2), thread('b', likeCount=1)])
    result = await fetch('abc123', 'test-key')
    by_id = {row['id']: row for row in result['items']}
    assert by_id['a']['profile_image_url'] == PHOTO
    assert 'profile_image_url' not in by_id['b'], 'a comment without a picture stores no empty field'


@pytest.mark.asyncio
@pytest.mark.parametrize('fetch', [service.fetch_comments, service.fetch_all_comments])
@pytest.mark.parametrize('bad', [
    'http://yt3.ggpht.com/a=s48',                      # not https
    'https://user:pw@yt3.ggpht.com/a=s48',             # credentials in the link
    'https://yt3.ggpht.com/a b',                       # whitespace
    'https://localhost/a.jpg', 'https://10.0.0.8/a.jpg',   # not a public name
    'javascript:alert(1)', {'bad': True}, ['x'], 7, '', 'https://yt3.ggpht.com/' + 'a' * 9000,
])
async def test_a_picture_link_that_is_not_a_plain_public_link_is_dropped(monkeypatch, fetch, bad):
    answering(monkeypatch, [thread('a', authorProfileImageUrl=bad)])
    result = await fetch('abc123', 'test-key')
    assert result['status'] == 'success'
    assert 'profile_image_url' not in result['items'][0]


@pytest.mark.asyncio
async def test_the_newer_picture_host_is_accepted(monkeypatch):
    link = 'https://yt3.googleusercontent.com/abcDEF_-123=s88-c-k-c0x00ffffff-no-rj'
    answering(monkeypatch, [thread('a', authorProfileImageUrl=link)])
    assert (await service.fetch_comments('abc123', 'test-key'))['items'][0]['profile_image_url'] == link
