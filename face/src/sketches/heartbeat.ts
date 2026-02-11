import p5 from 'p5';
import { AgentStatus, ConnectionState, HeartbeatState } from '../types';

/**
 * Heartbeat Sketch - p5.js animation for agent status visualization
 * 
 * Features:
 * - Idle state: Green sine wave animation
 * - Busy state: Red pulsing animation
 * - Disconnected state: Gray wave
 * - Smooth 1-second transitions between states
 */

/**
 * Parse RGB color string to p5 color
 */
function parseColor(p: p5, colorStr: string): p5.Color {
  const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return p.color(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
  }
  return p.color(128);
}

/**
 * Ease in-out cubic function for smooth transitions
 */
function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Interpolate between two colors
 */
function lerpColor(p: p5, c1: p5.Color, c2: p5.Color, amt: number): p5.Color {
  return p.color(
    p.lerp(p.red(c1), p.red(c2), amt),
    p.lerp(p.green(c1), p.green(c2), amt),
    p.lerp(p.blue(c1), p.blue(c2), amt)
  );
}

/**
 * Heartbeat sketch state
 */
interface SketchState {
  // Animation state
  phase: number;
  time: number;
  currentState: HeartbeatState;
  targetState: HeartbeatState;
  transitionProgress: number;
  
  // Visual properties
  currentColor: p5.Color;
  targetColor: p5.Color;
  currentAmplitude: number;
  targetAmplitude: number;
  
  // Canvas dimensions
  width: number;
  height: number;
}

/**
 * Create heartbeat sketch
 */
export function createHeartbeatSketch() {
  let state: SketchState;
  let p: p5;
  
  const sketch = (p5: p5) => {
    p = p5;
    
    // Initialize sketch state
    state = {
      phase: 0,
      time: 0,
      currentState: 'idle',
      targetState: 'idle',
      transitionProgress: 1,
      currentColor: p5.color(76, 175, 80), // Green
      targetColor: p5.color(76, 175, 80),   // Green
      currentAmplitude: 30,
      targetAmplitude: 30,
      width: 400,
      height: 200,
    };
    
    p.setup = () => {
      p.createCanvas(400, 200);
      p.frameRate(60);
      p.noFill();
      p.strokeWeight(2);
    };
    
    p.draw = () => {
      // Update animation time
      state.time += 1 / 60;
      state.phase += 0.05;
      
      // Update transition
      if (state.transitionProgress < 1) {
        state.transitionProgress += 1 / 60; // 1 second at 60fps
        
        if (state.transitionProgress >= 1) {
          state.transitionProgress = 1;
          state.currentState = state.targetState;
        }
        
        // Interpolate color
        const easedProgress = easeInOutCubic(state.transitionProgress);
        state.currentColor = lerpColor(
          p,
          state.currentColor,
          state.targetColor,
          easedProgress
        );
        
        // Interpolate amplitude
        state.currentAmplitude = p.lerp(
          state.currentAmplitude,
          state.targetAmplitude,
          easedProgress
        );
      }
      
      // Clear background
      p.background(30, 30, 30);
      
      // Draw heartbeat animation based on current state
      drawHeartbeat(p, state);
    };
  };
  
  return sketch;
}

/**
 * Draw heartbeat animation based on state
 */
function drawHeartbeat(p: p5, state: SketchState): void {
  const { width, height, currentColor, currentAmplitude, currentState } = state;
  
  // Set stroke color
  p.stroke(currentColor);
  
  // Apply glow effect for busy state
  if (currentState === 'busy') {
    p.drawingContext.shadowBlur = 20;
    p.drawingContext.shadowColor = currentColor.toString();
  } else {
    p.drawingContext.shadowBlur = 0;
  }
  
  // Draw wave
  p.beginShape();
  for (let x = 0; x <= width; x += 2) {
    let y = height / 2;
    
    if (currentState === 'busy') {
      // Red pulsing animation
      const pulseScale = 1.0 + 0.3 * Math.sin(state.time * 3);
      const waveY = Math.sin(x * 0.02 + state.phase) * currentAmplitude;
      y = height / 2 + waveY * pulseScale;
    } else {
      // Green or gray sine wave
      const waveY = Math.sin(x * 0.02 + state.phase) * currentAmplitude;
      y = height / 2 + waveY;
    }
    
    p.vertex(x, y);
  }
  p.endShape();
  
  // Reset shadow
  p.drawingContext.shadowBlur = 0;
}

/**
 * Update sketch with new status
 */
export function updateSketchStatus(
  status: AgentStatus | null,
  connectionState: ConnectionState
): {
  updateStatus: (status: AgentStatus | null) => void;
  updateConnection: (connected: boolean) => void;
} {
  return {
    updateStatus: (newStatus: AgentStatus | null) => {
      if (!p || !state) return;
      
      // Determine target state based on status
      let newTargetState: HeartbeatState;
      
      if (!connectionState.connected) {
        newTargetState = 'disconnected';
      } else if (newStatus && newStatus.busy) {
        newTargetState = 'busy';
      } else {
        newTargetState = 'idle';
      }
      
      // Only trigger transition if state changed
      if (newTargetState !== state.targetState) {
        // Save current state as starting point for transition
        state.currentState = state.targetState;
        state.targetState = newTargetState;
        state.transitionProgress = 0;
        
        // Set target color and amplitude
        switch (newTargetState) {
          case 'idle':
            state.targetColor = p.color(76, 175, 80); // Green
            state.targetAmplitude = 30;
            break;
          case 'busy':
            state.targetColor = p.color(244, 67, 54); // Red
            state.targetAmplitude = 40;
            break;
          case 'disconnected':
            state.targetColor = p.color(158, 158, 158); // Gray
            state.targetAmplitude = 20;
            break;
        }
      }
    },
    updateConnection: (connected: boolean) => {
      if (!p || !state) return;
      
      // Update target state based on connection
      let newTargetState: HeartbeatState;
      
      if (!connected) {
        newTargetState = 'disconnected';
      } else if (state.targetState === 'busy') {
        newTargetState = 'busy';
      } else {
        newTargetState = 'idle';
      }
      
      if (newTargetState !== state.targetState) {
        state.currentState = state.targetState;
        state.targetState = newTargetState;
        state.transitionProgress = 0;
        
        switch (newTargetState) {
          case 'idle':
            state.targetColor = p.color(76, 175, 80);
            state.targetAmplitude = 30;
            break;
          case 'busy':
            state.targetColor = p.color(244, 67, 54);
            state.targetAmplitude = 40;
            break;
          case 'disconnected':
            state.targetColor = p.color(158, 158, 158);
            state.targetAmplitude = 20;
            break;
        }
      }
    },
  };
}