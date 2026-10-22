import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { api, rupees } from '../../../utils/monetization';
import { EarningsChart, type SeriesPoint } from '../../monetization/EarningsChart';
import { RangePicker, defaultRange, type Range } from '../../monetization/RangePicker';

/** /creator/posts/:id/analytics?post=<public post id> */
export function PostAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const publicId = params.get('post');
  const [title, setTitle] = useState('');
  const [range, setRange] = useState<Range>(defaultRange());
  const [data, setData] = useState<{ series: SeriesPoint[]; totals: { eligibleViews: number; earnedPaise: number }; disclaimer: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { if (id) api<{ post: { draft: { title: string } } }>(`/api/posts/premium/${id}`).then((d) => setTitle(d.post.draft.title)).catch(() => undefined); }, [id]);
  useEffect(() => {
    if (!publicId) return;
    const q = new URLSearchParams({ from: range.from, to: range.to, granularity: range.granularity, postId: publicId });
    api<{ analytics: NonNullable<typeof data> }>(`/api/creator/earnings/analytics?${q}`).then((d) => { setData(d.analytics); setError(''); }).catch((e) => setError(e.message));
  }, [publicId, range]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box><Typography variant="h5" fontWeight={800}>Post analytics</Typography><Typography color="text.secondary">{title}</Typography></Box>
        <Button onClick={() => navigate('/creator')}>Back</Button>
      </Stack>
      {!publicId && <Alert severity="info">Analytics appear once the post has been approved and published.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {publicId && (
        <Card variant="outlined">
          <CardContent>
            <RangePicker value={range} onChange={setRange} />
            {data && (
              <>
                <Stack direction="row" spacing={4} my={2}>
                  <Box><Typography variant="caption" color="text.secondary">Eligible views</Typography><Typography variant="h6" fontWeight={800}>{data.totals.eligibleViews.toLocaleString('en-IN')}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Earned (estimated)</Typography><Typography variant="h6" fontWeight={800}>{rupees(data.totals.earnedPaise)}</Typography></Box>
                </Stack>
                <EarningsChart series={data.series} />
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>{data.disclaimer}</Typography>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
