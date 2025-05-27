// src/ai/flows/analyze-table-photo.ts
'use server';

/**
 * @fileOverview Analyzes a photo of a pool table to identify ball positions.
 *
 * - analyzeTablePhoto - A function that handles the analysis of the pool table photo.
 * - AnalyzeTablePhotoInput - The input type for the analyzeTablePhoto function.
 * - AnalyzeTablePhotoOutput - The return type for the analyzeTablePhoto function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeTablePhotoInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a pool table, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeTablePhotoInput = z.infer<typeof AnalyzeTablePhotoInputSchema>;

const AnalyzeTablePhotoOutputSchema = z.object({
  ballPositions: z
    .array(
      z.object({
        x: z.number().describe('The x coordinate of the ball on the table.'),
        y: z.number().describe('The y coordinate of the ball on the table.'),
        color: z.string().describe('The color of the ball.'),
      })
    )
    .describe('The positions of the balls on the pool table.'),
});
export type AnalyzeTablePhotoOutput = z.infer<typeof AnalyzeTablePhotoOutputSchema>;

export async function analyzeTablePhoto(input: AnalyzeTablePhotoInput): Promise<AnalyzeTablePhotoOutput> {
  return analyzeTablePhotoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeTablePhotoPrompt',
  input: {schema: AnalyzeTablePhotoInputSchema},
  output: {schema: AnalyzeTablePhotoOutputSchema},
  prompt: `You are an expert in analyzing images of pool tables.  Given a photo of a pool table, identify the location of each ball, as well as its color.

Output the data as a JSON array of objects, each object containing the x, y coordinates, and color of the ball.  The x and y coordinates should be relative to the top-left corner of the table, and should be normalized to be between 0 and 1.

Here is the photo:
{{media url=photoDataUri}}`,
});

const analyzeTablePhotoFlow = ai.defineFlow(
  {
    name: 'analyzeTablePhotoFlow',
    inputSchema: AnalyzeTablePhotoInputSchema,
    outputSchema: AnalyzeTablePhotoOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
