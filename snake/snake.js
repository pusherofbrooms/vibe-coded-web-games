const playfieldCanvas = document.getElementById("playfield");
const scoreElement = document.getElementById("score");
const speedElement = document.getElementById("speed");
const statusElement = document.getElementById("status");
const resetButton = document.getElementById("reset-game");
const pauseButton = document.getElementById("toggle-pause");
const backButton = document.getElementById("back-button");

const context = playfieldCanvas.getContext("2d");

const columns = 18;
const rows = 18;
const cellSize = playfieldCanvas.width / columns;
const baseSpeed = 6;
const speedStep = 1;
const maxSpeed = 15;

const colors = {
  background: "#1d273b",
  snake: "#7fd17d",
  snakeHead: "#4fa85d",
  snack: "#f4cf65",
  border: "#2a3c57",
};

const directionVectors = {
  ArrowUp: { row: -1, column: 0 },
  ArrowDown: { row: 1, column: 0 },
  ArrowLeft: { row: 0, column: -1 },
  ArrowRight: { row: 0, column: 1 },
  KeyW: { row: -1, column: 0 },
  KeyS: { row: 1, column: 0 },
  KeyA: { row: 0, column: -1 },
  KeyD: { row: 0, column: 1 },
};

let snake = [];
let direction = directionVectors.ArrowRight;
let pendingDirection = direction;
let snack = null;
let score = 0;
let speedLevel = 1;
let lastTime = 0;
let accumulator = 0;
let gameActive = false;
let paused = false;

function resetState() {
  snake = [
    { row: Math.floor(rows / 2), column: Math.floor(columns / 2) },
    { row: Math.floor(rows / 2), column: Math.floor(columns / 2) - 1 },
    { row: Math.floor(rows / 2), column: Math.floor(columns / 2) - 2 },
  ];
  direction = directionVectors.ArrowRight;
  pendingDirection = direction;
  score = 0;
  speedLevel = 1;
  placeSnack();
  updateScoreboard();
}

function updateScoreboard() {
  scoreElement.textContent = score;
  speedElement.textContent = speedLevel;
}

function updateStatus(message) {
  statusElement.textContent = message;
}

function updatePauseButton() {
  pauseButton.textContent = paused ? "Resume" : "Pause";
}

function getSpeed() {
  return Math.min(maxSpeed, baseSpeed + (speedLevel - 1) * speedStep);
}

function drawCell(row, column, fill, stroke) {
  const x = column * cellSize;
  const y = row * cellSize;
  context.fillStyle = fill;
  context.fillRect(x, y, cellSize, cellSize);
  if (stroke) {
    context.strokeStyle = stroke;
    context.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
  }
}

function drawBoard() {
  context.fillStyle = colors.background;
  context.fillRect(0, 0, playfieldCanvas.width, playfieldCanvas.height);

  if (snack) {
    drawCell(snack.row, snack.column, colors.snack, colors.border);
  }

  snake.forEach((segment, index) => {
    const fill = index === 0 ? colors.snakeHead : colors.snake;
    drawCell(segment.row, segment.column, fill, colors.border);
  });
}

function placeSnack() {
  const available = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (!snake.some((segment) => segment.row === row && segment.column === column)) {
        available.push({ row, column });
      }
    }
  }

  if (available.length === 0) {
    snack = null;
    return;
  }

  snack = available[Math.floor(Math.random() * available.length)];
}

function isOppositeDirection(nextDirection) {
  return (
    nextDirection.row === -direction.row && nextDirection.column === -direction.column
  );
}

function handleInput(event) {
  const { code } = event;
  if (code === "KeyP") {
    togglePause();
    return;
  }

  const nextDirection = directionVectors[code];
  if (!nextDirection) {
    return;
  }

  event.preventDefault();
  if (!gameActive || paused) {
    return;
  }

  if (!isOppositeDirection(nextDirection)) {
    pendingDirection = nextDirection;
  }
}

function startGame() {
  resetState();
  lastTime = 0;
  accumulator = 0;
  gameActive = true;
  paused = false;
  resetButton.textContent = "Reset";
  updatePauseButton();
  updateStatus("Stay sharp!");
}

function endGame() {
  gameActive = false;
  paused = false;
  resetButton.textContent = "Start";
  updatePauseButton();
  updateStatus("Game over. Press Start to try again.");
}

function togglePause() {
  if (!gameActive) {
    return;
  }
  paused = !paused;
  updatePauseButton();
  updateStatus(paused ? "Paused." : "Stay sharp!");
}

function step() {
  direction = pendingDirection;
  const nextHead = {
    row: snake[0].row + direction.row,
    column: snake[0].column + direction.column,
  };

  if (nextHead.row < 0 || nextHead.row >= rows || nextHead.column < 0 || nextHead.column >= columns) {
    endGame();
    return;
  }

  if (snake.some((segment) => segment.row === nextHead.row && segment.column === nextHead.column)) {
    endGame();
    return;
  }

  snake.unshift(nextHead);

  if (snack && nextHead.row === snack.row && nextHead.column === snack.column) {
    score += 10;
    if (score % 50 === 0) {
      speedLevel = Math.min(maxSpeed, speedLevel + 1);
    }
    placeSnack();
  } else {
    snake.pop();
  }
}

function update(time = 0) {
  const delta = time - lastTime;
  lastTime = time;

  if (gameActive && !paused) {
    accumulator += delta;
    const stepTime = 1000 / getSpeed();
    if (accumulator >= stepTime) {
      step();
      accumulator = 0;
    }
  }

  drawBoard();
  window.requestAnimationFrame(update);
}

resetButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
window.addEventListener("keydown", handleInput);
backButton.addEventListener("click", () => {
  window.location.href = "../index.html";
});

resetButton.textContent = "Start";
updateScoreboard();
updateStatus("Press Start to play.");
updatePauseButton();
placeSnack();
window.requestAnimationFrame(update);
