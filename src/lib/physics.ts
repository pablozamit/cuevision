import Matter from 'matter-js';
import type { Ball } from '@/types/pool';

// Constants (Normalized Units 0-1 for a table of aspect ratio 2:1)
// Standard pool table aspect ratio (length/width)
// We'll assume the playing surface is normalized from (0,0) to (1, TABLE_ASPECT_RATIO_INV)
// or more simply, work within a 1x1 square for physics and scale rendering if needed,
// but the problem states page.tsx uses normalized 0-1 for width and height.
// Let's assume the playing surface is defined by width = 1.0 and height = 0.5 (if aspect ratio is 2:1 for length/width)
// However, the current types/page.tsx imply x and y are both normalized 0-1 across the respective dimensions.
// Let's stick to width=1, height=1 for the physics space as per page.tsx's normalization.

export const PLAY_SURFACE_WIDTH = 1.0;
export const PLAY_SURFACE_HEIGHT = 1.0; // page.tsx uses normalized 0-1 for height as well.
export const CUSHION_THICKNESS = 0.02; // Normalized
export const POCKET_RADIUS_NORMALIZED = 0.045; // Average from POCKET_DEFINITIONS in page.tsx
export const BALL_RADIUS_NORMALIZED = 0.028; // From page.tsx

// Matter.js Engine and World
export const engine = Matter.Engine.create();
export const world = engine.world;
world.gravity.y = 0; // No gravity in pool

// Cushion Properties
const CUSHION_PROPERTIES: Matter.IBodyDefinition = {
  isStatic: true,
  restitution: 0.85, // Bounciness
  friction: 0.15,   // Sliding friction
  slop: 0.01,       // Prevents sticking
  label: 'cushion',
};

// Define Cushions (ensure they are slightly outside the 0-1 play area to form the boundary)
const topCushion = Matter.Bodies.rectangle(
  PLAY_SURFACE_WIDTH / 2,
  -CUSHION_THICKNESS / 2, // Positioned above the play area
  PLAY_SURFACE_WIDTH + 2 * CUSHION_THICKNESS, // Extend to cover corners
  CUSHION_THICKNESS,
  CUSHION_PROPERTIES
);

const bottomCushion = Matter.Bodies.rectangle(
  PLAY_SURFACE_WIDTH / 2,
  PLAY_SURFACE_HEIGHT + CUSHION_THICKNESS / 2, // Positioned below the play area
  PLAY_SURFACE_WIDTH + 2 * CUSHION_THICKNESS,
  CUSHION_THICKNESS,
  CUSHION_PROPERTIES
);

const leftCushion = Matter.Bodies.rectangle(
  -CUSHION_THICKNESS / 2, // Positioned to the left of the play area
  PLAY_SURFACE_HEIGHT / 2,
  CUSHION_THICKNESS,
  PLAY_SURFACE_HEIGHT + 2 * CUSHION_THICKNESS, // Extend to cover corners
  CUSHION_PROPERTIES
);

const rightCushion = Matter.Bodies.rectangle(
  PLAY_SURFACE_WIDTH + CUSHION_THICKNESS / 2, // Positioned to the right of the play area
  PLAY_SURFACE_HEIGHT / 2,
  CUSHION_THICKNESS,
  PLAY_SURFACE_HEIGHT + 2 * CUSHION_THICKNESS,
  CUSHION_PROPERTIES
);

Matter.World.add(world, [topCushion, bottomCushion, leftCushion, rightCushion]);

// Pocket Definitions (from page.tsx, normalized)
// Note: POCKET_DEFINITIONS in page.tsx are for the *opening* center.
// For sensors, we'll use these positions.
const POCKET_POSITIONS_PAGE = [
  { id: 'top-left', x: 0.02, y: 0.02, radius: 0.045 },
  { id: 'top-middle', x: 0.5, y: 0.01, radius: 0.05 }, // Wider radius
  { id: 'top-right', x: 0.98, y: 0.02, radius: 0.045 },
  { id: 'bottom-left', x: 0.02, y: 0.98, radius: 0.045 },
  { id: 'bottom-middle', x: 0.5, y: 0.99, radius: 0.05 }, // Wider radius
  { id: 'bottom-right', x: 0.98, y: 0.98, radius: 0.045 },
];

const POCKET_SENSOR_PROPERTIES: Matter.IBodyDefinition = {
  isStatic: true,
  isSensor: true, // Detect collisions but no physical reaction
  label: 'pocket', // General label
};

POCKET_POSITIONS_PAGE.forEach(pocketInfo => {
  const pocketSensor = Matter.Bodies.circle(
    pocketInfo.x,
    pocketInfo.y,
    pocketInfo.radius, // Use the specific radius for each pocket's sensor
    {
      ...POCKET_SENSOR_PROPERTIES,
      label: `pocket-${pocketInfo.id}`, // Specific label for each pocket
      plugin: { pocketId: pocketInfo.id } // Custom data to identify pocket
    }
  );
  Matter.World.add(world, pocketSensor);
});


// Ball Properties
const BALL_PHYSICS_PROPERTIES: Matter.IBodyDefinition = {
  isStatic: false,
  restitution: 0.92, // Ball-to-ball/cushion bounciness
  friction: 0.02,    // Rolling friction on the table surface (this is for body-on-body, frictionAir is better for rolling)
  frictionAir: 0.015, // Simulates air resistance and rolling friction
  slop: 0.01,
  density: 0.001, // Affects mass. Normalized, relative to other objects. (e.g. 1000 kg/m^3 for real balls)
                  // Given normalized radius, density needs to be adjusted if we want "realistic" mass.
                  // Or, keep it simple as all balls will have same density.
};

export function addBallToPhysics(ball: Ball): Matter.Body {
  const matterBall = Matter.Bodies.circle(
    ball.x,
    ball.y,
    BALL_RADIUS_NORMALIZED, // Use the constant defined above
    {
      ...BALL_PHYSICS_PROPERTIES,
      label: `ball-${ball.id}`, // Label for the Matter body
      plugin: {
        appBallId: ball.id, // Store our application's ball ID
      },
      // Initial velocities and spin - these will be zero unless set from the Ball object
      velocity: { x: ball.vx || 0, y: ball.vy || 0 },
      // Matter.js angularVelocity is rotation around Z-axis (perpendicular to table)
      // We can use spinY for top/back spin to influence friction/collisions later.
      // spinX (side spin) is more complex and typically causes swerve (requires 3D or advanced 2D handling).
      // For now, let's represent a combined spin effect if possible, or prioritize top/back.
      // A simple approach: map spinY to angularVelocity.
      angularVelocity: ball.spinY || 0, // spinY for top/back spin seems most analogous to 2D angular vel.
    }
  );
  Matter.World.add(world, matterBall);
  return matterBall;
}

export function applyShotImpulse(
  cueBallBody: Matter.Body,
  targetDirection: { x: number; y: number }, // Normalized vector
  power: number, // 0-1
  spin: { spinX: number; spinY: number } // -1 to 1 for each
): void {
  // Power mapping: power (0-1) needs to be scaled to a force magnitude.
  // This scaling factor is empirical and needs tuning.
  const MAX_FORCE = 0.005; // Normalized force unit. Needs adjustment for desired ball speed.
  const forceMagnitude = power * MAX_FORCE;

  const force = {
    x: targetDirection.x * forceMagnitude,
    y: targetDirection.y * forceMagnitude,
  };

  Matter.Body.applyForce(cueBallBody, cueBallBody.position, force);

  // Apply spin (angular velocity)
  // Matter.js `setAngularVelocity` is for rotation around the Z-axis (perpendicular to the table).
  // This is most analogous to top-spin/back-spin (our spinY).
  // Side spin (spinX) would cause swerve, a 3D effect not directly modeled by Body.setAngularVelocity in 2D.
  // We can set angularVelocity based on spinY. spinX might be used later for custom collision responses.
  
  // MAX_ANGULAR_VELOCITY is an empirical value, needs tuning.
  const MAX_ANGULAR_VELOCITY = 0.1; // Radians per step (Matter.js default time step is 16.66ms)
  const targetAngularVelocity = spin.spinY * MAX_ANGULAR_VELOCITY;
  
  Matter.Body.setAngularVelocity(cueBallBody, targetAngularVelocity);

  // For spinX (side spin / english), it doesn't directly map to 2D angular velocity.
  // Its effects (swerve, and how it changes ball behavior on collision with cushions/balls)
  // would typically require more advanced physics handling, possibly by modifying
  // friction coefficients dynamically or applying small perpendicular forces during collisions.
  // For now, we acknowledge spinX but don't directly apply it as a simple torque in 2D.
  // console.log(`Applied spin: spinY mapped to angularVelocity: ${targetAngularVelocity}. spinX (${spin.spinX}) not directly applied as 2D torque.`);
}

// Function to run the physics engine step
export function runPhysicsStep() {
  Matter.Engine.update(engine, 1000 / 60); // Update at 60 FPS
}

export interface PhysicsBallData {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spinY: number; // from angularVelocity
  isPocketed?: boolean; // To be set by collision events
}

export function getBallDataFromPhysics(currentBallsState: Ball[]): PhysicsBallData[] {
  const physicsBallsData: PhysicsBallData[] = [];
  world.bodies.forEach(body => {
    if (body.label.startsWith('ball-')) {
      const appBallId = body.plugin.appBallId;
      if (appBallId) {
        // Find the corresponding ball in the application state to get its current isPocketed status
        const appBall = currentBallsState.find(b => b.id === appBallId);
        physicsBallsData.push({
          id: appBallId,
          x: body.position.x,
          y: body.position.y,
          vx: body.velocity.x,
          vy: body.velocity.y,
          spinY: body.angularVelocity,
          isPocketed: body.plugin.isPocketed || appBall?.isPocketed || false, // Use physics body's status first
        });
      }
    }
  });
  return physicsBallsData;
}

export function areBallsMoving(threshold: number = 0.01): boolean {
  for (const body of world.bodies) {
    if (body.label.startsWith('ball-') && !body.plugin.isPocketed) { // Don't consider pocketed balls for movement
      const speed = Matter.Vector.magnitude(body.velocity);
      const angularSpeed = Math.abs(body.angularVelocity);
      if (speed > threshold || angularSpeed > threshold) {
        return true;
      }
    }
  }
  return false;
}

// Store pocketed ball IDs from physics events
const pocketedBallIdsThisStep = new Set<string>();

Matter.Events.on(engine, 'collisionStart', event => {
  const pairs = event.pairs;
  for (const pair of pairs) {
    const { bodyA, bodyB } = pair;
    
    let ballBody: Matter.Body | null = null;
    let pocketBody: Matter.Body | null = null;

    if (bodyA.label.startsWith('ball-') && bodyB.label.startsWith('pocket-')) {
      ballBody = bodyA;
      pocketBody = bodyB;
    } else if (bodyB.label.startsWith('ball-') && bodyA.label.startsWith('pocket-')) {
      ballBody = bodyB;
      pocketBody = bodyA;
    }

    if (ballBody && pocketBody) {
      const ballId = ballBody.plugin.appBallId;
      const pocketId = pocketBody.plugin.pocketId;
      
      if (ballId && !ballBody.plugin.isPocketed) { // Check if not already marked as pocketed
        console.log(`Ball ${ballId} hit pocket ${pocketId}`);
        ballBody.plugin.isPocketed = true; // Mark on the physics body
        pocketedBallIdsThisStep.add(ballId); // Add to set for current step processing

        // Optional: Make the ball static and sensor to prevent further interaction after pocketing
        // Matter.Body.setStatic(ballBody, true);
        // ballBody.isSensor = true; 
        // Or simply remove it (but this makes getting final position tricky if not handled carefully)
        // Matter.World.remove(world, ballBody);
      }
    }
  }
});

// Function to get and clear pocketed ball IDs for this step
export function getAndClearPocketedBallIds(): Set<string> {
  const pocketedIds = new Set(pocketedBallIdsThisStep);
  pocketedBallIdsThisStep.clear();
  return pocketedIds;
}


export function clearDynamicBallsFromWorld() {
  const bodiesToRemove = world.bodies.filter(body => body.label.startsWith('ball-'));
  bodiesToRemove.forEach(body => Matter.World.remove(world, body));
}

// This function assumes static bodies (cushions, pockets) are already in the world
// or are re-added if world is fully cleared.
export function setupBallsInPhysics(balls: Ball[]) {
  clearDynamicBallsFromWorld(); // Clear any existing dynamic balls
  balls.forEach(ball => {
    if (!ball.isPocketed) { // Only add balls that are not already pocketed
       const body = addBallToPhysics(ball); // addBallToPhysics already adds to world
       // Ensure the physics body's pocketed status matches the app's ball state
       body.plugin.isPocketed = ball.isPocketed;
    }
  });
  console.log('Physics world setup with current balls.');
}


console.log('Physics engine initialized with cushions, pocket sensors, and collision handling.');
// To run:
// Call setupBallsInPhysics(initialBallsState)
// Call applyShotImpulse(...)
// Loop { runPhysicsStep(); getBallDataFromPhysics(); check areBallsMoving(); }

// TODO:
// - Refine pocketed ball handling (e.g., visual sinking, removal from active play).
// - Collision handling for ball-ball, ball-cushion (already handled by Matter.js for motion)
// - Potentially refining spin application or its effects during collisions.
// - Mapping physics body state back to application state (Ball[]) is now partially done by getBallDataFromPhysics.
