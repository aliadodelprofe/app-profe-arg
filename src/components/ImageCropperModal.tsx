import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, ZoomOut, RotateCw, Check, Move, RefreshCw, Camera, Crop } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  aspectRatio?: 'circle' | 'rectangle' | 'square';
  title?: string;
  subtitle?: string;
  outputWidth?: number;
  outputHeight?: number;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  aspectRatio = 'square',
  title,
  subtitle,
  outputWidth,
  outputHeight,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const offsetStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // Reset state when a new image is loaded
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setImageLoaded(true);
    }
  }, [isOpen, imageSrc]);

  // Handle Drag Start
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = { x: clientX, y: clientY };
    offsetStartRef.current = { ...offset };
  };

  // Handle Drag Move
  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;

    setOffset({
      x: offsetStartRef.current.x + deltaX,
      y: offsetStartRef.current.y + deltaY
    });
  }, [isDragging]);

  // Handle Drag End
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Rotate 90 deg
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset transforms
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Sizing calculation for natural aspect cover in container
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const handleImageLoaded = () => {
    if (imageRef.current) {
      setNaturalDimensions({
        width: imageRef.current.naturalWidth || imageRef.current.width || 1000,
        height: imageRef.current.naturalHeight || imageRef.current.height || 1000,
      });
      setImageLoaded(true);
    }
  };

  // Perform Crop onto canvas with exact pixel-for-pixel mathematical equivalence
  const handleSaveCrop = () => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const isRectangle = aspectRatio === 'rectangle';

    const containerEl = containerRef.current;
    const viewportWidth = containerEl?.clientWidth || (isRectangle ? 420 : 320);
    const viewportHeight = containerEl?.clientHeight || (isRectangle ? 236.25 : 320);

    const naturalW = naturalDimensions.width || img.naturalWidth || viewportWidth;
    const naturalH = naturalDimensions.height || img.naturalHeight || viewportHeight;

    const targetWidth = outputWidth || (isRectangle ? 1280 : 1024);
    const targetHeight = outputHeight || (isRectangle ? 720 : 1024);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.save();

    // The scale multiplier from preview viewport to output canvas
    const scaleMultiplier = targetWidth / viewportWidth;

    // Base dimensions inside preview viewport
    const initialCoverScale = Math.max(viewportWidth / naturalW, viewportHeight / naturalH);
    const baseW = naturalW * initialCoverScale;
    const baseH = naturalH * initialCoverScale;

    // 1. Move to canvas center
    ctx.translate(targetWidth / 2, targetHeight / 2);

    // 2. Apply user's drag offset scaled to canvas
    ctx.translate(offset.x * scaleMultiplier, offset.y * scaleMultiplier);

    // 3. Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // 4. Apply zoom
    ctx.scale(zoom, zoom);

    // 5. Draw the image centered at base size scaled by multiplier
    const drawW = baseW * scaleMultiplier;
    const drawH = baseH * scaleMultiplier;

    try {
      ctx.drawImage(
        img,
        -drawW / 2,
        -drawH / 2,
        drawW,
        drawH
      );
      ctx.restore();

      // Export using image/webp (0.85) or fallback to jpeg
      let croppedDataUrl = '';
      try {
        croppedDataUrl = canvas.toDataURL('image/webp', 0.85);
      } catch (e) {
        // Fallback if webp is unsupported
      }

      if (!croppedDataUrl || !croppedDataUrl.startsWith('data:image/webp')) {
        const isJpeg = imageSrc.startsWith('data:image/jpeg') || imageSrc.toLowerCase().includes('.jpg') || imageSrc.toLowerCase().includes('.jpeg');
        croppedDataUrl = canvas.toDataURL(isJpeg ? 'image/jpeg' : 'image/png', 0.85);
      }

      onCropComplete(croppedDataUrl);
      onClose();
    } catch (err) {
      console.error('Error al encuadrar la foto:', err);
      onCropComplete(imageSrc);
      onClose();
    }
  };

  if (!isOpen || !imageSrc) return null;

  const isRectangle = aspectRatio === 'rectangle';
  const isSquare = aspectRatio === 'square';

  // Calculate base preview dimensions for exact DOM representation
  const naturalW = naturalDimensions.width || 1000;
  const naturalH = naturalDimensions.height || 1000;
  const defaultViewportW = isRectangle ? 420 : 320;
  const defaultViewportH = isRectangle ? 236.25 : 320;
  const curViewportW = containerRef.current?.clientWidth || defaultViewportW;
  const curViewportH = containerRef.current?.clientHeight || defaultViewportH;
  const initialCoverScale = Math.max(curViewportW / naturalW, curViewportH / naturalH);
  const previewBaseW = naturalW * initialCoverScale;
  const previewBaseH = naturalH * initialCoverScale;

  return (
    <AnimatePresence>
      <motion.div
        key="image-cropper-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      >
        <motion.div
          key="image-cropper-content"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`relative w-full ${isRectangle ? 'max-w-xl' : 'max-w-md'} bg-[#111111] border border-[#e7d9cf]/40 rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col gap-4 text-[#eeede9]`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#56554e]/40 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#e7d9cf]/15 text-[#e7d9cf]">
                <Crop className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-[#eeede9]">
                  {title || 'Encuadrar y Recortar Foto'}
                </h3>
                <p className="text-[11px] text-[#eeede9]/60">
                  {subtitle || 'Arrastrá y ajustá el zoom para que la imagen quede perfecta (1280x720)'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/60 text-[#eeede9]/70 hover:text-[#eeede9] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cropping Viewport Area */}
          <div className="relative w-full flex flex-col items-center justify-center py-2">
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
              className={`relative ${
                isRectangle
                  ? 'w-[340px] sm:w-[420px] aspect-[16/9]'
                  : 'w-[280px] sm:w-[320px] h-[280px] sm:h-[320px]'
              } rounded-2xl overflow-hidden bg-[#181715] border-2 border-[#e7d9cf] cursor-grab active:cursor-grabbing select-none flex items-center justify-center touch-none`}
            >
              {/* Overlay Guideline - Clean border without corner shadows */}
              <div className={`absolute inset-0 ${isRectangle ? 'rounded-xl' : isSquare ? 'rounded-xl' : 'rounded-full'} border border-[#e7d9cf]/40 pointer-events-none z-10 flex items-center justify-center`}>
                <div className="text-[10px] text-white/70 bg-black/60 px-3 py-1 rounded-full pointer-events-none uppercase font-bold flex items-center gap-1.5 backdrop-blur-sm">
                  <Move className="w-3 h-3 text-[#e7d9cf]" />
                  <span>Arrastrar para encuadrar</span>
                </div>
              </div>

              {/* Preview image element centered mathematically */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Para recortar"
                crossOrigin={imageSrc.startsWith('http') ? 'anonymous' : undefined}
                onLoad={handleImageLoaded}
                onError={handleImageLoaded}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: `${previewBaseW}px`,
                  height: `${previewBaseH}px`,
                  marginLeft: `-${previewBaseW / 2}px`,
                  marginTop: `-${previewBaseH / 2}px`,
                  transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.08s ease-out',
                  maxWidth: 'none',
                  maxHeight: 'none',
                }}
                className="pointer-events-none select-none"
              />
            </div>
          </div>

          {/* Controls: Zoom & Rotate */}
          <div className="space-y-3 bg-[#56554e]/20 p-3.5 rounded-2xl border border-[#56554e]/40">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <ZoomOut className="w-4 h-4 text-[#eeede9]/60 shrink-0" />
              <input
                type="range"
                min="0.8"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-[#e7d9cf] cursor-pointer"
              />
              <ZoomIn className="w-4 h-4 text-[#e7d9cf] shrink-0" />
              <span className="text-xs font-mono font-bold text-[#e7d9cf] min-w-[42px] text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Rotation & Reset Buttons */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleRotate}
                className="px-3 py-1.5 rounded-xl bg-[#111111] border border-[#e7d9cf]/30 hover:border-[#e7d9cf] text-xs font-bold text-[#eeede9] flex items-center gap-1.5 transition"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#e7d9cf]" />
                <span>Rotar 90°</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl bg-[#111111] border border-[#56554e]/60 hover:border-[#eeede9]/50 text-xs font-bold text-[#eeede9]/70 flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Centrar</span>
              </button>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#56554e]/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/50 text-[#eeede9] font-bold text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveCrop}
              disabled={!imageSrc}
              className="px-5 py-2 rounded-xl bg-[#e7d9cf] text-[#111111] font-extrabold text-xs hover:bg-[#eeede9] transition flex items-center gap-1.5 shadow-lg disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Aplicar Encuadre</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
