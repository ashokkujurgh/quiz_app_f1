import { useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Email } from '@mui/icons-material';
import { InfoPage, InfoSection } from '../shared/InfoPage';

const CONTACT_EMAIL = 'info@meenzo.com';
const TOPICS = ['General question', 'Account help', 'Report content or a user', 'Report a mistake in a question or post', 'Privacy request', 'Partnership'];

export function ContactPage() {
  const [topic, setTopic]     = useState(TOPICS[0]);
  const [message, setMessage] = useState('');

  // Opens the visitor's own email app with the message filled in — nothing is sent by the site itself.
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`[Meenzo] ${topic}`)}&body=${encodeURIComponent(message)}`;

  return (
    <InfoPage
      title="Contact Us"
      path="/contact"
      description="Get in touch with the Meenzo team for help with your account, to report content, or for privacy requests."
    >
      <InfoSection title="Email us">
        <p>
          The quickest way to reach the Meenzo team is by email. We read every message and aim to reply
          within a few working days.
        </p>
        <Button
          variant="contained"
          startIcon={<Email />}
          href={`mailto:${CONTACT_EMAIL}`}
          sx={{ mt: 0.5, mb: 1.5 }}
        >
          {CONTACT_EMAIL}
        </Button>
      </InfoSection>

      <InfoSection title="Write your message">
        <Typography variant="body2" color="text.secondary" mb={2}>
          Pick a topic and write your message — this opens your email app with everything filled in.
        </Typography>
        <Stack spacing={2}>
          <TextField select label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} fullWidth>
            {TOPICS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            multiline
            minRows={5}
            fullWidth
            placeholder="How can we help? For account issues, write from the email address linked to your account."
          />
          <Box>
            <Button variant="outlined" href={mailto} disabled={!message.trim()}>
              Open in email app
            </Button>
          </Box>
        </Stack>
      </InfoSection>

      <InfoSection title="Before you write">
        <ul>
          <li><strong>Forgot your password?</strong> Use “Forgot password?” on the sign-in page to get a reset link.</li>
          <li><strong>Found a wrong answer?</strong> Tell us the quiz or post and what is wrong — we fix mistakes quickly.</li>
          <li><strong>Privacy requests</strong> (a copy of your data or deleting your account) — see our Privacy Policy, then email us from your account’s email address.</li>
        </ul>
      </InfoSection>
    </InfoPage>
  );
}
