const canvas = document.getElementById("game-canvas");
const context = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const waveElement = document.getElementById("wave");
const citiesElement = document.getElementById("cities");
const ammoLeftElement = document.getElementById("ammo-left");
const ammoCenterElement = document.getElementById("ammo-center");
const ammoRightElement = document.getElementById("ammo-right");
const statusElement = document.getElementById("status");
const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const restartButton = document.getElementById("restart-button");
const backButton = document.getElementById("back-button");

const world = {
  width: canvas.width,
  height: canvas.height,
  groundY: canvas.height - 70,
};

const batteryTemplate = [
  { x: world.width * 0.18, speed: 235 },
  { x: world.width * 0.5, speed: 330 },
  { x: world.width * 0.82, speed: 235 },
];

const cityPositions = [
  world.width * 0.08,
  world.width * 0.22,
  world.width * 0.36,
  world.width * 0.64,
  world.width * 0.78,
  world.width * 0.92,
];

const state = {
  score: 0,
  wave: 1,
  gameOver: false,
  hasStarted: false,
  isPaused: false,
  pointerX: world.width / 2,
  pointerY: world.height / 2,
  cities: [],
  batteries: [],
  playerMissiles: [],
  enemyMissiles: [],
  explosions: [],
  launchTimer: 0,
  missilesRemainingToLaunch: 0,
  activeWaveMissiles: 0,
};

function createCity(x) {
  return {
    x,
    y: world.groundY,
    width: 48,
    height: 24,
    alive: true,
  };
}

function createBattery(template) {
  return {
    x: template.x,
    y: world.groundY,
    speed: template.speed,
    ammo: 10,
    alive: true,
  };
}

function getLivingCities() {
  return state.cities.filter((city) => city.alive);
}

function getLivingBatteries() {
  return state.batteries.filter((battery) => battery.alive);
}

function getTargets() {
  return [...getLivingCities(), ...getLivingBatteries()];
}

function updateHud() {
  scoreElement.textContent = String(state.score);
  waveElement.textContent = String(state.wave);
  citiesElement.textContent = String(getLivingCities().length);
  ammoLeftElement.textContent = String(state.batteries[0]?.ammo ?? 0);
  ammoCenterElement.textContent = String(state.batteries[1]?.ammo ?? 0);
  ammoRightElement.textContent = String(state.batteries[2]?.ammo ?? 0);
}

function startWave() {
  state.missilesRemainingToLaunch = 12 + (state.wave - 1) * 3;
  state.activeWaveMissiles = 0;
  state.launchTimer = 0;
  statusElement.textContent = `Wave ${state.wave} incoming.`;
}

function startGame() {
  if (state.hasStarted || state.gameOver) {
    return;
  }
  state.hasStarted = true;
  startButton.disabled = true;
  pauseButton.disabled = false;
  pauseButton.textContent = "Pause";
  startWave();
}

function resetGame() {
  state.score = 0;
  state.wave = 1;
  state.gameOver = false;
  state.hasStarted = false;
  state.isPaused = false;
  state.pointerX = world.width / 2;
  state.pointerY = world.height / 2;
  state.cities = cityPositions.map((x) => createCity(x));
  state.batteries = batteryTemplate.map((template) => createBattery(template));
  state.playerMissiles = [];
  state.enemyMissiles = [];
  state.explosions = [];
  state.launchTimer = 0;
  state.missilesRemainingToLaunch = 0;
  state.activeWaveMissiles = 0;
  startButton.disabled = false;
  pauseButton.disabled = true;
  pauseButton.textContent = "Pause";
  statusElement.textContent = "Press Start or Space to begin.";
  updateHud();
}

function togglePause() {
  if (!state.hasStarted || state.gameOver) {
    return;
  }

  state.isPaused = !state.isPaused;
  if (state.isPaused) {
    pauseButton.textContent = "Resume";
    statusElement.textContent = "Paused. Press P or Resume to continue.";
    return;
  }

  pauseButton.textContent = "Pause";
  statusElement.textContent = `Wave ${state.wave} incoming.`;
}

function setPointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = world.width / rect.width;
  const scaleY = world.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  state.pointerX = Math.max(0, Math.min(world.width, x));
  state.pointerY = Math.max(0, Math.min(world.groundY - 8, y));
}

function pickBatteryForShot(targetX) {
  const options = getLivingBatteries().filter((battery) => battery.ammo > 0);
  if (options.length === 0) {
    return null;
  }
  options.sort((a, b) => Math.abs(a.x - targetX) - Math.abs(b.x - targetX));
  return options[0];
}

function firePlayerMissile(targetX, targetY) {
  if (state.gameOver || !state.hasStarted || state.isPaused) {
    return;
  }

  const battery = pickBatteryForShot(targetX);
  if (!battery) {
    statusElement.textContent = "No missiles left. Hold the line with existing blasts.";
    return;
  }

  battery.ammo -= 1;
  const dx = targetX - battery.x;
  const dy = targetY - battery.y;
  const distance = Math.max(1, Math.hypot(dx, dy));

  state.playerMissiles.push({
    x: battery.x,
    y: battery.y,
    vx: (dx / distance) * battery.speed,
    vy: (dy / distance) * battery.speed,
    targetX,
    targetY,
  });

  updateHud();
}

function createEnemyMissile(startX, target, startY = 0) {
  const speed = 48 + (state.wave - 1) * 7;
  const dx = target.x - startX;
  const dy = target.y - 4 - startY;
  const distance = Math.max(1, Math.hypot(dx, dy));

  return {
    x: startX,
    y: startY,
    launchX: startX,
    launchY: startY,
    vx: (dx / distance) * speed,
    vy: (dy / distance) * speed,
    targetX: target.x,
    targetY: target.y,
    splitY: 85 + Math.random() * 190,
    canSplit: Math.random() < Math.min(0.15 + state.wave * 0.03, 0.42),
    didSplit: false,
  };
}

function spawnEnemyMissile() {
  const targets = getTargets();
  if (targets.length === 0 || state.missilesRemainingToLaunch <= 0) {
    return;
  }

  const target = targets[Math.floor(Math.random() * targets.length)];
  const startX = 25 + Math.random() * (world.width - 50);
  state.enemyMissiles.push(createEnemyMissile(startX, target));
  state.missilesRemainingToLaunch -= 1;
  state.activeWaveMissiles += 1;
}

function createExplosion(x, y, maxRadius, growthSpeed, color) {
  state.explosions.push({
    x,
    y,
    radius: 2,
    maxRadius,
    growthSpeed,
    shrinking: false,
    color,
  });
}

function destroyEnemyMissile(index) {
  const missile = state.enemyMissiles[index];
  if (!missile) {
    return;
  }
  createExplosion(missile.x, missile.y, 44, 110, "rgba(255, 205, 120, 0.85)");
  state.enemyMissiles.splice(index, 1);
  state.activeWaveMissiles -= 1;
  state.score += 25;
  updateHud();
}

function destroyTargetAt(x) {
  state.cities.forEach((city) => {
    if (city.alive && Math.abs(city.x - x) < city.width * 0.6) {
      city.alive = false;
    }
  });

  state.batteries.forEach((battery) => {
    if (battery.alive && Math.abs(battery.x - x) < 26) {
      battery.alive = false;
      battery.ammo = 0;
    }
  });

  createExplosion(x, world.groundY - 6, 36, 90, "rgba(255, 125, 90, 0.9)");
  updateHud();
}

function updatePlayerMissiles(deltaSeconds) {
  for (let index = state.playerMissiles.length - 1; index >= 0; index -= 1) {
    const missile = state.playerMissiles[index];
    missile.x += missile.vx * deltaSeconds;
    missile.y += missile.vy * deltaSeconds;

    const reachedX = missile.vx >= 0 ? missile.x >= missile.targetX : missile.x <= missile.targetX;
    const reachedY = missile.vy >= 0 ? missile.y >= missile.targetY : missile.y <= missile.targetY;
    if (reachedX && reachedY) {
      createExplosion(missile.targetX, missile.targetY, 52, 135, "rgba(255, 255, 190, 0.9)");
      state.playerMissiles.splice(index, 1);
    }
  }
}

function pickRandomSecondaryTarget() {
  const targets = getTargets();
  if (targets.length === 0) {
    return { x: 20 + Math.random() * (world.width - 40), y: world.groundY };
  }
  const target = targets[Math.floor(Math.random() * targets.length)];
  return { x: target.x, y: target.y };
}

function splitEnemyMissile(missile) {
  missile.didSplit = true;
  for (let i = 0; i < 2; i += 1) {
    const secondaryTarget = pickRandomSecondaryTarget();
    const splitMissile = createEnemyMissile(missile.x, secondaryTarget, missile.y);
    splitMissile.canSplit = false;
    splitMissile.didSplit = true;
    state.enemyMissiles.push(splitMissile);
    state.activeWaveMissiles += 1;
  }
}

function updateEnemyMissiles(deltaSeconds) {
  for (let index = state.enemyMissiles.length - 1; index >= 0; index -= 1) {
    const missile = state.enemyMissiles[index];
    missile.x += missile.vx * deltaSeconds;
    missile.y += missile.vy * deltaSeconds;

    if (missile.canSplit && !missile.didSplit && missile.y >= missile.splitY) {
      splitEnemyMissile(missile);
    }

    let destroyedInBlast = false;
    for (let i = 0; i < state.explosions.length; i += 1) {
      const explosion = state.explosions[i];
      const distance = Math.hypot(missile.x - explosion.x, missile.y - explosion.y);
      if (distance <= explosion.radius) {
        destroyEnemyMissile(index);
        destroyedInBlast = true;
        break;
      }
    }

    if (destroyedInBlast) {
      continue;
    }

    const reachedY = missile.vy >= 0 ? missile.y >= missile.targetY : missile.y <= missile.targetY;
    if (reachedY || missile.y >= world.groundY) {
      destroyTargetAt(missile.targetX);
      state.enemyMissiles.splice(index, 1);
      state.activeWaveMissiles -= 1;
    }
  }
}

function updateExplosions(deltaSeconds) {
  for (let index = state.explosions.length - 1; index >= 0; index -= 1) {
    const explosion = state.explosions[index];

    if (!explosion.shrinking) {
      explosion.radius += explosion.growthSpeed * deltaSeconds;
      if (explosion.radius >= explosion.maxRadius) {
        explosion.radius = explosion.maxRadius;
        explosion.shrinking = true;
      }
    } else {
      explosion.radius -= explosion.growthSpeed * 1.1 * deltaSeconds;
      if (explosion.radius <= 0) {
        state.explosions.splice(index, 1);
      }
    }
  }
}

function awardWaveBonus() {
  const survivingCities = getLivingCities().length;
  const remainingAmmo = state.batteries.reduce((sum, battery) => sum + battery.ammo, 0);
  const bonus = survivingCities * 100 + remainingAmmo * 5;
  state.score += bonus;
  updateHud();
}

function tryAdvanceWave() {
  if (state.gameOver || !state.hasStarted) {
    return;
  }

  const waveCleared = state.missilesRemainingToLaunch <= 0 && state.activeWaveMissiles <= 0;
  if (!waveCleared) {
    return;
  }

  awardWaveBonus();
  state.wave += 1;
  state.batteries.forEach((battery, index) => {
    if (battery.alive) {
      battery.ammo = Math.min(10, battery.ammo + 4);
    } else {
      const fallback = batteryTemplate[index];
      battery.alive = true;
      battery.ammo = 6;
      battery.speed = fallback.speed;
    }
  });
  updateHud();
  startWave();
}

function checkGameOver() {
  if (getLivingCities().length > 0) {
    return;
  }
  state.gameOver = true;
  startButton.disabled = true;
  pauseButton.disabled = true;
  statusElement.textContent = "The End. All cities were lost. Press Restart to play again.";
}

function updateGame(deltaSeconds) {
  if (state.gameOver || !state.hasStarted || state.isPaused) {
    return;
  }

  const launchInterval = Math.max(0.17, 0.8 - state.wave * 0.045);
  state.launchTimer -= deltaSeconds;
  while (state.launchTimer <= 0 && state.missilesRemainingToLaunch > 0) {
    spawnEnemyMissile();
    state.launchTimer += launchInterval;
  }

  updatePlayerMissiles(deltaSeconds);
  updateEnemyMissiles(deltaSeconds);
  updateExplosions(deltaSeconds);
  checkGameOver();
  tryAdvanceWave();
}

function drawGround() {
  context.fillStyle = "#2d415f";
  context.fillRect(0, world.groundY, world.width, world.height - world.groundY);

  context.fillStyle = "#3b5477";
  context.fillRect(0, world.groundY - 2, world.width, 2);
}

function drawCities() {
  state.cities.forEach((city) => {
    if (!city.alive) {
      context.fillStyle = "#5f3d3d";
      context.fillRect(city.x - city.width / 2, city.y - city.height, city.width, city.height);
      return;
    }

    context.fillStyle = "#95d3e9";
    context.fillRect(city.x - city.width / 2, city.y - city.height, city.width, city.height);
    context.fillStyle = "#d4f5ff";
    context.fillRect(city.x - city.width * 0.4, city.y - city.height + 3, city.width * 0.8, city.height * 0.35);
  });
}

function drawBatteries() {
  state.batteries.forEach((battery) => {
    if (!battery.alive) {
      context.fillStyle = "#67474e";
      context.beginPath();
      context.arc(battery.x, battery.y - 8, 20, 0, Math.PI * 2);
      context.fill();
      return;
    }

    context.fillStyle = "#c7ff8a";
    context.beginPath();
    context.arc(battery.x, battery.y - 8, 20, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#e8ffd0";
    context.fillRect(battery.x - 5, battery.y - 26, 10, 12);
  });
}

function drawPlayerMissiles() {
  context.strokeStyle = "#f2f8ff";
  context.lineWidth = 2;
  state.playerMissiles.forEach((missile) => {
    context.beginPath();
    context.moveTo(missile.x, missile.y);
    context.lineTo(missile.x - missile.vx * 0.03, missile.y - missile.vy * 0.03);
    context.stroke();
  });
}

function drawEnemyMissiles() {
  state.enemyMissiles.forEach((missile) => {
    context.lineCap = "round";

    context.strokeStyle = "rgba(255, 55, 45, 0.95)";
    context.lineWidth = 3.2;
    context.beginPath();
    context.moveTo(missile.launchX, missile.launchY);
    context.lineTo(missile.x, missile.y);
    context.stroke();

    context.strokeStyle = "rgba(255, 228, 188, 0.9)";
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(missile.launchX, missile.launchY);
    context.lineTo(missile.x, missile.y);
    context.stroke();

    context.fillStyle = "rgba(255, 206, 160, 0.5)";
    context.beginPath();
    context.arc(missile.x, missile.y, 6.4, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#ffd8a5";
    context.beginPath();
    context.arc(missile.x, missile.y, 4.1, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#ff705f";
    context.beginPath();
    context.arc(missile.x, missile.y, 2.5, 0, Math.PI * 2);
    context.fill();
  });
}

function drawExplosions() {
  state.explosions.forEach((explosion) => {
    context.fillStyle = explosion.color;
    context.beginPath();
    context.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
    context.fill();
  });
}

function drawCrosshair() {
  context.strokeStyle = "#f0f6ff";
  context.lineWidth = 1.4;
  context.beginPath();
  context.arc(state.pointerX, state.pointerY, 12, 0, Math.PI * 2);
  context.moveTo(state.pointerX - 18, state.pointerY);
  context.lineTo(state.pointerX + 18, state.pointerY);
  context.moveTo(state.pointerX, state.pointerY - 18);
  context.lineTo(state.pointerX, state.pointerY + 18);
  context.stroke();
}

function render() {
  context.clearRect(0, 0, world.width, world.height);

  const skyGradient = context.createLinearGradient(0, 0, 0, world.groundY);
  skyGradient.addColorStop(0, "#0a1020");
  skyGradient.addColorStop(0.62, "#1b3154");
  skyGradient.addColorStop(1, "#253d63");
  context.fillStyle = skyGradient;
  context.fillRect(0, 0, world.width, world.groundY);

  drawGround();
  drawCities();
  drawBatteries();
  drawEnemyMissiles();
  drawPlayerMissiles();
  drawExplosions();
  drawCrosshair();
}

let lastFrameTime = performance.now();

function gameLoop(currentTime) {
  const deltaSeconds = Math.min(0.033, (currentTime - lastFrameTime) / 1000);
  lastFrameTime = currentTime;

  updateGame(deltaSeconds);
  render();

  window.requestAnimationFrame(gameLoop);
}

canvas.addEventListener("pointermove", (event) => {
  setPointerFromEvent(event);
});

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  setPointerFromEvent(event);
  firePlayerMissile(state.pointerX, state.pointerY);
});

startButton.addEventListener("click", () => {
  startGame();
});

pauseButton.addEventListener("click", () => {
  togglePause();
});

restartButton.addEventListener("click", () => {
  resetGame();
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    startGame();
    return;
  }

  if (event.code === "KeyP") {
    event.preventDefault();
    togglePause();
  }
});

backButton.addEventListener("click", () => {
  window.location.href = "../index.html";
});

resetGame();
window.requestAnimationFrame(gameLoop);
