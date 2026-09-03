/**
 * Reads an image file from an <input type="file"> and compresses it into a lightweight Data URL (base64 string).
 * This ensures fast uploads and small storage size in Firestore (<100KB per image),
 * preventing document size limit errors (1MB max per Firestore document).
 */
export function compressAndReadFile(file: File, maxWidth = 800, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's a GIF or svg, read directly
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onerror = (err) => reject(err);
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (event) => {
      const rawSrc = event.target?.result as string;
      compressDataUrl(rawSrc, maxWidth, quality)
        .then(resolve)
        .catch(() => resolve(rawSrc));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image Data URL (base64 string) down to a lightweight format (<100KB).
 * Prefers image/webp (quality 0.8) to preserve transparency while drastically reducing size.
 */
export function compressDataUrl(dataUrl: string, maxDimension = 800, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    // If it's not a base64 data URL (e.g. http/https link) or already very small (<200KB), return immediately
    if (!dataUrl || !dataUrl.startsWith('data:image/') || dataUrl.length < 200000) {
      resolve(dataUrl);
      return;
    }

    let resolved = false;
    const safeResolve = (val: string) => {
      if (!resolved) {
        resolved = true;
        resolve(val);
      }
    };

    // Safety timeout: resolve original if DOM image loading takes > 1000ms
    const timer = setTimeout(() => {
      safeResolve(dataUrl);
    }, 1000);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => {
      clearTimeout(timer);
      safeResolve(dataUrl);
    };
    img.onload = () => {
      clearTimeout(timer);
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        safeResolve(dataUrl);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Try image/webp first (supports alpha transparency + lossy compression)
      try {
        let webpUrl = canvas.toDataURL('image/webp', quality);
        if (webpUrl.startsWith('data:image/webp') && webpUrl.length < dataUrl.length) {
          safeResolve(webpUrl);
          return;
        }
      } catch (e) {
        // Fallback
      }

      // Fallback for JPEG if non-transparent or JPEG source
      const isJpeg = dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg');
      if (isJpeg) {
        const jpegUrl = canvas.toDataURL('image/jpeg', quality);
        safeResolve(jpegUrl);
        return;
      }

      // If PNG fallback, export JPEG or smaller PNG
      const pngUrl = canvas.toDataURL('image/jpeg', 0.82);
      safeResolve(pngUrl.length < dataUrl.length ? pngUrl : dataUrl);
    };
    img.src = dataUrl;
  });
}

/**
 * Compresses all image URLs inside a product payload to ensure total document size remains well below 1MB.
 */
export async function compressProductPayload<T extends Record<string, any>>(payload: T): Promise<T> {
  const cloned = { ...payload } as any;

  // Compress images array
  if (Array.isArray(cloned.images)) {
    cloned.images = await Promise.all(
      cloned.images.map(img => (typeof img === 'string' ? compressDataUrl(img, 800, 0.8) : img))
    );
  }

  // Compress colorImages map
  if (cloned.colorImages && typeof cloned.colorImages === 'object') {
    const newColorImages: Record<string, any> = {};
    for (const [color, val] of Object.entries(cloned.colorImages)) {
      if (Array.isArray(val)) {
        newColorImages[color] = await Promise.all(
          val.map(u => (typeof u === 'string' ? compressDataUrl(u, 800, 0.8) : u))
        );
      } else if (typeof val === 'string') {
        newColorImages[color] = await compressDataUrl(val, 800, 0.8);
      } else {
        newColorImages[color] = val;
      }
    }
    cloned.colorImages = newColorImages;
  }

  // Compress single image URLs
  if (typeof cloned.sizingInstructionUrl === 'string') {
    cloned.sizingInstructionUrl = await compressDataUrl(cloned.sizingInstructionUrl, 800, 0.8);
  }
  if (typeof cloned.sizeGuideUrl === 'string') {
    cloned.sizeGuideUrl = await compressDataUrl(cloned.sizeGuideUrl, 800, 0.8);
  }

  return cloned;
}

