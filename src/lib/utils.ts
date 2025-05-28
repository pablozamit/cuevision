import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface Vector {
  x: number;
  y: number;
}

export function subtract(v1: Vector, v2: Vector): Vector {
  return { x: v1.x - v2.x, y: v1.y - v2.y };
}

export function dotProduct(v1: Vector, v2: Vector): number {
  return v1.x * v2.x + v1.y * v2.y;
}

export function multiplyScalar(v: Vector, s: number): Vector {
  return { x: v.x * s, y: v.y * s };
}

export function length(v: Vector): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function normalize(v: Vector): Vector {
  const l = length(v);
  if (l === 0) {
    // Return a zero vector as per the instructions to handle this case
    return { x: 0, y: 0 }; 
  }
  return { x: v.x / l, y: v.y / l };
}

export function reflect(incident: Vector, normal: Vector): Vector {
  // Ensure the normal is normalized before use
  const normalizedNormal = normalize(normal);
  const dot = dotProduct(incident, normalizedNormal);
  return subtract(incident, multiplyScalar(normalizedNormal, 2 * dot));
}

export function distance(p1: Vector, p2: Vector): number {
  return length(subtract(p1, p2));
}

export function add(v1: Vector, v2: Vector): Vector {
  return { x: v1.x + v2.x, y: v1.y + v2.y };
}
