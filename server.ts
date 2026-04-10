import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import archiver from "archiver";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || (file.mimetype === 'model/gltf-binary' ? '.glb' : '.jpg');
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({ storage: storage });

// In-memory session store
const sessions = new Map<string, any>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/sessions", (req, res) => {
    const sessionId = uuidv4();
    sessions.set(sessionId, {
      id: sessionId,
      status: "capturing",
      image_urls: [],
      model_url: null,
    });
    res.json({ sessionId });
  });

  app.post("/api/upload/:sessionId", upload.array("images", 20), (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      const urls = files.map((f) => `/uploads/${f.filename}`);
      session.image_urls.push(...urls);
    }

    session.status = "uploaded";
    res.json({ success: true, session });
  });

  app.get("/api/download-images/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session || !session.image_urls || session.image_urls.length === 0) {
      return res.status(404).json({ error: "No images found for this session" });
    }

    res.attachment(`scan-${sessionId}.zip`);
    const archive = archiver("zip", { zlib: { level: 9 } });
    
    archive.on("error", (err) => {
      res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    session.image_urls.forEach((url: string, index: number) => {
      const filePath = path.join(process.cwd(), url);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `image_${index.toString().padStart(3, '0')}.jpg` });
      }
    });

    archive.finalize();
  });

  app.post("/api/upload-model/:sessionId", upload.single("model"), (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No model file uploaded" });
    }

    session.model_url = `/uploads/${req.file.filename}`;
    session.status = "completed";
    res.json({ success: true, session });
  });

  app.post("/api/generate-model/:sessionId", async (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Assign a high-quality default model for the demo
    session.model_url = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
    session.status = "completed";
    
    res.json({ success: true, session });
  });

  app.post("/api/generate-single-image/:sessionId", async (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Simulate the delay of a public AI API (like Hugging Face TripoSR)
    // In a real production app, this would make a fetch() call to the AI API
    // passing the uploaded image and waiting for the .glb response.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Assign a high-quality default model for the demo
    session.model_url = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
    session.status = "completed";
    
    res.json({ success: true, session });
  });

  app.get("/api/sessions/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({ session });
  });

  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
