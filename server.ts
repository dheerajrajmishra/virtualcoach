import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { initializeApp, getApps } from 'firebase-admin/app';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin (assuming credentials are in env or default)
if (!getApps().length) {
  initializeApp();
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const upload = multer({ storage: multer.memoryStorage() });

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Training Upload API
  app.post("/api/trainings/upload", upload.fields([
    { name: 'slides', maxCount: 1 },
    { name: 'transcripts', maxCount: 1 },
    { name: 'faqs', maxCount: 1 },
    { name: 'quizzes', maxCount: 1 }
  ]), async (req: any, res) => {
    try {
      // In a real app, we'd parse files here
      // For this prototype, we'll simulate the successful receipt
      const body = req.body;
      const files = req.files as { [fieldname: string]: any[] };

      console.log("Upload received:", body.name);

      res.status(200).json({
        message: "Files uploaded. Triggering asset generation...",
        trainingId: "temp-" + Date.now()
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // TTS Proxy (using Google Cloud TTS)
  app.post("/api/tts", async (req, res) => {
    // This would call @google-cloud/text-to-speech
    res.json({ message: "TTS generated", audioUrl: "/mock-audio.mp3" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "localhost", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
