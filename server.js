const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const STATE_PATH = path.join(ROOT, "data", "state.json");

const lessonIds = ["greetings", "festivals", "family", "language"];
const newsIds = ["unesco-restoration", "diaspora-festival", "language-revival", "museum-repatriation"];

const newsFeed = [
  {
    id: "unesco-restoration",
    title: "UNESCO Supports Restoration of Historic Cultural Sites",
    source: "Global Heritage Journal",
    date: "2026-02-12",
    summary:
      "A new preservation initiative is funding restoration work for community-led heritage landmarks across multiple regions.",
    url: "https://example.com/news/unesco-restoration",
  },
  {
    id: "diaspora-festival",
    title: "Diaspora Festival Highlights Intergenerational Food Traditions",
    source: "Culture Now",
    date: "2026-02-11",
    summary:
      "Cities worldwide are hosting culinary storytelling events where families share migration histories through traditional dishes.",
    url: "https://example.com/news/diaspora-festival",
  },
  {
    id: "language-revival",
    title: "Community Schools Expand Indigenous Language Revival Programs",
    source: "World Learning Desk",
    date: "2026-02-10",
    summary:
      "Grassroots education groups report rising youth participation in heritage language and oral tradition workshops.",
    url: "https://example.com/news/language-revival",
  },
  {
    id: "museum-repatriation",
    title: "Museums Announce New Repatriation Partnerships",
    source: "Arts & Society News",
    date: "2026-02-09",
    summary:
      "Institutions are collaborating with cultural councils to return artifacts and co-curate community narratives.",
    url: "https://example.com/news/museum-repatriation",
  },
];

function readState() {
  const raw = fs.readFileSync(STATE_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const savedReadNews = Array.isArray(parsed.readNews)
    ? parsed.readNews
    : Array.isArray(parsed.readStories)
      ? parsed.readStories
      : [];

  return {
    completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
    readNews: savedReadNews,
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

  if (pathname === "/api/news" && req.method === "GET") {
    return json(res, 200, newsFeed);
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

    const incomingReadNews = Array.isArray(payload.readNews)
      ? payload.readNews
      : Array.isArray(payload.readStories)
        ? payload.readStories
        : [];

    const next = {
      completedLessons: Array.isArray(payload.completedLessons)
        ? payload.completedLessons.filter((id) => lessonIds.includes(id))
        : [],
      readNews: incomingReadNews.filter((id) => newsIds.includes(id)),
      streak: Number.isFinite(payload.streak) && payload.streak > 0 ? payload.streak : 1,
      badges:
        Array.isArray(payload.badges) && payload.badges.length
          ? payload.badges.map((badge) => String(badge))
          : ["First Steps"],
    };

    writeState(next);
    return json(res, 200, next);
  }

  if (pathname === "/api/reset" && req.method === "POST") {
    const reset = {
      completedLessons: [],
      readNews: [],
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

  const newsMatch = pathname.match(/^\/api\/(news|stories)\/([a-z-]+)\/toggle$/);
  if (newsMatch && req.method === "POST") {
    const id = newsMatch[2];
    if (!newsIds.includes(id)) {
      return badRequest(res, "Unknown news id");
    }

    const state = readState();
    if (state.readNews.includes(id)) {
      state.readNews = state.readNews.filter((entry) => entry !== id);
    } else {
      state.readNews.push(id);
    }

    if (state.readNews.length >= newsIds.length) {
      ensureBadge(state, "News Explorer");
    }

    writeState(state);
    return json(res, 200, state);
  }

  return notFound(res);
}

function resolvePathname(pathname) {
  const routes = {
    "/": "/index.html",
    "/index": "/index.html",
    "/lessons": "/lessons.html",
    "/traditions": "/traditions.html",
    "/news": "/news.html",
    "/stories": "/news.html",
    "/progress": "/progress.html",
  };

  // Normalize trailing slashes so "/lessons/" resolves like "/lessons"
  const normalized = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  if (routes[normalized]) return routes[normalized];
  return pathname;
}

function serveStatic(req, res, pathname) {
  const cleanPath = resolvePathname(pathname);
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
    console.log(`Request: ${req.method} ${url.pathname}`);

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
