
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

interface TrajectoryPoint extends Vector {
  type: 'start' | 'bounce' | 'end';
}

const TOP_NORMAL: Vector = { x: 0, y: 1 };
const BOTTOM_NORMAL: Vector = { x: 0, y: -1 };
const LEFT_NORMAL: Vector = { x: 1, y: 0 };
const RIGHT_NORMAL: Vector = { x: -1, y: 0 };

function calculateTrajectory(
  startPoint: Vector,
  initialDirection: Vector,
  ballRadiusNormalized: number,
  maxBounces: number,
  velocityDecayFactor: number = 1.0 
): TrajectoryPoint[] {
  const trajectory: TrajectoryPoint[] = [{ ...startPoint, type: 'start' }];
  let currentPosition = { ...startPoint };
  let currentDirection = normalize(initialDirection);
  // let currentVelocityMagnitude = 1.0; // Optional: for velocity decay

  for (let bounceCount = 0; bounceCount < maxBounces; bounceCount++) {
    let tMin = Infinity;
    let nextCollisionNormal: Vector | null = null;

    // Top rail (y=0)
    if (currentDirection.y < 0) { // Moving towards top rail
      const t = (0 + ballRadiusNormalized - currentPosition.y) / currentDirection.y;
      if (t > 1e-6 && t < tMin) { // t > 0 (epsilon for floating point)
        tMin = t;
        nextCollisionNormal = TOP_NORMAL;
      }
    }

    // Bottom rail (y=1)
    if (currentDirection.y > 0) { // Moving towards bottom rail
      const t = (1 - ballRadiusNormalized - currentPosition.y) / currentDirection.y;
      if (t > 1e-6 && t < tMin) {
        tMin = t;
        nextCollisionNormal = BOTTOM_NORMAL;
      }
    }

    // Left rail (x=0)
    if (currentDirection.x < 0) { // Moving towards left rail
      const t = (0 + ballRadiusNormalized - currentPosition.x) / currentDirection.x;
      if (t > 1e-6 && t < tMin) {
        tMin = t;
        nextCollisionNormal = LEFT_NORMAL;
      }
    }

    // Right rail (x=1)
    if (currentDirection.x > 0) { // Moving towards right rail
      const t = (1 - ballRadiusNormalized - currentPosition.x) / currentDirection.x;
      if (t > 1e-6 && t < tMin) {
        tMin = t;
        nextCollisionNormal = RIGHT_NORMAL;
      }
    }

    if (tMin === Infinity || !nextCollisionNormal) {
      // No collision detected, or moving away from all rails
      break;
    }

    const collisionPoint = add(currentPosition, multiplyScalar(currentDirection, tMin));
    trajectory.push({ ...collisionPoint, type: 'bounce' });
    currentPosition = collisionPoint;
    
    currentDirection = reflect(currentDirection, nextCollisionNormal);
    // currentDirection = normalize(currentDirection); // reflect should ideally return a normalized vector if normal is normalized. If not, re-normalize.
                                                     // Our current reflect implementation does not guarantee normalization of the reflected vector.
                                                     // However, for perfect reflection, the magnitude of velocity (and thus direction vector) shouldn't change.
                                                     // Let's assume reflect preserves length if input normal is normalized.
                                                     // And our rail normals ARE normalized.

    // Optional: decay velocity
    // currentVelocityMagnitude *= velocityDecayFactor;
    // if (currentVelocityMagnitude < SOME_THRESHOLD) break; // Stop if too slow
  }

  // Final segment
  const endPoint = add(currentPosition, multiplyScalar(currentDirection, 2.0)); // Extend by 2.0 normalized units
  trajectory.push({ ...endPoint, type: 'end' });

  return trajectory;
}

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
  aimingMethod: 'ball-first' | 'rail-first';
  numRails: number;
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
  aimingMethod,
  numRails,
}: PoolTableProps) {
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggedBall, setDraggedBall] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [cueBallTrajectory, setCueBallTrajectory] = useState<TrajectoryPoint[] | null>(null);
  const [objectBallTrajectory, setObjectBallTrajectory] = useState<TrajectoryPoint[] | null>(null);

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

    const currentCueBall = balls.find(b => b.id === cueBall?.id);
    if (!currentCueBall) return;

    const objectBall = balls.find(b => b.id !== currentCueBall.id);
    // For "ball-first", we need an object ball.
    if (aimingMethod === 'ball-first' && !objectBall) return;


    if (aimingMethod === 'ball-first' && objectBall) {
      // Cue Ball Trajectory: Straight line to the object ball's edge
      const cueStartPoint: Vector = { x: currentCueBall.x, y: currentCueBall.y };
      const objCenterPoint: Vector = { x: objectBall.x, y: objectBall.y };
      
      const dirCueToObj = normalize(subtract(objCenterPoint, cueStartPoint));
      const ballRadius = objectBall.radius || 0.028; // Default if not specified

      // Calculate the actual collision point on the circumference of the object ball
      const collisionPointOnObjectBall = subtract(objCenterPoint, multiplyScalar(dirCueToObj, ballRadius));
      
      setCueBallTrajectory([
        { ...cueStartPoint, type: 'start' },
        { ...collisionPointOnObjectBall, type: 'end' } 
      ]);

      // Object Ball Trajectory: From its center, in the direction of cue ball impact, then bounces
      const objStartPoint: Vector = { x: objectBall.x, y: objectBall.y };
      // The initial direction of the object ball is the same as the cue ball's direction towards it
      const objInitialDirection = dirCueToObj; 

      const objTrajectory = calculateTrajectory(
        objStartPoint,
        objInitialDirection,
        ballRadius,
        numRails
      );
      setObjectBallTrajectory(objTrajectory);
    }
    // TODO: Logic for 'rail-first' will be handled in a future step
    else if (aimingMethod === 'rail-first') {
      if (!objectBall || !selectedPocketId || !aimingPoint) {
        // aimingPoint is the target on the first rail or in that direction for rail-first shots
        return;
      }

      const cueStartPoint: Vector = { x: currentCueBall.x, y: currentCueBall.y };
      const initialCueDirection = normalize(subtract(aimingPoint, cueStartPoint)); // aimingPoint is the target for the first rail
      const currentCueBallRadius = currentCueBall.radius || 0.028;
      const objectBallRadius = objectBall.radius || 0.028;

      const rawCueTrajectory = calculateTrajectory(
        cueStartPoint,
        initialCueDirection,
        currentCueBallRadius,
        numRails
      );

      let collisionWithObjectBallPoint: Vector | null = null;
      let cueTrajectoryBeforeCollision: TrajectoryPoint[] = [];
      for (let i = 0; i < rawCueTrajectory.length; i++) {
        const point = rawCueTrajectory[i];
        cueTrajectoryBeforeCollision.push(point);
        // Simplified collision check: distance between trajectory point and object ball center
        if (distance(point, { x: objectBall.x, y: objectBall.y }) < objectBallRadius + currentCueBallRadius) {
          // Approximation: use this point as the collision event.
          // A more accurate point would be on the circumference of both balls at the point of contact.
          collisionWithObjectBallPoint = point; 
          break;
        }
      }
      
      setCueBallTrajectory(cueTrajectoryBeforeCollision);

      if (collisionWithObjectBallPoint) {
        const targetPocketInfo = pockets.find(p => p.id === selectedPocketId);
        if (!targetPocketInfo) {
          setObjectBallTrajectory(null); // Should not happen if selectedPocketId is valid
          return;
        }
        const pocketTargetPoint: Vector = { x: targetPocketInfo.x, y: targetPocketInfo.y };
        const objStartPoint: Vector = { x: objectBall.x, y: objectBall.y };
        const objInitialDirection = normalize(subtract(pocketTargetPoint, objStartPoint));
        
        const objTrajectory = calculateTrajectory(
          objStartPoint,
          objInitialDirection,
          objectBallRadius,
          0 // 0 rails for object ball in this mode
        );
        setObjectBallTrajectory(objTrajectory);
      } else {
        setObjectBallTrajectory(null); // No collision, object ball doesn't move
      }
    }

    // --- Angle and Power Calculations (after trajectories are potentially set) ---
    // This needs to access the state *after* it's updated.
    // The most reliable way to do this is to trigger another effect or calculate directly
    // from the trajectory variables before setting them.
    // However, for logging as requested, we can use the local trajectory variables
    // that are about to be set into state.
    
    // Let's use a temporary local variable to hold the cue ball trajectory for calculations
    // This is because setState is async. For immediate calculation, use the value you're about to set.
    let currentCueTrajectoryForCalc: TrajectoryPoint[] | null = null;
    if (aimingMethod === 'ball-first' && cueBall && balls.find(b => b.id !== cueBall.id)) {
        // Re-calculate cue trajectory for ball-first as it's simple and was set above
        const currentCueBall = balls.find(b => b.id === cueBall?.id);
        const objectBall = balls.find(b => b.id !== currentCueBall?.id);
        if (currentCueBall && objectBall) {
            const cueStartPoint: Vector = { x: currentCueBall.x, y: currentCueBall.y };
            const objCenterPoint: Vector = { x: objectBall.x, y: objectBall.y };
            const dirCueToObj = normalize(subtract(objCenterPoint, cueStartPoint));
            const ballRadius = objectBall.radius || 0.028;
            const collisionPointOnObjectBall = subtract(objCenterPoint, multiplyScalar(dirCueToObj, ballRadius));
            currentCueTrajectoryForCalc = [ { ...cueStartPoint, type: 'start' }, { ...collisionPointOnObjectBall, type: 'end' } ];
        }
    } else if (aimingMethod === 'rail-first' && cueBallTrajectory) { // cueBallTrajectory here refers to the one calculated in this effect run
        currentCueTrajectoryForCalc = cueBallTrajectory;
    }


    if (currentCueTrajectoryForCalc && currentCueTrajectoryForCalc.length >= 2) {
      const p1 = currentCueTrajectoryForCalc[0];
      const p2 = currentCueTrajectoryForCalc[1];
      const dirVec = subtract(p2, p1);
      const angleRad = Math.atan2(dirVec.y, dirVec.x);
      const angleDeg = angleRad * (180 / Math.PI);
      console.log("Calculated Cue Ball Angle (deg):", angleDeg);
    }

    let totalPathLength = 0;
    const calculatePathLength = (trajectory: TrajectoryPoint[] | null) => {
      if (!trajectory) return 0;
      let pathLen = 0;
      for (let i = 0; i < trajectory.length - 1; i++) {
        pathLen += distance(trajectory[i], trajectory[i + 1]);
      }
      return pathLen;
    };
    
    // Use the locally computed trajectories for length calculation before they are set to state
    if (aimingMethod === 'ball-first') {
        totalPathLength += calculatePathLength(currentCueTrajectoryForCalc); // from re-calc above
        // Object ball trajectory for ball-first was also calculated above
        const currentCueBall = balls.find(b => b.id === cueBall?.id);
        const objectBall = balls.find(b => b.id !== currentCueBall?.id);
        if (currentCueBall && objectBall) {
            const objStartPoint: Vector = { x: objectBall.x, y: objectBall.y };
            const dirCueToObj = normalize(subtract({ x: objectBall.x, y: objectBall.y }, { x: currentCueBall.x, y: currentCueBall.y }));
            const objInitialDirection = dirCueToObj;
            const ballRadius = objectBall.radius || 0.028;
            const objTraj = calculateTrajectory(objStartPoint, objInitialDirection, ballRadius, numRails);
            totalPathLength += calculatePathLength(objTraj);
        }

    } else if (aimingMethod === 'rail-first') {
        totalPathLength += calculatePathLength(cueBallTrajectory); // cueBallTrajectory is the new one calculated in this 'rail-first' block
        totalPathLength += calculatePathLength(objectBallTrajectory); // objectBallTrajectory is the new one from this 'rail-first' block
    }
    
    console.log("Calculated Total Path Length (proxy for power):", totalPathLength);

  }, [balls, cueBall, aimingPoint, selectedPocketId, aimingMethod, numRails, pockets /* remove toSvgX/Y if not directly used */]);


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
        
        {/* Aiming Line - Show only if new trajectories are NOT being displayed */}
        {!cueBallTrajectory && cueBall && aimingPoint && (
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
