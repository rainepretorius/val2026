/* script.js
   - Teases NO for 10s after page load (phone + desktop), then allows NO
   - YES: locks in YES, shows "Sy is joune. 💚", swaps gif, hides yes/no, shows plans
   - Plans: click Plan A/B/C opens modal with details + "Kies hierdie plan" button
   - Confirming a plan sends HA: { title, message, response } with full details
   - HA expects ONLY: title, message, response
*/

const yesBtn = document.querySelector(".yes-btn");
const noBtn  = document.querySelector(".no-btn");
const question = document.querySelector(".question");
const gif = document.querySelector(".gif");
const btnGroup = document.querySelector(".btn-group");
const note = document.querySelector(".note");
const helper = document.querySelector(".helper-text");

const mainButtons = document.getElementById("mainButtons");
const plansWrap = document.getElementById("plans");
const planButtons = document.querySelectorAll(".plan-btn");

// Modal
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");

const HA_WEBHOOK_URL =
  "https://home-assistant.fsrl.pretoriusse.net/api/webhook/-bcdrRHw4gBccbK5xwgKpXKgR";

const IMG_IDLE = "./wolf_golden_retriever_walking.gif";
const IMG_YES  = "./yes_grey_wolf_golden_retriever_animated.gif";
const IMG_NO   = "./no_good_boy_golden_retriever_animated.gif";

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Tease settings */
const TEASE_MS = 10000;
const TEASE_TICK_MS = 520;

/* State */
let decisionLocked = false;

let teasing = false;
let teaseEnded = false;
let teaseEndAt = 0;
let teaseInterval = null;

let currentX = 0;
let currentY = 0;

const originalNoteHTML = note ? note.innerHTML : "";

/* Plan selection state */
let yesChosen = false;          // once YES clicked, NO should not be possible anymore
let pendingPlanKey = null;      // which plan is currently shown in modal

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

/* ---------- Modal ---------- */

function openModal(title, html, confirmText = "Kies hierdie plan") {
  pendingPlanKey = null; // will be set by caller
  modalTitle.textContent = title;
  modalBody.innerHTML = `
    <div class="plan-detail">${html}</div>
    <div style="margin-top:14px; display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap;">
      <button type="button" id="planConfirmBtn" class="modal-close">${confirmText} ✅</button>
    </div>
  `;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  // wire confirm button each time modal opens
  const confirmBtn = document.getElementById("planConfirmBtn");
  confirmBtn.addEventListener("click", async () => {
    if (!pendingPlanKey) return;
    const cfg = planContent[pendingPlanKey];
    if (!cfg) return;

    // send HA with full detail in message (server expects only title/message/response)
    await sendWebhookNotification({
      title: cfg.title,
      message: cfg.notify,
      response: cfg.response
    });

    closeModal();

    // Optional: show a nice “locked in” line after confirming a plan
    helper.textContent = "Cool. Ek reël dit 😌";
  });
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

/* ---------- UI Reset (optional) ---------- */
function resetAll() {
  clearTease();

  question.innerHTML = "Danelle, sal jy my Valentyn wees?";
  gif.src = IMG_IDLE;
  helper.textContent = "";

  if (note) note.innerHTML = originalNoteHTML;

  safeDisplay(plansWrap, "none");
  safeDisplay(mainButtons, "");

  decisionLocked = false;
  yesChosen = false;
  pendingPlanKey = null;

  teasing = false;
  teaseEnded = false;
  currentX = 0;
  currentY = 0;

  hardResetNoPosition();
  setTimeout(() => startTease(), 200);
}

/* ---------- Boot ---------- */
window.addEventListener("load", () => {
  hardResetNoPosition();
  helper.textContent = "";

  btnGroup.style.position = btnGroup.style.position || "relative";
  btnGroup.style.minHeight = btnGroup.style.minHeight || "92px";

  setTimeout(() => startTease(), 250);
});

/* During tease, block accidental NO clicks; jump instead */
noBtn.addEventListener("pointerdown", (e) => {
  if (!teasing) return;
  e.preventDefault();
  moveNo();
});

/* YES click — lock in YES and show plans (NO no longer relevant) */
yesBtn.addEventListener("click", async () => {
  if (decisionLocked) return;
  decisionLocked = true;
  yesChosen = true;

  question.innerHTML = "Sy is joune. 💚";
  gif.src = IMG_YES;
  helper.textContent = "Kies net jou plan 😌";

  clearTease();

  // Hide yes/no, show plans
  safeDisplay(mainButtons, "none");
  safeDisplay(plansWrap, "");

  // Notify you YES happened (only once, and ONLY after she clicked YES)
  await sendWebhookNotification({
    title: "Valentyn 💚",
    message: "JA 💚 Sy is joune.",
    response: "yes"
  });

  // unlock so plan modal confirm can send more notifications
  decisionLocked = false;
});

/* Plan content + notification strings */
const planContent = {
  A: {
    title: "Plan A 🖤",
    html:
      "Ek pick jou op na werk.<br>" +
      "Jy kom oor.<br>" +
      "Ons kyk ‘n movie en cuddle.<br>" +
      "Ons gaan slaap en cuddle.<br>" +
      "Dis al. Geen druk.<br>" +
      "As jy snacks wil hê, doen ons dit ook 😌",
    notify: "Plan A 🖤: My plek → movie + cuddle → sleepover + cuddle (snacks optional 😌)",
    response: "planA"
  },
  B: {
    title: "Plan B 🐺",
    html:
      "Ek pick jou op na werk.<br>" +
      "Ons gaan na jou plek toe.<br>" +
      "Ons kyk ‘n movie en cuddle.<br>" +
      "Ons gaan slaap en cuddle.<br>" +
      "Dis al. Net sag en veilig.<br>" +
      "Snacks is altyd ‘n ja 😌",
    notify: "Plan B 🐺: Jou plek → movie + cuddle → sleepover + cuddle (snacks optional 😌)",
    response: "planB"
  },
  C: {
    title: "Plan C 🍽️",
    html:
      "Ons gaan eet iets lekker.<br>" +
      "Rustig. Easy.<br>" +
      "Geen pressure, net quality time.<br>" +
      "Jy kies die plek, of ek stel 2 opsies voor 😌",
    notify: "Plan C 🍽️: Date night → gaan eet iets lekker 😌",
    response: "planC"
  }
};

/* Clicking plan buttons only opens modal (no HA call yet) */
planButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!yesChosen) return; // plans only valid after YES
    const planKey = btn.dataset.plan;
    const cfg = planContent[planKey];
    if (!cfg) return;

    pendingPlanKey = planKey;
    openModal(cfg.title, cfg.html, "Kies hierdie plan");
  });
});

/* NO click — only allowed after teasing ends AND before YES is chosen */
noBtn.addEventListener("click", async () => {
  if (decisionLocked) return;
  if (yesChosen) return;     // once YES clicked, ignore NO entirely
  if (!teaseEnded) return;

  decisionLocked = true;

  question.innerHTML = "Ek’s nogsteeds joune, my love. 🤍";
  gif.src = IMG_NO;
  helper.textContent = "";

  safeDisplay(mainButtons, "none");
  clearTease();

  await sendWebhookNotification({
    title: "Valentyn 🤍",
    message: "NEE 🤍 Ek’s nogsteeds joune, my love.",
    response: "no"
  });

  // If you want it to reset after a while:
  setTimeout(() => resetAll(), 8000);
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
