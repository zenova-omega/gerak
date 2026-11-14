export function accountPostsLink(search, account) {
  return postsEvidenceLink(search,{author:account.author,platform:account.platform});
}

export function postsEvidenceLink(search, filters={}) {
  const params = new URLSearchParams(search);
  for (const key of ['author','platform','sentiment','day']) params.delete(key);
  for (const key of ['author','platform','sentiment','day']) {
    if (filters[key]) params.set(key,filters[key]);
  }
  return '/pulse/posts?' + params.toString();
}
