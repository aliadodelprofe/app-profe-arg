import React, { useState } from 'react';
import { X, Camera, RotateCcw, Check, Sparkles, Crop } from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import { ImageCropperModal } from './ImageCropperModal';

interface EditCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  currentImage: string;
  defaultImage: string;
  onSave: (newImage: string | undefined) => Promise<void>;
}

export const EditCoverModal: React.FC<EditCoverModalProps> = ({
  isOpen,
  onClose,
  title,
  currentImage,
  defaultImage,
  onSave,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | undefined>(currentImage || defaultImage);
  const [isSaving, setIsSaving] = useState(false);
  const [showCropperModal, setShowCropperModal] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string>('');

  if (!isOpen) return null;

  const handleOpenCropper = () => {
    setCropperSrc(selectedImage || defaultImage);
    setShowCropperModal(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(selectedImage === defaultImage ? undefined : selectedImage);
      onClose();
    } catch (err) {
      console.error('Error al guardar foto de portada:', err);
      alert('Hubo un error al guardar la foto de portada. Intentá nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    setSelectedImage(defaultImage);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
        <div className="relative w-full max-w-lg bg-[#111111] border border-[#e7d9cf]/30 rounded-3xl p-6 shadow-2xl text-[#eeede9] space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#56554e]/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#56554e]/30 border border-[#e7d9cf]/30 text-[#e7d9cf]">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-lg text-[#eeede9] uppercase tracking-wide">
                  {title}
                </h3>
                <p className="text-xs text-[#e7d9cf]">Exclusivo para Directores / Administradores</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#56554e]/20 hover:bg-[#56554e]/40 text-[#eeede9]/70 hover:text-[#eeede9] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current / Preview Image */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#e7d9cf] block uppercase tracking-wider">
                Vista Previa de Portada
              </label>
              <button
                type="button"
                onClick={handleOpenCropper}
                className="px-2.5 py-1 rounded-xl bg-[#e7d9cf]/20 hover:bg-[#e7d9cf]/35 text-[#e7d9cf] border border-[#e7d9cf]/40 font-bold text-[11px] transition flex items-center gap-1.5 shadow"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Encuadrar / Ajustar Foto</span>
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-[#e7d9cf]/40 aspect-[16/9] w-full bg-[#1a1a1a]">
              <img
                src={selectedImage || defaultImage}
                alt="Vista previa portada"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-bold text-[#e7d9cf]">
                <span className="flex items-center gap-1 bg-[#111111]/90 px-2.5 py-1 rounded-full border border-[#e7d9cf]/30 shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-[#e7d9cf]" />
                  {selectedImage && selectedImage !== defaultImage ? 'Portada Personalizada' : 'Portada por Defecto'}
                </span>
                <button
                  type="button"
                  onClick={handleOpenCropper}
                  className="px-2.5 py-1.5 bg-[#111111]/95 hover:bg-[#111111] text-[#eeede9] text-[10px] font-extrabold rounded-lg border border-[#e7d9cf]/50 flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <Crop className="w-3 h-3 text-[#e7d9cf]" />
                  <span>Ajustar Encuadre</span>
                </button>
              </div>
            </div>
          </div>

          {/* Uploader Component */}
          <div className="space-y-3">
            <ImageUploader
              value={selectedImage}
              onChange={(val) => {
                setSelectedImage(val || defaultImage);
                if (val) {
                  setCropperSrc(val);
                  setShowCropperModal(true);
                }
              }}
              aspectRatio="rectangle"
              label="Subir nueva foto o ingresar enlace URL"
            />

            {selectedImage !== defaultImage && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-xs text-[#e7d9cf]/80 hover:text-[#e7d9cf] underline flex items-center gap-1.5 pt-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer imagen original por defecto</span>
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#56554e]/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-[#56554e]/30 hover:bg-[#56554e]/50 text-[#eeede9] font-bold text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-2xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Guardando en Firebase...' : 'Guardar en Firebase'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Photo Cropper/Editor Modal for Cover Photo */}
      <ImageCropperModal
        isOpen={showCropperModal}
        imageSrc={cropperSrc}
        aspectRatio="rectangle"
        title="Encuadrar Foto de Portada"
        subtitle="Arrastrá la imagen y ajustá el zoom para definir el acercamiento y posición ideal de la portada"
        onClose={() => setShowCropperModal(false)}
        onCropComplete={(croppedDataUrl) => {
          setSelectedImage(croppedDataUrl);
        }}
      />
    </>
  );
};
