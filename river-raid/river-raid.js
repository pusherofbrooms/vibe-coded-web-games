const canvas = document.getElementById("raid-canvas");
const context = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const fuelElement = document.getElementById("fuel");
const distanceElement = document.getElementById("distance");
const livesElement = document.getElementById("lives");
const statusElement = document.getElementById("status");
const resetButton = document.getElementById("reset-game");
const pauseButton = document.getElementById("toggle-pause");
const backButton = document.getElementById("back-button");
const touchButtons = document.querySelectorAll(".touch-controls button");

const inputState = {
  left: false,
  right: false,
  up: false,
  down: false,
  fire: false,
};

const colors = {
  skyTop: "#15345a",
  skyBottom: "#3a6da0",
  terrain: "#4d7b42",
  terrainShade: "#3f6736",
  riverTop: "#2f7aad",
  riverBottom: "#184f7f",
  riverFoam: "rgba(220, 240, 255, 0.65)",
  player: "#f2f2f2",
  playerTrim: "#d53b2f",
  enemy: "#f37f32",
  bridge: "#7b808a",
  bridgeLane: "#aeb6c4",
  fuel: "#7dd772",
  fuelText: "#14351f",
  bullet: "#ffe56e",
  explosion: "#ffbe63",
};

const river = {
  segmentHeight: 18,
  minWidth: 190,
  maxWidth: 340,
  currentWidth: 280,
  targetWidth: 280,
  center: canvas.width / 2,
  targetCenter: canvas.width / 2,
  segments: [],
  scrollOffset: 0,
};

const player = {
  width: 24,
  height: 30,
  x: canvas.width / 2,
  y: canvas.height - 86,
  speed: 250,
  scrollSpeed: 155,
  minScrollSpeed: 90,
  maxScrollSpeed: 255,
  cooldown: 0,
  cooldownTime: 0.18,
  invulnerable: 0,
};

const state = {
  score: 0,
  distance: 0,
  fuel: 100,
  lives: 3,
  running: false,
  paused: false,
  spawnTimer: 0,
  bridgeTimer: 0,
  fuelTimer: 0,
  lastTime: 0,
  bullets: [],
  enemies: [],
  bridges: [],
  fuels: [],
  explosions: [],
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updatePauseButton() {
  pauseButton.textContent = state.paused ? "Resume" : "Pause";
}

function updateStatus(message) {
  statusElement.textContent = message;
}

function updateHud() {
  scoreElement.textContent = String(Math.floor(state.score));
  fuelElement.textContent = `${Math.max(0, Math.round(state.fuel))}%`;
  distanceElement.textContent = String(Math.floor(state.distance));
  livesElement.textContent = String(state.lives);
}

function createSegment(center, width) {
  return { center, width };
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function generateNextSegment(reference) {
  if (Math.random() < 0.14) {
    river.targetCenter = clamp(
      river.targetCenter + randomBetween(-85, 85),
      river.maxWidth * 0.5 + 40,
      canvas.width - river.maxWidth * 0.5 - 40,
    );
  }

  if (Math.random() < 0.12) {
    river.targetWidth = clamp(
      river.targetWidth + randomBetween(-60, 60),
      river.minWidth,
      river.maxWidth,
    );
  }

  river.center += (river.targetCenter - river.center) * 0.18;
  river.currentWidth += (river.targetWidth - river.currentWidth) * 0.22;

  const jitteredCenter = clamp(
    river.center + randomBetween(-12, 12),
    river.currentWidth * 0.5 + 26,
    canvas.width - river.currentWidth * 0.5 - 26,
  );

  return createSegment(jitteredCenter, river.currentWidth);
}

function buildRiver() {
  const count = Math.ceil(canvas.height / river.segmentHeight) + 4;
  river.segments = [];
  let current = createSegment(river.center, river.currentWidth);
  for (let i = 0; i < count; i += 1) {
    river.segments.push(current);
    current = generateNextSegment(current);
  }
}

function getSegmentAt(y) {
  const index = clamp(
    Math.floor((y + river.scrollOffset) / river.segmentHeight),
    0,
    river.segments.length - 1,
  );
  return river.segments[index];
}

function insideRiver(x, y, margin = 0) {
  const segment = getSegmentAt(y);
  const left = segment.center - segment.width / 2 + margin;
  const right = segment.center + segment.width / 2 - margin;
  return x >= left && x <= right;
}

function resetInputs() {
  inputState.left = false;
  inputState.right = false;
  inputState.up = false;
  inputState.down = false;
  inputState.fire = false;
  touchButtons.forEach((button) => {
    button.classList.remove("is-active");
  });
}

function startGame() {
  state.score = 0;
  state.distance = 0;
  state.fuel = 100;
  state.lives = 3;
  state.running = true;
  state.paused = false;
  state.spawnTimer = 0.9;
  state.bridgeTimer = 4.8;
  state.fuelTimer = 5.3;
  state.bullets = [];
  state.enemies = [];
  state.bridges = [];
  state.fuels = [];
  state.explosions = [];

  river.currentWidth = 280;
  river.targetWidth = 280;
  river.center = canvas.width / 2;
  river.targetCenter = canvas.width / 2;
  river.scrollOffset = 0;
  buildRiver();

  player.x = canvas.width / 2;
  player.y = canvas.height - 86;
  player.scrollSpeed = 155;
  player.cooldown = 0;
  player.invulnerable = 0;

  resetButton.textContent = "Reset";
  updatePauseButton();
  updateStatus("Mission active.");
  updateHud();
}

function stopGame(message) {
  state.running = false;
  state.paused = false;
  resetButton.textContent = "Start";
  updatePauseButton();
  updateStatus(message);
}

function togglePause() {
  if (!state.running) {
    return;
  }
  state.paused = !state.paused;
  updatePauseButton();
  updateStatus(state.paused ? "Paused." : "Mission active.");
}

function createEnemy() {
  const segment = getSegmentAt(0);
  const x = randomBetween(segment.center - segment.width * 0.32, segment.center + segment.width * 0.32);
  return {
    x,
    y: -24,
    width: 24,
    height: 24,
    speed: randomBetween(45, 85),
    value: 90,
  };
}

function createFuelDepot() {
  const segment = getSegmentAt(0);
  const x = randomBetween(segment.center - segment.width * 0.3, segment.center + segment.width * 0.3);
  return {
    x,
    y: -28,
    width: 32,
    height: 20,
    amount: 32,
  };
}

function createBridge() {
  return {
    y: -16,
    hits: 3,
    maxHits: 3,
    score: 180,
  };
}

function addExplosion(x, y, size = 18) {
  state.explosions.push({ x, y, radius: 3, max: size, speed: 95 });
}

function loseLife(message) {
  if (player.invulnerable > 0) {
    return;
  }

  state.lives -= 1;
  player.invulnerable = 1.2;
  player.x = canvas.width / 2;
  player.scrollSpeed = Math.max(player.minScrollSpeed + 10, player.scrollSpeed - 24);
  updateHud();

  if (state.lives <= 0) {
    stopGame(message || "Mission failed. Press Start to retry.");
    return;
  }

  updateStatus(message || "Aircraft damaged. Stay steady.");
}

function intersects(a, b) {
  return (
    a.x - a.width / 2 < b.x + b.width / 2 &&
    a.x + a.width / 2 > b.x - b.width / 2 &&
    a.y - a.height / 2 < b.y + b.height / 2 &&
    a.y + a.height / 2 > b.y - b.height / 2
  );
}

function updatePlayer(deltaSeconds) {
  const horizontal = (inputState.right ? 1 : 0) - (inputState.left ? 1 : 0);
  const vertical = (inputState.down ? 1 : 0) - (inputState.up ? 1 : 0);

  player.x += horizontal * player.speed * deltaSeconds;
  player.y += vertical * player.speed * 0.75 * deltaSeconds;
  player.y = clamp(player.y, 120, canvas.height - 50);

  player.scrollSpeed += ((inputState.up ? 38 : 0) - (inputState.down ? 52 : 0)) * deltaSeconds;
  player.scrollSpeed = clamp(player.scrollSpeed, player.minScrollSpeed, player.maxScrollSpeed);

  if (!insideRiver(player.x, player.y, 10)) {
    loseLife("You clipped the riverbank.");
  }

  player.cooldown = Math.max(0, player.cooldown - deltaSeconds);
  if (player.invulnerable > 0) {
    player.invulnerable = Math.max(0, player.invulnerable - deltaSeconds);
  }

  if (inputState.fire && player.cooldown <= 0) {
    state.bullets.push({
      x: player.x,
      y: player.y - player.height * 0.6,
      width: 5,
      height: 12,
      speed: 360,
    });
    player.cooldown = player.cooldownTime;
  }
}

function advanceRiver(deltaSeconds) {
  const travel = player.scrollSpeed * deltaSeconds;
  river.scrollOffset += travel;
  while (river.scrollOffset >= river.segmentHeight) {
    river.scrollOffset -= river.segmentHeight;
    river.segments.pop();
    river.segments.unshift(generateNextSegment(river.segments[0]));
  }
}

function updateBullets(deltaSeconds) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    bullet.y -= bullet.speed * deltaSeconds;
    if (bullet.y < -20) {
      state.bullets.splice(i, 1);
    }
  }
}

function updateEnemies(deltaSeconds) {
  state.spawnTimer -= deltaSeconds;
  if (state.spawnTimer <= 0) {
    state.enemies.push(createEnemy());
    state.spawnTimer = Math.max(0.34, 1.06 - state.distance * 0.00022) + Math.random() * 0.45;
  }

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    enemy.y += (player.scrollSpeed + enemy.speed) * deltaSeconds;

    if (!insideRiver(enemy.x, enemy.y, 4)) {
      state.enemies.splice(i, 1);
      continue;
    }

    if (enemy.y > canvas.height + 28) {
      state.enemies.splice(i, 1);
      continue;
    }

    const enemyBox = {
      x: enemy.x,
      y: enemy.y,
      width: enemy.width,
      height: enemy.height,
    };

    for (let j = state.bullets.length - 1; j >= 0; j -= 1) {
      const bullet = state.bullets[j];
      const bulletBox = {
        x: bullet.x,
        y: bullet.y,
        width: bullet.width,
        height: bullet.height,
      };
      if (intersects(enemyBox, bulletBox)) {
        addExplosion(enemy.x, enemy.y);
        state.score += enemy.value;
        state.enemies.splice(i, 1);
        state.bullets.splice(j, 1);
        updateHud();
        break;
      }
    }
  }
}

function updateFuelDepots(deltaSeconds) {
  state.fuelTimer -= deltaSeconds;
  if (state.fuelTimer <= 0) {
    state.fuels.push(createFuelDepot());
    state.fuelTimer = 6.1 + Math.random() * 3.7;
  }

  for (let i = state.fuels.length - 1; i >= 0; i -= 1) {
    const depot = state.fuels[i];
    depot.y += player.scrollSpeed * deltaSeconds;

    if (!insideRiver(depot.x, depot.y, 8) || depot.y > canvas.height + 28) {
      state.fuels.splice(i, 1);
      continue;
    }

    const playerBox = {
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height,
    };

    const depotBox = {
      x: depot.x,
      y: depot.y,
      width: depot.width,
      height: depot.height,
    };

    if (intersects(playerBox, depotBox)) {
      state.fuel = clamp(state.fuel + depot.amount, 0, 100);
      state.score += 70;
      addExplosion(depot.x, depot.y, 14);
      state.fuels.splice(i, 1);
      updateStatus("Fuel collected.");
      updateHud();
    }
  }
}

function bridgeYToScreenY(bridge) {
  return bridge.y;
}

function bridgeCenterAndWidth(bridge) {
  const segment = getSegmentAt(bridgeYToScreenY(bridge));
  return {
    center: segment.center,
    width: segment.width,
  };
}

function updateBridges(deltaSeconds) {
  state.bridgeTimer -= deltaSeconds;
  if (state.bridgeTimer <= 0) {
    state.bridges.push(createBridge());
    state.bridgeTimer = Math.max(4.2, 7.2 - state.distance * 0.0005) + Math.random() * 1.4;
  }

  for (let i = state.bridges.length - 1; i >= 0; i -= 1) {
    const bridge = state.bridges[i];
    bridge.y += player.scrollSpeed * deltaSeconds;

    if (bridge.y > canvas.height + 22) {
      state.bridges.splice(i, 1);
      continue;
    }

    const { center, width } = bridgeCenterAndWidth(bridge);
    const bridgeBox = {
      x: center,
      y: bridge.y,
      width,
      height: 14,
    };

    for (let j = state.bullets.length - 1; j >= 0; j -= 1) {
      const bullet = state.bullets[j];
      const bulletBox = {
        x: bullet.x,
        y: bullet.y,
        width: bullet.width,
        height: bullet.height,
      };

      if (intersects(bridgeBox, bulletBox)) {
        bridge.hits -= 1;
        state.bullets.splice(j, 1);
        addExplosion(bullet.x, bullet.y, 10);

        if (bridge.hits <= 0) {
          state.score += bridge.score;
          addExplosion(center, bridge.y, 24);
          state.bridges.splice(i, 1);
          updateStatus("Bridge destroyed.");
          updateHud();
        }
        break;
      }
    }

    const playerBox = {
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height,
    };

    if (intersects(playerBox, bridgeBox)) {
      loseLife("Bridge impact.");
    }
  }
}

function updateCollisions() {
  const playerBox = {
    x: player.x,
    y: player.y,
    width: player.width,
    height: player.height,
  };

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    const enemyBox = {
      x: enemy.x,
      y: enemy.y,
      width: enemy.width,
      height: enemy.height,
    };

    if (intersects(playerBox, enemyBox)) {
      addExplosion(enemy.x, enemy.y);
      state.enemies.splice(i, 1);
      loseLife("Enemy collision.");
    }
  }
}

function updateFuelAndDistance(deltaSeconds) {
  state.distance += player.scrollSpeed * deltaSeconds;
  state.score += player.scrollSpeed * deltaSeconds * 0.16;
  state.fuel -= (4.4 + player.scrollSpeed * 0.0065) * deltaSeconds;

  if (state.fuel <= 0) {
    state.fuel = 0;
    stopGame("Out of fuel. Press Start to retry.");
  }

  updateHud();
}

function updateExplosions(deltaSeconds) {
  for (let i = state.explosions.length - 1; i >= 0; i -= 1) {
    const explosion = state.explosions[i];
    explosion.radius += explosion.speed * deltaSeconds;
    if (explosion.radius >= explosion.max) {
      state.explosions.splice(i, 1);
    }
  }
}

function drawSkyAndTerrain() {
  const skyGradient = context.createLinearGradient(0, 0, 0, canvas.height * 0.5);
  skyGradient.addColorStop(0, colors.skyTop);
  skyGradient.addColorStop(1, colors.skyBottom);
  context.fillStyle = skyGradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = colors.terrain;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function drawRiver() {
  const riverGradient = context.createLinearGradient(0, 0, 0, canvas.height);
  riverGradient.addColorStop(0, colors.riverTop);
  riverGradient.addColorStop(1, colors.riverBottom);

  for (let i = 0; i < river.segments.length; i += 1) {
    const segment = river.segments[i];
    const y = -river.scrollOffset + i * river.segmentHeight;
    const left = segment.center - segment.width / 2;
    const right = segment.center + segment.width / 2;

    context.fillStyle = colors.terrainShade;
    context.fillRect(0, y, left, river.segmentHeight);
    context.fillRect(right, y, canvas.width - right, river.segmentHeight);

    context.fillStyle = riverGradient;
    context.fillRect(left, y, segment.width, river.segmentHeight);

    context.strokeStyle = colors.riverFoam;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(left + 1, y + 0.5);
    context.lineTo(left + 10, y + 0.5);
    context.moveTo(right - 1, y + 0.5);
    context.lineTo(right - 10, y + 0.5);
    context.stroke();
  }
}

function drawPlayer() {
  if (player.invulnerable > 0 && Math.floor(player.invulnerable * 14) % 2 === 0) {
    return;
  }

  const x = player.x;
  const y = player.y;
  context.fillStyle = colors.playerTrim;
  context.beginPath();
  context.moveTo(x, y - player.height * 0.6);
  context.lineTo(x + player.width * 0.46, y + player.height * 0.48);
  context.lineTo(x - player.width * 0.46, y + player.height * 0.48);
  context.closePath();
  context.fill();

  context.fillStyle = colors.player;
  context.beginPath();
  context.moveTo(x, y - player.height * 0.48);
  context.lineTo(x + player.width * 0.18, y + player.height * 0.42);
  context.lineTo(x - player.width * 0.18, y + player.height * 0.42);
  context.closePath();
  context.fill();

  context.fillStyle = "#9ed2f0";
  context.fillRect(x - 4, y - 6, 8, 10);
}

function drawBullets() {
  context.fillStyle = colors.bullet;
  state.bullets.forEach((bullet) => {
    context.fillRect(
      bullet.x - bullet.width / 2,
      bullet.y - bullet.height / 2,
      bullet.width,
      bullet.height,
    );
  });
}

function drawEnemies() {
  state.enemies.forEach((enemy) => {
    context.fillStyle = colors.enemy;
    context.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);
    context.fillStyle = "#3b1f11";
    context.fillRect(enemy.x - enemy.width * 0.36, enemy.y - 2, enemy.width * 0.72, 4);
  });
}

function drawFuelDepots() {
  state.fuels.forEach((depot) => {
    context.fillStyle = colors.fuel;
    context.fillRect(depot.x - depot.width / 2, depot.y - depot.height / 2, depot.width, depot.height);
    context.fillStyle = colors.fuelText;
    context.font = "bold 10px Tahoma";
    context.textAlign = "center";
    context.fillText("FUEL", depot.x, depot.y + 3);
  });
}

function drawBridges() {
  state.bridges.forEach((bridge) => {
    const { center, width } = bridgeCenterAndWidth(bridge);
    const y = bridge.y;
    context.fillStyle = colors.bridge;
    context.fillRect(center - width / 2, y - 7, width, 14);

    context.fillStyle = colors.bridgeLane;
    const stripeCount = 6;
    for (let i = 0; i < stripeCount; i += 1) {
      const t = i / (stripeCount - 1);
      const x = center - width / 2 + width * t;
      context.fillRect(x - 2, y - 7, 4, 14);
    }

    const healthRatio = bridge.hits / bridge.maxHits;
    context.fillStyle = "rgba(255, 70, 50, 0.92)";
    context.fillRect(center - width / 2, y - 11, width * healthRatio, 3);
  });
}

function drawExplosions() {
  state.explosions.forEach((explosion) => {
    context.fillStyle = `rgba(255, 190, 100, ${1 - explosion.radius / explosion.max})`;
    context.beginPath();
    context.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
    context.fill();
  });
}

function drawFrame() {
  drawSkyAndTerrain();
  drawRiver();
  drawFuelDepots();
  drawBridges();
  drawEnemies();
  drawBullets();
  drawExplosions();
  drawPlayer();
}

function update(deltaSeconds) {
  if (!state.running || state.paused) {
    return;
  }

  updatePlayer(deltaSeconds);
  advanceRiver(deltaSeconds);
  updateBullets(deltaSeconds);
  updateEnemies(deltaSeconds);
  updateFuelDepots(deltaSeconds);
  updateBridges(deltaSeconds);
  updateCollisions();
  updateFuelAndDistance(deltaSeconds);
  updateExplosions(deltaSeconds);
}

function gameLoop(time = 0) {
  const deltaSeconds = Math.min(0.04, Math.max(0, (time - state.lastTime) / 1000));
  state.lastTime = time;

  update(deltaSeconds);
  drawFrame();

  window.requestAnimationFrame(gameLoop);
}

function setActionState(action, isDown) {
  if (!Object.prototype.hasOwnProperty.call(inputState, action)) {
    return;
  }
  inputState[action] = isDown;
}

function handleKeyDown(event) {
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    setActionState("left", true);
    event.preventDefault();
    return;
  }

  if (event.code === "ArrowRight" || event.code === "KeyD") {
    setActionState("right", true);
    event.preventDefault();
    return;
  }

  if (event.code === "ArrowUp" || event.code === "KeyW") {
    setActionState("up", true);
    event.preventDefault();
    return;
  }

  if (event.code === "ArrowDown" || event.code === "KeyS") {
    setActionState("down", true);
    event.preventDefault();
    return;
  }

  if (event.code === "Space") {
    if (!state.running) {
      startGame();
      event.preventDefault();
      return;
    }
    setActionState("fire", true);
    event.preventDefault();
    return;
  }

  if (event.code === "KeyP") {
    togglePause();
  }
}

function handleKeyUp(event) {
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    setActionState("left", false);
    return;
  }

  if (event.code === "ArrowRight" || event.code === "KeyD") {
    setActionState("right", false);
    return;
  }

  if (event.code === "ArrowUp" || event.code === "KeyW") {
    setActionState("up", false);
    return;
  }

  if (event.code === "ArrowDown" || event.code === "KeyS") {
    setActionState("down", false);
    return;
  }

  if (event.code === "Space") {
    setActionState("fire", false);
  }
}

resetButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
backButton.addEventListener("click", () => {
  window.location.href = "../index.html";
});

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("blur", resetInputs);

touchButtons.forEach((button) => {
  const action = button.dataset.action;

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.classList.add("is-active");
    setActionState(action, true);
  });

  button.addEventListener("pointerup", (event) => {
    event.preventDefault();
    button.classList.remove("is-active");
    setActionState(action, false);
  });

  button.addEventListener("pointercancel", () => {
    button.classList.remove("is-active");
    setActionState(action, false);
  });

  button.addEventListener("pointerleave", () => {
    button.classList.remove("is-active");
    setActionState(action, false);
  });
});

pauseButton.disabled = false;
buildRiver();
updateHud();
updatePauseButton();
updateStatus("Press Start to fly.");
drawFrame();
window.requestAnimationFrame(gameLoop);
