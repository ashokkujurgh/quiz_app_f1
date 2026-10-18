import { Box, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router';
import { InfoPage, InfoSection } from '../shared/InfoPage';

export function AboutPage() {
  const navigate = useNavigate();
  return (
    <InfoPage
      title="About Us"
      path="/about"
      description="Meenzo helps Indian students and job seekers prepare for GATE, PSU, SSC, Banking, Police and Government exams and campus placements with daily quizzes and study posts."
    >
      <InfoSection title="What is Meenzo?">
        <p>
          Meenzo is a social quiz and learning platform built for Indian students and job seekers — whether
          you are preparing for GATE and PSU jobs, SSC and State SSC, banking, police, State or Central
          Government exams, or campus placements at private companies. We believe learning sticks best when it is short, regular and a little bit competitive —
          so Meenzo turns study into daily games you can play, share and win with friends.
        </p>
      </InfoSection>

      <InfoSection title="What you can do on Meenzo">
        <ul>
          <li><strong>Play daily games</strong> — new quiz games every day, open all day from midnight to midnight IST, across engineering subjects and general knowledge, with a live leaderboard.</li>
          <li><strong>Practise any topic</strong> — engineering (GATE), Indian history, geography, polity and economy, general science and GK, aptitude, reasoning and English, and programming — at your own pace.</li>
          <li><strong>Learn from short posts</strong> — read clear, textbook-style explainers on history, science, polity, economy, engineering and more.</li>
          <li><strong>Learn together</strong> — add friends, share posts, comment, message and compare scores.</li>
          <li><strong>Track your progress</strong> — see your game history, scores and how you rank over time.</li>
        </ul>
      </InfoSection>

      <InfoSection title="How we create content">
        <p>
          Some quiz questions, learning posts and cover images on Meenzo are produced with the help of AI
          tools. AI-generated images are labelled, and learning posts are written to stick to established,
          textbook-level knowledge and are reviewed by our team before they are published. If you spot a
          mistake, please tell us — we fix errors as soon as we can.
        </p>
      </InfoSection>

      <InfoSection title="Our community">
        <p>
          Meenzo is a place to learn and compete respectfully. Posts are checked for topic relevance and
          safety, and we remove content that is abusive, hateful, explicit or misleading.
        </p>
      </InfoSection>

      <Box mt={4}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button variant="contained" onClick={() => navigate('/quizzes')}>Play today's games</Button>
          <Button variant="outlined" onClick={() => navigate('/contact')}>Contact us</Button>
        </Stack>
      </Box>
    </InfoPage>
  );
}
