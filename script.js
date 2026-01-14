/* Morsel — static app (GitHub Pages)
   - Food + Cocktails
   - Cocktails have age verification wall (18+)
   - Recipe tabs: History / Ingredients / Method / Variations / Rate+Comments
   - Metric/Imperial toggle
   - Finder: ingredients you have → recipes you can make
   - Favourites + My Recipes
   - Shopping list
   - Seeds thousands of demo recipes
*/

const LS = {
  UNITS: "morsel_units",
  AGE_OK: "morsel_age_ok",
  RECIPES: "morsel_recipes_v3",
  MY_RECIPES: "morsel_my_recipes_v3",
  FAVS: "morsel_favs_v3",
  COMMENTS: "morsel_comments_v3",
  RATINGS: "morsel_ratings_v3",
  SHOP: "morsel_shop_v3",
  FINDER: "morsel_finder_v3",
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* -------------------- State -------------------- */
let units = localStorage.getItem(LS.UNITS) || "metric"; // metric | imperial
let recipes = [];
let myRecipes = [];
let favs = new Set(JSON.parse(localStorage.getItem(LS.FAVS) || "[]"));
let commentsById = JSON.parse(localStorage.getItem(LS.COMMENTS) || "{}");
let ratingsById = JSON.parse(localStorage.getItem(LS.RATINGS) || "{}");
let shop = JSON.parse(localStorage.getItem(LS.SHOP) || "[]");
let finder = JSON.parse(localStorage.getItem(LS.FINDER) || "[]");

/* -------------------- Boot -------------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  bindNav();
  bindTopActions();
  bindAgeGateButtons();
  renderAll();
});

/* -------------------- Data -------------------- */
function loadData() {
  // Catalogue
  const stored = localStorage.getItem(LS.RECIPES);
  if (stored) {
    try { recipes = JSON.parse(stored); } catch { recipes = []; }
  }

  // My recipes
  const mine = localStorage.getItem(LS.MY_RECIPES);
  if (mine) {
    try { myRecipes = JSON.parse(mine); } catch { myRecipes = []; }
  }

  // Seed
  if (!Array.isArray(recipes) || recipes.length < 50) {
    recipes = buildSeedCatalogue(1400, 260);
    localStorage.setItem(LS.RECIPES, JSON.stringify(recipes));
  }
}

function saveMyRecipes() { localStorage.setItem(LS.MY_RECIPES, JSON.stringify(myRecipes)); }
function saveFavs() { localStorage.setItem(LS.FAVS, JSON.stringify(Array.from(favs))); }
function saveComments() { localStorage.setItem(LS.COMMENTS, JSON.stringify(commentsById)); }
function saveRatings() { localStorage.setItem(LS.RATINGS, JSON.stringify(ratingsById)); }
function saveShop() { localStorage.setItem(LS.SHOP, JSON.stringify(shop)); }
function saveFinder() { localStorage.setItem(LS.FINDER, JSON.stringify(finder)); }

/* -------------------- Age Gate -------------------- */
let cocktailsRequested = false;

function ageOk() {
  return localStorage.getItem(LS.AGE_OK) === "yes";
}

function showAgeGate() {
  const gate = $("#ageGate");
  if (!gate) return;
  gate.classList.remove("hidden");
  gate.setAttribute("aria-hidden", "false");
}

function hideAgeGate() {
  const gate = $("#ageGate");
  if (!gate) return;
  gate.classList.add("hidden");
  gate.setAttribute("aria-hidden", "true");
}

function bindAgeGateButtons() {
  const yes = $("#ageYes");
  const no = $("#ageNo");

  // IMPORTANT: if IDs are missing, age gate can never work
  if (!yes || !no) {
    console.warn("Age gate buttons not found. Check index.html IDs: ageYes, ageNo");
    return;
  }

  yes.addEventListener("click", () => {
    localStorage.setItem(LS.AGE_OK, "yes");
    hideAgeGate();

    if (cocktailsRequested) {
      cocktailsRequested = false;
      showView("cocktailsView", true);
    }
  });

  no.addEventListener("click", () => {
    localStorage.setItem(LS.AGE_OK, "no");
    cocktailsRequested = false;
    hideAgeGate();
    showView("recipesView", true);
    toast("Cocktails locked 🔒");
  });
}

/* -------------------- Navigation -------------------- */
function bindNav() {
  $$(".navbtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;

      if (view === "cocktailsView") {
        if (ageOk()) {
          showView("cocktailsView", true);
        } else {
          cocktailsRequested = true;
          showAgeGate();
        }
        return;
      }

      showView(view, true);
    });
  });
}

function showView(id, updateNav=false) {
  $$(".view").forEach(v => v.classList.add("hidden"));
  const el = $(`#${id}`);
  if (el) el.classList.remove("hidden");

  if (updateNav) {
    $$(".navbtn").forEach(b => b.classList.remove("active"));
    const btn = $(`.navbtn[data-view="${id}"]`);
    if (btn) btn.classList.add("active");
  }

  if (id === "recipesView") renderRecipes();
  if (id === "finderView") renderFinder();
  if (id === "bookView") renderBook();
  if (id === "shopView") renderShop();
  if (id === "cocktailsView") renderCocktails();
}

/* -------------------- Top Actions -------------------- */
function bindTopActions() {
  const unitsBtn = $("#unitsBtn");
  unitsBtn.textContent = units === "metric" ? "Metric" : "Imperial";

  unitsBtn.addEventListener("click", () => {
    units = units === "metric" ? "imperial" : "metric";
    localStorage.setItem(LS.UNITS, units);
    unitsBtn.textContent = units === "metric" ? "Metric" : "Imperial";
    renderAll();
  });

  $("#seedBtn").addEventListener("click", () => {
    recipes = buildSeedCatalogue(1400, 260);
    localStorage.setItem(LS.RECIPES, JSON.stringify(recipes));
    renderAll();
    toast("Seeded a fresh demo catalogue ✅");
  });

  // Recipes filters
  $("#searchInput").addEventListener("input", renderRecipes);
  $("#typeFilter").addEventListener("change", renderRecipes);
  $("#allergenFilter").addEventListener("change", renderRecipes);
  $("#moodFilter").addEventListener("change", renderRecipes);

  $("#clearFiltersBtn").addEventListener("click", () => {
    $("#searchInput").value = "";
    $("#typeFilter").value = "food";
    $("#allergenFilter").value = "";
    $("#moodFilter").value = "";
    renderRecipes();
  });

  // Cocktails filters
  $("#cocktailSearch").addEventListener("input", renderCocktails);
  $("#cocktailMood").addEventListener("change", renderCocktails);
  $("#cocktailClearBtn").addEventListener("click", () => {
    $("#cocktailSearch").value = "";
    $("#cocktailMood").value = "";
    renderCocktails();
  });

  // Finder
  $("#finderAddBtn").addEventListener("click", addFinderItem);
  $("#finderInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addFinderItem();
  });
  $("#tolerance").addEventListener("input", () => {
    $("#tolLabel").textContent = `${$("#tolerance").value}%`;
    renderFinder();
  });
  $("#finderType").addEventListener("change", renderFinder);
  $("#finderAllergenFilter").addEventListener("change", renderFinder);
  $("#finderClearBtn").addEventListener("click", () => {
    finder = [];
    saveFinder();
    renderFinder();
  });

  // Shopping
  $("#shopAddBtn").addEventListener("click", addShopItem);
  $("#shopInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addShopItem();
  });
  $("#shopClearBtn").addEventListener("click", () => {
    shop = [];
    saveShop();
    renderShop();
  });

  // Add recipe
  $("#addSaveBtn").addEventListener("click", saveNewRecipe);
  $("#addResetBtn").addEventListener("click", resetAddForm);
}

/* -------------------- Render All -------------------- */
function renderAll() {
  renderRecipes();
  renderFinder();
  renderBook();
  renderShop();
  renderCocktails();
}

/* -------------------- Recipes View -------------------- */
function renderRecipes() {
  const q = norm($("#searchInput").value);
  const typeFilter = $("#typeFilter").value;
  const allergen = $("#allergenFilter").value;
  const mood = $("#moodFilter").value;

  const base = getAllRecipes();
  const filtered = base.filter(r => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (allergen && !r.allergens.includes(allergen)) return false;
    if (mood && !r.moods.includes(mood)) return false;

    if (!q) return true;
    const hay = [r.name, r.moods.join(" "), r.allergens.join(" "), r.ingredientsText, r.type].join(" ");
    return norm(hay).includes(q);
  });

  const list = $("#recipesList");
  list.innerHTML = filtered.map(r => recipeCardHTML(r)).join("");
  $("#recipesEmpty").classList.toggle("hidden", filtered.length !== 0);
  wireCardEvents(list);
}

/* -------------------- Cocktails View -------------------- */
function renderCocktails() {
  const q = norm($("#cocktailSearch").value);
  const mood = $("#cocktailMood").value;

  const base = getAllRecipes().filter(r => r.type === "cocktail");
  const filtered = base.filter(r => {
    if (mood && !r.moods.includes(mood)) return false;
    if (!q) return true;
    const hay = [r.name, r.moods.join(" "), r.ingredientsText, r.allergens.join(" ")].join(" ");
    return norm(hay).includes(q);
  });

  const list = $("#cocktailsList");
  list.innerHTML = filtered.map(r => recipeCardHTML(r)).join("");
  $("#cocktailsEmpty").classList.toggle("hidden", filtered.length !== 0);
  wireCardEvents(list);
}

/* -------------------- Finder -------------------- */
function addFinderItem() {
  const raw = $("#finderInput").value.trim();
  if (!raw) return;
  const item = norm(raw);
  if (!item) return;

  if (!finder.includes(item)) finder.push(item);
  $("#finderInput").value = "";
  saveFinder();
  renderFinder();
}

function renderFinder() {
  const chips = $("#finderChips");
  chips.innerHTML = finder.map(i => `<button class="chip subtle" data-ing="${escapeHtml(i)}">${escapeHtml(i)} ✕</button>`).join("");
  chips.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      const ing = b.dataset.ing;
      finder = finder.filter(x => x !== ing);
      saveFinder();
      renderFinder();
    });
  });

  $("#tolLabel").textContent = `${$("#tolerance").value}%`;

  const list = $("#finderResults");
  if (finder.length === 0) {
    list.innerHTML = "";
    $("#finderEmpty").classList.remove("hidden");
    return;
  }
  $("#finderEmpty").classList.add("hidden");

  const tolerance = parseInt($("#tolerance").value, 10);
  const type = $("#finderType").value;
  const allergen = $("#finderAllergenFilter").value;

  const base = getAllRecipes().filter(r => {
    if (type !== "all" && r.type !== type) return false;
    if (allergen && !r.allergens.includes(allergen)) return false;
    return true;
  });

  const results = base.map(r => {
    const req = uniqueWords(r.ingredientsList);
    const matched = req.filter(w => finder.includes(w));
    const missing = req.filter(w => !finder.includes(w));
    const missingPct = req.length ? (missing.length / req.length) * 100 : 100;
    return { r, matchedCount: matched.length, missingCount: missing.length, missingPct, missing };
  })
  .filter(x => x.missingPct <= tolerance)
  .sort((a,b) => (b.matchedCount - a.matchedCount) || (a.missingCount - b.missingCount))
  .slice(0, 80);

  list.innerHTML = results.map(x => {
    const badge = `<span class="badge ${x.missingCount===0 ? "ok" : "hot"}">${x.missingCount===0 ? "Perfect match" : `${x.matchedCount}/${x.matchedCount+x.missingCount} match`}</span>`;
    return recipeCardHTML(x.r, badge, x.missing);
  }).join("");

  wireCardEvents(list);
}

/* -------------------- Book -------------------- */
function renderBook() {
  const base = getAllRecipes();

  const favList = $("#favsList");
  const favRecipes = base.filter(r => favs.has(r.id));
  favList.innerHTML = favRecipes.map(r => recipeCardHTML(r)).join("");
  $("#favsEmpty").classList.toggle("hidden", favRecipes.length !== 0);
  wireCardEvents(favList);

  const myList = $("#myRecipesList");
  myList.innerHTML = myRecipes.map(r => recipeCardHTML(r)).join("");
  $("#myRecipesEmpty").classList.toggle("hidden", myRecipes.length !== 0);
  wireCardEvents(myList);
}

/* -------------------- Shopping -------------------- */
function addShopItem() {
  const txt = $("#shopInput").value.trim();
  if (!txt) return;
  shop.unshift({ txt, done: false });
  $("#shopInput").value = "";
  saveShop();
  renderShop();
}

function renderShop() {
  const ul = $("#shopList");
  ul.innerHTML = shop.map((it, idx) => `
    <li class="shopitem ${it.done ? "done" : ""}" data-idx="${idx}">
      <span>${escapeHtml(it.txt)}</span>
      <span class="x" data-x="${idx}">✕</span>
    </li>
  `).join("");

  $("#shopEmpty").classList.toggle("hidden", shop.length !== 0);

  ul.querySelectorAll(".shopitem").forEach(li => {
    li.addEventListener("click", (e) => {
      const x = e.target.getAttribute("data-x");
      if (x !== null) return;
      const idx = parseInt(li.dataset.idx, 10);
      shop[idx].done = !shop[idx].done;
      saveShop();
      renderShop();
    });
  });

  ul.querySelectorAll("[data-x]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute("data-x"), 10);
      shop.splice(idx, 1);
      saveShop();
      renderShop();
    });
  });
}

/* -------------------- Add Recipe -------------------- */
function resetAddForm() {
  $("#addName").value = "";
  $("#addType").value = "food";
  $("#addMoods").value = "";
  $("#addLevel").value = "";
  $("#addAllergens").value = "";
  $("#addServes").value = "";
  $("#addHistory").value = "";
  $("#addIngredients").value = "";
  $("#addMethod").value = "";
  $("#addVariations").value = "";
}

function saveNewRecipe() {
  const name = $("#addName").value.trim();
  const type = $("#addType").value;
  const moods = parseCommaTags($("#addMoods").value, 3);
  const level = clampInt($("#addLevel").value, 1, 5, 2);
  let allergens = parseCommaTags($("#addAllergens").value, 10);
  const serves = $("#addServes").value.trim() || (type === "cocktail" ? "1" : "2");
  const history = $("#addHistory").value.trim();
  const ingredientsText = $("#addIngredients").value.trim();
  const method = $("#addMethod").value.trim();
  const variations = $("#addVariations").value.trim();

  if (!name || !ingredientsText || !method) {
    toast("Name, Ingredients, and Method are required.");
    return;
  }

  if (type === "cocktail" && !allergens.includes("Alcohol")) allergens.push("Alcohol");

  const r = normalizeRecipe({
    id: `my_${Date.now()}`,
    type, name, moods, level, allergens, serves,
    history, ingredientsText, method, variations,
    source: "user",
  });

  myRecipes.unshift(r);
  saveMyRecipes();
  resetAddForm();
  toast("Saved ✅");
  renderBook();
  showView("bookView", true);
}

/* -------------------- Cards -------------------- */
function recipeCardHTML(r, extraBadgeHTML = "", missingList = null) {
  const isFav = favs.has(r.id);
  const avg = getAvgRating(r.id);
  const ratingsCount = (ratingsById[r.id] || []).length;

  const levelBadge = `<span class="badge hot">Level ${r.level}/5</span>`;
  const typeBadge = r.type === "cocktail"
    ? `<span class="badge bad">Cocktail</span>`
    : `<span class="badge ok">Food</span>`;

  const moodBadges = r.moods.slice(0,3).map(m => `<span class="badge">${escapeHtml(m)}</span>`).join("");
  const allergenBadges = r.allergens.slice(0,3).map(a => `<span class="badge bad">${escapeHtml(a)}</span>`).join("");

  const missingNote = missingList && missingList.length
    ? `<div class="small" style="margin-top:8px;">Missing: ${missingList.slice(0,6).map(escapeHtml).join(", ")}${missingList.length>6?"…":""}</div>`
    : "";

  return `
    <article class="card" data-id="${escapeHtml(r.id)}">
      <div class="card-top">
        <div>
          <div class="card-title">${escapeHtml(r.name)}</div>
          <div class="card-meta">
            ⏱ ${escapeHtml(r.time)} • 👥 ${escapeHtml(r.serves)} • ⭐ ${avg.toFixed(1)} (${ratingsCount})
          </div>
          <div class="badges">
            ${typeBadge}
            ${levelBadge}
            ${extraBadgeHTML}
            ${moodBadges}
            ${allergenBadges}
          </div>
          ${missingNote}
        </div>
        <button class="heart ${isFav ? "active" : ""}" title="Favourite" data-fav="${escapeHtml(r.id)}">${isFav ? "♥" : "♡"}</button>
      </div>

      <div class="card-body">
        <div class="tabs">
          <button class="tab active" data-tab="history">History</button>
          <button class="tab" data-tab="ingredients">Ingredients</button>
          <button class="tab" data-tab="method">Method</button>
          <button class="tab" data-tab="variations">Variations</button>
          <button class="tab" data-tab="rate">Rate</button>
        </div>

        <div class="tabpanel" data-panel="history">
          <div class="pre">${escapeHtml(r.history || "No story yet.")}</div>
        </div>

        <div class="tabpanel hidden" data-panel="ingredients">
          <div class="pre">${escapeHtml(formatIngredientsForUnits(r.ingredientsText))}</div>
          <div class="actions">
            <button class="actionbtn primary" data-add-shop="${escapeHtml(r.id)}">Add to shopping</button>
          </div>
        </div>

        <div class="tabpanel hidden" data-panel="method">
          <div class="pre">${escapeHtml(r.method)}</div>
        </div>

        <div class="tabpanel hidden" data-panel="variations">
          <div class="pre">${escapeHtml(r.variations || "Try swaps, upgrades or cheaper versions.")}</div>
        </div>

        <div class="tabpanel hidden" data-panel="rate">
          <div class="row">
            <button class="actionbtn" data-rate="${escapeHtml(r.id)}" data-stars="1">1</button>
            <button class="actionbtn" data-rate="${escapeHtml(r.id)}" data-stars="2">2</button>
            <button class="actionbtn" data-rate="${escapeHtml(r.id)}" data-stars="3">3</button>
            <button class="actionbtn" data-rate="${escapeHtml(r.id)}" data-stars="4">4</button>
            <button class="actionbtn" data-rate="${escapeHtml(r.id)}" data-stars="5">5</button>
            <span class="small">Avg: ${avg.toFixed(1)} (${ratingsCount})</span>
          </div>

          <div class="row">
            <input class="input" data-comment-input="${escapeHtml(r.id)}" placeholder="Leave feedback" />
            <button class="btn subtle" data-comment-send="${escapeHtml(r.id)}">Post</button>
          </div>

          <div class="small" style="margin-top:8px;">
            ${renderComments(r.id)}
          </div>
        </div>
      </div>
    </article>
  `;
}

function wireCardEvents(container) {
  container.querySelectorAll(".card").forEach(card => {
    const tabs = card.querySelectorAll(".tab");
    const panels = card.querySelectorAll(".tabpanel");
    tabs.forEach(t => {
      t.addEventListener("click", () => {
        tabs.forEach(x => x.classList.remove("active"));
        t.classList.add("active");
        const target = t.dataset.tab;
        panels.forEach(p => p.classList.toggle("hidden", p.dataset.panel !== target));
      });
    });
  });

  container.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-fav");
      if (favs.has(id)) favs.delete(id); else favs.add(id);
      saveFavs();
      renderAll();
    });
  });

  container.querySelectorAll("[data-add-shop]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-add-shop");
      const r = getAllRecipes().find(x => x.id === id);
      if (!r) return;
      const lines = r.ingredientsText.split("\n").map(s => s.trim()).filter(Boolean);
      lines.slice(0, 40).reverse().forEach(line => shop.unshift({ txt: line, done: false }));
      saveShop();
      toast("Added ingredients ✅");
    });
  });

  container.querySelectorAll("[data-rate]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-rate");
      const stars = parseInt(btn.getAttribute("data-stars"), 10);
      ratingsById[id] = ratingsById[id] || [];
      ratingsById[id].push(stars);
      if (ratingsById[id].length > 200) ratingsById[id] = ratingsById[id].slice(-200);
      saveRatings();
      renderAll();
    });
  });

  container.querySelectorAll("[data-comment-send]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-comment-send");
      const input = container.querySelector(`[data-comment-input="${CSS.escape(id)}"]`);
      if (!input) return;
      const txt = input.value.trim();
      if (!txt) return;
      commentsById[id] = commentsById[id] || [];
      commentsById[id].unshift({ txt, when: Date.now() });
      commentsById[id] = commentsById[id].slice(0, 60);
      input.value = "";
      saveComments();
      renderAll();
    });
  });
}

/* -------------------- Helpers -------------------- */
function getAllRecipes() {
  return [...myRecipes, ...recipes].map(normalizeRecipe);
}

function normalizeRecipe(r) {
  if (r._normalized) return r;

  const out = {
    id: r.id,
    type: r.type || "food",
    name: r.name || "Untitled",
    moods: Array.isArray(r.moods) ? r.moods : [],
    level: clampInt(r.level, 1, 5, 2),
    allergens: Array.isArray(r.allergens) ? r.allergens : [],
    serves: (r.serves ?? "2").toString(),
    time: r.time || guessTime(outLevel(r.level)),
    history: r.history || "",
    ingredientsText: r.ingredientsText || "",
    method: r.method || "",
    variations: r.variations || "",
    source: r.source || "seed",
  };

  out.moods = out.moods.map(cleanTag).filter(Boolean).slice(0,3);
  out.allergens = out.allergens.map(cleanTag).filter(Boolean);

  if (out.type === "cocktail" && !out.allergens.includes("Alcohol")) out.allergens.push("Alcohol");

  out.ingredientsList = extractIngredientWords(out.ingredientsText);
  out._normalized = true;
  return out;
}

function outLevel(level) {
  const n = parseInt(level, 10);
  if (!Number.isFinite(n)) return 2;
  return n;
}

function guessTime(level) {
  if (level <= 1) return "10m";
  if (level === 2) return "20m";
  if (level === 3) return "35m";
  if (level === 4) return "55m";
  return "90m";
}

function cleanTag(s) {
  return (s || "").toString().trim().replace(/\s+/g, " ").replace(/(^,)|(,$)/g, "");
}

function parseCommaTags(s, max) {
  return (s || "").split(",").map(x => cleanTag(x)).filter(Boolean).slice(0, max);
}

function norm(s) { return (s || "").toString().toLowerCase().trim(); }

function escapeHtml(str) {
  return (str || "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function uniqueWords(arr) {
  return Array.from(new Set(arr));
}

function extractIngredientWords(text) {
  const lines = (text || "").split("\n").map(x => x.trim()).filter(Boolean);
  const words = [];
  const stop = new Set(["fresh","taste","small","large","medium","cup","cups","tbsp","tsp","teaspoon","tablespoon","grams","gram","kg","ml","litre","liter","pinch","dash","chopped","sliced","diced","minced","optional","ice"]);
  for (const line of lines) {
    const w = line.toLowerCase()
      .replace(/[0-9]/g, " ")
      .replace(/[()]/g, " ")
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter(x => x.length >= 3 && !stop.has(x));
    w.forEach(x => words.push(x));
  }
  return uniqueWords(words);
}

/* Units */
function formatIngredientsForUnits(text) {
  if (units === "metric") return text || "";
  const lines = (text || "").split("\n");
  return lines.map(convertLineToImperial).join("\n");
}

function convertLineToImperial(line) {
  const s = line.trim();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|l)\b/i);
  if (!m) return line;
  const qty = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  const rest = s.slice(m[0].length).trim();
  let converted = "";
  if (unit === "g") converted = `${roundNice(qty * 0.035274)} oz`;
  else if (unit === "kg") converted = `${roundNice(qty * 2.20462)} lb`;
  else if (unit === "ml") converted = `${roundNice(qty * 0.033814)} fl oz`;
  else if (unit === "l") converted = `${roundNice(qty * 33.814)} fl oz`;
  else return line;
  return `${converted} ${rest}`.trim();
}

function roundNice(n) {
  if (n < 1) return n.toFixed(2);
  if (n < 10) return n.toFixed(1);
  return Math.round(n).toString();
}

/* Ratings + comments */
function getAvgRating(id) {
  const arr = ratingsById[id] || [];
  if (!arr.length) return 0;
  return arr.reduce((a,b)=>a+b,0) / arr.length;
}

function renderComments(id) {
  const arr = commentsById[id] || [];
  if (!arr.length) return "No comments yet.";
  return arr.slice(0, 6).map(c => {
    const when = new Date(c.when).toLocaleDateString();
    return `• ${escapeHtml(c.txt)} <span class="small">(${when})</span>`;
  }).join("<br/>");
}

/* Toast */
let toastTimer = null;
function toast(msg) {
  clearTimeout(toastTimer);
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.style.position = "fixed";
    el.style.left = "12px";
    el.style.right = "12px";
    el.style.bottom = "14px";
    el.style.padding = "12px";
    el.style.borderRadius = "16px";
    el.style.background = "rgba(22,22,24,.95)";
    el.style.border = "1px solid rgba(255,255,255,.12)";
    el.style.color = "white";
    el.style.zIndex = "99999";
    el.style.textAlign = "center";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = "block";
  toastTimer = setTimeout(() => { el.style.display = "none"; }, 2200);
}

/* Seed Generator */
function buildSeedCatalogue(foodCount = 1000, cocktailCount = 200) {
  const cuisines = ["Rustic","Country","Homestyle","Backyard","Campfire","Garden","Pantry","Coastal"];
  const proteins = ["Chicken","Beef","Pork","Lamb","Tofu","Beans","Fish","Mushroom"];
  const mains = ["Stew","Stir-fry","Skillet","Bake","Pasta","Curry","Salad","Soup","Tacos","Bowl"];
  const sides = ["Potatoes","Rice","Greens","Beans","Corn","Noodles","Slaw","Bread"];
  const sauces = ["Garlic Butter","Smoky Tomato","Herb Lemon","Pepper Gravy","Chilli Lime","Miso Ginger","Creamy Mustard","Honey Soy"];
  const moods = ["Comfort","Quick","Healthy","Budget","Spicy","Slow cook","Date night","BBQ","Fresh"];
  const allergensPool = ["Gluten","Dairy","Eggs","Peanuts","Tree nuts","Soy","Fish","Shellfish","Sesame"];

  const baseIngredients = [
    "1 onion",
    "2 cloves garlic",
    "1 tbsp oil",
    "1 tsp salt",
    "1 tsp pepper",
    "1 tsp paprika",
    "250 ml stock",
  ];

  const out = [];

  for (let i=0; i<foodCount; i++) {
    const p = proteins[i % proteins.length];
    const dish = mains[(i*7) % mains.length];
    const vibe = cuisines[(i*3) % cuisines.length];
    const side = sides[(i*5) % sides.length];
    const sauce = sauces[(i*11) % sauces.length];

    const name = `${vibe} ${p} ${dish}`;
    const level = (i % 5) + 1;
    const moodTags = pick3(moods, i);
    const allergens = pickAllergens(allergensPool, i, 0.18);

    const ingredientsText = [
      `300 g ${p.toLowerCase() === "tofu" ? "tofu" : p.toLowerCase()}`,
      ...baseIngredients,
      `1 cup ${side.toLowerCase()}`,
      `2 tbsp ${sauce.toLowerCase()}`,
      `1 tbsp vinegar or lemon`,
    ].join("\n");

    const history = `Born from a ${vibe.toLowerCase()} kitchen idea: feed people well using what’s around.`;
    const method = [
      `1) Heat oil. Cook onion + garlic until soft.`,
      `2) Add ${p.toLowerCase()} and season.`,
      `3) Add stock, simmer until tender.`,
      `4) Stir in ${sauce.toLowerCase()} and taste-adjust.`,
      `5) Serve with ${side.toLowerCase()}.`,
    ].join("\n");

    const variations = [
      `• Hotter: add chilli.`,
      `• Cheaper: swap ${p.toLowerCase()} for beans.`,
      `• Faster: use cooked protein and reduce simmer.`,
    ].join("\n");

    out.push(normalizeRecipe({
      id: `seed_food_${i}`,
      type: "food",
      name,
      moods: moodTags,
      level,
      allergens,
      serves: ((i % 4) + 2).toString(),
      time: guessTime(level),
      history,
      ingredientsText,
      method,
      variations,
      source: "seed",
    }));
  }

  const spirits = ["Vodka","Gin","Rum","Tequila","Whiskey","Bourbon"];
  const styles = ["Sour","Highball","Fizz","Spritz","Mule","Old Fashioned","Punch"];
  const cocktailMoods = ["Fresh","Date night","Party","Classic","Tropical"];

  for (let i=0; i<cocktailCount; i++) {
    const spirit = spirits[i % spirits.length];
    const style = styles[(i*5) % styles.length];
    const name = `${spirit} ${style}`;

    out.push(normalizeRecipe({
      id: `seed_cocktail_${i}`,
      type: "cocktail",
      name,
      moods: [cocktailMoods[i % cocktailMoods.length], cocktailMoods[(i+2) % cocktailMoods.length]].slice(0,3),
      level: ((i % 3) + 1),
      allergens: ["Alcohol"],
      serves: "1",
      time: "5m",
      history: `A simple ${style.toLowerCase()} built around ${spirit.toLowerCase()}.`,
      ingredientsText: `60 ml ${spirit.toLowerCase()}\n30 ml citrus juice\n15 ml syrup\nIce\nTop with soda (optional)`,
      method: `1) Shake spirit + citrus + syrup with ice.\n2) Strain into a glass with fresh ice.\n3) Optional: top with soda.`,
      variations: `• Less sweet: halve syrup.\n• Stronger: +15 ml spirit.\n• Softer: top with soda/tonic.`,
      source: "seed",
    }));
  }

  return out;
}

function pick3(arr, i) {
  const a = arr[i % arr.length];
  const b = arr[(i*3 + 2) % arr.length];
  const c = arr[(i*7 + 5) % arr.length];
  return uniqueWords([a,b,c]).slice(0,3);
}

function pickAllergens(pool, i, chance=0.15) {
  const flag = ((i * 37) % 100) / 100;
  if (flag > chance) return [];
  const a = pool[i % pool.length];
  const flag2 = ((i * 91) % 100) / 100;
  if (flag2 < chance/3) {
    const b = pool[(i*5 + 1) % pool.length];
    return uniqueWords([a,b]);
  }
  return [a];
         }
