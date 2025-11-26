import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { Layout } from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import DdlConverter from "./pages/DdlConverter";
import DocumentConverter from "./pages/DocumentConverter";
import DataAnalysis from "./pages/DataAnalysis";
import JsonViewer from "./pages/JsonViewer";
import RegexTester from "./pages/RegexTester";
import EncodingTools from "./pages/EncodingTools";
import DiffTool from "./pages/DiffTool";
import Settings from "./pages/Settings";
import History from "./pages/History";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/ddl-converter" element={<DdlConverter />} />
                <Route path="/document-converter" element={<DocumentConverter />} />
                <Route path="/data-analysis" element={<DataAnalysis />} />
                <Route path="/json-viewer" element={<JsonViewer />} />
                <Route path="/regex-tester" element={<RegexTester />} />
                <Route path="/encoding-tools" element={<EncodingTools />} />
                <Route path="/diff-tool" element={<DiffTool />} />
                <Route path="/history" element={<History />} />
                <Route path="/settings" element={<Settings />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
