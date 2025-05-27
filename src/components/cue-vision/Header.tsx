import React from 'react';
import { Target } from 'lucide-react'; // Pool/Target icon

export default function Header() {
  return (
    <header className="py-4 px-6 bg-card border-b border-border shadow-md">
      <div className="container mx-auto flex items-center gap-2">
        <Target className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Cue Vision</h1>
      </div>
    </header>
  );
}
