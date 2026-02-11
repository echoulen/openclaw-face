import React, { useEffect, useRef } from 'react';
import Sketch from 'react-p5';
import { AgentStatus, ConnectionState } from '../types';
import { createHeartbeatSketch, updateSketchStatus } from '../sketches/heartbeat';

export interface HeartbeatCanvasProps {
  status: AgentStatus | null;
  connectionState: ConnectionState;
}

/**
 * HeartbeatCanvas - React component that wraps p5.js heartbeat animation
 * 
 * Features:
 * - Uses react-p5 to integrate p5.js sketch with React
 * - Receives status and connectionState as props
 * - Updates sketch state when props change
 * - 400x200 pixel canvas
 */
export const HeartbeatCanvas: React.FC<HeartbeatCanvasProps> = ({
  status,
  connectionState,
}) => {
  // Store sketch functions for updates
  const sketchRef = useRef<ReturnType<typeof createHeartbeatSketch> | null>(null);
  const updateRef = useRef<ReturnType<typeof updateSketchStatus> | null>(null);

  // Setup the p5.js sketch
  const setup = (p5: any, canvasParentRef: Element) => {
    sketchRef.current = createHeartbeatSketch();
    sketchRef.current(p5);
    
    // Initialize update functions
    updateRef.current = updateSketchStatus(status, connectionState);
  };

  // Draw loop is handled by the sketch
  const draw = (p5: any) => {
    // The draw function is handled by the sketch's draw method
  };

  // Update sketch when props change
  useEffect(() => {
    if (updateRef.current) {
      updateRef.current.updateStatus(status);
      updateRef.current.updateConnection(connectionState.connected);
    }
  }, [status, connectionState.connected]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: '#1e1e1e',
        borderRadius: '8px',
      }}
    >
      <Sketch
        setup={setup}
        draw={draw}
        style={{
          width: '400px',
          height: '200px',
        }}
      />
    </div>
  );
};

export default HeartbeatCanvas;