import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Sparkles } from 'lucide-react';

interface HomeMuxVideoCardProps {
  playbackId?: string;
  videoUrl?: string;
  posterUrl?: string;
}

export const HomeMuxVideoCard: React.FC<HomeMuxVideoCardProps> = ({
  playbackId = 'JV8ISH6c93R69p7E00Tztv1YBzyOeYEl9Y9PoDz7n02KU',
  videoUrl,
  posterUrl,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [, setIsPlaying] = useState(true);
  const [, setIsLoaded] = useState(false);

  const cleanPlaybackId = playbackId?.trim() || 'JV8ISH6c93R69p7E00Tztv1YBzyOeYEl9Y9PoDz7n02KU';
  const streamUrl = videoUrl || `https://stream.mux.com/${cleanPlaybackId}.m3u8`;
  const defaultPoster = posterUrl || `https://image.mux.com/${cleanPlaybackId}/thumbnail.webp?time=2`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    const playVideo = () => {
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    };

    if (streamUrl.endsWith('.m3u8') || streamUrl.includes('stream.mux.com')) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: false, // Run in main thread to bypass worker-src CSP restrictions
          lowLatencyMode: false,
          backBufferLength: 60,
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoaded(true);
          playVideo();
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
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS for Safari (iOS / macOS)
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => {
          setIsLoaded(true);
          playVideo();
        });
      }
    } else {
      // Direct MP4, Supabase, Firebase
      video.src = streamUrl;
      const handleLoadedData = () => {
        setIsLoaded(true);
        playVideo();
      };
      const handleError = () => {
        let safeSrc = streamUrl;
        if (safeSrc.startsWith('http://') || safeSrc.startsWith('https://')) {
          try {
            const b64 = btoa(unescape(encodeURIComponent(safeSrc)));
            safeSrc = `/api/video/proxy?b64=${b64}`;
          } catch {
            safeSrc = `/api/video/proxy?url=${encodeURIComponent(safeSrc)}`;
          }
          if (video.src !== safeSrc) {
            video.src = safeSrc;
          }
        }
      };
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('error', handleError);
      return () => {
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('error', handleError);
      };
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [streamUrl]);

  return (
    <section className="flex flex-col items-center justify-center w-full mt-4 mb-14 sm:mb-20">
      {/* Header Badge & Title */}
      <div className="flex flex-col items-center justify-center text-center space-y-1.5 px-4 mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#56554e]/30 text-[#e7d9cf] border border-white/[0.08] tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5 text-[#e7d9cf]" />
          <span>Toda una Experiencia</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#eeede9] tracking-tight uppercase">
          Ustedes en Escena
        </h2>
        <p className="text-xs sm:text-sm text-[#eeede9]/70 max-w-md leading-relaxed">
          Momentos inolvidables que se viven en el cierre de jornada de cada formación
        </p>
      </div>

      {/* Smartphone Mockup Container with Floating Elevation & Ambient Ground Shadow */}
      <div className="relative group">
        {/* Ambient Ground/Floor Cast Shadow (Creates floating elevation illusion) */}
        <div className="absolute -bottom-8 sm:-bottom-10 inset-x-6 h-10 bg-black/80 blur-2xl rounded-full scale-y-50 pointer-events-none transform translate-y-2" />
        
        {/* Soft Warm Ambient Glow behind device */}
        <div className="absolute -inset-4 bg-gradient-to-tr from-[#56554e]/20 via-[#e7d9cf]/10 to-transparent blur-3xl rounded-[60px] pointer-events-none -z-10" />

        <div className="relative w-[300px] sm:w-[330px] p-3 sm:p-3.5 bg-[#1e1d1a] rounded-[46px] sm:rounded-[50px] shadow-[0_35px_70px_-15px_rgba(0,0,0,0.95),0_15px_30px_-10px_rgba(0,0,0,0.8),0_0_0_2px_#3d3b36,0_0_0_4px_#141413] border border-white/10 transition-transform duration-500 ease-out hover:-translate-y-1">
          {/* Phone Physical Buttons */}
          <div className="absolute -left-[5px] top-24 w-[3px] h-7 bg-[#484640] rounded-l-md shadow-inner" />
          <div className="absolute -left-[5px] top-36 w-[3px] h-10 bg-[#484640] rounded-l-md shadow-inner" />
          <div className="absolute -left-[5px] top-48 w-[3px] h-10 bg-[#484640] rounded-l-md shadow-inner" />
          <div className="absolute -right-[5px] top-32 w-[3px] h-14 bg-[#484640] rounded-r-md shadow-inner" />

          {/* Screen Bezel */}
          <div className="relative w-full aspect-[9/16] rounded-[36px] sm:rounded-[40px] overflow-hidden bg-black ring-1 ring-white/15 shadow-inner">
            
            {/* Dynamic Island / Notch */}
            <div className="absolute top-2.5 inset-x-0 z-30 flex justify-center pointer-events-none">
              <div className="h-[18px] w-24 sm:w-28 bg-[#0a0a0a] rounded-full border border-white/10 flex items-center justify-between px-2.5 shadow-md">
                <div className="w-2.5 h-2.5 rounded-full bg-[#161616] ring-1 ring-white/10" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#1b3038]" />
              </div>
            </div>

            {/* Video element */}
            <video
              ref={videoRef}
              poster={defaultPoster}
              playsInline
              webkit-playsinline="true"
              muted
              loop
              autoPlay
              preload="auto"
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* Subtle Video Gradients */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Home Bar Indicator */}
            <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none z-30">
              <div className="w-24 sm:w-28 h-1 bg-white/40 rounded-full shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

