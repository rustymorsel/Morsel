// Morsel v0.1 — single-file logic, localStorage
// Notes: Web Speech API dictation works best in Chrome/Android.

const LS_KEY = "morsel_state_v1";

const $ = (id) => document.getElementById(id);

const state = loadState() || seedState();
let currentRecipeId = null;

const UNIT = {
  mode: state.settings.units || "metric" // 'metric' or 'imperial'
};

function saveState() {
  state.settings.units = UNIT.mode;
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function seedState() {
  const demo = {
    settings: { units: "metric" },
    favorites: [], // recipe ids
    shopping: [], // {id, item, qty, checked}
    recipes: [
      {
        id: uid(),
        name: "Cold-Night Beef & Onion Stew",
        level: 3,
        moods: ["Cold night", "Feeding a crowd"],
        allergens: [],
        history:
          "This one exists because tough meat and onions were cheap, and time was the real ingredient. You put it on low heat, let it go, and the kitchen does the heavy lifting. It’s not pretty in the pot, but it lands warm and honest on the plate.",
        ingredients: [
          ing("beef chuck", 800, "g"),
          ing("onion", 2, "piece", "sliced"),
          ing("carrot", 2, "piece", "rough"),
          ing("garlic", 3, "piece", "cloves"),
          ing("stock", 600, "ml"),
          ing("tomato paste", 1, "tbsp"),
          ing("salt", 1, "tsp"),
          ing("pepper", 1, "tsp"),
          ing("oil", 1, "tbsp")
        ],
        method: [
          "Salt the beef.",
          "Brown it hard in a hot pot. Don’t rush this.",
          "Add onions. Cook 8–10 minutes until softened.",
          "Stir in garlic and tomato paste for 30 seconds.",
          "Add stock, carrots, pepper.",
          "Simmer 2–3 hours until it gives up."
        ],
        variations:
`Make it worse:
- Use mince. Cut cook time to 30–40 minutes.

Make it better:
- Add a splash of red wine before the stock.

Swaps:
- Any root veg works. Keep it rough.`,
        ratings: [], // {stars, tags, at}
        comments: [] // {text, at}
      },
      {
        id: uid(),
        name: "Rustic Tomato Pasta",
        level: 2,
        moods: ["No patience", "Weeknight"],
        allergens: ["Gluten"],
        history:
          "You make this when you want dinner without ceremony. It’s pantry food, built to work even when the fridge looks grim. If you’ve got tomatoes and something salty, you’re already close.",
        ingredients: [
          ing("pasta", 300, "g"),
          ing("canned tomatoes", 400, "g"),
          ing("onion", 1, "piece", "diced"),
          ing("garlic", 2, "piece", "cloves"),
          ing("oil", 1, "tbsp"),
          ing("salt", 1, "tsp"),
          ing("chili flakes", 0.5, "tsp", "optional")
        ],
        method: [
          "Boil pasta in salted water.",
          "Cook onion in oil 6–8 minutes.",
          "Add garlic 30 seconds.",
          "Add tomatoes, salt, chili. Simmer 10 minutes.",
          "Toss pasta through sauce. Done."
        ],
        variations:
`Make it worse:
- Skip onion. Use garlic only.

Make it better:
- Add a knob of butter or a handful of cheese at the end.

Swaps:
- Any pasta shape works.`,
        ratings: [],
        comments: []
      },
      {
        id: uid(),
        name: "Pan Eggs on Toast",
        level: 1,
        moods: ["No patience", "Late dinner"],
        allergens: ["Eggs", "Gluten"],
        history:
          "This is the baseline. The ‘I need food now’ meal. The only real rule is heat control: too hot and you burn, too low and you sulk. It teaches you timing.",
        ingredients: [
          ing("eggs", 2, "piece"),
          ing("bread", 2, "piece"),
          ing("butter", 10, "g"),
          ing("salt", 0.5, "tsp"),
          ing("pepper", 0.5, "tsp")
        ],
        method: [
          "Toast bread.",
          "Melt butter in a pan on medium heat.",
          "Crack eggs in. Cook until whites set.",
          "Salt, pepper. Serve on toast."
        ],
        variations:
`Make it worse:
- Use oil. Still fine.

Make it better:
- Add a little cheese or hot sauce.

Swaps:
- Any bread. Any fat.`,
        ratings: [],
        comments: []
      }
    ],
    customRecipes: []
  };

  localStorage.setItem(LS_KEY, JSON.stringify(demo));
  return demo;
}

// Helpers
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function nowIso() {
  return new Date().toISOString();
}
function ing(name, qty, unit, note = "") {
  return { name, qty, unit, note };
}
function norm(s) {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}
function unique(arr) {
  return Array.from(new Set(arr));
}

function recipeAvgStars(r) {
  if (!r.ratings || r.ratings.length === 0) return null;
  const sum = r.ratings.reduce((a, x) => a + (x.stars || 0), 0);
  return sum / r.ratings.length;
}

function recipeIngredientNames(r) {
  return r.ingredients.map(i => norm(i.name));
}

function hasAllergen(r, allergen) {
  if (!allergen) return false;
  return (r.allergens || []).map(norm).includes(norm(allergen));
}

// Unit conversions (basic and readable)
function fmtQty(q) {
  if (q === null || q === undefined) return "";
  if (Number.isInteger(q)) return String(q);
  return (Math.round(q * 10) / 10).toString();
}

function convertIngredient(i, mode) {
  const { qty, unit } = i;
  if (mode === "metric") return `${fmtQty(qty)} ${unit}`;
  // imperial
  const u = unit.toLowerCase();
  if (u === "g") return `${fmtQty(qty / 28.3495)} oz`;
  if (u === "kg") return `${fmtQty(qty * 2.20462)} lb`;
  if (u === "ml") return `${fmtQty(qty / 29.5735)} fl oz`;
  if (u === "l") return `${fmtQty(qty / 0.946353)} qt`;
  // tsp/tbsp/piece remain
  return `${fmtQty(qty)} ${unit}`;
}

// Navigation
document.querySelectorAll(".navbtn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".navbtn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const viewId = btn.dataset.view;
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    $(viewId).classList.remove("hidden");
    // refresh view
    if (viewId === "recipesView") renderRecipes();
    if (viewId === "finderView") renderFinderResults();
    if (viewId === "bookView") renderBook();
    if (viewId === "shopView") renderShopping();
  });
});

// Units toggle
$("unitsBtn").addEventListener("click", () => {
  UNIT.mode = UNIT.mode === "metric" ? "imperial" : "metric";
  $("unitsBtn").textContent = UNIT.mode === "metric" ? "Metric" : "Imperial";
  saveState();
  renderRecipes();
  if (currentRecipeId) renderModal(currentRecipeId);
});

// Seed/reset
$("seedBtn").addEventListener("click", () => {
  const ok = confirm("Reset demo recipes and settings?\n\nOK = reset demo data (keeps shopping & favourites).\nCancel = do nothing.");
  if (!ok) return;
  const oldFav = state.favorites || [];
  const oldShop = state.shopping || [];
  const fresh = seedState();
  fresh.favorites = oldFav;
  fresh.shopping = oldShop;
  Object.assign(state, fresh);
  saveState();
  renderRecipes();
});

// Search + allergen filter on recipes
$("searchInput").addEventListener("input", renderRecipes);
$("allergenFilter").addEventListener("change", renderRecipes);

// Finder
const finder = { items: [] };
$("finderAddBtn").addEventListener("click", () => {
  const v = $("finderInput").value.trim();
  if (!v) return;
  finder.items.push(v);
  finder.items = unique(finder.items.map(x => norm(x))).map(x => x);
  $("finderInput").value = "";
  renderFinderChips();
  renderFinderResults();
});
$("finderInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("finderAddBtn").click();
});
$("finderClearBtn").addEventListener("click", () => {
  finder.items = [];
  renderFinderChips();
  renderFinderResults();
});
$("tolerance").addEventListener("input", () => {
  $("tolLabel").textContent = `${$("tolerance").value}%`;
  renderFinderResults();
});
$("finderAllergenFilter").addEventListener("change", renderFinderResults);

function renderFinderChips() {
  const chips = finder.items.map(x => `
    <button class="pill ok" data-chip="${x}">${x} ✕</button>
  `).join("");
  $("finderChips").innerHTML = chips || `<div class="small muted">Add a few ingredients to get started.</div>`;

  $("finderChips").querySelectorAll("[data-chip]").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.chip;
      finder.items = finder.items.filter(x => x !== v);
      renderFinderChips();
      renderFinderResults();
    });
  });
}

function finderMatch(recipe) {
  const have = finder.items;
  const ingredients = recipeIngredientNames(recipe);
  if (ingredients.length === 0) return { pct: 0, missing: [] };

  const matches = ingredients.filter(ingName => have.some(h => ingName.includes(h)));
  const missing = ingredients.filter(ingName => !have.some(h => ingName.includes(h)));

  const pct = Math.round((matches.length / ingredients.length) * 100);
  return { pct, missing };
}

function renderFinderResults() {
  $("tolLabel").textContent = `${$("tolerance").value}%`;

  const tol = parseInt($("tolerance").value, 10) || 0;
  const allergen = $("finderAllergenFilter").value;

  const list = state.recipes
    .filter(r => !allergen || !hasAllergen(r, allergen) ? true : false)
    .map(r => {
      const m = finderMatch(r);
      return { r, ...m };
    })
    .filter(x => {
      if (finder.items.length === 0) return true;
      const missingPct = 100 - x.pct;
      return missingPct <= tol;
    })
    .sort((a,b) => b.pct - a.pct);

  $("finderResults").innerHTML = list.map(x => recipeCardHTML(x.r, { showMatch: true, matchPct: x.pct, missing: x.missing })).join("")
    || emptyHTML("No matches yet. Add more ingredients, or increase tolerance.");

  wireRecipeCardButtons();
}

// Shopping
$("shopAddBtn").addEventListener("click", () => {
  const item = $("shopItem").value.trim();
  const qty = $("shopQty").value.trim();
  if (!item) return;
  state.shopping.push({ id: uid(), item, qty, checked: false });
  $("shopItem").value = "";
  $("shopQty").value = "";
  saveState();
  renderShopping();
});
$("shopClearCheckedBtn").addEventListener("click", () => {
  state.shopping = state.shopping.filter(x => !x.checked);
  saveState();
  renderShopping();
});
$("shopClearAllBtn").addEventListener("click", () => {
  if (!confirm("Clear entire shopping list?")) return;
  state.shopping = [];
  saveState();
  renderShopping();
});

// Voice dictation for shopping list
let recognizer = null;
$("voiceBtn").addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    $("voiceStatus").textContent = "Voice dictation not supported in this browser. Use Chrome on Android.";
    return;
  }
  if (recognizer) {
    recognizer.stop();
    recognizer = null;
    $("voiceStatus").textContent = "Stopped.";
    return;
  }

  recognizer = new SpeechRecognition();
  recognizer.lang = "en-NZ";
  recognizer.interimResults = false;
  recognizer.maxAlternatives = 1;

  $("voiceStatus").textContent = "Listening… say items like: “milk, eggs, onions”. Tap again to stop.";

  recognizer.onresult = (event) => {
    const text = event.results[0][0].transcript || "";
    $("voiceStatus").textContent = `Heard: "${text}"`;
    const items = splitDictation(text);
    items.forEach(it => state.shopping.push({ id: uid(), item: it, qty: "", checked: false }));
    saveState();
    renderShopping();
  };
  recognizer.onerror = (e) => {
    $("voiceStatus").textContent = `Voice error: ${e.error || "unknown"}`;
    recognizer = null;
  };
  recognizer.onend = () => {
    recognizer = null;
    setTimeout(() => {
      if ($("voiceStatus").textContent.startsWith("Listening")) $("voiceStatus").textContent = "Stopped.";
    }, 200);
  };
  recognizer.start();
});

function splitDictation(text) {
  const cleaned = text
    .replace(/\band\b/gi, ",")
    .replace(/\bplus\b/gi, ",")
    .replace(/;/g, ",");
  return cleaned
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function renderShopping() {
  const html = (state.shopping || []).map(x => `
    <div class="item">
      <div class="item-left">
        <div class="check ${x.checked ? "on" : ""}" data-check="${x.id}"></div>
        <div>
          <div class="item-title">${escapeHTML(x.item)}</div>
          <div class="item-sub">${escapeHTML(x.qty || "")}</div>
        </div>
      </div>
      <button class="chip subtle" data-del="${x.id}">Delete</button>
    </div>
  `).join("");

  $("shopList").innerHTML = html || emptyHTML("Shopping list is empty.");

  $("shopList").querySelectorAll("[data-check]").forEach(el => {
    el.addEventListener("click", () => {
      const id = el.dataset.check;
      const it = state.shopping.find(s => s.id === id);
      if (!it) return;
      it.checked = !it.checked;
      saveState();
      renderShopping();
    });
  });
  $("shopList").querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.del;
      state.shopping = state.shopping.filter(s => s.id !== id);
      saveState();
      renderShopping();
    });
  });
}

// Add Recipe form
$("saveRecipeBtn").addEventListener("click", () => {
  const name = $("rName").value.trim();
  if (!name) return alert("Recipe needs a name.");

  const moods = $("rMood").value.split(",").map(s => s.trim()).filter(Boolean).slice(0,3);
  const allergens = $("rAllergens").value.split(",").map(s => s.trim()).filter(Boolean);
  const level = clampInt(parseInt($("rLevel").value || "2", 10), 1, 5);

  const history = $("rHistory").value.trim();
  const ingredientsLines = $("rIngredients").value.split("\n").map(s => s.trim()).filter(Boolean);
  const methodLines = $("rMethod").value.split("\n").map(s => s.trim()).filter(Boolean);
  const variations = $("rVariations").value.trim();

  const ingredients = ingredientsLines.map(parseIngredientLine).filter(Boolean);

  const r = {
    id: uid(),
    name,
    level,
    moods,
    allergens,
    history,
    ingredients,
    method: methodLines,
    variations,
    ratings: [],
    comments: [],
    _custom: true,
    createdAt: nowIso()
  };

  state.recipes.unshift(r);
  saveState();
  clearAddForm();
  document.querySelector('[data-view="recipesView"]').click();
  renderRecipes();
  alert("Saved.");
});

$("clearRecipeBtn").addEventListener("click", clearAddForm);

function clearAddForm() {
  ["rName","rMood","rLevel","rAllergens","rHistory","rIngredients","rMethod","rVariations"].forEach(id => $(id).value = "");
}

function parseIngredientLine(line) {
  const parts = line.split(" ").filter(Boolean);
  if (parts.length < 2) return { name: line, qty: 0, unit: "", note: "" };

  const maybeQty = parseFloat(parts[0]);
  if (Number.isNaN(maybeQty)) return { name: line, qty: 0, unit: "", note: "" };

  const unit = parts[1];
  const name = parts.slice(2).join(" ").trim() || "ingredient";
  return { name, qty: maybeQty, unit, note: "" };
}

function clampInt(n, a, b){
  if (Number.isNaN(n)) return a;
  return Math.max(a, Math.min(b, n));
}

// Render Recipes
function renderRecipes() {
  const q = norm($("searchInput").value);
  const allergen = $("allergenFilter").value;

  const list = state.recipes
    .filter(r => !allergen || !hasAllergen(r, allergen) ? true : false)
    .filter(r => {
      if (!q) return true;
      const hay = [
        r.name,
        (r.moods || []).join(" "),
        (r.allergens || []).join(" "),
        r.history || "",
        (r.method || []).join(" "),
        (r.ingredients || []).map(i => i.name).join(" ")
      ].join(" ");
      return norm(hay).includes(q);
    });

  $("recipesList").innerHTML = list.map(r => recipeCardHTML(r, { showMatch: false })).join("") || emptyHTML("No recipes found.");
  wireRecipeCardButtons();
}

function renderBook() {
  const favs = new Set(state.favorites || []);
  const list = state.recipes.filter(r => favs.has(r.id) || r._custom === true);

  $("bookList").innerHTML = list.length
    ? list.map(r => recipeCardHTML(r, { showMatch:false, bookMode:true })).join("")
    : emptyHTML("No favourites yet. Open a recipe and tap ★ Favourite.");

  wireRecipeCardButtons();
}

// Recipe card UI
function recipeCardHTML(r, opts) {
  const fav = (state.favorites || []).includes(r.id);
  const avg = recipeAvgStars(r);
  const moods = (r.moods || []).slice(0,3);
  const allergens = (r.allergens || []).slice(0,4);

  const ratingPill = avg
    ? `<span class="pill">${avg.toFixed(1)} ★</span>`
    : `<span class="pill">Unrated</span>`;

  const customPill = r._custom ? `<span class="pill ok">Custom</span>` : "";

  const allergenPills = allergens.map(a => `<span class="pill danger">${escapeHTML(a)}</span>`).join("");

  return `
    <div class="card">
      <h3>${escapeHTML(r.name)}</h3>
      <div class="meta">
        <span class="badge">Level ${r.level || 2}</span>
        ${ratingPill}
        ${customPill}
      </div>
      <div class="pills">
        ${moods.map(m => `<span class="pill">${escapeHTML(m)}</span>`).join("")}
        ${allergenPills}
      </div>
      <div class="card-actions">
        <button class="btn subtle" data-open="${r.id}">Open</button>
        <button class="btn subtle" data-fav="${r.id}">${fav ? "★ Saved" : "☆ Save"}</button>
      </div>
    </div>
  `;
}

function wireRecipeCardButtons() {
  document.querySelectorAll("[data-open]").forEach(btn => {
    btn.onclick = () => openModal(btn.dataset.open);
  });
  document.querySelectorAll("[data-fav]").forEach(btn => {
    btn.onclick = () => toggleFav(btn.dataset.fav);
  });
}

function toggleFav(id) {
  const favs = new Set(state.favorites || []);
  if (favs.has(id)) favs.delete(id); else favs.add(id);
  state.favorites = Array.from(favs);
  saveState();
  renderRecipes();
  renderBook();
  if (currentRecipeId === id) renderModal(id);
}

function emptyHTML(text) {
  return `<div class="panel"><div class="small muted">${escapeHTML(text)}</div></div>`;
}

function escapeHTML(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

// Modal logic
const modal = $("modal");
$("closeModal").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

document.querySelectorAll(".tab").forEach(t => {
  t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    const target = t.dataset.tab;
    document.querySelectorAll(".tabpane").forEach(p => p.classList.add("hidden"));
    $(target).classList.remove("hidden");
  });
});

function openModal(id) {
  currentRecipeId = id;
  renderModal(id);
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
  currentRecipeId = null;
}

function renderModal(id) {
  const r = state.recipes.find(x => x.id === id);
  if (!r) return;

  $("mTitle").textContent = r.name;
  const avg = recipeAvgStars(r);
  $("mMeta").textContent = `Morsel Level ${r.level || 2} • ${avg ? avg.toFixed(1) + "★" : "Unrated"} • ${(r.moods || []).join(", ")}`;

  document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
  document.querySelector('.tab[data-tab="historyTab"]').classList.add("active");
  document.querySelectorAll(".tabpane").forEach(p => p.classList.add("hidden"));
  $("historyTab").classList.remove("hidden");

  $("historyTab").innerHTML = escapeHTML(r.history || "No history yet.");
  $("ingredientsTab").innerHTML = renderIngredientsTab(r);
  $("methodTab").innerHTML = renderMethodTab(r);
  $("variationsTab").innerHTML = escapeHTML(r.variations || "No variations yet.");
  $("ratingsTab").innerHTML = renderRatingsTab(r);
  $("commentsTab").innerHTML = renderCommentsTab(r);

  const fav = (state.favorites || []).includes(r.id);
  $("favBtn").textContent = fav ? "★ Saved" : "☆ Favourite";
  $("favBtn").onclick = () => toggleFav(r.id);

  $("addToShopBtn").onclick = () => {
    const items = r.ingredients.map(i => ({
      id: uid(),
      item: i.name,
      qty: `${convertIngredient(i, UNIT.mode)}`.trim(),
      checked: false
    }));
    const existing = new Set((state.shopping || []).map(x => norm(x.item)));
    items.forEach(it => {
      if (!existing.has(norm(it.item))) state.shopping.push(it);
    });
    saveState();
    alert("Added to shopping list.");
  };
}

function renderIngredientsTab(r) {
  const rows = r.ingredients.map(i => {
    const qty = i.qty ? convertIngredient(i, UNIT.mode) : "";
    const note = i.note ? ` — <span class="muted">${escapeHTML(i.note)}</span>` : "";
    return `• <b>${escapeHTML(i.name)}</b> ${qty ? `<span class="muted">(${escapeHTML(qty)})</span>` : ""}${note}`;
  }).join("\n");
  const allerg = (r.allergens || []).length
    ? `\n\nAllergens: ${(r.allergens || []).join(", ")}`
    : "\n\nAllergens: None listed.";
  return `<div>${rows || "No ingredients yet."}${escapeHTML(allerg)}</div>`;
}

function renderMethodTab(r) {
  const steps = (r.method || []).map((s, idx) => `${idx+1}. ${s}`).join("\n");
  return `<div>${escapeHTML(steps || "No method yet.")}</div>`;
}

function renderRatingsTab(r) {
  const avg = recipeAvgStars(r);
  const tags = ["Easy","Forgiving","Time-heavy","Worth the effort","Would cook again"];

  const starsRow = [1,2,3,4,5].map(n => `<button class="starbtn" data-star="${n}">${n}★</button>`).join("");

  const tagsRow = tags.map(t => `<button class="pill" data-rtag="${escapeHTML(t)}">${escapeHTML(t)}</button>`).join("");

  const list = (r.ratings || []).slice(-8).reverse().map(x => {
    const t = (x.tags || []).join(", ");
    return `• ${x.stars}★ ${t ? "— " + t : ""} <span class="muted">(${new Date(x.at).toLocaleDateString()})</span>`;
  }).join("\n");

  return `
    <div class="panel">
      <div class="small muted">Average: ${avg ? avg.toFixed(1) + "★" : "Unrated"}</div>
      <div class="ratingRow" style="margin-top:8px">${starsRow}</div>
      <div class="small muted" style="margin-top:10px">Optional tags (tap to toggle):</div>
      <div class="pills">${tagsRow}</div>
      <div class="hr"></div>
      <div class="small muted">Recent ratings:</div>
      <div>${escapeHTML(list || "No ratings yet.")}</div>
    </div>
  `;
}

function renderCommentsTab(r) {
  const existing = (r.comments || []).slice(-20).reverse().map(c => `
    <div class="panel">
      <div class="small muted">${new Date(c.at).toLocaleString()}</div>
      <div>${escapeHTML(c.text)}</div>
    </div>
  `).join("");

  return `
    <div class="panel">
      <div class="small muted">Keep it useful. First-person. No fluff.</div>
      <textarea id="newComment" class="input area" placeholder="What changed? What worked? What didn’t?"></textarea>
      <button id="postCommentBtn" class="btn" style="margin-top:8px">Post comment</button>
    </div>
    ${existing || emptyHTML("No comments yet.")}
  `;
}

// Wire rating + tag selection
document.addEventListener("click", (e) => {
  if (!currentRecipeId) return;
  const r = state.recipes.find(x => x.id === currentRecipeId);
  if (!r) return;

  const starBtn = e.target.closest("[data-star]");
  if (starBtn) {
    const stars = parseInt(starBtn.dataset.star, 10);
    const selectedTags = Array.from(document.querySelectorAll("[data-rtag].on")).map(x => x.dataset.rtag);
    r.ratings.push({ stars, tags: selectedTags, at: nowIso() });
    saveState();
    renderModal(currentRecipeId);
    return;
  }

  const tagBtn = e.target.closest("[data-rtag]");
  if (tagBtn) {
    tagBtn.classList.toggle("on");
    tagBtn.classList.toggle("ok");
    return;
  }

  if (e.target && e.target.id === "postCommentBtn") {
    const ta = $("newComment");
    const text = (ta?.value || "").trim();
    if (!text) return;
    r.comments.unshift({ text, at: nowIso() });
    saveState();
    renderModal(currentRecipeId);
    return;
  }
});

// Initial render
renderRecipes();
renderFinderChips();
renderShopping();
renderBook();
