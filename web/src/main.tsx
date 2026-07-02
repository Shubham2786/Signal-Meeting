import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { ThemeProvider } from "./lib/theme";
import { TooltipProvider } from "./components/ui/Tooltip";
import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider delayDuration={200} skipDelayDuration={300}>
        <App />
      </TooltipProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              "!bg-surface !border !border-border !text-text !rounded-lg !shadow-md",
            actionButton: "!bg-primary !text-primary-fg",
          },
        }}
      />
    </ThemeProvider>
  </StrictMode>
);
