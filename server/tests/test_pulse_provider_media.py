"""Pure normalization tests: run with unittest, never shared DB fixtures."""
import unittest
from app.services.ingest.xpoz import normalize_social_posts, SOCIAL_FIELDS


class ProviderMediaTests(unittest.TestCase):
    def test_instagram_media_and_identity_preserve_caption_and_counts(self):
        row = dict(id='1', username='real.user', codeUrl='https://instagram.com/p/Ab_1/?track=1',
                   caption='Original caption', likeCount=0, commentCount=2,
                   imageUrl='https://cdn.example.com/photo.jpg?sig=a%2Bb#fragment',
                   profilePicUrl='https://cdn.example.com/avatar.jpg', mediaType='IMAGE')
        item = normalize_social_posts('instagram', [row])[0]
        self.assertEqual(item['text'], 'Original caption')
        self.assertEqual(item['url'], 'https://www.instagram.com/p/Ab_1/')
        self.assertEqual(item['metrics'], dict(likes=0, comments=2, engagement=2,
            media_url='https://cdn.example.com/photo.jpg?sig=a%2Bb',
            profile_image_url='https://cdn.example.com/avatar.jpg', media_type='image', author_username='real.user',
            provider_post_id='1'))  # kept so comments can be requested by the provider's own id
        self.assertTrue({'imageUrl', 'profilePicUrl', 'mediaType'} <= set(SOCIAL_FIELDS['instagram'].split(',')))

    def test_tiktok_thumbnail_and_canonical_link(self):
        item = normalize_social_posts('tiktok', [dict(id='123', username='real.user', description='Original',
            videoThumbnail='https://cdn.example.com/thumb.jpg')])[0]
        self.assertEqual(item['url'], 'https://www.tiktok.com/@real.user/video/123')
        self.assertEqual(item['metrics']['media_url'], 'https://cdn.example.com/thumb.jpg')
        self.assertEqual(item['metrics']['media_type'], 'video')
        self.assertIn('videoThumbnail', SOCIAL_FIELDS['tiktok'].split(','))

    def test_unsafe_media_is_omitted_without_discarding_post(self):
        for url in [None, {}, 'http://cdn.example.com/a', 'data:image/png,abc',
                    'https://user:pass@cdn.example.com/a', 'https://localhost/a',
                    'https://127.0.0.1/a', 'https://2130706433/a', 'https://[::1]/a',
                    'https://10.1.2.3/a', 'https://cdn.local/a', 'https://cdn.internal/a',
                    'https://cdn.example.com:8443/a', 'https://cdn.example.com/\nx']:
            with self.subTest(url=url):
                item = normalize_social_posts('instagram', [dict(codeUrl='https://instagram.com/p/abc/', imageUrl=url, profilePicUrl=url)])[0]
                self.assertNotIn('media_url', item['metrics'])
                self.assertNotIn('profile_image_url', item['metrics'])

    def test_legacy_and_invalid_usernames_do_not_invent_media_or_profiles(self):
        for username in ['Display Name', 'bad..name', '.bad', 'bad.', 'a' * 31, None]:
            item = normalize_social_posts('instagram', [dict(codeUrl='https://instagram.com/p/abc/', username=username)])[0]
            self.assertNotIn('author_username', item['metrics'])
            self.assertNotIn('media_url', item['metrics'])
        self.assertEqual(normalize_social_posts('tiktok', [dict(id='123', username='bad..name')]), [])


if __name__ == '__main__':
    unittest.main()
