const lessonIds = ["greetings", "festivals", "family", "language"];
const newsIds = ["unesco-restoration", "diaspora-festival", "language-revival", "museum-repatriation"];

const defaultState = {
  completedLessons: [],
  readNews: [],
  streak: 1,
  badges: ["First Steps"],
  profile: {
    displayName: "Cultural Learner",
    region: "Global",
    bio: "Exploring the world one tradition at a time.",
    learningGoal: "Build daily cultural literacy habits.",
  },
};

let state = { ...defaultState };
let lessonCatalog = [];
let newsCatalog = [];

async function api(path, options) {
  const response = await fetch(path, options);
  if (!response.ok) throw new Error(`Request failed: ${path}`);
  return response.json();
}

const apiGetState = () => api("/api/state");
const apiGetLessons = () => api("/api/lessons");
const apiGetNews = () => api("/api/news");
const apiGetProfile = () => api("/api/profile");
const apiToggleLesson = (id) => api(`/api/lessons/${id}/toggle`, { method: "POST" });
const apiToggleNews = (id) => api(`/api/news/${id}/toggle`, { method: "POST" });
const apiAddLesson = (payload) =>
  api("/api/lessons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
const apiAddNews = (payload) =>
  api("/api/news", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
const apiSaveProfile = (payload) =>
  api("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

function setMessage(selector, text, isError = false) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "#ff9cae" : "";
};

let state = { ...defaultState };

async function apiGetState() {
  const res = await fetch("/api/state");
  if (!res.ok) throw new Error("Failed to fetch state");
  return res.json();
}

async function apiGetNews() {
  const res = await fetch("/api/news");
  if (!res.ok) throw new Error("Failed to fetch news");
  return res.json();
}

async function apiToggleLesson(id) {
  const res = await fetch(`/api/lessons/${id}/toggle`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to toggle lesson");
  return res.json();
}

async function apiToggleNews(id) {
  const res = await fetch(`/api/news/${id}/toggle`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to toggle news item");
  return res.json();
}

function syncHome(nextState) {
  const lessonsEl = document.querySelector("[data-stat='lessons']");
  const streakEl = document.querySelector("[data-stat='streak']");
  const badgesEl = document.querySelector("[data-stat='badges']");

  if (lessonsEl) lessonsEl.textContent = String(nextState.completedLessons.length);
  if (streakEl) streakEl.textContent = String(nextState.streak);
  if (badgesEl) badgesEl.textContent = String(nextState.badges.length);
}

async function renderLessons(nextState) {
  const container = document.querySelector("[data-lessons-list]");
  if (!container) return;

  const allLessons = await apiGetLessons();
  const custom = allLessons.filter((lesson) => lesson.id.startsWith("lesson-"));
  const defaults = allLessons.filter((lesson) => !lesson.id.startsWith("lesson-"));
  lessonCatalog = [...custom.reverse(), ...defaults];
  lessonCatalog = await apiGetLessons();
  container.innerHTML = "";

  const toggleLesson = async (id, button, checkbox) => {
    if (button) button.disabled = true;
    if (checkbox) checkbox.disabled = true;

    try {
      state = await apiToggleLesson(id);
      await renderAll(state);
      setMessage("[data-lessons-status]", "Lesson progress saved.");
    } catch (error) {
      console.error(error);
      setMessage("[data-lessons-status]", "Could not save lesson progress.", true);
      if (button) button.disabled = false;
      if (checkbox) checkbox.disabled = false;
    }
  };

  lessonCatalog.forEach((lesson) => {
    const isComplete = nextState.completedLessons.includes(lesson.id);
    const card = document.createElement("article");
    card.className = `card ${isComplete ? "is-complete" : ""}`.trim();
    card.dataset.lessonId = lesson.id;
    card.innerHTML = `
      <h2>${lesson.title}</h2>
      <p>${lesson.summary}</p>
      <p class="meta">${lesson.meta}</p>
      <div class="action-row">
        <label><input type="checkbox" ${isComplete ? "checked" : ""} /> Done</label>
        <button class="btn btn-secondary" type="button">${isComplete ? "Completed" : "Mark Complete"}</button>
      </div>
    `;

    const checkbox = card.querySelector("input[type='checkbox']");
    const button = card.querySelector("button");

    checkbox.onchange = async () => toggleLesson(lesson.id, button, checkbox);
    button.onclick = async () => toggleLesson(lesson.id, button, checkbox);

    container.appendChild(card);
  });
}

function initLessonPanel() {
  const panel = document.querySelector("[data-lesson-panel]");
  const open = document.querySelector("[data-open-lesson-panel]");
  const close = document.querySelector("[data-close-lesson-panel]");
  if (!panel || !open || !close) return;

  const openPanel = () => panel.classList.add("is-open");
  const closePanel = () => panel.classList.remove("is-open");

  open.onclick = openPanel;
  close.onclick = closePanel;
}

function initLessonForm() {
  const form = document.querySelector("[data-add-lesson-form]");
  if (!form) return;

  form.onsubmit = async (event) => {
    event.preventDefault();
    const data = new FormData(form);

    try {
      await apiAddLesson({
        title: data.get("title"),
        summary: data.get("summary"),
        duration: data.get("duration"),
        level: data.get("level"),
      });
      form.reset();
      state = await apiGetState();
      await renderAll(state);
      setMessage("[data-lessons-status]", "New lesson added to latest list.");
      setMessage("[data-lessons-status]", "New lesson added.");
    } catch (error) {
      console.error(error);
      setMessage("[data-lessons-status]", "Could not add lesson.", true);
    }
  };
}

async function renderNews(nextState) {
  const container = document.querySelector("[data-news-list]");
  if (!container) return;

  const allNews = await apiGetNews();
  const custom = allNews.filter((item) => item.id.startsWith("news-"));
  const defaults = allNews.filter((item) => !item.id.startsWith("news-"));
  newsCatalog = [...custom.reverse(), ...defaults];
  newsCatalog = await apiGetNews();
  container.innerHTML = "";

  newsCatalog.forEach((item) => {
    const isRead = nextState.readNews.includes(item.id);
    const article = document.createElement("article");
    article.className = `card ${isRead ? "is-complete" : ""}`.trim();
    article.innerHTML = `
      <h2>${item.title}</h2>
      <p>${item.summary}</p>
      <p class="meta">${item.source} · ${item.date}</p>
      <div class="action-row">
        <a class="btn btn-secondary" href="${item.url}" target="_blank" rel="noopener noreferrer">Read Source</a>
        <button class="btn btn-secondary" type="button">${isRead ? "Read" : "Mark as Read"}</button>
      </div>
    `;

    const button = article.querySelector("button");
    button.onclick = async () => {
      button.disabled = true;
      try {
        state = await apiToggleNews(item.id);
        await renderAll(state);
      } catch (error) {
        console.error(error);
        setMessage("[data-news-status]", "Could not update news status.", true);
        button.disabled = false;
      }
    };

    container.appendChild(article);
  });
}

function initNewsPanel() {
  const panel = document.querySelector("[data-news-panel]");
  const open = document.querySelector("[data-open-news-panel]");
  const close = document.querySelector("[data-close-news-panel]");
  if (!panel || !open || !close) return;

  const openPanel = () => panel.classList.add("is-open");
  const closePanel = () => panel.classList.remove("is-open");

  open.onclick = openPanel;
  close.onclick = closePanel;
}

function initNewsForm() {
  const form = document.querySelector("[data-add-news-form]");
  if (!form) return;

  form.onsubmit = async (event) => {
    event.preventDefault();
    const data = new FormData(form);

    try {
      await apiAddNews({
        title: data.get("title"),
        source: data.get("source"),
        date: data.get("date"),
        summary: data.get("summary"),
        url: data.get("url"),
      });
      form.reset();
      state = await apiGetState();
      await renderAll(state);
      setMessage("[data-news-status]", "News item added to latest list.");
      setMessage("[data-news-status]", "News item added.");
    } catch (error) {
      console.error(error);
      setMessage("[data-news-status]", "Could not add news item.", true);
    }
  };
}

function syncProgress(nextState) {
function syncLessons(nextState) {
  const lessonCards = document.querySelectorAll("[data-lesson-id]");
  if (!lessonCards.length) return;

  lessonCards.forEach((card) => {
    const id = card.dataset.lessonId;
    const checkbox = card.querySelector("input[type='checkbox']");
    const button = card.querySelector("button");
    const isComplete = nextState.completedLessons.includes(id);

    card.classList.toggle("is-complete", isComplete);
    if (checkbox) checkbox.checked = isComplete;
    if (button) {
      button.textContent = isComplete ? "Completed" : "Mark Complete";
      button.disabled = false;
      button.onclick = async () => {
        button.disabled = true;
        try {
          state = await apiToggleLesson(id);
          renderAll(state);
        } catch (error) {
          console.error(error);
          button.disabled = false;
        }
      };
    }
  });
}

function syncProgress(nextState) {
  const lessonsDone = nextState.completedLessons.length;

  const lessonsStat = document.querySelector("[data-progress='lessons']");
  const streakStat = document.querySelector("[data-progress='streak']");
  const badgesStat = document.querySelector("[data-progress='badges']");
  const milestone = document.querySelector("[data-progress='milestone']");
  const badgeList = document.querySelector("[data-progress='badge-list']");

  if (lessonsStat) lessonsStat.textContent = String(nextState.completedLessons.length);
  if (lessonsStat) lessonsStat.textContent = String(lessonsDone);
  if (streakStat) streakStat.textContent = String(nextState.streak);
  if (badgesStat) badgesStat.textContent = String(nextState.badges.length);

  if (milestone) {
    const totalLessons = lessonCatalog.length || 4;
    const totalNews = newsCatalog.length || 4;
    const remainingLessons = Math.max(0, totalLessons - nextState.completedLessons.length);
    const remainingNews = Math.max(0, totalNews - nextState.readNews.length);

    const remainingLessons = Math.max(0, lessonIds.length - lessonsDone);
    const remainingNews = Math.max(0, newsIds.length - nextState.readNews.length);
    milestone.textContent =
      remainingLessons === 0 && remainingNews === 0
        ? "All core content complete! Keep practicing daily to grow your streak."
        : `Complete ${remainingLessons} more lesson(s) and read ${remainingNews} more news item(s) to finish the core path.`;
  }

  if (badgeList) {
    badgeList.innerHTML = "";
    nextState.badges.forEach((badge) => {
      const li = document.createElement("li");
      li.textContent = badge;
      badgeList.appendChild(li);
    });
  }
}

async function initProfilePage() {
  const form = document.querySelector("[data-profile-form]");
  if (!form) return;

  try {
    const profile = await apiGetProfile();
    form.displayName.value = profile.displayName || "";
    form.region.value = profile.region || "";
    form.bio.value = profile.bio || "";
    form.learningGoal.value = profile.learningGoal || "";
  } catch (error) {
    console.error(error);
    setMessage("[data-profile-status]", "Could not load profile.", true);
  }

  form.onsubmit = async (event) => {
    event.preventDefault();
    const payload = {
      displayName: form.displayName.value,
      region: form.region.value,
      bio: form.bio.value,
      learningGoal: form.learningGoal.value,
    };

    try {
      const updated = await apiSaveProfile(payload);
      state.profile = updated;
      setMessage("[data-profile-status]", "Profile saved.");
    } catch (error) {
      console.error(error);
      setMessage("[data-profile-status]", "Could not save profile.", true);
    }
  };
async function renderNews(nextState) {
  const container = document.querySelector("[data-news-list]");
  if (!container) return;

  try {
    const items = await apiGetNews();
    container.innerHTML = "";

    items.forEach((item) => {
      const article = document.createElement("article");
      const isRead = nextState.readNews.includes(item.id);
      article.className = `card ${isRead ? "is-complete" : ""}`.trim();
      article.innerHTML = `
        <h2>${item.title}</h2>
        <p>${item.summary}</p>
        <p class="meta">${item.source} · ${item.date}</p>
        <div class="action-row">
          <a class="btn btn-secondary" href="${item.url}" target="_blank" rel="noopener noreferrer">Read Source</a>
          <button class="btn btn-secondary" type="button">${isRead ? "Read" : "Mark as Read"}</button>
        </div>
      `;

      const button = article.querySelector("button");
      button.onclick = async () => {
        button.disabled = true;
        try {
          state = await apiToggleNews(item.id);
          await renderAll(state);
        } catch (error) {
          console.error(error);
          button.disabled = false;
        }
      };

      container.appendChild(article);
    });
  } catch (error) {
    console.error(error);
    container.innerHTML = `
      <article class="card">
        <h2>Could not load cultural news</h2>
        <p>Please refresh the page after the backend is running.</p>
      </article>
    `;
  }
}

function initTraditionsFilter() {
  const input = document.querySelector("#tradition-search");
  const cards = Array.from(document.querySelectorAll("[data-tradition-title]"));
  if (!input || !cards.length) return;

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    cards.forEach((card) => {
      const title = card.dataset.traditionTitle.toLowerCase();
      const text = card.textContent.toLowerCase();
      card.hidden = Boolean(query && !title.includes(query) && !text.includes(query));
      const visible = !query || title.includes(query) || text.includes(query);
      card.hidden = !visible;
    });
  });
}

async function renderAll(nextState) {
  syncHome(nextState);
  await renderLessons(nextState);
  await renderNews(nextState);
  syncProgress(nextState);
  syncLessons(nextState);
  syncProgress(nextState);
  await renderNews(nextState);
}

async function init() {
  initTraditionsFilter();
  initLessonPanel();
  initLessonForm();
  initNewsPanel();
  initLessonForm();
  initNewsForm();
  await initProfilePage();

  try {
    const rawState = await apiGetState();
    state = {
      ...defaultState,
      ...rawState,
      readNews: Array.isArray(rawState.readNews)
        ? rawState.readNews
        : Array.isArray(rawState.readStories)
          ? rawState.readStories
          : [],
    };
  } catch (error) {
    console.error("Backend unavailable, showing defaults.", error);
    state = { ...defaultState };
  }

  try {
    await renderAll(state);
  } catch (error) {
    console.error(error);
  }
  await renderAll(state);
}

init();
