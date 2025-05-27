
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
  // ballRadius is now taken from individual ball.radius (normalized)
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
}: PoolTableProps) {
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggedBall, setDraggedBall] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const toSvgX = useCallback((normalizedX: number) => normalizedX * tableWidth, [tableWidth]);
  const toSvgY = useCallback((normalizedY: number) => normalizedY * tableHeight, [tableHeight]);
  const fromSvgX = useCallback((svgX: number) => svgX / tableWidth, [tableWidth]);
  const fromSvgY = useCallback((svgY: number) => svgY / tableHeight, [tableHeight]);

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
          <radialGradient id="ballShine" cx="0.35" cy="0.35" r="0.5">
            <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        {/* Table Surface (felt) - parent div provides main color, this rect is for events or patterns if any */}
        <rect x="0" y="0" width={tableWidth} height={tableHeight} fill="transparent" />

        {/* Diamond Sights */}
        {diamondSightPositions.map((sight, index) => (
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
          const r = pocket.radius ? toSvgX(pocket.radius) : 20; // Use pocket's normalized radius
          return (
            <circle
              key={pocket.id}
              cx={svgX}
              cy={svgY}
              r={r}
              fill={selectedPocketId === pocket.id ? 'hsl(var(--accent))' : 'rgb(15,45,15)'} // Darker green for pocket hole
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onPocketClick(pocket.id)}
              aria-label={`Select pocket ${pocket.id}`}
            />
          );
        })}

        {/* Balls */}
        {balls.map((ball) => {
          const svgX = toSvgX(ball.x);
          const svgY = toSvgY(ball.y);
          const r = ball.radius ? toSvgX(ball.radius) : (0.028 * tableWidth); 
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
