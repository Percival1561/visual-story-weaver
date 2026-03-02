import { History, Clock, RotateCcw } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GalleryImage {
  id: string;
  imageUrl: string;
  prompt: string;
  isPublic?: boolean;
  shareId?: string;
}

interface HistorySidebarProps {
  images: GalleryImage[];
  onSelect: (image: GalleryImage) => void;
  onReusePrompt: (prompt: string) => void;
}

export function HistorySidebar({ images, onSelect, onReusePrompt }: HistorySidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" side="left">
      <SidebarContent>
        <SidebarGroup defaultOpen>
          <SidebarGroupLabel className="flex items-center gap-2">
            <History className="w-4 h-4" />
            {!collapsed && <span>History</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <SidebarMenu>
                {images.length === 0 && !collapsed && (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No images yet. Generate your first!
                  </div>
                )}
                {images.map((image) => (
                  <SidebarMenuItem key={image.id}>
                    <SidebarMenuButton
                      onClick={() => onSelect(image)}
                      tooltip={image.prompt}
                      className="h-auto py-2"
                    >
                      {collapsed ? (
                        <img
                          src={image.imageUrl}
                          alt={image.prompt}
                          className="w-8 h-8 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="flex items-start gap-3 w-full min-w-0">
                          <img
                            src={image.imageUrl}
                            alt={image.prompt}
                            className="w-10 h-10 rounded-md object-cover shrink-0 border border-border"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-xs text-sidebar-foreground line-clamp-2 leading-tight">
                              {image.prompt}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onReusePrompt(image.prompt);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reuse prompt
                            </button>
                          </div>
                        </div>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
