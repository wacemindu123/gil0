import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useUser, SignedIn, SignedOut } from "@clerk/clerk-react";
import Index from "./pages/Index";
import { AuthPage } from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Check if Clerk is configured
const isClerkConfigured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Wrapper component that handles auth state
const AuthenticatedApp = () => {
  if (!isClerkConfigured) {
    // No Clerk configured - show app directly (dev mode)
    return <Index />;
  }

  return (
    <>
      <SignedIn>
        <Index />
      </SignedIn>
      <SignedOut>
        <AuthPage />
      </SignedOut>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthenticatedApp />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
