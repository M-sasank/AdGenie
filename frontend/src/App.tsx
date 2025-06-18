
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { NextUIProvider } from "@nextui-org/react";
import "@/lib/cognito"; // Initialize Cognito configuration
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import SocialMediaConnection from "./pages/SocialMediaConnection";
import HolidayManager from "./pages/HolidayManager";
import InstagramCallback from "./pages/InstagramCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <NextUIProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/social-media-connection" element={<SocialMediaConnection />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/holidays" element={<HolidayManager />} />
              <Route path="/instagram/callback" element={<InstagramCallback />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </NextUIProvider>
  </QueryClientProvider>
);

export default App;
