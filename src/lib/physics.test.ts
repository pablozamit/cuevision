import {
  calculateTrajectory,
  calculatePreciseCollision,
  type TrajectoryPoint,
  type CollisionResult,
} from './physics';
import type { Vector } from './utils'; // Assuming Vector is still in utils

// Default ball radius for tests
const DEFAULT_BALL_RADIUS = 0.028; // Normalized

describe('calculateTrajectory', () => {
  it('should calculate a straight line to the edge without bounces', () => {
    const startPoint: Vector = { x: 0.5, y: 0.5 };
    const direction: Vector = { x: 1, y: 0 }; // Move right
    const trajectory = calculateTrajectory(startPoint, direction, DEFAULT_BALL_RADIUS, 0, 1.0);
    expect(trajectory.length).toBe(2);
    expect(trajectory[0]).toEqual({ ...startPoint, type: 'start' });
    expect(trajectory[1].x).toBeCloseTo(1 - DEFAULT_BALL_RADIUS);
    expect(trajectory[1].y).toBeCloseTo(0.5);
    expect(trajectory[1].type).toBe('end');
  });

  it('should calculate a single bounce off the top rail', () => {
    const startPoint: Vector = { x: 0.5, y: 0.5 };
    const direction: Vector = { x: 0.1, y: -1 }; // Move up-right
    const trajectory = calculateTrajectory(startPoint, direction, DEFAULT_BALL_RADIUS, 1, 1.0);
    expect(trajectory.length).toBe(3); // start, 1 bounce, end
    expect(trajectory[0]).toEqual({ ...startPoint, type: 'start' });
    // Check bounce point
    expect(trajectory[1].y).toBeCloseTo(DEFAULT_BALL_RADIUS); // Bounce on top rail
    expect(trajectory[1].type).toBe('bounce');
    // Check final point - direction.y should be positive after bounce
    expect(trajectory[2].y).toBeGreaterThan(trajectory[1].y);
    expect(trajectory[2].type).toBe('end');
  });

  it('should handle multiple bounces correctly (e.g., 2 bounces)', () => {
    const startPoint: Vector = { x: 0.1, y: 0.1 };
    const direction: Vector = { x: 1, y: 1 }; // Diagonal towards bottom-right
    const trajectory = calculateTrajectory(startPoint, direction, DEFAULT_BALL_RADIUS, 2, 1.0);
    expect(trajectory.length).toBe(4); // start, 2 bounces, end
    expect(trajectory[0]).toEqual({ ...startPoint, type: 'start' });
    expect(trajectory[1].type).toBe('bounce');
    expect(trajectory[2].type).toBe('bounce');
    expect(trajectory[3].type).toBe('end');
    // Further checks can be added for specific bounce points and directions
  });

  it('should stop trajectory if velocity decays below threshold', () => {
    const startPoint: Vector = { x: 0.5, y: 0.5 };
    const direction: Vector = { x: 1, y: 0 };
    // With a high decay and many bounces, it should stop early
    const trajectory = calculateTrajectory(startPoint, direction, DEFAULT_BALL_RADIUS, 10, 0.5);
    expect(trajectory.length).toBeLessThan(10 + 2); 
    // The exact number of points depends on the MIN_VELOCITY_THRESHOLD and decay rate
    // For decay 0.5: 1 -> 0.5 -> 0.25 -> 0.125 -> 0.0625 -> 0.03125 (stops) - 5 bounces
    expect(trajectory.length).toBe(5 + 2); // start, 5 bounces, end for MIN_VELOCITY_THRESHOLD = 0.05
  });

  it('should stop after maxBounces if velocity is still high', () => {
    const startPoint: Vector = { x: 0.5, y: 0.5 };
    const direction: Vector = { x: 1, y: 0.2 };
    const maxBounces = 2;
    const trajectory = calculateTrajectory(startPoint, direction, DEFAULT_BALL_RADIUS, maxBounces, 1.0);
    expect(trajectory.length).toBe(maxBounces + 2); // start, 2 bounces, end
  });

  it('should extend to far edge if starting near an edge and moving away', () => {
    const startPoint: Vector = { x: DEFAULT_BALL_RADIUS + 0.01, y: 0.5 }; // Near left edge
    const direction: Vector = { x: 1, y: 0 }; // Moving right
    const trajectory = calculateTrajectory(startPoint, direction, DEFAULT_BALL_RADIUS, 0, 1.0);
    expect(trajectory.length).toBe(2);
    expect(trajectory[1].x).toBeCloseTo(1 - DEFAULT_BALL_RADIUS);
    expect(trajectory[1].y).toBeCloseTo(0.5);
  });

  it('should correctly extend along a path parallel to an edge', () => {
    const startPoint: Vector = { x: 0.5, y: 0.5 };
    const direction: Vector = { x: 1, y: 0 }; // Moving right, parallel to top/bottom
    const trajectory = calculateTrajectory(startPoint, direction, DEFAULT_BALL_RADIUS, 0, 1.0);
    expect(trajectory.length).toBe(2);
    expect(trajectory[1].x).toBeCloseTo(1 - DEFAULT_BALL_RADIUS);
    expect(trajectory[1].y).toBeCloseTo(0.5); // y should not change
  });

  it('should handle starting point at the exact edge moving inwards', () => {
    const startPoint: Vector = { x: DEFAULT_BALL_RADIUS, y: 0.5 };
    const direction: Vector = { x: 1, y: 0 };
    const trajectory = calculateTrajectory(startPoint, direction, DEFAULT_BALL_RADIUS, 0, 1.0);
    expect(trajectory.length).toBe(2);
    expect(trajectory[1].x).toBeCloseTo(1 - DEFAULT_BALL_RADIUS);
  });

  it('should handle zero direction vector (ball stopped)', () => {
    const startPoint: Vector = { x: 0.5, y: 0.5 };
    const direction: Vector = { x: 0, y: 0 };
    const trajectory = calculateTrajectory(startPoint, direction, DEFAULT_BALL_RADIUS, 5, 1.0);
    expect(trajectory.length).toBe(2);
    expect(trajectory[0]).toEqual({ ...startPoint, type: 'start' });
    expect(trajectory[1]).toEqual({ ...startPoint, type: 'end' }); // Should not move
  });
});

describe('calculatePreciseCollision', () => {
  const cueR = DEFAULT_BALL_RADIUS;
  const objR = DEFAULT_BALL_RADIUS;
  const totalRadius = cueR + objR;

  it('should detect a direct head-on collision', () => {
    const cuePathStart: Vector = { x: 0.1, y: 0.5 };
    const objectBallCenter: Vector = { x: 0.5, y: 0.5 };
    // Cue path end is far beyond the object ball to ensure it passes through
    const cuePathEnd: Vector = { x: 0.9, y: 0.5 };
    
    const result = calculatePreciseCollision(cuePathStart, cuePathEnd, cueR, objectBallCenter, objR);
    
    expect(result).not.toBeNull();
    if (!result) return; // Type guard
    
    // Collision point should be on the line connecting cuePathStart and objectBallCenter.
    // Its distance from objectBallCenter should be totalRadius.
    // Since it's head-on, collisionPointOnCuePath.y should be objectBallCenter.y
    expect(result.collisionPointOnCuePath.y).toBeCloseTo(objectBallCenter.y);
    // Collision point x should be objectBallCenter.x - totalRadius
    expect(result.collisionPointOnCuePath.x).toBeCloseTo(objectBallCenter.x - totalRadius);
    // Collision time: distance from cuePathStart to collisionPointOnCuePath
    const expectedCollisionTime = (objectBallCenter.x - totalRadius) - cuePathStart.x;
    expect(result.collisionTime).toBeCloseTo(expectedCollisionTime);
  });

  it('should detect a glancing collision', () => {
    const cuePathStart: Vector = { x: 0.1, y: 0.4 }; // Slightly offset from center
    const objectBallCenter: Vector = { x: 0.5, y: 0.5 };
    const cuePathEnd: Vector = { x: 0.9, y: 0.4 }; // Path parallel to object center y
    
    const result = calculatePreciseCollision(cuePathStart, cuePathEnd, cueR, objectBallCenter, objR);
    expect(result).not.toBeNull();
    if (!result) return;

    // The collision point on cue path will be different from the direct hit.
    // We expect the distance from the calculated collision point on cue path *projected to the object ball*
    // to be totalRadius.
    // The exact point is harder to calculate directly without re-implementing part of the logic,
    // but we can check properties.
    expect(result.collisionPointOnCuePath.y).toBeCloseTo(0.4); // Stays on its path
    expect(result.collisionPointOnCuePath.x).toBeLessThan(objectBallCenter.x); // Hits before reaching center x
    
    // Check distance from objectBallCenter to the point of impact on the object ball
    // (which is objectBallCenter + (totalRadius * normal_from_cue_impact_point_to_object_center) )
    // This is more complex; for now, ensure a collision is detected.
    // A simpler check: the distance from objectBallCenter to collisionPointOnCuePath should be related
    // to the geometry.
    // Distance from objectBallCenter to the line of cue path is 0.1 (0.5 - 0.4)
    // Collision occurs when sqrt(totalRadius^2 - (0.1)^2) before the point of closest approach.
    const distToClosestApproach = Math.sqrt(totalRadius * totalRadius - (0.1 * 0.1));
    const closestApproachX = objectBallCenter.x; // Since cue path is y=0.4, object is x=0.5
    const expectedCollisionX = closestApproachX - distToClosestApproach;
    expect(result.collisionPointOnCuePath.x).toBeCloseTo(expectedCollisionX);
    expect(result.collisionTime).toBeCloseTo(expectedCollisionX - cuePathStart.x);
  });

  it('should return null if cue ball passes by without collision', () => {
    const cuePathStart: Vector = { x: 0.1, y: 0.1 }; // Far from object ball y
    const objectBallCenter: Vector = { x: 0.5, y: 0.5 };
    const cuePathEnd: Vector = { x: 0.9, y: 0.1 };
    
    const result = calculatePreciseCollision(cuePathStart, cuePathEnd, cueR, objectBallCenter, objR);
    expect(result).toBeNull();
  });

  it('should return null if cue path is too short to reach object ball', () => {
    const cuePathStart: Vector = { x: 0.1, y: 0.5 };
    const objectBallCenter: Vector = { x: 0.5, y: 0.5 };
    // Cue path ends before reaching the object ball's collision surface
    const cuePathEnd: Vector = { x: 0.2, y: 0.5 }; 
    
    const result = calculatePreciseCollision(cuePathStart, cuePathEnd, cueR, objectBallCenter, objR);
    expect(result).toBeNull();
  });

  it('should detect collision if starting point is already in contact', () => {
    // Object ball at 0.5, 0.5. Collision surface starts at 0.5 - totalRadius
    const contactX = 0.5 - totalRadius;
    const cuePathStart: Vector = { x: contactX, y: 0.5 };
    const objectBallCenter: Vector = { x: 0.5, y: 0.5 };
    const cuePathEnd: Vector = { x: 0.9, y: 0.5 }; // Moving through it
    
    const result = calculatePreciseCollision(cuePathStart, cuePathEnd, cueR, objectBallCenter, objR);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.collisionTime).toBeCloseTo(0);
    expect(result.collisionPointOnCuePath.x).toBeCloseTo(contactX);
  });
  
  it('should detect collision if starting point is slightly overlapping (within epsilon)', () => {
    const overlapX = 0.5 - totalRadius + 1e-7; // Slightly past contact point
    const cuePathStart: Vector = { x: overlapX, y: 0.5 };
    const objectBallCenter: Vector = { x: 0.5, y: 0.5 };
    const cuePathEnd: Vector = { x: 0.9, y: 0.5 }; 
    
    const result = calculatePreciseCollision(cuePathStart, cuePathEnd, cueR, objectBallCenter, objR);
    expect(result).not.toBeNull();
    if (!result) return;
    // Collision time should still be effectively 0 as we are already overlapping at start
    expect(result.collisionTime).toBeCloseTo(0); 
    // Collision point should be the start point, as we are moving "out" of the overlap from t=0
    expect(result.collisionPointOnCuePath.x).toBeCloseTo(overlapX);
  });


  it('should detect collision if end point is just making contact', () => {
    const cuePathStart: Vector = { x: 0.1, y: 0.5 };
    const objectBallCenter: Vector = { x: 0.5, y: 0.5 };
    const contactX = 0.5 - totalRadius;
    const cuePathEnd: Vector = { x: contactX, y: 0.5 }; // End exactly at contact
    
    const result = calculatePreciseCollision(cuePathStart, cuePathEnd, cueR, objectBallCenter, objR);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.collisionTime).toBeCloseTo(contactX - cuePathStart.x);
    expect(result.collisionPointOnCuePath.x).toBeCloseTo(contactX);
  });

  it('should detect collision for a tangential path that just touches', () => {
    const objectBallCenter: Vector = { x: 0.5, y: 0.5 };
    const cuePathStart: Vector = { x: 0.1, y: 0.5 - totalRadius }; // Start directly to the "side" at contact distance
    const cuePathEnd: Vector = { x: 0.9, y: 0.5 - totalRadius };   // Move tangentially
    
    const result = calculatePreciseCollision(cuePathStart, cuePathEnd, cueR, objectBallCenter, objR);
    expect(result).not.toBeNull();
    if (!result) return;
    // Collision point should be {x: 0.5, y: 0.5 - totalRadius}
    expect(result.collisionPointOnCuePath.x).toBeCloseTo(0.5);
    expect(result.collisionPointOnCuePath.y).toBeCloseTo(0.5 - totalRadius);
    expect(result.collisionTime).toBeCloseTo(0.5 - cuePathStart.x);
  });
  
  it('should return null if path segment is zero length and not already colliding', () => {
    const cuePathStart: Vector = { x: 0.1, y: 0.1 };
    const objectBallCenter: Vector = { x: 0.5, y: 0.5 };
    const result = calculatePreciseCollision(cuePathStart, cuePathStart, cueR, objectBallCenter, objR);
    expect(result).toBeNull();
  });

  it('should detect collision if zero length path segment starts in contact', () => {
    const contactX = 0.5 - totalRadius;
    const cuePathStart: Vector = { x: contactX, y: 0.5 };
    const objectBallCenter: Vector = { x: 0.5, y: 0.5 };
    const result = calculatePreciseCollision(cuePathStart, cuePathStart, cueR, objectBallCenter, objR);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.collisionTime).toBeCloseTo(0);
    expect(result.collisionPointOnCuePath.x).toBeCloseTo(contactX);
  });
});
