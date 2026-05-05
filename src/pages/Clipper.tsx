import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Upload, Scissors, Download, Copy, X, Loader2, Image as ImageIcon, Type, Package, Check, FileText, Smartphone, Monitor, Tablet, Frame } from "lucide-react";
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

type RatioId = "9:16" | "16:9" | "3:4" | "fit";
const RATIOS: { id: RatioId; label: string; subtitle: string; w: number; h: number; tag: string; platforms: string }[] = [
  { id: "9:16", label: "9:16", subtitle: "Portrait — TikTok, Reels, Shorts, Snap", w: 36, h: 64, tag: "9x16", platforms: "TikTok, Instagram Reels, YouTube Shorts, Snapchat" },
  { id: "16:9", label: "16:9", subtitle: "Landscape — YouTube, Twitter, LinkedIn", w: 64, h: 36, tag: "16x9", platforms: "YouTube, Twitter, LinkedIn" },
  { id: "3:4", label: "3:4", subtitle: "Square-ish — Instagram Feed, Pinterest", w: 48, h: 64, tag: "3x4", platforms: "Instagram Feed, Pinterest" },
  { id: "fit", label: "Fit", subtitle: "Auto — Matches source video dimensions", w: 56, h: 56, tag: "fit", platforms: "Native source platforms" },
];

type DeviceId = "none" | "iphone" | "android" | "desktop" | "tablet";
const DEVICES: { id: DeviceId; label: string; icon?: any }[] = [
  { id: "none", label: "No Frame", icon: Frame },
  { id: "iphone", label: "iPhone", icon: Smartphone },
  { id: "android", label: "Android", icon: Smartphone },
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
];

type CropId =
  | "left top" | "center top" | "right top"
  | "left center" | "center center" | "right center"
  | "left bottom" | "center bottom" | "right bottom";
const CROPS: { id: CropId; arrow: string }[] = [
  { id: "left top", arrow: "↖" }, { id: "center top", arrow: "↑" }, { id: "right top", arrow: "↗" },
  { id: "left center", arrow: "←" }, { id: "center center", arrow: "✛" }, { id: "right center", arrow: "→" },
  { id: "left bottom", arrow: "↙" }, { id: "center bottom", arrow: "↓" }, { id: "right bottom", arrow: "↘" },
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
  extractProgress: number;
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
const formatTimeFile = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}m${sec.toString().padStart(2, "0")}s`;
};
const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  const [captionFont, setCaptionFont] = useState(CAPTION_FONTS[1].id);
  const [captionStyle, setCaptionStyle] = useState("background");
  const [captionPosition, setCaptionPosition] = useState("bottom");
  const [captionSize, setCaptionSize] = useState(28);

  // Frame & Format
  const [ratio, setRatio] = useState<RatioId>("9:16");
  const [device, setDevice] = useState<DeviceId>("none");
  const [crop, setCrop] = useState<CropId>("center center");

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [zipping, setZipping] = useState(false);

  const [clips, setClips] = useState<ClipResult[]>([]);

  // Per-clip flash states for buttons
  const [videoFlash, setVideoFlash] = useState<Record<string, boolean>>({});
  const [captionFlash, setCaptionFlash] = useState<Record<string, boolean>>({});
  const [captionDownloading, setCaptionDownloading] = useState<Record<string, boolean>>({});

  // Bulk download progress
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkDone, setBulkDone] = useState<number | null>(null);

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
    setBulkDone(null);

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

  const styleSlug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");
  const ratioTag = () => RATIOS.find((r) => r.id === ratio)?.tag || "fit";

  const buildVideoFilename = (clip: ClipResult) =>
    `clip-${clip.index}_${formatTimeFile(clip.start)}-${formatTimeFile(clip.end)}_${styleSlug(clipStyle)}_${ratioTag()}.mp4`;

  const buildCaptionFilename = (clip: ClipResult) => `clip-${clip.index}_caption.txt`;

  const buildCaptionText = (clip: ClipResult) => {
    const platformLabels = clip.platforms.map((pid) => PLATFORMS.find((p) => p.id === pid)?.label || pid).join(", ");
    const raw = (clip.caption || "").trim();
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    const hashtagLine = lines.find((l) => l.startsWith("#")) || "";
    const captionLine = lines.find((l) => !l.startsWith("#")) || raw.split("\n")[0] || "";
    const ratioInfo = RATIOS.find((r) => r.id === ratio)!;
    const deviceLabel = DEVICES.find((d) => d.id === device)?.label || "No Frame";
    return [
      captionLine,
      "",
      hashtagLine,
      "",
      `Platform targets: ${platformLabels}`,
      `Clip duration: ${Math.round(clip.end - clip.start)}s`,
      `Virality score: ${clip.score}%`,
      `Clip style: ${clipStyle}`,
      "",
      `Output format: ${ratioInfo.label} ${ratioInfo.subtitle.split("—")[0].trim()}`,
      `Device frame preview: ${deviceLabel}`,
      `Crop focus: ${crop.replace(/\b\w/g, (c) => c.toUpperCase())}`,
      `Recommended platforms: ${ratioInfo.platforms}`,
    ].join("\n");
  };

  const triggerDownload = (href: string, filename: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const flashVideo = (id: string) => {
    setVideoFlash((p) => ({ ...p, [id]: true }));
    setTimeout(() => setVideoFlash((p) => ({ ...p, [id]: false })), 1800);
  };
  const flashCaption = (id: string) => {
    setCaptionFlash((p) => ({ ...p, [id]: true }));
    setTimeout(() => setCaptionFlash((p) => ({ ...p, [id]: false })), 1800);
  };

  const downloadVideoFor = (clip: ClipResult) => {
    if (!clip.blobUrl) return false;
    const ext = (clip.blob?.type.includes("webm") ? "webm" : "mp4");
    const filename = buildVideoFilename(clip).replace(/\.mp4$/, `.${ext}`);
    triggerDownload(clip.blobUrl, filename);
    flashVideo(clip.id);
    return true;
  };

  const downloadCaptionFor = async (clip: ClipResult, silent = false) => {
    let caption = clip.caption;
    if (!caption) {
      setCaptionDownloading((p) => ({ ...p, [clip.id]: true }));
      try {
        caption = await fetchCaption(clip);
        updateClip(clip.id, { caption });
      } catch {
        if (!silent) toast({ title: "Caption generation failed", description: "Try again.", variant: "destructive" });
        setCaptionDownloading((p) => ({ ...p, [clip.id]: false }));
        return false;
      }
      setCaptionDownloading((p) => ({ ...p, [clip.id]: false }));
    }
    const text = buildCaptionText({ ...clip, caption });
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, buildCaptionFilename(clip));
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flashCaption(clip.id);
    return true;
  };

  const downloadAllForClip = async (clip: ClipResult) => {
    downloadVideoFor(clip);
    await sleep(400);
    await downloadCaptionFor(clip, true);
    toast({ title: `Clip ${clip.index} assets downloaded ✓`, description: "Video + caption saved." });
  };

  const downloadAllClips = async () => {
    const ready = clips.filter((c) => !c.extracting && c.blobUrl);
    if (ready.length === 0) {
      toast({ title: "No clips ready", description: "Wait for clips to finish extracting.", variant: "destructive" });
      return;
    }
    setBulkDone(null);
    setBulkProgress({ current: 0, total: ready.length });
    for (let i = 0; i < ready.length; i++) {
      setBulkProgress({ current: i + 1, total: ready.length });
      const c = ready[i];
      downloadVideoFor(c);
      await sleep(600);
      await downloadCaptionFor(c, true);
      if (i < ready.length - 1) await sleep(600);
    }
    setBulkProgress(null);
    setBulkDone(ready.length);
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
          const ext = c.blob.type.includes("webm") ? "webm" : "mp4";
          zip.file(buildVideoFilename(c).replace(/\.mp4$/, `.${ext}`), c.blob);
        }
        if (c.caption) {
          zip.file(buildCaptionFilename(c), buildCaptionText(c));
        }
      }
      const meta = ready.map((c) => ({
        index: c.index, start: c.start, end: c.end, score: c.score,
        reason: c.reason, platforms: c.platforms, caption: c.caption,
        ratio, device, crop,
      }));
      zip.file("clips.json", JSON.stringify(meta, null, 2));
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `clipper-${Date.now()}.zip`);
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
    } catch {
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
    if (captionStyle === "outline") return { ...base, color: "#fff", textShadow: "-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000,0 2px 6px rgba(0,0,0,.6)" };
    if (captionStyle === "background") return { ...base, color: "#fff", background: "rgba(0,0,0,0.72)", padding: "6px 12px", borderRadius: 6 };
    if (captionStyle === "neon") return { ...base, color: "#fff", textShadow: "0 0 6px hsl(var(--primary)),0 0 14px hsl(var(--primary)),0 0 22px hsl(var(--primary))" };
    return { ...base, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,.7)" };
  })();

  const positionClass = captionPosition === "top"
    ? "top-3 left-1/2 -translate-x-1/2"
    : captionPosition === "middle"
    ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
    : "bottom-3 left-1/2 -translate-x-1/2";

  const ratioCss: React.CSSProperties =
    ratio === "9:16" ? { aspectRatio: "9 / 16" } :
    ratio === "16:9" ? { aspectRatio: "16 / 9" } :
    ratio === "3:4" ? { aspectRatio: "3 / 4" } :
    {}; // fit = native

  const deviceLabel = DEVICES.find((d) => d.id === device)?.label || "No Frame";
  const ratioLabel = RATIOS.find((r) => r.id === ratio)?.label || "Fit";

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
            <input ref={fileInputRef} type="file" accept=".mp4,.mov,.avi,.webm,video/*" onChange={handleFileInput} className="hidden" />
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
                <video src={videoUrl!} controls className="w-full rounded-lg max-h-[400px] bg-black"
                  onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)} />
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
          {uploadError && <p className="mt-3 text-sm text-destructive text-center">{uploadError}</p>}
        </section>

        {/* Settings */}
        <section className="max-w-3xl mx-auto space-y-6 bg-card/50 border border-border rounded-xl p-6">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Clip Length</p>
            <div className="flex flex-wrap gap-2">
              {CLIP_LENGTHS.map((l) => (
                <button key={l} type="button" onClick={() => setClipLength(l)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${clipLength === l ? "bg-primary text-primary-foreground shadow-glow" : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
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
                  <button key={p.id} type="button" onClick={() => togglePlatform(p.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${selected ? `${p.className} shadow-md` : "bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary hover:text-foreground"}`}>
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
                <button key={s} type="button" onClick={() => setClipStyle(s)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${clipStyle === s ? "bg-primary text-primary-foreground shadow-glow" : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
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
                  <button key={f.id} type="button" onClick={() => setCaptionFont(f.id)} style={{ fontFamily: f.css }}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${captionFont === f.id ? "bg-primary text-primary-foreground shadow-glow" : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Caption Style</p>
              <div className="flex flex-wrap gap-2">
                {CAPTION_STYLES.map((s) => (
                  <button key={s.id} type="button" onClick={() => setCaptionStyle(s.id)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${captionStyle === s.id ? "bg-primary text-primary-foreground shadow-glow" : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Position</p>
              <div className="flex flex-wrap gap-2">
                {CAPTION_POSITIONS.map((p) => (
                  <button key={p.id} type="button" onClick={() => setCaptionPosition(p.id)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${captionPosition === p.id ? "bg-primary text-primary-foreground shadow-glow" : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
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

        {/* Frame & Format */}
        <section className="max-w-3xl mx-auto space-y-6 bg-card/50 border border-border rounded-xl p-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Frame className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Frame &amp; Format</p>
            </div>
            <p className="text-xs text-muted-foreground">Choose the aspect ratio and device preview for your clips</p>
          </div>

          {/* Ratio tiles */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Aspect Ratio</p>
            <div className="flex gap-3 overflow-x-auto sm:flex-wrap pb-2">
              {RATIOS.map((r) => {
                const selected = ratio === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRatio(r.id)}
                    className={`relative shrink-0 rounded-xl border p-3 text-left transition-all duration-200 ease-in-out w-[150px] ${
                      selected
                        ? "border-transparent bg-secondary/40 shadow-glow ring-2 ring-primary/70"
                        : "border-border bg-secondary/20 hover:bg-secondary/40"
                    }`}
                    style={{
                      backgroundImage: selected ? "linear-gradient(hsl(var(--card)), hsl(var(--card))), linear-gradient(135deg, hsl(var(--gradient-start)), hsl(var(--gradient-end)))" : undefined,
                      backgroundOrigin: selected ? "border-box" : undefined,
                      backgroundClip: selected ? "padding-box, border-box" : undefined,
                    }}
                  >
                    {selected && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                    <div className="flex items-center justify-center h-16 mb-2">
                      <div
                        className={`border-2 rounded ${selected ? "border-primary" : "border-muted-foreground/40"}`}
                        style={{ width: r.w, height: r.h }}
                      />
                    </div>
                    <p className="text-sm font-bold">{r.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{r.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Device frame pills */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Preview in Device Frame</p>
            <div className="flex gap-2 overflow-x-auto sm:flex-wrap pb-1">
              {DEVICES.map((d) => {
                const selected = device === d.id;
                const Icon = d.icon;
                return (
                  <button key={d.id} type="button" onClick={() => setDevice(d.id)}
                    className={`shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all duration-200 ease-in-out ${
                      selected ? "bg-primary text-primary-foreground shadow-glow" : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}>
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Crop position */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Crop Focus</p>
            <div className="inline-grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-secondary/30 border border-border">
              {CROPS.map((c) => {
                const selected = crop === c.id;
                return (
                  <button key={c.id} type="button" onClick={() => setCrop(c.id)} title={c.id}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md text-base flex items-center justify-center transition-all duration-200 ${
                      selected ? "bg-primary text-primary-foreground shadow-glow" : "bg-background/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}>
                    {c.arrow}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Generate button */}
        <section className="max-w-3xl mx-auto">
          <Button onClick={handleGenerate} disabled={processing}
            className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold py-6 text-lg shadow-glow transition-all hover:shadow-glow-lg">
            {processing ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing...</>) : (<><Scissors className="w-5 h-5 mr-2" />✂ Find Viral Moments</>)}
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
              <Button onClick={handleDownloadZip} disabled={zipping || clips.some((c) => c.extracting)}
                className="bg-gradient-primary text-primary-foreground">
                {zipping ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Bundling...</>) : (<><Package className="w-4 h-4 mr-2" />Download All as ZIP</>)}
              </Button>
            </div>

            {/* Bulk download row */}
            <div className="max-w-5xl mx-auto space-y-2">
              <Button onClick={downloadAllClips}
                disabled={!!bulkProgress || clips.some((c) => c.extracting)}
                className="w-full bg-gradient-primary text-primary-foreground py-5 shadow-glow hover:shadow-glow-lg transition-all">
                {bulkProgress ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Downloading clip {bulkProgress.current} of {bulkProgress.total}…</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" />⬇ Download All Clips + Captions</>
                )}
              </Button>
              {bulkProgress && (
                <p className="text-sm text-center text-muted-foreground">Downloading clip {bulkProgress.current} of {bulkProgress.total}…</p>
              )}
              {bulkDone !== null && !bulkProgress && (
                <div className="text-sm text-center text-primary font-medium border border-primary/40 bg-primary/10 rounded-md py-2 animate-fade-in">
                  All {bulkDone} clip{bulkDone > 1 ? "s" : ""} and caption{bulkDone > 1 ? "s" : ""} downloaded successfully ✓
                </div>
              )}
            </div>

            <div className={`grid md:grid-cols-2 ${clips.length >= 6 ? "lg:grid-cols-3" : ""} gap-6 max-w-5xl mx-auto`}>
              {clips.map((c) => (
                <div key={c.id} className="bg-card/50 border border-border rounded-xl overflow-hidden flex flex-col">
                  {/* Preview area with ratio + device frame */}
                  <div className="relative bg-black/40 p-3 flex items-center justify-center">
                    {/* Format badge */}
                    <span className="absolute top-2 left-2 z-20 text-[10px] font-medium px-2 py-1 rounded-full bg-background/80 border border-border backdrop-blur-sm">
                      {ratioLabel} · {deviceLabel}
                    </span>

                    <DeviceFrame device={device} className="w-full max-w-full transition-opacity duration-300">
                      <div
                        className="relative w-full bg-black overflow-hidden transition-[aspect-ratio] duration-300"
                        style={ratioCss}
                      >
                        {c.extracting ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-4">
                            {c.thumbnail && (
                              <img src={c.thumbnail} alt="" className="absolute inset-0 w-full h-full opacity-30"
                                style={{ objectFit: ratio === "fit" ? "contain" : "cover", objectPosition: crop }} />
                            )}
                            <div className="relative z-10 flex flex-col items-center w-full">
                              <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
                              <p className="text-sm font-medium text-foreground">Extracting…</p>
                              <div className="w-full max-w-[80%] mt-3">
                                <Progress value={c.extractProgress} className="h-1.5" />
                                <p className="text-[10px] text-center mt-1 text-muted-foreground">{Math.round(c.extractProgress)}%</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {c.blobUrl ? (
                              <video src={c.blobUrl} controls poster={c.thumbnail}
                                className="w-full h-full bg-black"
                                style={{ objectFit: ratio === "fit" ? "contain" : "cover", objectPosition: crop }} />
                            ) : (
                              <FallbackPlayer src={videoUrl!} start={c.start} end={c.end} poster={c.thumbnail}
                                fit={ratio === "fit" ? "contain" : "cover"} position={crop} />
                            )}
                            {c.caption && (
                              <div className={`absolute ${positionClass} z-10`}>
                                <div style={captionOverlayStyle}>{c.caption.split("\n")[0]}</div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </DeviceFrame>
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
                          <span key={pid} className={`text-[10px] px-2 py-0.5 rounded-full border ${p.className}`}>{p.label}</span>
                        );
                      })}
                    </div>

                    {/* Editable caption */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Caption (editable)</p>
                        <button type="button" onClick={() => handleRegenerateCaption(c)} disabled={c.captionLoading}
                          className="text-[10px] text-primary hover:underline disabled:opacity-50">
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

                    <div className="pt-2 mt-auto">
                      <Button size="sm" className="w-full bg-gradient-primary text-primary-foreground"
                        onClick={() => handleCopyCaption(c)} disabled={c.captionLoading || !c.caption}>
                        <Copy className="w-4 h-4 mr-2" /> Copy Caption
                      </Button>
                    </div>

                    {/* Download Panel */}
                    <div className="space-y-2 pt-3 border-t border-border">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className={`flex-1 transition-all ${videoFlash[c.id] ? "border-primary text-primary" : ""} ${c.extracting ? "animate-pulse" : ""}`}
                          onClick={() => downloadVideoFor(c)}
                          disabled={c.extracting || !c.blobUrl}
                        >
                          {videoFlash[c.id] ? (<><Check className="w-4 h-4 mr-2" />Saved!</>) :
                            c.extracting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Preparing…</>) :
                            (<><Download className="w-4 h-4 mr-2" />Download Video</>)}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`flex-1 transition-all ${captionFlash[c.id] ? "border-primary text-primary" : ""}`}
                          onClick={() => downloadCaptionFor(c)}
                          disabled={captionDownloading[c.id]}
                        >
                          {captionFlash[c.id] ? (<><Check className="w-4 h-4 mr-2" />Downloaded!</>) :
                            captionDownloading[c.id] ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>) :
                            (<><FileText className="w-4 h-4 mr-2" />Download Caption</>)}
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-secondary/70 hover:bg-secondary text-foreground border border-border"
                        onClick={() => downloadAllForClip(c)}
                        disabled={c.extracting || !c.blobUrl}
                      >
                        <Package className="w-4 h-4 mr-2" />⬇ Download All Assets for This Clip
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
  src, start, end, poster, fit = "contain", position = "center center",
}: { src: string; start: number; end: number; poster?: string; fit?: "contain" | "cover"; position?: string }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const onLoaded = () => { if (ref.current) ref.current.currentTime = start; };
  const onTimeUpdate = () => {
    if (ref.current && ref.current.currentTime >= end) {
      ref.current.pause();
      ref.current.currentTime = start;
    }
  };
  return (
    <video ref={ref} src={src} controls poster={poster} onLoadedMetadata={onLoaded} onTimeUpdate={onTimeUpdate}
      className="w-full h-full bg-black"
      style={{ objectFit: fit, objectPosition: position }} />
  );
};

const DeviceFrame = ({ device, children, className }: { device: DeviceId; children: React.ReactNode; className?: string }) => {
  if (device === "none") return <div className={className}>{children}</div>;
  if (device === "iphone") {
    return (
      <div className={`relative mx-auto bg-neutral-900 rounded-[2.2rem] p-2 shadow-2xl ${className}`} style={{ border: "1.5px solid #2a2a2a" }}>
        <div className="absolute right-[-3px] top-24 h-16 w-1 bg-neutral-700 rounded-r" />
        <div className="absolute left-[-3px] top-20 h-10 w-1 bg-neutral-700 rounded-l" />
        <div className="absolute left-[-3px] top-36 h-16 w-1 bg-neutral-700 rounded-l" />
        <div className="relative bg-black rounded-[1.7rem] overflow-hidden">
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-30 h-5 w-20 rounded-full bg-black border border-neutral-800" />
          {children}
        </div>
      </div>
    );
  }
  if (device === "android") {
    return (
      <div className={`relative mx-auto bg-neutral-950 rounded-[1.4rem] p-1.5 shadow-2xl ${className}`} style={{ border: "1.5px solid #1f1f1f" }}>
        <div className="relative bg-black rounded-[1.1rem] overflow-hidden">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 h-2.5 w-2.5 rounded-full bg-neutral-800 border border-neutral-700" />
          {children}
        </div>
      </div>
    );
  }
  if (device === "desktop") {
    return (
      <div className={`mx-auto ${className}`}>
        <div className="relative bg-neutral-900 rounded-t-lg p-2 pt-3 shadow-2xl border border-neutral-800">
          <div className="absolute top-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-neutral-700" />
          <div className="bg-black rounded overflow-hidden">{children}</div>
        </div>
        <div className="h-2 bg-neutral-800 rounded-b-xl mx-[-8px]" />
        <div className="h-1 bg-neutral-900 rounded-b mx-[-4px]" />
      </div>
    );
  }
  // tablet
  return (
    <div className={`relative mx-auto bg-slate-700 rounded-[1.2rem] p-2.5 shadow-2xl ${className}`}>
      <div className="relative bg-black rounded-[0.7rem] overflow-hidden">{children}</div>
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-12 rounded-full bg-slate-500" />
    </div>
  );
};

export default Clipper;
