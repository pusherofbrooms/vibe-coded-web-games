const canvas = document.getElementById("frogger-canvas");
const context = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const livesElement = document.getElementById("lives");
const levelElement = document.getElementById("level");
const homesElement = document.getElementById("homes");
const timerElement = document.getElementById("timer");
const statusElement = document.getElementById("status");
const resetButton = document.getElementById("reset-game");
const pauseButton = document.getElementById("toggle-pause");
const backButton = document.getElementById("back-button");
const touchButtons = document.querySelectorAll(".touch-controls button");

const columns = 14;
const rows = 14;
const cellSize = canvas.width / columns;
const startColumn = Math.floor(columns / 2);
const startRow = rows - 1;
const homeColumns = [1, 4, 7, 10, 12];
const laneRows = {
  river: [1, 2, 3, 4, 5],
  road: [7, 8, 9, 10, 11],
};

const riverLanes = [
  { row: 1, speed: -95, lengthCells: 2.4, gapCells: 2.8, type: "turtle", offset: 0.4 },
  { row: 2, speed: 80, lengthCells: 3.4, gapCells: 2.2, type: "log", offset: 1.2 },
  { row: 3, speed: -110, lengthCells: 2.8, gapCells: 2.5, type: "log", offset: 0.8 },
  { row: 4, speed: 70, lengthCells: 2.2, gapCells: 1.8, type: "turtle", offset: 0.2 },
  { row: 5, speed: -85, lengthCells: 3.2, gapCells: 2.4, type: "log", offset: 1.6 },
];

const roadLanes = [
  { row: 7, speed: 72, lengthCells: 1.9, gapCells: 5.2, type: "truck", offset: 0.5 },
  { row: 8, speed: -76, lengthCells: 1.5, gapCells: 5.0, type: "car", offset: 1.1 },
  { row: 9, speed: 82, lengthCells: 2.2, gapCells: 4.0, type: "truck", offset: 0.3 },
  { row: 10, speed: -88, lengthCells: 1.3, gapCells: 4.2, type: "car", offset: 0.9 },
  { row: 11, speed: 92, lengthCells: 1.8, gapCells: 3.8, type: "car", offset: 0.1 },
];

const directionByCode = {
  ArrowUp: { row: -1, column: 0 },
  ArrowDown: { row: 1, column: 0 },
  ArrowLeft: { row: 0, column: -1 },
  ArrowRight: { row: 0, column: 1 },
  KeyW: { row: -1, column: 0 },
  KeyS: { row: 1, column: 0 },
  KeyA: { row: 0, column: -1 },
  KeyD: { row: 0, column: 1 },
};

const touchDirectionMap = {
  up: directionByCode.ArrowUp,
  down: directionByCode.ArrowDown,
  left: directionByCode.ArrowLeft,
  right: directionByCode.ArrowRight,
};

const colors = {
  safe: "#224a2d",
  homes: "#2a5632",
  river: "#244f88",
  median: "#5f5f5f",
  road: "#303338",
  laneLine: "#8a8d94",
  frog: "#66d16a",
  frogEye: "#111111",
  log: "#8f6b43",
  turtle: "#4f8aa4",
  truck: "#e2a149",
  carA: "#d95f6c",
  carB: "#64b6d2",
  homeOpen: "#0f1d12",
  homeFilled: "#87d98c",
  waterDetail: "#3e6ea8",
};

let score = 0;
let lives = 3;
let level = 1;
let timeLimit = 55;
let timeLeft = timeLimit;
let farthestRow = startRow;
let homesFilled = new Set();
let frog = { x: startColumn * cellSize, row: startRow };
let riverPlatforms = [];
let roadVehicles = [];
let gameActive = false;
let paused = false;
let lastTime = 0;

function scaleLaneSpeed(speed) {
  return speed * (1 + (level - 1) * 0.06);
}

function buildLaneItems(laneConfigs) {
  return laneConfigs.map((lane) => {
    const laneWidthCells = lane.lengthCells;
    const spacingCells = lane.lengthCells + lane.gapCells;
    const spacingPx = spacingCells * cellSize;
    const itemWidthPx = laneWidthCells * cellSize;
    const itemCount = Math.ceil(canvas.width / spacingPx) + 3;
    const items = [];

    for (let index = 0; index < itemCount; index += 1) {
      items.push({
        x: (index * spacingCells + lane.offset) * cellSize,
        width: itemWidthPx,
      });
    }

    return {
      row: lane.row,
      type: lane.type,
      speed: scaleLaneSpeed(lane.speed),
      items,
    };
  });
}

function resetRunner() {
  frog = { x: startColumn * cellSize, row: startRow };
  timeLeft = timeLimit;
  farthestRow = startRow;
}

function rebuildLanes() {
  riverPlatforms = buildLaneItems(riverLanes);
  roadVehicles = buildLaneItems(roadLanes);
}

function updateScoreboard() {
  scoreElement.textContent = score;
  livesElement.textContent = lives;
  levelElement.textContent = level;
  homesElement.textContent = `${homesFilled.size}/${homeColumns.length}`;
  timerElement.textContent = Math.max(0, Math.ceil(timeLeft));
}

function updateStatus(message) {
  statusElement.textContent = message;
}

function updatePauseButton() {
  pauseButton.textContent = paused ? "Resume" : "Pause";
}

function startGame() {
  score = 0;
  lives = 3;
  level = 1;
  homesFilled = new Set();
  timeLimit = 55;
  gameActive = true;
  paused = false;
  resetButton.textContent = "Reset";
  rebuildLanes();
  resetRunner();
  updatePauseButton();
  updateStatus("Cross carefully.");
  updateScoreboard();
}

function stopGame(message) {
  gameActive = false;
  paused = false;
  resetButton.textContent = "Start";
  updatePauseButton();
  updateStatus(message);
}

function loseLife(reason) {
  if (!gameActive) {
    return;
  }

  lives -= 1;
  if (lives <= 0) {
    updateScoreboard();
    stopGame("Game over. Press Start to try again.");
    return;
  }

  resetRunner();
  updateScoreboard();
  updateStatus(reason);
}

function nextLevel() {
  level += 1;
  score += 500;
  homesFilled = new Set();
  timeLimit = Math.max(35, 55 - (level - 1) * 2);
  rebuildLanes();
  resetRunner();
  updateStatus(`Level ${level}. Traffic is faster now.`);
  updateScoreboard();
}

function nearestHomeColumn(frogCenterX) {
  let winner = null;
  let closest = Number.POSITIVE_INFINITY;
  homeColumns.forEach((column) => {
    const center = column * cellSize + cellSize * 0.5;
    const distance = Math.abs(center - frogCenterX);
    if (distance < closest) {
      closest = distance;
      winner = column;
    }
  });
  return closest <= cellSize * 0.48 ? winner : null;
}

function scoreAdvance(newRow) {
  if (newRow < farthestRow) {
    farthestRow = newRow;
    score += 10;
  }
}

function moveFrog(direction) {
  if (!gameActive || paused) {
    return;
  }

  const previousRow = frog.row;
  const nextRow = Math.max(0, Math.min(rows - 1, frog.row + direction.row));
  const nextColumnPx = Math.max(0, Math.min((columns - 1) * cellSize, frog.x + direction.column * cellSize));

  if (nextRow === frog.row && nextColumnPx === frog.x) {
    return;
  }

  frog.row = nextRow;
  frog.x = nextColumnPx;

  if (frog.row < previousRow) {
    scoreAdvance(frog.row);
    updateScoreboard();
  }

  if (frog.row === 0) {
    const frogCenterX = frog.x + cellSize * 0.5;
    const homeColumn = nearestHomeColumn(frogCenterX);

    if (homeColumn === null || homesFilled.has(homeColumn)) {
      loseLife("Wrong home slot. Keep moving.");
      return;
    }

    homesFilled.add(homeColumn);
    score += 100 + Math.max(0, Math.floor(timeLeft * 2));

    if (homesFilled.size === homeColumns.length) {
      nextLevel();
      return;
    }

    resetRunner();
    updateScoreboard();
    updateStatus("Home secured. Keep going.");
  }
}

function togglePause() {
  if (!gameActive) {
    return;
  }

  paused = !paused;
  updatePauseButton();
  updateStatus(paused ? "Paused." : "Cross carefully.");
}

function handleKeydown(event) {
  if (event.code === "Space") {
    event.preventDefault();
    if (!gameActive) {
      startGame();
    }
    return;
  }

  if (event.code === "KeyP") {
    event.preventDefault();
    togglePause();
    return;
  }

  const direction = directionByCode[event.code];
  if (!direction) {
    return;
  }

  event.preventDefault();
  if (event.repeat) {
    return;
  }
  moveFrog(direction);
}

function advanceLaneItems(lanes, deltaSeconds) {
  lanes.forEach((lane) => {
    lane.items.forEach((item) => {
      item.x += lane.speed * deltaSeconds;

      if (lane.speed > 0 && item.x > canvas.width + item.width) {
        item.x = -item.width;
      } else if (lane.speed < 0 && item.x < -item.width) {
        item.x = canvas.width + item.width;
      }
    });
  });
}

function laneForRow(lanes, row) {
  return lanes.find((lane) => lane.row === row) || null;
}

function frogRect() {
  return {
    left: frog.x + cellSize * 0.12,
    right: frog.x + cellSize * 0.88,
    top: frog.row * cellSize + cellSize * 0.15,
    bottom: frog.row * cellSize + cellSize * 0.86,
  };
}

function intersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function checkRoadCollision() {
  if (!laneRows.road.includes(frog.row)) {
    return false;
  }

  const lane = laneForRow(roadVehicles, frog.row);
  if (!lane) {
    return false;
  }

  const frogBox = frogRect();
  return lane.items.some((item) => {
    const vehicleBox = {
      left: item.x + cellSize * 0.08,
      right: item.x + item.width - cellSize * 0.08,
      top: lane.row * cellSize + cellSize * 0.2,
      bottom: lane.row * cellSize + cellSize * 0.82,
    };
    return intersects(frogBox, vehicleBox);
  });
}

function checkRiverSupport(deltaSeconds) {
  if (!laneRows.river.includes(frog.row)) {
    return true;
  }

  const lane = laneForRow(riverPlatforms, frog.row);
  if (!lane) {
    return false;
  }

  const frogCenterX = frog.x + cellSize * 0.5;
  const support = lane.items.find((item) => frogCenterX >= item.x && frogCenterX <= item.x + item.width);

  if (!support) {
    return false;
  }

  frog.x += lane.speed * deltaSeconds;
  if (frog.x < 0 || frog.x > (columns - 1) * cellSize) {
    return false;
  }

  return true;
}

function drawRowBackgrounds() {
  for (let row = 0; row < rows; row += 1) {
    let fill = colors.safe;

    if (row === 0) {
      fill = colors.homes;
    } else if (laneRows.river.includes(row)) {
      fill = colors.river;
    } else if (row === 6) {
      fill = colors.median;
    } else if (laneRows.road.includes(row)) {
      fill = colors.road;
    }

    context.fillStyle = fill;
    context.fillRect(0, row * cellSize, canvas.width, cellSize);
  }

  context.fillStyle = colors.waterDetail;
  laneRows.river.forEach((row) => {
    const y = row * cellSize;
    context.fillRect(0, y + cellSize * 0.7, canvas.width, 2);
    context.fillRect(0, y + cellSize * 0.34, canvas.width, 1);
  });

  context.fillStyle = colors.laneLine;
  laneRows.road.forEach((row) => {
    const y = row * cellSize + cellSize - 3;
    for (let x = 0; x < canvas.width; x += cellSize * 1.6) {
      context.fillRect(x + cellSize * 0.2, y, cellSize * 0.8, 2);
    }
  });
}

function drawHomes() {
  context.fillStyle = colors.homeOpen;
  homeColumns.forEach((column) => {
    const x = column * cellSize + cellSize * 0.08;
    const y = cellSize * 0.14;
    const width = cellSize * 0.84;
    const height = cellSize * 0.72;
    context.fillRect(x, y, width, height);

    if (homesFilled.has(column)) {
      context.fillStyle = colors.homeFilled;
      context.beginPath();
      context.ellipse(x + width * 0.5, y + height * 0.55, width * 0.35, height * 0.28, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = colors.homeOpen;
    }
  });
}

function drawRiverPlatforms() {
  riverPlatforms.forEach((lane) => {
    lane.items.forEach((item) => {
      const y = lane.row * cellSize + cellSize * 0.2;
      const height = cellSize * 0.62;

      if (lane.type === "log") {
        context.fillStyle = colors.log;
      } else {
        context.fillStyle = colors.turtle;
      }

      context.fillRect(item.x, y, item.width, height);

      context.strokeStyle = "rgba(0, 0, 0, 0.24)";
      context.strokeRect(item.x + 0.5, y + 0.5, item.width - 1, height - 1);
    });
  });
}

function drawRoadVehicles() {
  roadVehicles.forEach((lane) => {
    lane.items.forEach((item, index) => {
      if (lane.type === "truck") {
        context.fillStyle = colors.truck;
      } else {
        context.fillStyle = index % 2 === 0 ? colors.carA : colors.carB;
      }

      const y = lane.row * cellSize + cellSize * 0.22;
      const height = cellSize * 0.56;
      context.fillRect(item.x, y, item.width, height);

      context.fillStyle = "rgba(255, 255, 255, 0.28)";
      context.fillRect(item.x + cellSize * 0.18, y + cellSize * 0.08, item.width - cellSize * 0.36, cellSize * 0.2);

      context.strokeStyle = "rgba(0, 0, 0, 0.34)";
      context.strokeRect(item.x + 0.5, y + 0.5, item.width - 1, height - 1);
    });
  });
}

function drawFrog() {
  const x = frog.x;
  const y = frog.row * cellSize;

  context.fillStyle = colors.frog;
  context.beginPath();
  context.ellipse(x + cellSize * 0.5, y + cellSize * 0.54, cellSize * 0.32, cellSize * 0.3, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = colors.frogEye;
  context.beginPath();
  context.arc(x + cellSize * 0.39, y + cellSize * 0.34, 2.4, 0, Math.PI * 2);
  context.arc(x + cellSize * 0.61, y + cellSize * 0.34, 2.4, 0, Math.PI * 2);
  context.fill();
}

function drawBoard() {
  drawRowBackgrounds();
  drawHomes();
  drawRiverPlatforms();
  drawRoadVehicles();
  drawFrog();
}

function update(deltaSeconds) {
  if (!gameActive || paused) {
    return;
  }

  timeLeft -= deltaSeconds;
  if (timeLeft <= 0) {
    loseLife("Time up. Move faster.");
    return;
  }

  advanceLaneItems(riverPlatforms, deltaSeconds);
  advanceLaneItems(roadVehicles, deltaSeconds);

  if (!checkRiverSupport(deltaSeconds)) {
    loseLife("You splashed into the river.");
    return;
  }

  if (checkRoadCollision()) {
    loseLife("Traffic got you.");
    return;
  }

  updateScoreboard();
}

function frame(time = 0) {
  const deltaMs = Math.min(64, Math.max(0, time - lastTime));
  const deltaSeconds = deltaMs / 1000;
  lastTime = time;

  update(deltaSeconds);
  drawBoard();
  window.requestAnimationFrame(frame);
}

resetButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
backButton.addEventListener("click", () => {
  window.location.href = "../index.html";
});

window.addEventListener("keydown", handleKeydown);

touchButtons.forEach((button) => {
  const action = button.dataset.action;
  if (!action) {
    return;
  }

  button.addEventListener("click", (event) => {
    event.preventDefault();

    if (!gameActive) {
      startGame();
    }

    const direction = touchDirectionMap[action];
    if (direction) {
      moveFrog(direction);
    }
  });
});

rebuildLanes();
updateScoreboard();
updatePauseButton();
updateStatus("Press Start to play.");
window.requestAnimationFrame(frame);
