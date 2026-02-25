import React from 'react';
import {
  Typography,
  Box,
  Paper,
  Alert,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { AgentStatus, CostData } from '../types';
import { CostDisplay } from './CostDisplay';

export interface StatusDisplayProps {
  status: AgentStatus | null;
  costData?: CostData | null;
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
 * StatusDisplay - React component that displays agent status and cost information
 * 
 * Features:
 * - Shows latest update time (formatted)
 * - Shows source channel (if exists)
 * - Shows session key (if exists)
 * - Cost tracking with model selection
 * - Uses MUI components
 */
export const StatusDisplay: React.FC<StatusDisplayProps> = ({ status, costData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!status && !costData) {
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
          Waiting for data...
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
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Status Section - Left */}
        {status ? (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              Status
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Last update time */}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Last Updated
                </Typography>
                <Typography variant="body2">
                  {formatTimestamp(status.ts)}
                </Typography>
              </Box>

              {/* Source channel (if exists) */}
              {status.source && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Source
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
          </Box>
        ) : (
          <Box sx={{ flex: 1 }}>
            <Alert severity="info">No status data available</Alert>
          </Box>
        )}

        {/* Divider - Vertical on desktop, horizontal on mobile */}
        {status && costData && (
          <Divider 
            orientation={isMobile ? 'horizontal' : 'vertical'} 
            flexItem 
            sx={{ mx: isMobile ? 0 : 1 }}
          />
        )}

        {/* Cost Section - Right */}
        {costData && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="h6" sx={{ color: 'primary.main' }}>
                Cost
              </Typography>
            </Box>
            <CostDisplay costData={costData} />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default StatusDisplay;