import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Link as LinkIcon, Crop } from 'lucide-react';
import { compressAndReadFile } from '../utils/imageUtils';
import { ImageCropperModal } from './ImageCropperModal';

interface ImageUploaderProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  label?: string;
  className?: string;
  enableCrop?: boolean;
  aspectRatio?: 'circle' | 'rectangle' | 'square';
  cropTitle?: string;
  cropSubtitle?: string;
  placeholderText?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  label = 'Imagen / Foto',
  className = '',
  enableCrop = true,
  aspectRatio = 'square',
  cropTitle = 'Encuadrar y Recortar Foto',
  cropSubtitle = 'Arrastrá y ajustá el zoom para que la imagen quede perfecta (1024x1024)',
  placeholderText,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const dataUrl = await compressAndReadFile(file);
      if (enableCrop) {
        setCropperSrc(dataUrl);
      } else {
        onChange(dataUrl);
      }
    } catch (err) {
      console.error('Error procesando imagen:', err);
      alert('Hubo un error al procesar la foto. Por favor intentá con otra.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange(undefined);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="text-[#eeede9] font-semibold block text-xs">{label}</label>}

      {value ? (
        <div className="relative group rounded-2xl overflow-hidden border border-[#e7d9cf]/30 bg-[#1a1a1a] p-2 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-[#181715] p-0.5 border border-[#e7d9cf]/20 shrink-0 flex items-center justify-center overflow-hidden">
              <img
                src={value}
                alt="Vista previa"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[#e7d9cf] block truncate">Foto seleccionada</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {enableCrop && (
              <button
                type="button"
                onClick={() => setCropperSrc(value)}
                className="px-2.5 py-1.5 rounded-xl bg-[#e7d9cf]/15 hover:bg-[#e7d9cf] text-[#e7d9cf] hover:text-[#111111] font-bold text-[11px] transition flex items-center gap-1 border border-[#e7d9cf]/30"
                title="Encuadrar imagen"
              >
                <Crop className="w-3 h-3" />
                <span>Encuadrar</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/60 text-[#eeede9] font-bold text-[11px] transition flex items-center gap-1"
            >
              <Upload className="w-3 h-3" />
              <span>Cambiar</span>
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition"
              title="Eliminar foto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#56554e]/60 hover:border-[#e7d9cf]/60 bg-[#56554e]/10 hover:bg-[#56554e]/20 rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 group"
          >
            <div className="w-9 h-9 rounded-full bg-[#56554e]/30 group-hover:bg-[#e7d9cf] text-[#e7d9cf] group-hover:text-[#111111] flex items-center justify-center transition shadow">
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-[#eeede9] group-hover:text-[#e7d9cf]">
                {isUploading ? 'Procesando foto...' : 'Seleccionar o Cargar Foto desde tu dispositivo'}
              </p>
              <p className="text-[10px] text-[#eeede9]/50">Formatos JPG, PNG, WEBP (con editor de encuadre)</p>
            </div>
          </div>

          {!showUrlInput ? (
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="text-[11px] text-[#e7d9cf]/70 hover:text-[#e7d9cf] underline flex items-center gap-1 mx-auto pt-0.5"
            >
              <LinkIcon className="w-3 h-3" />
              <span>O ingresar un enlace URL de imagen directamente</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <ImageIcon className="w-3.5 h-3.5 text-[#56554e] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="https://ejemplo.com/foto.jpg"
                  value={value || ''}
                  onChange={(e) => onChange(e.target.value.trim() || undefined)}
                  className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#eeede9] placeholder-[#56554e] focus:outline-none focus:border-[#e7d9cf]"
                />
              </div>
              {value && enableCrop && (
                <button
                  type="button"
                  onClick={() => setCropperSrc(value)}
                  className="px-2.5 py-1.5 rounded-xl bg-[#e7d9cf] text-[#111111] font-bold text-[11px] transition flex items-center gap-1 shrink-0"
                >
                  <Crop className="w-3 h-3" />
                  <span>Encuadrar</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowUrlInput(false)}
                className="text-[11px] text-[#eeede9]/50 hover:text-[#eeede9]"
              >
                Ocultar
              </button>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {enableCrop && cropperSrc && (
        <ImageCropperModal
          isOpen={!!cropperSrc}
          imageSrc={cropperSrc}
          onClose={() => setCropperSrc(null)}
          onCropComplete={(croppedUrl) => {
            onChange(croppedUrl);
            setCropperSrc(null);
          }}
          aspectRatio={aspectRatio}
          title={cropTitle}
          subtitle={cropSubtitle}
        />
      )}
    </div>
  );
};
