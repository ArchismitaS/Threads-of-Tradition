const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const STATE_PATH = path.join(ROOT, "data", "state.json");

const defaultLessons = [
  {
    id: "greetings",
    title: "Greeting Rituals Around the World",
    summary: "Understand why bows, handshakes, and cheek-kisses carry deep cultural meaning.",
    meta: "5 minutes · Beginner",
  },
  {
    id: "festivals",
    title: "Festival Traditions",
    summary: "Discover food, music, and symbols behind major seasonal festivals globally.",
    meta: "7 minutes · Beginner",
  },
  {
    id: "family",
    title: "Family & Community Values",
    summary: "Compare social norms around family roles, hospitality, and intergenerational respect.",
    meta: "8 minutes · Intermediate",
  },
  {
    id: "language",
    title: "Language, Proverbs & Identity",
    summary: "Learn how sayings and expressions preserve history, humor, and cultural wisdom.",
    meta: "10 minutes · Intermediate",
  },
];

const defaultNews = [
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
  { id: "greetings", title: "Greeting Rituals Around the World", summary: "Understand why bows, handshakes, and cheek-kisses carry deep cultural meaning.", meta: "5 minutes · Beginner" },
  { id: "festivals", title: "Festival Traditions", summary: "Discover food, music, and symbols behind major seasonal festivals globally.", meta: "7 minutes · Beginner" },
  { id: "family", title: "Family & Community Values", summary: "Compare social norms around family roles, hospitality, and intergenerational respect.", meta: "8 minutes · Intermediate" },
  { id: "language", title: "Language, Proverbs & Identity", summary: "Learn how sayings and expressions preserve history, humor, and cultural wisdom.", meta: "10 minutes · Intermediate" },
];

const defaultNews = [
  { id: "unesco-restoration", title: "UNESCO Supports Restoration of Historic Cultural Sites", source: "Global Heritage Journal", date: "2026-02-12", summary: "A new preservation initiative is funding restoration work for community-led heritage landmarks across multiple regions.", url: "https://example.com/news/unesco-restoration" },
  { id: "diaspora-festival", title: "Diaspora Festival Highlights Intergenerational Food Traditions", source: "Culture Now", date: "2026-02-11", summary: "Cities worldwide are hosting culinary storytelling events where families share migration histories through traditional dishes.", url: "https://example.com/news/diaspora-festival" },
  { id: "language-revival", title: "Community Schools Expand Indigenous Language Revival Programs", source: "World Learning Desk", date: "2026-02-10", summary: "Grassroots education groups report rising youth participation in heritage language and oral tradition workshops.", url: "https://example.com/news/language-revival" },
  { id: "museum-repatriation", title: "Museums Announce New Repatriation Partnerships", source: "Arts & Society News", date: "2026-02-09", summary: "Institutions are collaborating with cultural councils to return artifacts and co-curate community narratives.", url: "https://example.com/news/museum-repatriation" },
];

const defaultProfile = {
  displayName: "Cultural Learner",
  region: "Global",
  bio: "Exploring the world one tradition at a time.",
  learningGoal: "Build daily cultural literacy habits.",
};

function normalizeLesson(lesson) {
  return {
    id: String(lesson.id || "").trim(),
    title: String(lesson.title || "Untitled lesson").trim(),
    summary: String(lesson.summary || "").trim(),
    meta: String(lesson.meta || "Custom").trim(),
  };
}

function normalizeNews(news) {
  return {
    id: String(news.id || "").trim(),
    title: String(news.title || "Untitled news").trim(),
    source: String(news.source || "Community submission").trim(),
    date: String(news.date || new Date().toISOString().slice(0, 10)).trim(),
    summary: String(news.summary || "").trim(),
    url: String(news.url || "https://example.com").trim(),
  };
}

function allLessonIds(state) {
  return [...defaultLessons, ...state.customLessons].map((item) => item.id);
}

function allNewsIds(state) {
  return [...defaultNews, ...state.customNews].map((item) => item.id);
}

function readState() {
  const raw = fs.readFileSync(STATE_PATH, "utf8");
  const parsed = JSON.parse(raw);

  const customLessons = Array.isArray(parsed.customLessons)
    ? parsed.customLessons.map(normalizeLesson).filter((item) => item.id)
    : [];

  const customNews = Array.isArray(parsed.customNews)
    ? parsed.customNews.map(normalizeNews).filter((item) => item.id)
    : [];

  const readNews = Array.isArray(parsed.readNews)
    ? parsed.readNews
    : Array.isArray(parsed.readStories)
      ? parsed.readStories
      : [];

  const profile = {
    ...defaultProfile,
    ...(parsed.profile || {}),
  };

  const state = {
    completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
    readNews,
    streak: Number.isFinite(parsed.streak) ? parsed.streak : 1,
    badges: Array.isArray(parsed.badges) && parsed.badges.length ? parsed.badges : ["First Steps"],
    customLessons,
    customNews,
    profile,
  };

  state.completedLessons = state.completedLessons.filter((id) => allLessonIds(state).includes(id));
  state.readNews = state.readNews.filter((id) => allNewsIds(state).includes(id));

  return state;
}

function writeState(state) {
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

function ensureBadge(state, name) {
  if (!state.badges.includes(name)) {
    state.badges.push(name);
  }
}

function getLessonsCatalog(state) {
  return [...defaultLessons, ...state.customLessons];
}

function getNewsFeed(state) {
  return [...defaultNews, ...state.customNews];
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
function readState() {
  try {
    const raw = fs.readFileSync(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw || "{}");
    return {
      completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
      readNews: Array.isArray(parsed.readNews) ? parsed.readNews : [],
      streak: Number.isFinite(parsed.streak) ? parsed.streak : 1,
      badges: Array.isArray(parsed.badges) && parsed.badges.length ? parsed.badges : ["First Steps"],
      customLessons: Array.isArray(parsed.customLessons) ? parsed.customLessons : [],
      customNews: Array.isArray(parsed.customNews) ? parsed.customNews : [],
      profile: typeof parsed.profile === "object" && parsed.profile ? parsed.profile : { ...defaultProfile },
    };
  } catch (err) {
    return {
      completedLessons: [],
      readNews: [],
      streak: 1,
      badges: ["First Steps"],
      customLessons: [],
      customNews: [],
      profile: { ...defaultProfile },
    };
  }
}

function writeState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
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

function makeId(prefix, text) {
  const slug = String(text || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `${prefix}-${slug || "item"}-${Date.now().toString(36)}`;
}

async function parseJsonBody(req, res) {
  const body = await collectBody(req);
  try {
    return JSON.parse(body || "{}");
  } catch {
    badRequest(res, "Invalid JSON body");
    return null;
  }
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/health" && req.method === "GET") {
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/lessons" && req.method === "GET") {
    const state = readState();
    return json(res, 200, getLessonsCatalog(state));
  }

  if (pathname === "/api/news" && req.method === "GET") {
    const state = readState();
    return json(res, 200, getNewsFeed(state));
  }

  if (pathname === "/api/profile" && req.method === "GET") {
    const state = readState();
    return json(res, 200, state.profile);
  }

  if (pathname === "/api/profile" && req.method === "PUT") {
    const payload = await parseJsonBody(req, res);
    if (!payload) return;

    const state = readState();
    state.profile = {
      ...defaultProfile,
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml" };
  return map[ext] || "application/octet-stream";
}

async function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; if (body.length > 1e6) { req.destroy(); reject(new Error("Request too large")); } });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
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
    "/profile": "/profile.html",
  };
  const normalized = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  if (routes[normalized]) return routes[normalized];
  return pathname;
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/health" && req.method === "GET") return json(res, 200, { ok: true });
  if (pathname === "/api/lessons" && req.method === "GET") { const state = readState(); return json(res, 200, [...defaultLessons, ...state.customLessons]); }
  if (pathname === "/api/news" && req.method === "GET") { const state = readState(); return json(res, 200, [...defaultNews, ...state.customNews]); }
  if (pathname === "/api/state" && req.method === "GET") { const state = readState(); return json(res, 200, { completedLessons: state.completedLessons, readNews: state.readNews, streak: state.streak, badges: state.badges }); }

  if (pathname === "/api/profile" && req.method === "GET") { const state = readState(); return json(res, 200, state.profile); }
  if (pathname === "/api/profile" && req.method === "PUT") {
    const body = await collectBody(req);
    let payload;
    try { payload = JSON.parse(body || "{}"); } catch { return json(res, 400, { error: "Invalid JSON body" }); }
    const state = readState();
    state.profile = {
      displayName: String(payload.displayName || defaultProfile.displayName).slice(0, 80),
      region: String(payload.region || defaultProfile.region).slice(0, 80),
      bio: String(payload.bio || defaultProfile.bio).slice(0, 400),
      learningGoal: String(payload.learningGoal || defaultProfile.learningGoal).slice(0, 200),
    };
    writeState(state);
    return json(res, 200, state.profile);
  }

  if (pathname === "/api/lessons" && req.method === "POST") {
    const payload = await parseJsonBody(req, res);
    if (!payload) return;

    const title = String(payload.title || "").trim();
    if (!title) return badRequest(res, "Lesson title is required");

    const lesson = normalizeLesson({
      id: makeId("lesson", title),
      title,
      summary: String(payload.summary || "Community-created lesson").trim(),
      meta: `${String(payload.duration || "5 minutes").trim()} · ${String(payload.level || "Custom").trim()}`,
    });

    const state = readState();
    state.customLessons.push(lesson);
    writeState(state);
    return json(res, 201, lesson);
  }

  if (pathname === "/api/news" && req.method === "POST") {
    const payload = await parseJsonBody(req, res);
    if (!payload) return;

    const title = String(payload.title || "").trim();
    if (!title) return badRequest(res, "News title is required");

    const item = normalizeNews({
      id: makeId("news", title),
      title,
      source: String(payload.source || "Community Desk").trim(),
      date: String(payload.date || new Date().toISOString().slice(0, 10)).trim(),
      summary: String(payload.summary || "Community submitted cultural update.").trim(),
      url: String(payload.url || "https://example.com").trim(),
    });

    const state = readState();
    state.customNews.push(item);
    writeState(state);
    return json(res, 201, item);
  }

  if (pathname === "/api/state" && req.method === "GET") {
    return json(res, 200, readState());
  }

  if (pathname === "/api/reset" && req.method === "POST") {
    const reset = {
      completedLessons: [],
      readNews: [],
      streak: 1,
      badges: ["First Steps"],
      customLessons: [],
      customNews: [],
      profile: { ...defaultProfile },
    };
    writeState(reset);
    return json(res, 200, reset);
  }

  const lessonMatch = pathname.match(/^\/api\/lessons\/([a-z0-9-]+)\/toggle$/);
  if (lessonMatch && req.method === "POST") {
    const id = lessonMatch[1];
    const state = readState();
    if (!allLessonIds(state).includes(id)) return badRequest(res, "Unknown lesson id");

    if (state.completedLessons.includes(id)) {
      state.completedLessons = state.completedLessons.filter((entry) => entry !== id);
    } else {
      state.completedLessons.push(id);
      state.streak += 1;
    }

    if (state.completedLessons.length >= allLessonIds(state).length) {
      ensureBadge(state, "Lesson Pathfinder");
    }

    writeState(state);
    return json(res, 200, state);
  }

  const newsMatch = pathname.match(/^\/api\/(news|stories)\/([a-z0-9-]+)\/toggle$/);
  if (newsMatch && req.method === "POST") {
    const id = newsMatch[2];
    const state = readState();
    if (!allNewsIds(state).includes(id)) return badRequest(res, "Unknown news id");

    if (state.readNews.includes(id)) {
      state.readNews = state.readNews.filter((entry) => entry !== id);
    } else {
      state.readNews.push(id);
    }

    if (state.readNews.length >= allNewsIds(state).length) {
      ensureBadge(state, "News Explorer");
    }

    writeState(state);
    return json(res, 200, state);
    const body = await collectBody(req);
    let payload;
    try { payload = JSON.parse(body || "{}"); } catch { return json(res, 400, { error: "Invalid JSON body" }); }
    const title = String(payload.title || "").trim(); if (!title) return json(res, 400, { error: "Lesson title is required" });
    const id = `lesson-${Date.now().toString(36)}`;
    const lesson = { id, title, summary: String(payload.summary || "Community-created lesson"), meta: `${String(payload.duration || "5 minutes")} · ${String(payload.level || "Custom")}` };
    const state = readState(); state.customLessons.push(lesson); writeState(state); return json(res, 201, lesson);
  }

  if (pathname.match(/^\/api\/lessons\/[a-z-]+\/toggle$/) && req.method === "POST") {
    const id = pathname.split("/")[3];
    const state = readState();
    if (state.completedLessons.includes(id)) state.completedLessons = state.completedLessons.filter((x) => x !== id);
    else { state.completedLessons.push(id); state.streak = (state.streak || 1) + 1; }
    if ((state.completedLessons || []).length >= defaultLessons.length) { if (!state.badges.includes("Lesson Pathfinder")) state.badges.push("Lesson Pathfinder"); }
    writeState(state); return json(res, 200, state);
  }

  if (pathname === "/api/news" && req.method === "POST") {
    const body = await collectBody(req);
    let payload;
    try { payload = JSON.parse(body || "{}"); } catch { return json(res, 400, { error: "Invalid JSON body" }); }
    const id = `news-${Date.now().toString(36)}`;
    const item = { id, title: String(payload.title || "Untitled"), source: String(payload.source || "Community"), date: String(payload.date || new Date().toISOString().slice(0,10)), summary: String(payload.summary || ""), url: String(payload.url || "https://example.com") };
    const state = readState(); state.customNews.push(item); writeState(state); return json(res, 201, item);
  }

  if (pathname.match(/^\/api\/(news|stories)\/[a-z-]+\/toggle$/) && req.method === "POST") {
    const id = pathname.split("/")[3];
    const state = readState();
    if (state.readNews.includes(id)) state.readNews = state.readNews.filter((x) => x !== id);
    else state.readNews.push(id);
    if ((state.readNews || []).length >= defaultNews.length) { if (!state.badges.includes("News Explorer")) state.badges.push("News Explorer"); }
    writeState(state); return json(res, 200, state);
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
    "/profile": "/profile.html",
  };

  if (routes[pathname]) return routes[pathname];
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
  if (!fullPath.startsWith(ROOT)) { res.writeHead(403); res.end("Forbidden"); return; }

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      const altPath = fullPath + ".html";
      fs.readFile(altPath, (altErr, altContent) => {
        if (!altErr) {
          res.writeHead(200, { "Content-Type": getContentType(altPath) }); res.end(altContent); return;
        }
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Not Found");
      });
      return;
    }
    res.writeHead(200, { "Content-Type": getContentType(fullPath) }); res.end(content);
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
    console.log(`Request: ${req.method} ${url.pathname}`);
    if (url.pathname.startsWith("/api/")) { await handleApi(req, res, url.pathname); return; }
    serveStatic(req, res, url.pathname);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify({ error: "Internal server error", detail: err.message }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Threads of Tradition server running at http://${HOST}:${PORT}`);
});
