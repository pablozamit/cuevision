
"use client";

import type { Ball, Pocket, PocketPosition, AimingPoint } from '@/types/pool';
import React, { useState, useRef, useCallback } from 'react';

interface PoolTableProps {
  balls: Ball[];
  pockets: Pocket[];
  selectedPocketId?: PocketPosition | null;
  cueBall?: Ball | null;
  aimingPoint?: AimingPoint | null;
  onPocketClick: (pocketId: PocketPosition) => void;
  onBallMove: (ballId: string, newPosition: { x: number; y: number }) => void;
  tableWidth?: number; // SVG units
  tableHeight?: number; // SVG units
  isSimulating?: boolean; // New prop
}

const DEFAULT_TABLE_WIDTH = 800;
const DEFAULT_TABLE_HEIGHT = 400;
// DEFAULT_BALL_RADIUS (SVG units) is now derived from normalized ball.radius

const DIAMOND_SIGHT_RADIUS = 3; // SVG units
const CUSHION_VISUAL_THICKNESS_NORMALIZED = 0.03; // Normalized to table width for drawing diamonds

export default function PoolTable({
  balls,
  pockets,
  selectedPocketId,
  cueBall,
  aimingPoint,
  onPocketClick,
  onBallMove,
  tableWidth = DEFAULT_TABLE_WIDTH,
  tableHeight = DEFAULT_TABLE_HEIGHT,
  isSimulating = false, // Default to false
}: PoolTableProps) {
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggedBall, setDraggedBall] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const toSvgX = useCallback((normalizedX: number) => normalizedX * tableWidth, [tableWidth]);
  const toSvgY = useCallback((normalizedY: number) => normalizedY * tableHeight, [tableHeight]);
  const fromSvgX = useCallback((svgX: number) => svgX / tableWidth, [tableWidth]);
  const fromSvgY = useCallback((svgY: number) => svgY / tableHeight, [tableHeight]);

  const handleMouseDown = (e: React.MouseEvent<SVGCircleElement>, ballId: string) => {
    if (isSimulating) return; // Disable dragging if simulation is active
    if (!svgRef.current) return;
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return;

    const ballData = balls.find(b => b.id === ballId);
    if (!ballData) return;

    const currentSvgX = toSvgX(ballData.x);
    const currentSvgY = toSvgY(ballData.y);

    let pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    pt = pt.matrixTransform(CTM.inverse());

    setDraggedBall({
      id: ballId,
      offsetX: pt.x - currentSvgX,
      offsetY: pt.y - currentSvgY,
    });
    (e.target as SVGCircleElement).style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isSimulating || !draggedBall || !svgRef.current) return; // Also check isSimulating here
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return;

    let pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    pt = pt.matrixTransform(CTM.inverse());

    const newSvgX = pt.x - draggedBall.offsetX;
    const newSvgY = pt.y - draggedBall.offsetY;
    
    const ballData = balls.find(b => b.id === draggedBall.id);
    const ballSvgRadius = ballData?.radius ? toSvgX(ballData.radius) : 0;


    // Clamp values to keep ball centers on table, considering radius
    const normalizedX = Math.max(ballSvgRadius / tableWidth, Math.min(1 - (ballSvgRadius / tableWidth), newSvgX / tableWidth));
    const normalizedY = Math.max(ballSvgRadius / tableHeight, Math.min(1 - (ballSvgRadius / tableHeight), newSvgY / tableHeight));
    
    onBallMove(draggedBall.id, { x: normalizedX, y: normalizedY });
  };

  const handleMouseUpOrLeave = () => {
    // No need to check isSimulating here, just resets dragging state
    if (draggedBall && svgRef.current) {
       const ballCircle = Array.from(svgRef.current.querySelectorAll('circle[data-ball-id]')).find(
        (el) => (el as SVGCircleElement).dataset.ballId === draggedBall.id
      ) as SVGCircleElement | undefined;

      if (ballCircle) {
        ballCircle.style.cursor = 'grab';
      }
    }
    setDraggedBall(null);
  };

  const diamondSightPositions = [
    // Top rail (y is small)
    { x: 1/8, y: CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth) }, { x: 2/8, y: CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth) },
    { x: 3/8, y: CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth) }, { x: 4/8, y: CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth) },
    { x: 5/8, y: CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth) }, { x: 6/8, y: CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth) },
    { x: 7/8, y: CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth) },
    // Bottom rail (y is close to 1)
    { x: 1/8, y: 1 - CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth) }, { x: 2/8, y: 1 - CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth) },
    { x: 3/8, y: 1 - CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth) }, { x: 4/8, y: 1 - CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth) },
    { x: 5/8, y: 1 - CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth) }, { x: 6/8, y: 1 - CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth) },
    { x: 7/8, y: 1 - CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth) },
    // Left rail (x is small)
    { x: CUSHION_VISUAL_THICKNESS_NORMALIZED, y: 1/4 }, { x: CUSHION_VISUAL_THICKNESS_NORMALIZED, y: 1/2 }, { x: CUSHION_VISUAL_THICKNESS_NORMALIZED, y: 3/4 },
    // Right rail (x is close to 1)
    { x: 1 - CUSHION_VISUAL_THICKNESS_NORMALIZED, y: 1/4 }, { x: 1 - CUSHION_VISUAL_THICKNESS_NORMALIZED, y: 1/2 }, { x: 1 - CUSHION_VISUAL_THICKNESS_NORMALIZED, y: 3/4 },
  ];


  return (
    <div className="aspect-[2/1] w-full max-w-4xl mx-auto bg-emerald-600 rounded-lg shadow-xl border-4 border-yellow-900 overflow-hidden relative p-3" data-ai-hint="pool table realistic">
      <svg 
        ref={svgRef}
        viewBox={`0 0 ${tableWidth} ${tableHeight}`} 
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        <defs>
          {/* Felt Texture Pattern */}
          <pattern id="feltTexture" patternUnits="userSpaceOnUse" width="10" height="10">
            <rect width="10" height="10" fill="rgba(0,80,0,0.3)" /> 
            <filter id="noiseFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" stitchTiles="stitch"/>
            </filter>
            <rect width="10" height="10" filter="url(#noiseFilter)" opacity="0.15"/>
          </pattern>

          {/* Enhanced Ball Shine Gradient */}
          <radialGradient id="ballShine" cx="0.3" cy="0.3" r="0.6">
            <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="30%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          
          {/* Ball Shading for 3D effect (darker tone opposite shine) */}
          <radialGradient id="ballShade" cx="0.75" cy="0.75" r="0.65">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="50%" stopColor="rgba(0,0,0,0.1)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
          </radialGradient>

          {/* Pocket Depth Gradient */}
          <radialGradient id="pocketDepth" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="rgba(0,0,0,0.3)" />
            <stop offset="70%" stopColor="rgba(0,0,0,0.9)" />
            <stop offset="100%" stopColor="black" />
          </radialGradient>

          {/* Cushion Gradients (example for top cushion, others would be similar but rotated/offset) */}
          <linearGradient id="cushionGradientTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0.2)" /> {/* Outer edge (darker) */}
            <stop offset="30%" stopColor="rgba(255,255,255,0.1)" /> {/* Highlight */}
            <stop offset="100%" stopColor="rgba(0,0,0,0.1)" /> {/* Inner edge (slightly darker) */}
          </linearGradient>
           <linearGradient id="cushionGradientBottom" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="rgba(0,0,0,0.2)" />
            <stop offset="30%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
          </linearGradient>
          <linearGradient id="cushionGradientLeft" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(0,0,0,0.2)" />
            <stop offset="30%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
          </linearGradient>
          <linearGradient id="cushionGradientRight" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="rgba(0,0,0,0.2)" />
            <stop offset="30%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
          </linearGradient>

        </defs>

        {/* Table Surface (felt) - parent div provides main color (bg-emerald-600) */}
        {/* This rect is for texture ON TOP of the parent's bg color */}
        <rect x="0" y="0" width={tableWidth} height={tableHeight} fill="url(#feltTexture)" />

        {/* Cushions */}
        {(() => {
          const cushionVisualThickness = toSvgX(CUSHION_VISUAL_THICKNESS_NORMALIZED);
          const railColor = "hsl(30, 50%, 30%)"; // A brownish wood color for rails outside cushions

          return (
            <>
              {/* Rails (visual wood part - slightly larger than cushions) */}
              <rect x={-5} y={-5} width={tableWidth + 10} height={cushionVisualThickness + 5} fill={railColor} rx="3"/> {/* Top Rail */}
              <rect x={-5} y={tableHeight - cushionVisualThickness} width={tableWidth + 10} height={cushionVisualThickness + 5} fill={railColor} rx="3"/> {/* Bottom Rail */}
              <rect x={-5} y={-5} width={cushionVisualThickness + 5} height={tableHeight + 10} fill={railColor} rx="3"/> {/* Left Rail */}
              <rect x={tableWidth - cushionVisualThickness} y={-5} width={cushionVisualThickness + 5} height={tableHeight + 10} fill={railColor} rx="3"/> {/* Right Rail */}

              {/* Actual Cushions with gradient */}
              <rect x="0" y="0" width={tableWidth} height={cushionVisualThickness} fill="url(#cushionGradientTop)" /> {/* Top Cushion */}
              <rect x="0" y={tableHeight - cushionVisualThickness} width={tableWidth} height={cushionVisualThickness} fill="url(#cushionGradientBottom)" /> {/* Bottom Cushion */}
              <rect x="0" y="0" width={cushionVisualThickness} height={tableHeight} fill="url(#cushionGradientLeft)" /> {/* Left Cushion */}
              <rect x={tableWidth - cushionVisualThickness} y="0" width={cushionVisualThickness} height={tableHeight} fill="url(#cushionGradientRight)" /> {/* Right Cushion */}
            </>
          );
        })()}

        {/* Diamond Sights - ensure these are drawn on top of cushions or rails */}
        {/* Adjust y for top/bottom sights to be in the middle of the cushion, similar for x for left/right */}
        {diamondSightPositions.map((sight, index) => {
          let sightX = toSvgX(sight.x);
          let sightY = toSvgY(sight.y);
          const cushionThicknessSvg = toSvgX(CUSHION_VISUAL_THICKNESS_NORMALIZED);

          // Adjust sight positions to be centered on the new cushion visuals
          if (sight.y < 0.5 && sight.x > CUSHION_VISUAL_THICKNESS_NORMALIZED && sight.x < (1-CUSHION_VISUAL_THICKNESS_NORMALIZED) ) { // Top rail sights
            sightY = cushionThicknessSvg / 2;
          } else if (sight.y > 0.5 && sight.x > CUSHION_VISUAL_THICKNESS_NORMALIZED && sight.x < (1-CUSHION_VISUAL_THICKNESS_NORMALIZED) ) { // Bottom rail sights
            sightY = tableHeight - (cushionThicknessSvg / 2);
          } else if (sight.x < 0.5 && sight.y > CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth) && sight.y < (1-CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth))) { // Left rail sights
            sightX = cushionThicknessSvg / 2;
          } else if (sight.x > 0.5 && sight.y > CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth) && sight.y < (1-CUSHION_VISUAL_THICKNESS_NORMALIZED * (tableHeight/tableWidth))) { // Right rail sights
            sightX = tableWidth - (cushionThicknessSvg / 2);
          }
          
          return (
          <circle
            key={`sight-${index}`}
            cx={sightX}
            cy={sightY}
            r={DIAMOND_SIGHT_RADIUS}
            fill="ivory"
            opacity="0.8"
          />
          );
        })}
          <circle
            key={`sight-${index}`}
            cx={toSvgX(sight.x)}
            cy={toSvgY(sight.y)}
            r={DIAMOND_SIGHT_RADIUS}
            fill="ivory"
            opacity="0.7"
          />
        ))}

        {/* Pockets */}
        {pockets.map((pocket) => {
          const svgX = toSvgX(pocket.x);
          const svgY = toSvgY(pocket.y);
          const r = pocket.radius ? toSvgX(pocket.radius) : 20; 
          return (
            <g key={pocket.id}>
              {/* Optional: A slightly larger circle for the "cutout" appearance against cushions */}
              <circle
                cx={svgX}
                cy={svgY}
                r={r * 1.1} // Slightly larger than the pocket hole
                fill="hsl(120, 60%, 20%)" // Darker felt color for area around pocket
              />
              <circle
                cx={svgX}
                cy={svgY}
                r={r}
                fill="url(#pocketDepth)"
                className="cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onPocketClick(pocket.id)}
                aria-label={`Select pocket ${pocket.id}`}
              />
               {selectedPocketId === pocket.id && (
                <circle
                  cx={svgX}
                  cy={svgY}
                  r={r * 0.8}
                  fill="transparent"
                  stroke="hsl(var(--accent))"
                  strokeWidth="2"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}

        {/* Balls - draw after pockets and cushions */}
        {balls.map((ball) => {
          const svgX = toSvgX(ball.x);
          const svgY = toSvgY(ball.y);
          const r = ball.radius ? toSvgX(ball.radius) : (0.028 * tableWidth); 
          
          // Don't render pocketed balls, or render them differently (e.g. faded)
          if (ball.isPocketed) {
            // Optionally, render pocketed balls differently, e.g., semi-transparent or smaller
            // For now, let's just not render them on the table surface
            return null; 
          }

          return (
            <g key={ball.id} transform={`translate(${svgX}, ${svgY})`}>
              {/* Optional: Subtle shadow */}
              <ellipse 
                cx={r * 0.15} // Offset shadow slightly
                cy={r * 0.25} 
                rx={r * 0.95} 
                ry={r * 0.9} 
                fill="rgba(0,0,0,0.15)" 
                filter="url(#noiseFilter)" // Use noise to make shadow less uniform
                style={{ filter: 'blur(1.5px)'}} // SVG blur, not CSS for broader compatibility
                pointerEvents="none"
              />
              <circle // Main ball color
                data-ball-id={ball.id}
                cx={0}
                cy={0}
                r={r}
                fill={ball.color}
                stroke={ball.color === 'white' ? 'black' : 'transparent'}
                strokeWidth={ball.color === 'white' ? 0.5 : 0}
                onMouseDown={(e) => handleMouseDown(e, ball.id)}
                style={{ cursor: isSimulating ? 'default' : 'grab' }}
              />
              {/* Shading for 3D effect */}
              <circle cx={0} cy={0} r={r} fill="url(#ballShade)" pointerEvents="none"/>
              {/* Shine effect */}
              <circle cx={0} cy={0} r={r} fill="url(#ballShine)" pointerEvents="none"/>
            </g>
          );
        })}
        
        {/* Aiming Line - draw on top of everything else relevant */}
        {cueBall && aimingPoint && (
          <line
            x1={toSvgX(cueBall.x)}
            y1={toSvgY(cueBall.y)}
            x2={toSvgX(aimingPoint.x)}
            y2={toSvgY(aimingPoint.y)}
            stroke="hsl(var(--accent))"
            strokeWidth="2"
            strokeDasharray="4 2"
            pointerEvents="none"
          />
        )}
        
        {/* Suggested Aiming Point visualization */}
        {aimingPoint && (
           <circle
            cx={toSvgX(aimingPoint.x)}
            cy={toSvgY(aimingPoint.y)}
            r={ (balls[0]?.radius ? toSvgX(balls[0].radius) : (0.028 * tableWidth)) / 3 } // Smaller circle for aiming point
            fill="hsl(var(--accent))"
            stroke="white"
            strokeWidth="1"
            opacity="0.8"
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  );
}
