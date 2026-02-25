import React, { useState, useMemo } from 'react';
import {
  Typography,
  Box,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Collapse,
  IconButton,
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { CostData } from '../types';

export interface CostDisplayProps {
  costData: CostData | null;
}

/**
 * Format cost to USD string
 */
const formatCost = (cost: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(cost);
};

/**
 * Format timestamp to readable date string
 */
const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
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
 * CostDisplay - React component that displays cost information
 * 
 * Features:
 * - Shows total cost and individual model costs
 * - Dropdown selector for "All" or specific models
 * - Shows token usage and message count
 * - Uses MUI components for consistent styling
 */
export const CostDisplay: React.FC<CostDisplayProps> = ({ costData }) => {
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [tokenUsageExpanded, setTokenUsageExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  // Get list of available models from cost data
  const availableModels = useMemo(() => {
    if (!costData?.models) return [];
    return Object.keys(costData.models).filter(model => 
      !model.includes('delivery-mirror')
    );
  }, [costData]);

  // Calculate display cost based on selection
  const displayData = useMemo(() => {
    if (!costData) return null;

    if (selectedModel === 'all') {
      // Filter out delivery-mirror models from total calculation
      const filteredModels = Object.entries(costData.models).filter(([model]) => 
        !model.includes('delivery-mirror')
      );
      
      return {
        cost: filteredModels.reduce((sum, [, model]) => sum + model.cost, 0),
        inputTokens: filteredModels.reduce((sum, [, model]) => sum + model.inputTokens, 0),
        outputTokens: filteredModels.reduce((sum, [, model]) => sum + model.outputTokens, 0),
        cacheReadTokens: filteredModels.reduce((sum, [, model]) => sum + model.cacheReadTokens, 0),
        cacheWriteTokens: filteredModels.reduce((sum, [, model]) => sum + model.cacheWriteTokens, 0),
        messageCount: filteredModels.reduce((sum, [, model]) => sum + model.messageCount, 0),
      };
    } else {
      const modelData = costData.models[selectedModel];
      if (!modelData) return null;
      return {
        cost: modelData.cost,
        inputTokens: modelData.inputTokens,
        outputTokens: modelData.outputTokens,
        cacheReadTokens: modelData.cacheReadTokens,
        cacheWriteTokens: modelData.cacheWriteTokens,
        messageCount: modelData.messageCount,
      };
    }
  }, [costData, selectedModel]);

  if (!costData) {
    return (
      <Box sx={{ p: 2, backgroundColor: 'rgba(158, 158, 158, 0.1)', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Waiting for cost data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* First row: Cost amount and Model selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          {displayData ? formatCost(displayData.cost) : '$0.0000'}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <MenuItem value="all">All Models</MenuItem>
            {availableModels.map((model) => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Token usage and Details side by side */}
      {displayData && (
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Token usage */}
          <Box sx={{ flex: 1, minWidth: 250 }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                mb: 1,
                '&:hover': { opacity: 0.8 }
              }}
              onClick={() => setTokenUsageExpanded(!tokenUsageExpanded)}
            >
              <Typography variant="caption" color="text.secondary">
                Token Usage
              </Typography>
              <IconButton size="small" sx={{ ml: 0.5 }}>
                {tokenUsageExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
            
            <Collapse in={tokenUsageExpanded}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  label={`Input: ${displayData.inputTokens.toLocaleString()}`}
                  size="small"
                  variant="outlined"
                  sx={{ backgroundColor: 'rgba(76, 175, 80, 0.1)' }}
                />
                <Chip
                  label={`Output: ${displayData.outputTokens.toLocaleString()}`}
                  size="small"
                  variant="outlined"
                  sx={{ backgroundColor: 'rgba(33, 150, 243, 0.1)' }}
                />
                {displayData.cacheReadTokens > 0 && (
                  <Chip
                    label={`Cache Read: ${displayData.cacheReadTokens.toLocaleString()}`}
                    size="small"
                    variant="outlined"
                    sx={{ backgroundColor: 'rgba(255, 152, 0, 0.1)' }}
                  />
                )}
                {displayData.cacheWriteTokens > 0 && (
                  <Chip
                    label={`Cache Write: ${displayData.cacheWriteTokens.toLocaleString()}`}
                    size="small"
                    variant="outlined"
                    sx={{ backgroundColor: 'rgba(156, 39, 176, 0.1)' }}
                  />
                )}
              </Box>
            </Collapse>
          </Box>

          {/* Message count and other details */}
          <Box sx={{ flex: 1, minWidth: 250 }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                mb: 1,
                '&:hover': { opacity: 0.8 }
              }}
              onClick={() => setDetailsExpanded(!detailsExpanded)}
            >
              <Typography variant="caption" color="text.secondary">
                Details
              </Typography>
              <IconButton size="small" sx={{ ml: 0.5 }}>
                {detailsExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
            
            <Collapse in={detailsExpanded}>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {/* Message count */}
                <Box sx={{ minWidth: 120 }}>
                  <Typography variant="caption" color="text.secondary">
                    Messages
                  </Typography>
                  <Typography variant="body2">
                    {displayData.messageCount.toLocaleString()}
                  </Typography>
                </Box>

                {/* Last update time */}
                <Box sx={{ minWidth: 180 }}>
                  <Typography variant="caption" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body2">
                    {formatTimestamp(costData.timestamp)}
                  </Typography>
                </Box>

                {/* Session key */}
                {costData.sessionKey && (
                  <Box sx={{ flex: 1, minWidth: 200 }}>
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
                      {costData.sessionKey}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Collapse>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CostDisplay;
