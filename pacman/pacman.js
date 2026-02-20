const canvas = document.getElementById("pacman-canvas");
const scoreElement = document.getElementById("score");
const livesElement = document.getElementById("lives");
const levelElement = document.getElementById("level");
const pelletsElement = document.getElementById("pellets");
const statusElement = document.getElementById("status");
const resetButton = document.getElementById("reset-game");
const pauseButton = document.getElementById("toggle-pause");
const backButton = document.getElementById("back-button");
const touchButtons = document.querySelectorAll(".touch-controls button");

const context = canvas.getContext("2d");

const tileSize = 30;
const mapRows = [
  "###################",
  "#o.......#.......o#",
  "#.###.##.#.##.###.#",
  "#.................#",
  "#.###.#.###.#.###.#",
  "#.....#...#.#.....#",
  "###.#.###.#.###.#.#",
  "#...#.....#.....#.#",
  "#.#####.#...#.###.#",
  "#.......##.##.....#",
  ".........#.........",
  "#.#####.#...#.###.#",
  "#...#.....#.....#.#",
  "###.#.###.#.###.#.#",
  "#.....#...#.#.....#",
  "#.###.#.###.#.###.#",
  "#.................#",
  "#.###.##.#.##.###.#",
  "#o..#....#....#..o#",
  "#.................#",
  "###################",
];

const mapHeight = mapRows.length;
const mapWidth = mapRows[0].length;
canvas.width = mapWidth * tileSize;
canvas.height = mapHeight * tileSize;

const directionByCode = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

const touchDirectionByAction = {
  up: directionByCode.ArrowUp,
  down: directionByCode.ArrowDown,
  left: directionByCode.ArrowLeft,
  right: directionByCode.ArrowRight,
};

const ghostPalette = ["#ff4d6d", "#55d6ff", "#ffb347", "#b07dff"];
const ghostStartTiles = [
  { x: 9, y: 9 },
  { x: 8, y: 10 },
  { x: 10, y: 10 },
  { x: 9, y: 11 },
];

const baseMoveInterval = {
  player: 130,
  ghost: 175,
};

const centerTolerance = 0.08;
const stepLimitTiles = 0.18;

const state = {
  level: 1,
  score: 0,
  lives: 3,
  pelletsRemaining: 0,
  running: false,
  paused: false,
  gameOver: false,
  board: [],
  player: {
    x: 9,
    y: 16,
    direction: { x: 0, y: 0 },
    pendingDirection: { x: 0, y: 0 },
  },
  ghosts: [],
  powerModeTimer: 0,
  ghostCombo: 0,
  levelTransitionTimer: 0,
  hitPauseTimer: 0,
  mouthPhase: 0,
};

function cloneDirection(direction) {
  return { x: direction.x, y: direction.y };
}

function copyBoardTemplate() {
  return mapRows.map((row) => row.split(""));
}

function wrapX(x) {
  if (x < 0) {
    return mapWidth - 1;
  }
  if (x >= mapWidth) {
    return 0;
  }
  return x;
}

function wrapFloatX(x) {
  if (x < -0.5) {
    return x + mapWidth;
  }
  if (x > mapWidth - 0.5) {
    return x - mapWidth;
  }
  return x;
}

function toTileX(x) {
  return wrapX(Math.round(x));
}

function toTileY(y) {
  return Math.round(y);
}

function cellAt(x, y) {
  if (y < 0 || y >= mapHeight) {
    return "#";
  }
  return state.board[y][wrapX(x)];
}

function isWall(x, y) {
  return cellAt(x, y) === "#";
}

function canMoveFromTile(tileX, tileY, direction) {
  if (direction.x === 0 && direction.y === 0) {
    return false;
  }
  const nextX = wrapX(tileX + direction.x);
  const nextY = tileY + direction.y;
  return !isWall(nextX, nextY);
}

function canMove(x, y, direction) {
  return canMoveFromTile(toTileX(x), toTileY(y), direction);
}

function getMoveInterval(entityType) {
  const baseInterval = baseMoveInterval[entityType];
  const speedBoost = (state.level - 1) * (entityType === "player" ? 6 : 5);
  return Math.max(entityType === "player" ? 70 : 90, baseInterval - speedBoost);
}

function createGhost(index) {
  const start = ghostStartTiles[index];
  return {
    x: start.x,
    y: start.y,
    startX: start.x,
    startY: start.y,
    direction: index % 2 === 0 ? { x: -1, y: 0 } : { x: 1, y: 0 },
    frozenTimer: 0,
    color: ghostPalette[index],
  };
}

function snapToAxis(entity) {
  if (entity.direction.x !== 0) {
    const targetY = Math.round(entity.y);
    if (Math.abs(entity.y - targetY) <= centerTolerance) {
      entity.y = targetY;
    }
  }
  if (entity.direction.y !== 0) {
    const targetX = Math.round(entity.x);
    if (Math.abs(entity.x - targetX) <= centerTolerance) {
      entity.x = targetX;
    }
  }
}

function isNearTileCenter(entity) {
  return (
    Math.abs(entity.x - Math.round(entity.x)) <= centerTolerance &&
    Math.abs(entity.y - Math.round(entity.y)) <= centerTolerance
  );
}

function moveOneStep(entity, amount) {
  if (entity.direction.x === 0 && entity.direction.y === 0) {
    return false;
  }

  const tileX = toTileX(entity.x);
  const tileY = toTileY(entity.y);

  if (entity.direction.x !== 0) {
    const boundary = tileX + 0.5 * entity.direction.x;
    const nextX = entity.x + amount * entity.direction.x;
    const crossingRight = entity.direction.x === 1 && entity.x < boundary && nextX > boundary;
    const crossingLeft = entity.direction.x === -1 && entity.x > boundary && nextX < boundary;
    if ((crossingRight || crossingLeft) && !canMoveFromTile(tileX, tileY, entity.direction)) {
      entity.x = boundary - entity.direction.x * 0.001;
      return false;
    }
  }

  if (entity.direction.y !== 0) {
    const boundary = tileY + 0.5 * entity.direction.y;
    const nextY = entity.y + amount * entity.direction.y;
    const crossingDown = entity.direction.y === 1 && entity.y < boundary && nextY > boundary;
    const crossingUp = entity.direction.y === -1 && entity.y > boundary && nextY < boundary;
    if ((crossingDown || crossingUp) && !canMoveFromTile(tileX, tileY, entity.direction)) {
      entity.y = boundary - entity.direction.y * 0.001;
      return false;
    }
  }

  entity.x += entity.direction.x * amount;
  entity.y += entity.direction.y * amount;
  entity.x = wrapFloatX(entity.x);
  snapToAxis(entity);
  return true;
}

function resetCharacters() {
  state.player.x = 9;
  state.player.y = 16;
  state.player.direction = { x: 0, y: 0 };
  state.player.pendingDirection = { x: 0, y: 0 };
  state.ghosts = ghostPalette.map((_, index) => createGhost(index));
}

function resetBoardForLevel() {
  state.board = copyBoardTemplate();
  state.pelletsRemaining = 0;
  for (let y = 0; y < mapHeight; y += 1) {
    for (let x = 0; x < mapWidth; x += 1) {
      const tile = state.board[y][x];
      if (tile === "." || tile === "o") {
        state.pelletsRemaining += 1;
      }
    }
  }
  const spawnX = 9;
  const spawnY = 16;
  if (state.board[spawnY][spawnX] === "." || state.board[spawnY][spawnX] === "o") {
    state.board[spawnY][spawnX] = " ";
    state.pelletsRemaining -= 1;
  }
}

function resetRound() {
  resetCharacters();
  state.powerModeTimer = 0;
  state.ghostCombo = 0;
  state.hitPauseTimer = 0;
}

function startNewGame() {
  state.level = 1;
  state.score = 0;
  state.lives = 3;
  state.gameOver = false;
  state.levelTransitionTimer = 0;
  resetBoardForLevel();
  resetRound();
  state.running = true;
  state.paused = false;
  resetButton.textContent = "Reset";
  updateStatus("Clear the maze!");
  updatePauseButton();
  updateScoreboard();
}

function updateStatus(message) {
  statusElement.textContent = message;
}

function updatePauseButton() {
  pauseButton.textContent = state.paused ? "Resume" : "Pause";
}

function updateScoreboard() {
  scoreElement.textContent = state.score;
  livesElement.textContent = state.lives;
  levelElement.textContent = state.level;
  pelletsElement.textContent = state.pelletsRemaining;
}

function setRequestedDirection(direction) {
  state.player.pendingDirection = cloneDirection(direction);
}

function consumeTile() {
  const tileX = toTileX(state.player.x);
  const tileY = toTileY(state.player.y);
  const tile = cellAt(tileX, tileY);
  if (tile !== "." && tile !== "o") {
    return;
  }

  state.board[tileY][tileX] = " ";
  state.pelletsRemaining -= 1;
  state.score += tile === "o" ? 50 : 10;

  if (tile === "o") {
    state.powerModeTimer = 7000;
    state.ghostCombo = 0;
    updateStatus("Power up! Hunt ghosts.");
  }

  if (state.pelletsRemaining <= 0) {
    state.level += 1;
    state.score += 200;
    state.levelTransitionTimer = 1600;
    updateStatus("Level clear!");
  }
}

function movePlayer(deltaTime) {
  const player = state.player;
  let remainingTiles = deltaTime / getMoveInterval("player");

  while (remainingTiles > 0) {
    const stepTiles = Math.min(stepLimitTiles, remainingTiles);

    if (isNearTileCenter(player)) {
      player.x = Math.round(player.x);
      player.y = Math.round(player.y);
      if (canMove(player.x, player.y, player.pendingDirection)) {
        player.direction = cloneDirection(player.pendingDirection);
      }
      if (!canMove(player.x, player.y, player.direction)) {
        player.direction = { x: 0, y: 0 };
      }
    }

    if (player.direction.x === 0 && player.direction.y === 0) {
      break;
    }

    const moved = moveOneStep(player, stepTiles);
    if (!moved) {
      player.direction = { x: 0, y: 0 };
      break;
    }

    if (isNearTileCenter(player)) {
      player.x = Math.round(player.x);
      player.y = Math.round(player.y);
      consumeTile();
      if (state.levelTransitionTimer > 0) {
        break;
      }
    }

    remainingTiles -= stepTiles;
  }
}

function opposite(direction) {
  return { x: -direction.x, y: -direction.y };
}

function isSameDirection(a, b) {
  return a.x === b.x && a.y === b.y;
}

function getAvailableDirections(entity) {
  const allDirections = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  const tileX = toTileX(entity.x);
  const tileY = toTileY(entity.y);
  return allDirections.filter((candidate) => canMoveFromTile(tileX, tileY, candidate));
}

function chooseGhostDirection(ghost) {
  const options = getAvailableDirections(ghost);
  if (options.length === 0) {
    return { x: 0, y: 0 };
  }

  const reverse = opposite(ghost.direction);
  const filtered = options.filter((candidate) => !isSameDirection(candidate, reverse));
  const candidates = filtered.length > 0 ? filtered : options;

  if (state.powerModeTimer > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  const playerTile = { x: toTileX(state.player.x), y: toTileY(state.player.y) };
  const ghostTile = { x: toTileX(ghost.x), y: toTileY(ghost.y) };

  const weighted = candidates
    .map((candidate) => {
      const nextX = wrapX(ghostTile.x + candidate.x);
      const nextY = ghostTile.y + candidate.y;
      const dx = Math.abs(playerTile.x - nextX);
      const wrapDx = mapWidth - dx;
      const distance = Math.min(dx, wrapDx) + Math.abs(playerTile.y - nextY);
      return { candidate, score: distance + Math.random() * 1.5 };
    })
    .sort((a, b) => a.score - b.score);

  return weighted[0].candidate;
}

function moveGhosts(deltaTime) {
  for (const ghost of state.ghosts) {
    if (ghost.frozenTimer > 0) {
      ghost.frozenTimer = Math.max(0, ghost.frozenTimer - deltaTime);
      continue;
    }

    let remainingTiles = deltaTime / getMoveInterval("ghost");
    while (remainingTiles > 0) {
      const stepTiles = Math.min(stepLimitTiles, remainingTiles);

      if (isNearTileCenter(ghost)) {
        ghost.x = Math.round(ghost.x);
        ghost.y = Math.round(ghost.y);
        ghost.direction = chooseGhostDirection(ghost);
      }

      const moved = moveOneStep(ghost, stepTiles);
      if (!moved) {
        ghost.direction = chooseGhostDirection(ghost);
        break;
      }

      remainingTiles -= stepTiles;
    }
  }
}

function handleGhostCollision(ghost) {
  if (state.powerModeTimer > 0) {
    state.ghostCombo += 1;
    state.score += 200 * state.ghostCombo;
    ghost.x = ghost.startX;
    ghost.y = ghost.startY;
    ghost.direction = { x: 0, y: 0 };
    ghost.frozenTimer = 900;
    updateStatus(`Ghost eaten! +${200 * state.ghostCombo}`);
    return;
  }

  state.lives -= 1;
  if (state.lives <= 0) {
    state.running = false;
    state.gameOver = true;
    resetButton.textContent = "Start";
    updateStatus("Game over. Press Start to play again.");
    updatePauseButton();
    return;
  }

  resetRound();
  state.hitPauseTimer = 900;
  updateStatus(`Caught! ${state.lives} lives left.`);
}

function checkCollisions() {
  const playerX = state.player.x;
  const playerY = state.player.y;
  for (const ghost of state.ghosts) {
    const dxRaw = Math.abs(playerX - ghost.x);
    const dx = Math.min(dxRaw, mapWidth - dxRaw);
    const dy = Math.abs(playerY - ghost.y);
    if (dx < 0.45 && dy < 0.45) {
      handleGhostCollision(ghost);
      break;
    }
  }
}

function stepGame(deltaTime) {
  if (state.levelTransitionTimer > 0) {
    state.levelTransitionTimer = Math.max(0, state.levelTransitionTimer - deltaTime);
    if (state.levelTransitionTimer === 0) {
      resetBoardForLevel();
      resetRound();
      updateStatus(`Level ${state.level}`);
    }
    return;
  }

  if (state.hitPauseTimer > 0) {
    state.hitPauseTimer = Math.max(0, state.hitPauseTimer - deltaTime);
    return;
  }

  if (state.powerModeTimer > 0) {
    state.powerModeTimer = Math.max(0, state.powerModeTimer - deltaTime);
    if (state.powerModeTimer === 0) {
      state.ghostCombo = 0;
      updateStatus("Power down. Stay away from ghosts.");
    }
  }

  movePlayer(deltaTime);
  checkCollisions();

  if (!state.running || state.gameOver || state.levelTransitionTimer > 0) {
    return;
  }

  moveGhosts(deltaTime);
  checkCollisions();
}

function drawWall(x, y) {
  const px = x * tileSize;
  const py = y * tileSize;
  context.fillStyle = "#173f91";
  context.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
  context.strokeStyle = "#7fa6ff";
  context.lineWidth = 2;
  context.strokeRect(px + 3, py + 3, tileSize - 6, tileSize - 6);
}

function drawPellet(x, y, tile) {
  const centerX = x * tileSize + tileSize / 2;
  const centerY = y * tileSize + tileSize / 2;
  const flicker = 0.8 + Math.sin(state.mouthPhase * 8) * 0.2;
  const radius = tile === "o" ? 5 + flicker : 2;
  context.fillStyle = tile === "o" ? "#ffe599" : "#f4f7ff";
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();
}

function drawPlayer() {
  const centerX = state.player.x * tileSize + tileSize / 2;
  const centerY = state.player.y * tileSize + tileSize / 2;
  const direction = state.player.direction;
  let angle = 0;
  if (direction.x === -1) {
    angle = Math.PI;
  } else if (direction.y === -1) {
    angle = -Math.PI / 2;
  } else if (direction.y === 1) {
    angle = Math.PI / 2;
  }

  const mouth = 0.2 + Math.abs(Math.sin(state.mouthPhase * 7)) * 0.35;
  context.fillStyle = "#ffd53f";
  context.beginPath();
  context.moveTo(centerX, centerY);
  context.arc(centerX, centerY, tileSize * 0.42, angle + mouth, angle - mouth + Math.PI * 2, false);
  context.closePath();
  context.fill();
}

function drawGhost(ghost) {
  const px = ghost.x * tileSize;
  const py = ghost.y * tileSize;
  const frightened = state.powerModeTimer > 0;
  const bodyColor = frightened ? "#3462d6" : ghost.color;
  context.fillStyle = bodyColor;

  context.beginPath();
  context.moveTo(px + 4, py + tileSize - 4);
  context.lineTo(px + 4, py + tileSize * 0.58);
  context.arc(px + tileSize / 2, py + tileSize * 0.58, tileSize * 0.36, Math.PI, 0, false);
  context.lineTo(px + tileSize - 4, py + tileSize - 4);
  context.lineTo(px + tileSize - 9, py + tileSize - 9);
  context.lineTo(px + tileSize - 14, py + tileSize - 4);
  context.lineTo(px + tileSize - 19, py + tileSize - 9);
  context.lineTo(px + tileSize - 24, py + tileSize - 4);
  context.lineTo(px + 9, py + tileSize - 9);
  context.closePath();
  context.fill();

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(px + tileSize * 0.38, py + tileSize * 0.56, 4.2, 0, Math.PI * 2);
  context.arc(px + tileSize * 0.62, py + tileSize * 0.56, 4.2, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = frightened ? "#d7ecff" : "#1f2d54";
  const eyeShiftX = ghost.direction.x * 1.4;
  const eyeShiftY = ghost.direction.y * 1.4;
  context.beginPath();
  context.arc(px + tileSize * 0.38 + eyeShiftX, py + tileSize * 0.56 + eyeShiftY, 2.1, 0, Math.PI * 2);
  context.arc(px + tileSize * 0.62 + eyeShiftX, py + tileSize * 0.56 + eyeShiftY, 2.1, 0, Math.PI * 2);
  context.fill();
}

function drawOverlay() {
  if (state.running && !state.paused && !state.gameOver) {
    return;
  }

  context.fillStyle = "rgba(8, 12, 24, 0.58)";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.textAlign = "center";
  context.fillStyle = "#f2f6ff";
  context.font = "bold 32px Tahoma";

  let title = "Ready";
  let subtitle = "Press Start or Space";
  if (state.gameOver) {
    title = "Game Over";
    subtitle = "Press Start to try again";
  } else if (state.paused) {
    title = "Paused";
    subtitle = "Press P or Resume";
  }

  context.fillText(title, canvas.width / 2, canvas.height / 2 - 8);
  context.font = "18px Tahoma";
  context.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 28);
}

function render() {
  context.fillStyle = "#0e1530";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < mapHeight; y += 1) {
    for (let x = 0; x < mapWidth; x += 1) {
      const tile = state.board[y][x];
      if (tile === "#") {
        drawWall(x, y);
      } else if (tile === "." || tile === "o") {
        drawPellet(x, y, tile);
      }
    }
  }

  drawPlayer();
  state.ghosts.forEach((ghost) => drawGhost(ghost));

  if (state.levelTransitionTimer > 0) {
    context.textAlign = "center";
    context.fillStyle = "#ffe083";
    context.font = "bold 30px Tahoma";
    context.fillText("Level Clear", canvas.width / 2, canvas.height / 2);
  }

  drawOverlay();
}

let lastFrame = 0;
function tick(frameTime = 0) {
  const deltaTime = Math.min(48, frameTime - lastFrame || 16);
  lastFrame = frameTime;

  if (state.running && !state.paused && !state.gameOver) {
    stepGame(deltaTime);
  }

  state.mouthPhase += deltaTime / 1000;
  updateScoreboard();
  render();
  window.requestAnimationFrame(tick);
}

function startOrResetGame() {
  startNewGame();
}

function togglePause() {
  if (!state.running || state.gameOver) {
    return;
  }
  state.paused = !state.paused;
  updatePauseButton();
  updateStatus(state.paused ? "Paused." : "Clear the maze!");
}

function handleKeyboard(event) {
  if (event.code === "Space") {
    event.preventDefault();
    if (!state.running || state.gameOver) {
      startNewGame();
      return;
    }
    if (state.paused) {
      state.paused = false;
      updatePauseButton();
      updateStatus("Clear the maze!");
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
  if (!state.running || state.gameOver) {
    startNewGame();
  }
  setRequestedDirection(direction);
}

resetButton.addEventListener("click", startOrResetGame);
pauseButton.addEventListener("click", togglePause);
backButton.addEventListener("click", () => {
  window.location.href = "../index.html";
});

touchButtons.forEach((button) => {
  const action = button.dataset.action;
  if (!action) {
    return;
  }
  button.addEventListener("click", (event) => {
    event.preventDefault();
    const direction = touchDirectionByAction[action];
    if (!direction) {
      return;
    }
    if (!state.running || state.gameOver) {
      startNewGame();
    }
    setRequestedDirection(direction);
  });
});

window.addEventListener("keydown", handleKeyboard);

resetBoardForLevel();
resetRound();
resetButton.textContent = "Start";
updatePauseButton();
updateScoreboard();
updateStatus("Press Start to play.");
window.requestAnimationFrame(tick);
