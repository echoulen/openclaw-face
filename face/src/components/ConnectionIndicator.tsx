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
            (失敗次數: {failureCount})
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
        <AlertTitle>連線失敗</AlertTitle>
        無法連線到 R2 儲存服務。請檢查網路連線或 R2 設定。
        {devMode && (
          <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>
            連續失敗次數: {failureCount} 次
          </Typography>
        )}
      </Alert>

      {/* Failure count indicator */}
      {devMode && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label="離線"
            color="error"
            size="small"
            sx={{ fontWeight: 500 }}
          />
          <Typography variant="caption" color="text.secondary">
            嘗試重新連線中...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ConnectionIndicator;