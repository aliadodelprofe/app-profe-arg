import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { ref as storageRef, getBlob } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Gauge,
  Sliders,
  Tv,
} from 'lucide-react';

export interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  description?: string;
  videoUrl: string;
}

function isFirebaseStorageUrl(url: string): boolean {
  return url.includes('firebasestorage.googleapis.com') || url.includes('.firebasestorage.app');
}

function toProxyVideoUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('/api/video/') || url.startsWith('/videos/')) {
    return url;
  }
  try {
    const b64 = btoa(unescape(encodeURIComponent(url)));
    return `/api/video/proxy?b64=${b64}`;
  } catch {
    return `/api/video/proxy?url=${encodeURIComponent(url)}`;
  }
}

export function parseVideoUrl(rawUrl: string): {
  embedUrl: string | null;
  directSrc?: string;
  originalDirectUrl?: string;
  hlsStreamUrl?: string;
  driveDirectUrl?: string;
  driveFileId?: string;
  type: 'hls' | 'direct' | 'drive' | 'drive-folder' | 'youtube' | 'vimeo' | 'general';
} {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { embedUrl: null, type: 'general' };
  }

  const url = rawUrl.trim();

  // 1. Mux stream or Mux player URL
  const muxStreamMatch =
    url.match(/stream\.mux\.com\/([a-zA-Z0-9_-]+)(?:\.m3u8)?/i) ||
    url.match(/player\.mux\.com\/([a-zA-Z0-9_-]+)/i);
  if (muxStreamMatch && muxStreamMatch[1]) {
    return {
      embedUrl: null,
      hlsStreamUrl: `https://stream.mux.com/${muxStreamMatch[1]}.m3u8`,
      originalDirectUrl: url,
      type: 'hls',
    };
  }

  // 2. Standalone Mux playbackId string (e.g. 20-55 alphanumeric characters)
  if (/^[a-zA-Z0-9_-]{20,60}$/.test(url) && !url.includes('/') && !url.includes('.')) {
    return {
      embedUrl: null,
      hlsStreamUrl: `https://stream.mux.com/${url}.m3u8`,
      type: 'hls',
    };
  }

  // 3. HLS .m3u8 stream
  if (url.includes('.m3u8')) {
    return {
      embedUrl: null,
      hlsStreamUrl: url,
      originalDirectUrl: url,
      type: 'hls',
    };
  }

  // 4. Direct video file (Firebase Storage, Supabase, mp4, webm, mov, ogg, local paths)
  if (
    /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) ||
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('.firebasestorage.app') ||
    url.startsWith('/api/video/') ||
    url.startsWith('/videos/') ||
    url.includes('supabase.co/storage/v1/object/public/videos/')
  ) {
    return {
      embedUrl: null,
      directSrc: url, // Directly load from high-speed CDN
      originalDirectUrl: url,
      type: 'direct',
    };
  }

  // 5. YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&cc_load_policy=0&cc_lang_pref=off&controls=1&showinfo=0`,
      originalDirectUrl: url,
      type: 'youtube',
    };
  }

  // 6. Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/|channels\/staffpicks\/)?(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&playsinline=1`,
      originalDirectUrl: url,
      type: 'vimeo',
    };
  }

  // 7. Google Drive File (single video)
  const driveFileMatch =
    url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/i) ||
    url.match(/\/uc\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch && driveFileMatch[1]) {
    const fileId = driveFileMatch[1];
    return {
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      driveDirectUrl: `https://drive.google.com/file/d/${fileId}/view`,
      driveFileId: fileId,
      directSrc: `/api/video/stream/${fileId}`,
      originalDirectUrl: `https://drive.google.com/file/d/${fileId}/view`,
      type: 'drive',
    };
  }

  // 8. Google Drive Folder
  const driveFolderMatch = url.match(/\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/i);
  if (driveFolderMatch && driveFolderMatch[1]) {
    const folderId = driveFolderMatch[1];
    return {
      embedUrl: `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`,
      driveDirectUrl: `https://drive.google.com/drive/folders/${folderId}`,
      originalDirectUrl: url,
      type: 'drive-folder',
    };
  }

  // 9. General fallback
  return {
    embedUrl: url,
    originalDirectUrl: url,
    type: 'general',
  };
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const VideoPlayerModal: React.FC<VideoModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  description,
  videoUrl,
}) => {
  const { currentUser } = useAuth();
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoWrapperRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);

  const revokeActiveBlobUrl = useCallback(() => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
  }, []);

  const watermarkLabel = currentUser ? (currentUser.fullName || currentUser.email || '') : '';

  const [showDescription, setShowDescription] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [viewMode, setViewMode] = useState<'player' | 'embed'>('player');

  const parsed = parseVideoUrl(videoUrl);
  const isVideoSource =
    parsed.type === 'hls' ||
    parsed.type === 'direct' ||
    (parsed.type === 'drive' && !!parsed.directSrc && viewMode === 'player');
  const isDrive = parsed.type === 'drive' || parsed.type === 'drive-folder';
  const directExternalLink = parsed.originalDirectUrl || parsed.driveDirectUrl || videoUrl;

  // Track the active video source
  const [directVideoSource, setDirectVideoSource] = useState<string>(() => {
    if (parsed.type === 'direct') {
      return parsed.directSrc || parsed.originalDirectUrl || videoUrl || '';
    }
    if (parsed.type === 'drive' && parsed.directSrc) {
      return parsed.directSrc;
    }
    return '';
  });
  const [fallbackAttempt, setFallbackAttempt] = useState<number>(0);
  const [retryToken, setRetryToken] = useState<number>(0);

  // Auto-hide controls during active playback
  const scheduleHideControls = useCallback(() => {
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    if (isPlaying) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 3500);
    }
  }, [isPlaying]);

  // Reset states whenever modal opens or video changes
  useEffect(() => {
    if (isOpen) {
      revokeActiveBlobUrl();
      setShowDescription(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setHasError(false);
      setIsLoading(true);
      setShowSpeedMenu(false);
      setPlaybackSpeed(1);
      setShowControls(true);
      setFallbackAttempt(0);
      setRetryToken(0);
      setViewMode('player');

      if (parsed.type === 'direct') {
        const initialSrc = parsed.directSrc || parsed.originalDirectUrl || videoUrl;
        setDirectVideoSource(initialSrc);
      } else if (parsed.type === 'drive' && parsed.directSrc) {
        setDirectVideoSource(parsed.directSrc);
      } else {
        setDirectVideoSource('');
      }
    }
  }, [isOpen, videoUrl]);

  // Release the blob URL when the modal unmounts entirely
  useEffect(() => {
    return () => revokeActiveBlobUrl();
  }, [revokeActiveBlobUrl]);

  // Video attachment & HLS loader
  useEffect(() => {
    if (!isOpen || !isVideoSource) return;

    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    if (parsed.type === 'hls' && parsed.hlsStreamUrl) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: false,
          lowLatencyMode: false,
          backBufferLength: 60,
        });

        hls.loadSource(parsed.hlsStreamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls?.recoverMediaError();
                break;
              default:
                hls?.destroy();
                setHasError(true);
                setIsLoading(false);
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = parsed.hlsStreamUrl;
      }
    } else if (directVideoSource && isFirebaseStorageUrl(directVideoSource)) {
      // Firebase Storage recap: fetch through the SDK so Storage Rules (login required)
      // are enforced, then hand the player a local blob: URL instead of the public link.
      (async () => {
        try {
          const fileRef = storageRef(storage, directVideoSource);
          const blob = await getBlob(fileRef, 1024 * 1024 * 1024);
          if (cancelled) return;
          revokeActiveBlobUrl();
          const blobUrl = URL.createObjectURL(blob);
          activeBlobUrlRef.current = blobUrl;
          video.src = blobUrl;
          video.load();
        } catch (err) {
          console.warn('No se pudo cargar el video protegido desde Firebase Storage:', err);
          if (!cancelled) {
            setHasError(true);
            setIsLoading(false);
          }
        }
      })();
    } else if (directVideoSource) {
      video.src = directVideoSource;
      video.load();
    }

    return () => {
      cancelled = true;
      if (hls) {
        hls.destroy();
      }
    };
  }, [isOpen, isVideoSource, parsed.type, parsed.hlsStreamUrl, directVideoSource, retryToken, revokeActiveBlobUrl]);

  // Video playback events
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      setIsLoading(false);
      setHasError(false);
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Autoplay blocked by browser until user click
          setIsPlaying(false);
        });
    }
  };

  const handleVideoError = () => {
    const video = videoRef.current;
    if (!video) return;

    // Fallback 1: If direct URL had a CORS issue, try proxy (skipped for Firebase Storage,
    // which is already loaded as an authenticated blob: no public proxy fallback needed/available)
    if (
      fallbackAttempt === 0 &&
      parsed.type === 'direct' &&
      parsed.originalDirectUrl &&
      !isFirebaseStorageUrl(parsed.originalDirectUrl)
    ) {
      const proxyUrl = toProxyVideoUrl(parsed.originalDirectUrl);
      if (proxyUrl && proxyUrl !== directVideoSource) {
        console.info("Switching to proxy video fallback:", proxyUrl);
        setFallbackAttempt(1);
        setDirectVideoSource(proxyUrl);
        video.src = proxyUrl;
        video.load();
        video.play().then(() => setIsPlaying(true)).catch(() => {});
        return;
      }
    }

    // Fallback 2: If Drive stream failed, switch to Google Drive embed view
    if (parsed.type === 'drive' && parsed.embedUrl) {
      console.info("Drive direct stream failed, switching to Google Drive embed view");
      setViewMode('embed');
      setHasError(false);
      setIsLoading(false);
      return;
    }

    if (video.error) {
      console.warn("Video playback error code:", video.error.code, video.error.message);
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    scheduleHideControls();
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch((err) => {
          console.warn("Play blocked or failed:", err);
          setIsPlaying(false);
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    scheduleHideControls();
  };

  const handleSeekOffset = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    scheduleHideControls();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
    scheduleHideControls();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
    if (!newMuted && volume === 0) {
      setVolume(0.8);
      videoRef.current.volume = 0.8;
    }
    scheduleHideControls();
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
    scheduleHideControls();
  };

  const toggleFullscreen = async () => {
    const container = videoWrapperRef.current || modalContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      try {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } catch {
        // iOS Safari can't put a plain <div> into fullscreen — only the native <video>
        // element itself (webkitEnterFullscreen), which hands control to the OS player and
        // hides our watermark/controls entirely. Skip that fallback so the watermark stays
        // visible; the modal already fills the viewport, so playback is effectively
        // fullscreen already (the only loss is the Safari status bar not being hidden).
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setFallbackAttempt(0);

    // Firebase Storage sources are loaded as an authenticated blob by the loader effect;
    // bumping retryToken re-runs that effect instead of setting a raw (now-blocked) URL.
    if (directVideoSource && isFirebaseStorageUrl(directVideoSource)) {
      setRetryToken((t) => t + 1);
      return;
    }

    if (videoRef.current) {
      const retrySrc = directVideoSource || parsed.directSrc || parsed.originalDirectUrl || videoUrl;
      videoRef.current.src = retrySrc;
      videoRef.current.load();
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else {
            onClose();
          }
          break;
        case ' ':
          e.preventDefault();
          if (isVideoSource) togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (isVideoSource) handleSeekOffset(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (isVideoSource) handleSeekOffset(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (isVideoSource && videoRef.current) {
            const newVol = Math.min(1, volume + 0.1);
            setVolume(newVol);
            videoRef.current.volume = newVol;
            videoRef.current.muted = false;
            setIsMuted(false);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (isVideoSource && videoRef.current) {
            const newVol = Math.max(0, volume - 0.1);
            setVolume(newVol);
            videoRef.current.volume = newVol;
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          if (isVideoSource) toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          if (isVideoSource) toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isVideoSource, isPlaying, volume, isMuted, duration, onClose]);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !videoUrl) return null;

  const hasDescription = Boolean(description && description.trim().length > 0);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={modalContainerRef}
      id="video-recap-player-modal"
      className="fixed inset-0 z-[100] w-full h-[100dvh] max-h-[100dvh] bg-black flex flex-col justify-between overflow-hidden animate-fadeIn select-none text-[#eeede9] pb-[env(safe-area-inset-bottom,0px)]"
      onMouseMove={scheduleHideControls}
      onTouchStart={scheduleHideControls}
    >
      {/* Top Header Bar */}
      <div
        className={`relative z-30 w-full px-3 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-b from-black via-black/90 to-transparent flex items-center justify-between gap-2 sm:gap-3 border-b border-white/[0.08] shrink-0 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Left: Title & Subtitle */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#e7d9cf]/15 text-[#e7d9cf] flex items-center justify-center shrink-0 border border-white/[0.08]">
            <Play className="w-4 h-4 fill-current ml-0.5 text-[#e7d9cf]" />
          </div>
          <div className="min-w-0 pr-2">
            <h2 className="text-xs sm:text-sm md:text-base font-black uppercase text-[#eeede9] truncate tracking-tight">
              {title || 'Recap de Clase'}
            </h2>
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-[#e7d9cf] font-bold truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mode Switch for Google Drive if applicable */}
          {parsed.type === 'drive' && (
            <button
              type="button"
              onClick={() => {
                setViewMode(viewMode === 'player' ? 'embed' : 'player');
                setHasError(false);
              }}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#e7d9cf] text-xs font-bold transition flex items-center gap-1.5 border border-white/[0.1] cursor-pointer"
              title="Alternar entre Reproductor Nativo y Google Drive Embed"
            >
              {viewMode === 'player' ? (
                <>
                  <Tv className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Drive Embed</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reproductor</span>
                </>
              )}
            </button>
          )}

          {/* Description toggle button */}
          {hasDescription && (
            <button
              type="button"
              onClick={() => setShowDescription(!showDescription)}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                showDescription
                  ? 'bg-[#e7d9cf] text-[#111111] border-[#e7d9cf]'
                  : 'bg-white/[0.08] hover:bg-white/[0.15] text-[#eeede9] border-white/[0.1]'
              }`}
              title="Ver figuras y notas de la clase"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs">{showDescription ? 'Ocultar Detalle' : 'Ver Detalle'}</span>
              {showDescription ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
            </button>
          )}

          {/* Close Modal Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-white/[0.08] hover:bg-red-500/80 text-[#eeede9]/80 hover:text-white transition cursor-pointer border border-white/[0.08]"
            title="Cerrar reproductor (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Google Drive Notice Banner if relevant */}
      {isDrive && (
        <div className="bg-[#181816] px-4 py-2 text-center text-xs text-[#e7d9cf] border-b border-white/[0.08] flex items-center justify-center gap-2 shrink-0 z-20">
          <span>Este video está alojado en Google Drive.</span>
          <a
            href={directExternalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold text-white hover:text-[#e7d9cf] inline-flex items-center gap-1"
          >
            Abrir en Google Drive <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Main Video Area */}
      <div className="relative flex-1 w-full h-full min-h-0 flex items-center justify-center p-1 sm:p-4 md:p-6 overflow-hidden">
        <div
          ref={videoWrapperRef}
          className="relative w-full h-full max-w-5xl flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/[0.08]"
        >
          {isVideoSource ? (
            hasError ? (
              <div
                className="p-8 text-center space-y-4 max-w-md bg-[#161615] rounded-3xl border border-white/[0.1] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#eeede9]">No se pudo cargar el video directamente</h3>
                  <p className="text-xs text-[#eeede9]/70 leading-relaxed">
                    Puedes reintentar la conexión o ver el video en su enlace original directamente.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e7d9cf] text-[#111111] text-xs font-bold hover:bg-[#d8c7bc] transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reintentar
                  </button>
                  {parsed.type === 'drive' && parsed.embedUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('embed');
                        setHasError(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#eeede9] text-xs font-bold border border-white/[0.1] transition cursor-pointer"
                    >
                      <Tv className="w-3.5 h-3.5" /> Probar Drive Embed
                    </button>
                  )}
                  {directExternalLink && (
                    <a
                      href={directExternalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#eeede9] text-xs font-bold border border-white/[0.1] transition cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Abrir en pestaña nueva
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  src={
                    directVideoSource && isFirebaseStorageUrl(directVideoSource)
                      ? undefined
                      : directVideoSource || parsed.directSrc || parsed.originalDirectUrl || undefined
                  }
                  playsInline
                  autoPlay
                  preload="auto"
                  onClick={togglePlay}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onCanPlay={() => setIsLoading(false)}
                  onWaiting={() => setIsLoading(true)}
                  onPlaying={() => {
                    setIsLoading(false);
                    setIsPlaying(true);
                  }}
                  onPause={() => setIsPlaying(false)}
                  onError={handleVideoError}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full max-h-[82vh] sm:max-h-[86vh] object-contain bg-black cursor-pointer"
                />

                {/* Traceability watermark: discourages screen-recording/sharing by tying the
                    footage to the logged-in student. */}
                {watermarkLabel && !hasError && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none select-none">
                    <span className="text-xs sm:text-sm font-bold text-white/25 uppercase tracking-wider whitespace-nowrap">
                      {watermarkLabel}
                    </span>
                  </div>
                )}

                {/* Big Center Play/Pause Pulsing Icon */}
                {(!isPlaying || isLoading) && (
                  <div
                    className="absolute inset-0 flex items-center justify-center z-20"
                    onClick={togglePlay}
                  >
                    {isLoading ? (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20">
                        <RefreshCw className="w-7 h-7 text-[#e7d9cf] animate-spin" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay();
                        }}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl hover:scale-110 active:scale-95 transition cursor-pointer"
                        title="Reproducir video"
                      >
                        <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-current text-[#e7d9cf] ml-1" />
                      </button>
                    )}
                  </div>
                )}

                {/* Sleek Custom Control Bar */}
                <div
                  className={`absolute inset-x-0 bottom-0 z-30 p-3 sm:p-4 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-300 ${
                    showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Timeline Scrubber */}
                  <div className="relative w-full group/seek mb-2.5 flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step="any"
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1.5 sm:h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#e7d9cf] focus:outline-none transition"
                      style={{
                        background: `linear-gradient(to right, #e7d9cf 0%, #e7d9cf ${progressPercent}%, rgba(255, 255, 255, 0.2) ${progressPercent}%, rgba(255, 255, 255, 0.2) 100%)`,
                      }}
                    />
                  </div>

                  {/* Controls Row */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Left: Play/Pause, Rewind/Forward, Time */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="p-2 rounded-xl bg-white/[0.1] hover:bg-white/[0.2] text-[#eeede9] transition cursor-pointer"
                        title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSeekOffset(-10)}
                        className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#eeede9] transition cursor-pointer"
                        title="Retroceder 10 segundos (←)"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSeekOffset(10)}
                        className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#eeede9] transition cursor-pointer"
                        title="Adelantar 10 segundos (→)"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>

                      <div className="text-[11px] sm:text-xs font-mono font-bold text-[#eeede9]/90 ml-1">
                        <span>{formatTime(currentTime)}</span>
                        <span className="text-[#eeede9]/40 mx-1">/</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Right: Volume, Speed Selector, Fullscreen */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {/* Volume Slider (Hidden on small mobile, accessible on desktop/tablet) */}
                      <div className="hidden md:flex items-center gap-1.5 bg-white/[0.08] px-2 py-1.5 rounded-xl">
                        <button
                          type="button"
                          onClick={toggleMute}
                          className="text-[#eeede9] hover:text-white transition cursor-pointer"
                          title={isMuted ? 'Activar sonido' : 'Silenciar'}
                        >
                          {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#e7d9cf]"
                        />
                      </div>

                      {/* Mobile Mute Toggle */}
                      <button
                        type="button"
                        onClick={toggleMute}
                        className="md:hidden p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#eeede9] transition cursor-pointer"
                      >
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>

                      {/* Speed Controller Popover */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#eeede9] text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1 border border-white/[0.08]"
                          title="Velocidad de reproducción (para practicar figuras)"
                        >
                          <Gauge className="w-3.5 h-3.5 text-[#e7d9cf]" />
                          <span>{playbackSpeed}x</span>
                        </button>

                        {showSpeedMenu && (
                          <div className="absolute bottom-full right-0 mb-2 bg-[#181816] border border-white/[0.15] rounded-2xl p-1 shadow-2xl z-50 min-w-[100px] flex flex-col gap-0.5 animate-fadeIn">
                            <div className="text-[9px] uppercase font-bold text-[#e7d9cf]/70 px-2 py-1 border-b border-white/[0.08]">
                              Velocidad
                            </div>
                            {PLAYBACK_SPEEDS.map((speed) => (
                              <button
                                key={speed}
                                type="button"
                                onClick={() => changeSpeed(speed)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold text-left transition cursor-pointer flex items-center justify-between ${
                                  playbackSpeed === speed
                                    ? 'bg-[#e7d9cf] text-[#111111]'
                                    : 'text-[#eeede9] hover:bg-white/[0.08]'
                                }`}
                              >
                                <span>{speed === 1 ? '1.0x (Normal)' : `${speed}x`}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Fullscreen Button */}
                      <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#eeede9] transition cursor-pointer"
                        title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                      >
                        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )
          ) : parsed.embedUrl ? (
            <div className="relative w-full aspect-video max-h-[82vh] sm:max-h-[86vh] rounded-2xl overflow-hidden shadow-2xl border border-white/[0.08] bg-black">
              <iframe
                src={parsed.embedUrl}
                title={title || 'Video Recap'}
                className="w-full h-full border-0 rounded-2xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="p-8 text-center space-y-4 max-w-md bg-[#161615] rounded-3xl border border-white/[0.08]">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-sm font-bold text-[#eeede9]">
                No se pudo cargar la vista previa directa del video.
              </p>
              {directExternalLink && (
                <a
                  href={directExternalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e7d9cf] text-[#111111] text-xs font-bold hover:bg-[#d8c7bc] transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir enlace original
                </a>
              )}
            </div>
          )}
        </div>

        {/* Overlaid Description Drawer if opened */}
        {showDescription && hasDescription && (
          <div className="absolute bottom-4 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 max-h-[50vh] overflow-y-auto bg-[#181816]/95 backdrop-blur-md border border-white/[0.15] p-4 rounded-2xl shadow-2xl space-y-2 z-40 animate-fadeIn mb-[env(safe-area-inset-bottom,0px)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-[#e7d9cf] tracking-wider flex items-center gap-1.5">
                <FileText className="w-3 h-3" />
                Detalle & Figuras Dictadas
              </span>
              <button
                type="button"
                onClick={() => setShowDescription(false)}
                className="text-[#eeede9]/60 hover:text-white text-xs font-bold cursor-pointer"
              >
                Ocultar
              </button>
            </div>
            <p className="text-xs text-[#eeede9]/90 leading-relaxed font-medium whitespace-pre-line">
              {description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
