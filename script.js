const yesBtn = document.querySelector(".yes-btn");
const noBtn = document.querySelector(".no-btn");
const question = document.querySelector(".question");
const gif = document.querySelector(".gif");
const btnGroup = document.querySelector(".btn-group");
const note = document.querySelector(".note");

let helper = document.querySelector(".helper-text");
if (!helper) {
  helper = document.createElement("div");
  helper.className = "helper-text";
  helper.style.marginTop = "10px";
  helper.style.fontSize = "12px";
  helper.style.color = "#6b7280";
  helper.style.minHeight = "16px";
  document.querySelector(".wrapper").appendChild(helper);
}

const HA_WEBHOOK_URL =
  "https://home-assistant.fsrl.pretoriusse.net/api/webhook/-bcdrRHw4gBccbK5xwgKpXKgR";

/* === Input + motion === */
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function isDesktopLike() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}
function isMobileLike() {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

/* === Dodge limits === */
const DODGE_LIMIT = 10;
const DODGE_TIME_LIMIT = 10000;

let dodgeCount = 0;
let dodgeEnabled = true;

// Timer should start ONLY after first user interaction
let interactionStarted = false;
let dodgeStartMs = null;

// Prevent double notifications
let decisionLocked = false;

// Position memory
let currentX = 0;
let currentY = 0;

// Phone movement loop
let phoneMoveInterval = null;

function getValidPosition() {
  const containerRect = btnGroup.getBoundingClientRect();
  const buttonRect = noBtn.getBoundingClientRect();

  const maxX = Math.max(0, containerRect.width - buttonRect.width);
  let maxY = containerRect.height - buttonRect.height;
  if (maxY <= 0) maxY = maxX * 0.7;

  const safeMaxY = Math.max(0, maxY);

  let newX, newY;
  do {
    newX = (Math.random() - 0.6) * maxX * 0.9;
    newY = (Math.random() - 0.6) * safeMaxY * 1.2;
  } while (
    Math.abs(newX - currentX) < buttonRect.width &&
    Math.abs(newY - currentY) < buttonRect.height
  );

  currentX = newX;
  currentY = newY;

  return { x: newX - 10, y: newY - 50 };
}

function startInteractionTimerIfNeeded() {
  if (interactionStarted) return;
  interactionStarted = true;
  dodgeStartMs = Date.now();
}

function maybeDisableDodge() {
  if (!dodgeEnabled) return;

  const elapsed = dodgeStartMs ? (Date.now() - dodgeStartMs) : 0;

  // IMPORTANT: elapsed only counts after interactionStarted
  if ((interactionStarted && elapsed >= DODGE_TIME_LIMIT) || dodgeCount >= DODGE_LIMIT) {
    dodgeEnabled = false;
    helper.textContent = "Ok ok — jy kan ‘Nee’ kies 😌";
    // Do not snap back; just stop moving from now on.
  }
}

/* Desktop: dodge on hover/focus */
function moveButtonDesktop() {
  if (prefersReduced) return;
  if (!dodgeEnabled) return;

  startInteractionTimerIfNeeded();
  maybeDisableDodge();
  if (!dodgeEnabled) return;

  dodgeCount += 1;
  const newPos = getValidPosition();
  noBtn.style.transform = `translate(${newPos.x}px, ${newPos.y}px)`;

  maybeDisableDodge();
}

/* Phone: start moving after page load, but timer starts only on first interaction */
function startPhoneTeaseMovement() {
  if (prefersReduced) return;
  if (!isMobileLike()) return;

  // Gentle movement loop (not too fast so it doesn't feel broken)
  if (phoneMoveInterval) clearInterval(phoneMoveInterval);

  phoneMoveInterval = setInterval(() => {
    if (!dodgeEnabled) return;

    // Do NOT start timer here. Only movement.
    // Only count dodges after interaction starts, otherwise it can "use up" the 10.
    if (interactionStarted) {
      dodgeCount += 1;
      maybeDisableDodge();
      if (!dodgeEnabled) return;
    }

    const newPos = getValidPosition();
    noBtn.style.transform = `translate(${newPos.x}px, ${newPos.y}px)`;

    // If interaction already started, check time-limit too
    maybeDisableDodge();
  }, 650);
}

function stopPhoneTeaseMovement() {
  if (phoneMoveInterval) clearInterval(phoneMoveInterval);
  phoneMoveInterval = null;
}

/* One-shot: mark interaction started on first real user action */
function armFirstInteraction() {
  const once = () => {
    startInteractionTimerIfNeeded();
    // After first interaction, we keep going; this just starts the timer.
    window.removeEventListener("pointerdown", once);
    window.removeEventListener("touchstart", once);
    window.removeEventListener("mousemove", once);
    window.removeEventListener("scroll", once);
    window.removeEventListener("keydown", once);
  };

  window.addEventListener("pointerdown", once, { passive: true });
  window.addEventListener("touchstart", once, { passive: true });
  window.addEventListener("mousemove", once, { passive: true });
  window.addEventListener("scroll", once, { passive: true });
  window.addEventListener("keydown", once, { passive: true });
}

function hideChoices() {
  yesBtn.style.display = "none";
  noBtn.style.display = "none";
  if (note) note.style.display = "none";
}

function showChoices(oldYes, oldNo, oldNote) {
  yesBtn.style.display = oldYes;
  noBtn.style.display = oldNo;
  if (note) note.style.display = oldNote;
}

function resetState() {
  question.innerHTML = "Danelle, sal jy my Valentyn wees?";
  gif.src = "./wolf_golden_retriever_walking.gif";

  dodgeCount = 0;
  dodgeEnabled = true;

  interactionStarted = false;
  dodgeStartMs = null;

  currentX = 0;
  currentY = 0;

  helper.textContent = "";
  noBtn.style.transform = "translate(0px, 0px)";
  decisionLocked = false;

  stopPhoneTeaseMovement();
  startPhoneTeaseMovement();   // restart if mobile
  armFirstInteraction();       // re-arm timer start
}

document.addEventListener("DOMContentLoaded", () => {
  noBtn.style.transform = "translate(0px, 0px)";
  helper.textContent = "";

  armFirstInteraction();       // timer starts only after real interaction
  startPhoneTeaseMovement();   // phone starts moving once page is loaded
});

/* === YES click === */
yesBtn.addEventListener("click", async () => {
  if (decisionLocked) return;
  decisionLocked = true;

  question.innerHTML = "Yay. Dis ons. 🌸";
  gif.src = "./yes_grey_wolf_golden_retriever_animated.gif";

  const oldYesDisplay = yesBtn.style.display;
  const oldNoDisplay = noBtn.style.display;
  const oldNoteDisplay = note ? note.style.display : "";

  hideChoices();
  stopPhoneTeaseMovement();

  await sendWebhookNotification({
    title: "Valentyn 💚",
    message: "Sy kies my. Stadig is fine 😌",
    response: "yes"
  });

  setTimeout(() => {
    showChoices(oldYesDisplay, oldNoDisplay, oldNoteDisplay);
    resetState();
    gif.src = "./wolf_golden_retriever_walking.gif";
  }, 8000);
});

/* Desktop dodge triggers */
noBtn.addEventListener("mouseover", () => {
  if (!isDesktopLike()) return;
  moveButtonDesktop();
});
noBtn.addEventListener("focus", () => {
  if (!isDesktopLike()) return;
  moveButtonDesktop();
});

/* === NO click === */
noBtn.addEventListener("click", async () => {
  if (decisionLocked) return;
  decisionLocked = true;

  question.innerHTML = "Dankie dat jy eerlik is. 🤍";
  gif.src = "./no_good_boy_golden_retriever_animated.gif";
  helper.textContent = "";

  const oldYesDisplay = yesBtn.style.display;
  const oldNoDisplay = noBtn.style.display;
  const oldNoteDisplay = note ? note.style.display : "";

  hideChoices();
  stopPhoneTeaseMovement();

  await sendWebhookNotification({
    title: "Valentyn 🤍",
    message: "Sy kies eerlikheid. Respek.",
    response: "no"
  });

  setTimeout(() => {
    showChoices(oldYesDisplay, oldNoDisplay, oldNoteDisplay);
    resetState();
  }, 8000);
});

/* === Webhook === */
async function sendWebhookNotification(payload) {
  try {
    const response = await fetch(HA_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
    console.log("Sent to HA:", payload);
  } catch (error) {
    console.error("Error:", error);
  }
}