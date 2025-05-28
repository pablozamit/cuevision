"use client";

import React from 'react';
// Button removed
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, MousePointerClick, Target } from 'lucide-react'; // Lightbulb removed
import type { PocketPosition } from '@/types/pool';
import { Slider } from "@/components/ui/slider";

interface ShotControlsProps {
  numRails: number;
  setNumRails: (value: number) => void;
  aimingMethod: 'ball-first' | 'rail-first';
  setAimingMethod: (value: 'ball-first' | 'rail-first') => void;
  selectedPocket: PocketPosition | null;
  // onSuggestShot removed
  // isSuggestingShot removed
  availablePockets: PocketPosition[];
  cueHitOffsetX: number;
  setCueHitOffsetX: (value: number) => void;
  cueHitOffsetY: number;
  setCueHitOffsetY: (value: number) => void;
}

export default function ShotControls({
  numRails,
  setNumRails,
  aimingMethod,
  setAimingMethod,
  selectedPocket,
  // onSuggestShot removed
  // isSuggestingShot removed
  availablePockets,
  cueHitOffsetX,
  setCueHitOffsetX,
  cueHitOffsetY,
  setCueHitOffsetY,
}: ShotControlsProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Shot Parameters
        </CardTitle>
        <CardDescription>Configure your desired shot and cue contact point.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="num-rails" className="flex items-center gap-1">
            <Layers size={16} /> Number of Rails
          </Label>
          <Select
            value={String(numRails)}
            onValueChange={(value) => setNumRails(parseInt(value))}
            // disabled={isSuggestingShot} removed
          >
            <SelectTrigger id="num-rails">
              <SelectValue placeholder="Select rails" />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 4, 5].map((r) => (
                <SelectItem key={r} value={String(r)}>
                  {r} Rail{r !== 1 ? 's' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <MousePointerClick size={16} /> Aiming Method
          </Label>
          <RadioGroup
            value={aimingMethod}
            onValueChange={(value: 'ball-first' | 'rail-first') => setAimingMethod(value)}
            className="flex space-x-4"
            // disabled={isSuggestingShot} removed
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ball-first" id="ball-first" />
              <Label htmlFor="ball-first">Ball First</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="rail-first" id="rail-first" />
              <Label htmlFor="rail-first">Rail First</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label htmlFor="cue-hit-offset-x" className="flex items-center gap-1">
            <Target size={16} /> Horizontal Hit Offset (English)
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Left</span>
            <Slider
              id="cue-hit-offset-x"
              value={[cueHitOffsetX]}
              onValueChange={(value) => setCueHitOffsetX(value[0])}
              min={-1}
              max={1}
              step={0.1}
              // disabled={isSuggestingShot} removed
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">Right</span>
          </div>
          <p className="text-xs text-center text-muted-foreground">Offset: {cueHitOffsetX.toFixed(1)}</p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="cue-hit-offset-y" className="flex items-center gap-1">
            <Target size={16} /> Vertical Hit Offset (Spin)
          </Label>
           <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Bottom</span>
            <Slider
              id="cue-hit-offset-y"
              value={[cueHitOffsetY]}
              onValueChange={(value) => setCueHitOffsetY(value[0])}
              min={-1}
              max={1}
              step={0.1}
              // disabled={isSuggestingShot} removed
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">Top</span>
          </div>
          <p className="text-xs text-center text-muted-foreground">Offset: {cueHitOffsetY.toFixed(1)}</p>
        </div>
        
        {!selectedPocket && (
          <p className="text-sm text-muted-foreground">Please select a target pocket on the table.</p>
        )}

      </CardContent>
      {/* CardFooter with Button removed */}
    </Card>
  );
}

// Need to import Card components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // CardFooter removed
