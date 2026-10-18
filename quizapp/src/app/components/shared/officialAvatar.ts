import meenzoAvatar from '../../../assets/meenzo-avatar.png';

// Official (admin) posts — e.g. the Meenzo AI posts — often have no author avatar.
// Show the Meenzo logo for them instead of the first-letter fallback.

export const isOfficialPost = (post: { userType?: string; author?: { role?: string } }) =>
  post.userType === 'admin' || post.author?.role === 'admin';

export function withOfficialAvatar<A extends { avatar?: string }>(author: A, official: boolean): A {
  return official && !author.avatar ? { ...author, avatar: meenzoAvatar } : author;
}
