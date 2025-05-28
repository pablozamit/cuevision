"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider'; // Import Slider
import { Layers, MousePointerClick, Lightbulb, MinusSquare } from 'lucide-react'; // MinusSquare for friction icon
import type { PocketPosition, Ball } from '@/types/pool';

interface ShotControlsProps {
  numRails: number;
  setNumRails: (value: number) => void;
  aimingMethod: 'ball-first' | 'rail-first';
  setAimingMethod: (value: 'ball-first' | 'rail-first') => void;
  selectedPocket: PocketPosition | null;
  onSuggestShot: () => void;
  isSuggestingShot: boolean;
  availablePockets: PocketPosition[];
  balls: Ball[];
  cueBallId: string | null;
  onCueBallChange: (ballId: string) => void;
  objectBallId: string | null;
  onObjectBallChange: (ballId: string) => void;
  velocityDecayFactor: number;
  onVelocityDecayChange: (value: number) => void;
}

export default function ShotControls({
  numRails,
  setNumRails,
  aimingMethod,
  setAimingMethod,
  selectedPocket,
  onSuggestShot,
  isSuggestingShot,
  availablePockets,
  balls,
  cueBallId,
  onCueBallChange,
  objectBallId,
  onObjectBallChange,
  velocityDecayFactor,
  onVelocityDecayChange,
}: ShotControlsProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Shot Parameters
        </CardTitle>
        <CardDescription>Configure your desired shot.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="num-rails" className="flex items-center gap-1">
            <Layers size={16} /> Number of Rails
          </Label>
          <Select
            value={String(numRails)}
            onValueChange={(value) => setNumRails(parseInt(value))}
            disabled={isSuggestingShot}
          >
            <SelectTrigger id="num-rails">
              <SelectValue placeholder="Select rails" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((r) => (
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
            disabled={isSuggestingShot}
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

        <div className="space-y-2">
          <Label htmlFor="velocity-decay" className="flex items-center gap-1">
            <MinusSquare size={16} /> Friction / Velocity Decay
          </Label>
          <div className="flex items-center space-x-3">
            <Slider
              id="velocity-decay"
              value={[velocityDecayFactor]}
              onValueChange={(value) => onVelocityDecayChange(value[0])}
              min={0.80}
              max={1.0}
              step={0.01}
              className="w-[calc(100%-4rem)]" // Adjust width to make space for the numeric display
              disabled={isSuggestingShot}
            />
            <span className="text-sm w-12 text-right">{velocityDecayFactor.toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cue-ball-select" className="flex items-center gap-1">
            <MousePointerClick size={16} /> Cue Ball
          </Label>
          <Select
            value={cueBallId ?? ''}
            onValueChange={onCueBallChange}
            disabled={isSuggestingShot}
          >
            <SelectTrigger id="cue-ball-select">
              <SelectValue placeholder="Select cue ball" />
            </SelectTrigger>
            <SelectContent>
              {balls.map((ball) => (
                <SelectItem key={ball.id} value={ball.id}>
                  Ball {ball.id} ({ball.color})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="object-ball-select" className="flex items-center gap-1">
            <MousePointerClick size={16} /> Object Ball
          </Label>
          <Select
            value={objectBallId ?? ''}
            onValueChange={onObjectBallChange}
            disabled={isSuggestingShot || !cueBallId}
          >
            <SelectTrigger id="object-ball-select">
              <SelectValue placeholder="Select object ball" />
            </SelectTrigger>
            <SelectContent>
              {balls
                .filter((ball) => ball.id !== cueBallId)
                .map((ball) => (
                  <SelectItem key={ball.id} value={ball.id}>
                    Ball {ball.id} ({ball.color})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        
        {!selectedPocket && (
          <p className="text-sm text-muted-foreground">Please select a target pocket on the table.</p>
        )}

      </CardContent>
      <CardFooter>
        <Button
          onClick={onSuggestShot}
          disabled={!selectedPocket || isSuggestingShot || !cueBallId || !objectBallId}
          className="w-full"
        >
          <Lightbulb className="mr-2 h-4 w-4" />
          {isSuggestingShot ? 'Suggesting...' : 'Suggest Shot'}
        </Button>
      </CardFooter>
    </Card>
  );
}

// Need to import Card components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
