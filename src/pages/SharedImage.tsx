import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, Download } from "lucide-react";

interface SharedImage {
  id: string;
  image_url: string;
  prompt: string;
  created_at: string;
}

const SharedImage = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [image, setImage] = useState<SharedImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImage = async () => {
      if (!shareId) {
        setError("Invalid share link");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('gallery')
        .select('*')
        .eq('share_id', shareId)
        .eq('is_public', true)
        .single();

      if (fetchError || !data) {
        setError("Image not found or is no longer shared");
        setLoading(false);
        return;
      }

      setImage(data);
      setLoading(false);
    };

    fetchImage();
  }, [shareId]);

  const handleDownload = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image.image_url;
    link.download = `visionary-${image.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">{error || "Image not found"}</h1>
          <p className="text-muted-foreground">This image may have been deleted or is no longer shared.</p>
          <Link to="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Visionary
            </Button>
          </Link>
        </div>
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

      <div className="relative z-10 container mx-auto px-4 py-12 space-y-8">
        <header className="text-center space-y-4">
          <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">
            <Sparkles className="w-4 h-4 text-primary" />
            Created with Visionary
          </Link>
        </header>

        <main className="max-w-3xl mx-auto space-y-6">
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-primary rounded-2xl blur-xl opacity-30" />
            <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
              <img
                src={image.image_url}
                alt={image.prompt}
                className="w-full h-auto"
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Prompt</h2>
              <p className="text-foreground">{image.prompt}</p>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleDownload} variant="secondary">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Link to="/">
                <Button className="bg-gradient-primary text-primary-foreground">
                  Create Your Own
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SharedImage;
