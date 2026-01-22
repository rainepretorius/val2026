const yesBtn = document.querySelector(".yes-btn");
const noBtn = document.querySelector(".no-btn");
const question = document.querySelector(".question");
const gif = document.querySelector(".gif");
const btnGroup = document.querySelector(".btn-group");

// Add (optional) helper text area if you want; otherwise it will create one.
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

// Desktop-only dodge
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function isDesktopLike() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches && window.innerWidth >= 768;
}

/* === Dodge limits (your request) === */
const DODGE_LIMIT = 10;        // max times it runs away
const DODGE_TIME_LIMIT = 10000; // max milliseconds (10s)

let dodgeCount = 0;
let dodgeEnabled = true;
let dodgeStartMs = null;

// Initialize button position
let currentX = 0;
let currentY = 0;

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

function maybeDisableDodge() {
  if (!dodgeEnabled) return;

  const elapsed = dodgeStartMs ? (Date.now() - dodgeStartMs) : 0;
  if (dodgeCount >= DODGE_LIMIT || elapsed >= DODGE_TIME_LIMIT) {
    dodgeEnabled = false;

    // Stop moving; reset transform so it sits normally
    noBtn.style.transform = "translate(0px, 0px)";

    // Gentle “permission” line (important!)
    helper.textContent = "Ok ok — jy kan ‘Nee’ kies 😌";
  }
}

function moveButton() {
  if (prefersReduced) return;
  if (!isDesktopLike()) return;

  if (!dodgeStartMs) dodgeStartMs = Date.now();

  maybeDisableDodge();
  if (!dodgeEnabled) return;

  dodgeCount += 1;
  const newPos = getValidPosition();
  noBtn.style.transform = `translate(${newPos.x}px, ${newPos.y}px)`;

  maybeDisableDodge();
}

// Initial position set
document.addEventListener("DOMContentLoaded", () => {
  noBtn.style.transform = "translate(0px, 0px)";
  helper.textContent = ""; // clear
});

/* === YES click === */
yesBtn.addEventListener("click", async () => {
  question.innerHTML = "Yay. Dis ons. 🌸";
  gif.src = "./yes_grey_wolf_golden_retriever_animated.gif";

  const oldYesDisplay = yesBtn.style.display;
  const oldNoDisplay = noBtn.style.display;

  yesBtn.style.display = "none";
  noBtn.style.display = "none";

  // Send short notification payload
  await sendWebhookNotification({
    title: "Valentyn 💚",
    message: "Sy kies my. Stadig is fine 😌",
    response: "yes"
  });

  setTimeout(() => {
    noBtn.style.display = oldNoDisplay;
    yesBtn.style.display = oldYesDisplay;

    question.innerHTML = "Danelle, sal jy my Valentyn wees?";
    gif.src = "./wolf_golden_retriever_walking.gif";

    // Reset dodge state for replays
    dodgeCount = 0;
    dodgeEnabled = true;
    dodgeStartMs = null;
    helper.textContent = "";
    noBtn.style.transform = "translate(0px, 0px)";
  }, 8000);
});

/* === NO hover: dodge until limit reached === */
noBtn.addEventListener("mouseover", moveButton);
noBtn.addEventListener("focus", moveButton);

/* === NO click: allow real No === */
noBtn.addEventListener("click", async () => {
  question.innerHTML = "Dankie dat jy eerlik is. 🤍";
  gif.src = "./no_good_boy_golden_retriever_animated.gif";
  helper.textContent = "";

  await sendWebhookNotification({
    title: "Valentyn 🤍",
    message: "Sy kies eerlikheid. Respek.",
    response: "no"
  });

  // Keep it calm and quick
  setTimeout(() => {
    question.innerHTML = "Danelle, sal jy my Valentyn wees?";
  }, 2500);
});

/* === Optional: don’t trap her on page leave (I’d remove your beforeunload) === */
// That “beforeunload” popup feels aggressive. Designers hate that and it adds pressure.
// So: not included.

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
