import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PromptInput } from "@/components/PromptInput";
import { ImageDisplay } from "@/components/ImageDisplay";
import { Gallery } from "@/components/Gallery";
import { GenerationCounter } from "@/components/GenerationCounter";
import { LimitReachedModal } from "@/components/LimitReachedModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGenerationLimit } from "@/hooks/useGenerationLimit";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sparkles, LogIn, LogOut, User, Crown, Wand2 } from "lucide-react";

interface GalleryImage {
  id: string;
  imageUrl: string;
  prompt: string;
  isPublic?: boolean;
  shareId?: string;
}

const Index = () => {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const { user, loading, subscription, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const {
    generationsUsed,
    generationsLimit,
    hasSubscription,
    limitReached,
    showSignUpPrompt,
    showProPrompt,
    incrementAnonymousCount,
    updateFromResponse,
    refresh: refreshLimit,
  } = useGenerationLimit();

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
          prompt: item.prompt,
          isPublic: item.is_public,
          shareId: item.share_id
        })));
      }
    };

    fetchGallery();
  }, [user]);

  // Show modal when limit is reached
  useEffect(() => {
    if (showSignUpPrompt || showProPrompt) {
      setShowLimitModal(true);
    }
  }, [showSignUpPrompt, showProPrompt]);

  const handleGenerate = async (prompt: string, style: string) => {
    // Check limits before generating
    if (limitReached) {
      setShowLimitModal(true);
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
        // Check if it's a limit error
        if (error.message?.includes('LIMIT_REACHED') || error.message?.includes('Daily limit')) {
          setShowLimitModal(true);
          return;
        }
        throw error;
      }

      if (data?.imageUrl) {
        setCurrentImage(data.imageUrl);
        
        // For anonymous users, increment localStorage counter
        if (!user) {
          incrementAnonymousCount();
        }
        
        // Update generation counter from response
        if (data.generationsUsed !== undefined) {
          updateFromResponse({
            generationsUsed: data.generationsUsed,
            generationsLimit: data.generationsLimit,
            hasSubscription: data.hasSubscription,
          });
        }

        // Refresh gallery from database for signed-in users
        if (user) {
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
              prompt: item.prompt,
              isPublic: item.is_public,
              shareId: item.share_id
            })));
          }
        }
      } else {
        throw new Error('No image received');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      
      // Check for limit error in response
      if (error?.context?.body) {
        try {
          const body = JSON.parse(error.context.body);
          if (body.code === 'LIMIT_REACHED') {
            setShowLimitModal(true);
            return;
          }
        } catch (e) {}
      }
      
      toast({
        title: "Generation failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVariation = async (image: GalleryImage) => {
    if (!user || (!hasSubscription && limitReached)) {
      setShowLimitModal(true);
      return;
    }

    const variationPrompt = `A creative variation of: ${image.prompt}. Create something similar but with unique artistic interpretation.`;
    handleGenerate(variationPrompt, "");
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

  const handleShareImage = async (image: GalleryImage): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('share-image', {
        body: { imageId: image.id, action: 'share' }
      });

      if (error) throw error;

      // Update local state
      setGallery(prev => prev.map(img => 
        img.id === image.id ? { ...img, isPublic: true, shareId: data.shareId } : img
      ));

      return data.shareId;
    } catch (error: any) {
      console.error('Share error:', error);
      toast({
        title: "Share failed",
        description: error.message || "Could not share the image.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleUnshareImage = async (image: GalleryImage) => {
    try {
      const { error } = await supabase.functions.invoke('share-image', {
        body: { imageId: image.id, action: 'unshare' }
      });

      if (error) throw error;

      // Update local state
      setGallery(prev => prev.map(img => 
        img.id === image.id ? { ...img, isPublic: false } : img
      ));
    } catch (error: any) {
      console.error('Unshare error:', error);
      toast({
        title: "Unshare failed",
        description: error.message || "Could not unshare the image.",
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

  const handleStartTrial = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: error.message || "Could not start checkout.",
        variant: "destructive",
      });
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Portal error:', error);
      toast({
        title: "Error",
        description: error.message || "Could not open subscription management.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  const isSubscribed = subscription?.subscribed || hasSubscription;
  const isTrial = subscription?.trial;

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
          {/* Auth & Subscription buttons */}
          <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
            {/* Generation Counter */}
            <GenerationCounter 
              used={generationsUsed} 
              limit={generationsLimit} 
              hasSubscription={isSubscribed} 
            />
            
            <div className="flex items-center gap-3 flex-wrap">
              {user ? (
                <>
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {user.email}
                  </span>
                  
                  {isSubscribed ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        {isTrial ? "Trial" : "Pro"}
                      </span>
                      <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                        Manage
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={handleStartTrial}
                      className="bg-gradient-primary text-primary-foreground shadow-glow"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Start Free Trial
                    </Button>
                  )}
                  
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
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

          {/* Subscription CTA for non-subscribers */}
          {user && !isSubscribed && !limitReached && (
            <div className="max-w-md mx-auto mt-6 p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shrink-0">
                  <Crown className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-foreground">Unlock Visionary Pro</h3>
                  <p className="text-sm text-muted-foreground">3-day free trial, then $9.99/month</p>
                </div>
                <Button 
                  onClick={handleStartTrial}
                  className="shrink-0 bg-gradient-primary text-primary-foreground"
                >
                  Start Trial
                </Button>
              </div>
            </div>
          )}
        </header>

        {/* Main content */}
        <main className="space-y-12">
          <PromptInput onGenerate={handleGenerate} isLoading={isLoading} />
          
          <ImageDisplay 
            imageUrl={currentImage} 
            isLoading={isLoading} 
            prompt={currentPrompt}
          />

          {/* Variation button when viewing an image */}
          {currentImage && isSubscribed && (
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  const currentGalleryImage = gallery.find(img => img.imageUrl === currentImage);
                  if (currentGalleryImage) {
                    handleVariation(currentGalleryImage);
                  }
                }}
                variant="outline"
                className="border-primary/50 hover:bg-primary/10"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Create Variation
              </Button>
            </div>
          )}

          <Gallery 
            images={gallery} 
            onSelect={handleSelectGalleryImage}
            onDelete={handleDeleteImage}
            onShare={handleShareImage}
            onUnshare={handleUnshareImage}
            canDelete={!!user}
            canShare={!!user && isSubscribed}
          />
        </main>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground pt-12 border-t border-border">
          <p>Powered by AI • Create unlimited visual masterpieces</p>
        </footer>
      </div>

      {/* Limit Reached Modal */}
      <LimitReachedModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        variant="pro"
      />
    </div>
  );
};

export default Index;
