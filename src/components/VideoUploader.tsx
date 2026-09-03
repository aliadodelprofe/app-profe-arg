import React, { useRef, useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader2, Play, Trash2, Film, Link as LinkIcon } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { deleteVideoFromStorage } from '../utils/storageCleanup';

interface VideoUploaderProps {
  value: string;
  onChange: (url: string) => void;
  folderPath?: string;
  label?: string;
  placeholder?: string;
  onUploadSuccess?: (url: string) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  value,
  onChange,
  folderPath = 'recaps',
  label = 'Video de la Clase',
  placeholder = 'Pegá el enlace directo o subí el archivo .mp4...',
  onUploadSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate video format
    if (!file.type.startsWith('video/')) {
      setUploadError('Por favor seleccioná un archivo de video válido (.mp4, .mov, .webm)');
      return;
    }

    // Size warning (if > 450MB)
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 450) {
      setUploadError(`El archivo pesa ${fileSizeMB.toFixed(1)} MB. Te recomendamos comprimirlo antes de subirlo para que cargue instantáneamente.`);
      return;
    }

    const previousVideoUrl = value;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      setUploadSuccess(false);

      // Clean file name
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageRef = ref(storage, `${folderPath}/${timestamp}_${sanitizedName}`);

      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Error al subir video a Firebase Storage:', error);
          setUploadError(`Error en la subida: ${error.message || 'Verificá tu conexión a internet.'}`);
          setIsUploading(false);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

            // If replacing an existing video in Firebase Storage, clean up the previous file to save space
            if (previousVideoUrl && previousVideoUrl !== downloadUrl) {
              deleteVideoFromStorage(previousVideoUrl).catch((delErr) => {
                console.warn('Note on deleting previous video:', delErr);
              });
            }

            onChange(downloadUrl);
            setUploadSuccess(true);
            setIsUploading(false);
            if (onUploadSuccess) onUploadSuccess(downloadUrl);
            setTimeout(() => setUploadSuccess(false), 4000);
          } catch (urlErr: any) {
            console.error('Error al obtener URL de descarga:', urlErr);
            setUploadError('El video se subió pero hubo un problema al obtener el link público.');
            setIsUploading(false);
          }
        }
      );
    } catch (err: any) {
      console.error('Error iniciando subida:', err);
      setUploadError(`No se pudo iniciar la subida: ${err.message || 'Error desconocido'}`);
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-[10px] uppercase font-black tracking-wider text-[#e7d9cf]">
          {label}
        </label>
        <div className="flex items-center gap-1 bg-[#111111] p-0.5 rounded-lg border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 ${
              mode === 'upload'
                ? 'bg-[#e7d9cf] text-[#111111]'
                : 'text-[#eeede9]/60 hover:text-[#eeede9]'
            }`}
          >
            <Upload className="w-2.5 h-2.5" />
            <span>Subir Archivo</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 ${
              mode === 'url'
                ? 'bg-[#e7d9cf] text-[#111111]'
                : 'text-[#eeede9]/60 hover:text-[#eeede9]'
            }`}
          >
            <LinkIcon className="w-2.5 h-2.5" />
            <span>URL / Link</span>
          </button>
        </div>
      </div>

      {mode === 'upload' ? (
        <div className="space-y-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
          />

          {!isUploading ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/[0.15] hover:border-[#e7d9cf]/60 bg-[#111111]/80 hover:bg-[#111111] rounded-2xl p-4 transition-all cursor-pointer text-center group flex flex-col items-center justify-center gap-2"
            >
              <div className="w-10 h-10 rounded-full bg-[#e7d9cf]/10 group-hover:bg-[#e7d9cf]/20 text-[#e7d9cf] flex items-center justify-center transition-transform group-hover:scale-105">
                <Film className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-[#eeede9] group-hover:text-[#e7d9cf] transition-colors">
                  Hacé clic para seleccionar el video (.mp4)
                </p>
                <p className="text-[10px] text-[#eeede9]/50">
                  Subida directa y segura a Firebase Cloud Storage
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#111111] border border-[#e7d9cf]/30 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#e7d9cf] font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Subiendo video a Cloud Storage...</span>
                </div>
                <span className="font-mono font-black text-[#e7d9cf]">{uploadProgress}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-white/[0.08] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-[#e7d9cf] transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-center text-[#eeede9]/60 font-medium">
                Por favor no cierres la ventana mientras finaliza la subida.
              </p>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-bold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>¡Video subido con éxito y vinculado a la clase!</span>
            </div>
          )}

          {uploadError && (
            <div className="p-2.5 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-300 text-xs font-bold animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{uploadError}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-[#111111] border border-white/[0.1] focus:border-[#e7d9cf] rounded-xl px-3.5 py-2.5 text-xs text-[#eeede9] font-mono placeholder:text-white/30 focus:outline-none transition"
          />
        </div>
      )}

      {/* Preview / Current Link status badge */}
      {value && (
        <div className="flex items-center justify-between p-2.5 bg-[#1a1a18] border border-white/[0.08] rounded-xl text-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-[#eeede9]/70 text-[11px] truncate font-mono">
              {value.startsWith('http') ? value : 'Video configurado'}
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (value) {
                deleteVideoFromStorage(value).catch((err) => console.warn('Error deleting video:', err));
              }
              onChange('');
            }}
            className="text-red-400/80 hover:text-red-400 p-1 hover:bg-red-500/10 rounded-lg transition"
            title="Quitar y eliminar video del almacenamiento"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
