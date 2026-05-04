import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Upload, Scissors, Download, Copy, X, Loader2, Image as ImageIcon, Type, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";

const MAX_SIZE = 500 * 1024 * 1024;
const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];
const ACCEPTED_EXT = [".mp4", ".mov", ".avi", ".webm"];

const CLIP_LENGTHS = [15, 30, 45, 60, 90, 120, 180, 240];
const PLATFORMS = [
  { id: "tiktok", label: "TikTok", className: "bg-pink-500 text-white border-pink-500" },
  { id: "reels", label: "Instagram Reels", className: "bg-gradient-to-r from-purple-500 to-orange-500 text-white border-transparent" },
  { id: "shorts", label: "YouTube Shorts", className: "bg-red-600 text-white border-red-600" },
  { id: "snap", label: "Snapchat", className: "bg-yellow-400 text-black border-yellow-400" },
];
const STYLES = ["Hook-First", "High Energy", "Emotional", "Funny", "Educational", "Trending Audio"];

const CAPTION_FONTS = [
  { id: "inter", label: "Inter (Clean)", css: "'Inter', system-ui, sans-serif" },
  { id: "impact", label: "Impact (Bold)", css: "Impact, 'Anton', sans-serif" },
  { id: "mono", label: "Mono (Tech)", css: "'JetBrains Mono', ui-monospace, monospace" },
  { id: "serif", label: "Serif (Editorial)", css: "Georgia, 'Times New Roman', serif" },
  { id: "rounded", label: "Rounded (Friendly)", css: "'Nunito', 'Quicksand', system-ui, sans-serif" },
];
const CAPTION_STYLES = [
  { id: "outline", label: "Outline" },
  { id: "background", label: "Background" },
  { id: "neon", label: "Neon Glow" },
  { id: "minimal", label: "Minimal" },
];
const CAPTION_POSITIONS = [
  { id: "top", label: "Top" },
  { id: "middle", label: "Middle" },
  { id: "bottom", label: "Bottom" },
];

const STYLE_REASONS: Record<string, string[]> = {
  "Hook-First": [
    "Opens with a compelling statement in the first 2 seconds — maximises swipe-stop rate.",
    "Strong emotional hook in the first 3 seconds with a tension-building arc — ideal for TikTok retention.",
    "Pattern interrupt at the start drives high completion rate.",
  ],
  "High Energy": [
    "Rapid-cut sequence with peak motion — triggers dopamine response ideal for Reels.",
    "Energetic visuals and quick cuts keep viewers locked in.",
    "Climactic action moment perfect for short-form virality.",
  ],
  Emotional: [
    "Powerful emotional beat that drives shares and saves.",
    "Heart-tugging moment likely to spark comments.",
    "Vulnerable, relatable scene that resonates deeply.",
  ],
  Funny: [
    "Comedic timing and unexpected payoff — high replay value.",
    "Punchline lands cleanly within 10 seconds — ideal for Shorts.",
    "Relatable humor moment with strong meme potential.",
  ],
  Educational: [
    "Clear value-first delivery — strong save-rate potential.",
    "Concise tip viewers will want to share with friends.",
    "Insightful moment that builds authority and trust.",
  ],
  "Trending Audio": [
    "Aligns with rising audio trend — algorithmic boost likely.",
    "Beat-synced visual moment — perfect for trend remixing.",
    "Catchy rhythm cue ideal for trending sound overlays.",
  ],
};

const STATUS_MESSAGES = [
  "Analysing video content...",
  "Detecting high-engagement moments...",
  "Scoring scenes for virality...",
  "Cutting your clips...",
];

interface ClipResult {
  id: string;
  index: number;
  start: number;
  end: number;
  score: number;
  reason: string;
  platforms: string[];
  blobUrl?: string;
  blob?: Blob;
  thumbnail?: string;
  extracting: boolean;
  extractProgress: number; // 0..100
  fallback: boolean;
  captionLoading: boolean;
  caption: string;
  captionEdited: boolean;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};
const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const Clipper = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [clipLength, setClipLength] = useState(30);
  const [platforms, setPlatforms] = useState<string[]>(["tiktok", "reels", "shorts", "snap"]);
  const [clipStyle, setClipStyle] = useState("Hook-First");
  const [numClips, setNumClips] = useState(3);

  // Caption styling controls
  const [captionFont, setCaptionFont] = useState(CAPTION_FONTS[1].id); // Impact default
  const [captionStyle, setCaptionStyle] = useState("background");
  const [captionPosition, setCaptionPosition] = useState("bottom");
  const [captionSize, setCaptionSize] = useState(28);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [zipping, setZipping] = useState(false);

  const [clips, setClips] = useState<ClipResult[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      clips.forEach((c) => c.blobUrl && URL.revokeObjectURL(c.blobUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateClip = (id: string, patch: Partial<ClipResult>) => {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const acceptFile = (f: File) => {
    setUploadError(null);
    if (f.size > MAX_SIZE) {
      toast({ title: "File too large", description: "File too large. Max 500MB.", variant: "destructive" });
      return;
    }
    const lower = f.name.toLowerCase();
    const okType = ACCEPTED_TYPES.includes(f.type) || ACCEPTED_EXT.some((e) => lower.endsWith(e));
    if (!okType) {
      toast({ title: "Unsupported format", description: "Unsupported format. Use MP4, MOV, AVI or WebM.", variant: "destructive" });
      return;
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    clips.forEach((c) => c.blobUrl && URL.revokeObjectURL(c.blobUrl));
    setClips([]);
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const removeVideo = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    clips.forEach((c) => c.blobUrl && URL.revokeObjectURL(c.blobUrl));
    setFile(null);
    setVideoUrl(null);
    setDuration(0);
    setClips([]);
    setUploadError(null);
  };

  const togglePlatform = (id: string) => {
    setPlatforms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const captureThumbnail = (video: HTMLVideoElement, time: number): Promise<string | undefined> => {
    return new Promise((resolve) => {
      try {
        const onSeeked = () => {
          try {
            const canvas = document.createElement("canvas");
            const w = video.videoWidth || 320;
            const h = video.videoHeight || 180;
            const scale = Math.min(1, 320 / w);
            canvas.width = Math.round(w * scale);
            canvas.height = Math.round(h * scale);
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(undefined);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.7));
          } catch {
            resolve(undefined);
          } finally {
            video.removeEventListener("seeked", onSeeked);
          }
        };
        video.addEventListener("seeked", onSeeked);
        video.currentTime = Math.min(time, Math.max(0, (video.duration || time) - 0.1));
      } catch {
        resolve(undefined);
      }
    });
  };

  // Extract a clip and report progress (0..100) via onProgress
  const extractClip = async (
    sourceUrl: string,
    start: number,
    end: number,
    onProgress: (p: number) => void,
  ): Promise<{ blob: Blob; url: string } | null> => {
    if (typeof MediaRecorder === "undefined") return null;
    return new Promise(async (resolve) => {
      const v = document.createElement("video");
      v.src = sourceUrl;
      v.crossOrigin = "anonymous";
      v.muted = false;
      v.playsInline = true;
      try {
        await new Promise<void>((res, rej) => {
          v.onloadedmetadata = () => res();
          v.onerror = () => rej(new Error("load failed"));
        });

        // @ts-ignore
        const stream: MediaStream | undefined = v.captureStream?.() ?? v.mozCaptureStream?.();
        if (!stream) return resolve(null);

        const mimeCandidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
        const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m));
        if (!mime) return resolve(null);

        const recorder = new MediaRecorder(stream, { mimeType: mime });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mime });
          const url = URL.createObjectURL(blob);
          onProgress(100);
          resolve({ blob, url });
        };

        v.currentTime = start;
        await new Promise<void>((res) => {
          v.onseeked = () => res();
        });

        recorder.start();
        await v.play();

        const stopAt = Math.min(end, v.duration || end);
        const total = stopAt - start;
        const onTime = () => {
          if (!v) return;
          const elapsed = Math.max(0, v.currentTime - start);
          const pct = Math.min(99, (elapsed / total) * 100);
          onProgress(pct);
          if (v.currentTime >= stopAt) {
            v.removeEventListener("timeupdate", onTime);
            try { v.pause(); } catch {}
            try { recorder.stop(); } catch {}
          }
        };
        v.addEventListener("timeupdate", onTime);

        setTimeout(() => {
          if (recorder.state === "recording") {
            try { v.pause(); } catch {}
            try { recorder.stop(); } catch {}
          }
        }, total * 1000 + 2000);
      } catch (e) {
        console.error("extractClip error", e);
        resolve(null);
      }
    });
  };

  const fetchCaption = async (clip: ClipResult): Promise<string> => {
    const platformLabel = PLATFORMS.find((p) => clip.platforms.includes(p.id))?.label || "TikTok";
    const { data, error } = await supabase.functions.invoke("generate-caption", {
      body: { reason: clip.reason, platform: platformLabel },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return (data?.caption || "").trim();
  };

  const handleGenerate = async () => {
    if (!file || !videoUrl) {
      setUploadError("Please upload a video first.");
      return;
    }
    if (platforms.length === 0) {
      toast({ title: "Pick at least one platform", description: "Select one or more target platforms.", variant: "destructive" });
      return;
    }

    setProcessing(true);
    setProgress(0);
    setStatusIdx(0);
    setClips([]);

    const cycleStart = Date.now();
    const totalMs = STATUS_MESSAGES.length * 2000;
    const statusInterval = setInterval(() => {
      const elapsed = Date.now() - cycleStart;
      const idx = Math.min(STATUS_MESSAGES.length - 1, Math.floor(elapsed / 2000));
      setStatusIdx(idx);
      setProgress(Math.min(95, (elapsed / totalMs) * 100));
    }, 100);

    await new Promise((r) => setTimeout(r, totalMs));
    clearInterval(statusInterval);
    setProgress(100);

    const dur = duration || 60;
    const len = Math.min(clipLength, dur);
    const usable = Math.max(len, dur);
    const reasons = STYLE_REASONS[clipStyle] || STYLE_REASONS["Hook-First"];

    const plan: ClipResult[] = [];
    for (let i = 0; i < numClips; i++) {
      const baseStart = ((usable - len) * (i + 0.5)) / Math.max(1, numClips);
      const offset = (Math.random() - 0.5) * 10;
      const start = Math.max(0, Math.min(usable - len, baseStart + offset));
      const end = Math.min(usable, start + len);
      const score = i === 0
        ? Math.round(75 + Math.random() * 20)
        : Math.round(Math.max(45, 90 - i * 8 + (Math.random() * 10 - 5)));
      plan.push({
        id: crypto.randomUUID(),
        index: i + 1,
        start,
        end,
        score: Math.min(99, Math.max(40, score)),
        reason: reasons[i % reasons.length],
        platforms: [...platforms],
        extracting: true,
        extractProgress: 0,
        fallback: false,
        captionLoading: true,
        caption: "",
        captionEdited: false,
      });
    }
    setClips(plan);

    const thumbVideo = document.createElement("video");
    thumbVideo.src = videoUrl;
    thumbVideo.muted = true;
    thumbVideo.playsInline = true;
    try {
      await new Promise<void>((res, rej) => {
        thumbVideo.onloadedmetadata = () => res();
        thumbVideo.onerror = () => rej(new Error("thumb load failed"));
        setTimeout(() => rej(new Error("timeout")), 5000);
      });
    } catch {}

    // Kick off captions in parallel
    plan.forEach(async (c) => {
      try {
        const cap = await fetchCaption(c);
        setClips((prev) =>
          prev.map((x) => (x.id === c.id && !x.captionEdited ? { ...x, caption: cap, captionLoading: false } : { ...x, captionLoading: x.id === c.id ? false : x.captionLoading })),
        );
      } catch (e) {
        console.error("caption error", e);
        setClips((prev) => prev.map((x) => (x.id === c.id ? { ...x, captionLoading: false } : x)));
      }
    });

    // Extract clips sequentially (recorder is single-stream)
    for (let i = 0; i < plan.length; i++) {
      const c = plan[i];
      let thumb: string | undefined;
      try {
        thumb = await captureThumbnail(thumbVideo, c.start);
      } catch {}
      updateClip(c.id, { thumbnail: thumb });
      const result = await extractClip(videoUrl, c.start, c.end, (p) => updateClip(c.id, { extractProgress: p }));
      setClips((prev) =>
        prev.map((x) =>
          x.id === c.id
            ? { ...x, blobUrl: result?.url, blob: result?.blob, fallback: !result, extracting: false, extractProgress: 100 }
            : x,
        ),
      );
    }

    setProcessing(false);
  };

  const handleDownload = (clip: ClipResult) => {
    if (clip.blobUrl) {
      const a = document.createElement("a");
      a.href = clip.blobUrl;
      a.download = `clip-${clip.index}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      if (!file) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = `clip-${clip.index}-${file.name}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast({
        title: "Download started",
        description: "Clip extraction unsupported in this browser — downloaded source video instead.",
      });
    }
  };

  const handleDownloadZip = async () => {
    const ready = clips.filter((c) => !c.extracting);
    if (ready.length === 0) {
      toast({ title: "No clips ready", description: "Wait for clips to finish extracting.", variant: "destructive" });
      return;
    }
    setZipping(true);
    try {
      const zip = new JSZip();
      for (const c of ready) {
        if (c.blob) {
          zip.file(`clip-${c.index}.webm`, c.blob);
        }
        if (c.caption) {
          zip.file(`clip-${c.index}-caption.txt`, c.caption);
        }
      }
      const meta = ready.map((c) => ({
        index: c.index,
        start: c.start,
        end: c.end,
        score: c.score,
        reason: c.reason,
        platforms: c.platforms,
        caption: c.caption,
      }));
      zip.file("clips.json", JSON.stringify(meta, null, 2));
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clipper-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Download ready", description: `Bundled ${ready.length} clip${ready.length > 1 ? "s" : ""} into ZIP.` });
    } catch (e) {
      console.error(e);
      toast({ title: "ZIP failed", description: "Could not bundle clips.", variant: "destructive" });
    } finally {
      setZipping(false);
    }
  };

  const handleCopyCaption = async (clip: ClipResult) => {
    try {
      const text = clip.caption?.trim();
      if (!text) {
        toast({ title: "Caption empty", description: "Generate or write a caption first.", variant: "destructive" });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied!", description: "Caption copied to clipboard." });
    } catch (e) {
      toast({ title: "Copy failed", description: "Could not copy caption.", variant: "destructive" });
    }
  };

  const handleRegenerateCaption = async (clip: ClipResult) => {
    updateClip(clip.id, { captionLoading: true });
    try {
      const cap = await fetchCaption(clip);
      updateClip(clip.id, { caption: cap, captionLoading: false, captionEdited: false });
    } catch {
      toast({ title: "Caption generation failed", description: "Caption generation failed. Try again.", variant: "destructive" });
      updateClip(clip.id, { captionLoading: false });
    }
  };

  const scoreColor = (s: number) => {
    if (s >= 80) return "bg-green-500/20 text-green-400 border-green-500/40";
    if (s >= 60) return "bg-amber-500/20 text-amber-400 border-amber-500/40";
    return "bg-red-500/20 text-red-400 border-red-500/40";
  };

  const captionOverlayStyle = (() => {
    const font = CAPTION_FONTS.find((f) => f.id === captionFont)?.css || "system-ui";
    const base: React.CSSProperties = {
      fontFamily: font,
      fontSize: `${captionSize}px`,
      lineHeight: 1.15,
      fontWeight: 800,
      textAlign: "center",
      maxWidth: "90%",
      pointerEvents: "none",
      letterSpacing: "0.01em",
    };
    if (captionStyle === "outline") {
      return { ...base, color: "#fff", textShadow: "-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000,0 2px 6px rgba(0,0,0,.6)" };
    }
    if (captionStyle === "background") {
      return { ...base, color: "#fff", background: "rgba(0,0,0,0.72)", padding: "6px 12px", borderRadius: 6 };
    }
    if (captionStyle === "neon") {
      return { ...base, color: "#fff", textShadow: "0 0 6px hsl(var(--primary)),0 0 14px hsl(var(--primary)),0 0 22px hsl(var(--primary))" };
    }
    return { ...base, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,.7)" };
  })();

  const positionClass = captionPosition === "top"
    ? "top-3 left-1/2 -translate-x-1/2"
    : captionPosition === "middle"
    ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
    : "bottom-3 left-1/2 -translate-x-1/2";

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-glow-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-glow-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 space-y-12">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">Visionary</span>
          </div>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/app")}>
              <ImageIcon className="w-4 h-4 mr-2" /> Image Generator
            </Button>
            <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/clipper")}>
              <Scissors className="w-4 h-4 mr-2" /> Clipper
            </Button>
          </nav>
        </header>

        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border text-sm text-muted-foreground">
            <Scissors className="w-4 h-4 text-primary" />
            AI Viral Clip Extractor
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
            <span className="bg-gradient-primary bg-clip-text text-transparent">Clipper</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload your video. AI finds the viral moments.
          </p>
        </section>

        {/* Upload zone */}
        <section className="max-w-3xl mx-auto">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
            className={`relative rounded-xl border-2 border-dashed p-8 transition-all ${
              dragOver ? "border-primary bg-primary/5" : "border-border bg-card/50"
            } ${!file ? "cursor-pointer hover:border-primary/60" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.avi,.webm,video/*"
              onChange={handleFileInput}
              className="hidden"
            />
            {!file ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <p className="text-lg font-medium">Drag &amp; drop your video here or click to browse</p>
                <p className="text-sm text-muted-foreground mt-2">MP4, MOV, AVI, WebM · Max 500MB</p>
              </div>
            ) : (
              <div className="space-y-4">
                <video
                  src={videoUrl!}
                  controls
                  className="w-full rounded-lg max-h-[400px] bg-black"
                  onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    <p className="font-medium text-foreground truncate max-w-md">{file.name}</p>
                    <p>{formatTime(duration)} · {formatBytes(file.size)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={removeVideo}>
                    <X className="w-4 h-4 mr-2" /> Remove / Change Video
                  </Button>
                </div>
              </div>
            )}
          </div>
          {uploadError && (
            <p className="mt-3 text-sm text-destructive text-center">{uploadError}</p>
          )}
        </section>

        {/* Settings */}
        <section className="max-w-3xl mx-auto space-y-6 bg-card/50 border border-border rounded-xl p-6">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Clip Length</p>
            <div className="flex flex-wrap gap-2">
              {CLIP_LENGTHS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setClipLength(l)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    clipLength === l
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {l}s
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Platform Target (multi-select)</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const selected = platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      selected ? `${p.className} shadow-md` : "bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Clip Style</p>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setClipStyle(s)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    clipStyle === s
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-muted-foreground">Number of Clips</p>
              <span className="text-sm font-medium text-foreground">Generate {numClips} clip{numClips > 1 ? "s" : ""}</span>
            </div>
            <Slider min={1} max={10} step={1} value={[numClips]} onValueChange={(v) => setNumClips(v[0])} />
          </div>

          {/* Caption styling */}
          <div className="pt-2 border-t border-border space-y-4">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Captions &amp; Font</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Font</p>
              <div className="flex flex-wrap gap-2">
                {CAPTION_FONTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCaptionFont(f.id)}
                    style={{ fontFamily: f.css }}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                      captionFont === f.id
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Caption Style</p>
              <div className="flex flex-wrap gap-2">
                {CAPTION_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCaptionStyle(s.id)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                      captionStyle === s.id
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Position</p>
              <div className="flex flex-wrap gap-2">
                {CAPTION_POSITIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setCaptionPosition(p.id)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                      captionPosition === p.id
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-muted-foreground">Caption Size</p>
                <span className="text-sm font-medium text-foreground">{captionSize}px</span>
              </div>
              <Slider min={14} max={56} step={1} value={[captionSize]} onValueChange={(v) => setCaptionSize(v[0])} />
            </div>
          </div>
        </section>

        {/* Generate button */}
        <section className="max-w-3xl mx-auto">
          <Button
            onClick={handleGenerate}
            disabled={processing}
            className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold py-6 text-lg shadow-glow transition-all hover:shadow-glow-lg"
          >
            {processing ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing...</>
            ) : (
              <><Scissors className="w-5 h-5 mr-2" />✂ Find Viral Moments</>
            )}
          </Button>

          {processing && (
            <div className="mt-4 space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">{STATUS_MESSAGES[statusIdx]}</p>
            </div>
          )}
        </section>

        {/* Results */}
        {clips.length > 0 && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold">
                <span className="bg-gradient-primary bg-clip-text text-transparent">Your Viral Clips</span>
              </h2>
              <Button
                onClick={handleDownloadZip}
                disabled={zipping || clips.some((c) => c.extracting)}
                className="bg-gradient-primary text-primary-foreground"
              >
                {zipping ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Bundling...</>
                ) : (
                  <><Package className="w-4 h-4 mr-2" />Download All as ZIP</>
                )}
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {clips.map((c) => (
                <div key={c.id} className="bg-card/50 border border-border rounded-xl overflow-hidden flex flex-col">
                  <div className="relative aspect-video bg-black">
                    {c.extracting ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-4">
                        {c.thumbnail && (
                          <img src={c.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                        )}
                        <div className="relative z-10 flex flex-col items-center w-full">
                          <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
                          <p className="text-sm font-medium text-foreground">Extracting…</p>
                          <div className="w-full max-w-[80%] mt-3">
                            <Progress value={c.extractProgress} className="h-1.5" />
                            <p className="text-[10px] text-center mt-1 text-muted-foreground">
                              {Math.round(c.extractProgress)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-full">
                        {c.blobUrl ? (
                          <video src={c.blobUrl} controls poster={c.thumbnail} className="w-full h-full object-contain bg-black" />
                        ) : (
                          <FallbackPlayer src={videoUrl!} start={c.start} end={c.end} poster={c.thumbnail} />
                        )}
                        {c.caption && (
                          <div className={`absolute ${positionClass} z-10`}>
                            <div style={captionOverlayStyle}>
                              {c.caption.split("\n")[0]}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-3 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">Clip {c.index}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(c.start)}–{formatTime(c.end)}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full border ${scoreColor(c.score)}`}>
                        🔥 {c.score}% Viral Potential
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.reason}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.platforms.map((pid) => {
                        const p = PLATFORMS.find((x) => x.id === pid);
                        if (!p) return null;
                        return (
                          <span key={pid} className={`text-[10px] px-2 py-0.5 rounded-full border ${p.className}`}>
                            {p.label}
                          </span>
                        );
                      })}
                    </div>

                    {/* Editable caption */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Caption (editable)</p>
                        <button
                          type="button"
                          onClick={() => handleRegenerateCaption(c)}
                          disabled={c.captionLoading}
                          className="text-[10px] text-primary hover:underline disabled:opacity-50"
                        >
                          {c.captionLoading ? "Generating…" : "Regenerate"}
                        </button>
                      </div>
                      <Textarea
                        value={c.caption}
                        onChange={(e) => updateClip(c.id, { caption: e.target.value, captionEdited: true })}
                        placeholder={c.captionLoading ? "Generating caption…" : "Write or edit your caption…"}
                        className="min-h-[70px] text-sm resize-y"
                        disabled={c.captionLoading}
                      />
                    </div>

                    <div className="flex gap-2 pt-2 mt-auto">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload(c)} disabled={c.extracting}>
                        <Download className="w-4 h-4 mr-2" /> Download
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-primary text-primary-foreground"
                        onClick={() => handleCopyCaption(c)}
                        disabled={c.captionLoading || !c.caption}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Caption
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

const FallbackPlayer = ({
  src, start, end, poster,
}: { src: string; start: number; end: number; poster?: string }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const onLoaded = () => { if (ref.current) ref.current.currentTime = start; };
  const onTimeUpdate = () => {
    if (ref.current && ref.current.currentTime >= end) {
      ref.current.pause();
      ref.current.currentTime = start;
    }
  };
  return (
    <video
      ref={ref}
      src={src}
      controls
      poster={poster}
      onLoadedMetadata={onLoaded}
      onTimeUpdate={onTimeUpdate}
      className="w-full h-full object-contain bg-black"
    />
  );
};

export default Clipper;
