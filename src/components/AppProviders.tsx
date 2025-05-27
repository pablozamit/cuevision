"use client";

import React from 'react';

// This component can be expanded later for QueryClientProvider, ThemeProvider, etc.
// For now, it just passes children through, facilitating potential future client-side contexts.
export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
