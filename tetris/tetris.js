const playfieldCanvas = document.getElementById("playfield");
const nextCanvas = document.getElementById("next");
const scoreElement = document.getElementById("score");
const linesElement = document.getElementById("lines");
const levelElement = document.getElementById("level");
const statusElement = document.getElementById("status");
const resetButton = document.getElementById("reset-game");
const pauseButton = document.getElementById("toggle-pause");
const backButton = document.getElementById("back-button");

const playfieldContext = playfieldCanvas.getContext("2d");
const nextContext = nextCanvas.getContext("2d");

const columns = 10;
const rows = 20;
const cellSize = playfieldCanvas.width / columns;
const nextCellSize = nextCanvas.width / 4;

const tetrominoes = {
  I: {
    color: "#4fc3f7",
    shape: [[1, 1, 1, 1]],
  },
  J: {
    color: "#5c6bc0",
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
  },
  L: {
    color: "#ffb74d",
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
  },
  O: {
    color: "#fff176",
    shape: [
      [1, 1],
      [1, 1],
    ],
  },
  S: {
    color: "#81c784",
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
  },
  T: {
    color: "#ba68c8",
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
  },
  Z: {
    color: "#e57373",
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
  },
};

const scoreTable = [0, 100, 300, 500, 800];

let board = [];
let currentPiece = null;
let nextPieceType = null;
let bag = [];
let score = 0;
let lines = 0;
let level = 1;
let dropInterval = 800;
let dropCounter = 0;
let lockCounter = 0;
let lastTime = 0;
let gameActive = false;
let paused = false;

const lockDelay = 500;

function createMatrix(height, width, value = null) {
  return Array.from({ length: height }, () => Array(width).fill(value));
}

function resetBoard() {
  board = createMatrix(rows, columns, null);
}

function shuffleBag(types) {
  const bagItems = [...types];
  for (let index = bagItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [bagItems[index], bagItems[swapIndex]] = [bagItems[swapIndex], bagItems[index]];
  }
  return bagItems;
}

function drawFromBag() {
  if (bag.length === 0) {
    bag = shuffleBag(Object.keys(tetrominoes));
  }
  return bag.pop();
}

function cloneShape(shape) {
  return shape.map((row) => [...row]);
}

function createPiece(type) {
  const { shape, color } = tetrominoes[type];
  const clonedShape = cloneShape(shape);
  return {
    type,
    shape: clonedShape,
    color,
    row: 0,
    column: Math.floor((columns - clonedShape[0].length) / 2),
  };
}

function spawnPiece() {
  if (!nextPieceType) {
    nextPieceType = drawFromBag();
  }
  currentPiece = createPiece(nextPieceType);
  nextPieceType = drawFromBag();
  if (hasCollision(currentPiece, 0, 0, currentPiece.shape)) {
    endGame();
  }
}

function rotateClockwise(matrix) {
  return matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
}

function hasCollision(piece, rowOffset, columnOffset, shape) {
  return shape.some((row, rowIndex) =>
    row.some((value, columnIndex) => {
      if (!value) {
        return false;
      }
      const nextRow = piece.row + rowIndex + rowOffset;
      const nextColumn = piece.column + columnIndex + columnOffset;
      if (nextColumn < 0 || nextColumn >= columns || nextRow >= rows) {
        return true;
      }
      if (nextRow < 0) {
        return false;
      }
      return board[nextRow][nextColumn];
    })
  );
}

function movePiece(rowOffset, columnOffset) {
  if (!currentPiece) {
    return false;
  }
  if (hasCollision(currentPiece, rowOffset, columnOffset, currentPiece.shape)) {
    return false;
  }
  currentPiece.row += rowOffset;
  currentPiece.column += columnOffset;
  lockCounter = 0;
  return true;
}

function rotatePiece() {
  if (!currentPiece) {
    return;
  }
  const rotated = rotateClockwise(currentPiece.shape);
  const kicks = [0, -1, 1, -2, 2];
  const validKick = kicks.find((offset) => !hasCollision(currentPiece, 0, offset, rotated));
  if (validKick === undefined) {
    return;
  }
  currentPiece.column += validKick;
  currentPiece.shape = rotated;
  lockCounter = 0;
}

function lockPiece() {
  currentPiece.shape.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (!value) {
        return;
      }
      const boardRow = currentPiece.row + rowIndex;
      const boardColumn = currentPiece.column + columnIndex;
      if (boardRow >= 0) {
        board[boardRow][boardColumn] = currentPiece.color;
      }
    });
  });
}

function clearLines() {
  let cleared = 0;
  for (let row = rows - 1; row >= 0; row -= 1) {
    if (board[row].every((cell) => cell)) {
      board.splice(row, 1);
      board.unshift(Array(columns).fill(null));
      cleared += 1;
      row += 1;
    }
  }
  if (cleared > 0) {
    lines += cleared;
    score += scoreTable[cleared] * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(120, 800 - (level - 1) * 60);
    updateScoreboard();
  }
}

function dropPiece(forceLock = false) {
  if (movePiece(1, 0)) {
    return;
  }

  if (forceLock) {
    lockPiece();
    clearLines();
    spawnPiece();
    lockCounter = 0;
    return;
  }

  lockCounter += dropInterval;
  if (lockCounter >= lockDelay) {
    lockPiece();
    clearLines();
    spawnPiece();
    lockCounter = 0;
  }
}

function hardDrop() {
  if (!currentPiece) {
    return;
  }
  let moved = 0;
  while (movePiece(1, 0)) {
    moved += 1;
  }
  if (moved > 0) {
    score += moved * 2;
    updateScoreboard();
  }
  dropPiece(true);
}

function drawCell(context, row, column, color, size) {
  const x = column * size;
  const y = row * size;
  context.fillStyle = color;
  context.fillRect(x, y, size, size);
  context.strokeStyle = "rgba(0, 0, 0, 0.3)";
  context.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
}

function drawBoard() {
  playfieldContext.clearRect(0, 0, playfieldCanvas.width, playfieldCanvas.height);
  board.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      if (cell) {
        drawCell(playfieldContext, rowIndex, columnIndex, cell, cellSize);
      }
    });
  });

  if (!currentPiece) {
    return;
  }
  currentPiece.shape.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (!value) {
        return;
      }
      const drawRow = currentPiece.row + rowIndex;
      const drawColumn = currentPiece.column + columnIndex;
      if (drawRow >= 0) {
        drawCell(playfieldContext, drawRow, drawColumn, currentPiece.color, cellSize);
      }
    });
  });
}

function drawNext() {
  nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!nextPieceType) {
    return;
  }
  const preview = createPiece(nextPieceType);
  const offsetRow = Math.floor((4 - preview.shape.length) / 2);
  const offsetColumn = Math.floor((4 - preview.shape[0].length) / 2);
  preview.shape.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (!value) {
        return;
      }
      drawCell(
        nextContext,
        rowIndex + offsetRow,
        columnIndex + offsetColumn,
        preview.color,
        nextCellSize
      );
    });
  });
}

function updateScoreboard() {
  scoreElement.textContent = score;
  linesElement.textContent = lines;
  levelElement.textContent = level;
}

function updateStatus(message) {
  statusElement.textContent = message;
}

function updatePauseButton() {
  pauseButton.textContent = paused ? "Resume" : "Pause";
}

function startGame() {
  resetBoard();
  bag = [];
  nextPieceType = null;
  score = 0;
  lines = 0;
  level = 1;
  dropInterval = 800;
  dropCounter = 0;
  lockCounter = 0;
  lastTime = 0;
  gameActive = true;
  paused = false;
  resetButton.textContent = "Reset";
  updatePauseButton();
  updateScoreboard();
  updateStatus("Good luck!");
  spawnPiece();
}

function endGame() {
  gameActive = false;
  paused = false;
  resetButton.textContent = "Reset";
  updatePauseButton();
  updateStatus("Game over. Press Reset to try again.");
}

function togglePause() {
  if (!gameActive) {
    return;
  }
  paused = !paused;
  updatePauseButton();
  updateStatus(paused ? "Paused." : "Good luck!");
}

function handleInput(event) {
  const { code } = event;
  const movementKeys = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowDown",
    "ArrowUp",
    "Space",
    "KeyA",
    "KeyD",
    "KeyS",
    "KeyW",
  ];

  if (movementKeys.includes(code)) {
    event.preventDefault();
  }

  if (code === "KeyP") {
    togglePause();
    return;
  }

  if (!gameActive) {
    if (code === "Enter") {
      startGame();
    }
    return;
  }

  if (!gameActive || paused) {
    return;
  }

  switch (code) {
    case "ArrowLeft":
    case "KeyA":
      movePiece(0, -1);
      break;
    case "ArrowRight":
    case "KeyD":
      movePiece(0, 1);
      break;
    case "ArrowDown":
    case "KeyS":
      dropPiece();
      dropCounter = 0;
      break;
    case "ArrowUp":
    case "KeyW":
      rotatePiece();
      break;
    case "Space":
      hardDrop();
      dropCounter = 0;
      break;
    default:
      break;
  }
}

function update(time = 0) {
  const delta = time - lastTime;
  lastTime = time;
  if (gameActive && !paused) {
    dropCounter += delta;
    if (dropCounter >= dropInterval) {
      dropPiece();
      dropCounter = 0;
    } else if (currentPiece && hasCollision(currentPiece, 1, 0, currentPiece.shape)) {
      lockCounter += delta;
      if (lockCounter >= lockDelay) {
        lockPiece();
        clearLines();
        spawnPiece();
        lockCounter = 0;
      }
    } else {
      lockCounter = 0;
    }
  }
  drawBoard();
  drawNext();
  window.requestAnimationFrame(update);
}

resetButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
window.addEventListener("keydown", handleInput);
backButton.addEventListener("click", () => {
  window.location.href = "../index.html";
});

resetBoard();
currentPiece = null;
nextPieceType = null;
updateScoreboard();
updateStatus("Press Start to play.");
updatePauseButton();
window.requestAnimationFrame(update);
