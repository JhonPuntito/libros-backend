import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json({ limit: "1mb" }));

// CORS: permite solo el origen que pongas en ALLOWED_ORIGIN (o '*' si no lo pones)
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
app.use(cors({
  origin: (origin, cb) => {
    // permitir requests sin origin (p. ej. curl) y permitir el origin si coincide o si '*' está configurado
    if (!origin || allowedOrigin === "*" || origin === allowedOrigin) return cb(null, true);
    return cb(new Error("Origin not allowed by CORS"));
  }
}));

const GITHUB_REPO = process.env.GH_REPO || "JhonPuntito/Libros"; // owner/repo
const GITHUB_TOKEN = process.env.GH_TOKEN;
if (!GITHUB_TOKEN) {
  console.warn("WARNING: GH_TOKEN no está configurado. El endpoint fallará.");
}

app.get("/", (req, res) => res.json({ ok: true, repo: GITHUB_REPO }));

app.post("/update-books", async (req, res) => {
  try {
    const books = req.body.books;
    if (!books) return res.status(400).json({ error: "No se recibió 'books' en el body" });

    const payload = {
      event_type: "update-books",
      client_payload: { content: JSON.stringify(books) }
    };

    const ghRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await ghRes.text();
    if (!ghRes.ok) {
      return res.status(ghRes.status).json({ ok: false, status: ghRes.status, detail: text });
    }

    return res.json({ ok: true, message: "Workflow disparado" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT} — GH_REPO=${GITHUB_REPO}`));
