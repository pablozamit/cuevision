"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Gauge, RotateCcwSquare } from 'lucide-react'; // RotateCcwSquare for spin
import type { ShotSuggestion } from '@/types/pool';
import { TargetIcon as AimingPointIcon, BarChartBig, Zap } from 'lucide-react'; // Using Zap for power, BarChartBig for angle

interface ShotSuggestionDisplayProps {
  suggestion: ShotSuggestion | null;
  shotAngle?: number | null;
  shotPowerProxy?: number | null;
}

export default function ShotSuggestionDisplay({ suggestion, shotAngle, shotPowerProxy }: ShotSuggestionDisplayProps) {
  const hasCalculatedParams = shotAngle !== null && shotAngle !== undefined || shotPowerProxy !== null && shotPowerProxy !== undefined;

  if (!suggestion && !hasCalculatedParams) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Shot Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No AI suggestion or calculated parameters available. Interact with the table or request a suggestion.</p>
        </CardContent>
      </Card>
    );
  }

  const aimingPoint = suggestion?.aimingPoint;
  const powerPercentage = suggestion?.powerPercentage;
  const cueBallSpin = suggestion?.cueBallSpin;

  // Simple visualization for spin (if suggestion exists)
  const spinXOffset = cueBallSpin ? cueBallSpin.x * 10 : 0;
  const spinYOffset = cueBallSpin ? cueBallSpin.y * -10 : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          {suggestion ? "AI Shot Suggestion" : "Calculated Shot Parameters"}
        </CardTitle>
        <CardDescription>
          {suggestion ? "Recommended parameters for your shot from AI." : "Parameters calculated from current table setup."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestion && (
          <>
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-1"><AimingPointIcon className="h-4 w-4" /> AI Aiming Point (Normalized)</h4>
              <p className="text-sm text-muted-foreground">X: {aimingPoint?.x.toFixed(3)}, Y: {aimingPoint?.y.toFixed(3)}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-1"><Gauge className="h-4 w-4" /> AI Power</h4>
              <p className="text-sm text-muted-foreground">{powerPercentage?.toFixed(0)}%</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-1"><RotateCcwSquare className="h-4 w-4" /> AI Cue Ball Spin</h4>
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">X (English): {cueBallSpin?.x.toFixed(2)}, Y (Top/Bottom): {cueBallSpin?.y.toFixed(2)}</p>
                <div className="w-12 h-12 rounded-full border bg-background relative flex items-center justify-center" title={`Spin X: ${cueBallSpin?.x.toFixed(2)}, Y: ${cueBallSpin?.y.toFixed(2)}`}>
                  <div 
                    className="w-2 h-2 bg-destructive rounded-full absolute"
                    style={{ transform: `translate(${spinXOffset}px, ${spinYOffset}px)` }}
                  ></div>
                </div>
              </div>
            </div>
          </>
        )}
        
        {hasCalculatedParams && (
          <div className="pt-4 border-t">
            <h3 className="text-md font-semibold mb-2">Calculated Parameters (Live)</h3>
            {shotAngle !== null && shotAngle !== undefined && (
              <div className="mb-2">
                <h4 className="font-semibold text-sm flex items-center gap-1"><BarChartBig className="h-4 w-4 text-blue-500" /> Calculated Angle</h4>
                <p className="text-sm text-muted-foreground">{shotAngle.toFixed(1)}°</p>
              </div>
            )}
            {shotPowerProxy !== null && shotPowerProxy !== undefined && (
               <div className="mb-2">
                <h4 className="font-semibold text-sm flex items-center gap-1"><Zap className="h-4 w-4 text-orange-500" /> Estimated Power Proxy</h4>
                <p className="text-sm text-muted-foreground">{shotPowerProxy.toFixed(2)} units</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Using lucide-react icons directly now, so TargetIcon component can be removed if not used elsewhere.
// Keeping for now in case it's used elsewhere, but it's not used in this file's logic.
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
// Adding Gauge for consistency if it's not imported/used above (it is, so this is redundant)
// import { Gauge } from 'lucide-react';
