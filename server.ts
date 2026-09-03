import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Readable } from "node:stream";
import multer from "multer";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "public", "videos", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration for video files
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".mp4";
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e6);
    cb(null, `temp_upload_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 }, // 150MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/") || file.originalname.match(/\.(mp4|mov|webm|m4v|mkv|avi|flv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos de video (MP4, MOV, WebM, M4V)"));
    }
  }
});

interface DriveSession {
  downloadUrl: string;
  cookie: string;
  timestamp: number;
}

const driveSessionCache = new Map<string, DriveSession>();

async function getDriveDownloadSession(fileId: string): Promise<{ downloadUrl: string; cookie: string }> {
  const cached = driveSessionCache.get(fileId);
  // Cache session for 5 minutes
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return { downloadUrl: cached.downloadUrl, cookie: cached.cookie };
  }

  const initialUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const initRes = await fetch(initialUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });

  const cookie = initRes.headers.get("set-cookie") || "";
  const html = await initRes.text();

  const uuidMatch = html.match(/name="uuid" value="([^"]+)"/);
  const uuid = uuidMatch ? uuidMatch[1] : "";
  const confirmMatch = html.match(/name="confirm" value="([^"]+)"/) || html.match(/confirm=([0-9a-zA-Z_-]+)/);
  const confirm = confirmMatch ? confirmMatch[1] : "t";

  const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${confirm}&uuid=${uuid}`;

  const session = { downloadUrl, cookie, timestamp: Date.now() };
  driveSessionCache.set(fileId, session);
  return session;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security and CSP headers allowing all media sources (Firebase Storage, Google Drive, Mux, Supabase, etc.)
  app.use((_req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://identitytoolkit.googleapis.com https://*.firebaseapp.com https://*.mux.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https: http:; media-src 'self' blob: data: https: http:; connect-src 'self' blob: data: https: wss:; frame-src 'self' https: http:; worker-src 'self' blob:; object-src 'none'; base-uri 'self';"
    );
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Stream Drive video endpoint supporting HTTP 206 Partial Content (Range requests)
  app.get("/api/video/stream/:fileId", async (req, res) => {
    const fileId = req.params.fileId;
    if (!fileId) {
      return res.status(400).send("File ID required");
    }

    try {
      const { downloadUrl, cookie } = await getDriveDownloadSession(fileId);
      const rangeHeader = req.headers.range;

      const fetchHeaders: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      };

      if (cookie) {
        fetchHeaders["Cookie"] = cookie;
      }
      if (rangeHeader) {
        fetchHeaders["Range"] = rangeHeader;
      }

      let videoRes = await fetch(downloadUrl, { headers: fetchHeaders });

      // If token expired or redirected, refresh session once
      if (videoRes.status === 403 || videoRes.status === 404 || !videoRes.ok && videoRes.status !== 206) {
        driveSessionCache.delete(fileId);
        const refreshed = await getDriveDownloadSession(fileId);
        if (refreshed.cookie) fetchHeaders["Cookie"] = refreshed.cookie;
        videoRes = await fetch(refreshed.downloadUrl, { headers: fetchHeaders });
      }

      const contentType = videoRes.headers.get("content-type") || "video/mp4";
      const contentLength = videoRes.headers.get("content-length");
      const contentRange = videoRes.headers.get("content-range");
      const acceptRanges = videoRes.headers.get("accept-ranges") || "bytes";

      res.status(videoRes.status);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Accept-Ranges", acceptRanges);
      res.setHeader("Cache-Control", "public, max-age=3600");

      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }
      if (contentRange) {
        res.setHeader("Content-Range", contentRange);
      }

      if (!videoRes.body) {
        return res.end();
      }

      // Pipe web stream to Node response stream
      // @ts-ignore
      const nodeStream = Readable.fromWeb(videoRes.body);
      nodeStream.on("error", (err) => {
        console.error("Stream error:", err);
      });
      nodeStream.pipe(res);
    } catch (err: any) {
      console.error("Error streaming video from drive:", err);
      res.status(500).send("Error streaming video");
    }
  });

  // Universal video proxy with HTTP 206 Partial Content (Range requests) for same-origin bypass of CSP
  app.get(["/api/video/proxy", "/api/video/recap"], async (req, res) => {
    let targetUrl = "";

    // 1. Check for base64 encoded URL parameter (safest for complex URLs with %2F, tokens, and query params)
    if (typeof req.query.b64 === "string" && req.query.b64.trim() !== "") {
      try {
        const decoded = Buffer.from(req.query.b64.trim(), "base64").toString("utf-8");
        if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
          targetUrl = decoded;
        }
      } catch (err) {
        console.error("Failed to decode base64 video URL:", err);
      }
    }

    // 2. Direct url parameter fallback
    if (!targetUrl && typeof req.query.url === "string" && req.query.url.trim() !== "") {
      const qUrl = req.query.url.trim();
      if (qUrl.startsWith("http://") || qUrl.startsWith("https://")) {
        targetUrl = qUrl;
      }
    }

    // 3. Fallback extraction from raw req.originalUrl (preserves embedded query parameters)
    if (!targetUrl) {
      const fullUrlMatch = req.originalUrl.match(/[?&]url=(.+)$/);
      if (fullUrlMatch && fullUrlMatch[1]) {
        try {
          let candidate = fullUrlMatch[1].trim();
          if (candidate.startsWith("http%3A") || candidate.startsWith("https%3A")) {
            candidate = decodeURIComponent(candidate);
          }
          if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
            targetUrl = candidate;
          }
        } catch (parseErr) {
          // ignore
        }
      }
    }

    // 4. Default fallback if no valid target URL is found
    if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
      targetUrl = "https://axzyhjprterixsgqhddv.supabase.co/storage/v1/object/public/videos/Recap_TA%20BACHATA%20ACADEMY(1).mp4";
    }

    try {
      const rangeHeader = req.headers.range;
      const fetchHeaders: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      };
      if (rangeHeader) {
        fetchHeaders["Range"] = rangeHeader;
      }

      const videoRes = await fetch(targetUrl, { headers: fetchHeaders });
      if (!videoRes.ok && videoRes.status !== 206) {
        console.warn(`Video upstream returned status ${videoRes.status} for ${targetUrl}`);
        const fallbackPath = path.join(process.cwd(), "public", "videos", "recap_ta.mp4");
        if (fs.existsSync(fallbackPath)) {
          return res.sendFile(fallbackPath);
        }
        return res.status(videoRes.status).send(`Upstream video responded with status ${videoRes.status}`);
      }

      const contentType = videoRes.headers.get("content-type") || "video/mp4";
      const contentLength = videoRes.headers.get("content-length");
      const contentRange = videoRes.headers.get("content-range");
      const acceptRanges = videoRes.headers.get("accept-ranges") || "bytes";

      res.status(videoRes.status);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Accept-Ranges", acceptRanges);
      res.setHeader("Cache-Control", "public, max-age=86400");

      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }
      if (contentRange) {
        res.setHeader("Content-Range", contentRange);
      }

      if (!videoRes.body) {
        return res.end();
      }

      // @ts-ignore
      const nodeStream = Readable.fromWeb(videoRes.body);
      nodeStream.on("error", (err) => {
        console.error("Stream error on video proxy:", err);
      });
      nodeStream.pipe(res);
    } catch (err: any) {
      console.error("Error streaming video proxy:", err);
      const fallbackPath = path.join(process.cwd(), "public", "videos", "recap_ta.mp4");
      if (fs.existsSync(fallbackPath)) {
        return res.sendFile(fallbackPath);
      }
      res.status(500).send("Error proxying video");
    }
  });

  // Image proxy to securely bypass CSP restrictions on external thumbnail / poster images
  app.get("/api/image/proxy", async (req, res) => {
    const queryUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
    if (!queryUrl || (!queryUrl.startsWith("http://") && !queryUrl.startsWith("https://"))) {
      return res.status(400).send("Valid URL parameter required");
    }

    try {
      const imgRes = await fetch(queryUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (!imgRes.ok) {
        return res.status(imgRes.status).send("Failed to fetch image");
      }

      const contentType = imgRes.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=604800");

      if (!imgRes.body) {
        return res.end();
      }

      // @ts-ignore
      const nodeStream = Readable.fromWeb(imgRes.body);
      nodeStream.on("error", (err) => {
        console.error("Stream error on /api/image/proxy:", err);
      });
      nodeStream.pipe(res);
    } catch (err: any) {
      console.error("Error proxying image:", err);
      res.status(500).send("Error fetching image");
    }
  });

  // Video file upload and processing endpoint for Directors/Admins
  app.post("/api/upload-video", (req, res) => {
    upload.single("video")(req, res, async (err: any) => {
      if (err) {
        console.error("Multer upload error:", err);
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              success: false,
              message: "El video supera el límite de 150MB. Por favor seleccioná un archivo más liviano o comprimido.",
            });
          }
          return res.status(400).json({
            success: false,
            message: `Error al subir el video: ${err.message}`,
          });
        }
        return res.status(400).json({
          success: false,
          message: err?.message || "Error al procesar el archivo de video",
        });
      }

      try {
        if (!req.file) {
          return res.status(400).json({ success: false, message: "No se recibió ningún archivo de video" });
        }

        const tempPath = req.file.path;
        const timestamp = Date.now();
        const finalVideoName = `recap_custom_${timestamp}.mp4`;
        const finalPosterName = `recap_custom_${timestamp}_poster.jpg`;
        const finalVideoPath = path.join(uploadsDir, finalVideoName);
        const finalPosterPath = path.join(uploadsDir, finalPosterName);

        // Clean up previous custom uploaded video files in uploads directory to save disk space
        try {
          const existingFiles = fs.readdirSync(uploadsDir);
          for (const file of existingFiles) {
            if (file.startsWith("recap_custom_") || file.startsWith("temp_upload_")) {
              const fullPath = path.join(uploadsDir, file);
              if (fullPath !== tempPath && fullPath !== finalVideoPath && fullPath !== finalPosterPath) {
                fs.unlink(fullPath, () => {});
              }
            }
          }
        } catch (cleanErr) {
          console.warn("Notice during previous video cleanup:", cleanErr);
        }

        // Fast optimize video for web streamable playback (faststart) without slow CPU re-encoding
        let transcodeSuccess = false;
        try {
          // Fast atom shift (<1s)
          await execAsync(`ffmpeg -y -i "${tempPath}" -c copy -movflags +faststart "${finalVideoPath}"`);
          transcodeSuccess = true;
        } catch (fastErr) {
          console.warn("Fast copy failed, falling back to direct copy:", fastErr);
          try {
            fs.copyFileSync(tempPath, finalVideoPath);
            transcodeSuccess = true;
          } catch (copyErr) {
            console.error("Direct copy failed:", copyErr);
          }
        }

        // Generate poster frame from video in background / quickly
        let posterSuccess = false;
        try {
          await execAsync(`ffmpeg -y -ss 00:00:00.5 -i "${finalVideoPath}" -frames:v 1 -q:v 2 "${finalPosterPath}"`);
          posterSuccess = true;
        } catch (posterErr) {
          console.warn("Could not generate poster thumbnail from video with ffmpeg:", posterErr);
        }

        // Remove the temp upload file if different from final
        if (fs.existsSync(tempPath) && tempPath !== finalVideoPath) {
          fs.unlink(tempPath, () => {});
        }

        const videoUrl = `/videos/uploads/${finalVideoName}`;
        const posterUrl = posterSuccess ? `/videos/uploads/${finalPosterName}` : undefined;

        return res.json({
          success: true,
          videoUrl,
          posterUrl,
          message: "Video procesado y guardado exitosamente"
        });
      } catch (err: any) {
        console.error("Error in /api/upload-video processing:", err);
        return res.status(500).json({
          success: false,
          message: err?.message || "Error al procesar el archivo de video en el servidor"
        });
      }
    });
  });

  // Resilient route for uploaded video files with automatic range headers and latest-file fallback
  app.get("/videos/uploads/:filename", (req, res) => {
    const filename = path.basename(req.params.filename);
    const requestedPath = path.join(uploadsDir, filename);

    if (fs.existsSync(requestedPath)) {
      if (filename.endsWith(".mp4")) {
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Accept-Ranges", "bytes");
      }
      return res.sendFile(requestedPath);
    }

    // Fallback: If specific timestamp file is not found (e.g. from previous upload session),
    // find the latest available uploaded video or poster
    try {
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        const isPoster = filename.endsWith(".jpg") || filename.endsWith(".png") || filename.endsWith(".jpeg");
        const matchingFiles = files.filter((f) =>
          isPoster ? f.endsWith(".jpg") || f.endsWith(".png") || f.endsWith(".jpeg") : f.endsWith(".mp4")
        );

        if (matchingFiles.length > 0) {
          matchingFiles.sort((a, b) => {
            const statA = fs.statSync(path.join(uploadsDir, a));
            const statB = fs.statSync(path.join(uploadsDir, b));
            return statB.mtimeMs - statA.mtimeMs;
          });
          const latestFile = path.join(uploadsDir, matchingFiles[0]);
          if (latestFile.endsWith(".mp4")) {
            res.setHeader("Content-Type", "video/mp4");
            res.setHeader("Accept-Ranges", "bytes");
          }
          return res.sendFile(latestFile);
        }
      }
    } catch (fallbackErr) {
      console.warn("Fallback lookup in /videos/uploads:", fallbackErr);
    }

    return res.status(404).send("Video file not found");
  });

  // Explicit static route for uploads directory with range request support
  app.use("/videos/uploads", express.static(uploadsDir, {
    maxAge: "1d",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".mp4")) {
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Accept-Ranges", "bytes");
      }
    }
  }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Serve static assets from public folder with Range header support for video streaming
  const publicPath = path.join(process.cwd(), "public");
  app.use(express.static(publicPath, {
    maxAge: "1d",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".mp4")) {
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Accept-Ranges", "bytes");
      }
    }
  }));

  // Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "custom",
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      // Skip API and video routes
      if (req.originalUrl.startsWith("/api/") || req.originalUrl.startsWith("/videos/")) {
        return next();
      }
      try {
        const indexPath = path.join(process.cwd(), "index.html");
        let template = fs.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.originalUrl.startsWith("/api/") || req.originalUrl.startsWith("/videos/")) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
