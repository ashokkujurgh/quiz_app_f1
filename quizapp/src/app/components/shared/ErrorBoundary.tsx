import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="60vh"
        p={3}
      >
        <Paper
          elevation={0}
          sx={{
            p: 5,
            maxWidth: 480,
            textAlign: 'center',
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <ErrorOutline sx={{ fontSize: 56, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={800} mb={1}>
            Something went wrong
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={1}>
            An unexpected error occurred. Try refreshing the page.
          </Typography>
          {this.state.error && (
            <Typography
              variant="caption"
              color="text.disabled"
              component="pre"
              sx={{
                mt: 1, mb: 3, p: 1.5,
                bgcolor: 'action.hover',
                borderRadius: 2,
                textAlign: 'left',
                overflowX: 'auto',
                display: 'block',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error.message}
            </Typography>
          )}
          <Box display="flex" gap={2} justifyContent="center">
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
            <Button variant="outlined" onClick={this.reset}>
              Try Again
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }
}
