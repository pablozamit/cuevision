
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/cue-vision/Header';
import PoolTable from '@/components/cue-vision/PoolTable';
// import ShotControls from '@/components/cue-vision/ShotControls'; // To be removed
import NewShotControls from '@/components/cue-vision/NewShotControls'; // To be added
import ImageAnalyzer from '@/components/cue-vision/ImageAnalyzer';
import ShotSuggestionDisplay from '@/components/cue-vision/ShotSuggestionDisplay';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react'; // Play icon might be removed if Test Shot button is removed
import type { Ball, Pocket, PocketPosition, ShotSuggestion, AnalyzedBallPosition, SimpleBallPosition } from '@/types/pool';
import * as physics from '@/lib/physics'; // Import physics module
import { useToast } from '@/hooks/use-toast';
import { analyzeTablePhotoAction, suggestShotParametersAction } from './actions';

const TABLE_ASPECT_RATIO = 2 / 1; // Standard pool table aspect ratio (length/width)
const BALL_RADIUS_NORMALIZED = 0.028; // Approximate normalized radius (e.g., 2.25 inches / 88 inches table width for a 8ft table)

const POCKET_DEFINITIONS: Pocket[] = [
  { id: 'top-left', x: 0.02, y: 0.02, radius: 0.045 }, // Slightly adjusted radius
  { id: 'top-middle', x: 0.5, y: 0.01, radius: 0.05 },
  { id: 'top-right', x: 0.98, y: 0.02, radius: 0.045 },
  { id: 'bottom-left', x: 0.02, y: 0.98, radius: 0.045 },
  { id: 'bottom-middle', x: 0.5, y: 0.99, radius: 0.05 },
  { id: 'bottom-right', x: 0.98, y: 0.98, radius: 0.045 },
];

const DEFAULT_BALLS: Ball[] = [
  { id: 'cue', x: 0.25, y: 0.5, color: 'white', radius: BALL_RADIUS_NORMALIZED, vx: 0, vy: 0, spinX: 0, spinY: 0, isPocketed: false },
  { id: 'obj1', x: 0.75, y: 0.5, color: 'red', radius: BALL_RADIUS_NORMALIZED, vx: 0, vy: 0, spinX: 0, spinY: 0, isPocketed: false },
];

export default function CueVisionPage() {
  const [balls, setBalls] = useState<Ball[]>(DEFAULT_BALLS.map(b => ({...b}))); // Ensure deep copy for initial state
  const [cueBallId, setCueBallId] = useState<string | null>('cue'); // Default cue ball
  const [selectedPocketId, setSelectedPocketId] = useState<PocketPosition | null>(null);
  // Remove state related to old ShotControls
  // const [numRails, setNumRails] = useState<number>(1); 
  // const [aimingMethod, setAimingMethod] = useState<'ball-first' | 'rail-first'>('ball-first');
  const [shotSuggestion, setShotSuggestion] = useState<ShotSuggestion | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSuggestingShot, setIsSuggestingShot] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false); // New state for simulation

  const { toast } = useToast();
  const simulationFrameRef = React.useRef<number | null>(null);


  const cueBall = balls.find(b => b.id === cueBallId);

  const handleResetBalls = () => {
    if (isSimulating) {
      if (simulationFrameRef.current) {
        cancelAnimationFrame(simulationFrameRef.current);
      }
      setIsSimulating(false);
    }
    physics.clearDynamicBallsFromWorld(); // Clear physics state
    setBalls(DEFAULT_BALLS.map(b => ({...b}))); // Ensure deep copy
    setCueBallId('cue');
    setSelectedPocketId(null);
    setShotSuggestion(null);
    toast({ title: "Table Reset", description: "Ball positions have been reset to default." });
  };

  const handleBallMove = useCallback((ballId: string, newPosition: { x: number; y: number }) => {
    if (isSimulating) return; // Don't allow moving balls during simulation
    setBalls(prevBalls =>
      prevBalls.map(b =>
        b.id === ballId ? { ...b, x: newPosition.x, y: newPosition.y } : b
      )
    );
  }, [isSimulating]);

  const handleAnalyzeImage = useCallback(async (photoDataUri: string) => {
    setIsAnalyzing(true);
    setShotSuggestion(null); 
    try {
      const result = await analyzeTablePhotoAction({ photoDataUri });
      if (result.ballPositions && result.ballPositions.length > 0) {
        const newBalls: Ball[] = result.ballPositions.map((bp: AnalyzedBallPosition, index: number) => ({
          id: `ball-${index}-${Date.now()}`, // Consider more stable IDs if analysis needs to identify specific balls
          x: bp.x,
          y: bp.y,
          color: bp.color.toLowerCase(),
          radius: BALL_RADIUS_NORMALIZED,
          vx: 0,
          vy: 0,
          spinX: 0,
          spinY: 0,
          isPocketed: false,
        }));
        
        setBalls(newBalls.map(b => ({...b}))); // Ensure deep copy
        const foundCueBall = newBalls.find(b => b.color === 'white' || b.color === 'ivory');
        if (foundCueBall) {
          setCueBallId(foundCueBall.id);
        } else if (newBalls.length > 0) {
          setCueBallId(newBalls[0].id); 
          toast({ title: "Cue Ball Note", description: "White cue ball not distinctly identified. First ball selected as cue. You may need to adjust.", duration: 5000 });
        } else {
          setCueBallId(null);
        }

        toast({ title: "Image Analyzed", description: "Ball positions updated from image." });
      } else {
        // If AI returns empty or malformed, reset to default to avoid broken state
        setBalls(DEFAULT_BALLS.map(b => ({...b})));  // Ensure deep copy
        setCueBallId('cue');
        toast({ variant: "destructive", title: "Analysis Incomplete", description: "No balls found or analysis failed. Table reset to default." });
      }
    } catch (error: any) {
      setBalls(DEFAULT_BALLS.map(b => ({...b}))); // Reset on error with deep copy
      setCueBallId('cue');
      toast({ variant: "destructive", title: "Analysis Error", description: error.message || "Failed to analyze image. Table reset to default." });
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

    const otherBalls = balls.filter(b => b.id !== cueBallId);
    const allBallSimplePositions: SimpleBallPosition[] = [
      { x: cueBall.x, y: cueBall.y },
      ...otherBalls.map(b => ({ x: b.x, y: b.y }))
    ];
    
    try {
      const suggestion = await suggestShotParametersAction({
        ballPositions: allBallSimplePositions,
        targetPocket: selectedPocketId,
        // These are no longer part of state, pass default or decide if this feature is kept
        numberOfRails: 1, // Example: or remove if not used by AI anymore
        aimingMethod: 'ball-first', // Example
      });
      setShotSuggestion(suggestion);
      toast({ title: "Shot Suggested!", description: "AI has provided shot parameters." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Suggestion Error", description: error.message || "Failed to get shot suggestion." });
    } finally {
      setIsSuggestingShot(false);
    }
  }, [cueBall, selectedPocketId, balls, cueBallId, toast]);


  interface ShotParams {
    direction: { x: number; y: number };
    power: number; // 0-1
    spin: { x: number; y: number }; // -1 to 1 for each axis
  }

  const runShotSimulation = useCallback((shotParams: ShotParams) => {
    if (!cueBall) {
      toast({ title: "Error", description: "Cue ball not found for simulation."});
      return;
    }
     // Ensure cueBallId from state is used to find the cue ball for physics body identification
    const currentCueBallId = cueBallId;
    if (!currentCueBallId) {
      toast({ title: "Error", description: "Cue ball ID not set."});
      return;
    }

    setIsSimulating(true);
    physics.setupBallsInPhysics(balls); // Setup physics world with current ball states

    const cueBallPhysicsBody = physics.world.bodies.find(
      body => body.plugin.appBallId === currentCueBallId // Use appBallId from plugin
    );

    if (!cueBallPhysicsBody) {
      toast({ title: "Physics Error", description: `Cue ball body (ID: ${currentCueBallId}) not found in physics engine.`});
      setIsSimulating(false);
      return;
    }

    physics.applyShotImpulse(cueBallPhysicsBody, shotParams.direction, shotParams.power, shotParams.spin);

    const gameStep = () => {
      if (!physics.areBallsMoving()) {
        setIsSimulating(false);
        // Final update for pocketed status based on last step's events
        const pocketedIds = physics.getAndClearPocketedBallIds();
        if (pocketedIds.size > 0) {
          setBalls(prevBalls =>
            prevBalls.map(b => (pocketedIds.has(b.id) ? { ...b, isPocketed: true, vx: 0, vy: 0 } : b))
          );
        }
        toast({ title: "Simulation Complete", description: "Balls have stopped moving."});
        simulationFrameRef.current = null;
        // Clear the aiming line after simulation is done
        // setShotSuggestion(prev => prev ? { ...prev, aimingPoint: null } : null); 
        return;
      }

      physics.runPhysicsStep();
      const updatedPhysicsData = physics.getBallDataFromPhysics(balls); // Pass current balls to correctly merge isPocketed
      const pocketedIdsInStep = physics.getAndClearPocketedBallIds();

      setBalls(currentBalls =>
        currentBalls.map(appBall => {
          const physicsData = updatedPhysicsData.find(pb => pb.id === appBall.id);
          let isNowPocketed = appBall.isPocketed;
          if (pocketedIdsInStep.has(appBall.id)) {
            isNowPocketed = true;
          }
          
          if (physicsData) {
            return {
              ...appBall,
              x: physicsData.x,
              y: physicsData.y,
              vx: physicsData.vx,
              vy: physicsData.vy,
              spinY: physicsData.spinY,
              // spinX remains unchanged from appBall for now
              isPocketed: isNowPocketed || physicsData.isPocketed || false, // Ensure pocketed status is sticky
            };
          }
          // If ball is pocketed but no physics data (e.g. removed from simulation), keep its pocketed state
          return isNowPocketed ? { ...appBall, isPocketed: true, vx:0, vy:0 } : appBall;
        })
      );

      simulationFrameRef.current = requestAnimationFrame(gameStep);
    };
    simulationFrameRef.current = requestAnimationFrame(gameStep);
  }, [balls, cueBall, toast, cueBallId]); // Added cueBallId dependency


  const handleMakeShot = useCallback((params: { power: number; spin: { x: number; y: number } }) => {
    if (!cueBall) {
      toast({ title: "Error", description: "Cue ball not found." });
      return;
    }

    let targetDirection = { x: 1, y: 0 }; // Default: shoot right
    const objectBalls = balls.filter(b => b.id !== cueBallId && !b.isPocketed);

    if (shotSuggestion?.aimingPoint) {
      const dx = shotSuggestion.aimingPoint.x - cueBall.x;
      const dy = shotSuggestion.aimingPoint.y - cueBall.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > 0) {
        targetDirection = { x: dx / mag, y: dy / mag };
      }
      // console.log("Aiming with AI suggestion:", targetDirection);
    } else if (objectBalls.length > 0) {
      const targetBall = objectBalls[0]; // Fallback: aim at the first object ball
      const dx = targetBall.x - cueBall.x;
      const dy = targetBall.y - cueBall.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > 0) {
        targetDirection = { x: dx / mag, y: dy / mag };
      }
      // console.log("Aiming with fallback (first object ball):", targetDirection);
    } else {
      // console.log("Aiming with default (shoot right):", targetDirection);
    }
    
    runShotSimulation({
      direction: targetDirection,
      power: params.power,
      spin: params.spin,
    });
  }, [cueBall, balls, cueBallId, shotSuggestion, runShotSimulation, toast]);


  // Effect to clear physics world if component unmounts while simulating
  useEffect(() => {
    return () => {
      if (simulationFrameRef.current) {
        cancelAnimationFrame(simulationFrameRef.current);
      }
      physics.clearDynamicBallsFromWorld();
    };
  }, []);


  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3 flex flex-col items-center">
          <PoolTable
            balls={balls}
            // setBalls={setBalls} // No longer passing setBalls directly
            onBallMove={handleBallMove}
            isSimulating={isSimulating} // Pass isSimulating prop
            pockets={POCKET_DEFINITIONS}
            selectedPocketId={selectedPocketId}
            onPocketClick={setSelectedPocketId}
            cueBall={cueBall}
            aimingPoint={shotSuggestion?.aimingPoint} // This will show the AI aiming line if available
          />
          <div className="flex space-x-2 mt-4">
            <Button variant="outline" onClick={handleResetBalls} disabled={isSimulating}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset Table
            </Button>
            {/* Test Shot button is removed, NewShotControls will have its own "Make Shot" button */}
          </div>
        </div>
        <div className="lg:w-1/3 space-y-6">
          {/* Old ShotControls removed */}
          <NewShotControls
            onMakeShot={handleMakeShot}
            disabled={isSimulating || isAnalyzing || isSuggestingShot}
            initialPower={shotSuggestion?.powerPercentage ? shotSuggestion.powerPercentage * 100 : 50}
            initialSpin={shotSuggestion?.cueBallSpin || { x: 0, y: 0 }}
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
