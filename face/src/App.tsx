import { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Typography, Box, Container, Paper, Divider } from '@mui/material';
import { useStatusPolling } from './hooks/useStatusPolling';
import { HeartbeatCanvas } from './components/HeartbeatCanvas';
import { StatusDisplay } from './components/StatusDisplay';
import { ConnectionIndicator } from './components/ConnectionIndicator';
import { R2_PUBLIC_URL } from './config';

// Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4caf50',
    },
    secondary: {
      main: '#f44336',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

function App() {
  // Use status polling hook (Requirement 3.1)
  const { status, connectionState } = useStatusPolling(R2_PUBLIC_URL);

  // Development mode for showing extra debug info
  const [devMode] = useState(() => import.meta.env?.dev === true || import.meta.env?.MODE === 'development');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ py: { xs: 1, sm: 1, md: 2 } }}>
        {/* Header */}
        <Box sx={{ mb: { xs: 3, sm: 4 }, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontSize: { xs: '2rem', sm: '2.5rem' } }}>
            OpenClaw Face
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            Agent status visualization dashboard
          </Typography>
        </Box>

        {/* Connection indicator (Requirements 3.4, 7.4) */}
        <Box>
          <ConnectionIndicator connectionState={connectionState} devMode={devMode} />
        </Box>

        {/* Main content */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            backgroundColor: 'background.paper',
            borderRadius: { xs: 1, sm: 2 },
            mx: { xs: 1, sm: 0 },
          }}
        >
          {/* Heartbeat canvas (Requirements 4.1, 4.5, 4.6) */}
          <Box sx={{ mb: 0, display: 'flex', justifyContent: 'center' }}>
            <HeartbeatCanvas
              status={status}
              connectionState={connectionState}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Status display (Requirements 4.5, 4.6) */}
          <StatusDisplay status={status} />
        </Paper>

        {/* Footer */}
        <Box sx={{ mt: { xs: 3, sm: 4 }, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            Powered by Cloudflare R2 + p5.js
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;