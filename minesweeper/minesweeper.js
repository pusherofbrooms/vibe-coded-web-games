const gridElement = document.querySelector(".grid");
const mineCountElement = document.getElementById("mine-count");
const timerElement = document.getElementById("timer");
const statusElement = document.getElementById("status");
const resetButton = document.getElementById("reset-game");
const toggleFlagButton = document.getElementById("toggle-flag");
const hintButton = document.getElementById("reveal-safe");
const backButton = document.getElementById("back-button");
const difficultyButtons = document.querySelectorAll("[data-difficulty]");

const difficultySettings = {
  beginner: { rows: 9, columns: 9, mines: 10 },
  intermediate: { rows: 16, columns: 16, mines: 40 },
  expert: { rows: 16, columns: 30, mines: 99 },
};

const numberColors = {
  1: "#2141c6",
  2: "#007b1d",
  3: "#b21f2d",
  4: "#1b2a4a",
  5: "#7a1a1a",
  6: "#0f6b6b",
  7: "#2b2b2b",
  8: "#6b7382",
};

let rows = difficultySettings.intermediate.rows;
let columns = difficultySettings.intermediate.columns;
let mines = difficultySettings.intermediate.mines;
let mineField = [];
let revealed = [];
let flagged = [];
let gameStarted = false;
let gameOver = false;
let timerId = null;
let seconds = 0;
let flagsRemaining = mines;
let flagMode = false;
let firstClick = true;

function createMatrix(value) {
  return Array.from({ length: rows }, () => Array(columns).fill(value));
}

function buildGrid() {
  gridElement.innerHTML = "";
  gridElement.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
  const fragment = document.createDocumentFragment();

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.column = column;
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", "Hidden cell");
      fragment.appendChild(cell);
    }
  }

  gridElement.appendChild(fragment);
}

function updateMineCount() {
  mineCountElement.textContent = flagsRemaining;
}

function updateTimer() {
  timerElement.textContent = seconds;
}

function updateStatus(message) {
  statusElement.textContent = message;
}

function resetTimer() {
  if (timerId) {
    clearInterval(timerId);
  }
  seconds = 0;
  updateTimer();
  timerId = null;
}

function startTimer() {
  if (timerId) {
    return;
  }

  timerId = window.setInterval(() => {
    seconds += 1;
    updateTimer();
  }, 1000);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function isValidCell(row, column) {
  return row >= 0 && row < rows && column >= 0 && column < columns;
}

function getNeighborPositions(row, column) {
  const positions = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) {
        continue;
      }
      const nextRow = row + rowOffset;
      const nextColumn = column + columnOffset;
      if (isValidCell(nextRow, nextColumn)) {
        positions.push([nextRow, nextColumn]);
      }
    }
  }
  return positions;
}

function placeMines(startRow, startColumn) {
  mineField = createMatrix(false);
  let placed = 0;
  while (placed < mines) {
    const row = Math.floor(Math.random() * rows);
    const column = Math.floor(Math.random() * columns);
    if (mineField[row][column]) {
      continue;
    }
    if (Math.abs(row - startRow) <= 1 && Math.abs(column - startColumn) <= 1) {
      continue;
    }
    mineField[row][column] = true;
    placed += 1;
  }
}

function countNeighborMines(row, column) {
  return getNeighborPositions(row, column).reduce((total, [r, c]) => {
    if (mineField[r][c]) {
      return total + 1;
    }
    return total;
  }, 0);
}

function revealCell(row, column) {
  if (gameOver || flagged[row][column]) {
    return;
  }

  const cellElement = getCellElement(row, column);
  if (!cellElement || revealed[row][column]) {
    return;
  }

  revealed[row][column] = true;
  cellElement.classList.add("revealed");
  cellElement.setAttribute("aria-label", "Revealed cell");

  if (mineField[row][column]) {
    cellElement.classList.add("exploded");
    cellElement.textContent = "💥";
    gameOver = true;
    revealAllMines();
    stopTimer();
    resetButton.textContent = "😵";
    updateStatus("Boom! You hit a mine.");
    return;
  }

  const neighborMines = countNeighborMines(row, column);
  if (neighborMines > 0) {
    cellElement.textContent = neighborMines;
    cellElement.style.color = numberColors[neighborMines];
  } else {
    cellElement.textContent = "";
    getNeighborPositions(row, column).forEach(([r, c]) => {
      if (!revealed[r][c]) {
        revealCell(r, c);
      }
    });
  }

  if (checkWin()) {
    handleWin();
  }
}

function revealAllMines() {
  mineField.forEach((rowData, row) => {
    rowData.forEach((hasMine, column) => {
      const cellElement = getCellElement(row, column);
      if (!cellElement) {
        return;
      }
      if (hasMine) {
        cellElement.classList.add("mine");
        if (!cellElement.classList.contains("exploded")) {
          cellElement.textContent = "💣";
        }
      } else if (flagged[row][column]) {
        cellElement.textContent = "❌";
      }
    });
  });
}

function toggleFlag(row, column) {
  if (gameOver || revealed[row][column]) {
    return;
  }

  flagged[row][column] = !flagged[row][column];
  const cellElement = getCellElement(row, column);
  if (!cellElement) {
    return;
  }

  if (flagged[row][column]) {
    cellElement.classList.add("flagged");
    cellElement.textContent = "🚩";
    cellElement.setAttribute("aria-label", "Flagged cell");
    flagsRemaining = Math.max(0, flagsRemaining - 1);
  } else {
    cellElement.classList.remove("flagged");
    cellElement.textContent = "";
    cellElement.setAttribute("aria-label", "Hidden cell");
    flagsRemaining += 1;
  }

  updateMineCount();
}

function getCellElement(row, column) {
  return gridElement.querySelector(`[data-row="${row}"][data-column="${column}"]`);
}

function handleCellAction(row, column) {
  if (gameOver) {
    return;
  }

  if (firstClick) {
    placeMines(row, column);
    firstClick = false;
    gameStarted = true;
    startTimer();
  }

  if (flagMode) {
    toggleFlag(row, column);
  } else {
    revealCell(row, column);
  }
}

function handleGridClick(event) {
  const cell = event.target;
  if (!(cell instanceof HTMLButtonElement)) {
    return;
  }

  const row = Number(cell.dataset.row);
  const column = Number(cell.dataset.column);
  handleCellAction(row, column);
}

function handleGridRightClick(event) {
  event.preventDefault();
  const cell = event.target;
  if (!(cell instanceof HTMLButtonElement)) {
    return;
  }

  const row = Number(cell.dataset.row);
  const column = Number(cell.dataset.column);
  toggleFlag(row, column);
}

function checkWin() {
  let revealedCount = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (revealed[row][column]) {
        revealedCount += 1;
      }
    }
  }
  return revealedCount === rows * columns - mines;
}

function revealWinFlags() {
  mineField.forEach((rowData, row) => {
    rowData.forEach((hasMine, column) => {
      if (!hasMine) {
        return;
      }
      flagged[row][column] = true;
      const cellElement = getCellElement(row, column);
      if (!cellElement) {
        return;
      }
      cellElement.classList.add("flagged");
      cellElement.textContent = "🚩";
      cellElement.setAttribute("aria-label", "Flagged cell");
      cellElement.disabled = true;
    });
  });
  flagsRemaining = 0;
  updateMineCount();
}

function handleWin() {
  gameOver = true;
  stopTimer();
  resetButton.textContent = "😎";
  updateStatus("You cleared the field!");
  revealWinFlags();
}

function updateFlagModeDisplay() {
  toggleFlagButton.textContent = flagMode ? "Reveal Mode" : "Flag Mode";
}

function handleReset() {
  mineField = createMatrix(false);
  revealed = createMatrix(false);
  flagged = createMatrix(false);
  gameOver = false;
  gameStarted = false;
  firstClick = true;
  flagsRemaining = mines;
  updateMineCount();
  resetTimer();
  updateStatus("Click a square to start.");
  resetButton.textContent = "🙂";
  updateFlagModeDisplay();
  buildGrid();
}

function switchDifficulty(level) {
  const settings = difficultySettings[level];
  if (!settings) {
    return;
  }

  rows = settings.rows;
  columns = settings.columns;
  mines = settings.mines;
  flagsRemaining = mines;
  handleReset();
}

function revealSafeCell() {
  if (gameOver || !gameStarted) {
    return;
  }

  const safeCells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (!revealed[row][column] && !flagged[row][column] && !mineField[row][column]) {
        safeCells.push([row, column]);
      }
    }
  }

  if (safeCells.length === 0) {
    return;
  }

  const [row, column] = safeCells[Math.floor(Math.random() * safeCells.length)];
  revealCell(row, column);
}

function initialize() {
  buildGrid();
  mineField = createMatrix(false);
  revealed = createMatrix(false);
  flagged = createMatrix(false);
  updateMineCount();
  updateTimer();
  updateStatus("Click a square to start.");
  updateFlagModeDisplay();
}

gridElement.addEventListener("click", handleGridClick);

gridElement.addEventListener("contextmenu", handleGridRightClick);

resetButton.addEventListener("click", handleReset);

toggleFlagButton.addEventListener("click", () => {
  flagMode = !flagMode;
  updateFlagModeDisplay();
});

hintButton.addEventListener("click", revealSafeCell);

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => switchDifficulty(button.dataset.difficulty));
});

backButton.addEventListener("click", () => {
  window.location.href = "../index.html";
});

initialize();
