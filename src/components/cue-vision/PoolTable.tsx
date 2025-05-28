
"use client";

import type { Ball, Pocket, PocketPosition, AimingPoint } from '@/types/pool';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Vector,
  subtract,
  dotProduct,
  multiplyScalar,
  length,
  normalize,
  reflect,
  distance,
  add,
} from '@/lib/utils';
import {
  calculateTrajectory,
  calculatePreciseCollision,
  type TrajectoryPoint,
  type CollisionResult,
} from '@/lib/physics';

interface PoolTableProps {
  balls: Ball[];
  pockets: Pocket[];
  selectedPocketId?: PocketPosition | null;
  // cueBall?: Ball | null; // Replaced by selectedCueBallId for logic, but might still be passed for other uses.
  aimingPoint?: AimingPoint | null;
  onPocketClick: (pocketId: PocketPosition) => void;
  onBallMove: (ballId: string, newPosition: { x: number; y: number }) => void;
  tableWidth?: number; // SVG units
  tableHeight?: number; // SVG units
  aimingMethod: 'ball-first' | 'rail-first';
  numRails: number;
  selectedCueBallId?: string | null;
  selectedObjectBallId?: string | null;
  onShotParamsCalculated: (params: { angle: number | null; power: number | null }) => void;
  velocityDecayFactor: number;
}

const DEFAULT_TABLE_WIDTH = 800;
const DEFAULT_TABLE_HEIGHT = 400;

const DIAMOND_SIGHT_RADIUS = 3; // SVG units
const CUSHION_VISUAL_THICKNESS_NORMALIZED = 0.03; // Normalized to table width for drawing diamonds

export default function PoolTable({
  balls,
  pockets,
  selectedPocketId,
  // cueBall, // Potentially remove if selectedCueBallId is primary
  aimingPoint,
  onPocketClick,
  onBallMove,
  tableWidth = DEFAULT_TABLE_WIDTH,
  tableHeight = DEFAULT_TABLE_HEIGHT,
  aimingMethod,
  numRails,
  selectedCueBallId,
  selectedObjectBallId,
  onShotParamsCalculated,
  velocityDecayFactor,
}: PoolTableProps) {
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggedBall, setDraggedBall] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [cueBallTrajectory, setCueBallTrajectory] = useState<TrajectoryPoint[] | null>(null);
  const [objectBallTrajectory, setObjectBallTrajectory] = useState<TrajectoryPoint[] | null>(null);

  // Helper function for 'Ball-First' trajectories
  const calculateBallFirstTrajectories = (
    currentCueBall: Ball,
    objectBall: Ball,
    numRails: number,
    velocityDecayFactor: number
  ): { cueTrajectory: TrajectoryPoint[] | null; objectTrajectory: TrajectoryPoint[] | null } => {
    const cueStartPoint: Vector = { x: currentCueBall.x, y: currentCueBall.y };
    const objCenterPoint: Vector = { x: objectBall.x, y: objectBall.y };
    const dirCueToObj = normalize(subtract(objCenterPoint, cueStartPoint));
    const objBallRadius = objectBall.radius || 0.028;
    const collisionPointOnObjectBall = subtract(objCenterPoint, multiplyScalar(dirCueToObj, objBallRadius));

    const cueTrajectory: TrajectoryPoint[] = [
      { ...cueStartPoint, type: 'start' },
      { ...collisionPointOnObjectBall, type: 'end' },
    ];

    const objStartPoint: Vector = { x: objectBall.x, y: objectBall.y };
    const objInitialDirection = dirCueToObj;
    const objectTrajectory = calculateTrajectory(
      objStartPoint,
      objInitialDirection,
      objBallRadius,
      numRails,
      velocityDecayFactor
    );
    return { cueTrajectory, objectTrajectory };
  };

  // Helper function for 'Rail-First' trajectories
  const calculateRailFirstTrajectories = (
    currentCueBall: Ball,
    objectBall: Ball | null,
    aimingPoint: AimingPoint,
    selectedPocketId: PocketPosition | null,
    numRails: number,
    velocityDecayFactor: number,
    pockets: Pocket[]
  ): { cueTrajectory: TrajectoryPoint[] | null; objectTrajectory: TrajectoryPoint[] | null } => {
    const cueStartPoint: Vector = { x: currentCueBall.x, y: currentCueBall.y };
    const initialCueDirection = normalize(subtract(aimingPoint, cueStartPoint));
    const currentCueBallRadius = currentCueBall.radius || 0.028;

    const rawCueTrajectory = calculateTrajectory(
      cueStartPoint,
      initialCueDirection,
      currentCueBallRadius,
      numRails,
      velocityDecayFactor
    );

    let actualCollisionResult: CollisionResult | null = null;
    let indexOfSegmentWithCollision = -1;

    if (objectBall) {
      for (let i = 0; i < rawCueTrajectory.length - 1; i++) {
        const segmentStart = rawCueTrajectory[i];
        const segmentEnd = rawCueTrajectory[i + 1];
        const cueRadius = currentCueBallRadius;
        const objRadius = objectBall.radius || 0.028;
        const result = calculatePreciseCollision(
          segmentStart,
          segmentEnd,
          cueRadius,
          { x: objectBall.x, y: objectBall.y },
          objRadius
        );
        if (result) {
          actualCollisionResult = result;
          indexOfSegmentWithCollision = i;
          break;
        }
      }
    }

    if (actualCollisionResult && objectBall && selectedPocketId) {
      const calculatedCueTrajectoryBeforeCollision = rawCueTrajectory.slice(0, indexOfSegmentWithCollision + 1).map(p => ({ ...p }));
      calculatedCueTrajectoryBeforeCollision.push({
        x: actualCollisionResult.collisionPointOnCuePath.x,
        y: actualCollisionResult.collisionPointOnCuePath.y,
        type: 'end',
      });

      const targetPocketInfo = pockets.find(p => p.id === selectedPocketId);
      if (!targetPocketInfo) {
        return { cueTrajectory: calculatedCueTrajectoryBeforeCollision, objectTrajectory: null };
      }

      const forceDirection = normalize(subtract({ x: objectBall.x, y: objectBall.y }, actualCollisionResult.collisionPointOnCuePath));
      const objStartPoint: Vector = { x: objectBall.x, y: objectBall.y };
      const objRadius = objectBall.radius || 0.028;
      const objectTrajectory = calculateTrajectory(
        objStartPoint,
        forceDirection,
        objRadius,
        numRails,
        velocityDecayFactor
      );
      return { cueTrajectory: calculatedCueTrajectoryBeforeCollision, objectTrajectory };
    } else {
      return { cueTrajectory: rawCueTrajectory, objectTrajectory: null };
    }
  };
  
  // Helper function for Angle and Power Calculation
  const updateShotParameters = (
    cueTrajectory: TrajectoryPoint[] | null,
    objectTrajectory: TrajectoryPoint[] | null
  ) => {
    let calculatedAngleDeg: number | null = null;
    if (cueTrajectory && cueTrajectory.length >= 2) {
      const p1 = cueTrajectory[0];
      const p2 = cueTrajectory[1];
      const dirVec = subtract(p2, p1);
      const angleRad = Math.atan2(dirVec.y, dirVec.x);
      calculatedAngleDeg = angleRad * (180 / Math.PI);
    }

    const calculatePathLength = (trajectory: TrajectoryPoint[] | null): number => {
      if (!trajectory) return 0;
      let pathLen = 0;
      for (let i = 0; i < trajectory.length - 1; i++) {
        pathLen += distance(trajectory[i], trajectory[i + 1]);
      }
      return pathLen;
    };

    const cuePathLength = calculatePathLength(cueTrajectory);
    const objectPathLength = calculatePathLength(objectTrajectory);
    let totalPathLength: number | null = 0;

    if (cuePathLength === 0 && objectPathLength === 0 && !calculatedAngleDeg) {
      totalPathLength = null;
    } else {
      totalPathLength = cuePathLength + objectPathLength;
    }
    onShotParamsCalculated({ angle: calculatedAngleDeg, power: totalPathLength });
  };


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

  useEffect(() => {
    setCueBallTrajectory(null);
    setObjectBallTrajectory(null);

    const currentCueBall = balls.find(b => b.id === selectedCueBallId);
    const objectBall = selectedObjectBallId ? balls.find(b => b.id === selectedObjectBallId) : null;

    if (!currentCueBall) return; // No cue ball selected, do nothing

    let finalCueTrajectory: TrajectoryPoint[] | null = null;
    let finalObjectTrajectory: TrajectoryPoint[] | null = null;

    const currentCueBall = balls.find(b => b.id === selectedCueBallId);
    const objectBall = selectedObjectBallId ? balls.find(b => b.id === selectedObjectBallId) : null;

    if (!currentCueBall) {
      onShotParamsCalculated({ angle: null, power: null });
      return;
    }

    if (aimingMethod === 'ball-first' && objectBall) {
      const trajectories = calculateBallFirstTrajectories(
        currentCueBall,
        objectBall,
        numRails,
        velocityDecayFactor
      );
      finalCueTrajectory = trajectories.cueTrajectory;
      finalObjectTrajectory = trajectories.objectTrajectory;
    } else if (aimingMethod === 'rail-first' && aimingPoint) {
      const trajectories = calculateRailFirstTrajectories(
        currentCueBall,
        objectBall, // Can be null
        aimingPoint,
        selectedPocketId, // Can be null
        numRails,
        velocityDecayFactor,
        pockets
      );
      finalCueTrajectory = trajectories.cueTrajectory;
      finalObjectTrajectory = trajectories.objectTrajectory;
    } else if (aimingMethod === 'ball-first' && !objectBall) {
        // If aiming for ball-first but no object ball is selected, clear trajectories
        // This case is handled by the early return if !objectBall, but added for explicit clarity
        onShotParamsCalculated({ angle: null, power: null });
    }


    setCueBallTrajectory(finalCueTrajectory);
    setObjectBallTrajectory(finalObjectTrajectory);
    updateShotParameters(finalCueTrajectory, finalObjectTrajectory);

  }, [
    balls, 
    selectedCueBallId, 
    selectedObjectBallId, 
    aimingPoint, 
    selectedPocketId, 
    aimingMethod, 
    numRails, 
    pockets, 
    onShotParamsCalculated, 
    velocityDecayFactor
  ]);


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
        
        {/* Aiming Line - Show only if new trajectories are NOT being displayed, and we have a cue ball and aiming point */}
        {!cueBallTrajectory && selectedCueBallId && balls.find(b => b.id === selectedCueBallId) && aimingPoint && (
          <line
            x1={toSvgX(balls.find(b => b.id === selectedCueBallId)!.x)}
            y1={toSvgY(balls.find(b => b.id === selectedCueBallId)!.y)}
            x2={toSvgX(aimingPoint.x)}
            y2={toSvgY(aimingPoint.y)}
            stroke="hsl(var(--accent))"
            strokeWidth="2"
            strokeDasharray="4 2"
            pointerEvents="none"
          />
        )}
        
        {/* Suggested Aiming Point visualization - Show only if new trajectories are NOT being displayed */}
        {!cueBallTrajectory && aimingPoint && (
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

        {/* Cue Ball Trajectory */}
        {cueBallTrajectory && (
          <polyline
            points={cueBallTrajectory.map(p => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ')}
            stroke="cyan"
            strokeWidth="2"
            strokeDasharray="5 3"
            fill="none"
            pointerEvents="none"
          />
        )}

        {/* Object Ball Trajectory */}
        {objectBallTrajectory && (
          <polyline
            points={objectBallTrajectory.map(p => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ')}
            stroke="yellow"
            strokeWidth="2"
            strokeDasharray="5 3"
            fill="none"
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  );
}
