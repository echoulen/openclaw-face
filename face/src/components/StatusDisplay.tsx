import React from 'react';
import { Typography, Box, Paper } from '@mui/material';
import { AgentStatus } from '../types';

export interface StatusDisplayProps {
  status: AgentStatus | null;
}

/**
 * Format timestamp to readable date string
 */
const formatTimestamp = (ts: number): string => {
  if (!ts) return 'N/A';
  const date = new Date(ts);
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

/**
 * StatusDisplay - React component that displays agent status information
 * 
 * Features:
 * - Shows latest update time (formatted)
 * - Shows source channel (if exists)
 * - Shows session key (if exists)
 * - Uses MUI Typography components
 * 
 * Requirements: 4.5, 4.6
 */
export const StatusDisplay: React.FC<StatusDisplayProps> = ({ status }) => {
  if (!status) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          backgroundColor: 'rgba(158, 158, 158, 0.1)',
          borderRadius: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          等待狀態資料...
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 1,
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Last update time */}
        <Box>
          <Typography variant="caption" color="text.secondary">
            更新時間
          </Typography>
          <Typography variant="body2">
            {formatTimestamp(status.ts)}
          </Typography>
        </Box>

        {/* Source channel (if exists) */}
        {status.source && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              來源
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {status.source}
            </Typography>
          </Box>
        )}

        {/* Session key (if exists) */}
        {status.sessionKey && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              Session
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                wordBreak: 'break-all',
              }}
            >
              {status.sessionKey}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default StatusDisplay;