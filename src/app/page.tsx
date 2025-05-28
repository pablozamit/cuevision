
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/cue-vision/Header';
import PoolTable from '@/components/cue-vision/PoolTable';
import ShotControls from '@/components/cue-vision/ShotControls';
import ImageAnalyzer from '@/components/cue-vision/ImageAnalyzer';
// ShotSuggestionDisplay removed
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import type { Ball, Pocket, PocketPosition, AnalyzedBallPosition, SimpleBallPosition, AimingPoint } from '@/types/pool'; // ShotSuggestion removed, AimingPoint added
import { useToast } from '@/hooks/use-toast';
import { analyzeTablePhotoAction } from './actions'; // suggestShotParametersAction removed

const TABLE_ASPECT_RATIO = 2 / 1; // Standard pool table aspect ratio (length/width)
const BALL_RADIUS_NORMALIZED = 0.01125; // Approximate normalized radius (e.g., 1.125 inch ball radius / 100 inch table playing width)

const AIMING_LINE_SPIN_SENSITIVITY = 0.087; // Max deflection angle approx 5 degrees (sin(0.087) ~= 0.087)
const AIMING_LINE_FOLLOW_DRAW_SENSITIVITY = 0.05; // Max 5% change in line length based on top/bottom spin

const POCKET_DEFINITIONS: Pocket[] = [
  { id: 'top-left', x: 0.0, y: 0.0, radius: 0.025 },
  { id: 'top-middle', x: 0.5, y: 0.0, radius: 0.0275 },
  { id: 'top-right', x: 1.0, y: 0.0, radius: 0.025 },
  { id: 'bottom-left', x: 0.0, y: 1.0, radius: 0.025 },
  { id: 'bottom-middle', x: 0.5, y: 1.0, radius: 0.0275 },
  { id: 'bottom-right', x: 1.0, y: 1.0, radius: 0.025 },
];

const DEFAULT_BALLS: Ball[] = [
  { id: 'cue', x: 0.25, y: 0.5, color: 'white', radius: BALL_RADIUS_NORMALIZED },
  { id: 'obj1', x: 0.75, y: 0.5, color: 'red', radius: BALL_RADIUS_NORMALIZED },
];

export default function CueVisionPage() {
  const [balls, setBalls] = useState<Ball[]>(DEFAULT_BALLS);
  const [cueBallId] = useState<string>('cue'); // Fixed cue ball id
  const [selectedPocketId, setSelectedPocketId] = useState<PocketPosition | null>(null);
  const [numRails, setNumRails] = useState<number>(1);
  const [aimingMethod, setAimingMethod] = useState<'ball-first' | 'rail-first'>('ball-first');
  // shotSuggestion and isSuggestingShot removed
  const [cueHitOffsetX, setCueHitOffsetX] = useState<number>(0); // -1 to 1
  const [cueHitOffsetY, setCueHitOffsetY] = useState<number>(0); // -1 to 1
  const [dynamicAimingLineTarget, setDynamicAimingLineTarget] = useState<AimingPoint | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // isSuggestingShot removed

  const { toast } = useToast();

  const cueBall = balls.find(b => b.id === cueBallId);

  const handleResetBalls = () => {
    setBalls(DEFAULT_BALLS);
    // setCueBallId is removed as cueBallId is fixed
    setSelectedPocketId(null);
    // setShotSuggestion(null) removed;
    setDynamicAimingLineTarget(null);
    setCueHitOffsetX(0);
    setCueHitOffsetY(0);
    toast({ title: "Table Reset", description: "Ball positions have been reset to default." });
  };

  const handleBallMove = useCallback((ballId: string, newPosition: { x: number; y: number }) => {
    setBalls(prevBalls =>
      prevBalls.map(b =>
        b.id === ballId ? { ...b, x: newPosition.x, y: newPosition.y } : b
      )
    );
  }, []);

  const handleAnalyzeImage = useCallback(async (photoDataUri: string) => {
    setIsAnalyzing(true);
    setShotSuggestion(null);
    try {
      const result = await analyzeTablePhotoAction({ photoDataUri });
      let whiteBallFound = false;
      let redBallFound = false;

      if (result.ballPositions && result.ballPositions.length > 0) {
        const analyzedWhiteBall = result.ballPositions.find(bp => bp.color.toLowerCase() === 'white' || bp.color.toLowerCase() === 'ivory');
        const analyzedRedBall = result.ballPositions.find(bp => bp.color.toLowerCase() === 'red');

        setBalls(prevBalls => prevBalls.map(ball => {
          if (ball.id === 'cue' && analyzedWhiteBall) {
            whiteBallFound = true;
            return { ...ball, x: analyzedWhiteBall.x, y: analyzedWhiteBall.y };
          }
          if (ball.id === 'obj1' && analyzedRedBall) {
            redBallFound = true;
            return { ...ball, x: analyzedRedBall.x, y: analyzedRedBall.y };
          }
          return ball;
        }));

        if (whiteBallFound && redBallFound) {
          toast({ title: "Image Analyzed", description: "White and red ball positions updated." });
        } else {
          let description = "";
          if (!whiteBallFound && !redBallFound) {
            description = "Neither white nor red ball found. Positions remain unchanged.";
          } else if (!whiteBallFound) {
            description = "White ball not found; its position remains unchanged. Red ball updated.";
          } else { // !redBallFound
            description = "Red ball not found; its position remains unchanged. White ball updated.";
          }
          toast({ title: "Analysis Partially Complete", description, duration: 5000 });
        }
      } else {
        setBalls(DEFAULT_BALLS); // Reset to default if no balls are found
        toast({ variant: "destructive", title: "Analysis Incomplete", description: "No balls found in image. Table reset to default." });
      }
    } catch (error: any) {
      setBalls(DEFAULT_BALLS); // Reset on error
      toast({ variant: "destructive", title: "Analysis Error", description: error.message || "Failed to analyze image. Table reset to default." });
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast]); // cueBallId is fixed, no need to include it or setCueBallId in dependencies

  // useEffect for dynamic aiming line
  useEffect(() => {
    if (cueBall && selectedPocketId) {
      const targetPocket = POCKET_DEFINITIONS.find(p => p.id === selectedPocketId);
      if (targetPocket) {
        const Cx = cueBall.x;
        const Cy = cueBall.y;
        const Tx = targetPocket.x;
        const Ty = targetPocket.y;

        let VecX = Tx - Cx;
        let VecY = Ty - Cy;

        // Apply rotation based on cueHitOffsetX (English)
        // Clamp input to asin to prevent errors, though SPIN_SENSITIVITY should keep it in range
        const angleInput = Math.max(-1, Math.min(1, cueHitOffsetX * AIMING_LINE_SPIN_SENSITIVITY));
        const angleOffset = Math.asin(angleInput); 
        
        const cosAngle = Math.cos(angleOffset);
        const sinAngle = Math.sin(angleOffset);

        const rotatedVecX = VecX * cosAngle - VecY * sinAngle;
        const rotatedVecY = VecX * sinAngle + VecY * cosAngle;

        // Apply length adjustment based on cueHitOffsetY (Top/Bottom Spin)
        const lengthFactor = 1 + (cueHitOffsetY * AIMING_LINE_FOLLOW_DRAW_SENSITIVITY);
        
        const finalVecX = rotatedVecX * lengthFactor;
        const finalVecY = rotatedVecY * lengthFactor;

        const dynamicTargetX = Cx + finalVecX;
        const dynamicTargetY = Cy + finalVecY;

        setDynamicAimingLineTarget({ x: dynamicTargetX, y: dynamicTargetY });
      } else {
        setDynamicAimingLineTarget(null);
      }
    } else {
      setDynamicAimingLineTarget(null);
    }
  }, [cueBall, selectedPocketId, balls, cueHitOffsetX, cueHitOffsetY]); // Added dependencies

  // handleSuggestShot removed

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3 flex flex-col items-center">
          <PoolTable
            balls={balls}
            setBalls={setBalls} // Pass setBalls for direct manipulation if needed by PoolTable, or use onBallMove
            onBallMove={handleBallMove}
            pockets={POCKET_DEFINITIONS}
            selectedPocketId={selectedPocketId}
            onPocketClick={setSelectedPocketId}
            cueBall={cueBall}
            aimingPoint={dynamicAimingLineTarget}
            cueHitOffsetX={cueHitOffsetX}
            cueHitOffsetY={cueHitOffsetY}
            // ballRadius prop is handled by individual ball.radius in PoolTable
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
            // onSuggestShot and isSuggestingShot removed
            availablePockets={POCKET_DEFINITIONS.map(p => p.id)}
            cueHitOffsetX={cueHitOffsetX}
            setCueHitOffsetX={setCueHitOffsetX}
            cueHitOffsetY={cueHitOffsetY}
            setCueHitOffsetY={setCueHitOffsetY}
          />
          <ImageAnalyzer
            onAnalyzeImage={handleAnalyzeImage}
            isAnalyzing={isAnalyzing}
          />
          {/* <ShotSuggestionDisplay suggestion={shotSuggestion} /> removed */}
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground border-t border-border">
        Cue Vision &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
