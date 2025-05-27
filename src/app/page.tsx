"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/cue-vision/Header';
import PoolTable from '@/components/cue-vision/PoolTable';
import ShotControls from '@/components/cue-vision/ShotControls';
import ImageAnalyzer from '@/components/cue-vision/ImageAnalyzer';
import ShotSuggestionDisplay from '@/components/cue-vision/ShotSuggestionDisplay';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import type { Ball, Pocket, PocketPosition, ShotSuggestion, AnalyzedBallPosition, SimpleBallPosition } from '@/types/pool';
import { useToast } from '@/hooks/use-toast';
import { analyzeTablePhotoAction, suggestShotParametersAction } from './actions';

const TABLE_ASPECT_RATIO = 2 / 1; // Standard pool table aspect ratio (length/width)
const BALL_RADIUS_NORMALIZED = 0.028; // Approximate normalized radius (e.g., 2.25 inches / 88 inches table width)

const POCKET_DEFINITIONS: Pocket[] = [
  { id: 'top-left', x: 0.02, y: 0.02, radius: 0.05 },
  { id: 'top-middle', x: 0.5, y: 0.01, radius: 0.05 },
  { id: 'top-right', x: 0.98, y: 0.02, radius: 0.05 },
  { id: 'bottom-left', x: 0.02, y: 0.98, radius: 0.05 },
  { id: 'bottom-middle', x: 0.5, y: 0.99, radius: 0.05 },
  { id: 'bottom-right', x: 0.98, y: 0.98, radius: 0.05 },
];

const DEFAULT_BALLS: Ball[] = [
  { id: 'cue', x: 0.25, y: 0.5, color: 'white', radius: BALL_RADIUS_NORMALIZED },
  { id: 'obj1', x: 0.75, y: 0.5, color: 'red', radius: BALL_RADIUS_NORMALIZED },
  { id: 'obj2', x: 0.70, y: 0.4, color: 'yellow', radius: BALL_RADIUS_NORMALIZED },
  { id: 'obj3', x: 0.80, y: 0.6, color: 'blue', radius: BALL_RADIUS_NORMALIZED },
];

export default function CueVisionPage() {
  const [balls, setBalls] = useState<Ball[]>(DEFAULT_BALLS);
  const [cueBallId, setCueBallId] = useState<string>('cue'); // Default cue ball
  const [selectedPocketId, setSelectedPocketId] = useState<PocketPosition | null>(null);
  const [numRails, setNumRails] = useState<number>(1);
  const [aimingMethod, setAimingMethod] = useState<'ball-first' | 'rail-first'>('ball-first');
  const [shotSuggestion, setShotSuggestion] = useState<ShotSuggestion | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSuggestingShot, setIsSuggestingShot] = useState(false);

  const { toast } = useToast();

  const cueBall = balls.find(b => b.id === cueBallId);

  const handleResetBalls = () => {
    setBalls(DEFAULT_BALLS);
    setCueBallId('cue');
    setSelectedPocketId(null);
    setShotSuggestion(null);
    toast({ title: "Table Reset", description: "Ball positions have been reset to default." });
  };

  const handleAnalyzeImage = useCallback(async (photoDataUri: string) => {
    setIsAnalyzing(true);
    setShotSuggestion(null); // Clear previous suggestion
    try {
      const result = await analyzeTablePhotoAction({ photoDataUri });
      if (result.ballPositions && result.ballPositions.length > 0) {
        const newBalls: Ball[] = result.ballPositions.map((bp: AnalyzedBallPosition, index: number) => ({
          id: `ball-${index}-${Date.now()}`,
          x: bp.x,
          y: bp.y,
          color: bp.color.toLowerCase(),
          radius: BALL_RADIUS_NORMALIZED,
        }));
        
        setBalls(newBalls);
        // Attempt to find cue ball
        const foundCueBall = newBalls.find(b => b.color === 'white' || b.color === 'ivory');
        if (foundCueBall) {
          setCueBallId(foundCueBall.id);
        } else if (newBalls.length > 0) {
          // Default to first ball if no white ball found
          setCueBallId(newBalls[0].id); 
          toast({ title: "Cue Ball Note", description: "White cue ball not distinctly identified. First ball selected as cue. You may need to adjust.", duration: 5000 });
        } else {
          setCueBallId(null);
        }

        toast({ title: "Image Analyzed", description: "Ball positions updated from image." });
      } else {
        toast({ variant: "destructive", title: "Analysis Incomplete", description: "No balls found in the image or analysis failed." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Analysis Error", description: error.message || "Failed to analyze image." });
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast]);

  const handleSuggestShot = useCallback(async () => {
    if (!cueBall || !selectedPocketId) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please ensure a cue ball is set and a pocket is selected." });
      return;
    }
    setIsSuggestingShot(true);
    setShotSuggestion(null);

    // Prepare ball positions: cue ball first, then others
    const otherBalls = balls.filter(b => b.id !== cueBallId);
    const allBallSimplePositions: SimpleBallPosition[] = [
      { x: cueBall.x, y: cueBall.y },
      ...otherBalls.map(b => ({ x: b.x, y: b.y }))
    ];
    
    try {
      const suggestion = await suggestShotParametersAction({
        ballPositions: allBallSimplePositions,
        targetPocket: selectedPocketId,
        numberOfRails: numRails,
        aimingMethod: aimingMethod,
      });
      setShotSuggestion(suggestion);
      toast({ title: "Shot Suggested!", description: "AI has provided shot parameters." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Suggestion Error", description: error.message || "Failed to get shot suggestion." });
    } finally {
      setIsSuggestingShot(false);
    }
  }, [cueBall, selectedPocketId, balls, cueBallId, numRails, aimingMethod, toast]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3 flex flex-col items-center">
          <PoolTable
            balls={balls}
            pockets={POCKET_DEFINITIONS}
            selectedPocketId={selectedPocketId}
            onPocketClick={setSelectedPocketId}
            cueBall={cueBall}
            aimingPoint={shotSuggestion?.aimingPoint}
            ballRadius={BALL_RADIUS_NORMALIZED * DEFAULT_BALLS[0].radius! * 1000} // Example scaling for display if needed
          />
          <Button variant="outline" onClick={handleResetBalls} className="mt-4">
            <RotateCcw className="mr-2 h-4 w-4" /> Reset Table
          </Button>
        </div>
        <div className="lg:w-1/3 space-y-6">
          <ShotControls
            numRails={numRails}
            setNumRails={setNumRails}
            aimingMethod={aimingMethod}
            setAimingMethod={setAimingMethod}
            selectedPocket={selectedPocketId}
            onSuggestShot={handleSuggestShot}
            isSuggestingShot={isSuggestingShot}
            availablePockets={POCKET_DEFINITIONS.map(p => p.id)}
          />
          <ImageAnalyzer
            onAnalyzeImage={handleAnalyzeImage}
            isAnalyzing={isAnalyzing}
          />
          <ShotSuggestionDisplay suggestion={shotSuggestion} />
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground border-t border-border">
        Cue Vision &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
