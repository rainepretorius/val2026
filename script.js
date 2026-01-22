/* script.js — robust version (desktop + mobile same vibe, fair timer, hard reset) */

const yesBtn = document.querySelector(".yes-btn");
const noBtn = document.querySelector(".no-btn");
const question = document.querySelector(".question");
const gif = document.querySelector(".gif");
const btnGroup = document.querySelector(".btn-group");
const note = document.querySelector(".note");

if (!yesBtn || !noBtn || !question || !gif || !btnGroup) {
  console.error("Missing required DOM elements. Check class names in HTML.");
}

/* Helper text area */
let helper = document.querySelector(".helper-text");
if (!helper) {
  helper = document.createElement("div");
  helper.className = "helper-text";
  helper.style.marginTop = "10px";
  helper.style.fontSize = "12px";
  helper.style.color = "#6b7280";
  helper.style.minHeight = "16px";
  document.querySelector(".wrapper")?.appendChild(helper);
}

const HA_WEBHOOK_URL =
  "https://home-assistant.fsrl.pretoriusse.net/api/webhook/-bcdrRHw4gBccbK5xwgKpXKgR";

/* Images (keep consistent absolute-ish paths; change to /... if served from root) */
const IMG_IDLE = "./wolf_golden_retriever_walking.gif";
const IMG_YES  = "./yes_grey_wolf_golden_retriever_animated.gif";
const IMG_NO   = "./no_good_boy_golden_retriever_animated.gif";

/* Motion preferences */
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function isDesktopLike() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}
function isMobileLike() {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

/* Dodge limits (fairness) */
const DODGE_LIMIT = 10;
const DODGE_TIME_LIMIT = 10000; // 10s after first interaction

/* State */
let dodgeCount = 0;
let dodgeEnabled = true;
let interactionStarted = false;
let dodgeStartMs = null;

let decisionLocked = false;

let currentX = 0;
let currentY = 0;

let phoneMoveInterval = null;
let firstInteractionHandler = null;

/* ---------- Utilities ---------- */

function safeDisplay(el, value) {
  if (!el) return;
  el.style.display = value;
}

function hardResetNoButtonPosition() {
  if (!noBtn) return;
  // Kill any in-flight CSS transitions causing stuck transforms
  const prevTransition = noBtn.style.transition;
  noBtn.style.transition = "none";
  noBtn.style.transform = "translate(0px, 0px)";
  // Force reflow to apply
  void noBtn.offsetHeight;
  noBtn.style.transition = prevTransition || "";
}

function clearMovement() {
  if (phoneMoveInterval) clearInterval(phoneMoveInterval);
  phoneMoveInterval = null;
}

function clearFirstInteractionListeners() {
  if (!firstInteractionHandler) return;
  window.removeEventListener("pointerdown", firstInteractionHandler);
  window.removeEventListener("touchstart", firstInteractionHandler);
  window.removeEventListener("mousemove", firstInteractionHandler);
  window.removeEventListener("scroll", firstInteractionHandler);
  window.removeEventListener("keydown", firstInteractionHandler);
  firstInteractionHandler = null;
}

function armFirstInteraction() {
  clearFirstInteractionListeners();

  firstInteractionHandler = () => {
    if (!interactionStarted) {
      interactionStarted = true;
      dodgeStartMs = Date.now();
    }
    clearFirstInteractionListeners();
  };

  window.addEventListener("pointerdown", firstInteractionHandler, { passive: true });
  window.addEventListener("touchstart", firstInteractionHandler, { passive: true });
  window.addEventListener("mousemove", firstInteractionHandler, { passive: true });
  window.addEventListener("scroll", firstInteractionHandler, { passive: true });
  window.addEventListener("keydown", firstInteractionHandler, { passive: true });
}

function hideChoices() {
  safeDisplay(yesBtn, "none");
  safeDisplay(noBtn, "none");
  if (note) safeDisplay(note, "none");
}

function showChoices(oldYes, oldNo, oldNote) {
  safeDisplay(yesBtn, oldYes);
  safeDisplay(noBtn, oldNo);
  if (note) safeDisplay(note, oldNote);
}

function maybeDisableDodge() {
  if (!dodgeEnabled) return;

  const elapsed = interactionStarted && dodgeStartMs ? (Date.now() - dodgeStartMs) : 0;

  // Count-limit always applies; time-limit applies only after interaction starts
  if (dodgeCount >= DODGE_LIMIT || (interactionStarted && elapsed >= DODGE_TIME_LIMIT)) {
    dodgeEnabled = false;
    if (helper) helper.textContent = "Ok ok — jy kan ‘Nee’ kies 😌";
    // Do NOT snap back; just stop moving now.
  }
}

function getValidPosition() {
  const containerRect = btnGroup.getBoundingClientRect();
  const buttonRect = noBtn.getBoundingClientRect();

  const maxX = Math.max(0, containerRect.width - buttonRect.width);
  let maxY = containerRect.height - buttonRect.height;
  if (maxY <= 0) maxY = maxX * 0.7;

  const safeMaxY = Math.max(0, maxY);

  // Generate positions different enough to feel "alive"
  let newX, newY;
  let attempts = 0;
  do {
    attempts += 1;
    newX = (Math.random() - 0.6) * maxX * 0.9;
    newY = (Math.random() - 0.6) * safeMaxY * 1.2;
    if (attempts > 12) break; // prevent rare infinite looping
  } while (
    Math.abs(newX - currentX) < buttonRect.width * 0.8 &&
    Math.abs(newY - currentY) < buttonRect.height * 0.8
  );

  currentX = newX;
  currentY = newY;

  return { x: newX - 10, y: newY - 50 };
}

function moveNoButtonOnce({ countsAsDodge }) {
  if (prefersReduced) return;
  if (!dodgeEnabled) return;

  if (countsAsDodge) {
    // Start timer only after first real interaction
    if (!interactionStarted) {
      interactionStarted = true;
      dodgeStartMs = Date.now();
    }
    dodgeCount += 1;
  }

  maybeDisableDodge();
  if (!dodgeEnabled) return;

  const newPos = getValidPosition();
  noBtn.style.transform = `translate(${newPos.x}px, ${newPos.y}px)`;

  maybeDisableDodge();
}

/* Desktop: dodge on hover/focus (each move counts as a dodge) */
function onDesktopDodgeTrigger() {
  if (!isDesktopLike()) return;
  moveNoButtonOnce({ countsAsDodge: true });
}

/* Mobile: start gentle movement after load (does NOT count until interaction started) */
function startPhoneTeaseMovement() {
  clearMovement();
  if (prefersReduced) return;
  if (!isMobileLike()) return;

  phoneMoveInterval = setInterval(() => {
    if (!dodgeEnabled) return;

    // On mobile: before interaction = movement but not counted, no timer.
    // After interaction = movement counts, time applies.
    const counts = interactionStarted;
    moveNoButtonOnce({ countsAsDodge: counts });
  }, 650);
}

/* Full reset — handles all edge cases */
function resetEverything({ oldYesDisplay, oldNoDisplay, oldNoteDisplay }) {
  // stop loops/listeners first so they can't override reset
  clearMovement();
  clearFirstInteractionListeners();

  // restore UI
  showChoices(oldYesDisplay, oldNoDisplay, oldNoteDisplay);

  // text/image
  question.innerHTML = "Danelle, sal jy my Valentyn wees?";
  gif.src = IMG_IDLE;
  if (helper) helper.textContent = "";

  // state
  dodgeCount = 0;
  dodgeEnabled = true;
  interactionStarted = false;
  dodgeStartMs = null;

  currentX = 0;
  currentY = 0;

  decisionLocked = false;

  // hard reset positions (transform gets sticky across hide/show)
  hardResetNoButtonPosition();

  // re-arm
  armFirstInteraction();
  startPhoneTeaseMovement();
}

/* ---------- Event wiring ---------- */

document.addEventListener("DOMContentLoaded", () => {
  hardResetNoButtonPosition();
  if (helper) helper.textContent = "";

  armFirstInteraction();
  startPhoneTeaseMovement();
});

/* Desktop dodge hooks */
noBtn.addEventListener("mouseover", onDesktopDodgeTrigger);
noBtn.addEventListener("focus", onDesktopDodgeTrigger);

/* YES click */
yesBtn.addEventListener("click", async () => {
  if (decisionLocked) return;
  decisionLocked = true;

  // capture current display states (in case you change layout later)
  const oldYesDisplay = yesBtn.style.display || "";
  const oldNoDisplay = noBtn.style.display || "";
  const oldNoteDisplay = note ? (note.style.display || "") : "";

  // immediate UI feedback
  question.innerHTML = "Yay. Dis ons. 🌸";
  gif.src = IMG_YES;

  hideChoices();
  clearMovement(); // stop phone drift during result state

  await sendWebhookNotification({
    title: "Valentyn 💚",
    message: "Sy kies my. Stadig is fine 😌",
    response: "yes"
  });

  setTimeout(() => {
    resetEverything({ oldYesDisplay, oldNoDisplay, oldNoteDisplay });
  }, 8000);
});

/* NO click (always allowed; dodge can stop but button still works) */
noBtn.addEventListener("click", async () => {
  if (decisionLocked) return;
  decisionLocked = true;

  const oldYesDisplay = yesBtn.style.display || "";
  const oldNoDisplay = noBtn.style.display || "";
  const oldNoteDisplay = note ? (note.style.display || "") : "";

  question.innerHTML = "Dankie dat jy eerlik is. 🤍";
  gif.src = IMG_NO;
  if (helper) helper.textContent = "";

  hideChoices();
  clearMovement();

  await sendWebhookNotification({
    title: "Valentyn 🤍",
    message: "Sy kies eerlikheid. Respek.",
    response: "no"
  });

  setTimeout(() => {
    resetEverything({ oldYesDisplay, oldNoDisplay, oldNoteDisplay });
  }, 8000);
});

/* ---------- Webhook ---------- */
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