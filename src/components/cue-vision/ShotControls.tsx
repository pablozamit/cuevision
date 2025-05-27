"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, MousePointerClick, Lightbulb } from 'lucide-react';
import type { PocketPosition } from '@/types/pool';

interface ShotControlsProps {
  numRails: number;
  setNumRails: (value: number) => void;
  aimingMethod: 'ball-first' | 'rail-first';
  setAimingMethod: (value: 'ball-first' | 'rail-first') => void;
  selectedPocket: PocketPosition | null;
  onSuggestShot: () => void;
  isSuggestingShot: boolean;
  availablePockets: PocketPosition[];
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
        
        {!selectedPocket && (
          <p className="text-sm text-muted-foreground">Please select a target pocket on the table.</p>
        )}

      </CardContent>
      <CardFooter>
        <Button
          onClick={onSuggestShot}
          disabled={!selectedPocket || isSuggestingShot}
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
