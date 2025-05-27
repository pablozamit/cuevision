"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NewShotControlsProps {
  initialPower?: number; // 0-100
  initialSpin?: { x: number; y: number }; // -1 to 1 for each axis
  onMakeShot: (params: { power: number; spin: { x: number; y: number } }) => void;
  disabled?: boolean;
}

const CUE_BALL_SVG_SIZE = 120; // px
const CUE_BALL_RADIUS = CUE_BALL_SVG_SIZE / 2 - 10; // px, leaving some padding
const SPIN_MARKER_RADIUS = 8; // px
const POWER_BAR_HEIGHT = 200; // px
const POWER_BAR_WIDTH = 30; // px

export default function NewShotControls({
  initialPower = 50,
  initialSpin = { x: 0, y: 0 },
  onMakeShot,
  disabled = false,
}: NewShotControlsProps) {
  const [power, setPower] = useState(initialPower); // 0-100
  const [spin, setSpin] = useState(initialSpin); // -1 to 1
  const [isDraggingSpin, setIsDraggingSpin] = useState(false);
  const [isDraggingPower, setIsDraggingPower] = useState(false);

  const cueBallSvgRef = useRef<SVGSVGElement>(null);
  const powerBarRef = useRef<HTMLDivElement>(null);

  // Sync with initial props if they change
  useEffect(() => {
    setPower(initialPower);
  }, [initialPower]);

  useEffect(() => {
    setSpin(initialSpin);
  }, [initialSpin]);

  // Spin Control Handlers
  const getSpinFromMouseEvent = useCallback((e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } => {
    if (!cueBallSvgRef.current) return { x: 0, y: 0 };

    const rect = cueBallSvgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Center of the SVG
    const centerX = CUE_BALL_SVG_SIZE / 2;
    const centerY = CUE_BALL_SVG_SIZE / 2;

    // Raw displacement from center
    let dx = mouseX - centerX;
    let dy = mouseY - centerY;

    // Clamp to cue ball radius
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > CUE_BALL_RADIUS) {
      dx = (dx / distance) * CUE_BALL_RADIUS;
      dy = (dy / distance) * CUE_BALL_RADIUS;
    }

    // Normalize to -1 to 1
    const spinX = dx / CUE_BALL_RADIUS;
    const spinY = dy / CUE_BALL_RADIUS;

    return { x: spinX, y: spinY };
  }, []);

  const handleCueBallMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled) return;
    setIsDraggingSpin(true);
    setSpin(getSpinFromMouseEvent(e));
  }, [disabled, getSpinFromMouseEvent]);

  const handleCueBallMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled || !isDraggingSpin) return;
    setSpin(getSpinFromMouseEvent(e));
  }, [disabled, isDraggingSpin, getSpinFromMouseEvent]);

  const handleCueBallMouseUpOrLeave = useCallback(() => {
    if (disabled) return;
    setIsDraggingSpin(false);
  }, [disabled]);

  // Power Control Handlers
  const getPowerFromMouseEvent = useCallback((e: React.MouseEvent<HTMLDivElement> | MouseEvent): number => {
    if (!powerBarRef.current) return 0;
    const rect = powerBarRef.current.getBoundingClientRect();
    const mouseY = e.clientY - rect.top; // Y position within the power bar div
    
    // Clamp mouseY to be within the bar's height
    const clampedY = Math.max(0, Math.min(mouseY, POWER_BAR_HEIGHT));
    
    // Power is 100 at the top (y=0) and 0 at the bottom (y=POWER_BAR_HEIGHT)
    const calculatedPower = 100 - (clampedY / POWER_BAR_HEIGHT) * 100;
    return Math.round(calculatedPower);
  }, []);

  const handlePowerBarMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    setIsDraggingPower(true);
    setPower(getPowerFromMouseEvent(e));
  }, [disabled, getPowerFromMouseEvent]);
  
  const handleGlobalMouseMovePower = useCallback((e: MouseEvent) => {
    // Listen globally for mouse move when dragging power
    if (disabled || !isDraggingPower) return;
    // We need to check if the mouse is roughly over the power bar still or pass the event
    // For simplicity, we'll update based on vertical position anywhere.
    setPower(getPowerFromMouseEvent(e));
  },[disabled, isDraggingPower, getPowerFromMouseEvent]);

  const handleGlobalMouseUpPower = useCallback(() => {
    if (disabled) return;
    setIsDraggingPower(false);
  }, [disabled]);

  useEffect(() => {
    if (isDraggingPower) {
      document.addEventListener('mousemove', handleGlobalMouseMovePower);
      document.addEventListener('mouseup', handleGlobalMouseUpPower);
    } else {
      document.removeEventListener('mousemove', handleGlobalMouseMovePower);
      document.removeEventListener('mouseup', handleGlobalMouseUpPower);
    }
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMovePower);
      document.removeEventListener('mouseup', handleGlobalMouseUpPower);
    };
  }, [isDraggingPower, handleGlobalMouseMovePower, handleGlobalMouseUpPower]);


  // Calculate marker position for spin UI
  const spinMarkerX = CUE_BALL_SVG_SIZE / 2 + spin.x * CUE_BALL_RADIUS;
  const spinMarkerY = CUE_BALL_SVG_SIZE / 2 + spin.y * CUE_BALL_RADIUS;

  const handleMakeShotClick = () => {
    onMakeShot({
      power: power / 100, // Normalize power to 0-1
      spin,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shot Parameters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-4 md:flex-row md:space-y-0 md:space-x-8 md:items-start">
          {/* Spin Control */}
          <div className="flex flex-col items-center">
            <Label htmlFor="cue-ball-spin-svg" className="mb-2 text-center">Cue Ball Spin</Label>
            <svg
              id="cue-ball-spin-svg"
              ref={cueBallSvgRef}
              width={CUE_BALL_SVG_SIZE}
              height={CUE_BALL_SVG_SIZE}
              className={`border rounded-full ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onMouseDown={handleCueBallMouseDown}
              onMouseMove={handleCueBallMouseMove}
              onMouseUp={handleCueBallMouseUpOrLeave}
              onMouseLeave={handleCueBallMouseUpOrLeave} // Important for when mouse leaves SVG while dragging
            >
              <circle
                cx={CUE_BALL_SVG_SIZE / 2}
                cy={CUE_BALL_SVG_SIZE / 2}
                r={CUE_BALL_RADIUS}
                fill="white"
                stroke="black"
                strokeWidth="1"
              />
              <circle // Spin marker
                cx={spinMarkerX}
                cy={spinMarkerY}
                r={SPIN_MARKER_RADIUS}
                fill="red"
                opacity="0.8"
                pointerEvents="none" // So it doesn't interfere with SVG mouse events
              />
              {/* Center dot */}
               <circle
                cx={CUE_BALL_SVG_SIZE / 2}
                cy={CUE_BALL_SVG_SIZE / 2}
                r="2"
                fill="black"
                opacity="0.5"
                pointerEvents="none"
              />
            </svg>
            <div className="mt-2 text-sm text-muted-foreground">
              X: {spin.x.toFixed(2)}, Y: {spin.y.toFixed(2)}
            </div>
          </div>

          {/* Power Control */}
          <div className="flex flex-col items-center space-y-2">
            <Label htmlFor="power-bar-control" className="mb-1">Power: {power}%</Label>
            <div className="flex items-end h-full"> {/* Align bar to bottom if it's next to text */}
                 <div
                    id="power-bar-control"
                    ref={powerBarRef}
                    className={`relative bg-gray-200 rounded-md ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{ width: POWER_BAR_WIDTH, height: POWER_BAR_HEIGHT }}
                    onMouseDown={handlePowerBarMouseDown} // Only mousedown needed here, move/up are global
                 >
                    <div
                        className="absolute bottom-0 bg-blue-500 rounded-md"
                        style={{
                        width: '100%',
                        height: `${power}%`,
                        }}
                        pointerEvents="none"
                    />
                    <div 
                        className="absolute w-full text-center text-xs font-medium text-blue-100"
                        style={{ bottom: `${Math.max(5, power - 7)}%`}} // Adjust text position
                        pointerEvents="none"
                    >
                        {power}%
                    </div>
                 </div>
            </div>
          </div>
        </div>

        <Button onClick={handleMakeShotClick} disabled={disabled} className="w-full mt-4">
          Make Shot
        </Button>
      </CardContent>
    </Card>
  );
}
