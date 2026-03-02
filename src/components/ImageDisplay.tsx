import { useState, useEffect, useRef } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const ESTIMATED_SECONDS = 20;

const loadingPhrases = [
  "Conjuring pixels…",
  "Mixing colors…",
  "Rendering imagination…",
  "Painting your vision…",
  "Almost there…",
];

interface ImageDisplayProps {
  imageUrl: string | null;
  isLoading: boolean;
  prompt: string;
}

export function ImageDisplay({ imageUrl, isLoading, prompt }: ImageDisplayProps) {
  const [elapsed, setElapsed] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isLoading) {
      setElapsed(0);
      setPhraseIndex(0);
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
      const phraseInterval = setInterval(() => {
        setPhraseIndex((prev) => (prev + 1) % loadingPhrases.length);
      }, 3500);
      return () => {
        clearInterval(intervalRef.current!);
        clearInterval(phraseInterval);
      };
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [isLoading]);

  const progress = Math.min(elapsed / ESTIMATED_SECONDS, 0.95);
  const remaining = Math.max(ESTIMATED_SECONDS - elapsed, 1);

  const handleDownload = async () => {
    if (!imageUrl) return;
    
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `visionary-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto aspect-square rounded-2xl bg-card border border-border flex items-center justify-center overflow-hidden">
        <div className="text-center space-y-6 w-full max-w-xs px-6">
          {/* Spinner */}
          <div className="relative mx-auto w-20 h-20">
            <div className="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-gradient-primary opacity-50 animate-pulse" />
            </div>
          </div>

          {/* Rotating phrase */}
          <AnimatePresence mode="wait">
            <motion.p
              key={phraseIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-foreground font-medium h-6"
            >
              {loadingPhrases[phraseIndex]}
            </motion.p>
          </AnimatePresence>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              ~{remaining}s remaining
            </p>
          </div>

          {/* Prompt */}
          <p className="text-sm text-muted-foreground max-w-xs line-clamp-2">{prompt}</p>
        </div>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="w-full max-w-2xl mx-auto aspect-square rounded-2xl bg-card/50 border border-dashed border-border flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-primary opacity-20 flex items-center justify-center">
            <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-muted-foreground">Your creation will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="relative group">
        <div className="absolute -inset-2 bg-gradient-primary rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
        <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
          <img
            src={imageUrl}
            alt={prompt}
            className="w-full h-auto"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <p className="text-sm text-foreground/90 max-w-md line-clamp-2">{prompt}</p>
              <Button
                onClick={handleDownload}
                size="sm"
                variant="secondary"
                className="shrink-0"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
