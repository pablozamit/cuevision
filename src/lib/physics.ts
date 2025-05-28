import {
  Vector,
  subtract,
  dotProduct,
  multiplyScalar,
  length,
  normalize,
  reflect,
  add,
} from '@/lib/utils';

export interface TrajectoryPoint extends Vector {
  type: 'start' | 'bounce' | 'end';
}

const TOP_NORMAL: Vector = { x: 0, y: 1 };
const BOTTOM_NORMAL: Vector = { x: 0, y: -1 };
const LEFT_NORMAL: Vector = { x: 1, y: 0 };
const RIGHT_NORMAL: Vector = { x: -1, y: 0 };

export function calculateTrajectory(
  startPoint: Vector,
  initialDirection: Vector,
  ballRadiusNormalized: number,
  maxBounces: number,
  velocityDecayFactor: number = 1.0
): TrajectoryPoint[] {
  const trajectory: TrajectoryPoint[] = [{ ...startPoint, type: 'start' }];
  let currentPosition = { ...startPoint };
  let currentDirection = normalize(initialDirection);
  let currentVelocityMagnitude = 1.0; // Initialize velocity magnitude
  const MIN_VELOCITY_THRESHOLD = 0.05; // Define minimum velocity threshold

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
    currentDirection = normalize(currentDirection); // Explicitly normalize after reflection
    
    // Apply velocity decay
    currentVelocityMagnitude *= velocityDecayFactor;
    if (currentVelocityMagnitude < MIN_VELOCITY_THRESHOLD) {
      break; // Stop if velocity is below threshold
    }
  }

  // Final segment
  let tMinFinal = Infinity;

  // Check if currentDirection is a zero vector
  if (currentDirection.x === 0 && currentDirection.y === 0) {
    tMinFinal = 0; // Ball has stopped, no further extension
  } else {
    // Top rail (y=0)
    if (currentDirection.y < 0) { // Moving towards top rail
      const t = (0 + ballRadiusNormalized - currentPosition.y) / currentDirection.y;
      if (t > 1e-6 && t < tMinFinal) { tMinFinal = t; }
    }
    // Bottom rail (y=1)
    if (currentDirection.y > 0) { // Moving towards bottom rail
      const t = (1 - ballRadiusNormalized - currentPosition.y) / currentDirection.y;
      if (t > 1e-6 && t < tMinFinal) { tMinFinal = t; }
    }
    // Left rail (x=0)
    if (currentDirection.x < 0) { // Moving towards left rail
      const t = (0 + ballRadiusNormalized - currentPosition.x) / currentDirection.x;
      if (t > 1e-6 && t < tMinFinal) { tMinFinal = t; }
    }
    // Right rail (x=1)
    if (currentDirection.x > 0) { // Moving towards right rail
      const t = (1 - ballRadiusNormalized - currentPosition.x) / currentDirection.x;
      if (t > 1e-6 && t < tMinFinal) { tMinFinal = t; }
    }
  }

  if (tMinFinal === Infinity) {
      tMinFinal = 0; 
  }
  
  const finalCalculatedPoint = add(currentPosition, multiplyScalar(currentDirection, tMinFinal));
  finalCalculatedPoint.x = Math.max(ballRadiusNormalized, Math.min(1 - ballRadiusNormalized, finalCalculatedPoint.x));
  finalCalculatedPoint.y = Math.max(ballRadiusNormalized, Math.min(1 - ballRadiusNormalized, finalCalculatedPoint.y));

  trajectory.push({ ...finalCalculatedPoint, type: 'end' });

  return trajectory;
}

export interface CollisionResult {
  collisionTime: number; 
  collisionPointOnCuePath: Vector;
}

export function calculatePreciseCollision(
  cuePathStart: Vector,
  cuePathEnd: Vector,
  cueBallRadius: number,
  objectBallCenter: Vector,
  objectBallRadius: number
): CollisionResult | null {
  const V = subtract(cuePathEnd, cuePathStart);
  const pathLength = length(V);
  if (pathLength === 0) return null;
  const Vnorm = normalize(V); 

  const totalRadius = cueBallRadius + objectBallRadius;
  const cueToObjectCenter = subtract(cuePathStart, objectBallCenter);

  const a = 1.0; 
  const b = 2 * dotProduct(Vnorm, cueToObjectCenter);
  const c = dotProduct(cueToObjectCenter, cueToObjectCenter) - totalRadius * totalRadius;

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return null; 
  }

  const sqrtDiscriminant = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDiscriminant) / (2 * a);
  const t2 = (-b + sqrtDiscriminant) / (2 * a);

  let collisionTime = -1;

  if (t1 >= -1e-6 && t1 <= pathLength + 1e-6) { 
    collisionTime = Math.max(0, t1); 
  }
  if (t2 >= -1e-6 && t2 <= pathLength + 1e-6) { 
    const currentT2 = Math.max(0, t2);
    if (collisionTime === -1 || currentT2 < collisionTime) {
      collisionTime = currentT2;
    }
  }
  
  if (collisionTime !== -1 && collisionTime <= pathLength + 1e-6) { 
    collisionTime = Math.min(collisionTime, pathLength); 

    const collisionPointOnCuePath = add(cuePathStart, multiplyScalar(Vnorm, collisionTime));
    return {
      collisionTime,
      collisionPointOnCuePath,
    };
  }

  return null;
}
