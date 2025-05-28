
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
  cueHitOffsetX?: number;
  cueHitOffsetY?: number;
  // ballRadius is now taken from individual ball.radius (normalized)
}

const DEFAULT_TABLE_WIDTH = 800;
const DEFAULT_TABLE_HEIGHT = 400;
// DEFAULT_BALL_RADIUS (SVG units) is now derived from normalized ball.radius

const RAIL_WIDTH_REAL_UNITS = 5.5; // inches
const CUSHION_WIDTH_REAL_UNITS = 2.0; // inches

// Assuming DEFAULT_TABLE_WIDTH = 800 for 100 inches playing surface width
// Assuming DEFAULT_TABLE_HEIGHT = 400 for 50 inches playing surface height
const PLAYING_SURFACE_WIDTH_SVG = DEFAULT_TABLE_WIDTH;
const PLAYING_SURFACE_HEIGHT_SVG = DEFAULT_TABLE_HEIGHT;

const RAIL_THICKNESS_SVG = (RAIL_WIDTH_REAL_UNITS / 100) * PLAYING_SURFACE_WIDTH_SVG;
const CUSHION_VISUAL_THICKNESS_SVG = (CUSHION_WIDTH_REAL_UNITS / 100) * PLAYING_SURFACE_WIDTH_SVG;

const VIEWBOX_WIDTH = PLAYING_SURFACE_WIDTH_SVG + 2 * RAIL_THICKNESS_SVG;
const VIEWBOX_HEIGHT = PLAYING_SURFACE_HEIGHT_SVG + 2 * RAIL_THICKNESS_SVG;

const DIAMOND_SIGHT_RADIUS = 2; // SVG units
// Diamond offsets are from the edge of the playing surface (felt)
const DIAMOND_OFFSET_NORMALIZED_X = 0.037; 
const DIAMOND_OFFSET_NORMALIZED_Y = 0.074; 


export default function PoolTable({
  balls,
  pockets,
  selectedPocketId,
  cueBall,
  aimingPoint,
  onPocketClick,
  onBallMove,
  tableWidth = PLAYING_SURFACE_WIDTH_SVG, // This prop now refers to playing surface
  tableHeight = PLAYING_SURFACE_HEIGHT_SVG, // This prop now refers to playing surface
  cueHitOffsetX = 0, // Default to center
  cueHitOffsetY = 0, // Default to center
}: PoolTableProps) {
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggedBall, setDraggedBall] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);

  // Updated coordinate transformation functions
  const toSvgX = useCallback((normalizedX: number) => RAIL_THICKNESS_SVG + normalizedX * PLAYING_SURFACE_WIDTH_SVG, [PLAYING_SURFACE_WIDTH_SVG]);
  const toSvgY = useCallback((normalizedY: number) => RAIL_THICKNESS_SVG + normalizedY * PLAYING_SURFACE_HEIGHT_SVG, [PLAYING_SURFACE_HEIGHT_SVG]);
  const fromSvgX = useCallback((svgX: number) => (svgX - RAIL_THICKNESS_SVG) / PLAYING_SURFACE_WIDTH_SVG, [PLAYING_SURFACE_WIDTH_SVG]);
  const fromSvgY = useCallback((svgY: number) => (svgY - RAIL_THICKNESS_SVG) / PLAYING_SURFACE_HEIGHT_SVG, [PLAYING_SURFACE_HEIGHT_SVG]);


  const handleMouseDown = (e: React.MouseEvent<SVGCircleElement>, ballId: string) => {
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
    if (!draggedBall || !svgRef.current) return;
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
    { x: 1/8, y: DIAMOND_OFFSET_NORMALIZED_Y }, { x: 2/8, y: DIAMOND_OFFSET_NORMALIZED_Y },
    { x: 3/8, y: DIAMOND_OFFSET_NORMALIZED_Y }, { x: 4/8, y: DIAMOND_OFFSET_NORMALIZED_Y },
    { x: 5/8, y: DIAMOND_OFFSET_NORMALIZED_Y }, { x: 6/8, y: DIAMOND_OFFSET_NORMALIZED_Y },
    { x: 7/8, y: DIAMOND_OFFSET_NORMALIZED_Y },
    // Bottom rail (y is close to 1)
    { x: 1/8, y: 1 - DIAMOND_OFFSET_NORMALIZED_Y }, { x: 2/8, y: 1 - DIAMOND_OFFSET_NORMALIZED_Y },
    { x: 3/8, y: 1 - DIAMOND_OFFSET_NORMALIZED_Y }, { x: 4/8, y: 1 - DIAMOND_OFFSET_NORMALIZED_Y },
    { x: 5/8, y: 1 - DIAMOND_OFFSET_NORMALIZED_Y }, { x: 6/8, y: 1 - DIAMOND_OFFSET_NORMALIZED_Y },
    { x: 7/8, y: 1 - DIAMOND_OFFSET_NORMALIZED_Y },
    // Left rail (x is small)
    { x: DIAMOND_OFFSET_NORMALIZED_X, y: 1/4 }, { x: DIAMOND_OFFSET_NORMALIZED_X, y: 1/2 }, { x: DIAMOND_OFFSET_NORMALIZED_X, y: 3/4 },
    // Right rail (x is close to 1)
    { x: 1 - DIAMOND_OFFSET_NORMALIZED_X, y: 1/4 }, { x: 1 - DIAMOND_OFFSET_NORMALIZED_X, y: 1/2 }, { x: 1 - DIAMOND_OFFSET_NORMALIZED_X, y: 3/4 },
  ];

  // Calculate diamond positions in SVG coordinates (relative to playing surface for clarity)
  const svgDiamondSightPositions = diamondSightPositions.map(pos => ({
    cx: toSvgX(pos.x), // These will correctly map to the playing surface
    cy: toSvgY(pos.y),
  }));


  return (
    <div className="aspect-[2/1] w-full max-w-4xl mx-auto bg-transparent rounded-lg shadow-xl overflow-hidden relative" data-ai-hint="pool table realistic">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        <defs>
          <radialGradient id="ballShine" cx="0.35" cy="0.35" r="0.5">
            <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        {/* Wooden Rails - Outermost Layer */}
        <rect x="0" y="0" width={VIEWBOX_WIDTH} height={RAIL_THICKNESS_SVG} fill="#654321" /> {/* Top Rail */}
        <rect x="0" y={RAIL_THICKNESS_SVG + PLAYING_SURFACE_HEIGHT_SVG} width={VIEWBOX_WIDTH} height={RAIL_THICKNESS_SVG} fill="#654321" /> {/* Bottom Rail */}
        <rect x="0" y="0" width={RAIL_THICKNESS_SVG} height={VIEWBOX_HEIGHT} fill="#654321" /> {/* Left Rail */}
        <rect x={RAIL_THICKNESS_SVG + PLAYING_SURFACE_WIDTH_SVG} y="0" width={RAIL_THICKNESS_SVG} height={VIEWBOX_HEIGHT} fill="#654321" /> {/* Right Rail */}
        
        {/* Table Surface (felt) */}
        <rect 
          x={RAIL_THICKNESS_SVG} 
          y={RAIL_THICKNESS_SVG} 
          width={PLAYING_SURFACE_WIDTH_SVG} 
          height={PLAYING_SURFACE_HEIGHT_SVG} 
          fill="rgb(22 101 52)" // Tailwind green-700 - was emerald-600 (rgb(16 185 129))
        />

        {/* Cushions Visual (Optional - for now, the space on the rail is the cushion area) */}
        {/* Example for top cushion if desired:
        <rect 
          x={RAIL_THICKNESS_SVG} 
          y={RAIL_THICKNESS_SVG - CUSHION_VISUAL_THICKNESS_SVG} // This would be on top of wood, inside felt edge
          width={PLAYING_SURFACE_WIDTH_SVG} 
          height={CUSHION_VISUAL_THICKNESS_SVG} 
          fill="rgb(16 140 100)" // Darker shade of green
        />
        */}

        {/* Diamond Sights - ensure these are drawn on top of rails/cushions */}
        {svgDiamondSightPositions.map((sight, index) => (
          <circle
            key={`sight-${index}`}
            cx={sight.cx} // Already in SVG coordinates
            cy={sight.cy} // Already in SVG coordinates
            r={DIAMOND_SIGHT_RADIUS}
            fill="ivory"
            opacity="0.7"
          />
        ))}

        {/* Pockets - ensure these are drawn on top of rails/felt */}
        {pockets.map((pocket) => {
          // Pocket coordinates are normalized (0-1) relative to the playing surface.
          // We need to convert them to the SVG coordinate system, considering the rails.
          const svgX = toSvgX(pocket.x);
          const svgY = toSvgY(pocket.y);
          // Pocket radius is also normalized, convert to SVG units based on playing surface width
          const r = pocket.radius ? pocket.radius * PLAYING_SURFACE_WIDTH_SVG : 20; 
          
          return (
            <circle
              key={pocket.id}
              cx={svgX}
              cy={svgY}
              r={r}
              fill={selectedPocketId === pocket.id ? 'hsl(var(--accent))' : 'rgb(15,45,15)'} 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onPocketClick(pocket.id)}
              aria-label={`Select pocket ${pocket.id}`}
            />
          );
        })}

        {/* Balls - ensure these are drawn on top of felt */}
        {balls.map((ball) => {
          const svgX = toSvgX(ball.x);
          const svgY = toSvgY(ball.y);
          // Ball radius is normalized, convert to SVG units based on playing surface width
          const r = ball.radius ? ball.radius * PLAYING_SURFACE_WIDTH_SVG : (0.028 * PLAYING_SURFACE_WIDTH_SVG); 
          return (
            <g key={ball.id} transform={`translate(${svgX}, ${svgY})`}>
              <circle
                data-ball-id={ball.id}
                cx={0}
                cy={0}
                r={r}
                fill={ball.color}
                stroke={ball.color === 'white' ? 'black' : 'transparent'}
                strokeWidth={ball.color === 'white' ? 0.5 : 0}
                onMouseDown={(e) => handleMouseDown(e, ball.id)}
                style={{ cursor: 'grab' }}
              />
              {/* Shine effect */}
              <circle cx={0} cy={0} r={r} fill="url(#ballShine)" pointerEvents="none"/>
              {/* Add Cue Hit Indicator only for the cue ball */}
              {ball.id === 'cue' && cueHitOffsetX !== undefined && cueHitOffsetY !== undefined && (
                <circle
                  cx={cueHitOffsetX * r * 0.6} // 0.6 factor to keep it visually on the ball face
                  cy={cueHitOffsetY * r * 0.6} // Note: SVG Y is often inverted; for display, positive Y is down. Adjust if logic expects Y up.
                  r={Math.max(1, r * 0.1)} // Radius of the indicator dot, e.g., 10% of ball radius or at least 1
                  fill="rgba(0,0,0,0.5)" // Semi-transparent black dot
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}
        
        {/* Aiming Line */}
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
            r={ (balls[0]?.radius ? balls[0].radius * PLAYING_SURFACE_WIDTH_SVG : (0.028 * PLAYING_SURFACE_WIDTH_SVG)) / 3 } // Smaller circle for aiming point
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
