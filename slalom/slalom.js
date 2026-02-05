const canvas = document.getElementById("slalom-canvas");
const scoreElement = document.getElementById("score");
const speedElement = document.getElementById("speed");
const roadWidthElement = document.getElementById("road-width");
const statusElement = document.getElementById("status");
const resetButton = document.getElementById("reset-game");
const pauseButton = document.getElementById("toggle-pause");
const backButton = document.getElementById("back-button");
const touchButtons = document.querySelectorAll(".touch-controls button");

const context = canvas.getContext("2d");

const segmentHeight = 10;
const shoulderWidth = 12;
const roadPadding = 24;

const roadWidthStart = 260;
const roadWidthMin = 140;
const roadWidthStep = 10;
const roadWidthInterval = 9000;

const speedStart = 140;
const speedMax = 360;
const speedStep = 18;
const speedInterval = 7500;

const driftMax = 18;

const carWidth = 26;
const carHeight = 40;
const carSpeed = 280;
const carY = canvas.height - 70;

const obstacleSize = 22;

const colors = {
  grass: "#2f5b3a",
  road: "#505e73",
  shoulder: "#808a9b",
  lane: "#f2d25c",
  car: "#e6483a",
  carShadow: "#b23328",
  obstacle: "#6ac7d6",
  obstacleEdge: "#2a6d7c",
};

const directionState = {
  left: false,
  right: false,
};

let segments = [];
let scrollOffset = 0;
let roadWidth = roadWidthStart;
let roadCenter = canvas.width / 2;
let speed = speedStart;
let distance = 0;
let lastTime = 0;
let gameActive = false;
let paused = false;
let widthTimer = 0;
let speedTimer = 0;
let spawnTimer = 0;
let obstacles = [];
let carX = canvas.width / 2 - carWidth / 2;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateScoreboard() {
  scoreElement.textContent = Math.floor(distance / 10);
  speedElement.textContent = Math.round(speed);
  roadWidthElement.textContent = Math.round(roadWidth);
}

function updateStatus(message) {
  statusElement.textContent = message;
}

function updatePauseButton() {
  pauseButton.textContent = paused ? "Resume" : "Pause";
}

function createSegment(center, width) {
  return { center, width };
}

function generateNextSegment(reference) {
  const drift = (Math.random() * 2 - 1) * driftMax;
  const minCenter = roadPadding + roadWidth / 2;
  const maxCenter = canvas.width - roadPadding - roadWidth / 2;
  const center = clamp(reference.center + drift, minCenter, maxCenter);
  roadCenter = center;
  return createSegment(center, roadWidth);
}

function buildSegments() {
  const count = Math.ceil(canvas.height / segmentHeight) + 3;
  segments = [];
  let current = createSegment(roadCenter, roadWidth);
  for (let i = 0; i < count; i += 1) {
    segments.push(current);
    current = generateNextSegment(current);
  }
}

function resetState() {
  roadWidth = roadWidthStart;
  speed = speedStart;
  distance = 0;
  scrollOffset = 0;
  widthTimer = 0;
  speedTimer = 0;
  obstacles = [];
  spawnTimer = 1400 + Math.random() * 1000;
  roadCenter = canvas.width / 2;
  carX = canvas.width / 2 - carWidth / 2;
  buildSegments();
  updateScoreboard();
}

function startGame() {
  resetState();
  gameActive = true;
  paused = false;
  resetButton.textContent = "Reset";
  updatePauseButton();
  updateStatus("Hold the line!");
}

function endGame(message) {
  gameActive = false;
  paused = false;
  resetButton.textContent = "Start";
  updatePauseButton();
  updateStatus(message || "Off the road! Press Start to try again.");
}

function togglePause() {
  if (!gameActive) {
    return;
  }
  paused = !paused;
  updatePauseButton();
  updateStatus(paused ? "Paused." : "Hold the line!");
}

function getSegmentAt(y) {
  const index = Math.floor((y + scrollOffset) / segmentHeight);
  return segments[clamp(index, 0, segments.length - 1)];
}

function spawnObstacle() {
  const segment = getSegmentAt(0);
  const safePadding = 18;
  const leftEdge = segment.center - segment.width / 2 + safePadding;
  const rightEdge = segment.center + segment.width / 2 - safePadding - obstacleSize;
  if (rightEdge <= leftEdge) {
    return;
  }
  const x = leftEdge + Math.random() * (rightEdge - leftEdge);
  obstacles.push({ x, y: -obstacleSize });
}

function updateObstacles(delta) {
  const travel = speed * delta;
  obstacles.forEach((obstacle) => {
    obstacle.y += travel;
  });
  obstacles = obstacles.filter((obstacle) => obstacle.y < canvas.height + obstacleSize);
}

function updateRoad(deltaMs) {
  const travel = speed * (deltaMs / 1000);
  scrollOffset += travel;
  while (scrollOffset >= segmentHeight) {
    scrollOffset -= segmentHeight;
    segments.pop();
    segments.unshift(generateNextSegment(segments[0]));
  }
}

function updateDifficulty(deltaMs) {
  speedTimer += deltaMs;
  if (speedTimer >= speedInterval) {
    speed = Math.min(speedMax, speed + speedStep);
    speedTimer -= speedInterval;
  }

  widthTimer += deltaMs;
  if (widthTimer >= roadWidthInterval) {
    roadWidth = Math.max(roadWidthMin, roadWidth - roadWidthStep);
    widthTimer -= roadWidthInterval;
  }
}

function updateCar(delta) {
  let direction = 0;
  if (directionState.left) {
    direction -= 1;
  }
  if (directionState.right) {
    direction += 1;
  }
  carX += direction * carSpeed * delta;
  carX = clamp(carX, 0, canvas.width - carWidth);
}

function checkCollisions() {
  const sampleY = carY + carHeight * 0.8;
  const segment = getSegmentAt(sampleY);
  const leftEdge = segment.center - segment.width / 2;
  const rightEdge = segment.center + segment.width / 2;
  if (carX < leftEdge || carX + carWidth > rightEdge) {
    endGame("Off the road! Press Start to try again.");
    return;
  }

  const carRect = {
    x: carX,
    y: carY,
    width: carWidth,
    height: carHeight,
  };

  const hit = obstacles.some((obstacle) => {
    return (
      carRect.x < obstacle.x + obstacleSize &&
      carRect.x + carRect.width > obstacle.x &&
      carRect.y < obstacle.y + obstacleSize &&
      carRect.y + carRect.height > obstacle.y
    );
  });

  if (hit) {
    endGame("Crash! Press Start to try again.");
  }
}

function drawRoad() {
  context.fillStyle = colors.grass;
  context.fillRect(0, 0, canvas.width, canvas.height);

  segments.forEach((segment, index) => {
    const y = -scrollOffset + index * segmentHeight;
    const left = segment.center - segment.width / 2;
    const right = segment.center + segment.width / 2;

    context.fillStyle = colors.shoulder;
    context.fillRect(left - shoulderWidth, y, segment.width + shoulderWidth * 2, segmentHeight);

    context.fillStyle = colors.road;
    context.fillRect(left, y, segment.width, segmentHeight);

    context.strokeStyle = "rgba(255,255,255,0.2)";
    context.beginPath();
    context.moveTo(left, y + 0.5);
    context.lineTo(right, y + 0.5);
    context.stroke();
  });

  const laneWidth = 4;
  const laneLength = segmentHeight * 0.7;
  const laneGap = segmentHeight * 3.3;
  const dashCycle = laneLength + laneGap;

  context.save();
  context.strokeStyle = colors.lane;
  context.lineWidth = laneWidth;
  context.lineCap = "round";
  context.setLineDash([laneLength, laneGap]);
  context.lineDashOffset = -(scrollOffset % dashCycle);
  context.beginPath();
  segments.forEach((segment, index) => {
    const y = -scrollOffset + index * segmentHeight + segmentHeight / 2;
    const laneX = Math.round(segment.center) + 0.5;
    if (index === 0) {
      context.moveTo(laneX, y);
    } else {
      context.lineTo(laneX, y);
    }
  });
  context.stroke();
  context.restore();
}

function drawObstacles() {
  obstacles.forEach((obstacle) => {
    context.fillStyle = colors.obstacle;
    context.fillRect(obstacle.x, obstacle.y, obstacleSize, obstacleSize);
    context.strokeStyle = colors.obstacleEdge;
    context.strokeRect(obstacle.x + 0.5, obstacle.y + 0.5, obstacleSize - 1, obstacleSize - 1);
  });
}

function drawCar() {
  context.fillStyle = colors.carShadow;
  context.fillRect(carX + 3, carY + 6, carWidth - 6, carHeight - 6);
  context.fillStyle = colors.car;
  context.fillRect(carX, carY, carWidth, carHeight);
  context.fillStyle = "#f7f7fb";
  context.fillRect(carX + 5, carY + 6, carWidth - 10, 10);
}

function draw() {
  drawRoad();
  drawObstacles();
  drawCar();
}

function update(time = 0) {
  const deltaMs = time - lastTime;
  const delta = deltaMs / 1000;
  lastTime = time;

  if (gameActive && !paused) {
    const segment = getSegmentAt(carY + carHeight * 0.6);
    const carCenter = carX + carWidth / 2;
    if (carCenter >= segment.center) {
      distance += speed * delta;
    }
    updateRoad(deltaMs);
    updateObstacles(delta);
    updateDifficulty(deltaMs);
    updateCar(delta);
    checkCollisions();
    updateScoreboard();
    spawnTimer -= deltaMs;
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = 1200 + Math.random() * 1400;
    }
  }

  draw();
  window.requestAnimationFrame(update);
}

function handleKeyDown(event) {
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
    if (action === "left") {
      directionState.left = true;
    }
    if (action === "right") {
      directionState.right = true;
    }
  });
  button.addEventListener("mouseup", () => {
    if (action === "left") {
      directionState.left = false;
    }
    if (action === "right") {
      directionState.right = false;
    }
  });
  button.addEventListener("touchstart", (event) => {
    event.preventDefault();
    if (action === "left") {
      directionState.left = true;
    }
    if (action === "right") {
      directionState.right = true;
    }
  });
  button.addEventListener("touchend", (event) => {
    event.preventDefault();
    if (action === "left") {
      directionState.left = false;
    }
    if (action === "right") {
      directionState.right = false;
    }
  });
});

resetButton.textContent = "Start";
updateScoreboard();
updateStatus("Press Start to play.");
updatePauseButton();
buildSegments();
window.requestAnimationFrame(update);
