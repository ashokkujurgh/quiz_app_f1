import { InfoPage, InfoSection } from '../shared/InfoPage';

const CONTACT_EMAIL = 'info@meenzo.com';

export function PrivacyPolicyPage() {
  return (
    <InfoPage
      title="Privacy Policy"
      path="/privacy-policy"
      updated="18 October 2026"
      description="How Meenzo collects, uses, shares and protects your information, and the choices you have."
    >
      <InfoSection title="Overview">
        <p>
          This Privacy Policy explains what information Meenzo (“we”, “us”) collects when you use meenzo.com
          and our apps, how we use and share it, and the choices you have. By using Meenzo you agree to this
          policy. If you do not agree, please do not use the service.
        </p>
      </InfoSection>

      <InfoSection title="Information you give us">
        <ul>
          <li><strong>Account details</strong> — your name, username, email address and password (we store only a secure hash of your password, never the password itself). If you sign in with Google, we receive your name, email address and profile picture from Google.</li>
          <li><strong>Profile</strong> — an optional profile photo, cover image and bio.</li>
          <li><strong>Content</strong> — posts, comments, images you upload, likes, saves and shares.</li>
          <li><strong>Messages and friends</strong> — your friend list, friend requests and the messages you send to other users.</li>
          <li><strong>Quiz activity</strong> — the games and quizzes you play, your answers, scores, rankings and history.</li>
          <li><strong>Communications</strong> — anything you send us by email, such as support requests.</li>
        </ul>
      </InfoSection>

      <InfoSection title="Information collected automatically">
        <ul>
          <li><strong>Usage and device data</strong> — pages you visit, features you use, approximate location derived from your IP address, browser and device type. We use Google Analytics for this, which uses cookies.</li>
          <li><strong>Online status</strong> — while you are signed in, other users can see whether you are online.</li>
          <li><strong>Notification tokens</strong> — if you allow notifications, a device token so we can send you push notifications.</li>
          <li><strong>Sign-in data stored on your device</strong> — we keep a sign-in token in your browser’s local storage and a secure, HTTP-only cookie so you stay signed in.</li>
        </ul>
      </InfoSection>

      <InfoSection title="How we use your information">
        <ul>
          <li>To create and run your account and provide Meenzo’s features — games, leaderboards, posts, comments, friends and messages.</li>
          <li>To send you service emails, such as email verification and password reset, and notifications you have enabled.</li>
          <li>To keep Meenzo safe: we check posts and uploaded images for topic relevance and harmful content, and remove content that breaks our rules.</li>
          <li>To understand how Meenzo is used, fix problems and improve the service.</li>
          <li>To respond to your questions and requests.</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </InfoSection>

      <InfoSection title="What other people can see">
        <p>
          Your name, username, profile photo, posts, comments, likes, game scores and leaderboard positions
          may be visible to other users, and published posts may appear in search engines. Messages are
          visible only to the people in the conversation.
        </p>
      </InfoSection>

      <InfoSection title="Service providers we share data with">
        <p>We share information only as needed to run Meenzo, with providers that process it on our behalf:</p>
        <ul>
          <li><strong>Cloudflare</strong> — content delivery and security for our website.</li>
          <li><strong>DigitalOcean</strong> — storage of uploaded and generated images.</li>
          <li><strong>Google (Firebase and Google Analytics)</strong> — Google sign-in, push notifications and usage analytics.</li>
          <li><strong>OpenAI</strong> — automated checks of posts and uploaded images for safety and topic relevance, and generation of some learning content.</li>
          <li><strong>Hostinger</strong> — sending our emails.</li>
        </ul>
        <p>
          We may also disclose information if required by law, to protect the rights and safety of our users
          or the public, or as part of a merger or sale of the service.
        </p>
      </InfoSection>

      <InfoSection title="Cookies">
        <p>
          We use cookies and similar technologies to keep you signed in, remember preferences such as dark
          mode, and measure usage with Google Analytics. You can block or delete cookies in your browser
          settings; some features, such as staying signed in, may then stop working.
        </p>
      </InfoSection>

      <InfoSection title="How long we keep data">
        <p>
          We keep your information for as long as your account is active. If you ask us to delete your
          account, we delete or anonymise your personal information within a reasonable period, except where
          we must keep it to meet legal obligations, resolve disputes or prevent abuse.
        </p>
      </InfoSection>

      <InfoSection title="Your choices and rights">
        <ul>
          <li>You can view and update your profile information in the app.</li>
          <li>You can turn off notifications in your device or browser settings.</li>
          <li>
            You can ask us for a copy of your personal information, ask us to correct it, or ask us to delete
            your account by emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the email
            address linked to your account.
          </li>
        </ul>
      </InfoSection>

      <InfoSection title="Security">
        <p>
          We use encrypted connections (HTTPS), hashed passwords and access controls to protect your
          information. No online service can be perfectly secure, so please use a strong, unique password.
        </p>
      </InfoSection>

      <InfoSection title="Children">
        <p>
          Meenzo is intended for students and learners. If you are under 18, please use Meenzo with the
          permission and guidance of a parent or guardian. If you believe a child has given us personal
          information without appropriate consent, contact us and we will delete it.
        </p>
      </InfoSection>

      <InfoSection title="Changes to this policy">
        <p>
          We may update this policy from time to time. We will change the “Last updated” date above and, for
          significant changes, let you know in the app or by email.
        </p>
      </InfoSection>

      <InfoSection title="Contact us">
        <p>
          Questions or requests about your privacy? Email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
