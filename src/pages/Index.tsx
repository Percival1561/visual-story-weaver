import { useState, useEffect } from "react";
import { PromptInput } from "@/components/PromptInput";
import { ImageDisplay } from "@/components/ImageDisplay";
import { Gallery } from "@/components/Gallery";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

interface GalleryImage {
  id: string;
  imageUrl: string;
  prompt: string;
}

const Index = () => {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const { toast } = useToast();

  // Fetch persisted gallery on mount
  useEffect(() => {
    const fetchGallery = async () => {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Failed to fetch gallery:', error);
        return;
      }

      if (data) {
        setGallery(data.map(item => ({
          id: item.id,
          imageUrl: item.image_url,
          prompt: item.prompt
        })));
      }
    };

    fetchGallery();
  }, []);

  const handleGenerate = async (prompt: string) => {
    setIsLoading(true);
    setCurrentPrompt(prompt);
    setCurrentImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt }
      });

      if (error) {
        throw error;
      }

      if (data?.imageUrl) {
        setCurrentImage(data.imageUrl);
        // Add to gallery state (will also be in DB now)
        setGallery(prev => [
          { id: Date.now().toString(), imageUrl: data.imageUrl, prompt },
          ...prev.slice(0, 19)
        ]);
      } else {
        throw new Error('No image received');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectGalleryImage = (image: GalleryImage) => {
    setCurrentImage(image.imageUrl);
    setCurrentPrompt(image.prompt);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-glow-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-glow-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 space-y-16">
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            AI-Powered Image Generation
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
            <span className="bg-gradient-primary bg-clip-text text-transparent">Visionary</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your ideas into stunning visuals. Just describe what you imagine.
          </p>
        </header>

        {/* Main content */}
        <main className="space-y-12">
          <PromptInput onGenerate={handleGenerate} isLoading={isLoading} />
          
          <ImageDisplay 
            imageUrl={currentImage} 
            isLoading={isLoading} 
            prompt={currentPrompt}
          />

          <Gallery images={gallery} onSelect={handleSelectGalleryImage} />
        </main>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground pt-12 border-t border-border">
          <p>Powered by AI • Create unlimited visual masterpieces</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
