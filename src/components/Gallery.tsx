import { Trash2, Share2, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface GalleryImage {
  id: string;
  imageUrl: string;
  prompt: string;
  isPublic?: boolean;
  shareId?: string;
}

interface GalleryProps {
  images: GalleryImage[];
  onSelect: (image: GalleryImage) => void;
  onDelete?: (image: GalleryImage) => void;
  onShare?: (image: GalleryImage) => Promise<string | null>;
  onUnshare?: (image: GalleryImage) => Promise<void>;
  canDelete?: boolean;
  canShare?: boolean;
}

export function Gallery({ 
  images, 
  onSelect, 
  onDelete, 
  onShare,
  onUnshare,
  canDelete = false,
  canShare = false
}: GalleryProps) {
  const [sharingId, setSharingId] = useState<string | null>(null);
  const { toast } = useToast();

  if (images.length === 0) return null;

  const handleShare = async (e: React.MouseEvent, image: GalleryImage) => {
    e.stopPropagation();
    if (!onShare) return;

    setSharingId(image.id);
    try {
      const shareId = await onShare(image);
      if (shareId) {
        const shareUrl = `${window.location.origin}/shared/${shareId}`;
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Share link has been copied to clipboard.",
        });
      }
    } finally {
      setSharingId(null);
    }
  };

  const handleUnshare = async (e: React.MouseEvent, image: GalleryImage) => {
    e.stopPropagation();
    if (!onUnshare) return;

    setSharingId(image.id);
    try {
      await onUnshare(image);
      toast({
        title: "Unshared",
        description: "Image is no longer publicly accessible.",
      });
    } finally {
      setSharingId(null);
    }
  };

  const copyShareLink = async (e: React.MouseEvent, image: GalleryImage) => {
    e.stopPropagation();
    if (!image.shareId) return;
    
    const shareUrl = `${window.location.origin}/shared/${image.shareId}`;
    await navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied!",
      description: "Share link has been copied to clipboard.",
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Your Creations</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="group relative aspect-square rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300"
          >
            <button
              onClick={() => onSelect(image)}
              className="w-full h-full"
            >
              <img
                src={image.imageUrl}
                alt={image.prompt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-xs text-foreground/90 line-clamp-2">{image.prompt}</p>
                </div>
              </div>
            </button>

            {/* Public badge */}
            {image.isPublic && (
              <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-primary/90 text-primary-foreground text-xs flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                Shared
              </div>
            )}
            
            {/* Action buttons */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {canShare && onShare && !image.isPublic && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={(e) => handleShare(e, image)}
                  disabled={sharingId === image.id}
                  className="w-8 h-8"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              )}
              
              {canShare && image.isPublic && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={(e) => copyShareLink(e, image)}
                    className="w-8 h-8"
                  >
                    <Link2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={(e) => handleUnshare(e, image)}
                    disabled={sharingId === image.id}
                    className="w-8 h-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}

              {canDelete && onDelete && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(image);
                  }}
                  className="w-8 h-8"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <div className="absolute inset-0 ring-2 ring-primary/0 group-hover:ring-primary/50 rounded-xl transition-all duration-300 pointer-events-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
