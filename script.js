/* script.js — auto-tease NO on load, then stop + allow NO (phone + desktop) */

const yesBtn = document.querySelector(".yes-btn");
const noBtn  = document.querySelector(".no-btn");
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
  document.querySelector(".wrapper")?.appendChild(helper);
}

const HA_WEBHOOK_URL =
  "https://home-assistant.fsrl.pretoriusse.net/api/webhook/-bcdrRHw4gBccbK5xwgKpXKgR";

const IMG_IDLE = "./wolf_golden_retriever_walking.gif";
const IMG_YES  = "./yes_grey_wolf_golden_retriever_animated.gif";
const IMG_NO   = "./no_good_boy_golden_retriever_animated.gif";

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Tease settings */
const TEASE_MS = 10000;        // how long it teases before stopping
const TEASE_TICK_MS = 520;     // how often it jumps

/* State */
let decisionLocked = false;

let teasing = false;
let teaseEnded = false;
let teaseEndAt = 0;
let teaseInterval = null;

let currentX = 0;
let currentY = 0;

/* ---------- Helpers ---------- */

function safeDisplay(el, value) {
  if (!el) return;
  el.style.display = value;
}

function hardResetNoPosition() {
  const prevTransition = noBtn.style.transition;
  noBtn.style.transition = "none";
  noBtn.style.transform = "translate(0px, 0px)";
  void noBtn.offsetHeight;
  noBtn.style.transition = prevTransition || "";
}

function clearTease() {
  if (teaseInterval) clearInterval(teaseInterval);
  teaseInterval = null;
  teasing = false;
}

function getValidPosition() {
  const containerRect = btnGroup.getBoundingClientRect();
  const buttonRect = noBtn.getBoundingClientRect();

  const maxX = Math.max(0, containerRect.width - buttonRect.width);
  let maxY = containerRect.height - buttonRect.height;
  if (maxY <= 0) maxY = maxX * 0.7;
  const safeMaxY = Math.max(0, maxY);

  let newX, newY;
  let attempts = 0;

  do {
    attempts++;
    newX = (Math.random() - 0.6) * maxX * 0.9;
    newY = (Math.random() - 0.6) * safeMaxY * 1.2;
    if (attempts > 12) break;
  } while (
    Math.abs(newX - currentX) < buttonRect.width * 0.8 &&
    Math.abs(newY - currentY) < buttonRect.height * 0.8
  );

  currentX = newX;
  currentY = newY;

  return { x: newX - 10, y: newY - 50 };
}

function moveNo() {
  if (prefersReduced) return;
  if (!teasing) return;

  const pos = getValidPosition();
  noBtn.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
}

function endTease() {
  teasing = false;
  teaseEnded = true;
  clearTease();

  // Put it somewhere sensible (no teleporting off-screen)
  hardResetNoPosition();

  helper.textContent = "Ok ok — jy kan nou ‘Nee’ kies 😌";
}

function startTease() {
  if (prefersReduced) {
    teaseEnded = true;
    helper.textContent = "Jy kan ‘Nee’ kies 😌";
    return;
  }

  teasing = true;
  teaseEnded = false;
  teaseEndAt = Date.now() + TEASE_MS;

  helper.textContent = "Hehe 😌";

  // One immediate move so it visibly starts
  moveNo();

  clearTease();
  teasing = true;
  teaseInterval = setInterval(() => {
    if (!teasing) return;

    if (Date.now() >= teaseEndAt) {
      endTease();
      return;
    }
    moveNo();
  }, TEASE_TICK_MS);
}

function hideChoices() {
  safeDisplay(yesBtn, "none");
  safeDisplay(noBtn, "none");
  if (note) safeDisplay(note, "none");
}

function resetState(oldYes, oldNo, oldNote) {
  clearTease();

  question.innerHTML = "Danelle, sal jy my Valentyn wees?";
  gif.src = IMG_IDLE;
  helper.textContent = "";

  yesBtn.style.display = oldYes;
  noBtn.style.display = oldNo;
  if (note) note.style.display = oldNote;

  decisionLocked = false;

  // reset movement flags
  teasing = false;
  teaseEnded = false;
  currentX = 0;
  currentY = 0;

  hardResetNoPosition();

  // restart teasing after reset
  setTimeout(() => startTease(), 200);
}

/* ---------- Boot ---------- */

// Use load (better on phones)
window.addEventListener("load", () => {
  hardResetNoPosition();
  helper.textContent = "";

  // ensure container has space for movement
  btnGroup.style.position = btnGroup.style.position || "relative";
  btnGroup.style.minHeight = btnGroup.style.minHeight || "92px";

  setTimeout(() => startTease(), 250);
});

/* Optional: while teasing, if she tries to interact with NO, it jumps again */
noBtn.addEventListener("pointerdown", (e) => {
  if (!teasing) return;
  e.preventDefault(); // blocks accidental click during tease window
  moveNo();
});

/* YES click */
yesBtn.addEventListener("click", async () => {
  if (decisionLocked) return;
  decisionLocked = true;

  const oldYes = yesBtn.style.display || "";
  const oldNo  = noBtn.style.display || "";
  const oldNote = note ? (note.style.display || "") : "";

  question.innerHTML = "Yay. Dis ons. 🌸";
  gif.src = IMG_YES;

  hideChoices();
  clearTease();

  await sendWebhookNotification({
    title: "Valentyn 💚",
    message: "Sy kies my. Stadig is fine 😌",
    response: "yes"
  });

  setTimeout(() => resetState(oldYes, oldNo, oldNote), 8000);
});

/* NO click — only allowed after teasing ends */
noBtn.addEventListener("click", async () => {
  if (decisionLocked) return;

  // If tease hasn't ended, ignore click (pointerdown already prevented, but double safety)
  if (!teaseEnded) return;

  decisionLocked = true;

  const oldYes = yesBtn.style.display || "";
  const oldNo  = noBtn.style.display || "";
  const oldNote = note ? (note.style.display || "") : "";

  question.innerHTML = "Hehehe I love you still. 🤍";
  gif.src = IMG_NO;
  helper.textContent = "";

  hideChoices();
  clearTease();

  await sendWebhookNotification({
    title: "Valentyn 🤍",
    message: "Sy kies eerlikheid. Respek.",
    response: "no"
  });

  setTimeout(() => resetState(oldYes, oldNo, oldNote), 8000);
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
