import React from 'react';
import { Alert, AlertTitle, Box, Typography, Chip } from '@mui/material';
import { ConnectionState } from '../types';

export interface ConnectionIndicatorProps {
  connectionState: ConnectionState;
  devMode?: boolean;
}

/**
 * ConnectionIndicator - React component that displays connection status
 * 
 * Features:
 * - Shows connection status indicator
 * - Shows failure count (development mode)
 * - Shows connection error message (failures >= 3)
 * - Uses MUI Alert component
 * 
 * Requirements: 3.4, 7.4
 */
export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
  connectionState,
  devMode = false,
}) => {
  const { connected, failureCount } = connectionState;

  // No error state when connected
  if (connected) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Failure count in dev mode */}
        {devMode && failureCount > 0 && (
          <Typography variant="caption" color="text.secondary">
            (Failures: {failureCount})
          </Typography>
        )}
      </Box>
    );
  }

  // Disconnected state with error message
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Connection error alert */}
      <Alert
        severity="error"
        sx={{
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
      >
        <AlertTitle>Connection Failed</AlertTitle>
        Unable to connect to R2 storage. Please check your network or R2 configuration.
        {devMode && (
          <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>
            Consecutive failures: {failureCount}
          </Typography>
        )}
      </Alert>

      {/* Failure count indicator */}
      {devMode && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label="Offline"
            color="error"
            size="small"
            sx={{ fontWeight: 500 }}
          />
          <Typography variant="caption" color="text.secondary">
            Reconnecting...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ConnectionIndicator;