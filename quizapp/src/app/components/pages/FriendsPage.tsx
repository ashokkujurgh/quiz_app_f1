import { Box, Typography, Tabs, Tab, Stack } from '@mui/material';
import { useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { FriendCard } from '../shared/FriendCard';
import { EmptyState } from '../shared/EmptyState';
import { People } from '@mui/icons-material';

export function FriendsPage() {
  const [tab, setTab] = useState(0);
  const friends = useAppSelector((s) => s.friends.friends);

  const myFriends = friends.filter((f) => f.status === 'friend');
  const requests = friends.filter((f) => f.status === 'pending_received');
  const sent = friends.filter((f) => f.status === 'pending_sent');
  const suggested = friends.filter((f) => f.status === 'suggested');

  const sections = [
    { label: `Friends (${myFriends.length})`, data: myFriends },
    { label: `Requests (${requests.length})`, data: requests },
    { label: `Sent (${sent.length})`, data: sent },
    { label: `Suggested (${suggested.length})`, data: suggested },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} mb={2}>Friends</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        {sections.map(({ label }) => (
          <Tab key={label} label={label} sx={{ fontWeight: 600 }} />
        ))}
      </Tabs>
      {sections[tab].data.length === 0 ? (
        <EmptyState
          icon={People}
          title="Nothing here"
          description="There's nothing to show in this section."
        />
      ) : (
        <Stack spacing={0}>
          {sections[tab].data.map((f) => (
            <FriendCard key={f.id} friend={f} />
          ))}
        </Stack>
      )}
    </Box>
  );
}
