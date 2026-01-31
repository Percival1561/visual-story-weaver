import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Wand2 } from "lucide-react";

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
}

export function PromptInput({ onGenerate, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onGenerate(prompt.trim());
    }
  };

  const examplePrompts = [
    "A cosmic whale swimming through nebulas",
    "Cyberpunk city at sunset with neon lights",
    "Enchanted forest with glowing mushrooms",
    "Abstract art of emotions in vibrant colors",
  ];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-primary rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
          <div className="relative bg-card rounded-xl border border-border p-1">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create..."
              className="min-h-[120px] resize-none bg-transparent border-0 focus-visible:ring-0 text-lg placeholder:text-muted-foreground/60"
              disabled={isLoading}
            />
            <div className="flex justify-end p-2">
              <Button 
                type="submit" 
                disabled={!prompt.trim() || isLoading}
                className="bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold px-6 shadow-glow transition-all duration-300 hover:shadow-glow-lg"
              >
                {isLoading ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <div className="flex flex-wrap gap-2 justify-center">
        {examplePrompts.map((example, index) => (
          <button
            key={index}
            onClick={() => setPrompt(example)}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-full bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors duration-200 disabled:opacity-50"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
