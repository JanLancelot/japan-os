"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface SubtitleCue {
  id: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
}

export function VideoPlayerDashboard() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const syncTheme = () => {
      setTheme(localStorage.getItem("japanos-global-theme") || "dark");
    };
    syncTheme();
    window.addEventListener("japanos-theme-change", syncTheme);
    window.addEventListener("storage", syncTheme);
    return () => {
      window.removeEventListener("japanos-theme-change", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  const getThemeContainerClass = () => {
    switch (theme) {
      case "light": return "bg-zinc-50 text-zinc-800";
      case "sepia": return "bg-[#fcf8ed] text-[#433422]";
      case "dark": return "bg-zinc-950 text-zinc-100";
      case "midnight":
      default:
        return "bg-black text-slate-100";
    }
  };

  const getThemeCardClass = () => {
    switch (theme) {
      case "light": return "bg-white border-zinc-200/80 text-zinc-800 shadow-md";
      case "sepia": return "bg-[#f5ebd6] border-[#e4d6b5] text-[#4a3621] shadow-md";
      case "dark": return "bg-zinc-900/40 border-zinc-800/40 text-zinc-200";
      case "midnight":
      default:
        return "bg-neutral-900/15 border-neutral-900 text-slate-200";
    }
  };

  const getThemeControlClass = () => {
    switch (theme) {
      case "light": return "bg-zinc-100 border-zinc-250 text-zinc-750 hover:bg-zinc-200 hover:text-zinc-900";
      case "sepia": return "bg-[#ebdec2] border-[#d7c6a0] text-[#4a3621] hover:bg-[#decfae] hover:text-[#2d2011]";
      case "dark": return "bg-zinc-900 border-zinc-800 text-neutral-300 hover:bg-zinc-850 hover:text-white";
      case "midnight":
      default:
        return "bg-neutral-950 border-neutral-900 text-neutral-300 hover:bg-neutral-900/50 hover:text-white";
    }
  };
  
  // Media states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState<number>(-1);

  // Audio/Subtitle Track list states
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [activeAudioTrackIndex, setActiveAudioTrackIndex] = useState<number>(0);
  const [textTracks, setTextTracks] = useState<any[]>([]);
  const [activeTextTrackIndex, setActiveTextTrackIndex] = useState<number>(-1);
  
  // Video playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  // Custom learning states
  const [subtitleOffset, setSubtitleOffset] = useState(0); // in seconds
  const [pauseOnHover, setPauseOnHover] = useState(true);
  const [autoCopyToClipboard, setAutoCopyToClipboard] = useState(false);
  const [fontSize, setFontSize] = useState(24); // px
  const [fontFamily, setFontFamily] = useState<"serif" | "sans">("serif");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wasPlayingBeforeHoverRef = useRef(false);
  const lastCopiedIdRef = useRef<string | null>(null);
  const isDraggingVideoRef = useRef(false);
  const isDraggingSubsRef = useRef(false);
  const [isDragOverVideo, setIsDragOverVideo] = useState(false);
  const [isDragOverSubs, setIsDragOverSubs] = useState(false);

  // Auto-hide controls state
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls effect
  useEffect(() => {
    if (!videoUrl) return;

    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (isPlaying) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [videoUrl, isPlaying]);

  // Global drag-and-drop states
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDraggingGlobal(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDraggingGlobal(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingGlobal(false);
      dragCounterRef.current = 0;

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith("video/")) {
            handleVideoFileChange(file);
          } else if (file.name.endsWith(".srt") || file.name.endsWith(".vtt")) {
            handleSubtitleFileChange(file);
          }
        }
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [videoUrl]);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Format time (seconds -> HH:MM:SS or MM:SS)
  const formatTime = (timeInSecs: number) => {
    if (isNaN(timeInSecs)) return "00:00";
    const hours = Math.floor(timeInSecs / 3600);
    const mins = Math.floor((timeInSecs % 3600) / 60);
    const secs = Math.floor(timeInSecs % 60);
    
    const minStr = mins.toString().padStart(2, "0");
    const secStr = secs.toString().padStart(2, "0");
    
    if (hours > 0) {
      const hourStr = hours.toString().padStart(2, "0");
      return `${hourStr}:${minStr}:${secStr}`;
    }
    return `${minStr}:${secStr}`;
  };

  // Subtitle Parser (SRT and VTT)
  const parseSubtitles = (content: string): SubtitleCue[] => {
    const normalized = content.replace(/\r\n/g, "\n");
    const cues: SubtitleCue[] = [];
    
    // Split by double newline to separate blocks
    const blocks = normalized.split(/\n\s*\n/);
    
    for (const block of blocks) {
      const lines = block.trim().split("\n");
      if (lines.length < 2) continue;
      
      if (lines[0].startsWith("WEBVTT")) {
        continue;
      }
      
      let timeLineIndex = 0;
      if (/^\d+$/.test(lines[0])) {
        timeLineIndex = 1;
      }
      
      if (timeLineIndex >= lines.length) continue;
      
      const timeLine = lines[timeLineIndex];
      const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[.,]\d{3}|\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3}|\d{2}:\d{2}[.,]\d{3})/);
      
      if (timeMatch) {
        const startTime = parseTimeToSeconds(timeMatch[1]);
        const endTime = parseTimeToSeconds(timeMatch[2]);
        
        const textLines = lines.slice(timeLineIndex + 1);
        const rawText = textLines.join("\n");
        // Strip out basic HTML formatting tags to make clean Japanese text for hover dictionary lookups
        const cleanText = rawText.replace(/<\/?[^>]+(>|$)/g, "").trim();
        
        if (cleanText) {
          cues.push({
            id: lines[0] || String(cues.length),
            startTime,
            endTime,
            text: cleanText,
          });
        }
      }
    }
    
    return cues.sort((a, b) => a.startTime - b.startTime);
  };

  const parseTimeToSeconds = (timeStr: string): number => {
    const parts = timeStr.replace(",", ".").split(":");
    let secs = 0;
    
    if (parts.length === 3) {
      const hours = parseInt(parts[0], 10);
      const mins = parseInt(parts[1], 10);
      const seconds = parseFloat(parts[2]);
      secs = hours * 3600 + mins * 60 + seconds;
    } else if (parts.length === 2) {
      const mins = parseInt(parts[0], 10);
      const seconds = parseFloat(parts[1]);
      secs = mins * 60 + seconds;
    }
    
    return secs;
  };

  // Handle Video file load
  const handleVideoFileChange = (file: File) => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentSubtitleIndex(-1);
    setAudioTracks([]);
    setActiveAudioTrackIndex(0);
    setTextTracks([]);
    setActiveTextTrackIndex(-1);
  };

  // Handle Subtitle file load
  const handleSubtitleFileChange = (file: File) => {
    setSubtitleFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const cues = parseSubtitles(text);
        setSubtitles(cues);
        setCurrentSubtitleIndex(-1);
      }
    };
    reader.readAsText(file);
  };

  // Monitor video playback time update
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Find active subtitle cue matching the current time (considering offset)
    const index = subtitles.findIndex((cue) => {
      const adjustedStart = cue.startTime + subtitleOffset;
      const adjustedEnd = cue.endTime + subtitleOffset;
      return time >= adjustedStart && time <= adjustedEnd;
    });
    
    setCurrentSubtitleIndex(index);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      
      // Load built-in text tracks
      const tracks: any[] = [];
      const vTextTracks = videoRef.current.textTracks;
      for (let i = 0; i < vTextTracks.length; i++) {
        const t = vTextTracks[i];
        tracks.push({
          index: i,
          label: t.label || `Track ${i + 1} (${t.language || "Unknown"})`,
          language: t.language,
          kind: t.kind,
        });
      }
      setTextTracks(tracks);
      
      // Load built-in audio tracks
      const vAudioTracks = (videoRef.current as any).audioTracks;
      if (vAudioTracks) {
        const aTracks: any[] = [];
        for (let i = 0; i < vAudioTracks.length; i++) {
          const t = vAudioTracks[i];
          if (t.enabled) setActiveAudioTrackIndex(i);
          aTracks.push({
            index: i,
            label: t.label || `Audio ${i + 1} (${t.language || "Unknown"})`,
            language: t.language,
            enabled: t.enabled,
          });
        }
        setAudioTracks(aTracks);
      }
    }
  };

  const selectTextTrack = (index: number) => {
    if (!videoRef.current) return;
    const tracks = videoRef.current.textTracks;
    
    // Disable all tracks first
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = "disabled";
    }
    
    if (index === -1) {
      setActiveTextTrackIndex(-1);
      // Restore external or demo subtitles
      if (subtitleFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          if (text) {
            const cues = parseSubtitles(text);
            setSubtitles(cues);
          }
        };
        reader.readAsText(subtitleFile);
      } else {
        setSubtitles([]);
      }
      return;
    }
    
    const activeTrack = tracks[index];
    activeTrack.mode = "hidden"; // Hide native display
    setActiveTextTrackIndex(index);
    
    const extractCues = () => {
      const trackCues = activeTrack.cues;
      if (trackCues) {
        const parsedCues: SubtitleCue[] = [];
        for (let i = 0; i < trackCues.length; i++) {
          const cue = trackCues[i] as any;
          parsedCues.push({
            id: cue.id || String(i),
            startTime: cue.startTime,
            endTime: cue.endTime,
            text: cue.text || "",
          });
        }
        setSubtitles(parsedCues);
        setCurrentSubtitleIndex(-1);
      }
    };
    
    if (activeTrack.cues && activeTrack.cues.length > 0) {
      extractCues();
    } else {
      let attempts = 0;
      const checkCues = setInterval(() => {
        attempts++;
        if (activeTrack.cues && activeTrack.cues.length > 0) {
          extractCues();
          clearInterval(checkCues);
        } else if (attempts > 30) {
          clearInterval(checkCues);
        }
      }, 100);
    }
  };

  const selectAudioTrack = (index: number) => {
    if (!videoRef.current) return;
    const tracks = (videoRef.current as any).audioTracks;
    if (!tracks) return;
    
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].enabled = i === index;
    }
    setActiveAudioTrackIndex(index);
  };

  // Sync volume with HTMLVideoElement
  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  // Play / Pause toggler
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch((err) => console.error(err));
      setIsPlaying(true);
    }
  };

  // Seek helper
  const handleScrubberChange = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // Keyboard controls
  const seekBy = (seconds: number) => {
    if (!videoRef.current) return;
    const nextTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const adjustVolume = (delta: number) => {
    const nextVolume = Math.max(0, Math.min(1, volume + delta));
    handleVolumeChange(nextVolume);
  };

  const replayCurrentLine = () => {
    if (!videoRef.current || subtitles.length === 0) return;
    
    let cue: SubtitleCue | undefined = subtitles[currentSubtitleIndex];
    if (!cue) {
      const time = videoRef.current.currentTime;
      // Fallback: Find the nearest completed subtitle or the next subtitle
      cue = subtitles.find(c => time >= c.startTime + subtitleOffset && time <= c.endTime + subtitleOffset)
        || [...subtitles].reverse().find(c => time >= c.startTime + subtitleOffset);
    }
    
    if (cue) {
      videoRef.current.currentTime = cue.startTime + subtitleOffset;
      if (videoRef.current.paused) {
        videoRef.current.play().catch((err) => console.error(err));
        setIsPlaying(true);
      }
    }
  };

  const jumpToSubtitle = (direction: number) => {
    if (!videoRef.current || subtitles.length === 0) return;
    
    const time = videoRef.current.currentTime;
    let targetIndex = -1;
    
    if (direction === -1) {
      if (currentSubtitleIndex > 0) {
        targetIndex = currentSubtitleIndex - 1;
      } else {
        const index = [...subtitles].reverse().findIndex(c => c.endTime + subtitleOffset < time);
        if (index !== -1) {
          targetIndex = subtitles.length - 1 - index;
        }
      }
    } else {
      if (currentSubtitleIndex !== -1 && currentSubtitleIndex < subtitles.length - 1) {
        targetIndex = currentSubtitleIndex + 1;
      } else {
        targetIndex = subtitles.findIndex(c => c.startTime + subtitleOffset > time);
      }
    }
    
    if (targetIndex !== -1 && subtitles[targetIndex]) {
      videoRef.current.currentTime = subtitles[targetIndex].startTime + subtitleOffset;
      if (videoRef.current.paused) {
        videoRef.current.play().catch((err) => console.error(err));
        setIsPlaying(true);
      }
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when typing in search bars/input fields
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      
      if (!videoUrl) return;

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowleft":
          e.preventDefault();
          seekBy(-5);
          break;
        case "arrowright":
          e.preventDefault();
          seekBy(5);
          break;
        case "arrowup":
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case "arrowdown":
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case "r":
          e.preventDefault();
          replayCurrentLine();
          break;
        case "s":
          e.preventDefault();
          jumpToSubtitle(-1);
          break;
        case "d":
          e.preventDefault();
          jumpToSubtitle(1);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [videoUrl, subtitles, currentSubtitleIndex, subtitleOffset, volume, duration]);

  // Handle Pause on Hover
  const handleSubtitlesMouseEnter = () => {
    if (pauseOnHover && videoRef.current && !videoRef.current.paused) {
      wasPlayingBeforeHoverRef.current = true;
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSubtitlesMouseLeave = () => {
    const selection = window.getSelection();
    // If text is highlighted (meaning a dictionary lookup is occurring), don't auto-resume!
    const hasSelection = selection && selection.toString().trim().length > 0;
    
    if (pauseOnHover && videoRef.current && wasPlayingBeforeHoverRef.current && !hasSelection) {
      videoRef.current.play().catch((err) => console.error(err));
      setIsPlaying(true);
      wasPlayingBeforeHoverRef.current = false;
    }
  };

  // Auto Clipboard copy on active cue change
  const activeCue = currentSubtitleIndex !== -1 ? subtitles[currentSubtitleIndex] : null;
  useEffect(() => {
    if (activeCue && autoCopyToClipboard && lastCopiedIdRef.current !== activeCue.id) {
      navigator.clipboard.writeText(activeCue.text).catch((err) => {
        console.error("Failed to copy subtitle line:", err);
      });
      lastCopiedIdRef.current = activeCue.id;
    }
    if (!activeCue) {
      lastCopiedIdRef.current = null;
    }
  }, [activeCue, autoCopyToClipboard]);

  // Auto Scroll the active line in sidebar list
  useEffect(() => {
    if (currentSubtitleIndex !== -1 && listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${currentSubtitleIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [currentSubtitleIndex]);

  // Toggle Fullscreen on player container
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Fullscreen failed:", err);
      });
    }
  };

  // Filter subtitles based on search query
  const filteredSubtitles = subtitles.filter((cue) =>
    cue.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Return Loading indicator if not mounted
  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black text-neutral-400 min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-blue-500 border-neutral-800 animate-spin" />
          <span className="text-xs font-mono">Loading Immersion Player...</span>
        </div>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className={`flex-1 flex flex-col h-screen w-screen overflow-hidden font-sans select-none relative transition-colors duration-500 ${getThemeContainerClass()}`}>
        {/* Background ambient lighting */}
        <div className="absolute top-[-20%] left-[-15%] w-[60%] h-[50%] rounded-full bg-blue-900/5 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full bg-indigo-900/5 blur-[160px] pointer-events-none" />

        {/* Main Workspace for upload */}
        <div className="flex-1 flex overflow-hidden relative pt-12">
          <div className="flex-1 flex flex-col p-6 overflow-y-auto min-w-0 relative gap-6">
            <div className="flex-1 flex flex-col justify-center items-center max-w-xl w-full mx-auto gap-6 py-10 z-10">

              <div className="text-center mb-2">
                <h2 className="text-2xl font-bold tracking-tight">Load Immersion Media</h2>
                <p className="text-xs opacity-60 mt-2">
                  Drop your video and subtitle files below to get started.
                </p>
              </div>

              {/* Unified Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOverVideo(true); }}
                onDragLeave={() => setIsDragOverVideo(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOverVideo(false);
                  const files = e.dataTransfer.files;
                  for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (file.type.startsWith("video/")) handleVideoFileChange(file);
                    else if (file.name.endsWith(".srt") || file.name.endsWith(".vtt")) handleSubtitleFileChange(file);
                  }
                }}
                className={`border border-dashed rounded-3xl p-10 text-center backdrop-blur-sm relative overflow-hidden transition duration-350 flex flex-col justify-center items-center w-full gap-5 ${getThemeCardClass()} ${
                  isDragOverVideo
                    ? "border-blue-500 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                    : "hover:border-neutral-700"
                }`}
              >
                {/* Hidden file inputs */}
                <input
                  id="video-file-input"
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFileChange(f); }}
                />
                <input
                  id="subtitle-file-input"
                  type="file"
                  accept=".srt,.vtt"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSubtitleFileChange(f); }}
                />

                {/* Upload icon */}
                <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition ${isDragOverVideo ? "bg-blue-950/40 border-blue-800 text-blue-400" : getThemeControlClass()}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>

                <div>
                  <p className="text-sm font-semibold">Drop files here</p>
                  <p className="text-[11px] opacity-70 mt-1">or browse for video and subtitle files separately</p>
                </div>

                {/* Browse buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => document.getElementById("video-file-input")?.click()}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      videoFile
                        ? "bg-blue-950/40 border-blue-800/60 text-blue-300"
                        : getThemeControlClass()
                    }`}
                  >
                    {videoFile ? (
                      <span className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        {videoFile.name.length > 22 ? videoFile.name.slice(0, 22) + "…" : videoFile.name}
                      </span>
                    ) : "📹 Choose Video"}
                  </button>
                  <button
                    onClick={() => document.getElementById("subtitle-file-input")?.click()}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      subtitleFile
                        ? "bg-indigo-950/40 border-indigo-800/60 text-indigo-300"
                        : getThemeControlClass()
                    }`}
                  >
                    {subtitleFile ? (
                      <span className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        {subtitleFile.name.length > 22 ? subtitleFile.name.slice(0, 22) + "…" : subtitleFile.name}
                      </span>
                    ) : "💬 Choose Subtitles"}
                  </button>
                </div>

                <p className="text-[10px] text-neutral-600 font-mono">MP4 · WebM · MKV · SRT · VTT</p>
              </div>

            </div>
          </div>
        </div>

        {/* Global Drag-and-drop Overlay */}
        {isDraggingGlobal && (
          <div className="absolute inset-0 z-[10000] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md border-2 border-dashed border-blue-500/50 m-4 rounded-3xl animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-blue-950/40 border border-blue-900/30 flex items-center justify-center text-blue-400 mb-4 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">Drop Video or Subtitle File Here</h2>
            <p className="text-xs text-neutral-400 mt-2 font-mono">Supports MP4, MKV, WebM, SRT, VTT</p>
          </div>
        )}
      </div>
    );
  }

  // Otherwise, render full screen, immersive 100% video player layout!
  return (
    <div
      ref={containerRef}
      className={`relative w-screen h-screen overflow-hidden font-sans select-none transition-colors duration-500 ${getThemeContainerClass()}`}
    >
      {/* 100% Viewport Video Element Container */}
      <div className="absolute inset-0 w-full h-full z-0 bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onClick={togglePlay}
          className="w-full h-full object-contain"
        />

        {/* Subtitle Overlay (centered on top of the video player) */}
        {activeCue && (
          <div
            onMouseEnter={handleSubtitlesMouseEnter}
            onMouseLeave={handleSubtitlesMouseLeave}
            className={`absolute left-1/2 -translate-x-1/2 w-full max-w-[85%] text-center px-4 py-2 pointer-events-auto select-text z-20 transition-all duration-500 ease-in-out ${
              showControls ? "bottom-[35%] md:bottom-[32%]" : "bottom-[8%]"
            }`}
          >
            <div
              style={{
                fontSize: `${fontSize}px`,
              }}
              className={`inline-block px-5 py-2.5 rounded-2xl bg-black/75 backdrop-blur-sm border border-neutral-900/40 text-white shadow-xl max-w-full leading-normal break-words cursor-text transition-all duration-200 select-text ${
                fontFamily === "serif" ? "font-serif" : "font-sans"
              }`}
            >
              {activeCue.text}
            </div>
          </div>
        )}
      </div>


      {/* Floating Cinematic Controls Bar Overlay (auto-hides on inactivity, centers in remaining space when sidebar is open) */}
      <div
        style={{
          transform: `translateX(-50%) translateY(${showControls ? "0px" : "32px"})`,
          left: isSidebarOpen ? "calc(50% - 190px)" : "50%",
        }}
        className={`absolute bottom-6 w-[90%] max-w-4xl border backdrop-blur-md rounded-3xl p-5 flex flex-col gap-4 z-30 transition-all duration-500 ease-in-out shadow-2xl ${getThemeCardClass()} ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Timeline Progress Slider */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-neutral-400 select-none min-w-[36px]">
            {formatTime(currentTime)}
          </span>
          
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.05"
            value={currentTime}
            onChange={(e) => handleScrubberChange(parseFloat(e.target.value))}
            className="flex-1 accent-blue-500 h-1 rounded-lg bg-neutral-800 hover:h-1.5 transition-all cursor-pointer"
          />
          
          <span className="text-[10px] font-mono text-neutral-400 select-none min-w-[36px]">
            {formatTime(duration)}
          </span>
        </div>

        {/* Control Actions Row */}
        <div className="flex items-center justify-between flex-wrap gap-4 select-none">
          
          {/* Left Group: Play/Pause/Replay/Navigation */}
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white flex items-center justify-center hover:bg-neutral-850 active:scale-95 transition cursor-pointer"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                  <rect x="14" y="4" width="4" height="16" rx="1"></rect>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              )}
            </button>

            {/* Replay current line */}
            <button
              onClick={replayCurrentLine}
              disabled={subtitles.length === 0}
              className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-350 hover:text-white flex items-center justify-center hover:bg-neutral-850 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition cursor-pointer"
              title="Replay Line (R)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
            </button>

            {/* Prev subtitle line */}
            <button
              onClick={() => jumpToSubtitle(-1)}
              disabled={subtitles.length === 0}
              className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-350 hover:text-white flex items-center justify-center hover:bg-neutral-850 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition cursor-pointer"
              title="Previous Line (S)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 19 2 12 11 5 11 19"></polygon>
                <polygon points="22 19 13 12 22 5 22 19"></polygon>
              </svg>
            </button>

            {/* Next subtitle line */}
            <button
              onClick={() => jumpToSubtitle(1)}
              disabled={subtitles.length === 0}
              className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-350 hover:text-white flex items-center justify-center hover:bg-neutral-850 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition cursor-pointer"
              title="Next Line (D)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 19 22 12 13 5 13 19"></polygon>
                <polygon points="2 19 11 12 2 5 2 19"></polygon>
              </svg>
            </button>

            <div className="h-6 w-px bg-neutral-900 mx-1.5" />

            {/* Volume Mute & Slider */}
            <div className="flex items-center gap-1.5 group/volume">
              <button
                onClick={handleToggleMute}
                className="w-8 h-8 rounded-lg text-neutral-400 hover:text-white flex items-center justify-center hover:bg-neutral-900 transition cursor-pointer"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <path d="M9 9v6a3 3 0 0 0 3 3h1.586l4.707 4.707A1 1 0 0 0 20 22V4a1 1 0 0 0-1.707-.707L13.586 8H12a3 3 0 0 0-3 3z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 accent-neutral-250 h-1 bg-neutral-800 rounded-lg cursor-pointer opacity-40 group-hover/volume:opacity-100 transition-opacity"
              />
            </div>
          </div>

          {/* Right Group: Subtitle offset, Speed, Fullscreen, Sidebar */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-neutral-400">
            
            {/* Subtitle Offset Adjustment */}
            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1">
              <span className="text-[10px] font-mono text-neutral-500 pr-1 select-none">Offset</span>
              <button
                onClick={() => setSubtitleOffset(prev => prev - 0.5)}
                className="px-1 py-0.5 rounded hover:bg-neutral-800 hover:text-white transition cursor-pointer"
                title="Subtitles 0.5s earlier"
              >
                -0.5s
              </button>
              <span className="font-mono font-semibold text-neutral-200 px-1 text-[11px] min-w-[36px] text-center">
                {subtitleOffset >= 0 ? `+${subtitleOffset.toFixed(1)}s` : `${subtitleOffset.toFixed(1)}s`}
              </span>
              <button
                onClick={() => setSubtitleOffset(prev => prev + 0.5)}
                className="px-1 py-0.5 rounded hover:bg-neutral-800 hover:text-white transition cursor-pointer"
                title="Subtitles 0.5s later"
              >
                +0.5s
              </button>
              {subtitleOffset !== 0 && (
                <button
                  onClick={() => setSubtitleOffset(0)}
                  className="pl-1 text-red-400 hover:text-red-300 transition cursor-pointer"
                  title="Reset offset"
                >
                  ×
                </button>
              )}
            </div>

            {/* Audio Track selection */}
            {audioTracks.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-neutral-500 uppercase select-none">Audio</span>
                <select
                  value={activeAudioTrackIndex}
                  onChange={(e) => {
                    selectAudioTrack(parseInt(e.target.value, 10));
                  }}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-2 py-1 text-xs text-neutral-200 font-semibold cursor-pointer outline-none focus:border-neutral-700"
                >
                  {audioTracks.map((track) => (
                    <option key={track.index} value={track.index} className="bg-neutral-950">
                      {track.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Subtitle Track selection */}
            {textTracks.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-neutral-500 uppercase select-none">Subs</span>
                <select
                  value={activeTextTrackIndex}
                  onChange={(e) => {
                    selectTextTrack(parseInt(e.target.value, 10));
                  }}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-2 py-1 text-xs text-neutral-200 font-semibold cursor-pointer outline-none focus:border-neutral-700"
                >
                  <option value="-1" className="bg-neutral-950">External / Demo</option>
                  {textTracks.map((track) => (
                    <option key={track.index} value={track.index} className="bg-neutral-950">
                      {track.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Speed selection */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase select-none">Speed</span>
              <select
                value={playbackRate}
                onChange={(e) => {
                  const rate = parseFloat(e.target.value);
                  setPlaybackRate(rate);
                  if (videoRef.current) videoRef.current.playbackRate = rate;
                }}
                className="bg-neutral-900 border border-neutral-800 rounded-xl px-2 py-1 text-xs text-neutral-200 font-semibold cursor-pointer outline-none focus:border-neutral-700"
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                  <option key={r} value={r} className="bg-neutral-950">
                    {r === 1 ? "1.0x (Normal)" : `${r}x`}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-6 w-px bg-neutral-900" />

            {/* Toggle Sidebar */}
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className={`p-1.5 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                isSidebarOpen ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
              title={isSidebarOpen ? "Close Script Sidebar" : "Open Script Sidebar"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
            </button>

            {/* Fullscreen */}
            <button
              onClick={handleToggleFullscreen}
              className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Fullscreen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
              </svg>
            </button>

          </div>
        </div>

        {/* Subtitle Options Toolbar */}
        <div className="h-px bg-neutral-900/60" />
        <div className="flex flex-wrap items-center justify-between gap-4 select-none text-[11px] text-neutral-450">
          <div className="flex items-center gap-5">
            {/* Swap Media Buttons */}
            <div className="flex items-center gap-2">
              <label className="px-2.5 py-1 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 hover:border-neutral-750 text-[10px] font-semibold text-neutral-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFileChange(f); }}
                  className="hidden"
                />
                Swap Video
              </label>
              <label className="px-2.5 py-1 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 hover:border-neutral-750 text-[10px] font-semibold text-neutral-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer">
                <input
                  type="file"
                  accept=".srt,.vtt"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSubtitleFileChange(f); }}
                  className="hidden"
                />
                Load Subs
              </label>
              {videoFile && (
                <span className="text-[10px] text-neutral-500 truncate max-w-[140px] font-semibold ml-1.5" title={videoFile.name}>
                  {videoFile.name}
                </span>
              )}
            </div>

            <div className="h-4 w-px bg-neutral-900" />

            {/* Pause on Hover option */}
            <label className="flex items-center gap-2 cursor-pointer text-neutral-400 hover:text-neutral-300 transition">
              <input
                type="checkbox"
                checked={pauseOnHover}
                onChange={(e) => setPauseOnHover(e.target.checked)}
                className="w-3.5 h-3.5 accent-blue-500 rounded border-neutral-800"
              />
              <span>Pause on hover</span>
            </label>

            {/* Auto-copy to Clipboard option */}
            <label className="flex items-center gap-2 cursor-pointer text-neutral-400 hover:text-neutral-300 transition">
              <input
                type="checkbox"
                checked={autoCopyToClipboard}
                onChange={(e) => setAutoCopyToClipboard(e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-500 rounded border-neutral-800"
              />
              <span>Auto-copy</span>
            </label>
          </div>

          <div className="flex items-center gap-4">
            {/* Font Family selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 font-mono">Font:</span>
              <button
                onClick={() => setFontFamily("serif")}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  fontFamily === "serif" ? "bg-neutral-850 text-white border border-neutral-800" : "text-neutral-400 hover:text-neutral-300"
                }`}
              >
                明朝 Mincho
              </button>
              <button
                onClick={() => setFontFamily("sans")}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  fontFamily === "sans" ? "bg-neutral-850 text-white border border-neutral-800" : "text-neutral-400 hover:text-neutral-300"
                }`}
              >
                ゴシック Gothic
              </button>
            </div>

            {/* Subtitle Font Size adjusting */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 font-mono">Size:</span>
              <button
                onClick={() => setFontSize(prev => Math.max(16, prev - 2))}
                className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 hover:text-white transition cursor-pointer"
              >
                A-
              </button>
              <span className="font-mono text-neutral-350 min-w-[24px] text-center">{fontSize}px</span>
              <button
                onClick={() => setFontSize(prev => Math.min(36, prev + 2))}
                className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 hover:text-white transition cursor-pointer"
              >
                A+
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Collapsible Sidebar Transcript Panel Drawer */}
      {isSidebarOpen && (
        <aside className={`absolute top-0 right-0 bottom-0 w-[380px] border-l backdrop-blur-md flex flex-col z-30 animate-in slide-in-from-right duration-300 h-full ${getThemeCardClass()}`}>
          
          {/* Sidebar Header with Import button */}
          <div className="px-4 py-3.5 border-b border-neutral-900/40 flex items-center justify-between select-none shrink-0">
            <span className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-neutral-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Transcript Script
            </span>
            <label className="px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 hover:border-neutral-700 text-[10px] font-semibold text-neutral-350 hover:text-white transition flex items-center gap-1.5 cursor-pointer">
              <input
                type="file"
                accept=".srt,.vtt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleSubtitleFileChange(file);
                }}
                className="hidden"
              />
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Import Subs
            </label>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-neutral-900 select-none">
            <div className="relative">
              <input
                type="input"
                placeholder="Search script text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900/60 border border-neutral-800 rounded-xl py-2 pl-9 pr-4 text-xs text-neutral-200 placeholder-neutral-500 outline-none focus:border-neutral-700 transition"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Subtitles Scroll List */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin space-y-2 select-text"
          >
            {filteredSubtitles.length === 0 ? (
              <div className="text-center py-12 text-xs text-neutral-500 font-mono select-none">
                {subtitles.length === 0 ? "No subtitles loaded" : "No matching lines found"}
              </div>
            ) : (
              filteredSubtitles.map((cue) => {
                const originalIndex = subtitles.findIndex(c => c.id === cue.id);
                const isActive = originalIndex === currentSubtitleIndex;
                
                return (
                  <div
                    key={cue.id}
                    data-index={originalIndex}
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = cue.startTime + subtitleOffset;
                        setCurrentTime(cue.startTime + subtitleOffset);
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition select-text group ${
                      isActive
                        ? "bg-blue-500/10 border-blue-500/40 text-white shadow-lg shadow-blue-500/5 font-semibold"
                        : "bg-neutral-900/30 border-neutral-900/60 text-neutral-400 hover:border-neutral-800 hover:bg-neutral-900/60 hover:text-neutral-250"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5 select-none">
                      <span className={`text-[9px] font-mono tracking-wider font-semibold ${
                        isActive ? "text-blue-400" : "text-neutral-500"
                      }`}>
                        {formatTime(cue.startTime)}
                      </span>
                      
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition duration-150">
                        <span className="text-[8px] font-mono text-neutral-550">Click to seek</span>
                      </div>
                    </div>
                    
                    <p className={`text-[12px] leading-relaxed break-words ${
                      fontFamily === "serif" ? "font-serif" : "font-sans"
                    }`}>
                      {cue.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Keyboard Shortcuts Legend Card */}
          <div className="p-4 border-t border-neutral-900 bg-neutral-950/60 select-none shrink-0 text-[10px] text-neutral-500">
            <h4 className="font-semibold text-neutral-400 mb-2 uppercase tracking-wider font-mono">Keyboard Navigation</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span>Play / Pause</span>
                <kbd className="px-1 py-0.5 bg-neutral-900 border border-neutral-850 rounded text-neutral-350">Space</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Replay Line</span>
                <kbd className="px-1 py-0.5 bg-neutral-900 border border-neutral-850 rounded text-neutral-350">R</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Prev Line</span>
                <kbd className="px-1 py-0.5 bg-neutral-900 border border-neutral-850 rounded text-neutral-350">S</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Next Line</span>
                <kbd className="px-1 py-0.5 bg-neutral-900 border border-neutral-850 rounded text-neutral-350">D</kbd>
              </div>
              <div className="flex items-center justify-between col-span-2 mt-1 border-t border-neutral-900 pt-1.5">
                <span className="text-[9px] text-neutral-650 font-sans italic">Hold Shift and hover subtitle words for dictionary popup.</span>
              </div>
            </div>
          </div>

        </aside>
      )}

      {/* Global Drag-and-drop Overlay */}
      {isDraggingGlobal && (
        <div className="absolute inset-0 z-[10000] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md border-2 border-dashed border-blue-500/50 m-4 rounded-3xl animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-blue-950/40 border border-blue-900/30 flex items-center justify-center text-blue-400 mb-4 animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Drop Video or Subtitle File Here</h2>
          <p className="text-xs text-neutral-400 mt-2 font-mono">Supports MP4, MKV, WebM, SRT, VTT</p>
        </div>
      )}
    </div>
  );
}
