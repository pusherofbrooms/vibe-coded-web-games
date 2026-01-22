const canvas = document.querySelector("#playfield");
const context = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const livesEl = document.querySelector("#lives");
const waveEl = document.querySelector("#wave");
const statusEl = document.querySelector("#status");
const resetButton = document.querySelector("#reset-game");
const pauseButton = document.querySelector("#toggle-pause");
const backButton = document.querySelector("#back-button");
const touchButtons = document.querySelectorAll("[data-action]");

const canvasBounds = {
  width: canvas.width,
  height: canvas.height,
};

const state = {
  running: false,
  paused: false,
  gameOver: false,
  lastFrameTime: 0,
  accumulator: 0,
  score: 0,
  wave: 1,
  lives: 3,
  shots: [],
  enemyShots: [],
  explosions: [],
};

const input = {
  left: false,
  right: false,
  fire: false,
  fireLocked: false,
};

const player = {
  width: 40,
  height: 18,
  speed: 220,
  shotSpeed: 360,
  cooldown: 0.4,
  cooldownRemaining: 0,
  position: {
    x: canvasBounds.width / 2 - 20,
    y: canvasBounds.height - 46,
  },
};

const formation = {
  columns: 11,
  rows: 5,
  spacingX: 46,
  spacingY: 34,
  offsetX: 60,
  offsetY: 70,
  direction: 1,
  speed: 18,
  drop: 22,
  stepCooldown: 0.5,
  stepTimer: 0,
};

const shieldConfig = {
  width: 64,
  height: 36,
  blocksX: 8,
  blocksY: 4,
  gap: 20,
};

let enemies = [];
let shields = [];

const palette = {
  player: "#69d2ff",
  enemy1: "#f6c24a",
  enemy2: "#f07a64",
  enemy3: "#a5e45b",
  shield: "#7bd389",
  shot: "#ffffff",
  enemyShot: "#ff7b7b",
  text: "#dbeafe",
};

const keyMap = {
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyA: "left",
  KeyD: "right",
  Space: "fire",
};

const scoreByRow = [40, 30, 20, 20, 10];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const rectsOverlap = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

const updateText = (element, value) => {
  element.textContent = value;
};

const setStatus = (message) => {
  statusEl.textContent = message;
};

const resetInput = () => {
  input.left = false;
  input.right = false;
  input.fire = false;
  input.fireLocked = false;
};

const createEnemies = () => {
  enemies = [];
  formation.direction = 1;
  formation.stepTimer = 0;
  formation.speed = 18 + (state.wave - 1) * 6;

  for (let row = 0; row < formation.rows; row += 1) {
    for (let col = 0; col < formation.columns; col += 1) {
      enemies.push({
        row,
        col,
        width: 34,
        height: 22,
        x: formation.offsetX + col * formation.spacingX,
        y: formation.offsetY + row * formation.spacingY,
        alive: true,
      });
    }
  }
};

const createShields = () => {
  shields = [];
  const totalWidth =
    shieldConfig.width * 4 + shieldConfig.gap * 3;
  const startX = (canvasBounds.width - totalWidth) / 2;
  const y = canvasBounds.height - 140;

  for (let index = 0; index < 4; index += 1) {
    const shieldX = startX + index * (shieldConfig.width + shieldConfig.gap);
    for (let blockY = 0; blockY < shieldConfig.blocksY; blockY += 1) {
      for (let blockX = 0; blockX < shieldConfig.blocksX; blockX += 1) {
        const isGap =
          blockY === shieldConfig.blocksY - 1 &&
          (blockX === 3 || blockX === 4);
        if (isGap) {
          continue;
        }
        shields.push({
          x: shieldX + blockX * (shieldConfig.width / shieldConfig.blocksX),
          y: y + blockY * (shieldConfig.height / shieldConfig.blocksY),
          width: shieldConfig.width / shieldConfig.blocksX - 2,
          height: shieldConfig.height / shieldConfig.blocksY - 2,
          health: 2,
        });
      }
    }
  }
};

const startGame = () => {
  state.running = true;
  state.paused = false;
  state.gameOver = false;
  state.score = 0;
  state.wave = 1;
  state.lives = 3;
  state.shots = [];
  state.enemyShots = [];
  state.explosions = [];
  player.position.x = canvasBounds.width / 2 - player.width / 2;
  player.cooldownRemaining = 0;
  resetButton.textContent = "Restart";
  createEnemies();
  createShields();
  resetInput();
  updateHud();
  setStatus("Wave 1 - clear the formation.");
};

const nextWave = () => {
  state.wave += 1;
  state.shots = [];
  state.enemyShots = [];
  state.explosions = [];
  player.position.x = canvasBounds.width / 2 - player.width / 2;
  player.cooldownRemaining = 0;
  createEnemies();
  createShields();
  updateHud();
  setStatus(`Wave ${state.wave} - keep pushing!`);
};

const updateHud = () => {
  updateText(scoreEl, state.score);
  updateText(livesEl, state.lives);
  updateText(waveEl, state.wave);
};

const pauseGame = () => {
  if (!state.running || state.gameOver) {
    return;
  }
  state.paused = !state.paused;
  pauseButton.textContent = state.paused ? "Resume" : "Pause";
  setStatus(state.paused ? "Paused." : "Back in action.");
};

const loseLife = () => {
  state.lives -= 1;
  updateHud();
  if (state.lives <= 0) {
    state.gameOver = true;
    state.running = false;
    setStatus("Game over. Press Restart to try again.");
    return;
  }
  state.shots = [];
  state.enemyShots = [];
  state.explosions = [];
  player.position.x = canvasBounds.width / 2 - player.width / 2;
  setStatus("Ship down! Ready for another push.");
};

const endGame = (message) => {
  state.running = false;
  state.gameOver = true;
  setStatus(message);
};

const spawnPlayerShot = () => {
  if (player.cooldownRemaining > 0) {
    return;
  }
  state.shots.push({
    x: player.position.x + player.width / 2 - 2,
    y: player.position.y - 10,
    width: 4,
    height: 10,
    speed: player.shotSpeed,
  });
  player.cooldownRemaining = player.cooldown;
};

const spawnEnemyShot = (enemy) => {
  state.enemyShots.push({
    x: enemy.x + enemy.width / 2 - 3,
    y: enemy.y + enemy.height + 4,
    width: 6,
    height: 12,
    speed: 180 + state.wave * 8,
  });
};

const maybeFireEnemyShot = (deltaTime) => {
  if (enemies.length === 0) {
    return;
  }
  const livingEnemies = enemies.filter((enemy) => enemy.alive);
  if (livingEnemies.length === 0) {
    return;
  }
  const chance = 0.35 + state.wave * 0.05;
  if (Math.random() > deltaTime * chance) {
    return;
  }
  const shooter = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
  spawnEnemyShot(shooter);
};

const updatePlayer = (deltaTime) => {
  if (input.left) {
    player.position.x -= player.speed * deltaTime;
  }
  if (input.right) {
    player.position.x += player.speed * deltaTime;
  }
  player.position.x = clamp(
    player.position.x,
    16,
    canvasBounds.width - player.width - 16
  );

  if (input.fire && !input.fireLocked) {
    spawnPlayerShot();
    input.fireLocked = true;
  }
  if (!input.fire) {
    input.fireLocked = false;
  }

  if (player.cooldownRemaining > 0) {
    player.cooldownRemaining -= deltaTime;
  }
};

const updateShots = (deltaTime) => {
  state.shots.forEach((shot) => {
    shot.y -= shot.speed * deltaTime;
  });
  state.shots = state.shots.filter((shot) => shot.y + shot.height > 0);

  state.enemyShots.forEach((shot) => {
    shot.y += shot.speed * deltaTime;
  });
  state.enemyShots = state.enemyShots.filter(
    (shot) => shot.y < canvasBounds.height + shot.height
  );
};

const updateExplosions = (deltaTime) => {
  state.explosions.forEach((spark) => {
    spark.life -= deltaTime;
    spark.x += spark.vx * deltaTime;
    spark.y += spark.vy * deltaTime;
  });
  state.explosions = state.explosions.filter((spark) => spark.life > 0);
};

const createExplosion = (x, y, color) => {
  for (let i = 0; i < 8; i += 1) {
    state.explosions.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 120,
      vy: (Math.random() - 0.5) * 120,
      life: 0.4 + Math.random() * 0.4,
      color,
    });
  }
};

const updateEnemies = (deltaTime) => {
  if (enemies.length === 0) {
    return;
  }

  formation.stepTimer += deltaTime;
  const stepInterval = Math.max(
    0.12,
    formation.stepCooldown - (state.wave - 1) * 0.04
  );
  if (formation.stepTimer >= stepInterval) {
    formation.stepTimer = 0;
    const liveEnemies = enemies.filter((enemy) => enemy.alive);
    if (liveEnemies.length === 0) {
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    liveEnemies.forEach((enemy) => {
      minX = Math.min(minX, enemy.x);
      maxX = Math.max(maxX, enemy.x + enemy.width);
    });

    const moveDistance = formation.speed * formation.direction;
    const wouldHitEdge =
      minX + moveDistance < 16 ||
      maxX + moveDistance > canvasBounds.width - 16;

    if (wouldHitEdge) {
      formation.direction *= -1;
      liveEnemies.forEach((enemy) => {
        enemy.y += formation.drop;
      });
    } else {
      liveEnemies.forEach((enemy) => {
        enemy.x += moveDistance;
      });
    }
  }
};

const handlePlayerHits = () => {
  const remainingShots = [];
  state.shots.forEach((shot) => {
    let hit = false;

    enemies.forEach((enemy) => {
      if (!enemy.alive || hit) {
        return;
      }
      if (
        rectsOverlap(shot, {
          x: enemy.x,
          y: enemy.y,
          width: enemy.width,
          height: enemy.height,
        })
      ) {
        enemy.alive = false;
        hit = true;
        state.score += scoreByRow[enemy.row] || 10;
        createExplosion(
          enemy.x + enemy.width / 2,
          enemy.y + enemy.height / 2,
          palette.enemy1
        );
      }
    });

    shields.forEach((block) => {
      if (hit || block.health <= 0) {
        return;
      }
      if (
        rectsOverlap(shot, {
          x: block.x,
          y: block.y,
          width: block.width,
          height: block.height,
        })
      ) {
        hit = true;
        block.health -= 1;
      }
    });

    if (!hit) {
      remainingShots.push(shot);
    }
  });

  state.shots = remainingShots;
};

const handleEnemyHits = () => {
  const remainingShots = [];
  state.enemyShots.forEach((shot) => {
    let hit = false;

    const playerRect = {
      x: player.position.x,
      y: player.position.y,
      width: player.width,
      height: player.height,
    };

    if (rectsOverlap(shot, playerRect)) {
      hit = true;
      createExplosion(
        player.position.x + player.width / 2,
        player.position.y + player.height / 2,
        palette.enemy2
      );
      loseLife();
    }

    shields.forEach((block) => {
      if (hit || block.health <= 0) {
        return;
      }
      if (
        rectsOverlap(shot, {
          x: block.x,
          y: block.y,
          width: block.width,
          height: block.height,
        })
      ) {
        hit = true;
        block.health -= 1;
      }
    });

    if (!hit) {
      remainingShots.push(shot);
    }
  });

  state.enemyShots = remainingShots;
};

const handleEnemyLanding = () => {
  const liveEnemies = enemies.filter((enemy) => enemy.alive);
  if (liveEnemies.length === 0) {
    return false;
  }
  const lowestEnemy = liveEnemies.reduce(
    (lowest, enemy) => (enemy.y > lowest.y ? enemy : lowest),
    liveEnemies[0]
  );

  if (lowestEnemy.y + lowestEnemy.height >= player.position.y - 12) {
    endGame("The invaders reached the base.");
    return true;
  }
  return false;
};

const clearDeadEnemies = () => {
  if (enemies.every((enemy) => !enemy.alive)) {
    nextWave();
  }
};

const update = (deltaTime) => {
  updatePlayer(deltaTime);
  updateEnemies(deltaTime);
  updateShots(deltaTime);
  updateExplosions(deltaTime);
  maybeFireEnemyShot(deltaTime);
  handlePlayerHits();
  handleEnemyHits();
  handleEnemyLanding();
  clearDeadEnemies();
  updateHud();
};

const drawBackground = () => {
  context.fillStyle = "#0b1220";
  context.fillRect(0, 0, canvasBounds.width, canvasBounds.height);

  context.fillStyle = "rgba(255,255,255,0.12)";
  for (let i = 0; i < 60; i += 1) {
    const x = (i * 37) % canvasBounds.width;
    const y = (i * 83) % canvasBounds.height;
    context.fillRect(x, y, 2, 2);
  }
};

const drawPlayer = () => {
  context.fillStyle = palette.player;
  context.fillRect(
    player.position.x,
    player.position.y,
    player.width,
    player.height
  );
  context.fillRect(
    player.position.x + 14,
    player.position.y - 6,
    12,
    6
  );
};

const drawEnemies = () => {
  enemies.forEach((enemy) => {
    if (!enemy.alive) {
      return;
    }
    let color = palette.enemy3;
    if (enemy.row === 0) {
      color = palette.enemy1;
    } else if (enemy.row <= 2) {
      color = palette.enemy2;
    }
    context.fillStyle = color;
    context.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    context.fillStyle = "rgba(0,0,0,0.2)";
    context.fillRect(enemy.x + 4, enemy.y + 4, enemy.width - 8, 6);
  });
};

const drawShields = () => {
  shields.forEach((block) => {
    if (block.health <= 0) {
      return;
    }
    context.fillStyle =
      block.health === 2 ? palette.shield : "rgba(123,211,137,0.55)";
    context.fillRect(block.x, block.y, block.width, block.height);
  });
};

const drawShots = () => {
  context.fillStyle = palette.shot;
  state.shots.forEach((shot) => {
    context.fillRect(shot.x, shot.y, shot.width, shot.height);
  });

  context.fillStyle = palette.enemyShot;
  state.enemyShots.forEach((shot) => {
    context.fillRect(shot.x, shot.y, shot.width, shot.height);
  });
};

const drawExplosions = () => {
  state.explosions.forEach((spark) => {
    context.fillStyle = spark.color;
    context.fillRect(spark.x, spark.y, 3, 3);
  });
};

const drawHud = () => {
  context.fillStyle = palette.text;
  context.font = "14px Tahoma";
  context.fillText("Defend the base", 16, 22);
};

const render = () => {
  drawBackground();
  drawShields();
  drawEnemies();
  drawPlayer();
  drawShots();
  drawExplosions();
  drawHud();
};

const gameLoop = (timestamp) => {
  if (!state.running) {
    render();
    return;
  }
  if (state.paused) {
    render();
    requestAnimationFrame(gameLoop);
    return;
  }

  if (!state.lastFrameTime) {
    state.lastFrameTime = timestamp;
  }

  const frameTime = (timestamp - state.lastFrameTime) / 1000;
  state.lastFrameTime = timestamp;
  state.accumulator += frameTime;

  const step = 1 / 60;
  while (state.accumulator >= step) {
    update(step);
    state.accumulator -= step;
  }

  render();
  requestAnimationFrame(gameLoop);
};

const handleKey = (event, isDown) => {
  const action = keyMap[event.code];
  if (!action) {
    return;
  }
  event.preventDefault();

  if (action === "fire" && isDown && !state.running && !state.gameOver) {
    startGame();
    state.lastFrameTime = 0;
    state.accumulator = 0;
    requestAnimationFrame(gameLoop);
    return;
  }

  if (action === "fire" && isDown && state.paused) {
    pauseGame();
    return;
  }

  input[action] = isDown;
};

const handleTouch = (action, isDown) => {
  if (action === "fire") {
    input.fire = isDown;
    if (!isDown) {
      input.fireLocked = false;
    }
    return;
  }
  input[action] = isDown;
};

const bindTouchControls = () => {
  touchButtons.forEach((button) => {
    const action = button.dataset.action;
    const start = (event) => {
      event.preventDefault();
      handleTouch(action, true);
    };
    const end = (event) => {
      event.preventDefault();
      handleTouch(action, false);
    };

    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", end);
    button.addEventListener("pointerleave", end);
  });
};

const init = () => {
  updateHud();
  setStatus("Press Start to begin.");
  render();
  bindTouchControls();

  window.addEventListener("keydown", (event) => handleKey(event, true));
  window.addEventListener("keyup", (event) => handleKey(event, false));

  resetButton.addEventListener("click", () => {
    startGame();
    state.lastFrameTime = 0;
    state.accumulator = 0;
    requestAnimationFrame(gameLoop);
  });

  pauseButton.addEventListener("click", () => {
    pauseGame();
  });

  backButton.addEventListener("click", () => {
    window.location.href = "../index.html";
  });
};

init();
