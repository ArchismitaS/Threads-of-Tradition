const lessonIds = ["greetings", "festivals", "family", "language"];
const storyIds = ["lantern-maker", "bread-neighborhood", "drumbeats-sunset"];

const defaultState = {
  completedLessons: [],
  readStories: [],
  streak: 1,
  badges: ["First Steps"],
};

let state = { ...defaultState };

async function apiGetState() {
  const res = await fetch("/api/state");
  if (!res.ok) throw new Error("Failed to fetch state");
  return res.json();
}

async function apiToggleLesson(id) {
  const res = await fetch(`/api/lessons/${id}/toggle`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to toggle lesson");
  return res.json();
}

async function apiToggleStory(id) {
  const res = await fetch(`/api/stories/${id}/toggle`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to toggle story");
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

function syncStories(nextState) {
  const storyCards = document.querySelectorAll("[data-story-id]");
  if (!storyCards.length) return;

  storyCards.forEach((card) => {
    const id = card.dataset.storyId;
    const button = card.querySelector("button");
    const isRead = nextState.readStories.includes(id);

    card.classList.toggle("is-complete", isRead);
    if (button) {
      button.textContent = isRead ? "Read" : "Mark as Read";
      button.disabled = false;
      button.onclick = async () => {
        button.disabled = true;
        try {
          state = await apiToggleStory(id);
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
    const remainingStories = Math.max(0, storyIds.length - nextState.readStories.length);
    milestone.textContent =
      remainingLessons === 0 && remainingStories === 0
        ? "All core content complete! Keep practicing daily to grow your streak."
        : `Complete ${remainingLessons} more lesson(s) and ${remainingStories} story reflection(s) to finish the core path.`;
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

function renderAll(nextState) {
  syncHome(nextState);
  syncLessons(nextState);
  syncStories(nextState);
  syncProgress(nextState);
}

async function init() {
  initTraditionsFilter();

  try {
    state = await apiGetState();
  } catch (error) {
    console.error("Backend unavailable, showing defaults.", error);
    state = { ...defaultState };
  }

  renderAll(state);
}

init();
