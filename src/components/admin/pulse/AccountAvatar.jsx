import { useContext } from 'react';
import PostAvatar from './PostAvatar';
import { ProjectPostsContext } from '../../../pulse/projectPosts';
import { accountPhoto } from '../../../lib/pulseAccountPhoto';

// One index per loaded post list: "platform|name" to the picture any of that account's posts carries.
const indexes = new WeakMap();
const keyOf = (platform, author) => `${platform || ''}|${String(author || '').trim().replace(/^@/, '').toLowerCase()}`;
function pictures(posts) {
  if (!indexes.has(posts)) {
    const index = new Map();
    for (const post of posts) {
      const key = keyOf(post.platform, post.author);
      if (!index.has(key)) { const url = accountPhoto(post); if (url) index.set(key, url); }
    }
    indexes.set(posts, index);
  }
  return indexes.get(posts);
}

/** The one way an account is shown anywhere in PULSE: a round picture (initials when none is known) with the
 * platform mark at the lower right. Pass `photo` when the caller knows it; otherwise the picture is looked up
 * among the project's loaded posts by platform and name.
 * @param {{author?: string, platform?: string, photo?: string|null, size?: 'md'|'sm'|'xs'}} props */
export default function AccountAvatar({ author, platform, photo, size = 'md' }) {
  const posts = useContext(ProjectPostsContext);
  const found = photo || (Array.isArray(posts) ? pictures(posts).get(keyOf(platform, author)) : null) || null;
  return <PostAvatar size={size} post={{ author: author || '', platform, profile_image_url: found }} />;
}
