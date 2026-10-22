// Shown on the creator onboarding page and accepted when applying. Bump the version when the
// text changes in a way creators must re-accept.
export const GUIDELINES_VERSION = '2026-10-v1';

export const CREATOR_GUIDELINES = {
  version: GUIDELINES_VERSION,
  summary: 'Premium posts are educational articles for Indian exam preparation. Every post is reviewed by a person before it goes live.',
  rules: [
    'Write original educational content for exam preparation (UPSC, SSC, banking, railways, state exams, engineering and similar). Do not copy from books, websites or other creators.',
    'Pick the correct category. Posts that do not match their category are rejected.',
    'Be accurate. Do not publish misleading facts, fake news, rumours or unverified "leaks".',
    'No spam: no keyword stuffing, repeated text, clickbait titles or posts written only to attract views.',
    'No promotion: no ads, coaching or product promotion, referral codes, contact numbers or links that sell something.',
    'No unsafe content: no hate, harassment, adult content, violence or anything illegal.',
    'Use images you created or have the right to use, and that relate to the post. AI images must be relevant and appropriate.',
    'Do not try to inflate views (refreshing, bots, paid traffic, asking people to view repeatedly). Such views are not paid and may lead to restriction.',
  ],
  enforcement: [
    'Each post is screened automatically and then approved or rejected by a reviewer. Approval is never automatic.',
    'A rejection with a confirmed policy violation counts as a violation: 1st = Warning 1, 2nd = Warning 2, 3rd and later = no premium submissions for 30 days.',
    'Violations do not expire, but you can appeal and an admin may overturn one.',
  ],
  earnings: [
    'Eligible views on approved, published premium posts earn ₹0.10 each. Your own views, repeat views within 24 hours and suspicious traffic do not count.',
    'Earnings are estimates until they clear fraud checks and can change.',
    'Creator Premium gives eligibility to earn, not guaranteed earnings.',
  ],
};
