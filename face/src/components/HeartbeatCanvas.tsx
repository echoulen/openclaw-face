import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
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
        const container = containerRef.current;
        if (!container) return;
        
        const width = container.clientWidth;
        const height = Math.min(300, window.innerHeight * 0.4);
        
        p.createCanvas(width, height);
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
          width: width,
          height: height,
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

        const centerX = st.width / 2;
        const centerY = st.height / 2;
        const baseRadius = Math.min(st.width, st.height) * 0.25; // Dynamic radius based on canvas size

        // Draw circular heartbeat visualization with RGB gradient
        if (st.currentState === 'busy') {
          // Busy state: pulsing circles with RGB gradient
          (p.drawingContext as CanvasRenderingContext2D).shadowBlur = 30;
          
          const pulseScale = 1.0 + 0.5 * Math.sin(st.time * 4);
          const pulseScale2 = 1.0 + 0.4 * Math.sin(st.time * 4 + Math.PI / 2);
          
          // Define gradient colors for busy state
          const colors = [
            p.color(255, 140, 0),   // Dark orange
            p.color(255, 165, 0),   // Orange
            p.color(255, 200, 0),   // Yellow orange
            p.color(255, 120, 0),   // Deep orange
          ];
          
          // Outer pulsing ring with gradient
          p.noFill();
          for (let i = 0; i < colors.length; i++) {
            const nextColor = colors[(i + 1) % colors.length];
            const gradientColor = p.lerpColor(colors[i], nextColor, (st.time * 2 + i * 0.25) % 1);
            p.stroke(gradientColor);
            p.strokeWeight(3 - i * 0.5);
            p.circle(centerX, centerY, baseRadius * 2 * pulseScale - i * 5);
          }
          
          // Inner ring with different phase
          const innerGradient = p.lerpColor(colors[0], colors[2], (Math.sin(st.time * 3) + 1) / 2);
          p.stroke(innerGradient);
          p.strokeWeight(2);
          p.circle(centerX, centerY, baseRadius * 1.5 * pulseScale2);
          
          // Simple center circle
          const centerGradient = p.lerpColor(colors[1], colors[3], (st.time * 2) % 1);
          p.fill(centerGradient);
          p.noStroke();
          p.circle(centerX, centerY, baseRadius * 0.12);
          
          // Quick lightning flashes
          p.noFill();
          
          // Random lightning strikes
          if (Math.random() < 0.15) { // 15% chance per frame
            // 1-3 quick flashes
            const numFlashes = Math.floor(Math.random() * 3) + 1;
            
            for (let i = 0; i < numFlashes; i++) {
              // Random position
              const startAngle = Math.random() * p.TWO_PI;
              const arcLength = (Math.random() * 0.5 + 0.3) * Math.PI; // 0.3π to 0.8π
              const endAngle = startAngle + (Math.random() > 0.5 ? arcLength : -arcLength);
              const radius = baseRadius * (1.6 + Math.random() * 0.4);
              
              // Quick jagged lightning
              p.beginShape();
              p.vertex(centerX + p.cos(startAngle) * radius, 
                      centerY + p.sin(startAngle) * radius);
              
              const segments = 4 + Math.floor(Math.random() * 4); // 4-7 segments
              for (let j = 1; j < segments; j++) {
                const t = j / segments;
                const angle = p.lerp(startAngle, endAngle, t);
                
                // Sharp zigzag
                const offset = (Math.random() - 0.5) * 30;
                const r = radius + offset;
                
                p.vertex(centerX + p.cos(angle) * r, 
                        centerY + p.sin(angle) * r);
              }
              
              p.vertex(centerX + p.cos(endAngle) * radius, 
                      centerY + p.sin(endAngle) * radius);
              
              // Bright yellow flash - thinner
              p.stroke(255, 255, 0);
              p.strokeWeight(1.5);
              p.endShape();
              
              // Optional bright core for main flash - even thinner
              if (i === 0 && Math.random() < 0.5) {
                p.beginShape();
                p.vertex(centerX + p.cos(startAngle) * radius, 
                        centerY + p.sin(startAngle) * radius);
                
                for (let j = 1; j < segments; j++) {
                  const t = j / segments;
                  const angle = p.lerp(startAngle, endAngle, t);
                  const offset = (Math.random() - 0.5) * 15;
                  const r = radius + offset;
                  p.vertex(centerX + p.cos(angle) * r, 
                          centerY + p.sin(angle) * r);
                }
                
                p.vertex(centerX + p.cos(endAngle) * radius, 
                        centerY + p.sin(endAngle) * radius);
                
                p.stroke(255, 255, 200);
                p.strokeWeight(0.5);
                p.endShape();
              }
            }
          }
        } else if (st.currentState === 'idle') {
          // Idle state: gentle breathing circles with green-blue gradient
          (p.drawingContext as CanvasRenderingContext2D).shadowBlur = 15;
          
          const breatheScale = 1.0 + 0.1 * Math.sin(st.time * 2);
          
          // Define gradient colors for idle state
          const idleColors = [
            p.color(0, 255, 100),   // Green
            p.color(0, 200, 255),   // Cyan
            p.color(100, 255, 200), // Light green
          ];
          
          // Outer breathing ring with gradient
          p.noFill();
          for (let i = 0; i < idleColors.length; i++) {
            const gradientColor = p.lerpColor(idleColors[i], idleColors[(i + 1) % idleColors.length], (st.time + i * 0.3) % 1);
            p.stroke(gradientColor);
            p.strokeWeight(2 - i * 0.3);
            p.circle(centerX, centerY, baseRadius * 2 * breatheScale - i * 3);
          }
          
          // Inner ring
          const innerGradient = p.lerpColor(idleColors[0], idleColors[1], (Math.sin(st.time * 1.5) + 1) / 2);
          p.stroke(innerGradient);
          p.strokeWeight(1.5);
          p.circle(centerX, centerY, baseRadius * 1.5 * breatheScale);
          
          // Simple center circle
          const centerGradient = p.lerpColor(idleColors[0], idleColors[1], (Math.sin(st.time * 2) + 1) / 2);
          p.fill(centerGradient);
          p.noStroke();
          p.circle(centerX, centerY, baseRadius * 0.1);
          
          // Gentle green lightning in idle mode
          p.noFill();
          
          // Less frequent than busy mode
          if (Math.random() < 0.08) { // 8% chance per frame
            // 1-2 gentle flashes
            const numFlashes = Math.random() < 0.7 ? 1 : 2;
            
            for (let i = 0; i < numFlashes; i++) {
              // Random position
              const startAngle = Math.random() * p.TWO_PI;
              const arcLength = (Math.random() * 0.3 + 0.2) * Math.PI; // Shorter arcs
              const endAngle = startAngle + (Math.random() > 0.5 ? arcLength : -arcLength);
              const radius = baseRadius * (1.5 + Math.random() * 0.3);
              
              // Gentle zigzag
              p.beginShape();
              p.vertex(centerX + p.cos(startAngle) * radius, 
                      centerY + p.sin(startAngle) * radius);
              
              const segments = 3 + Math.floor(Math.random() * 3); // 3-5 segments
              for (let j = 1; j < segments; j++) {
                const t = j / segments;
                const angle = p.lerp(startAngle, endAngle, t);
                
                // Smaller offset for gentler effect
                const offset = (Math.random() - 0.5) * 15;
                const r = radius + offset;
                
                p.vertex(centerX + p.cos(angle) * r, 
                        centerY + p.sin(angle) * r);
              }
              
              p.vertex(centerX + p.cos(endAngle) * radius, 
                      centerY + p.sin(endAngle) * radius);
              
              // Green-tinted yellow
              p.stroke(150, 255, 100);
              p.strokeWeight(1.5);
              p.endShape();
            }
          }
        } else {
          // Disconnected state: static gray gradient circles
          const grayColors = [
            p.color(100, 100, 100),
            p.color(150, 150, 150),
            p.color(200, 200, 200),
          ];
          
          p.noFill();
          for (let i = 0; i < grayColors.length; i++) {
            p.stroke(grayColors[i]);
            p.strokeWeight(1.5 - i * 0.3);
            p.circle(centerX, centerY, baseRadius * 2 - i * 3);
          }
          
          const centerGray = p.lerpColor(grayColors[0], grayColors[2], 0.5);
          p.fill(centerGray);
          p.noStroke();
          p.circle(centerX, centerY, baseRadius * 0.08); // Dynamic center dot size
        }
        
        (p.drawingContext as CanvasRenderingContext2D).shadowBlur = 0;
      };

      p.windowResized = () => {
        const container = containerRef.current;
        if (!container || !stateRef.current) return;
        
        const width = container.clientWidth;
        const height = Math.min(300, window.innerHeight * 0.4);
        
        p.resizeCanvas(width, height);
        stateRef.current.width = width;
        stateRef.current.height = height;
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
          st.targetColor = p.color(255, 165, 0);  // Orange
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
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: { xs: 1.5, sm: 2 },
        backgroundColor: '#1e1e1e',
        borderRadius: { xs: 1, sm: 1.5 },
        width: '100%',
        minHeight: { xs: '150px', sm: '200px' },
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    />
  );
};

export default HeartbeatCanvas;