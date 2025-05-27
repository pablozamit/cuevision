"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ImageUp, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface ImageAnalyzerProps {
  onAnalyzeImage: (dataUri: string) => Promise<void>;
  isAnalyzing: boolean;
}

export default function ImageAnalyzer({ onAnalyzeImage, isAnalyzing }: ImageAnalyzerProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 4 * 1024 * 1024) { // Max 4MB
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please upload an image smaller than 4MB.",
        });
        setPreview(null);
        setFile(null);
        if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
        return;
      }

      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
      setFile(null);
    }
  };

  const handleSubmit = async () => {
    if (!file || !preview) {
      toast({
        variant: "destructive",
        title: "No image selected",
        description: "Please select an image to analyze.",
      });
      return;
    }
    try {
      await onAnalyzeImage(preview); // Pass the data URI (preview)
    } catch (error) {
      console.error("Image analysis error:", error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Could not analyze the image. Please try again or use a different image.",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageUp className="h-5 w-5 text-primary" />
          Analyze Table Image
        </CardTitle>
        <CardDescription>Upload a photo of a pool table to set ball positions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="table-image">Upload Image (Max 4MB)</Label>
          <Input
            id="table-image"
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFileChange}
            ref={fileInputRef}
            disabled={isAnalyzing}
            className="file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:py-2 file:px-4 file:rounded-md file:border-0"
          />
        </div>
        {preview && (
          <div className="mt-4 border rounded-md overflow-hidden aspect-video relative bg-muted">
            <Image src={preview} alt="Table preview" layout="fill" objectFit="contain" data-ai-hint="pool table" />
          </div>
        )}
        {isAnalyzing && <p className="text-sm text-primary flex items-center gap-2"><svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Analyzing image...</p>}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} disabled={!file || isAnalyzing} className="w-full">
          <ImageUp className="mr-2 h-4 w-4" />
          {isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
        </Button>
      </CardFooter>
    </Card>
  );
}
