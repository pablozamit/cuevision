"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Gauge, RotateCcwSquare } from 'lucide-react'; // RotateCcwSquare for spin
import type { ShotSuggestion } from '@/types/pool';

interface ShotSuggestionDisplayProps {
  suggestion: ShotSuggestion | null;
}

export default function ShotSuggestionDisplay({ suggestion }: ShotSuggestionDisplayProps) {
  if (!suggestion) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Shot Suggestion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No suggestion available. Configure your shot and click "Suggest Shot".</p>
        </CardContent>
      </Card>
    );
  }

  const { aimingPoint, powerPercentage, cueBallSpin } = suggestion;

  // Simple visualization for spin
  const spinXOffset = cueBallSpin.x * 10; // Scale for display
  const spinYOffset = cueBallSpin.y * -10; // Invert Y for display (SVG Y is downwards)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          AI Shot Suggestion
        </CardTitle>
        <CardDescription>Recommended parameters for your shot.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm flex items-center gap-1"><TargetIcon className="h-4 w-4" /> Aiming Point (Normalized)</h4>
          <p className="text-sm text-muted-foreground">X: {aimingPoint.x.toFixed(3)}, Y: {aimingPoint.y.toFixed(3)}</p>
        </div>
        <div>
          <h4 className="font-semibold text-sm flex items-center gap-1"><Gauge className="h-4 w-4" /> Power</h4>
          <p className="text-sm text-muted-foreground">{powerPercentage.toFixed(0)}%</p>
        </div>
        <div>
          <h4 className="font-semibold text-sm flex items-center gap-1"><RotateCcwSquare className="h-4 w-4" /> Cue Ball Spin</h4>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">X (English): {cueBallSpin.x.toFixed(2)}, Y (Top/Bottom): {cueBallSpin.y.toFixed(2)}</p>
            <div className="w-12 h-12 rounded-full border bg-background relative flex items-center justify-center" title={`Spin X: ${cueBallSpin.x.toFixed(2)}, Y: ${cueBallSpin.y.toFixed(2)}`}>
              <div 
                className="w-2 h-2 bg-destructive rounded-full absolute"
                style={{ transform: `translate(${spinXOffset}px, ${spinYOffset}px)` }}
              ></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Inline SVG for TargetIcon if not available in lucide-react
const TargetIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);
