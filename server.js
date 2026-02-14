const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const STATE_PATH = path.join(ROOT, "data", "state.json");

const lessonIds = ["greetings", "festivals", "family", "language"];
const storyIds = ["lantern-maker", "bread-neighborhood", "drumbeats-sunset"];

function readState() {
  const raw = fs.readFileSync(STATE_PATH, "utf8");
  const parsed = JSON.parse(raw);

  return {
    completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
    readStories: Array.isArray(parsed.readStories) ? parsed.readStories : [],
    streak: Number.isFinite(parsed.streak) ? parsed.streak : 1,
    badges: Array.isArray(parsed.badges) && parsed.badges.length ? parsed.badges : ["First Steps"],
  };
}

function writeState(state) {
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

function ensureBadge(state, name) {
  if (!state.badges.includes(name)) {
    state.badges.push(name);
  }
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error("Request too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function json(res, code, payload) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function notFound(res) {
  json(res, 404, { error: "Not found" });
}

function badRequest(res, message) {
  json(res, 400, { error: message });
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
  };
  return map[ext] || "application/octet-stream";
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/health" && req.method === "GET") {
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/state" && req.method === "GET") {
    return json(res, 200, readState());
  }

  if (pathname === "/api/state" && req.method === "PUT") {
    const body = await collectBody(req);
    let payload;
    try {
      payload = JSON.parse(body || "{}");
    } catch {
      return badRequest(res, "Invalid JSON body");
    }

    const next = {
      completedLessons: Array.isArray(payload.completedLessons)
        ? payload.completedLessons.filter((id) => lessonIds.includes(id))
        : [],
      readStories: Array.isArray(payload.readStories)
        ? payload.readStories.filter((id) => storyIds.includes(id))
        : [],
      streak: Number.isFinite(payload.streak) && payload.streak > 0 ? payload.streak : 1,
      badges: Array.isArray(payload.badges) && payload.badges.length
        ? payload.badges.map((badge) => String(badge))
        : ["First Steps"],
    };

    writeState(next);
    return json(res, 200, next);
  }

  if (pathname === "/api/reset" && req.method === "POST") {
    const reset = {
      completedLessons: [],
      readStories: [],
      streak: 1,
      badges: ["First Steps"],
    };
    writeState(reset);
    return json(res, 200, reset);
  }

  const lessonMatch = pathname.match(/^\/api\/lessons\/([a-z-]+)\/toggle$/);
  if (lessonMatch && req.method === "POST") {
    const id = lessonMatch[1];
    if (!lessonIds.includes(id)) {
      return badRequest(res, "Unknown lesson id");
    }

    const state = readState();
    if (state.completedLessons.includes(id)) {
      state.completedLessons = state.completedLessons.filter((entry) => entry !== id);
    } else {
      state.completedLessons.push(id);
      state.streak += 1;
    }

    if (state.completedLessons.length >= lessonIds.length) {
      ensureBadge(state, "Lesson Pathfinder");
    }

    writeState(state);
    return json(res, 200, state);
  }

  const storyMatch = pathname.match(/^\/api\/stories\/([a-z-]+)\/toggle$/);
  if (storyMatch && req.method === "POST") {
    const id = storyMatch[1];
    if (!storyIds.includes(id)) {
      return badRequest(res, "Unknown story id");
    }

    const state = readState();
    if (state.readStories.includes(id)) {
      state.readStories = state.readStories.filter((entry) => entry !== id);
    } else {
      state.readStories.push(id);
    }

    if (state.readStories.length >= storyIds.length) {
      ensureBadge(state, "Story Seeker");
    }

    writeState(state);
    return json(res, 200, state);
  }

  return notFound(res);
}

function serveStatic(req, res, pathname) {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  const requested = path.normalize(cleanPath).replace(/^\/+/, "");
  const fullPath = path.join(ROOT, requested);

  if (!fullPath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    res.writeHead(200, { "Content-Type": getContentType(fullPath) });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname);
      return;
    }

    serveStatic(req, res, url.pathname);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Internal server error", detail: err.message }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Threads of Tradition server running at http://${HOST}:${PORT}`);
});
