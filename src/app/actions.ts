"use server";

import { analyzeTablePhoto as analyzeTablePhotoFlow, AnalyzeTablePhotoInput, AnalyzeTablePhotoOutput } from "@/ai/flows/analyze-table-photo";
import { suggestShotParameters as suggestShotParametersFlow, SuggestShotParametersInput, SuggestShotParametersOutput } from "@/ai/flows/suggest-shot-parameters";
import type { SimpleBallPosition } from "@/types/pool";

export async function analyzeTablePhotoAction(
  input: AnalyzeTablePhotoInput
): Promise<AnalyzeTablePhotoOutput> {
  try {
    console.log("Analyzing photo with input URI starting with:", input.photoDataUri.substring(0, 50));
    const result = await analyzeTablePhotoFlow(input);
    console.log("Analysis result:", result);
    return result;
  } catch (error) {
    console.error("Error in analyzeTablePhotoAction:", error);
    throw new Error("Failed to analyze table photo.");
  }
}

export async function suggestShotParametersAction(
  input: SuggestShotParametersInput
): Promise<SuggestShotParametersOutput> {
  try {
    // Ensure ball positions are just x, y as per SuggestShotParametersInput schema
    // The schema defines ballPositions: z.array(z.object({ x: z.number(), y: z.number() }))
    // So if the input to this action already conforms, no transformation is needed.
    // If `input.ballPositions` contains more fields (like color, id), they would be stripped by Zod during validation if not defined in the schema.
    // For clarity, let's ensure we only pass what's needed if there's a mismatch.
    // However, the AI flow definition itself should handle this if the schema is correct.

    const preparedInput: SuggestShotParametersInput = {
      ...input,
      ballPositions: input.ballPositions.map(b => ({ x: b.x, y: b.y })) as SimpleBallPosition[] // Type assertion to satisfy schema
    };

    console.log("Suggesting shot parameters with input:", preparedInput);
    const result = await suggestShotParametersFlow(preparedInput);
    console.log("Suggestion result:", result);
    return result;
  } catch (error) {
    console.error("Error in suggestShotParametersAction:", error);
    // Check if error is ZodError for more specific message
    if (error instanceof Error && 'issues' in error) { // Simple check for ZodError-like structure
      console.error("Zod validation issues:", (error as any).issues);
      throw new Error(`Input validation failed for shot suggestion. ${error.message}`);
    }
    throw new Error("Failed to suggest shot parameters.");
  }
}
