import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeRendererProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCodeRenderer: React.FC<QRCodeRendererProps> = ({
  value,
  size = 200,
  className = '',
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (!value) return;

    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: {
        dark: '#111111',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setError(false);
        }
      })
      .catch((err) => {
        console.error('Error generating client-side QR Code:', err);
        if (isMounted) {
          setError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  if (error || !dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-white rounded-lg p-2 ${className}`}
      >
        <div className="w-full h-full border-2 border-dashed border-[#56554e]/40 rounded flex flex-col items-center justify-center p-2 text-center">
          <span className="text-[10px] text-[#111111] font-bold">Cargando QR...</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="Código QR"
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  );
};
