const gridElement = document.querySelector(".board__grid");
const statusElement = document.getElementById("status");
const toggleButton = document.getElementById("toggle-run");
const stepButton = document.getElementById("step-once");
const clearButton = document.getElementById("clear-grid");
const speedControl = document.getElementById("speed");
const backButton = document.getElementById("back-button");
const patternButtons = document.querySelectorAll("[data-pattern]");

const defaultGridSize = 24;
let gridSize = defaultGridSize;
let running = false;
let timerId = null;
let cells = createEmptyGrid(gridSize);

const patterns = {
  glider: [
    [1, 0],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
  pulsar: [
    [2, 0],
    [3, 0],
    [4, 0],
    [8, 0],
    [9, 0],
    [10, 0],
    [0, 2],
    [5, 2],
    [7, 2],
    [12, 2],
    [0, 3],
    [5, 3],
    [7, 3],
    [12, 3],
    [0, 4],
    [5, 4],
    [7, 4],
    [12, 4],
    [2, 5],
    [3, 5],
    [4, 5],
    [8, 5],
    [9, 5],
    [10, 5],
    [2, 7],
    [3, 7],
    [4, 7],
    [8, 7],
    [9, 7],
    [10, 7],
    [0, 8],
    [5, 8],
    [7, 8],
    [12, 8],
    [0, 9],
    [5, 9],
    [7, 9],
    [12, 9],
    [0, 10],
    [5, 10],
    [7, 10],
    [12, 10],
    [2, 12],
    [3, 12],
    [4, 12],
    [8, 12],
    [9, 12],
    [10, 12],
  ],
  lwss: [
    [1, 0],
    [4, 0],
    [0, 1],
    [0, 2],
    [4, 2],
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
  ],
};

function createEmptyGrid(size) {
  return Array.from({ length: size }, () => Array(size).fill(false));
}

function buildGridElements(size) {
  gridElement.innerHTML = "";
  gridElement.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  const fragment = document.createDocumentFragment();

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.column = column;
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-pressed", "false");
      fragment.appendChild(cell);
    }
  }

  gridElement.appendChild(fragment);
}

function renderGrid() {
  const cellElements = gridElement.querySelectorAll(".cell");
  cellElements.forEach((cellElement) => {
    const row = Number(cellElement.dataset.row);
    const column = Number(cellElement.dataset.column);
    const alive = cells[row][column];
    cellElement.classList.toggle("is-alive", alive);
    cellElement.setAttribute("aria-pressed", alive ? "true" : "false");
  });
}

function countLivingCells() {
  return cells.reduce(
    (total, row) => total + row.filter(Boolean).length,
    0,
  );
}

function updateStatus() {
  const living = countLivingCells();
  const stateLabel = running ? "Running" : "Paused";
  statusElement.textContent = `${stateLabel} · ${living} living cells`;
}

function countNeighbors(row, column) {
  let count = 0;

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) {
        continue;
      }

      const rowIndex = (row + rowOffset + gridSize) % gridSize;
      const columnIndex = (column + columnOffset + gridSize) % gridSize;
      if (cells[rowIndex][columnIndex]) {
        count += 1;
      }
    }
  }

  return count;
}

function nextGeneration() {
  const next = createEmptyGrid(gridSize);

  for (let row = 0; row < gridSize; row += 1) {
    for (let column = 0; column < gridSize; column += 1) {
      const neighbors = countNeighbors(row, column);
      if (cells[row][column]) {
        next[row][column] = neighbors === 2 || neighbors === 3;
      } else {
        next[row][column] = neighbors === 3;
      }
    }
  }

  cells = next;
  renderGrid();
  updateStatus();
}

function setRunning(nextState) {
  running = nextState;
  toggleButton.textContent = running ? "Pause" : "Start";
  updateStatus();

  if (running) {
    scheduleTick();
  } else if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
}

function scheduleTick() {
  if (!running) {
    return;
  }

  timerId = window.setTimeout(() => {
    nextGeneration();
    scheduleTick();
  }, Number(speedControl.value));
}

function handleCellClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const row = Number(target.dataset.row);
  const column = Number(target.dataset.column);
  cells[row][column] = !cells[row][column];
  renderGrid();
  updateStatus();
}

function handleStep() {
  if (running) {
    setRunning(false);
  }
  nextGeneration();
}

function clearGrid() {
  cells = createEmptyGrid(gridSize);
  renderGrid();
  updateStatus();
}

function applyPattern(patternKey) {
  const pattern = patterns[patternKey];
  if (!pattern) {
    return;
  }

  const offset = Math.floor((gridSize - 13) / 2);
  const nextGrid = createEmptyGrid(gridSize);

  pattern.forEach(([x, y]) => {
    const row = (y + offset + gridSize) % gridSize;
    const column = (x + offset + gridSize) % gridSize;
    nextGrid[row][column] = true;
  });

  cells = nextGrid;
  renderGrid();
  updateStatus();
}

function handleResize() {
  const nextSize = window.matchMedia("(max-width: 640px)").matches ? 16 : defaultGridSize;
  if (nextSize === gridSize) {
    return;
  }

  gridSize = nextSize;
  cells = createEmptyGrid(gridSize);
  buildGridElements(gridSize);
  renderGrid();
  updateStatus();
}

function initialize() {
  buildGridElements(gridSize);
  renderGrid();
  updateStatus();
}

gridElement.addEventListener("click", handleCellClick);

toggleButton.addEventListener("click", () => {
  setRunning(!running);
});

stepButton.addEventListener("click", handleStep);
clearButton.addEventListener("click", clearGrid);

speedControl.addEventListener("input", () => {
  if (running) {
    clearTimeout(timerId);
    scheduleTick();
  }
});

patternButtons.forEach((button) => {
  button.addEventListener("click", () => applyPattern(button.dataset.pattern));
});

backButton.addEventListener("click", () => {
  window.location.href = "../index.html";
});

window.addEventListener("resize", handleResize);

initialize();
