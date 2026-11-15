export function accountPostsLink(search, account) {
  return postsEvidenceLink(search,{author:account.author,platform:account.platform});
}

export function postsEvidenceLink(search, filters={}) {
  const params = new URLSearchParams(search);
  for (const key of ['author','platform','sentiment','day','day_to','province']) params.delete(key);
  for (const key of ['author','platform','sentiment','day','day_to','province']) {
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
