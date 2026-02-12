import React, { useEffect, useRef } from 'react';
import p5 from 'p5';
import { AgentStatus, ConnectionState } from '../types';

export interface HeartbeatCanvasProps {
  status: AgentStatus | null;
  connectionState: ConnectionState;
}

/**
 * HeartbeatCanvas - React component that wraps p5.js heartbeat animation
 * 
 * Features:
 * - Uses p5.js instance mode directly (no react-p5)
 * - Receives status and connectionState as props
 * - Updates sketch state when props change
 * - 400x200 pixel canvas
 */
export const HeartbeatCanvas: React.FC<HeartbeatCanvasProps> = ({
  status,
  connectionState,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5Ref = useRef<p5 | null>(null);
  const stateRef = useRef<any>(null);

  // Create p5 instance on mount, destroy on unmount
  useEffect(() => {
    if (!containerRef.current) return;

    const sketch = (p: p5) => {
      p.setup = () => {
        p.createCanvas(400, 200);
        p.frameRate(60);
        p.noFill();
        p.strokeWeight(2);

        stateRef.current = {
          phase: 0,
          time: 0,
          currentState: 'idle',
          targetState: 'idle',
          transitionProgress: 1,
          currentColor: p.color(76, 175, 80),
          targetColor: p.color(76, 175, 80),
          currentAmplitude: 30,
          targetAmplitude: 30,
          width: 400,
          height: 200,
        };
      };

      p.draw = () => {
        const st = stateRef.current;
        if (!st) return;

        st.time += 1 / 60;
        st.phase += 0.05;

        if (st.transitionProgress < 1) {
          st.transitionProgress += 1 / 60;
          if (st.transitionProgress >= 1) {
            st.transitionProgress = 1;
            st.currentState = st.targetState;
          }
          const t = st.transitionProgress;
          const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          st.currentColor = p.lerpColor(st.currentColor, st.targetColor, eased);
          st.currentAmplitude = p.lerp(st.currentAmplitude, st.targetAmplitude, eased);
        }

        p.background(30, 30, 30);
        p.stroke(st.currentColor);

        if (st.currentState === 'busy') {
          (p.drawingContext as CanvasRenderingContext2D).shadowBlur = 20;
          (p.drawingContext as CanvasRenderingContext2D).shadowColor = st.currentColor.toString();
        } else {
          (p.drawingContext as CanvasRenderingContext2D).shadowBlur = 0;
        }

        p.beginShape();
        for (let x = 0; x <= st.width; x += 2) {
          let y = st.height / 2;
          if (st.currentState === 'busy') {
            const pulseScale = 1.0 + 0.3 * Math.sin(st.time * 3);
            y = st.height / 2 + Math.sin(x * 0.02 + st.phase) * st.currentAmplitude * pulseScale;
          } else {
            y = st.height / 2 + Math.sin(x * 0.02 + st.phase) * st.currentAmplitude;
          }
          p.vertex(x, y);
        }
        p.endShape();
        (p.drawingContext as CanvasRenderingContext2D).shadowBlur = 0;
      };
    };

    const instance = new p5(sketch, containerRef.current);
    p5Ref.current = instance;

    return () => {
      instance.remove();
      p5Ref.current = null;
      stateRef.current = null;
    };
  }, []);

  // Update sketch when props change
  useEffect(() => {
    const st = stateRef.current;
    const p = p5Ref.current;
    if (!st || !p) return;

    let newTargetState: string;
    if (!connectionState.connected) {
      newTargetState = 'disconnected';
    } else if (status && status.busy) {
      newTargetState = 'busy';
    } else {
      newTargetState = 'idle';
    }

    if (newTargetState !== st.targetState) {
      st.currentState = st.targetState;
      st.targetState = newTargetState;
      st.transitionProgress = 0;

      switch (newTargetState) {
        case 'idle':
          st.targetColor = p.color(76, 175, 80);
          st.targetAmplitude = 30;
          break;
        case 'busy':
          st.targetColor = p.color(244, 67, 54);
          st.targetAmplitude = 40;
          break;
        case 'disconnected':
          st.targetColor = p.color(158, 158, 158);
          st.targetAmplitude = 20;
          break;
      }
    }
  }, [status, connectionState.connected]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: '#1e1e1e',
        borderRadius: '8px',
        width: '100%',
        minHeight: '232px',
      }}
    />
  );
};

export default HeartbeatCanvas;