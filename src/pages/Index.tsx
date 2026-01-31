import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PromptInput } from "@/components/PromptInput";
import { ImageDisplay } from "@/components/ImageDisplay";
import { Gallery } from "@/components/Gallery";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sparkles, LogIn, LogOut, User } from "lucide-react";

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
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch persisted gallery on mount when user is logged in
  useEffect(() => {
    if (!user) {
      setGallery([]);
      return;
    }

    const fetchGallery = async () => {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .eq('user_id', user.id)
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
  }, [user]);

  const handleGenerate = async (prompt: string, style: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to generate and save images.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setIsLoading(true);
    setCurrentPrompt(prompt);
    setCurrentImage(null);

    const fullPrompt = style ? `${prompt}, ${style}` : prompt;

    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: fullPrompt }
      });

      if (error) {
        throw error;
      }

      if (data?.imageUrl) {
        setCurrentImage(data.imageUrl);
        // Refresh gallery from database
        const { data: galleryData } = await supabase
          .from('gallery')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (galleryData) {
          setGallery(galleryData.map(item => ({
            id: item.id,
            imageUrl: item.image_url,
            prompt: item.prompt
          })));
        }
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

  const handleDeleteImage = async (image: GalleryImage) => {
    try {
      const { error } = await supabase
        .from('gallery')
        .delete()
        .eq('id', image.id);

      if (error) throw error;

      setGallery(prev => prev.filter(img => img.id !== image.id));
      
      if (currentImage === image.imageUrl) {
        setCurrentImage(null);
        setCurrentPrompt("");
      }

      toast({
        title: "Deleted",
        description: "Image removed from your gallery.",
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete the image.",
        variant: "destructive",
      });
    }
  };

  const handleSelectGalleryImage = (image: GalleryImage) => {
    setCurrentImage(image.imageUrl);
    setCurrentPrompt(image.prompt);
  };

  const handleSignOut = async () => {
    await signOut();
    setGallery([]);
    setCurrentImage(null);
    setCurrentPrompt("");
    toast({
      title: "Signed out",
      description: "See you next time!",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

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
          {/* Auth buttons */}
          <div className="flex justify-end mb-4">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {user.email}
                </span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>

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

          <Gallery 
            images={gallery} 
            onSelect={handleSelectGalleryImage}
            onDelete={handleDeleteImage}
            canDelete={!!user}
          />
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
