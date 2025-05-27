"use client";

import type { Ball, Pocket, PocketPosition, AimingPoint } from '@/types/pool';
import React from 'react';

interface PoolTableProps {
  balls: Ball[];
  pockets: Pocket[];
  selectedPocketId?: PocketPosition | null;
  cueBall?: Ball | null;
  aimingPoint?: AimingPoint | null;
  onPocketClick: (pocketId: PocketPosition) => void;
  tableWidth?: number; // SVG units
  tableHeight?: number; // SVG units
  ballRadius?: number; // SVG units
}

const DEFAULT_TABLE_WIDTH = 800;
const DEFAULT_TABLE_HEIGHT = 400;
const DEFAULT_BALL_RADIUS = 12; // SVG units, example
const DEFAULT_POCKET_VISUAL_RADIUS = 20; // SVG units for clickable area

export default function PoolTable({
  balls,
  pockets,
  selectedPocketId,
  cueBall,
  aimingPoint,
  onPocketClick,
  tableWidth = DEFAULT_TABLE_WIDTH,
  tableHeight = DEFAULT_TABLE_HEIGHT,
  ballRadius = DEFAULT_BALL_RADIUS,
}: PoolTableProps) {
  
  // Helper to convert normalized coordinates to SVG coordinates
  const toSvgX = (normalizedX: number) => normalizedX * tableWidth;
  const toSvgY = (normalizedY: number) => normalizedY * tableHeight;

  return (
    <div className="aspect-[2/1] w-full max-w-4xl mx-auto bg-green-700 rounded-lg shadow-xl border-8 border-yellow-700 overflow-hidden relative p-4" data-ai-hint="pool table">
      <svg 
        viewBox={`0 0 ${tableWidth} ${tableHeight}`} 
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Table Surface (already green from parent div, but can add felt texture pattern here if desired) */}
        <rect x="0" y="0" width={tableWidth} height={tableHeight} fill="transparent" />

        {/* Pockets */}
        {pockets.map((pocket) => {
          const svgX = toSvgX(pocket.x);
          const svgY = toSvgY(pocket.y);
          return (
            <circle
              key={pocket.id}
              cx={svgX}
              cy={svgY}
              r={DEFAULT_POCKET_VISUAL_RADIUS}
              fill={selectedPocketId === pocket.id ? 'hsl(var(--accent))' : 'black'}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onPocketClick(pocket.id)}
              aria-label={`Select pocket ${pocket.id}`}
            />
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
          />
        )}
        
        {/* Suggested Aiming Point visualization */}
        {aimingPoint && (
           <circle
            cx={toSvgX(aimingPoint.x)}
            cy={toSvgY(aimingPoint.y)}
            r={ballRadius / 2}
            fill="hsl(var(--accent))"
            stroke="white"
            strokeWidth="1"
          />
        )}


        {/* Balls */}
        {balls.map((ball) => {
          const svgX = toSvgX(ball.x);
          const svgY = toSvgY(ball.y);
          const r = ball.radius ? toSvgX(ball.radius) : ballRadius; // Use normalized radius if available, else default
          return (
            <circle
              key={ball.id}
              cx={svgX}
              cy={svgY}
              r={r}
              fill={ball.color}
              stroke={ball.color === 'white' ? 'black' : 'transparent'}
              strokeWidth={ball.color === 'white' ? 1 : 0}
            />
          );
        })}
      </svg>
    </div>
  );
}
