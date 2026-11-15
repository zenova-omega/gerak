/** The posts of one account. A row with an account_v1 `key` opens by that key, so every name the account posted under
 * is included; a row without one (an older link) opens by its exact name. */
export function accountPostsLink(search, account) {
  return postsEvidenceLink(search,account.key?{account:account.key,platform:account.platform}:{author:account.author,platform:account.platform});
}

export function postsEvidenceLink(search, filters={}) {
  const params = new URLSearchParams(search);
  for (const key of ['author','platform','sentiment','day','day_to','province','account']) params.delete(key);
  for (const key of ['author','platform','sentiment','day','day_to','province','account']) {
    if (filters[key]) params.set(key,filters[key]);
  }
  return '/pulse/posts?' + params.toString();
}

const NETWORK_VIEWS = ['network', 'origins', 'signals', 'map'];
/** The view of Jaringan a link asks for (`?focus=map` from the spread card on Ikhtisar); the account network when it names none. */
export function focusFromSearch(search) {
  const focus = new URLSearchParams(search || '').get('focus');
  return NETWORK_VIEWS.includes(focus) ? focus : 'network';
}
