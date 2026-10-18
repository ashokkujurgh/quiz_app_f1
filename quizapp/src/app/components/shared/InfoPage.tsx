import type { ReactNode } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';

// Shared layout for static pages (About, Privacy Policy, Contact).

export function InfoPage({ title, description, path, updated, children }: {
  title: string;
  description: string;
  path: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <Box sx={{ maxWidth: 820, mx: 'auto', pb: 4 }}>
      <Helmet>
        <title>{`${title} — Meenzo`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://meenzo.com${path}`} />
      </Helmet>
      <Typography variant="h4" fontWeight={800} mb={0.5}>{title}</Typography>
      {updated && (
        <Typography variant="body2" color="text.secondary" mb={3}>Last updated: {updated}</Typography>
      )}
      <Card sx={{ mt: updated ? 0 : 3 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>{children}</CardContent>
      </Card>
    </Box>
  );
}

export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="section" sx={{ '&:not(:last-of-type)': { mb: 3.5 } }}>
      <Typography variant="h6" fontWeight={700} mb={1.25}>{title}</Typography>
      <Box sx={{ color: 'text.secondary', '& p': { m: 0, mb: 1.25, lineHeight: 1.7 }, '& ul': { m: 0, mb: 1.25, pl: 3 }, '& li': { mb: 0.75, lineHeight: 1.65 }, '& a': { color: 'secondary.dark', fontWeight: 600 } }}>
        {children}
      </Box>
    </Box>
  );
}
