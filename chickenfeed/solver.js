window.DEFAULT_FEED_STATE = {
  activeStage: "layer",
  batchLbs: 50,
  currentMix: {
    wheat: 0.405, barley: 0.100, peas: 0.190, lentils: 0.100,
    canola: 0.050, fishmeal: 0.040, oil: 0.015, limestone: 0.082,
    dical: 0.010, salt: 0.0030, premix: 0.0035, dlmet: 0.0015
  },
  recipes: [
    {
      name: "North Idaho Layer (Corn & Soy Free)",
      stageId: "layer",
      batchLbs: 50,
      mix: {
        wheat: 0.405, barley: 0.100, peas: 0.190, lentils: 0.100,
        canola: 0.050, fishmeal: 0.040, oil: 0.015, limestone: 0.082,
        dical: 0.010, salt: 0.0030, premix: 0.0035, dlmet: 0.0015
      }
    }
  ],
  ingredients: [
    { id: "wheat", name: "Wheat (Soft White / Red)", category: "grain", source: "Homegrown", enabled: true, cost: 0.15, maxPct: 0.55, me: 1415, cp: 0.120, fat: 0.018, fiber: 0.026, ca: 0.0005, avp: 0.0013, na: 0.0003, lys: 0.0036, met: 0.0019, metCys: 0.0046, thr: 0.0035, notes: "Palouse staple grain" },
    { id: "barley", name: "Barley (Ground)", category: "grain", source: "Homegrown", enabled: true, cost: 0.14, maxPct: 0.25, me: 1200, cp: 0.115, fat: 0.020, fiber: 0.055, ca: 0.0006, avp: 0.0015, na: 0.0003, lys: 0.0040, met: 0.0018, metCys: 0.0043, thr: 0.0037, notes: "Cap ~25% (sticky droppings)" },
    { id: "oats", name: "Oats (Ground)", category: "grain", source: "Homegrown", enabled: true, cost: 0.16, maxPct: 0.20, me: 1155, cp: 0.115, fat: 0.045, fiber: 0.105, ca: 0.0008, avp: 0.0014, na: 0.0003, lys: 0.0042, met: 0.0018, metCys: 0.0042, thr: 0.0036, notes: "Higher fiber; cap ~15-20%" },
    { id: "triticale", name: "Triticale (Ground)", category: "grain", source: "Homegrown", enabled: true, cost: 0.15, maxPct: 0.35, me: 1405, cp: 0.125, fat: 0.018, fiber: 0.028, ca: 0.0005, avp: 0.0013, na: 0.0003, lys: 0.0040, met: 0.0020, metCys: 0.0046, thr: 0.0038, notes: "Winter-hardy N. Idaho grain" },
    { id: "peas", name: "Field Peas (Dry)", category: "grain", source: "Homegrown", enabled: true, cost: 0.22, maxPct: 0.30, me: 1160, cp: 0.225, fat: 0.013, fiber: 0.055, ca: 0.0011, avp: 0.0014, na: 0.0002, lys: 0.0160, met: 0.0022, metCys: 0.0053, thr: 0.0082, notes: "Great soy-free protein; low Met" },
    { id: "lentils", name: "Lentils (Feed Grade)", category: "grain", source: "Homegrown", enabled: true, cost: 0.22, maxPct: 0.20, me: 1240, cp: 0.245, fat: 0.012, fiber: 0.045, ca: 0.0008, avp: 0.0014, na: 0.0003, lys: 0.0165, met: 0.0020, metCys: 0.0048, thr: 0.0085, notes: "Palouse pulse crop" },
    { id: "chickpeas", name: "Chickpeas / Garbanzos", category: "grain", source: "Homegrown", enabled: true, cost: 0.25, maxPct: 0.20, me: 1300, cp: 0.205, fat: 0.048, fiber: 0.050, ca: 0.0012, avp: 0.0014, na: 0.0003, lys: 0.0135, met: 0.0025, metCys: 0.0055, thr: 0.0072, notes: "Crack or roast if possible" },
    { id: "corn", name: "Corn (Ground Yellow)", category: "grain", source: "Purchased", enabled: false, cost: 0.20, maxPct: 0.70, me: 1520, cp: 0.085, fat: 0.038, fiber: 0.022, ca: 0.0002, avp: 0.0008, na: 0.0002, lys: 0.0026, met: 0.0018, metCys: 0.0036, thr: 0.0029, notes: "Usually purchased in N. Idaho" },

    { id: "canola", name: "Canola Seed (Full-Fat)", category: "protein", source: "Homegrown", enabled: true, cost: 0.30, maxPct: 0.12, me: 2020, cp: 0.200, fat: 0.400, fiber: 0.070, ca: 0.0040, avp: 0.0022, na: 0.0003, lys: 0.0120, met: 0.0040, metCys: 0.0090, thr: 0.0085, notes: "High energy/fat oilseed" },
    { id: "flax", name: "Flaxseed (Ground)", category: "protein", source: "Homegrown", enabled: true, cost: 0.35, maxPct: 0.08, me: 1750, cp: 0.210, fat: 0.370, fiber: 0.085, ca: 0.0025, avp: 0.0020, na: 0.0003, lys: 0.0080, met: 0.0036, metCys: 0.0075, thr: 0.0075, notes: "Omega-3 yolks; cap at 8%" },
    { id: "sunflower", name: "Sunflower Seeds (Black Oil)", category: "protein", source: "Homegrown", enabled: true, cost: 0.35, maxPct: 0.15, me: 1850, cp: 0.175, fat: 0.400, fiber: 0.180, ca: 0.0020, avp: 0.0020, na: 0.0002, lys: 0.0068, met: 0.0038, metCys: 0.0070, thr: 0.0065, notes: "Winter energy & fat" },
    { id: "alfalfa", name: "Alfalfa Meal / Leaf (17%)", category: "protein", source: "Homegrown", enabled: true, cost: 0.18, maxPct: 0.05, me: 545, cp: 0.170, fat: 0.025, fiber: 0.240, ca: 0.0140, avp: 0.0018, na: 0.0008, lys: 0.0073, met: 0.0025, metCys: 0.0046, thr: 0.0070, notes: "Deep orange yolks; cap 5%" },
    { id: "bsfl", name: "Black Soldier Fly Larvae", category: "protein", source: "Homegrown", enabled: false, cost: 0.50, maxPct: 0.15, me: 1580, cp: 0.420, fat: 0.280, fiber: 0.070, ca: 0.0320, avp: 0.0065, na: 0.0015, lys: 0.0250, met: 0.0070, metCys: 0.0110, thr: 0.0160, notes: "Dried insects; high Ca & fat" },
    { id: "soymeal", name: "Soybean Meal (48%)", category: "protein", source: "Purchased", enabled: false, cost: 0.35, maxPct: 0.35, me: 1110, cp: 0.480, fat: 0.012, fiber: 0.035, ca: 0.0028, avp: 0.0022, na: 0.0002, lys: 0.0296, met: 0.0067, metCys: 0.0138, thr: 0.0185, notes: "Purchased high-protein meal" },
    { id: "canolameal", name: "Canola Meal (37%)", category: "protein", source: "Purchased", enabled: true, cost: 0.25, maxPct: 0.18, me: 910, cp: 0.370, fat: 0.035, fiber: 0.115, ca: 0.0065, avp: 0.0030, na: 0.0005, lys: 0.0205, met: 0.0072, metCys: 0.0158, thr: 0.0155, notes: "Regional PNW meal; good Met" },
    { id: "fishmeal", name: "Fish Meal (60%)", category: "protein", source: "Purchased", enabled: true, cost: 0.95, maxPct: 0.06, me: 1280, cp: 0.605, fat: 0.094, fiber: 0.007, ca: 0.0510, avp: 0.0288, na: 0.0040, lys: 0.0470, met: 0.0175, metCys: 0.0230, thr: 0.0250, notes: "Cap 5-6% or eggs taste fishy" },
    { id: "oil", name: "Vegetable / Canola Oil", category: "protein", source: "Either", enabled: true, cost: 0.75, maxPct: 0.05, me: 3990, cp: 0.000, fat: 0.995, fiber: 0.000, ca: 0.0000, avp: 0.0000, na: 0.0000, lys: 0.0000, met: 0.0000, metCys: 0.0000, thr: 0.0000, notes: "Boosts energy + settles dust" },

    { id: "limestone", name: "Ground Limestone", category: "mineral", source: "Purchased", enabled: true, cost: 0.10, maxPct: 0.10, me: 0, cp: 0, fat: 0, fiber: 0, ca: 0.3800, avp: 0.0000, na: 0.0005, lys: 0, met: 0, metCys: 0, thr: 0, notes: "Pure Calcium for shells" },
    { id: "oyster", name: "Oyster Shell (Crushed)", category: "mineral", source: "Purchased", enabled: true, cost: 0.20, maxPct: 0.10, me: 0, cp: 0, fat: 0, fiber: 0, ca: 0.3800, avp: 0.0000, na: 0.0020, lys: 0, met: 0, metCys: 0, thr: 0, notes: "Slow-release shell Calcium" },
    { id: "dical", name: "Dicalcium Phosphate", category: "mineral", source: "Purchased", enabled: true, cost: 0.45, maxPct: 0.03, me: 0, cp: 0, fat: 0, fiber: 0, ca: 0.2100, avp: 0.1850, na: 0.0005, lys: 0, met: 0, metCys: 0, thr: 0, notes: "Available Phosphorus + Ca" },
    { id: "salt", name: "Salt (NaCl)", category: "mineral", source: "Purchased", enabled: true, cost: 0.15, maxPct: 0.005, me: 0, cp: 0, fat: 0, fiber: 0, ca: 0.0000, avp: 0.0000, na: 0.3930, lys: 0, met: 0, metCys: 0, thr: 0, notes: "Essential Sodium" },
    { id: "premix", name: "Poultry Vit/Min Premix", category: "mineral", source: "Purchased", enabled: true, cost: 1.80, maxPct: 0.005, me: 0, cp: 0, fat: 0, fiber: 0, ca: 0, avp: 0, na: 0, lys: 0, met: 0, metCys: 0, thr: 0, notes: "Must contain Selenium for N. ID!" },
    { id: "dlmet", name: "DL-Methionine (99%)", category: "mineral", source: "Purchased", enabled: true, cost: 2.50, maxPct: 0.005, me: 2445, cp: 0.585, fat: 0, fiber: 0, ca: 0, avp: 0, na: 0, lys: 0, met: 0.9900, metCys: 0.9900, thr: 0, notes: "Balances pea/lentil diets" },
    { id: "llys", name: "L-Lysine HCl (78.8%)", category: "mineral", source: "Purchased", enabled: true, cost: 1.50, maxPct: 0.005, me: 1800, cp: 0.950, fat: 0, fiber: 0, ca: 0, avp: 0, na: 0, lys: 0.7880, met: 0, metCys: 0, thr: 0, notes: "Amino acid booster" }
  ],
  stages: [
    {
      id: "chick", name: "Chick Starter (0-6w)", icon: "🐣",
      warning: "Keep Calcium near 1%. Never feed Layer calcium levels to chicks!",
      min: { me: 1290, cp: 0.180, fat: 0.030, fiber: 0, ca: 0.0090, avp: 0.0042, na: 0.0015, lys: 0.0085, met: 0.0032, metCys: 0.0065, thr: 0.0058, caAvp: 1.9, meCp: 65.0, metLys: 0.36, mcLys: 0.72 },
      max: { me: 1340, cp: 0.200, fat: 0.050, fiber: 0.045, ca: 0.0105, avp: 0.0048, na: 0.0020, lys: 0.0105, met: 0.0042, metCys: 0.0078, thr: 0.0072, caAvp: 2.3, meCp: 74.0, metLys: 0.48, mcLys: 0.85 }
    },
    {
      id: "grower", name: "Grower (6-18w)", icon: "🐥",
      warning: "Lower protein & calcium for steady bone growth before laying begins.",
      min: { me: 1270, cp: 0.150, fat: 0.025, fiber: 0, ca: 0.0080, avp: 0.0035, na: 0.0015, lys: 0.0060, met: 0.0025, metCys: 0.0052, thr: 0.0045, caAvp: 1.9, meCp: 74.0, metLys: 0.36, mcLys: 0.72 },
      max: { me: 1315, cp: 0.170, fat: 0.045, fiber: 0.060, ca: 0.0100, avp: 0.0042, na: 0.0020, lys: 0.0078, met: 0.0034, metCys: 0.0065, thr: 0.0058, caAvp: 2.5, meCp: 85.0, metLys: 0.48, mcLys: 0.88 }
    },
    {
      id: "layer", name: "Layer (Laying Hens)", icon: "🥚",
      warning: "High Calcium (3.6-4.2%) for eggshells! Keep chicks, growers, and roosters out of this feeder.",
      min: { me: 1250, cp: 0.160, fat: 0.030, fiber: 0, ca: 0.0360, avp: 0.0035, na: 0.0015, lys: 0.0076, met: 0.0035, metCys: 0.0065, thr: 0.0052, caAvp: 8.5, meCp: 72.0, metLys: 0.40, mcLys: 0.72 },
      max: { me: 1295, cp: 0.175, fat: 0.055, fiber: 0.060, ca: 0.0420, avp: 0.0044, na: 0.0020, lys: 0.0095, met: 0.0045, metCys: 0.0078, thr: 0.0068, caAvp: 11.5, meCp: 82.0, metLys: 0.55, mcLys: 0.92 }
    },
    {
      id: "broiler_starter", name: "Broiler Starter (0-3w)", icon: "🍗",
      warning: "Very high energy & protein. Oil + Fish Meal/Canola Meal help reach 22% CP without soy.",
      min: { me: 1360, cp: 0.220, fat: 0.040, fiber: 0, ca: 0.0090, avp: 0.0045, na: 0.0016, lys: 0.0120, met: 0.0048, metCys: 0.0088, thr: 0.0078, caAvp: 1.8, meCp: 58.0, metLys: 0.38, mcLys: 0.72 },
      max: { me: 1385, cp: 0.235, fat: 0.065, fiber: 0.040, ca: 0.0105, avp: 0.0052, na: 0.0022, lys: 0.0138, met: 0.0056, metCys: 0.0102, thr: 0.0092, caAvp: 2.2, meCp: 64.0, metLys: 0.48, mcLys: 0.82 }
    },
    {
      id: "broiler_finisher", name: "Broiler Grower/Fin (3w+)", icon: "🥩",
      warning: "High-calorie finishing ration for meat birds.",
      min: { me: 1405, cp: 0.180, fat: 0.045, fiber: 0, ca: 0.0080, avp: 0.0038, na: 0.0016, lys: 0.0095, met: 0.0038, metCys: 0.0072, thr: 0.0062, caAvp: 1.8, meCp: 69.0, metLys: 0.38, mcLys: 0.72 },
      max: { me: 1450, cp: 0.205, fat: 0.075, fiber: 0.045, ca: 0.0095, avp: 0.0045, na: 0.0022, lys: 0.0115, met: 0.0047, metCys: 0.0088, thr: 0.0078, caAvp: 2.2, meCp: 79.0, metLys: 0.48, mcLys: 0.84 }
    },
    {
      id: "all_flock", name: "All-Flock Base", icon: "🌾",
      warning: "Safe ~1% Calcium base for mixed coops—put crushed oyster shell in a separate side dish for laying hens!",
      min: { me: 1280, cp: 0.180, fat: 0.030, fiber: 0, ca: 0.0090, avp: 0.0040, na: 0.0015, lys: 0.0085, met: 0.0032, metCys: 0.0065, thr: 0.0058, caAvp: 1.9, meCp: 65.0, metLys: 0.36, mcLys: 0.72 },
      max: { me: 1325, cp: 0.200, fat: 0.050, fiber: 0.055, ca: 0.0110, avp: 0.0048, na: 0.0020, lys: 0.0105, met: 0.0042, metCys: 0.0078, thr: 0.0072, caAvp: 2.4, meCp: 74.0, metLys: 0.48, mcLys: 0.85 }
    }
  ]
};

window.solveRationJS = function (ingredients, target, preferHomegrown) {
  const active = ingredients.filter(i => i.enabled && i.maxPct > 1e-6);
  const n = active.length;
  if (n === 0) return { success: false, message: "No ingredients are checked as available." };

  const c = active.map(ing => {
    let cost = ing.cost;
    if (preferHomegrown) {
      if (ing.source === "Purchased") cost += 0.18;
      else if (ing.source === "Either") cost += 0.06;
    }
    return cost;
  });

  const cons = [];
  cons.push({ coeffs: new Array(n).fill(1), sense: "=", rhs: 1.0 });

  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    row[i] = 1.0;
    cons.push({ coeffs: row, sense: "<=", rhs: active[i].maxPct });
    if (active[i].id === "premix" && active[i].maxPct >= 0.0035) {
      cons.push({ coeffs: row.slice(), sense: ">=", rhs: 0.0035 });
    }
  }

  const directKeys = ["me", "cp", "fat", "fiber", "ca", "avp", "na", "lys", "met", "metCys", "thr"];
  for (const k of directKeys) {
    if (target.max[k] !== undefined) {
      cons.push({ coeffs: active.map(ing => ing[k] || 0), sense: "<=", rhs: target.max[k] });
    }
    if (target.min[k] !== undefined && target.min[k] > 0) {
      cons.push({ coeffs: active.map(ing => ing[k] || 0), sense: ">=", rhs: target.min[k] });
    }
  }

  function addRatio(numKey, denKey, ratioKey, scale) {
    const rMin = target.min[ratioKey] * scale;
    const rMax = target.max[ratioKey] * scale;
    cons.push({ coeffs: active.map(ing => (ing[numKey] || 0) - rMax * (ing[denKey] || 0)), sense: "<=", rhs: 0 });
    cons.push({ coeffs: active.map(ing => (ing[numKey] || 0) - rMin * (ing[denKey] || 0)), sense: ">=", rhs: 0 });
  }
  addRatio("ca", "avp", "caAvp", 1.0);
  addRatio("me", "cp", "meCp", 100.0);
  addRatio("met", "lys", "metLys", 1.0);
  addRatio("metCys", "lys", "mcLys", 1.0);

  try {
    const result = twoPhaseSimplex(c, cons, n);
    const x = result.x;
    const mix = {};
    for (let i = 0; i < n; i++) {
      if (x[i] > 1e-5) mix[active[i].id] = Math.round(x[i] * 10000) / 10000;
    }
    if (result.infeasible) {
      // Phase 1 failed: x minimizes total constraint violation. Report which targets are missed.
      const nameMap = { me: 'Energy', cp: 'Protein', fat: 'Fat', fiber: 'Fiber', ca: 'Calcium', avp: 'Avail. P', na: 'Sodium', lys: 'Lysine', met: 'Methionine', metCys: 'Met+Cys', thr: 'Threonine' };
      const fmtVal = (k, v) => k === 'me' ? Math.round(v) + ' kcal/lb' : (v * 100).toFixed(2) + '%';
      const violations = [];
      for (const k of directKeys) {
        const val = active.reduce((s, ing, i) => s + x[i] * (ing[k] || 0), 0);
        if (target.max[k] !== undefined && val > target.max[k] + 1e-9) violations.push(`${nameMap[k]}: ${fmtVal(k, val)} (max ${fmtVal(k, target.max[k])})`);
        if (target.min[k] > 0 && val < target.min[k] - 1e-9) violations.push(`${nameMap[k]}: ${fmtVal(k, val)} (min ${fmtVal(k, target.min[k])})`);
      }
      const checkRatio = (numKey, denKey, ratioKey, scale, label) => {
        const num = active.reduce((s, ing, i) => s + x[i] * (ing[numKey] || 0), 0);
        const den = active.reduce((s, ing, i) => s + x[i] * (ing[denKey] || 0), 0);
        if (den <= 1e-9) return;
        const val = num / den;
        const rMin = (target.min[ratioKey] ?? 0) * scale;
        const rMax = (target.max[ratioKey] ?? Infinity) * scale;
        if (val < rMin - 1e-9) violations.push(`${label}: ${val.toFixed(2)} (min ${rMin.toFixed(2)})`);
        else if (val > rMax + 1e-9) violations.push(`${label}: ${val.toFixed(2)} (max ${rMax.toFixed(2)})`);
      };
      checkRatio('ca', 'avp', 'caAvp', 1.0, 'Ca:Avail.P');
      checkRatio('me', 'cp', 'meCp', 100.0, 'Energy:Protein');
      checkRatio('met', 'lys', 'metLys', 1.0, 'Met:Lys');
      checkRatio('metCys', 'lys', 'mcLys', 1.0, '(Met+Cys):Lys');
      return { success: false, message: 'No perfect ration fits all targets. Closest mix applied — still short:', bestEffort: mix, violations };
    }
    return { success: true, message: "Balanced mix found!", mix };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

function twoPhaseSimplex(c, cons, numX) {
  const m = cons.length;
  const normCons = [];
  let numSlacks = 0, numArts = 0;

  for (const con of cons) {
    const coeffs = con.coeffs.slice();
    let sense = con.sense;
    let rhs = con.rhs;
    if (rhs < 0) {
      rhs = -rhs;
      for (let j = 0; j < coeffs.length; j++) coeffs[j] = -coeffs[j];
      if (sense === "<=") sense = ">=";
      else if (sense === ">=") sense = "<=";
    }
    normCons.push({ coeffs, sense, rhs });
    if (sense === "<=") numSlacks++;
    else if (sense === ">=") { numSlacks++; numArts++; }
    else if (sense === "=") numArts++;
  }

  const nonArtCols = numX + numSlacks;
  const totalCols = nonArtCols + numArts;
  const rhsCol = totalCols;

  const T = Array.from({ length: m + 1 }, () => new Float64Array(totalCols + 1));
  const basis = new Int32Array(m);
  const isArtRow = new Array(m).fill(false);

  let sIdx = numX, aIdx = nonArtCols;
  for (let i = 0; i < m; i++) {
    const con = normCons[i];
    for (let j = 0; j < numX; j++) T[i][j] = con.coeffs[j];
    T[i][rhsCol] = con.rhs;
    if (con.sense === "<=") {
      T[i][sIdx] = 1.0;
      basis[i] = sIdx++;
    } else if (con.sense === ">=") {
      T[i][sIdx++] = -1.0;
      T[i][aIdx] = 1.0;
      basis[i] = aIdx++;
      isArtRow[i] = true;
    } else {
      T[i][aIdx] = 1.0;
      basis[i] = aIdx++;
      isArtRow[i] = true;
    }
  }

  for (let j = nonArtCols; j < totalCols; j++) T[m][j] = 1.0;
  for (let i = 0; i < m; i++) {
    if (isArtRow[i]) {
      for (let j = 0; j <= rhsCol; j++) T[m][j] -= T[i][j];
    }
  }

  let activeRows = Array.from({ length: m }, (_, i) => i);

  function pivot(pRow, pCol, maxCol) {
    const pVal = T[pRow][pCol];
    for (let j = 0; j < maxCol; j++) T[pRow][j] /= pVal;
    T[pRow][rhsCol] /= pVal;
    for (const r of [...activeRows, m]) {
      if (r === pRow) continue;
      const factor = T[r][pCol];
      if (Math.abs(factor) < 1e-12) continue;
      for (let j = 0; j < maxCol; j++) T[r][j] -= factor * T[pRow][j];
      T[r][rhsCol] -= factor * T[pRow][rhsCol];
    }
    basis[pRow] = pCol;
  }

  function runSimplex(maxCol) {
    const eps = 1e-9;
    for (let iter = 0; iter < 5000; iter++) {
      let enterCol = -1;
      if (iter < 150) {
        let minVal = -eps;
        for (let j = 0; j < maxCol; j++) {
          if (T[m][j] < minVal) { minVal = T[m][j]; enterCol = j; }
        }
      } else {
        for (let j = 0; j < maxCol; j++) {
          if (T[m][j] < -eps) { enterCol = j; break; }
        }
      }
      if (enterCol === -1) return;

      let leaveRow = -1;
      let minRatio = Infinity;
      for (const r of activeRows) {
        const a = T[r][enterCol];
        if (a > eps) {
          let ratio = T[r][rhsCol] / a;
          if (ratio < 0) ratio = 0;
          if (ratio < minRatio - 1e-11 || (Math.abs(ratio - minRatio) <= 1e-11 && leaveRow !== -1 && basis[r] < basis[leaveRow])) {
            minRatio = ratio;
            leaveRow = r;
          }
        }
      }
      if (leaveRow === -1) throw new Error("Unbounded linear program.");
      pivot(leaveRow, enterCol, maxCol);
    }
    throw new Error("Simplex iteration limit reached.");
  }

  if (numArts > 0) {
    runSimplex(totalCols);
    if (-T[m][rhsCol] > 1e-5) {
      // Infeasible: extract the minimum-violation solution (minimizes total artificial sum)
      const xBest = new Array(numX).fill(0);
      for (const r of activeRows) {
        if (basis[r] < numX) xBest[basis[r]] = Math.max(0, T[r][rhsCol]);
      }
      return { x: xBest, infeasible: true };
    }
    const kept = [];
    for (const r of activeRows) {
      if (basis[r] >= nonArtCols) {
        let pivoted = false;
        for (let j = 0; j < nonArtCols; j++) {
          if (Math.abs(T[r][j]) > 1e-8) {
            pivot(r, j, totalCols);
            pivoted = true;
            break;
          }
        }
        if (!pivoted) continue;
      }
      kept.push(r);
    }
    activeRows = kept;
  }

  for (let j = 0; j <= rhsCol; j++) T[m][j] = 0;
  for (let j = 0; j < numX; j++) T[m][j] = c[j];
  for (const r of activeRows) {
    const bCol = basis[r];
    if (bCol < numX && Math.abs(T[m][bCol]) > 1e-12) {
      const factor = T[m][bCol];
      for (let j = 0; j < nonArtCols; j++) T[m][j] -= factor * T[r][j];
      T[m][rhsCol] -= factor * T[r][rhsCol];
    }
  }

  runSimplex(nonArtCols);

  const x = new Array(numX).fill(0);
  for (const r of activeRows) {
    if (basis[r] < numX) x[basis[r]] = Math.max(0, T[r][rhsCol]);
  }
  return { x, infeasible: false };
}
