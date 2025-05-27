export interface Ball {
  id: string;
  x: number; // Normalized 0-1 (relative to playing surface width)
  y: number; // Normalized 0-1 (relative to playing surface height)
  color: string; // e.g., 'white', 'red', 'blue', '#FF0000'
  radius?: number; // Normalized radius, optional
  vx: number; // velocity in x
  vy: number; // velocity in y
  spinX: number; // angular velocity around X-axis, for side spin/english
  spinY: number; // angular velocity around Y-axis, for top/back spin
  isPocketed: boolean;
}

export type PocketPosition = 'top-left' | 'top-middle' | 'top-right' | 'bottom-left' | 'bottom-middle' | 'bottom-right';

export interface Pocket {
  id: PocketPosition;
  x: number; // Normalized 0-1, center of pocket opening on playing surface edge
  y: number; // Normalized 0-1
  radius: number; // Normalized radius
}

export interface AimingPoint {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
}

export interface CueBallSpin {
  x: number; // Horizontal spin (english), -1 to 1
  y: number; // Vertical spin (top/bottom), -1 to 1
}

export interface ShotSuggestion {
  aimingPoint: AimingPoint;
  powerPercentage: number;
  cueBallSpin: CueBallSpin;
}

// Matches the output of analyzeTablePhoto AI flow
export interface AnalyzedBallPosition {
  x: number;
  y: number;
  color: string;
}

// For the input to suggestShotParameters AI flow
export interface SimpleBallPosition {
  x: number;
  y: number;
}
