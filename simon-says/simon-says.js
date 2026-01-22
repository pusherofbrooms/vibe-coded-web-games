const pads = Array.from(document.querySelectorAll(".simon__pad"));
const roundEl = document.querySelector("#round");
const bestEl = document.querySelector("#best");
const statusEl = document.querySelector("#status");
const resetButton = document.querySelector("#reset-game");
const pauseButton = document.querySelector("#toggle-pause");
const backButton = document.querySelector("#back-button");

const keyMap = {
  Digit1: "green",
  Digit2: "red",
  Digit3: "yellow",
  Digit4: "blue",
  KeyQ: "green",
  KeyW: "red",
  KeyA: "yellow",
  KeyS: "blue",
};

const toneMap = {
  green: 261.63,
  red: 329.63,
  yellow: 392,
  blue: 523.25,
};

const game = {
  sequence: [],
  inputIndex: 0,
  acceptingInput: false,
  running: false,
  paused: false,
  locked: false,
  best: 0,
};

const audio = {
  context: null,
  enabled: true,
};

const animationTimings = {
  padFlash: 420,
  stepDelay: 160,
  roundDelay: 600,
};

const getPad = (name) => pads.find((pad) => pad.dataset.pad === name);

const updateText = (element, value) => {
  element.textContent = value;
};

const setStatus = (message) => {
  statusEl.textContent = message;
};

const updateHud = () => {
  updateText(roundEl, game.sequence.length);
  updateText(bestEl, game.best);
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureAudio = async () => {
  if (!audio.context) {
    audio.context = new AudioContext();
  }
  if (audio.context.state === "suspended") {
    await audio.context.resume();
  }
};

const playTone = async (padName, duration = 360) => {
  if (!audio.enabled) {
    return;
  }
  await ensureAudio();
  const oscillator = audio.context.createOscillator();
  const gain = audio.context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = toneMap[padName] || 440;
  gain.gain.value = 0.2;
  oscillator.connect(gain);
  gain.connect(audio.context.destination);
  oscillator.start();
  oscillator.stop(audio.context.currentTime + duration / 1000);
};

const flashPad = async (padName) => {
  const pad = getPad(padName);
  if (!pad) {
    return;
  }
  pad.classList.add("is-active");
  await playTone(padName, animationTimings.padFlash);
  await wait(animationTimings.padFlash);
  pad.classList.remove("is-active");
};

const playSequence = async () => {
  game.acceptingInput = false;
  game.locked = true;
  setStatus("Watch the pattern.");
  for (const padName of game.sequence) {
    if (!game.running || game.paused) {
      break;
    }
    await flashPad(padName);
    await wait(animationTimings.stepDelay);
  }
  if (game.running && !game.paused) {
    game.acceptingInput = true;
    game.locked = false;
    setStatus("Your turn!");
  }
};

const addStep = () => {
  const padName = pads[Math.floor(Math.random() * pads.length)].dataset.pad;
  game.sequence.push(padName);
};

const resetInput = () => {
  game.inputIndex = 0;
};

const startRound = async () => {
  resetInput();
  addStep();
  updateHud();
  await wait(animationTimings.roundDelay);
  await playSequence();
};

const startGame = async () => {
  game.sequence = [];
  game.inputIndex = 0;
  game.running = true;
  game.paused = false;
  game.acceptingInput = false;
  game.locked = false;
  resetButton.textContent = "Restart";
  setStatus("Get ready...");
  await startRound();
};

const endGame = () => {
  game.running = false;
  game.acceptingInput = false;
  game.locked = false;
  resetButton.textContent = "Start";
  if (game.sequence.length > game.best) {
    game.best = game.sequence.length;
  }
  updateHud();
  setStatus("Sequence broken. Press Start to try again.");
};

const togglePause = () => {
  if (!game.running) {
    return;
  }
  game.paused = !game.paused;
  pauseButton.textContent = game.paused ? "Resume" : "Pause";
  setStatus(game.paused ? "Paused." : "Your turn!");
};

const handleInput = async (padName) => {
  if (!game.running || game.paused || !game.acceptingInput || game.locked) {
    return;
  }
  const expected = game.sequence[game.inputIndex];
  await flashPad(padName);
  if (padName !== expected) {
    endGame();
    return;
  }
  game.inputIndex += 1;
  if (game.inputIndex >= game.sequence.length) {
    game.acceptingInput = false;
    setStatus("Nice! Next round...");
    await wait(animationTimings.roundDelay);
    startRound();
  }
};

const handleKey = (event) => {
  if (event.code === "KeyP") {
    togglePause();
    return;
  }
  const padName = keyMap[event.code];
  if (!padName) {
    return;
  }
  event.preventDefault();
  handleInput(padName);
};

pads.forEach((pad) => {
  pad.addEventListener("pointerdown", () => {
    handleInput(pad.dataset.pad);
  });
});

resetButton.addEventListener("click", () => {
  startGame();
});

pauseButton.addEventListener("click", () => {
  togglePause();
});

backButton.addEventListener("click", () => {
  window.location.href = "../index.html";
});

window.addEventListener("keydown", handleKey);

updateHud();
setStatus("Press Start to begin.");
