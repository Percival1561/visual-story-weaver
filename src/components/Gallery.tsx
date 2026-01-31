import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GalleryImage {
  id: string;
  imageUrl: string;
  prompt: string;
}

interface GalleryProps {
  images: GalleryImage[];
  onSelect: (image: GalleryImage) => void;
  onDelete?: (image: GalleryImage) => void;
  canDelete?: boolean;
}

export function Gallery({ images, onSelect, onDelete, canDelete = false }: GalleryProps) {
  if (images.length === 0) return null;

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
            
            {canDelete && onDelete && (
              <Button
                variant="destructive"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(image);
                }}
                className="absolute top-2 right-2 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            
            <div className="absolute inset-0 ring-2 ring-primary/0 group-hover:ring-primary/50 rounded-xl transition-all duration-300 pointer-events-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
