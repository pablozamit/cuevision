// src/lib/trajectory.ts

export interface Point {
  x: number;
  y: number;
}

export interface Pocket {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface TableDimensions {
  width: number;
  height: number;
}

// Default table dimensions (normalized)
export const DEFAULT_TABLE_DIMENSIONS: TableDimensions = {
  width: 1,
  height: 1,
};

// Epsilon for floating point comparisons
const EPSILON = 1e-9;

/**
 * Calculates the dot product of two vectors.
 */
function dot(v1: Point, v2: Point): number {
  return v1.x * v2.x + v1.y * v2.y;
}

/**
 * Subtracts vector v2 from v1.
 */
function subtract(v1: Point, v2: Point): Point {
  return { x: v1.x - v2.x, y: v1.y - v2.y };
}

/**
 * Adds vector v2 to v1.
 */
function add(v1: Point, v2: Point): Point {
    return { x: v1.x + v2.x, y: v1.y + v2.y };
}

/**
 * Multiplies a vector by a scalar.
 */
function multiply(v: Point, scalar: number): Point {
  return { x: v.x * scalar, y: v.y * scalar };
}

/**
 * Normalizes a vector (makes its length 1).
 */
function normalize(v: Point): Point {
    const length = Math.sqrt(v.x * v.x + v.y * v.y);
    if (length === 0) return { x: 0, y: 0 }; // Avoid division by zero
    return { x: v.x / length, y: v.y / length };
}


export type Rail = 'top' | 'bottom' | 'left' | 'right';

export interface RailHit {
  rail: Rail;
  point: Point;
  normal: Point; // Normal vector of the hit rail
}

/**
 * Determines which rail a line segment from p1 to p2 (or its extension) would hit first
 * within the table boundaries, and the intersection point.
 * Assumes p1 is inside the table.
 * @param p1 Start point of the line segment.
 * @param p2 End point of the line segment (defines direction).
 * @param tableDimensions Dimensions of the table.
 * @returns The rail hit information or null if no intersection (e.g., parallel to a rail and moving away).
 */
export function getHitRailAndIntersection(
  p1: Point,
  p2: Point,
  tableDimensions: TableDimensions = DEFAULT_TABLE_DIMENSIONS
): RailHit | null {
  const dir = subtract(p2, p1);
  let tMin = Infinity;
  let hit: RailHit | null = null;

  // Check for trivial cases (p1 already on a rail heading outwards - should not happen if p1 is strictly inside)
  // Or if dir is zero
  if (Math.abs(dir.x) < EPSILON && Math.abs(dir.y) < EPSILON) {
    return null;
  }

  // Top rail (y = 0)
  if (dir.y < -EPSILON) { // Moving towards top rail
    const t = (0 - p1.y) / dir.y;
    if (t >= 0) {
      const x = p1.x + t * dir.x;
      if (x >= -EPSILON && x <= tableDimensions.width + EPSILON) {
        if (t < tMin) {
          tMin = t;
          hit = { rail: 'top', point: { x: Math.max(0, Math.min(x, tableDimensions.width)), y: 0 }, normal: { x: 0, y: 1 } };
        }
      }
    }
  }

  // Bottom rail (y = tableDimensions.height)
  if (dir.y > EPSILON) { // Moving towards bottom rail
    const t = (tableDimensions.height - p1.y) / dir.y;
    if (t >= 0) {
      const x = p1.x + t * dir.x;
      if (x >= -EPSILON && x <= tableDimensions.width + EPSILON) {
        if (t < tMin) {
          tMin = t;
          hit = { rail: 'bottom', point: { x: Math.max(0, Math.min(x, tableDimensions.width)), y: tableDimensions.height }, normal: { x: 0, y: -1 } };
        }
      }
    }
  }

  // Left rail (x = 0)
  if (dir.x < -EPSILON) { // Moving towards left rail
    const t = (0 - p1.x) / dir.x;
    if (t >= 0) {
      const y = p1.y + t * dir.y;
      if (y >= -EPSILON && y <= tableDimensions.height + EPSILON) {
        if (t < tMin) {
          tMin = t;
          hit = { rail: 'left', point: { x: 0, y: Math.max(0, Math.min(y, tableDimensions.height)) }, normal: { x: 1, y: 0 } };
        }
      }
    }
  }

  // Right rail (x = tableDimensions.width)
  if (dir.x > EPSILON) { // Moving towards right rail
    const t = (tableDimensions.width - p1.x) / dir.x;
    if (t >= 0) {
      const y = p1.y + t * dir.y;
      if (y >= -EPSILON && y <= tableDimensions.height + EPSILON) {
        if (t < tMin) {
          tMin = t;
          hit = { rail: 'right', point: { x: tableDimensions.width, y: Math.max(0, Math.min(y, tableDimensions.height)) }, normal: { x: -1, y: 0 } };
        }
      }
    }
  }
  
  // Clamp intersection points to be exactly on the rail to avoid floating point issues
  if (hit) {
    if (hit.rail === 'top') hit.point.y = 0;
    else if (hit.rail === 'bottom') hit.point.y = tableDimensions.height;
    else if (hit.rail === 'left') hit.point.x = 0;
    else if (hit.rail === 'right') hit.point.x = tableDimensions.width;

    // Ensure x is within bounds for top/bottom hits
    if (hit.rail === 'top' || hit.rail === 'bottom') {
        hit.point.x = Math.max(0, Math.min(hit.point.x, tableDimensions.width));
    }
    // Ensure y is within bounds for left/right hits
    if (hit.rail === 'left' || hit.rail === 'right') {
        hit.point.y = Math.max(0, Math.min(hit.point.y, tableDimensions.height));
    }
  }

  return hit;
}


/**
 * Reflects an incoming direction vector off a rail.
 * @param direction The incoming direction vector.
 * @param railNormal The normal vector of the rail hit.
 * @returns The reflected direction vector.
 */
export function reflectVector(direction: Point, railNormal: Point): Point {
  // v_out = v_in - 2 * dot(v_in, n) * n
  const dotProduct = dot(direction, railNormal);
  const term = multiply(railNormal, 2 * dotProduct);
  return subtract(direction, term);
}

/**
 * Calculates the path for a ball hitting multiple rails.
 * @param startPos The starting position of the ball.
 * @param firstRailContact The point where the ball first contacts a rail. This point is *on* the rail.
 * @param numRails The total number of rails to be hit.
 * @param finalTargetPos The final target position after all rail hits.
 * @param tableDimensions The dimensions of the table.
 * @returns An array of points representing the path.
 */
export function calculateMultiRailPath(
  startPos: Point,
  firstRailContact: Point,
  numRails: number,
  finalTargetPos: Point,
  tableDimensions: TableDimensions = DEFAULT_TABLE_DIMENSIONS
): Point[] {
  if (numRails < 1) { // Should be at least 1 for rail-first shots
    return [startPos, finalTargetPos];
  }

  const path: Point[] = [startPos, firstRailContact];
  
  if (numRails === 1) {
    path.push(finalTargetPos);
    return path;
  }

  let currentPosition = firstRailContact;
  let currentDirection = normalize(subtract(firstRailContact, startPos)); // Initial direction

  // Determine the normal of the first rail hit
  let initialRailNormal: Point;
  if (Math.abs(firstRailContact.x) < EPSILON) initialRailNormal = { x: 1, y: 0 }; // Left
  else if (Math.abs(firstRailContact.x - tableDimensions.width) < EPSILON) initialRailNormal = { x: -1, y: 0 }; // Right
  else if (Math.abs(firstRailContact.y) < EPSILON) initialRailNormal = { x: 0, y: 1 }; // Top
  else if (Math.abs(firstRailContact.y - tableDimensions.height) < EPSILON) initialRailNormal = { x: 0, y: -1 }; // Bottom
  else {
    console.warn("First rail contact point is not on a rail. Path might be incorrect.", firstRailContact);
    // Fallback: assume it's the closest rail based on simple check, or error out
    // This case should ideally be prevented by `aimingPoint` being accurately on a rail.
    // For now, let's try to infer. If x is 0 or 1, it's left/right. If y is 0 or 1, it's top/bottom.
    // This is a simplification. A more robust approach might be needed if points aren't exact.
    // Default to a common scenario or throw error. For now, we'll proceed with a guess.
    if (firstRailContact.x < tableDimensions.width / 2) initialRailNormal = { x: 1, y: 0}; // Assume left
    else initialRailNormal = { x: -1, y: 0 }; // Assume right
    // A better fallback might be to find the closest rail to firstRailContact
  }
  
  let railNormal = initialRailNormal;

  for (let i = 1; i < numRails; i++) {
    const reflectedDir = reflectVector(currentDirection, railNormal);
    
    // Project from currentPosition along reflectedDir to find the next rail hit.
    // We need to ensure the projection starts slightly off the current rail to avoid re-hitting it.
    const slightlyOffRail = add(currentPosition, multiply(reflectedDir, EPSILON * 100)); // Move a tiny bit along the new direction

    const nextHit = getHitRailAndIntersection(slightlyOffRail, add(slightlyOffRail, reflectedDir), tableDimensions);

    if (!nextHit) {
      // console.warn(`Could not find next rail hit for rail ${i + 1}. Path might be incomplete.`);
      // This can happen if the ball is heading into a pocket or parallel to rails after reflection.
      // For now, we'll end the path here and add the final target.
      break; 
    }

    path.push(nextHit.point);
    currentPosition = nextHit.point;
    currentDirection = reflectedDir; // Direction remains the same, it's the vector after reflection
    railNormal = nextHit.normal;
  }

  path.push(finalTargetPos);
  return path;
}


/**
 * Calculates the trajectories for the cue ball and object ball.
 * @param cueBallPos Position of the cue ball.
 * @param objectBallPos Position of the object ball.
 * @param targetPocketPos Position of the target pocket.
 * @param shotSuggestion Contains the aimingPoint from AI.
 * @param aimingMethod 'ball-first' or 'rail-first'.
 * @param numRails Number of rails involved (for 'rail-first' or complex object ball paths).
 * @param tableDimensions Dimensions of the table.
 * @returns An object containing cueBallTrajectory and objectBallTrajectory.
 */
export function calculateTrajectories(
  cueBallPos: Point,
  objectBallPos: Point,
  targetPocketPos: Point,
  shotSuggestion: { aimingPoint: Point }, // Assuming aimingPoint is always provided
  aimingMethod: 'ball-first' | 'rail-first',
  numRails: number, // This is the numRails for the cue ball if rail-first, or object ball if ball-first bank
  tableDimensions: TableDimensions = DEFAULT_TABLE_DIMENSIONS
): { cueBallTrajectory: Point[]; objectBallTrajectory: Point[] } {
  let cueBallTraj: Point[];
  let objectBallTraj: Point[];

  if (aimingMethod === 'ball-first') {
    cueBallTraj = [cueBallPos, shotSuggestion.aimingPoint];
    
    // For 'ball-first', object ball trajectory is simplified for now as per subtask instructions
    // It does not consider multi-rail banks for the object ball in this version.
    // If numRails > 0 was intended for object ball banks in ball-first, that's future work.
    // Here, numRails primarily applies to cue ball in 'rail-first'.
    objectBallTraj = [objectBallPos, targetPocketPos]; // Direct shot for object ball

  } else { // aimingMethod === 'rail-first'
    // In 'rail-first', shotSuggestion.aimingPoint is the first rail contact point for the cue ball.
    cueBallTraj = calculateMultiRailPath(
      cueBallPos,
      shotSuggestion.aimingPoint,
      numRails, // numRails here refers to the cue ball's path
      objectBallPos, // The cue ball's final target is the object ball
      tableDimensions
    );
    // After cue ball hits object ball, object ball goes directly to pocket (simplified for now)
    objectBallTraj = [objectBallPos, targetPocketPos];
  }

  return { cueBallTrajectory: cueBallTraj, objectBallTrajectory: objectBallTraj };
}
