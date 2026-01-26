const yearEl = document.querySelector("#year");
const populationEl = document.querySelector("#population");
const grainEl = document.querySelector("#grain");
const landEl = document.querySelector("#land");
const landPriceEl = document.querySelector("#land-price");
const maxPlantEl = document.querySelector("#max-plant");
const grainAvailableEl = document.querySelector("#grain-available");
const reportEl = document.querySelector("#report");
const validationEl = document.querySelector("#validation");

const formEl = document.querySelector("#decision-form");
const acresTradeInput = document.querySelector("#acres-trade");
const bushelsFeedInput = document.querySelector("#bushels-feed");
const acresPlantInput = document.querySelector("#acres-plant");
const resetButton = document.querySelector("#reset-game");
const backButton = document.querySelector("#back-button");

const GAME_YEARS = 10;
const BUSHELS_PER_PERSON = 20;
const ACRES_FARMED_PER_PERSON = 10;
const BUSHELS_PER_ACRE_SEED = 1;
const PLAGUE_CHANCE = 0.15;

const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const defaultState = () => ({
  year: 1,
  population: 95,
  grain: 2800,
  land: 1000,
  landPrice: randomInt(17, 26),
  last: {
    starved: 0,
    immigrants: 5,
    plague: false,
    harvestPerAcre: 3,
    harvest: 3000,
    ratsAte: 200,
  },
  history: [],
  gameOver: false,
});

let state = defaultState();

const clampToInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return parsed;
};

const formatNumber = (value) => Number(value).toLocaleString("en-US");

const setText = (element, value) => {
  element.textContent = value;
};

const updateStats = () => {
  setText(yearEl, state.year);
  setText(populationEl, formatNumber(state.population));
  setText(grainEl, formatNumber(state.grain));
  setText(landEl, formatNumber(state.land));
  setText(landPriceEl, formatNumber(state.landPrice));

  const maxByPeople = state.population * ACRES_FARMED_PER_PERSON;
  const maxByLand = state.land;
  const maxByGrain = Math.floor(state.grain / BUSHELS_PER_ACRE_SEED);
  const maxPlant = Math.max(0, Math.min(maxByPeople, maxByLand, maxByGrain));
  setText(maxPlantEl, formatNumber(maxPlant));
  setText(grainAvailableEl, formatNumber(state.grain));
};

const renderReport = () => {
  const last = state.last;
  const report = [
    `In year ${state.year}, ${last.starved} people starved.`,
    last.plague
      ? "A horrible plague struck! Half the people died."
      : "The city was spared from plague.",
    `${last.immigrants} people came to the city.`,
    `Population is now ${state.population}.`,
    `The city owns ${state.land} acres of land.`,
    `You harvested ${last.harvest} bushels at ${last.harvestPerAcre} bushels per acre.`,
    `Rats ate ${last.ratsAte} bushels.`,
    `Grain remaining in storage: ${state.grain} bushels.`,
    "",
    `Land is trading at ${state.landPrice} bushels per acre.`,
  ];

  reportEl.textContent = report.join("\n");
};


const renderFinalReport = () => {
  const summary = state.history.reduce(
    (acc, entry) => {
      acc.totalStarved += entry.starved;
      acc.maxStarved = Math.max(acc.maxStarved, entry.starved);
      return acc;
    },
    { totalStarved: 0, maxStarved: 0 },
  );

  const avgStarved = summary.totalStarved / GAME_YEARS;
  const landPerPerson = state.land / Math.max(1, state.population);

  let rating = "Your rule was a catastrophe.";
  if (avgStarved === 0 && landPerPerson >= 10) {
    rating = "A fantastic performance! The people cheer your name.";
  } else if (avgStarved <= 1 && landPerPerson >= 9) {
    rating = "A strong reign. The people speak well of you.";
  } else if (avgStarved <= 3 && landPerPerson >= 7) {
    rating = "A fair reign, though some hardship endured.";
  } else if (avgStarved <= 5 && landPerPerson >= 5) {
    rating = "A shaky rule with uneven results.";
  }

  reportEl.textContent = [
    "Ten years have passed.",
    `Average annual starvation: ${avgStarved.toFixed(1)} people.`,
    `Population now stands at ${state.population}.`,
    `Land per person: ${landPerPerson.toFixed(1)} acres.`,
    rating,
    "Press Restart to play again.",
  ].join("\n");
};

const getValidationErrors = (tradeAcres, feedBushels, plantAcres) => {
  const errors = [];
  const landPrice = state.landPrice;
  const grainCost = tradeAcres > 0 ? tradeAcres * landPrice : 0;
  const grainGain = tradeAcres < 0 ? Math.abs(tradeAcres) * landPrice : 0;

  if (tradeAcres < 0 && Math.abs(tradeAcres) > state.land) {
    errors.push("You do not own that much land to sell.");
  }

  if (feedBushels < 0) {
    errors.push("Feeding must be zero or more.");
  }

  if (plantAcres < 0) {
    errors.push("Acres to plant must be zero or more.");
  }

  if (plantAcres > state.land + Math.max(0, tradeAcres)) {
    errors.push("You cannot plant more acres than you will own.");
  }

  if (plantAcres > state.population * ACRES_FARMED_PER_PERSON) {
    errors.push("You do not have enough people to plant that much.");
  }

  const grainAfterTrade = state.grain - grainCost + grainGain;
  const seedCost = Math.ceil(plantAcres * BUSHELS_PER_ACRE_SEED);
  const totalGrainNeeded = feedBushels + seedCost;

  if (grainAfterTrade < 0) {
    errors.push("You do not have enough grain to buy that much land.");
  }

  if (totalGrainNeeded > grainAfterTrade) {
    errors.push("You do not have enough grain for feeding and seed.");
  }

  return errors;
};

const updateValidation = () => {
  if (state.gameOver) {
    validationEl.textContent = "";
    return [];
  }
  const tradeAcres = clampToInt(acresTradeInput.value);
  const feedBushels = clampToInt(bushelsFeedInput.value);
  const plantAcres = clampToInt(acresPlantInput.value);
  const errors = getValidationErrors(tradeAcres, feedBushels, plantAcres);
  validationEl.textContent = errors[0] || "";
  return errors;
};

const resolveYear = (tradeAcres, feedBushels, plantAcres) => {
  const landPrice = state.landPrice;
  let grain = state.grain;
  let land = state.land;
  let population = state.population;

  if (tradeAcres > 0) {
    const cost = tradeAcres * landPrice;
    grain -= cost;
    land += tradeAcres;
  } else if (tradeAcres < 0) {
    const acresSold = Math.abs(tradeAcres);
    const revenue = acresSold * landPrice;
    grain += revenue;
    land -= acresSold;
  }

  grain -= feedBushels;

  const seedCost = Math.ceil(plantAcres * BUSHELS_PER_ACRE_SEED);
  grain -= seedCost;

  const harvestPerAcre = randomInt(1, 6);
  const harvest = plantAcres * harvestPerAcre;
  grain += harvest;

  let ratsAte = 0;
  if (randomInt(1, 100) <= 40) {
    const percent = randomInt(10, 30);
    ratsAte = Math.floor((grain * percent) / 100);
    grain -= ratsAte;
  }

  const peopleFed = Math.floor(feedBushels / BUSHELS_PER_PERSON);
  const starved = Math.max(0, population - peopleFed);
  population -= starved;

  let plague = false;
  if (population > 0 && Math.random() < PLAGUE_CHANCE) {
    plague = true;
    population = Math.floor(population / 2);
  }

  const immigrants =
    population > 0
      ? Math.floor(
          (20 * land + grain) / (100 * population) + 1,
        )
      : 0;
  population += immigrants;

  const nextLandPrice = randomInt(17, 26);

  const last = {
    starved,
    immigrants,
    plague,
    harvestPerAcre,
    harvest,
    ratsAte,
  };

  state = {
    ...state,
    year: state.year + 1,
    population,
    grain,
    land,
    landPrice: nextLandPrice,
    last,
    history: [...state.history, last],
  };
};

const setDefaultInputs = () => {
  acresTradeInput.value = "0";
  const feedBushels = Math.max(0, state.population * BUSHELS_PER_PERSON);
  bushelsFeedInput.value = feedBushels;
  const maxByPeople = state.population * ACRES_FARMED_PER_PERSON;
  const maxByLand = state.land;
  const remainingGrain = Math.max(0, state.grain - feedBushels);
  const maxByGrain = Math.floor(remainingGrain / BUSHELS_PER_ACRE_SEED);
  const maxPlant = Math.max(0, Math.min(maxByPeople, maxByLand, maxByGrain));
  acresPlantInput.value = maxPlant;
};

const updateUI = () => {
  updateStats();
  if (state.gameOver) {
    renderFinalReport();
  } else {
    renderReport();
  }
};

const startGame = () => {
  state = defaultState();
  setDefaultInputs();
  updateUI();
  validationEl.textContent = "";
};

const endGame = () => {
  state.gameOver = true;
  updateUI();
  validationEl.textContent = "";
  formEl.querySelectorAll("input, button").forEach((input) => {
    input.disabled = true;
  });
  resetButton.disabled = false;
};

const handleSubmit = (event) => {
  event.preventDefault();
  if (state.gameOver) {
    return;
  }
  const tradeAcres = clampToInt(acresTradeInput.value);
  const feedBushels = clampToInt(bushelsFeedInput.value);
  const plantAcres = clampToInt(acresPlantInput.value);
  const errors = getValidationErrors(tradeAcres, feedBushels, plantAcres);
  if (errors.length > 0) {
    validationEl.textContent = errors[0];
    return;
  }

  resolveYear(tradeAcres, feedBushels, plantAcres);

  if (state.year > GAME_YEARS || state.population <= 0) {
    endGame();
  } else {
    setDefaultInputs();
    updateUI();
    validationEl.textContent = "";
  }
};

formEl.addEventListener("input", updateValidation);
formEl.addEventListener("submit", handleSubmit);

resetButton.addEventListener("click", () => {
  formEl.querySelectorAll("input, button").forEach((input) => {
    input.disabled = false;
  });
  startGame();
});

backButton.addEventListener("click", () => {
  window.location.href = "../index.html";
});

startGame();
