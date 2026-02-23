// app.js
// Plain global JS, no modules.

// -------------------
// Data generator
// -------------------
const TAGS = [
  "Coffee","Hiking","Movies","Live Music","Board Games","Cats","Dogs","Traveler",
  "Foodie","Tech","Art","Runner","Climbing","Books","Yoga","Photography"
];
const FIRST_NAMES = [
  "Alex","Sam","Jordan","Taylor","Casey","Avery","Riley","Morgan","Quinn","Cameron",
  "Jamie","Drew","Parker","Reese","Emerson","Rowan","Shawn","Harper","Skyler","Devon"
];
const CITIES = [
  "Brooklyn","Manhattan","Queens","Jersey City","Hoboken","Astoria",
  "Williamsburg","Bushwick","Harlem","Lower East Side"
];
const JOBS = [
  "Product Designer","Software Engineer","Data Analyst","Barista","Teacher",
  "Photographer","Architect","Chef","Nurse","Marketing Manager","UX Researcher"
];
const BIOS = [
  "Weekend hikes and weekday lattes.",
  "Dog parent. Amateur chef. Karaoke enthusiast.",
  "Trying every taco in the city — for science.",
  "Bookstore browser and movie quote machine.",
  "Gym sometimes, Netflix always.",
  "Looking for the best slice in town.",
  "Will beat you at Mario Kart.",
  "Currently planning the next trip."
];

const UNSPLASH_SEEDS = [
  "1515462277126-2b47b9fa09e6",
  "1520975916090-3105956dac38",
  "1519340241574-2cec6aef0c01",
  "1554151228-14d9def656e4",
  "1548142813-c348350df52b",
  "1517841905240-472988babdf9",
  "1535713875002-d1d0cf377fde",
  "1545996124-0501ebae84d0",
  "1524504388940-b1c1722653e1",
  "1531123897727-8f129e1688ce",
];

function sample(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickTags() { return Array.from(new Set(Array.from({length:4}, ()=>sample(TAGS)))); }
function imgFor(seed) {
  return `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=1200&q=80`;
}

// Returns 2–4 unique photo URLs drawn randomly from UNSPLASH_SEEDS.
function pickPhotos() {
  const shuffled = [...UNSPLASH_SEEDS].sort(() => Math.random() - 0.5);
  const count = 2 + Math.floor(Math.random() * 3); // 2, 3, or 4 photos
  return shuffled.slice(0, count).map(imgFor);
}

function generateProfiles(count = 12) {
  const profiles = [];
  for (let i = 0; i < count; i++) {
    profiles.push({
      id: `p_${i}_${Date.now().toString(36)}`,
      name: sample(FIRST_NAMES),
      age: 18 + Math.floor(Math.random() * 22),
      city: sample(CITIES),
      title: sample(JOBS),
      bio: sample(BIOS),
      tags: pickTags(),
      photos: pickPhotos(),
    });
  }
  return profiles;
}

// -------------------
// UI rendering
// -------------------
const deckEl = document.getElementById("deck");
const shuffleBtn = document.getElementById("shuffleBtn");
const likeBtn = document.getElementById("likeBtn");
const nopeBtn = document.getElementById("nopeBtn");
const superLikeBtn = document.getElementById("superLikeBtn");

let profiles = [];
let isAnimating = false;

// Sync the dot bar on a card to the given active photo index.
function updateDots(card, activeIndex) {
  card.querySelectorAll(".card__dot").forEach((dot, i) => {
    dot.classList.toggle("card__dot--active", i === activeIndex);
  });
}

// Enable or disable all action buttons together.
function setControlsDisabled(disabled) {
  [likeBtn, nopeBtn, superLikeBtn].forEach((btn) => (btn.disabled = disabled));
}

// Show the "you've seen everyone" placeholder inside the deck.
function showEmptyState() {
  setControlsDisabled(true);
  const empty = document.createElement("div");
  empty.className = "deck__empty";
  empty.innerHTML = `
    <span class="deck__empty-icon">🎉</span>
    <p>You've seen everyone!</p>
    <button class="ghost-btn" id="reloadBtn">Load more</button>
  `;
  deckEl.appendChild(empty);
  document.getElementById("reloadBtn").addEventListener("click", resetDeck);
}

// Animate the current top card off-screen in the given direction,
// then remove it from the DOM and the profiles array.
function dismissTopCard(direction) {
  if (isAnimating) return;
  const topCard = deckEl.firstElementChild;
  if (!topCard || topCard.classList.contains("deck__empty")) return;

  isAnimating = true;
  setControlsDisabled(true);

  // Clear any inline drag transform so the CSS exit class takes full control.
  topCard.style.transform = "";
  topCard.classList.remove("card--dragging");

  const exitClass =
    direction === "right" ? "card--exit-right" :
    direction === "left"  ? "card--exit-left"  :
                            "card--exit-up";

  topCard.classList.add(exitClass);
  profiles.shift();

  topCard.addEventListener("transitionend", () => {
    topCard.remove();
    isAnimating = false;
    setControlsDisabled(false);
    if (profiles.length === 0) showEmptyState();
  }, { once: true });
}

// Attach pointer-drag (swipe), single-tap (bio reveal), and
// double-tap (cycle through profile photos) handlers to a single card.
function setupCardHandlers(card, profile) {
  const DISMISS_X      = 100;  // px horizontal threshold to trigger a swipe
  const DISMISS_Y      = -80;  // px vertical threshold to trigger a super-like
  const TAP_MAX        = 5;    // px max movement to still count as a tap
  const DOUBLE_TAP_MS  = 300;  // ms window for the second tap to count

  const stampLike  = card.querySelector(".card__stamp--like");
  const stampNope  = card.querySelector(".card__stamp--nope");
  const stampSuper = card.querySelector(".card__stamp--super");

  let startX = 0, startY = 0, active = false;
  let photoIndex  = 0;
  let lastTapTime = 0;

  // Crossfade the card image to the next photo in the profile's array.
  function advancePhoto() {
    if (profile.photos.length <= 1) return;
    photoIndex = (photoIndex + 1) % profile.photos.length;
    const img = card.querySelector(".card__media");
    img.classList.add("card__media--fading");
    setTimeout(() => {
      img.src = profile.photos[photoIndex];
      img.classList.remove("card__media--fading");
    }, 150);
    updateDots(card, photoIndex);
  }

  card.addEventListener("pointerdown", (e) => {
    // Only allow dragging the front card; ignore right-clicks on desktop.
    if (card !== deckEl.firstElementChild) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    startX = e.clientX;
    startY = e.clientY;
    active = true;
    card.classList.add("card--dragging");
    card.setPointerCapture(e.pointerId);
  });

  card.addEventListener("pointermove", (e) => {
    if (!active) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    card.style.transform =
      `translateX(${dx}px) translateY(${dy}px) rotate(${dx * 0.08}deg)`;

    // Fade stamps in proportionally to how far the card has been dragged.
    stampLike.style.opacity  = Math.min(Math.max(dx / DISMISS_X, 0), 1);
    stampNope.style.opacity  = Math.min(Math.max(-dx / DISMISS_X, 0), 1);
    stampSuper.style.opacity = Math.min(Math.max(-dy / Math.abs(DISMISS_Y), 0), 1);
  });

  function resetStamps() {
    stampLike.style.opacity  = 0;
    stampNope.style.opacity  = 0;
    stampSuper.style.opacity = 0;
  }

  card.addEventListener("pointerup", (e) => {
    if (!active) return;
    active = false;
    card.classList.remove("card--dragging");

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // Small movement = tap: single-tap toggles bio; double-tap cycles photos.
    if (Math.abs(dx) < TAP_MAX && Math.abs(dy) < TAP_MAX) {
      resetStamps();
      const now = Date.now();
      if (now - lastTapTime < DOUBLE_TAP_MS) {
        // Double-tap: hide bio (if open) and advance to the next photo.
        card.classList.remove("card--bio-open");
        advancePhoto();
      } else {
        card.classList.toggle("card--bio-open");
      }
      lastTapTime = now;
      return;
    }

    if (dx > DISMISS_X) {
      dismissTopCard("right");
    } else if (dx < -DISMISS_X) {
      dismissTopCard("left");
    } else if (dy < DISMISS_Y) {
      dismissTopCard("up");
    } else {
      // Didn't reach threshold — snap the card back to center.
      card.style.transform = "";
      resetStamps();
    }
  });

  // Treat a cancelled pointer (e.g. browser interrupt) as a snap-back.
  card.addEventListener("pointercancel", () => {
    active = false;
    card.classList.remove("card--dragging");
    card.style.transform = "";
    resetStamps();
  });
}

function renderDeck() {
  deckEl.setAttribute("aria-busy", "true");
  deckEl.innerHTML = "";

  profiles.forEach((p) => {
    const card = document.createElement("article");
    card.className = "card";

    // Profile image with error fallback.
    const img = document.createElement("img");
    img.className = "card__media";
    img.src = p.photos[0];
    img.alt = `${p.name} — profile photo 1 of ${p.photos.length}`;
    img.addEventListener("error", () => {
      img.classList.add("card__media--error");
      img.removeAttribute("src");
      img.alt = "Photo unavailable";
    });

    // Photo progress dots — only rendered when there are multiple photos.
    const dotsEl = document.createElement("div");
    dotsEl.className = "card__dots";
    if (p.photos.length > 1) {
      p.photos.forEach((_, i) => {
        const dot = document.createElement("span");
        dot.className = "card__dot" + (i === 0 ? " card__dot--active" : "");
        dotsEl.appendChild(dot);
      });
    }

    // Swipe direction stamps (LIKE / NOPE / SUPER).
    const stampLike = document.createElement("span");
    stampLike.className = "card__stamp card__stamp--like";
    stampLike.textContent = "LIKE";

    const stampNope = document.createElement("span");
    stampNope.className = "card__stamp card__stamp--nope";
    stampNope.textContent = "NOPE";

    const stampSuper = document.createElement("span");
    stampSuper.className = "card__stamp card__stamp--super";
    stampSuper.textContent = "SUPER";

    // Card body: name, meta, interest chips.
    const body = document.createElement("div");
    body.className = "card__body";

    const titleRow = document.createElement("div");
    titleRow.className = "title-row";
    titleRow.innerHTML = `
      <h2 class="card__title">${p.name}</h2>
      <span class="card__age">${p.age}</span>
    `;

    const meta = document.createElement("div");
    meta.className = "card__meta";
    meta.textContent = `${p.title} • ${p.city}`;

    const chips = document.createElement("div");
    chips.className = "card__chips";
    p.tags.forEach((t) => {
      const c = document.createElement("span");
      c.className = "chip";
      c.textContent = t;
      chips.appendChild(c);
    });

    body.appendChild(titleRow);
    body.appendChild(meta);
    body.appendChild(chips);

    // Bio overlay — revealed when the card is tapped.
    const bioOverlay = document.createElement("div");
    bioOverlay.className = "card__bio";
    const bioText = document.createElement("p");
    bioText.className = "card__bio-text";
    bioText.textContent = p.bio;
    bioOverlay.appendChild(bioText);

    card.appendChild(img);
    card.appendChild(dotsEl);
    card.appendChild(stampLike);
    card.appendChild(stampNope);
    card.appendChild(stampSuper);
    card.appendChild(body);
    card.appendChild(bioOverlay);

    setupCardHandlers(card, p);
    deckEl.appendChild(card);
  });

  deckEl.removeAttribute("aria-busy");
  setControlsDisabled(false);
}

function resetDeck() {
  isAnimating = false;
  profiles = generateProfiles(12);
  renderDeck();
}

// ─── Like / Nope / Super Like buttons ───────────────────────────────────────
likeBtn.addEventListener("click",     () => dismissTopCard("right"));
nopeBtn.addEventListener("click",     () => dismissTopCard("left"));
superLikeBtn.addEventListener("click", () => dismissTopCard("up"));

// ─── Shuffle button — debounced to prevent double-firing ────────────────────
shuffleBtn.addEventListener("click", () => {
  if (shuffleBtn.disabled) return;
  shuffleBtn.disabled = true;
  resetDeck();
  setTimeout(() => { shuffleBtn.disabled = false; }, 600);
});

// ─── Keyboard shortcuts: ← Nope  → Like  ↑ Super Like ───────────────────────
document.addEventListener("keydown", (e) => {
  if (isAnimating || profiles.length === 0) return;
  if (e.key === "ArrowRight") dismissTopCard("right");
  else if (e.key === "ArrowLeft")  dismissTopCard("left");
  else if (e.key === "ArrowUp")    dismissTopCard("up");
});

// Boot
resetDeck();
