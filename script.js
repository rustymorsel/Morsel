/* Morsel (static GitHub Pages)
   - Tabs/views + working nav
   - Age gate for Cocktails
   - Seed 1000s of recipes (procedural) on first run
   - Favourites, My Recipes, Finder, Shopping
*/

const LS = {
  UNITS: "morsel_units",
  AGE_OK: "morsel_age_ok",
  RECIPES: "morsel_recipes_v3",
  MY_RECIPES: "morsel_my_recipes_v3",
  FAVS: "morsel_favs_v3",
  SHOP: "morsel_shop_v3",
  FINDER: "morsel_finder_v3",
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

document.addEventListener("DOMContentLoaded", () => {
  // If anything is missing, show a visible alert so you know JS is running
  try {
    App.init();
  } catch (e) {
    console.error(e);
    alert("JS error: " + (e?.message || e));
  }
});

const App = {
  units: localStorage.getItem(LS.UNITS) || "metric",
  recipes: [],
  myRecipes: [],
  favs: new Set(JSON.parse(localStorage.getItem(LS.FAVS) || "[]")),
  shop: JSON.parse(localStorage.getItem(LS.SHOP) || "[]"),
  finder: JSON.parse(localStorage.getItem(LS.FINDER) || "[]"),

  init() {
    this.bindNav();
    this.bindTopButtons();
    this.bindInputs();
    this.loadData();
    this.renderAll();
    this.showView("recipesView", true);
  },

  bindNav() {
    $$(".navbtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.dataset.view; // expects data-view="..."
        if (!view) return;

        if (view === "cocktailsView") {
          if (localStorage.getItem(LS.AGE_OK) === "yes") {
            this.showView("cocktailsView", true);
          } else {
            this.showAgeGate();
          }
          return;
        }

        this.showView(view, true);
      });
    });
  },

  bindTopButtons() {
    const unitsBtn = $("#unitsBtn");
    const seedBtn = $("#seedBtn");

    unitsBtn.textContent = this.units === "metric" ? "Metric" : "Imperial";

    unitsBtn.addEventListener("click", () => {
      this.units = this.units === "metric" ? "imperial" : "metric";
      localStorage.setItem(LS.UNITS, this.units);
      unitsBtn.textContent = this.units === "metric" ? "Metric" : "Imperial";
      this.renderAll();
    });

    seedBtn.addEventListener("click", () => {
      this.recipes = seedCatalogue(1200, 220);
      localStorage.setItem(LS.RECIPES, JSON.stringify(this.recipes));
      this.renderAll();
      toast("Seeded demo recipes ✅");
    });

    // Age gate buttons
    $("#ageYes").addEventListener("click", () => {
      localStorage.setItem(LS.AGE_OK, "yes");
      this.hideAgeGate();
      this.showView("cocktailsView", true);
    });

    $("#ageNo").addEventListener("click", () => {
      localStorage.setItem(LS.AGE_OK, "no");
      this.hideAgeGate();
      this.showView("recipesView", true);
      toast("Cocktails locked 🔒");
    });
  },

  bindInputs() {
    $("#searchInput").addEventListener("input", () => this.renderRecipes());
    $("#typeFilter").addEventListener("change", () => this.renderRecipes());
    $("#allergenFilter").addEventListener("change", () => this.renderRecipes());
    $("#moodFilter").addEventListener("change", () => this.renderRecipes());
    $("#clearFiltersBtn").addEventListener("click", () => {
      $("#searchInput").value = "";
      $("#typeFilter").value = "food";
      $("#allergenFilter").value = "";
      $("#moodFilter").value = "";
      this.renderRecipes();
    });

    $("#cocktailSearch").addEventListener("input", () => this.renderCocktails());
    $("#cocktailMood").addEventListener("change", () => this.renderCocktails());
    $("#cocktailClearBtn").addEventListener("click", () => {
      $("#cocktailSearch").value = "";
      $("#cocktailMood").value = "";
      this.renderCocktails();
    });

    // Finder
    $("#finderAddBtn").addEventListener("click", () => this.addFinder());
    $("#finderInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.addFinder();
    });
    $("#tolerance").addEventListener("input", () => this.renderFinder());
    $("#finderType").addEventListener("change", () => this.renderFinder());
    $("#finderAllergenFilter").addEventListener("change", () => this.renderFinder());
    $("#finderClearBtn").addEventListener("click", () => {
      this.finder = [];
      localStorage.setItem(LS.FINDER, JSON.stringify(this.finder));
      this.renderFinder();
    });

    // Shop
    $("#shopAddBtn").addEventListener("click", () => this.addShop());
    $("#shopInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.addShop();
    });
    $("#shopClearBtn").addEventListener("click", () => {
      this.shop = [];
      localStorage.setItem(LS.SHOP, JSON.stringify(this.shop));
      this.renderShop();
    });

    // Add recipe
    $("#addSaveBtn").addEventListener("click", () => this.saveMyRecipe());
    $("#addResetBtn").addEventListener("click", () => this.resetAddForm());
  },

  loadData() {
    // catalogue
    const stored = localStorage.getItem(LS.RECIPES);
    if (stored) {
      try { this.recipes = JSON.parse(stored) || []; } catch { this.recipes = []; }
    }

    // my recipes
    const mine = localStorage.getItem(LS.MY_RECIPES);
    if (mine) {
      try { this.myRecipes = JSON.parse(mine) || []; } catch { this.myRecipes = []; }
    }

    if (!Array.isArray(this.recipes) || this.recipes.length < 100) {
      this.recipes = seedCatalogue(1200, 220);
      localStorage.setItem(LS.RECIPES, JSON.stringify(this.recipes));
    }
  },

  getAllRecipes() {
    return [...this.myRecipes, ...this.recipes];
  },

  showView(id, updateNav = false) {
    $$(".view").forEach(v => v.classList.add("hidden"));
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");

    if (updateNav) {
      $$(".navbtn").forEach(b => b.classList.remove("active"));
      const btn = document.querySelector(`.navbtn[data-view="${CSS.escape(id)}"]`);
      if (btn) btn.classList.add("active");
    }

    // render current view
    if (id === "recipesView") this.renderRecipes();
    if (id === "cocktailsView") this.renderCocktails();
    if (id === "finderView") this.renderFinder();
    if (id === "bookView") this.renderBook();
    if (id === "shopView") this.renderShop();
  },

  showAgeGate() {
    const gate = $("#ageGate");
    gate.classList.remove("hidden");
    gate.setAttribute("aria-hidden", "false");
  },

  hideAgeGate() {
    const gate = $("#ageGate");
    gate.classList.add("hidden");
    gate.setAttribute("aria-hidden", "true");
  },

  renderAll() {
    this.renderRecipes();
    this.renderCocktails();
    this.renderFinder();
    this.renderBook();
    this.renderShop();
  },

  // ---------- Recipes ----------
  renderRecipes() {
    const q = norm($("#searchInput").value);
    const typeFilter = $("#typeFilter").value; // food | all
    const allergen = $("#allergenFilter").value;
    const mood = $("#moodFilter").value;

    const base = this.getAllRecipes();
    const filtered = base.filter(r => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (allergen && !(r.allergens || []).includes(allergen)) return false;
      if (mood && !(r.moods || []).includes(mood)) return false;

      if (!q) return true;
      const hay = [r.name, (r.moods||[]).join(" "), (r.allergens||[]).join(" "), r.ingredientsText, r.type].join(" ");
      return norm(hay).includes(q);
    });

    const list = $("#recipesList");
    list.innerHTML = filtered.map(r => cardHTML(r, this.favs.has(r.id))).join("");
    $("#recipesEmpty").classList.toggle("hidden", filtered.length !== 0);

    this.wireCards(list);
  },

  // ---------- Cocktails ----------
  renderCocktails() {
    const q = norm($("#cocktailSearch").value);
    const mood = $("#cocktailMood").value;

    const base = this.getAllRecipes().filter(r => r.type === "cocktail");
    const filtered = base.filter(r => {
      if (mood && !(r.moods || []).includes(mood)) return false;
      if (!q) return true;
      const hay = [r.name, (r.moods||[]).join(" "), r.ingredientsText, (r.allergens||[]).join(" ")].join(" ");
      return norm(hay).includes(q);
    });

    const list = $("#cocktailsList");
    list.innerHTML = filtered.map(r => cardHTML(r, this.favs.has(r.id))).join("");
    $("#cocktailsEmpty").classList.toggle("hidden", filtered.length !== 0);

    this.wireCards(list);
  },

  wireCards(container) {
    // fav
    container.querySelectorAll("[data-fav]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = btn.getAttribute("data-fav");
        if (this.favs.has(id)) this.favs.delete(id);
        else this.favs.add(id);
        localStorage.setItem(LS.FAVS, JSON.stringify(Array.from(this.favs)));
        this.renderBook();
        this.renderRecipes();
        this.renderCocktails();
      });
    });

    // add to shop
    container.querySelectorAll("[data-shop]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-shop");
        const r = this.getAllRecipes().find(x => x.id === id);
        if (!r) return;

        const lines = (r.ingredientsText || "").split("\n").map(s => s.trim()).filter(Boolean);
        lines.slice(0, 40).reverse().forEach(line => this.shop.unshift({ txt: line, done: false }));
        localStorage.setItem(LS.SHOP, JSON.stringify(this.shop));
        toast("Added to shopping ✅");
      });
    });

    // expand
    container.querySelectorAll("[data-toggle]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-toggle");
        const body = container.querySelector(`[data-body="${CSS.escape(id)}"]`);
        if (!body) return;
        body.classList.toggle("hidden");
      });
    });
  },

  // ---------- Finder ----------
  addFinder() {
    const raw = $("#finderInput").value.trim();
    if (!raw) return;
    const item = norm(raw);
    if (!this.finder.includes(item)) this.finder.push(item);
    $("#finderInput").value = "";
    localStorage.setItem(LS.FINDER, JSON.stringify(this.finder));
    this.renderFinder();
  },

  renderFinder() {
    $("#tolLabel").textContent = `${$("#tolerance").value}%`;

    const chips = $("#finderChips");
    chips.innerHTML = this.finder.map(i => `<button class="chipbtn" data-chip="${escapeHtml(i)}">${escapeHtml(i)} ✕</button>`).join("");

    chips.querySelectorAll("[data-chip]").forEach(b => {
      b.addEventListener("click", () => {
        const ing = b.getAttribute("data-chip");
        this.finder = this.finder.filter(x => x !== ing);
        localStorage.setItem(LS.FINDER, JSON.stringify(this.finder));
        this.renderFinder();
      });
    });

    const out = $("#finderResults");
    if (!this.finder.length) {
      out.innerHTML = "";
      $("#finderEmpty").classList.remove("hidden");
      return;
    }
    $("#finderEmpty").classList.add("hidden");

    const tol = parseInt($("#tolerance").value, 10);
    const type = $("#finderType").value; // food | all
    const allergen = $("#finderAllergenFilter").value;

    const base = this.getAllRecipes().filter(r => {
      if (type !== "all" && r.type !== type) return false;
      if (allergen && !(r.allergens||[]).includes(allergen)) return false;
      return true;
    });

    const scored = base.map(r => {
      const req = extractIngredientWords(r.ingredientsText || "");
      const have = this.finder;
      const matched = req.filter(w => have.includes(w));
      const missing = req.filter(w => !have.includes(w));
      const missingPct = req.length ? (missing.length / req.length) * 100 : 100;
      return { r, matched: matched.length, missing: missing.length, missingPct };
    })
    .filter(x => x.missingPct <= tol)
    .sort((a,b) => (b.matched - a.matched) || (a.missing - b.missing))
    .slice(0, 60);

    out.innerHTML = scored.map(x => cardHTML(x.r, this.favs.has(x.r.id), `${x.matched}/${x.matched + x.missing} match`)).join("");
    this.wireCards(out);
  },

  // ---------- My Book ----------
  renderBook() {
    const all = this.getAllRecipes();

    const favsList = $("#favsList");
    const favsArr = all.filter(r => this.favs.has(r.id));
    favsList.innerHTML = favsArr.map(r => cardHTML(r, true)).join("");
    $("#favsEmpty").classList.toggle("hidden", favsArr.length !== 0);
    this.wireCards(favsList);

    const mine = $("#myRecipesList");
    mine.innerHTML = this.myRecipes.map(r => cardHTML(r, this.favs.has(r.id))).join("");
    $("#myRecipesEmpty").classList.toggle("hidden", this.myRecipes.length !== 0);
    this.wireCards(mine);
  },

  // ---------- Shop ----------
  addShop() {
    const txt = $("#shopInput").value.trim();
    if (!txt) return;
    this.shop.unshift({ txt, done: false });
    $("#shopInput").value = "";
    localStorage.setItem(LS.SHOP, JSON.stringify(this.shop));
    this.renderShop();
  },

  renderShop() {
    const ul = $("#shopList");
    ul.innerHTML = this.shop.map((it, idx) => `
      <li class="shopitem ${it.done ? "done" : ""}" data-idx="${idx}">
        <span>${escapeHtml(it.txt)}</span>
        <span class="x" data-x="${idx}">✕</span>
      </li>
    `).join("");

    $("#shopEmpty").classList.toggle("hidden", this.shop.length !== 0);

    ul.querySelectorAll(".shopitem").forEach(li => {
      li.addEventListener("click", (e) => {
        const del = e.target.getAttribute("data-x");
        if (del !== null) return;
        const idx = parseInt(li.dataset.idx, 10);
        this.shop[idx].done = !this.shop[idx].done;
        localStorage.setItem(LS.SHOP, JSON.stringify(this.shop));
        this.renderShop();
      });
    });

    ul.querySelectorAll("[data-x]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute("data-x"), 10);
        this.shop.splice(idx, 1);
        localStorage.setItem(LS.SHOP, JSON.stringify(this.shop));
        this.renderShop();
      });
    });
  },

  // ---------- Add recipe ----------
  resetAddForm() {
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
  },

  saveMyRecipe() {
    const name = $("#addName").value.trim();
    const type = $("#addType").value;
    const moods = parseCommaTags($("#addMoods").value, 3);
    const level = clampInt($("#addLevel").value, 1, 5, 2);
    const allergens = parseCommaTags($("#addAllergens").value, 10);
    const serves = ($("#addServes").value.trim() || (type === "cocktail" ? "1" : "2"));
    const history = $("#addHistory").value.trim();
    const ingredientsText = $("#addIngredients").value.trim();
    const method = $("#addMethod").value.trim();
    const variations = $("#addVariations").value.trim();

    if (!name || !ingredientsText || !method) {
      toast("Name, Ingredients, and Method are required.");
      return;
    }

    const all = [...allergens];
    if (type === "cocktail" && !all.includes("Alcohol")) all.push("Alcohol");

    const r = {
      id: `my_${Date.now()}`,
      type,
      name,
      moods,
      level,
      allergens: all,
      serves,
      time: type === "cocktail" ? "5m" : guessTime(level),
      history,
      ingredientsText,
      method,
      variations,
      source: "user",
    };

    this.myRecipes.unshift(r);
    localStorage.setItem(LS.MY_RECIPES, JSON.stringify(this.myRecipes));
    this.resetAddForm();
    toast("Saved ✅");
    this.showView("bookView", true);
    this.renderBook();
  }
};

// ---------- UI HTML ----------
function cardHTML(r, isFav, extraMeta = "") {
  const moods = (r.moods || []).slice(0,3).map(m => `<span class="badge">${escapeHtml(m)}</span>`).join("");
  const alls = (r.allergens || []).slice(0,3).map(a => `<span class="badge bad">${escapeHtml(a)}</span>`).join("");
  const typeBadge = r.type === "cocktail"
    ? `<span class="badge bad">Cocktail</span>`
    : `<span class="badge ok">Food</span>`;

  const meta2 = extraMeta ? ` • ${escapeHtml(extraMeta)}` : "";
  const bodyId = r.id;

  const ingredients = (App.units === "imperial")
    ? toImperialLines(r.ingredientsText || "")
    : (r.ingredientsText || "");

  return `
    <article class="card">
      <div class="card-top">
        <div>
          <div class="card-title">${escapeHtml(r.name || "Untitled")}</div>
          <div class="card-meta">⏱ ${escapeHtml(r.time || "20m")} • 👥 ${escapeHtml(String(r.serves ?? "2"))}${meta2}</div>
          <div class="badges">
            ${typeBadge}
            <span class="badge hot">Level ${escapeHtml(String(r.level ?? 2))}/5</span>
            ${moods}
            ${alls}
          </div>
        </div>

        <button class="heart ${isFav ? "active" : ""}" data-fav="${escapeHtml(r.id)}" title="Favourite">
          ${isFav ? "♥" : "♡"}
        </button>
      </div>

      <div class="row" style="margin-top:12px">
        <button class="btn subtle" data-toggle="${escapeHtml(bodyId)}">Open</button>
        <button class="btn" data-shop="${escapeHtml(r.id)}">Add to shopping</button>
      </div>

      <div class="card-body hidden" data-body="${escapeHtml(bodyId)}">
        <div class="pre"><b>History</b>\n${escapeHtml(r.history || "No story yet.")}</div>
        <div class="pre" style="margin-top:10px"><b>Ingredients</b>\n${escapeHtml(ingredients)}</div>
        <div class="pre" style="margin-top:10px"><b>Method</b>\n${escapeHtml(r.method || "")}</div>
        <div class="pre" style="margin-top:10px"><b>Variations</b>\n${escapeHtml(r.variations || "Try swapping ingredients or changing spice.")}</div>
      </div>
    </article>
  `;
}

// ---------- Helpers ----------
function norm(s){ return (s||"").toString().toLowerCase().trim(); }

function escapeHtml(str){
  return (str||"").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function clampInt(v,min,max,fallback){
  const n = parseInt(v,10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function parseCommaTags(s, max){
  return (s||"").split(",").map(x => x.trim()).filter(Boolean).slice(0,max);
}

function guessTime(level){
  if (level <= 1) return "10m";
  if (level === 2) return "20m";
  if (level === 3) return "35m";
  if (level === 4) return "55m";
  return "90m";
}

// Finder keyword extraction
function extractIngredientWords(text){
  const lines = (text||"").split("\n").map(x=>x.trim()).filter(Boolean);
  const stop = new Set(["fresh","taste","small","large","medium","cup","cups","tbsp","tsp","teaspoon","tablespoon","grams","gram","kg","ml","litre","liter","pinch","dash","chopped","sliced","diced","minced","optional","oil","salt","pepper"]);
  const words = [];
  for (const line of lines){
    line.toLowerCase()
      .replace(/[0-9]/g," ")
      .replace(/[()]/g," ")
      .replace(/[^a-z\s]/g," ")
      .split(/\s+/)
      .filter(w => w.length >= 3 && !stop.has(w))
      .forEach(w => words.push(w));
  }
  return Array.from(new Set(words));
}

// Units conversion (lightweight)
function toImperialLines(text){
  const lines = (text||"").split("\n");
  return lines.map(convertLine).join("\n");
}

function convertLine(line){
  const s = line.trim();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|l)\b/i);
  if (!m) return line;
  const qty = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  const rest = s.slice(m[0].length).trim();

  let converted = "";
  if (unit === "g") converted = `${roundNice(qty * 0.035274)} oz`;
  if (unit === "kg") converted = `${roundNice(qty * 2.20462)} lb`;
  if (unit === "ml") converted = `${roundNice(qty * 0.033814)} fl oz`;
  if (unit === "l") converted = `${roundNice(qty * 33.814)} fl oz`;
  if (!converted) return line;

  return `${converted} ${rest}`.trim();
}

function roundNice(n){
  if (n < 1) return n.toFixed(2);
  if (n < 10) return n.toFixed(1);
  return Math.round(n).toString();
}

// Toast
let toastTimer = null;
function toast(msg){
  clearTimeout(toastTimer);
  let el = document.getElementById("toast");
  if (!el){
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

// ---------- Seed generator (1000s) ----------
function seedCatalogue(foodCount=1000, cocktailCount=200){
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

  for (let i=0; i<foodCount; i++){
    const p = proteins[i % proteins.length];
    const dish = mains[(i*7) % mains.length];
    const vibe = cuisines[(i*3) % cuisines.length];
    const side = sides[(i*5) % sides.length];
    const sauce = sauces[(i*11) % sauces.length];

    const level = (i % 5) + 1;
    const moodTags = pick3(moods, i);
    const allergens = pickAllergens(allergensPool, i, 0.18);

    const ingredients = [
      `300 g ${p.toLowerCase()}`,
      ...baseIngredients,
      `1 cup ${side.toLowerCase()}`,
      `2 tbsp ${sauce.toLowerCase()}`,
      `1 tbsp vinegar or lemon`,
    ].join("\n");

    const method = [
      `1) Heat oil in a pan. Cook onion + garlic until soft.`,
      `2) Add ${p.toLowerCase()}. Season with salt, pepper, paprika.`,
      `3) Add stock, simmer until tender.`,
      `4) Stir in ${sauce.toLowerCase()} and taste-adjust.`,
      `5) Serve with ${side.toLowerCase()}.`,
    ].join("\n");

    out.push({
      id:`seed_food_${i}`,
      type:"food",
      name:`${vibe} ${p} ${dish}`,
      moods: moodTags,
      level,
      allergens,
      serves: String((i%4)+2),
      time: guessTime(level),
      history:`Born from a ${vibe.toLowerCase()} kitchen idea: use what’s around, keep it honest, feed people well.`,
      ingredientsText: ingredients,
      method,
      variations:`• Hotter: add chilli\n• Cheaper: swap for beans\n• Faster: pre-cook protein`,
      source:"seed"
    });
  }

  const spirits = ["Vodka","Gin","Rum","Tequila","Whiskey","Bourbon"];
  const styles = ["Sour","Highball","Fizz","Spritz","Mule","Old Fashioned","Punch"];
  const cocktailMoods = ["Fresh","Date night","Party","Classic","Tropical"];

  for (let i=0; i<cocktailCount; i++){
    const spirit = spirits[i % spirits.length];
    const style = styles[(i*5) % styles.length];

    out.push({
      id:`seed_cocktail_${i}`,
      type:"cocktail",
      name:`${spirit} ${style}`,
      moods:[cocktailMoods[i%cocktailMoods.length], cocktailMoods[(i+2)%cocktailMoods.length]].slice(0,3),
      level: (i%3)+1,
      allergens:["Alcohol"],
      serves:"1",
      time:"5m",
      history:`A simple ${style.toLowerCase()} built around ${spirit.toLowerCase()}.`,
      ingredientsText:`60 ml ${spirit.toLowerCase()}\n30 ml citrus juice\n15 ml syrup\nIce\nTop with soda (optional)`,
      method:`1) Add to shaker with ice\n2) Shake 10–12s\n3) Strain over fresh ice\n4) Garnish`,
      variations:`• Less sweet: halve syrup\n• Stronger: +15 ml spirit\n• Softer: top with soda`,
      source:"seed"
    });
  }

  return out;
}

function pick3(arr, i){
  const a = arr[i % arr.length];
  const b = arr[(i*3 + 2) % arr.length];
  const c = arr[(i*7 + 5) % arr.length];
  return Array.from(new Set([a,b,c])).slice(0,3);
}

function pickAllergens(pool, i, chance=0.15){
  const flag = ((i * 37) % 100) / 100;
  if (flag > chance) return [];
  const a = pool[i % pool.length];
  const flag2 = ((i * 91) % 100) / 100;
  if (flag2 < chance/3){
    const b = pool[(i*5 + 1) % pool.length];
    return Array.from(new Set([a,b]));
  }
  return [a];
                                }
