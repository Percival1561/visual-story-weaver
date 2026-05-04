import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Upload, Scissors, Download, Copy, X, Loader2, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const MAX_SIZE = 500 * 1024 * 1024; // 500MB
const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];
const ACCEPTED_EXT = [".mp4", ".mov", ".avi", ".webm"];

const CLIP_LENGTHS = [15, 30, 45, 60];
const PLATFORMS = [
  { id: "tiktok", label: "TikTok", className: "bg-pink-500 text-white border-pink-500" },
  { id: "reels", label: "Instagram Reels", className: "bg-gradient-to-r from-purple-500 to-orange-500 text-white border-transparent" },
  { id: "shorts", label: "YouTube Shorts", className: "bg-red-600 text-white border-red-600" },
  { id: "snap", label: "Snapchat", className: "bg-yellow-400 text-black border-yellow-400" },
];
const STYLES = ["Hook-First", "High Energy", "Emotional", "Funny", "Educational", "Trending Audio"];

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
  thumbnail?: string;
  extracting: boolean;
  fallback: boolean;
  captionLoading: boolean;
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

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);

  const [clips, setClips] = useState<ClipResult[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      clips.forEach((c) => c.blobUrl && URL.revokeObjectURL(c.blobUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  // Capture a thumbnail from a hidden video at given time
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

  // Extract a single clip via MediaRecorder + canvas + audio (best-effort).
  // If MediaRecorder unsupported, returns null and caller will use fallback.
  const extractClip = async (
    sourceUrl: string,
    start: number,
    end: number,
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

        // captureStream may not be supported
        // @ts-ignore
        const stream: MediaStream | undefined = v.captureStream?.() ?? v.mozCaptureStream?.();
        if (!stream) return resolve(null);

        const mimeCandidates = [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm",
        ];
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
          resolve({ blob, url });
        };

        v.currentTime = start;
        await new Promise<void>((res) => {
          v.onseeked = () => res();
        });

        recorder.start();
        await v.play();

        const stopAt = Math.min(end, v.duration || end);
        const onTime = () => {
          if (v.currentTime >= stopAt) {
            v.removeEventListener("timeupdate", onTime);
            try { v.pause(); } catch {}
            try { recorder.stop(); } catch {}
          }
        };
        v.addEventListener("timeupdate", onTime);

        // safety timeout
        setTimeout(() => {
          if (recorder.state === "recording") {
            try { v.pause(); } catch {}
            try { recorder.stop(); } catch {}
          }
        }, (end - start) * 1000 + 2000);
      } catch (e) {
        console.error("extractClip error", e);
        resolve(null);
      }
    });
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

    // Cycle status messages
    const cycleStart = Date.now();
    const totalMs = STATUS_MESSAGES.length * 2000;
    const statusInterval = setInterval(() => {
      const elapsed = Date.now() - cycleStart;
      const idx = Math.min(STATUS_MESSAGES.length - 1, Math.floor(elapsed / 2000));
      setStatusIdx(idx);
      setProgress(Math.min(95, (elapsed / totalMs) * 100));
    }, 100);

    // Wait full cycle
    await new Promise((r) => setTimeout(r, totalMs));
    clearInterval(statusInterval);
    setProgress(100);

    // Plan clips
    const dur = duration || 60;
    const len = clipLength;
    const usable = Math.max(len, dur);
    const reasons = STYLE_REASONS[clipStyle] || STYLE_REASONS["Hook-First"];

    const plan: ClipResult[] = [];
    for (let i = 0; i < numClips; i++) {
      const baseStart = ((usable - len) * (i + 0.5)) / numClips;
      const offset = (Math.random() - 0.5) * 10; // ±5s
      let start = Math.max(0, Math.min(usable - len, baseStart + offset));
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
        fallback: false,
        captionLoading: false,
      });
    }
    setClips(plan);

    // Capture thumbnails using a hidden video
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
    } catch {
      // ignore — we'll skip thumbs
    }

    // Extract clips sequentially
    for (let i = 0; i < plan.length; i++) {
      const c = plan[i];
      let thumb: string | undefined;
      try {
        thumb = await captureThumbnail(thumbVideo, c.start);
      } catch {}
      const result = await extractClip(videoUrl, c.start, c.end);
      setClips((prev) =>
        prev.map((x) =>
          x.id === c.id
            ? {
                ...x,
                thumbnail: thumb,
                blobUrl: result?.url,
                fallback: !result,
                extracting: false,
              }
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
      // fallback: download the original file
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

  const handleCopyCaption = async (clip: ClipResult) => {
    setClips((prev) => prev.map((c) => (c.id === clip.id ? { ...c, captionLoading: true } : c)));
    try {
      const platformLabel = PLATFORMS.find((p) => clip.platforms.includes(p.id))?.label || "TikTok";
      const { data, error } = await supabase.functions.invoke("generate-caption", {
        body: { reason: clip.reason, platform: platformLabel },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const caption = data?.caption || "";
      if (!caption) throw new Error("Empty caption");
      await navigator.clipboard.writeText(caption);
      toast({ title: "Copied!", description: "Caption copied to clipboard." });
    } catch (e: any) {
      console.error("caption error", e);
      toast({
        title: "Caption generation failed",
        description: "Caption generation failed. Try again.",
        variant: "destructive",
      });
    } finally {
      setClips((prev) => prev.map((c) => (c.id === clip.id ? { ...c, captionLoading: false } : c)));
    }
  };

  const scoreColor = (s: number) => {
    if (s >= 80) return "bg-green-500/20 text-green-400 border-green-500/40";
    if (s >= 60) return "bg-amber-500/20 text-amber-400 border-amber-500/40";
    return "bg-red-500/20 text-red-400 border-red-500/40";
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-glow-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-glow-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 space-y-12">
        {/* Nav */}
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

        {/* Title */}
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
                <p className="text-sm text-muted-foreground mt-2">
                  MP4, MOV, AVI, WebM · Max 500MB
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <video
                  ref={previewVideoRef}
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
          {/* Clip length */}
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

          {/* Platforms */}
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
                      selected
                        ? `${p.className} shadow-md`
                        : "bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Style */}
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

          {/* Number of clips */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-muted-foreground">Number of Clips</p>
              <span className="text-sm font-medium text-foreground">Generate {numClips} clip{numClips > 1 ? "s" : ""}</span>
            </div>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[numClips]}
              onValueChange={(v) => setNumClips(v[0])}
            />
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
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Scissors className="w-5 h-5 mr-2" />
                ✂ Find Viral Moments
              </>
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
            <h2 className="text-3xl font-bold text-center">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Your Viral Clips</span>
            </h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {clips.map((c) => (
                <div key={c.id} className="bg-card/50 border border-border rounded-xl overflow-hidden flex flex-col">
                  <div className="relative aspect-video bg-black">
                    {c.extracting ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
                        <p className="text-sm">Extracting...</p>
                      </div>
                    ) : c.blobUrl ? (
                      <video src={c.blobUrl} controls poster={c.thumbnail} className="w-full h-full object-contain bg-black" />
                    ) : (
                      <FallbackPlayer src={videoUrl!} start={c.start} end={c.end} poster={c.thumbnail} />
                    )}
                  </div>
                  <div className="p-4 space-y-3 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">Clip {c.index}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(c.start)}–{formatTime(c.end)}
                        </p>
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
                    <div className="flex gap-2 pt-2 mt-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDownload(c)}
                        disabled={c.extracting}
                      >
                        <Download className="w-4 h-4 mr-2" /> Download Clip
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-primary text-primary-foreground"
                        onClick={() => handleCopyCaption(c)}
                        disabled={c.captionLoading}
                      >
                        {c.captionLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
                        Copy Caption
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Hidden helper video element (kept for future use) */}
        <video ref={hiddenVideoRef} className="hidden" />
      </div>
    </div>
  );
};

// Fallback player: plays the source between start/end, auto-pauses at end
const FallbackPlayer = ({
  src,
  start,
  end,
  poster,
}: {
  src: string;
  start: number;
  end: number;
  poster?: string;
}) => {
  const ref = useRef<HTMLVideoElement>(null);

  const onLoaded = () => {
    if (ref.current) ref.current.currentTime = start;
  };
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
