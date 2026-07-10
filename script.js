const DEFAULT_FLEET_LEVEL = 5;
const MIN_FLEET_LEVEL = 1;
const TRADE_ACTIVITY = "trade";

const DEFAULT_RITUALS = {
  none: {
    name: "No ritual",
    option: "All",
    rankModifier: 0,
    multiplier: 1,          
    ringsBonus: 0,
    duration: "",
    note: "No ritual selected."
  }
};

let RITUALS = { ...DEFAULT_RITUALS };

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildRituals(ritualsData) {
  const rituals = { ...DEFAULT_RITUALS };

  (ritualsData.rituals || []).forEach(ritual => {
    const id = ritual.id || slugify(ritual.name);
    rituals[id] = {
      name: ritual.name,
      option: ritual.option || "All",
      rankModifier: Number(ritual.rankModifier || 0),
      multiplier: Number(ritual.multiplier || 1),
      ringsBonus: Number(ritual.ringsBonus || 0),
      duration: ritual.duration || "",
      note: ritual.note || ritual.effect || ritual.name
    };
  });

  return rituals;
}

const state = {
  portsData: null,
  optionsData: null,
  ritualsData: null,
  baseLevel: DEFAULT_FLEET_LEVEL,
  weirwoodUpgrade: 0,
  debuff: 0,
  ritual: "none",
  activityType: TRADE_ACTIVITY,
  search: "",
  region: "all",
  material: "all",
  selectedPortId: null,
  selectedAdventureId: null
};

let els = {};

function getElements() {
  els = {
    activityType: document.querySelector("#activityType"),
    baseFleetLevel: document.querySelector("#baseFleetLevel"),
    weirwoodUpgrade: document.querySelector("#weirwoodUpgrade"),
    debuffLevel: document.querySelector("#debuffLevel"),
    ritualSelect: document.querySelector("#ritualSelect"),
    effectiveLevelDisplay: document.querySelector("#effectiveLevelDisplay"),
    effectiveLevelNote: document.querySelector("#effectiveLevelNote"),
    ritualNote: document.querySelector("#ritualNote"),
    modifierBreakdown: document.querySelector("#modifierBreakdown"),
    regionFilterControl: document.querySelector("#regionFilterControl"),
materialFilterControl: document.querySelector("#materialFilterControl"),
searchControl: document.querySelector("#searchControl"),

visibleCountPanel: document.querySelector("#visibleCountPanel"),
materialCountPanel: document.querySelector("#materialCountPanel"),
selectedChoicePanel: document.querySelector("#selectedChoicePanel"),

regionFilter: document.querySelector("#regionFilter"),
materialFilter: document.querySelector("#materialFilter"),
searchInput: document.querySelector("#searchInput"),
    resetFilters: document.querySelector("#resetFilters"),
    visibleCount: document.querySelector("#visibleCount"),
    visibleCountLabel: document.querySelector("#visibleCountLabel"),
    materialCount: document.querySelector("#materialCount"),
    selectedPortShort: document.querySelector("#selectedPortShort"),
    selectedChoiceLabel: document.querySelector("#selectedChoiceLabel"),
    portChoiceControl: document.querySelector("#portChoiceControl"),
    optionChoiceControl: document.querySelector("#optionChoiceControl"),
    chosenPort: document.querySelector("#chosenPort"),
    chosenOption: document.querySelector("#chosenOption"),
    portsHeading: document.querySelector("#ports-heading"),
    listEyebrow: document.querySelector("#listEyebrow"),
    ports: document.querySelector("#ports"),
    emptyState: document.querySelector("#emptyState"),
    productionSummary: document.querySelector("#productionSummary"),
    copySummary: document.querySelector("#copySummary"),
    dialog: document.querySelector("#portDialog"),
    closeDialog: document.querySelector("#closeDialog"),
    dialogContent: document.querySelector("#dialogContent")
  };
}

function requiredElementsExist() {
  const required = [
    "activityType", "weirwoodUpgrade", "debuffLevel", "ritualSelect",
    "effectiveLevelDisplay", "effectiveLevelNote", "ritualNote", "modifierBreakdown",
    "regionFilterControl", "materialFilterControl", "searchControl",
"visibleCountPanel", "materialCountPanel", "selectedChoicePanel",
"regionFilter", "materialFilter", "searchInput", "resetFilters",
"visibleCount", "visibleCountLabel", "materialCount", "selectedPortShort", "selectedChoiceLabel",, "portChoiceControl", "optionChoiceControl",
    "chosenPort", "chosenOption", "portsHeading", "listEyebrow", "ports", "emptyState",
    "productionSummary", "copySummary", "dialog", "closeDialog", "dialogContent"
  ];
  return required.every(key => els[key]);
}

function showFatalError(message) {
  const target = document.querySelector("#ports") || document.querySelector("main") || document.body;
  const errorBox = document.createElement("div");
  errorBox.className = "empty-state fatal-error";
  errorBox.textContent = message;
  target.innerHTML = "";
  target.appendChild(errorBox);
}

function isTradeActivity() {
  return state.activityType === TRADE_ACTIVITY;
}

function getActivityById(id = state.activityType) {
  return state.optionsData.options.find(option => option.id === id);
}

function getAllAdventures(activity = getActivityById()) {
  return activity ? activity.adventures : [];
}

function getAdventureById(id = state.selectedAdventureId) {
  for (const activity of state.optionsData.options) {
    const adventure = activity.adventures.find(item => item.id === id);
    if (adventure) return { ...adventure, activityName: activity.name, activityId: activity.id };
  }
  return null;
}

function getActivityMaxLevel() {
  return isTradeActivity()
    ? Number(state.portsData.maxFleetLevel || 14)
    : Number(state.optionsData.maxFleetLevel || 20);
}

function getEffectiveLevel() {
  const ritual = RITUALS[state.ritual] || RITUALS.none;
  const raw = state.baseLevel + state.weirwoodUpgrade - state.debuff + ritual.rankModifier;
  return Math.max(MIN_FLEET_LEVEL, Math.min(getActivityMaxLevel(), raw));
}

function isRingsMaterial(name) {
  return name.toLowerCase().includes("money") || name.toLowerCase().includes("rings");
}

function getRawAmount(material, level = getEffectiveLevel()) {
  return Number(material.levels[String(level)] ?? 0);
}

function getProductionAmount(material, level = getEffectiveLevel()) {
  const ritual = RITUALS[state.ritual] || RITUALS.none;
  let amount = getRawAmount(material, level);

  if (ritual.multiplier !== 1) {
    amount = Math.floor(amount * ritual.multiplier);
  }

  if (ritual.ringsBonus && isRingsMaterial(material.name)) {
    amount += ritual.ringsBonus;
  }

  return amount;
}

function getPortById(id) {
  return state.portsData.ports.find(port => port.id === id);
}

function getAllRegions() {
  return [...new Set(state.portsData.ports.map(port => port.region))].sort();
}

function getAllMaterials() {
  const names = new Set();
  state.portsData.ports.forEach(port => port.materials.forEach(material => names.add(material.name)));
  state.optionsData.options.forEach(option => {
    option.adventures.forEach(adventure => adventure.materials.forEach(material => names.add(material.name)));
  });
  return [...names].sort();
}

function getCurrentRitualOptionName() {
  if (isTradeActivity()) return "Trading";
  return getActivityById()?.name || "All";
}

function isRitualAvailableForCurrentActivity(ritual) {
  if (!ritual) return false;
  if (ritual.option === "All") return true;
  return ritual.option === getCurrentRitualOptionName();
}

function populateRitualSelect() {
  els.ritualSelect.innerHTML = "";

  const currentActivity = getCurrentRitualOptionName();

  const available = Object.entries(RITUALS).filter(([key, ritual]) => {
    return key === "none" || isRitualAvailableForCurrentActivity(ritual);
  });

  if (!available.some(([key]) => key === state.ritual)) {
    state.ritual = "none";
  }

  const noRitual = available.filter(([key]) => key === "none");

  const activitySpecific = available.filter(([key, ritual]) => {
    return key !== "none" && ritual.option === currentActivity;
  });

  const allRituals = available.filter(([key, ritual]) => {
    return key !== "none" && ritual.option === "All";
  });

  function addOption(key, ritual) {
    const option = document.createElement("option");
    option.value = key;

    const shortDescription =
      ritual.note && ritual.note !== ritual.name
        ? ` — ${ritual.note}`
        : "";

    option.textContent = `${ritual.name}${shortDescription}`;

    els.ritualSelect.appendChild(option);
  }

  noRitual.forEach(([key, ritual]) => addOption(key, ritual));

  if (activitySpecific.length) {
    const group = document.createElement("optgroup");
    group.label = `${currentActivity} rituals`;

    activitySpecific.forEach(([key, ritual]) => {
      const option = document.createElement("option");
      option.value = key;

      const shortDescription =
        ritual.note && ritual.note !== ritual.name
          ? ` — ${ritual.note}`
          : "";

      option.textContent = `${ritual.name}${shortDescription}`;
      group.appendChild(option);
    });

    els.ritualSelect.appendChild(group);
  }

  if (allRituals.length) {
    const group = document.createElement("optgroup");
    group.label = "All activities";

    allRituals.forEach(([key, ritual]) => {
      const option = document.createElement("option");
      option.value = key;

      const shortDescription =
        ritual.note && ritual.note !== ritual.name
          ? ` — ${ritual.note}`
          : "";

      option.textContent = `${ritual.name}${shortDescription}`;
      group.appendChild(option);
    });

    els.ritualSelect.appendChild(group);
  }

  els.ritualSelect.value = state.ritual;
}

function populateModifierSelects() {
  els.activityType.innerHTML = "";
  const tradeOption = document.createElement("option");
  tradeOption.value = TRADE_ACTIVITY;
  tradeOption.textContent = "Trading";
  els.activityType.appendChild(tradeOption);

  state.optionsData.options
    .filter(optionGroup => optionGroup && optionGroup.id && optionGroup.name && Array.isArray(optionGroup.adventures))
    .forEach(optionGroup => {
      const option = document.createElement("option");
      option.value = optionGroup.id;
      option.textContent = optionGroup.name;
      els.activityType.appendChild(option);
    });

  els.weirwoodUpgrade.innerHTML = "";
  const maxPermanentIncrease = Number(state.portsData.maxFleetLevel || 14) - DEFAULT_FLEET_LEVEL;
  for (let i = 0; i <= maxPermanentIncrease; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = i === 0 ? "None" : `+${i} permanent`;
    els.weirwoodUpgrade.appendChild(option);
  }

  els.debuffLevel.innerHTML = "";
  for (let i = 0; i <= 4; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = i === 0 ? "No debuff" : `-${i} level${i === 1 ? "" : "s"}`;
    els.debuffLevel.appendChild(option);
  }

  populateRitualSelect();
}

function populateStaticFilters() {
  populateModifierSelects();

  getAllRegions().forEach(region => {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = region;
    els.regionFilter.appendChild(option);
  });

  getAllMaterials().forEach(material => {
    const option = document.createElement("option");
    option.value = material;
    option.textContent = material;
    els.materialFilter.appendChild(option);
  });

  els.materialCount.textContent = getAllMaterials().length;
  populatePortSelect();
  populateOptionSelect();
}

function populatePortSelect() {
  els.chosenPort.innerHTML = "";
  state.portsData.ports.forEach(port => {
    const option = document.createElement("option");
    option.value = port.id;
    option.textContent = `${port.name} (${port.region})`;
    option.selected = port.id === state.selectedPortId;
    els.chosenPort.appendChild(option);
  });
}

function populateOptionSelect() {
  els.chosenOption.innerHTML = "";
  const activity = getActivityById();
  const adventures = getAllAdventures(activity);

  adventures.forEach(adventure => {
    const option = document.createElement("option");
    option.value = adventure.id;
    option.textContent = adventure.name;
    option.selected = adventure.id === state.selectedAdventureId;
    els.chosenOption.appendChild(option);
  });

  if (!isTradeActivity() && adventures.length && !adventures.some(a => a.id === state.selectedAdventureId)) {
    state.selectedAdventureId = adventures[0].id;
    els.chosenOption.value = state.selectedAdventureId;
  }
}

function filterPorts() {
  const query = state.search.trim().toLowerCase();
  const effectiveLevel = getEffectiveLevel();

  return state.portsData.ports.filter(port => {
    const matchesRegion = state.region === "all" || port.region === state.region;
    const matchesMaterial = state.material === "all" || port.materials.some(material => material.name === state.material && getProductionAmount(material, effectiveLevel) > 0);
    const haystack = [port.name, port.region, ...port.materials.map(material => material.name)].join(" ").toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    return matchesRegion && matchesMaterial && matchesSearch;
  });
}

function filterAdventures() {
  const query = state.search.trim().toLowerCase();
  const effectiveLevel = getEffectiveLevel();
  const activity = getActivityById();
  if (!activity) return [];

  return activity.adventures.filter(adventure => {
    const matchesMaterial = state.material === "all" || adventure.materials.some(material => material.name === state.material && getProductionAmount(material, effectiveLevel) > 0);
    const haystack = [activity.name, adventure.name, ...adventure.materials.map(material => material.name)].join(" ").toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    return matchesMaterial && matchesSearch;
  });
}

function getVisibleMaterials(materials, level = getEffectiveLevel()) {
  return materials.filter(material => {
    const matchesMaterial = state.material === "all" || material.name === state.material;
    return matchesMaterial && getProductionAmount(material, level) > 0;
  });
}

function renderEffectiveLevel() {
  const level = getEffectiveLevel();
  const ritual = RITUALS[state.ritual] || RITUALS.none;
  const activityLabel = isTradeActivity() ? "Trade voyage" : getActivityById()?.name || "Fleet option";

  els.effectiveLevelDisplay.textContent = level;
  els.effectiveLevelDisplay.classList.toggle("debuffed", level < DEFAULT_FLEET_LEVEL);
  els.effectiveLevelDisplay.classList.toggle("boosted", level > DEFAULT_FLEET_LEVEL);

  const parts = [`Base ${state.baseLevel}`];
  if (state.weirwoodUpgrade) parts.push(`+${state.weirwoodUpgrade} Weirwood`);
  if (state.debuff) parts.push(`-${state.debuff} debuff`);
  if (ritual.rankModifier > 0) parts.push(`+${ritual.rankModifier} ${ritual.name}`);
  if (ritual.rankModifier < 0) parts.push(`${ritual.rankModifier} ${ritual.name}`);

  els.effectiveLevelNote.textContent = `${activityLabel}: ${parts.join(" ")} = Rank ${level}`;
  if (level < DEFAULT_FLEET_LEVEL) els.effectiveLevelNote.textContent += " — using debuffed reward rows.";

  els.ritualNote.textContent = ritual.note;
  els.ritualNote.classList.toggle("ritual-note--buff", ritual.rankModifier > 0 || ritual.ringsBonus > 0);
  els.ritualNote.classList.toggle("ritual-note--debuff", ritual.rankModifier < 0 || ritual.multiplier < 1);

  const extraRingsRow = ritual.ringsBonus
    ? `<div class="breakdown-row"><span>Winds of Fortune</span><strong>+${ritual.ringsBonus} rings included below</strong></div>`
    : "";

  els.modifierBreakdown.innerHTML = `
    <div class="breakdown-row"><span>Activity</span><strong>${activityLabel}</strong></div>
    <div class="breakdown-row"><span>Base fleet</span><strong>Level ${state.baseLevel}</strong></div>
    <div class="breakdown-row"><span>Weirwood permanent upgrade</span><strong>+${state.weirwoodUpgrade}</strong></div>
    <div class="breakdown-row"><span>Region / fleet debuff</span><strong>-${state.debuff}</strong></div>
    <div class="breakdown-row"><span>Ritual</span><strong>${ritual.name}</strong></div>
    <div class="breakdown-row"><span>Ritual rank change</span><strong>${ritual.rankModifier > 0 ? "+" : ""}${ritual.rankModifier}</strong></div>
    <div class="breakdown-row"><span>Production multiplier</span><strong>${ritual.multiplier === 1 ? "×1" : `×${ritual.multiplier}`}</strong></div>
    ${extraRingsRow}
    <div class="breakdown-row breakdown-row--total"><span>Effective rank</span><strong>${level}</strong></div>
  `;
}

function materialRowHtml(material, level) {
  const amount = getProductionAmount(material, level);
  const zeroClass = amount === 0 ? " material-zero" : "";
  return `
    <div class="material-row${zeroClass}">
      <span class="material-name">${material.name}</span>
      <span class="material-amount">×${amount}</span>
    </div>
  `;
}

function renderTradePorts() {
  const ports = filterPorts();
  const effectiveLevel = getEffectiveLevel();

  els.ports.innerHTML = "";
  els.visibleCount.textContent = ports.length;
  els.emptyState.hidden = ports.length !== 0;
  els.emptyState.textContent = "No ports match those filters.";

  ports.forEach(port => {
    const card = document.createElement("article");
    card.className = "port-card";
    if (port.id === state.selectedPortId) card.classList.add("port-card--selected");

    const shownMaterials = getVisibleMaterials(port.materials, effectiveLevel);
    const materialsToDisplay = shownMaterials.length ? shownMaterials : port.materials.slice(0, 4);

    card.innerHTML = `
      <div class="port-card__header">
        <div>
          <h3>${port.name}</h3>
          <span class="region-pill">${port.region}</span>
        </div>
        <span class="level-pill">Rank ${effectiveLevel}</span>
      </div>
      <div class="materials-list">
        ${materialsToDisplay.map(material => materialRowHtml(material, effectiveLevel)).join("")}
      </div>
      <div class="card-actions">
        <button type="button" data-action="choose-port" data-port-id="${port.id}">${port.id === state.selectedPortId ? "Selected" : "Choose port"}</button>
        <button type="button" data-action="details-port" data-port-id="${port.id}">Details</button>
      </div>
    `;

    els.ports.appendChild(card);
  });
}

function renderOptionAdventures() {
  const adventures = filterAdventures();
  const activity = getActivityById();
  const effectiveLevel = getEffectiveLevel();

  els.ports.innerHTML = "";
  els.visibleCount.textContent = adventures.length;
  els.emptyState.hidden = adventures.length !== 0;
  els.emptyState.textContent = "No fleet options match those filters.";

  adventures.forEach(adventure => {
    const card = document.createElement("article");
    card.className = "port-card";
    if (adventure.id === state.selectedAdventureId) card.classList.add("port-card--selected");

    const shownMaterials = getVisibleMaterials(adventure.materials, effectiveLevel);
    const materialsToDisplay = shownMaterials.length ? shownMaterials : adventure.materials.slice(0, 4);

    card.innerHTML = `
      <div class="port-card__header">
        <div>
          <h3>${adventure.name}</h3>
          <span class="region-pill">${activity.name}</span>
        </div>
        <span class="level-pill">Rank ${effectiveLevel}</span>
      </div>
      <div class="materials-list">
        ${materialsToDisplay.map(material => materialRowHtml(material, effectiveLevel)).join("")}
      </div>
      <div class="card-actions">
        <button type="button" data-action="choose-option" data-option-id="${adventure.id}">${adventure.id === state.selectedAdventureId ? "Selected" : "Choose option"}</button>
        <button type="button" data-action="details-option" data-option-id="${adventure.id}">Details</button>
      </div>
    `;

    els.ports.appendChild(card);
  });
}

function renderList() {
  if (isTradeActivity()) renderTradePorts();
  else renderOptionAdventures();
}

function renderActivityControls() {
  const trade = isTradeActivity();

  els.portChoiceControl.hidden = !trade;
  els.optionChoiceControl.hidden = trade;

  els.regionFilterControl.hidden = !trade;
  els.materialFilterControl.hidden = !trade;
  els.searchControl.hidden = !trade;

  els.visibleCountPanel.hidden = !trade;
  els.materialCountPanel.hidden = !trade;
  els.selectedChoicePanel.hidden = !trade;

  els.listEyebrow.textContent = trade ? "Trading Ports" : "Adventure";
  els.portsHeading.textContent = trade ? "Available destinations" : `${getActivityById()?.name || "Fleet"} adventures`;
  els.visibleCountLabel.textContent = trade ? "Visible Ports" : "Visible Adventures";
  els.selectedChoiceLabel.textContent = trade ? "Selected Port" : "Selected Adventure";

  if (!trade) populateOptionSelect();
  populateRitualSelect();
}

function getCurrentSelection() {
  if (isTradeActivity()) {
    const port = getPortById(state.selectedPortId);
    return port ? { name: port.name, subheading: port.region, materials: port.materials } : null;
  }

  const adventure = getAdventureById(state.selectedAdventureId);
  return adventure ? { name: adventure.name, subheading: adventure.activityName, materials: adventure.materials } : null;
}

function renderSelectedOutput() {
  const selection = getCurrentSelection();
  if (!selection) {
    els.productionSummary.innerHTML = `<p class="empty-mini">Choose a trading port or an adventure for your downtime voyage.</p>`;
    els.selectedPortShort.textContent = "None";
    return;
  }

  els.selectedPortShort.textContent = selection.name;
  if (isTradeActivity()) els.chosenPort.value = state.selectedPortId;
  else els.chosenOption.value = state.selectedAdventureId;

  const produced = selection.materials
    .map(material => ({ name: material.name, amount: getProductionAmount(material) }))
    .filter(item => item.amount > 0);

  const ritual = RITUALS[state.ritual] || RITUALS.none;
  if (ritual.ringsBonus && !produced.some(item => isRingsMaterial(item.name))) {
    produced.push({ name: "Money (rings)", amount: ritual.ringsBonus });
  }

  if (!produced.length) {
    els.productionSummary.innerHTML = `<p class="empty-mini">No rewards at effective rank ${getEffectiveLevel()}.</p>`;
    return;
  }

  els.productionSummary.innerHTML = produced.map(item => `
    <div class="summary-item">
      <span>${item.name}</span>
      <strong>×${item.amount}</strong>
    </div>
  `).join("");
}

function renderAll() {
  renderActivityControls();
  renderEffectiveLevel();
  renderList();
  renderSelectedOutput();
  saveState();
}

function choosePort(portId) {
  state.selectedPortId = portId;
  renderAll();
  const port = getPortById(portId);
  showToast(`${port.name} selected for this voyage.`);
}

function chooseOption(optionId) {
  state.selectedAdventureId = optionId;
  renderAll();
  const adventure = getAdventureById(optionId);
  showToast(`${adventure.name} selected for this voyage.`);
}

function openDetails(kind, id) {
  const effectiveLevel = getEffectiveLevel();
  const selection = kind === "port"
    ? (() => {
        const port = getPortById(id);
        return port ? { name: port.name, subheading: port.region, materials: port.materials } : null;
      })()
    : (() => {
        const adventure = getAdventureById(id);
        return adventure ? { name: adventure.name, subheading: adventure.activityName, materials: adventure.materials } : null;
      })();

  if (!selection) return;

  els.dialogContent.innerHTML = `
    <p class="eyebrow">${selection.subheading}</p>
    <h2>${selection.name}</h2>
    <p class="subtitle">Production shown for effective rank ${effectiveLevel}.</p>
    <div class="dialog-material-grid">
      ${selection.materials.map(material => materialRowHtml(material, effectiveLevel)).join("")}
    </div>
  `;

  if (typeof els.dialog.showModal === "function") els.dialog.showModal();
  else alert(`${selection.name}\n${selection.materials.map(m => `${m.name}: ${getProductionAmount(m, effectiveLevel)}`).join("\n")}`);
}

function copySummary() {
  const selection = getCurrentSelection();
  const effectiveLevel = getEffectiveLevel();
  const lines = [
    "Empire Fleet Planner",
    "",
    `Activity: ${isTradeActivity() ? "Trade voyage" : getActivityById()?.name}`,
    `Choice: ${selection ? selection.name : "None selected"}`,
    `Region / Type: ${selection ? selection.subheading : "N/A"}`,
    `Effective rank: ${effectiveLevel}`,
    `${RITUALS[state.ritual]?.name || "No ritual"}; Base ${state.baseLevel}, Weirwood +${state.weirwoodUpgrade}, Debuff -${state.debuff}`,
    "",
    "Voyage production:"
  ];

  if (selection) {
    const produced = selection.materials
      .map(material => ({ name: material.name, amount: getProductionAmount(material, effectiveLevel) }))
      .filter(item => item.amount > 0);
    const ritual = RITUALS[state.ritual] || RITUALS.none;
    if (ritual.ringsBonus && !produced.some(item => isRingsMaterial(item.name))) produced.push({ name: "Money (rings)", amount: ritual.ringsBonus });
    produced.forEach(item => lines.push(`${item.name}: ${item.amount}`));
  }

  navigator.clipboard.writeText(lines.join("\n"))
    .then(() => showToast("Summary copied."))
    .catch(() => showToast("Could not copy summary."));
}

function saveState() {
  const payload = {
    weirwoodUpgrade: state.weirwoodUpgrade,
    debuff: state.debuff,
    ritual: state.ritual,
    activityType: state.activityType,
    selectedPortId: state.selectedPortId,
    selectedAdventureId: state.selectedAdventureId
  };
  localStorage.setItem("empireFleetPlanner.oneFleet", JSON.stringify(payload));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("empireFleetPlanner.oneFleet") || "{}");
    state.weirwoodUpgrade = Number(saved.weirwoodUpgrade || 0);
    state.debuff = Number(saved.debuff || 0);
    state.ritual = saved.ritual && RITUALS[saved.ritual] ? saved.ritual : "none";
    state.activityType = saved.activityType === TRADE_ACTIVITY || state.optionsData.options.some(o => o.id === saved.activityType)
      ? saved.activityType
      : TRADE_ACTIVITY;
    state.selectedPortId = saved.selectedPortId || state.portsData.ports[0].id;
    const activity = getActivityById(state.activityType);
    const fallbackAdventure = activity?.adventures?.[0]?.id || state.optionsData.options[0]?.adventures?.[0]?.id || null;
    state.selectedAdventureId = saved.selectedAdventureId || fallbackAdventure;
  } catch {
    state.selectedPortId = state.portsData.ports[0].id;
    state.selectedAdventureId = state.optionsData.options[0]?.adventures?.[0]?.id || null;
  }
}

function syncControlsFromState() {
  els.activityType.value = state.activityType;
  els.weirwoodUpgrade.value = String(state.weirwoodUpgrade);
  els.debuffLevel.value = String(state.debuff);
  els.ritualSelect.value = state.ritual;
  els.chosenPort.value = state.selectedPortId;
  populateOptionSelect();
  els.chosenOption.value = state.selectedAdventureId;
}

function resetPlanner() {
  state.weirwoodUpgrade = 0;
  state.debuff = 0;
  state.ritual = "none";
  state.activityType = TRADE_ACTIVITY;
  state.region = "all";
  state.material = "all";
  state.search = "";
  els.activityType.value = TRADE_ACTIVITY;
  els.regionFilter.value = "all";
  els.materialFilter.value = "all";
  els.searchInput.value = "";
  syncControlsFromState();
  renderAll();
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

function bindEvents() {
  els.activityType.addEventListener("change", event => {
    state.activityType = event.target.value;
    state.material = "all";
    state.search = "";
    els.materialFilter.value = "all";
    els.searchInput.value = "";
    if (!isTradeActivity()) {
      const activity = getActivityById();
      state.selectedAdventureId = activity?.adventures?.[0]?.id || null;
    }
    const currentRitual = RITUALS[state.ritual] || RITUALS.none;
    if (state.ritual !== "none" && !isRitualAvailableForCurrentActivity(currentRitual)) {
      state.ritual = "none";
    }
    renderAll();
  });

  els.weirwoodUpgrade.addEventListener("change", event => {
    state.weirwoodUpgrade = Number(event.target.value);
    renderAll();
  });

  els.debuffLevel.addEventListener("change", event => {
    state.debuff = Number(event.target.value);
    renderAll();
  });

  els.ritualSelect.addEventListener("change", event => {
    state.ritual = event.target.value;
    renderAll();
  });

  els.chosenPort.addEventListener("change", event => choosePort(event.target.value));
  els.chosenOption.addEventListener("change", event => chooseOption(event.target.value));

  els.regionFilter.addEventListener("change", event => {
    state.region = event.target.value;
    renderList();
  });

  els.materialFilter.addEventListener("change", event => {
    state.material = event.target.value;
    renderList();
  });

  els.searchInput.addEventListener("input", event => {
    state.search = event.target.value;
    renderList();
  });

  els.resetFilters.addEventListener("click", resetPlanner);
  els.copySummary.addEventListener("click", copySummary);
  els.closeDialog.addEventListener("click", () => els.dialog.close());

  els.ports.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "choose-port") choosePort(button.dataset.portId);
    if (action === "details-port") openDetails("port", button.dataset.portId);
    if (action === "choose-option") chooseOption(button.dataset.optionId);
    if (action === "details-option") openDetails("option", button.dataset.optionId);
  });
}

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${path}: ${response.status}`);
  return response.json();
}

async function init() {
  getElements();

  if (!requiredElementsExist()) {
    showFatalError("The HTML file is missing planner elements. Upload the new index.html, style.css, script.js, ports.json, options.json, and rituals.json together, replacing the older files.");
    console.error("Missing planner HTML elements", els);
    return;
  }

  try {
    const [portsData, optionsData, ritualsData] = await Promise.all([loadJson("ports.json"), loadJson("options.json"), loadJson("rituals.json")]);
    state.portsData = portsData;
    state.optionsData = optionsData;
    state.ritualsData = ritualsData;
    RITUALS = buildRituals(ritualsData);
    populateStaticFilters();
    loadState();
    syncControlsFromState();
    bindEvents();
    renderAll();
  } catch (error) {
    showFatalError(`${error.message}. Make sure ports.json, options.json, and rituals.json are in the same folder as index.html.`);
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", init);
