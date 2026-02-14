const lessonIds = ["greetings", "festivals", "family", "language"];
const newsIds = ["unesco-restoration", "diaspora-festival", "language-revival", "museum-repatriation"];

const defaultState = {
  completedLessons: [],
  readNews: [],
  streak: 1,
  badges: ["First Steps"],
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

  if (lessonsStat) lessonsStat.textContent = String(lessonsDone);
  if (streakStat) streakStat.textContent = String(nextState.streak);
  if (badgesStat) badgesStat.textContent = String(nextState.badges.length);

  if (milestone) {
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
      const visible = !query || title.includes(query) || text.includes(query);
      card.hidden = !visible;
    });
  });
}

async function renderAll(nextState) {
  syncHome(nextState);
  syncLessons(nextState);
  syncProgress(nextState);
  await renderNews(nextState);
}

async function init() {
  initTraditionsFilter();

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

  await renderAll(state);
}

init();
