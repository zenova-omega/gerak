import { useContext } from 'react';
import PostAvatar from './PostAvatar';
import { ProjectPostsContext } from '../../../pulse/projectPosts';
import { accountPhoto } from '../../../lib/pulseAccountPhoto';
import { accountKey } from '../../../lib/pulseMeasures';

// One index per loaded post list: an account's name to the picture any of its posts carries. The caller knows a name and
// a platform only, so the name is read as account_v1 reads one (no id); a post without a name gives no key.
const indexes = new WeakMap();
const keyOf = (platform, author) => accountKey({ platform, author });
function pictures(posts) {
  if (!indexes.has(posts)) {
    const index = new Map();
    for (const post of posts) {
      const key = keyOf(post.platform, post.author);
      if (key && !index.has(key)) { const url = accountPhoto(post); if (url) index.set(key, url); }
    }
    indexes.set(posts, index);
  }
  return indexes.get(posts);
}

/** The one way an account is shown anywhere in PULSE: a round picture (initials when none is known) with the
 * platform mark at the lower right. Pass `photo` when the caller knows it; otherwise the picture is looked up
 * among the project's loaded posts by platform and name.
 * @param {{author?: string, platform?: string, photo?: string|null, size?: 'md'|'sm'|'xs', eager?: boolean}} props */
export default function AccountAvatar({ author, platform, photo, size = 'md', eager = false }) {
  const posts = useContext(ProjectPostsContext);
  const found = photo || (Array.isArray(posts) ? pictures(posts).get(keyOf(platform, author)) : null) || null;
  return <PostAvatar size={size} eager={eager} post={{ author: author || '', platform, profile_image_url: found }} />;
}
