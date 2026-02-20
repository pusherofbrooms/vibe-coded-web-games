const canvas = document.getElementById("slalom-canvas");
const scoreElement = document.getElementById("score");
const speedElement = document.getElementById("speed");
const gatesElement = document.getElementById("gates");
const statusElement = document.getElementById("status");
const resetButton = document.getElementById("reset-game");
const pauseButton = document.getElementById("toggle-pause");
const backButton = document.getElementById("back-button");
const touchButtons = document.querySelectorAll(".touch-controls button");

const context = canvas.getContext("2d");

const speedStart = 150;
const speedMax = 330;
const speedStep = 16;
const speedInterval = 8000;

const skierWidth = 24;
const skierHeight = 34;
const skierY = canvas.height - 290;
const skierSpeed = 290;

const treeBaseSize = 22;
const treeSpawnMin = 420;
const treeSpawnMax = 900;

const gatePoleHeight = 34;
const gatePoleWidth = 6;
const gateSpawnInterval = 2100;
const gateBonus = 130;

const snowStripeCount = 34;
const snowStripeHeight = 16;

const colors = {
  skyTop: "#a7c7eb",
  skyBottom: "#d4e5f8",
  snowA: "#f7fbff",
  snowB: "#e7f1fb",
  snowSpeck: "rgba(255, 255, 255, 0.78)",
  shadow: "rgba(78, 102, 128, 0.2)",
  tree: "#2f5f3c",
  treeDark: "#244d30",
  trunk: "#6f4c31",
  gateBlue: "#2f75d0",
  gateRed: "#d94040",
  skierCoat: "#e44b3b",
  skierPants: "#2d455f",
  skierSkin: "#f6d7bf",
  ski: "#213547",
};

const directionState = {
  left: false,
  right: false,
};

let score = 0;
let speed = speedStart;
let gatesCleared = 0;
let distance = 0;
let lastTime = 0;
let gameActive = false;
let paused = false;
let speedTimer = 0;
let treeTimer = 0;
let gateTimer = 0;
let snowOffset = 0;
let trees = [];
let gates = [];
let skierX = canvas.width / 2;

const snowSpecks = Array.from({ length: 95 }, () => {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 1 + Math.random() * 2.2,
    drift: -0.5 + Math.random(),
  };
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateScoreboard() {
  scoreElement.textContent = Math.floor(score);
  speedElement.textContent = Math.round(speed);
  gatesElement.textContent = gatesCleared;
}

function updateStatus(message) {
  statusElement.textContent = message;
}

function updatePauseButton() {
  pauseButton.textContent = paused ? "Resume" : "Pause";
}

function nextTreeDelay() {
  return treeSpawnMin + Math.random() * (treeSpawnMax - treeSpawnMin);
}

function resetState() {
  score = 0;
  speed = speedStart;
  gatesCleared = 0;
  distance = 0;
  speedTimer = 0;
  treeTimer = nextTreeDelay();
  gateTimer = gateSpawnInterval * 0.7;
  snowOffset = 0;
  trees = [];
  gates = [];
  skierX = canvas.width / 2;
  updateScoreboard();
}

function startGame() {
  resetState();
  gameActive = true;
  paused = false;
  resetButton.textContent = "Reset";
  updatePauseButton();
  updateStatus("Find the rhythm and clear the gates.");
}

function endGame(message) {
  gameActive = false;
  paused = false;
  resetButton.textContent = "Start";
  updatePauseButton();
  updateStatus(message || "You crashed. Press Start to run again.");
}

function togglePause() {
  if (!gameActive) {
    return;
  }
  paused = !paused;
  updatePauseButton();
  updateStatus(paused ? "Paused." : "Find the rhythm and clear the gates.");
}

function spawnTree() {
  const size = treeBaseSize + Math.random() * 16;
  const edgeBias = Math.random();
  let x;

  if (edgeBias < 0.45) {
    x = 20 + Math.random() * (canvas.width * 0.28);
  } else if (edgeBias > 0.55) {
    x = canvas.width * 0.72 + Math.random() * (canvas.width * 0.24 - 20);
  } else {
    x = 26 + Math.random() * (canvas.width - 52);
  }

  trees.push({
    x,
    y: canvas.height + size,
    size,
  });
}

function spawnGate() {
  const gap = 84 + Math.random() * 26;
  const centerPadding = 68;
  const center = centerPadding + Math.random() * (canvas.width - centerPadding * 2);
  const color = Math.random() < 0.5 ? "blue" : "red";

  gates.push({
    y: canvas.height + gatePoleHeight,
    leftX: center - gap / 2,
    rightX: center + gap / 2,
    color,
    passed: false,
  });
}

function moveWorld(delta) {
  const travel = speed * delta;
  snowOffset += travel * 0.34;

  trees.forEach((tree) => {
    tree.y -= travel;
  });
  trees = trees.filter((tree) => tree.y > -tree.size * 2);

  gates.forEach((gate) => {
    gate.y -= travel;
  });
  gates = gates.filter((gate) => gate.y > -gatePoleHeight * 1.5);
}

function updateDifficulty(deltaMs) {
  speedTimer += deltaMs;
  if (speedTimer >= speedInterval) {
    speed = Math.min(speedMax, speed + speedStep);
    speedTimer -= speedInterval;
  }
}

function updateSpawns(deltaMs) {
  treeTimer -= deltaMs;
  if (treeTimer <= 0) {
    spawnTree();
    treeTimer = nextTreeDelay();
  }

  gateTimer -= deltaMs;
  if (gateTimer <= 0) {
    spawnGate();
    gateTimer = gateSpawnInterval;
  }
}

function updateSkier(delta) {
  let direction = 0;
  if (directionState.left) {
    direction -= 1;
  }
  if (directionState.right) {
    direction += 1;
  }

  skierX += direction * skierSpeed * delta;
  skierX = clamp(skierX, skierWidth * 0.7, canvas.width - skierWidth * 0.7);
}

function skierHitTree(tree) {
  const skierTop = skierY - skierHeight * 0.45;
  const skierBottom = skierY + skierHeight * 0.5;
  const skierLeft = skierX - skierWidth * 0.5;
  const skierRight = skierX + skierWidth * 0.5;

  const trunkWidth = tree.size * 0.34;
  const trunkHeight = tree.size * 0.7;
  const trunkX = tree.x - trunkWidth / 2;
  const trunkY = tree.y - trunkHeight * 0.1;

  return (
    skierLeft < trunkX + trunkWidth &&
    skierRight > trunkX &&
    skierTop < trunkY + trunkHeight &&
    skierBottom > trunkY
  );
}

function skierHitGatePole(gate) {
  const skierTop = skierY - skierHeight * 0.45;
  const skierBottom = skierY + skierHeight * 0.55;
  const skierLeft = skierX - skierWidth * 0.5;
  const skierRight = skierX + skierWidth * 0.5;

  const top = gate.y - gatePoleHeight;
  const bottom = gate.y;

  if (skierBottom < top || skierTop > bottom) {
    return false;
  }

  const leftPole = {
    x: gate.leftX - gatePoleWidth / 2,
    y: top,
    width: gatePoleWidth,
    height: gatePoleHeight,
  };

  const rightPole = {
    x: gate.rightX - gatePoleWidth / 2,
    y: top,
    width: gatePoleWidth,
    height: gatePoleHeight,
  };

  const collidesLeft =
    skierLeft < leftPole.x + leftPole.width &&
    skierRight > leftPole.x &&
    skierTop < leftPole.y + leftPole.height &&
    skierBottom > leftPole.y;

  const collidesRight =
    skierLeft < rightPole.x + rightPole.width &&
    skierRight > rightPole.x &&
    skierTop < rightPole.y + rightPole.height &&
    skierBottom > rightPole.y;

  return collidesLeft || collidesRight;
}

function checkCollisionsAndScoring() {
  const treeHit = trees.some(skierHitTree);
  if (treeHit) {
    endGame("Tree impact. Press Start to try again.");
    return;
  }

  const gateHit = gates.some(skierHitGatePole);
  if (gateHit) {
    endGame("Gate clipped. Press Start to try again.");
    return;
  }

  gates.forEach((gate) => {
    if (!gate.passed && gate.y + gatePoleHeight < skierY - skierHeight * 0.5) {
      gate.passed = true;
      const gateCleared = skierX > gate.leftX && skierX < gate.rightX;
      if (gateCleared) {
        gatesCleared += 1;
        score += gateBonus;
      } else {
        score -= gateBonus;
      }
    }
  });
}

function drawSnowfield() {
  const skyHeight = 120;
  const skyGradient = context.createLinearGradient(0, 0, 0, skyHeight);
  skyGradient.addColorStop(0, colors.skyTop);
  skyGradient.addColorStop(1, colors.skyBottom);
  context.fillStyle = skyGradient;
  context.fillRect(0, 0, canvas.width, skyHeight);

  context.fillStyle = colors.snowA;
  context.fillRect(0, skyHeight, canvas.width, canvas.height - skyHeight);

  const stripeCycle = snowStripeCount * snowStripeHeight;
  for (let i = 0; i < snowStripeCount; i += 1) {
    const y = skyHeight + ((i * snowStripeHeight - snowOffset + stripeCycle) % stripeCycle);
    context.fillStyle = i % 2 === 0 ? colors.snowB : colors.snowA;
    context.fillRect(0, y, canvas.width, snowStripeHeight);
  }

  snowSpecks.forEach((speck) => {
    const y =
      (speck.y - snowOffset * (0.25 + speck.size * 0.08) + canvas.height) % canvas.height;
    const x = speck.x + Math.sin((y + speck.x) * 0.02) * speck.drift * 5;
    context.fillStyle = colors.snowSpeck;
    context.beginPath();
    context.arc(x, y, speck.size, 0, Math.PI * 2);
    context.fill();
  });
}

function drawTree(tree) {
  const topY = tree.y - tree.size;

  context.fillStyle = colors.treeDark;
  context.beginPath();
  context.moveTo(tree.x, topY - tree.size * 0.45);
  context.lineTo(tree.x - tree.size * 0.78, tree.y);
  context.lineTo(tree.x + tree.size * 0.78, tree.y);
  context.closePath();
  context.fill();

  context.fillStyle = colors.tree;
  context.beginPath();
  context.moveTo(tree.x, topY - tree.size * 0.1);
  context.lineTo(tree.x - tree.size * 0.62, tree.y + tree.size * 0.16);
  context.lineTo(tree.x + tree.size * 0.62, tree.y + tree.size * 0.16);
  context.closePath();
  context.fill();

  const trunkWidth = tree.size * 0.34;
  const trunkHeight = tree.size * 0.7;
  context.fillStyle = colors.trunk;
  context.fillRect(tree.x - trunkWidth / 2, tree.y - trunkHeight * 0.1, trunkWidth, trunkHeight);
}

function drawGate(gate) {
  const poleColor = gate.color === "blue" ? colors.gateBlue : colors.gateRed;
  const top = gate.y - gatePoleHeight;

  context.strokeStyle = poleColor;
  context.lineWidth = gatePoleWidth;
  context.lineCap = "round";

  context.beginPath();
  context.moveTo(gate.leftX, gate.y);
  context.lineTo(gate.leftX, top);
  context.moveTo(gate.rightX, gate.y);
  context.lineTo(gate.rightX, top);
  context.stroke();

  context.strokeStyle = "rgba(21, 34, 55, 0.26)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(gate.leftX + 4, gate.y + 2);
  context.lineTo(gate.rightX + 4, gate.y + 2);
  context.stroke();
}

function drawSkier() {
  const lean = directionState.left ? -1 : directionState.right ? 1 : 0;
  const bodyX = skierX + lean * 4;

  context.fillStyle = colors.shadow;
  context.beginPath();
  context.ellipse(skierX + lean * 3, skierY + 24, 22, 8, 0, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = colors.ski;
  context.lineWidth = 4;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(skierX - 14 + lean * 3, skierY + 22);
  context.lineTo(skierX - 2 + lean * 3, skierY + 30);
  context.moveTo(skierX + 14 + lean * 3, skierY + 22);
  context.lineTo(skierX + 2 + lean * 3, skierY + 30);
  context.stroke();

  context.fillStyle = colors.skierPants;
  context.fillRect(bodyX - 8, skierY + 2, 16, 13);

  context.fillStyle = colors.skierCoat;
  context.fillRect(bodyX - 10, skierY - 13, 20, 18);

  context.fillStyle = colors.skierSkin;
  context.beginPath();
  context.arc(bodyX, skierY - 18, 7, 0, Math.PI * 2);
  context.fill();
}

function draw() {
  drawSnowfield();
  gates.forEach(drawGate);
  trees.forEach(drawTree);
  drawSkier();
}

function update(time = 0) {
  const deltaMs = Math.min(48, time - lastTime || 16);
  const delta = deltaMs / 1000;
  lastTime = time;

  if (gameActive && !paused) {
    updateSkier(delta);
    moveWorld(delta);
    updateDifficulty(deltaMs);
    updateSpawns(deltaMs);
    checkCollisionsAndScoring();

    distance += speed * delta;
    score += speed * delta * 0.08;
    updateScoreboard();
  }

  draw();
  window.requestAnimationFrame(update);
}

function handleKeyDown(event) {
  if (event.code === "Space") {
    event.preventDefault();
    if (!gameActive) {
      startGame();
    }
    return;
  }

  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    directionState.left = true;
    event.preventDefault();
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    directionState.right = true;
    event.preventDefault();
  }
  if (event.code === "KeyP") {
    togglePause();
  }
}

function handleKeyUp(event) {
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    directionState.left = false;
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    directionState.right = false;
  }
}

function setTouchAction(action, isActive) {
  if (action === "left") {
    directionState.left = isActive;
  }
  if (action === "right") {
    directionState.right = isActive;
  }
}

resetButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
backButton.addEventListener("click", () => {
  window.location.href = "../index.html";
});
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
touchButtons.forEach((button) => {
  const action = button.dataset.action;
  button.addEventListener("mousedown", () => {
    setTouchAction(action, true);
  });
  button.addEventListener("mouseup", () => {
    setTouchAction(action, false);
  });
  button.addEventListener("mouseleave", () => {
    setTouchAction(action, false);
  });
  button.addEventListener("touchstart", (event) => {
    event.preventDefault();
    setTouchAction(action, true);
  });
  button.addEventListener("touchend", (event) => {
    event.preventDefault();
    setTouchAction(action, false);
  });
  button.addEventListener("touchcancel", (event) => {
    event.preventDefault();
    setTouchAction(action, false);
  });
});

resetButton.textContent = "Start";
updateScoreboard();
updateStatus("Press Start to play.");
updatePauseButton();
draw();
window.requestAnimationFrame(update);
