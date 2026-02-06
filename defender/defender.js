const canvas = document.getElementById("defender-canvas");
const context = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const livesElement = document.getElementById("lives");
const waveElement = document.getElementById("wave");
const humansElement = document.getElementById("humans");
const bombsElement = document.getElementById("bombs");
const statusElement = document.getElementById("status");

const resetButton = document.getElementById("reset-game");
const pauseButton = document.getElementById("toggle-pause");
const backButton = document.getElementById("back-button");
const touchButtons = document.querySelectorAll("[data-action]");

const world = {
  width: 3600,
  groundBaseY: 360,
};

const state = {
  running: false,
  paused: false,
  gameOver: false,
  planetDestroyed: false,
  score: 0,
  lives: 3,
  wave: 1,
  smartBombs: 3,
  nextBonusScore: 10000,
  stars: [],
  humans: [],
  enemies: [],
  enemyShots: [],
  bullets: [],
  particles: [],
  lastFrameTime: 0,
  accumulator: 0,
  idCounter: 1,
};

const input = {
  left: false,
  right: false,
  up: false,
  down: false,
  thrust: false,
  fire: false,
  bomb: false,
  hyperspace: false,
  bombLocked: false,
  hyperspaceLocked: false,
};

const player = {
  x: world.width / 2,
  y: 180,
  vx: 0,
  vy: 0,
  face: 1,
  width: 28,
  height: 14,
  thrustPower: 320,
  drag: 0.988,
  maxSpeedX: 320,
  maxSpeedY: 240,
  cooldown: 0.1,
  cooldownRemaining: 0,
  invulnerableTime: 0,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const wrapX = (x) => {
  let value = x;
  while (value < 0) {
    value += world.width;
  }
  while (value >= world.width) {
    value -= world.width;
  }
  return value;
};

const wrappedDeltaX = (fromX, toX) => {
  let delta = toX - fromX;
  if (delta > world.width / 2) {
    delta -= world.width;
  }
  if (delta < -world.width / 2) {
    delta += world.width;
  }
  return delta;
};

const getGroundY = (x) => {
  const wrapped = wrapX(x);
  const a = Math.sin((wrapped / world.width) * Math.PI * 5.8) * 22;
  const b = Math.sin((wrapped / world.width) * Math.PI * 11.4 + 0.9) * 13;
  const c = Math.sin((wrapped / world.width) * Math.PI * 23.2 + 0.5) * 4;
  return world.groundBaseY + a + b + c;
};

const worldToScreenX = (worldX) => {
  const cameraX = player.x - canvas.width * 0.5;
  let screenX = worldX - cameraX;
  while (screenX < -world.width / 2) {
    screenX += world.width;
  }
  while (screenX > world.width / 2) {
    screenX -= world.width;
  }
  return screenX;
};

const onScreen = (screenX, margin = 30) =>
  screenX >= -margin && screenX <= canvas.width + margin;

const setStatus = (message) => {
  statusElement.textContent = message;
};

const livingHumans = () => state.humans.filter((human) => human.alive);

const updateHud = () => {
  scoreElement.textContent = Math.floor(state.score);
  livesElement.textContent = state.lives;
  waveElement.textContent = state.wave;
  humansElement.textContent = livingHumans().length;
  bombsElement.textContent = state.smartBombs;
};

const updatePauseButton = () => {
  pauseButton.textContent = state.paused ? "Resume" : "Pause";
};

const createStars = () => {
  state.stars = [];
  for (let index = 0; index < 180; index += 1) {
    state.stars.push({
      x: Math.random() * world.width,
      y: 12 + Math.random() * 240,
      size: Math.random() < 0.83 ? 1 : 2,
      parallax: 0.18 + Math.random() * 0.2,
    });
  }
};

const createHumans = () => {
  state.humans = [];
  const count = 10;
  const spacing = world.width / count;
  for (let index = 0; index < count; index += 1) {
    const x = wrapX(index * spacing + 60 + Math.random() * 120);
    state.humans.push({
      id: `human-${index}`,
      x,
      y: getGroundY(x) - 5,
      vy: 0,
      alive: true,
      falling: false,
      abductedById: null,
      flashTimer: 0,
    });
  }
};

const createEnemy = (type) => {
  const id = `enemy-${state.idCounter}`;
  state.idCounter += 1;
  if (type === "mutant") {
    return {
      id,
      type,
      x: Math.random() * world.width,
      y: 70 + Math.random() * 150,
      vx: (Math.random() < 0.5 ? -1 : 1) * (130 + Math.random() * 60),
      vy: (Math.random() - 0.5) * 60,
      radius: 11,
      state: "hunt",
      timer: 0,
      targetHumanId: null,
      carryingHumanId: null,
      alive: true,
    };
  }
  return {
    id,
    type: "lander",
    x: Math.random() * world.width,
    y: 80 + Math.random() * 140,
    vx: (Math.random() < 0.5 ? -1 : 1) * (38 + Math.random() * 22 + state.wave * 2),
    vy: 0,
    radius: 12,
    state: "patrol",
    timer: 0,
    targetHumanId: null,
    carryingHumanId: null,
    alive: true,
  };
};

const createWave = () => {
  state.enemies = [];
  state.enemyShots = [];
  state.bullets = [];

  if (state.planetDestroyed) {
    const mutantCount = 8 + state.wave * 2;
    for (let index = 0; index < mutantCount; index += 1) {
      state.enemies.push(createEnemy("mutant"));
    }
    setStatus(`Mutant wave ${state.wave}. Survive to restore the planet.`);
    return;
  }

  const landerCount = 6 + state.wave * 2;
  for (let index = 0; index < landerCount; index += 1) {
    state.enemies.push(createEnemy("lander"));
  }
  setStatus(`Wave ${state.wave}. Protect the humans.`);
};

const resetPlayer = () => {
  player.x = world.width * 0.52;
  player.y = 170;
  player.vx = 0;
  player.vy = 0;
  player.face = 1;
  player.cooldownRemaining = 0;
  player.invulnerableTime = 1.4;
  input.bombLocked = false;
  input.hyperspaceLocked = false;
};

const resetInput = () => {
  input.left = false;
  input.right = false;
  input.up = false;
  input.down = false;
  input.thrust = false;
  input.fire = false;
  input.bomb = false;
  input.hyperspace = false;
  input.bombLocked = false;
  input.hyperspaceLocked = false;
};

const startGame = () => {
  state.running = true;
  state.paused = false;
  state.gameOver = false;
  state.planetDestroyed = false;
  state.score = 0;
  state.lives = 3;
  state.wave = 1;
  state.smartBombs = 3;
  state.nextBonusScore = 10000;
  state.particles = [];
  state.idCounter = 1;
  createStars();
  createHumans();
  createWave();
  resetPlayer();
  resetInput();
  updatePauseButton();
  updateHud();
  resetButton.textContent = "Restart";
  state.lastFrameTime = 0;
  state.accumulator = 0;
};

const addScore = (points) => {
  state.score += points;
  while (state.score >= state.nextBonusScore) {
    state.lives += 1;
    state.smartBombs += 1;
    state.nextBonusScore += 10000;
    setStatus("Bonus ship and smart bomb awarded.");
  }
};

const createParticles = (x, y, color, count = 14) => {
  for (let index = 0; index < count; index += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 190,
      vy: (Math.random() - 0.5) * 190,
      life: 0.2 + Math.random() * 0.45,
      color,
    });
  }
};

const loseLife = () => {
  if (player.invulnerableTime > 0 || state.gameOver) {
    return;
  }
  state.lives -= 1;
  if (state.lives <= 0) {
    state.running = false;
    state.gameOver = true;
    setStatus("Game over. Press Restart.");
    updateHud();
    return;
  }
  resetPlayer();
  setStatus("Ship lost. Keep defending.");
  updateHud();
};

const useHyperspace = () => {
  player.x = Math.random() * world.width;
  player.y = 70 + Math.random() * 220;
  player.vx = 0;
  player.vy = 0;
  createParticles(player.x, player.y, "#c5d8ff", 18);
  if (Math.random() < 0.18) {
    createParticles(player.x, player.y, "#ffb9a5", 22);
    loseLife();
  } else {
    player.invulnerableTime = Math.max(player.invulnerableTime, 0.7);
  }
};

const useSmartBomb = () => {
  if (state.smartBombs <= 0) {
    return;
  }
  state.smartBombs -= 1;

  const visible = [];
  state.enemies.forEach((enemy) => {
    const screenX = worldToScreenX(enemy.x);
    if (onScreen(screenX, 10)) {
      visible.push(enemy);
    }
  });

  visible.forEach((enemy) => {
    enemy.alive = false;
    createParticles(enemy.x, enemy.y, "#ffd8ae", 14);
    addScore(enemy.type === "mutant" ? 250 : 150);

    if (enemy.targetHumanId) {
      const target = state.humans.find((human) => human.id === enemy.targetHumanId);
      if (target && target.alive && target.abductedById === enemy.id) {
        target.abductedById = null;
      }
    }

    if (enemy.carryingHumanId) {
      const carried = state.humans.find((human) => human.id === enemy.carryingHumanId);
      if (carried && carried.alive) {
        carried.abductedById = null;
        carried.falling = true;
        carried.vy = -35;
      }
    }
  });

  state.enemyShots = state.enemyShots.filter((shot) => {
    const screenX = worldToScreenX(shot.x);
    return !onScreen(screenX, 8);
  });

  setStatus("Smart bomb detonated.");
};

const spawnPlayerBullet = () => {
  if (player.cooldownRemaining > 0) {
    return;
  }
  state.bullets.push({
    x: player.x + player.face * 18,
    y: player.y,
    vx: player.face * 520 + player.vx,
    vy: player.vy * 0.1,
    life: 0.82,
  });
  player.cooldownRemaining = player.cooldown;
};

const spawnEnemyShot = (enemy) => {
  const dx = wrappedDeltaX(enemy.x, player.x);
  const dy = player.y - enemy.y;
  const length = Math.hypot(dx, dy) || 1;
  const speed = 210;
  state.enemyShots.push({
    x: enemy.x,
    y: enemy.y,
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
    life: 1.7,
  });
};

const updatePlayer = (deltaTime) => {
  let ax = 0;
  let ay = 0;

  if (input.left) {
    ax -= 280;
    player.face = -1;
  }
  if (input.right) {
    ax += 280;
    player.face = 1;
  }
  if (input.up) {
    ay -= 260;
  }
  if (input.down) {
    ay += 260;
  }

  if (input.thrust) {
    ax += player.face * player.thrustPower;
  }

  player.vx += ax * deltaTime;
  player.vy += ay * deltaTime;

  player.vx *= player.drag;
  player.vy *= player.drag;

  player.vx = clamp(player.vx, -player.maxSpeedX, player.maxSpeedX);
  player.vy = clamp(player.vy, -player.maxSpeedY, player.maxSpeedY);

  player.x = wrapX(player.x + player.vx * deltaTime);
  player.y += player.vy * deltaTime;
  player.y = clamp(player.y, 26, canvas.height - 26);

  const floorY = getGroundY(player.x) - 8;
  if (player.y >= floorY) {
    createParticles(player.x, floorY, "#ffbfa7", 10);
    loseLife();
    player.y = floorY;
    player.vx *= 0.2;
    player.vy = -30;
  }

  if (input.fire) {
    spawnPlayerBullet();
  }

  if (input.bomb && !input.bombLocked) {
    useSmartBomb();
    input.bombLocked = true;
  }
  if (!input.bomb) {
    input.bombLocked = false;
  }

  if (input.hyperspace && !input.hyperspaceLocked) {
    useHyperspace();
    input.hyperspaceLocked = true;
  }
  if (!input.hyperspace) {
    input.hyperspaceLocked = false;
  }

  if (player.cooldownRemaining > 0) {
    player.cooldownRemaining -= deltaTime;
  }
  if (player.invulnerableTime > 0) {
    player.invulnerableTime -= deltaTime;
  }
};

const updateBullets = (deltaTime) => {
  state.bullets.forEach((bullet) => {
    bullet.x = wrapX(bullet.x + bullet.vx * deltaTime);
    bullet.y += bullet.vy * deltaTime;
    bullet.life -= deltaTime;
  });
  state.bullets = state.bullets.filter(
    (bullet) => bullet.life > 0 && bullet.y >= 0 && bullet.y <= canvas.height
  );

  state.enemyShots.forEach((shot) => {
    shot.x = wrapX(shot.x + shot.vx * deltaTime);
    shot.y += shot.vy * deltaTime;
    shot.life -= deltaTime;
  });
  state.enemyShots = state.enemyShots.filter(
    (shot) => shot.life > 0 && shot.y >= 0 && shot.y <= canvas.height
  );
};

const updateHumans = (deltaTime) => {
  state.humans.forEach((human) => {
    if (!human.alive) {
      return;
    }

    if (human.flashTimer > 0) {
      human.flashTimer -= deltaTime;
    }

    if (human.abductedById) {
      return;
    }

    if (!human.falling) {
      human.y = getGroundY(human.x) - 5;
      return;
    }

    human.vy += 190 * deltaTime;
    human.y += human.vy * deltaTime;

    const floor = getGroundY(human.x) - 5;
    if (human.y >= floor) {
      if (human.vy > 95) {
        human.alive = false;
        createParticles(human.x, floor, "#ffb8a8", 9);
      } else {
        human.falling = false;
        human.vy = 0;
        human.y = floor;
      }
    }
  });
};

const pickHumanTarget = (enemy) => {
  const targets = state.humans.filter((human) => human.alive && !human.abductedById && !human.falling);
  if (targets.length === 0) {
    return null;
  }
  let best = targets[0];
  let bestDistance = Math.abs(wrappedDeltaX(enemy.x, best.x));
  for (let index = 1; index < targets.length; index += 1) {
    const candidate = targets[index];
    const distance = Math.abs(wrappedDeltaX(enemy.x, candidate.x));
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
};

const updateLander = (enemy, deltaTime) => {
  enemy.timer += deltaTime;

  if (enemy.state === "patrol") {
    enemy.x = wrapX(enemy.x + enemy.vx * deltaTime);
    enemy.y += Math.sin(enemy.timer * 1.8 + enemy.x * 0.01) * 16 * deltaTime;
    enemy.y = clamp(enemy.y, 64, 220);

    if (enemy.timer > 1.2 + Math.random() * 1.6) {
      const target = pickHumanTarget(enemy);
      if (target) {
        enemy.state = "descending";
        enemy.targetHumanId = target.id;
        target.abductedById = enemy.id;
      }
      enemy.timer = 0;
    }
    return;
  }

  if (enemy.state === "descending") {
    const target = state.humans.find((human) => human.id === enemy.targetHumanId);
    if (!target || !target.alive) {
      enemy.state = "patrol";
      enemy.targetHumanId = null;
      return;
    }

    const dx = wrappedDeltaX(enemy.x, target.x);
    enemy.x = wrapX(enemy.x + clamp(dx * 2.5, -120, 120) * deltaTime);
    const targetY = getGroundY(target.x) - 20;
    enemy.y += clamp(targetY - enemy.y, -120, 120) * deltaTime;

    if (Math.abs(dx) < 10 && Math.abs(enemy.y - targetY) < 8) {
      enemy.state = "ascending";
      enemy.carryingHumanId = target.id;
      enemy.targetHumanId = null;
      target.abductedById = enemy.id;
      target.falling = false;
      target.vy = 0;
    }
    return;
  }

  if (enemy.state === "ascending") {
    enemy.x = wrapX(enemy.x + enemy.vx * 0.7 * deltaTime);
    enemy.y -= (82 + state.wave * 5) * deltaTime;

    const carried = state.humans.find((human) => human.id === enemy.carryingHumanId);
    if (carried && carried.alive) {
      carried.x = enemy.x;
      carried.y = enemy.y + 15;
      carried.abductedById = enemy.id;
    }

    if (enemy.y < 26) {
      if (carried && carried.alive) {
        carried.alive = false;
        carried.abductedById = null;
      }
      enemy.type = "mutant";
      enemy.state = "hunt";
      enemy.vx = (Math.random() < 0.5 ? -1 : 1) * (140 + Math.random() * 70);
      enemy.vy = (Math.random() - 0.5) * 80;
      enemy.carryingHumanId = null;
      enemy.timer = 0;
    }
  }
};

const updateMutant = (enemy, deltaTime) => {
  enemy.timer += deltaTime;

  const dx = wrappedDeltaX(enemy.x, player.x);
  const dy = player.y - enemy.y;
  const length = Math.hypot(dx, dy) || 1;
  const chaseAccel = 125;

  enemy.vx += (dx / length) * chaseAccel * deltaTime;
  enemy.vy += (dy / length) * chaseAccel * deltaTime;
  enemy.vx = clamp(enemy.vx, -220, 220);
  enemy.vy = clamp(enemy.vy, -180, 180);

  enemy.x = wrapX(enemy.x + enemy.vx * deltaTime);
  enemy.y = clamp(enemy.y + enemy.vy * deltaTime, 38, canvas.height - 70);

  if (enemy.timer >= 1.2 + Math.random() * 0.8) {
    enemy.timer = 0;
    spawnEnemyShot(enemy);
  }
};

const updateEnemies = (deltaTime) => {
  state.enemies.forEach((enemy) => {
    if (!enemy.alive) {
      return;
    }
    if (enemy.type === "mutant") {
      updateMutant(enemy, deltaTime);
    } else {
      updateLander(enemy, deltaTime);
    }
  });
};

const resolveBulletHits = () => {
  const remainingBullets = [];

  state.bullets.forEach((bullet) => {
    let hit = false;
    state.enemies.forEach((enemy) => {
      if (!enemy.alive || hit) {
        return;
      }
      const dx = wrappedDeltaX(bullet.x, enemy.x);
      const dy = bullet.y - enemy.y;
      if (Math.hypot(dx, dy) <= enemy.radius + 3) {
        hit = true;
        enemy.alive = false;
        addScore(enemy.type === "mutant" ? 250 : 150);
        createParticles(enemy.x, enemy.y, enemy.type === "mutant" ? "#ffc1a5" : "#ffdca8", 14);

        if (enemy.targetHumanId) {
          const target = state.humans.find((human) => human.id === enemy.targetHumanId);
          if (target && target.alive && target.abductedById === enemy.id) {
            target.abductedById = null;
          }
        }

        if (enemy.carryingHumanId) {
          const carried = state.humans.find((human) => human.id === enemy.carryingHumanId);
          if (carried && carried.alive) {
            carried.abductedById = null;
            carried.falling = true;
            carried.vy = -40;
          }
        }
      }
    });

    if (!hit) {
      remainingBullets.push(bullet);
    }
  });

  state.bullets = remainingBullets;
};

const resolveShipHits = () => {
  state.enemies.forEach((enemy) => {
    if (!enemy.alive || player.invulnerableTime > 0) {
      return;
    }
    const dx = wrappedDeltaX(player.x, enemy.x);
    const dy = player.y - enemy.y;
    if (Math.hypot(dx, dy) <= enemy.radius + 12) {
      enemy.alive = false;
      createParticles(enemy.x, enemy.y, "#ffd5ba", 18);
      loseLife();
    }
  });

  state.enemyShots.forEach((shot) => {
    if (player.invulnerableTime > 0) {
      return;
    }
    const dx = wrappedDeltaX(player.x, shot.x);
    const dy = player.y - shot.y;
    if (Math.hypot(dx, dy) <= 11) {
      shot.life = 0;
      createParticles(player.x, player.y, "#ffbba8", 11);
      loseLife();
    }
  });
};

const resolveHumanRescue = () => {
  state.humans.forEach((human) => {
    if (!human.alive || !human.falling) {
      return;
    }
    const dx = wrappedDeltaX(player.x, human.x);
    const dy = player.y - human.y;
    if (Math.hypot(dx, dy) <= 18) {
      human.falling = false;
      human.vy = 0;
      human.y = getGroundY(human.x) - 5;
      human.flashTimer = 0.9;
      addScore(250);
      createParticles(human.x, human.y, "#c3f7b6", 9);
    }
  });
};

const updateParticles = (deltaTime) => {
  state.particles.forEach((particle) => {
    particle.x = wrapX(particle.x + particle.vx * deltaTime);
    particle.y += particle.vy * deltaTime;
    particle.vy += 90 * deltaTime;
    particle.life -= deltaTime;
  });
  state.particles = state.particles.filter((particle) => particle.life > 0);
};

const cleanup = () => {
  state.enemies = state.enemies.filter((enemy) => enemy.alive);
  state.enemyShots = state.enemyShots.filter((shot) => shot.life > 0);
};

const updateProgression = () => {
  if (!state.planetDestroyed && livingHumans().length === 0) {
    state.planetDestroyed = true;
    setStatus("Planet exploded! Mutant waves incoming.");
    state.wave = Math.max(1, state.wave);
    createWave();
  }

  if (state.enemies.length === 0) {
    if (state.planetDestroyed) {
      state.planetDestroyed = false;
      createHumans();
      state.wave += 1;
      setStatus("Planet restored. Human colonies rebuilt.");
      createWave();
    } else {
      state.wave += 1;
      createWave();
    }
  }

  updateHud();
};

const togglePause = () => {
  if (!state.running || state.gameOver) {
    return;
  }
  state.paused = !state.paused;
  updatePauseButton();
  if (state.paused) {
    setStatus("Paused.");
  } else if (state.planetDestroyed) {
    setStatus(`Mutant wave ${state.wave}. Survive to restore the planet.`);
  } else {
    setStatus(`Wave ${state.wave}. Protect the humans.`);
  }
};

const update = (deltaTime) => {
  updatePlayer(deltaTime);
  updateBullets(deltaTime);
  updateHumans(deltaTime);
  updateEnemies(deltaTime);
  resolveBulletHits();
  resolveShipHits();
  resolveHumanRescue();
  updateParticles(deltaTime);
  cleanup();
  updateProgression();
};

const drawSky = () => {
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#141f3d");
  gradient.addColorStop(1, "#0a1121");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const cameraX = player.x - canvas.width * 0.5;
  state.stars.forEach((star) => {
    const screenX = worldToScreenX(cameraX * (1 - star.parallax) + star.x * star.parallax);
    if (!onScreen(screenX, 4)) {
      return;
    }
    context.fillStyle = "rgba(230, 238, 255, 0.85)";
    context.fillRect(screenX, star.y, star.size, star.size);
  });
};

const drawBackgroundHills = () => {
  const cameraX = player.x - canvas.width * 0.5;
  context.fillStyle = "#1b2c4f";
  for (let x = 0; x < canvas.width; x += 54) {
    const worldX = cameraX * 0.5 + x * 1.55;
    const ridge = 270 + Math.sin(worldX * 0.012) * 30;
    context.fillRect(x, ridge, 68, canvas.height - ridge);
  }

  context.fillStyle = "#22355d";
  for (let x = 0; x < canvas.width; x += 42) {
    const worldX = cameraX * 0.7 + x * 1.38;
    const ridge = 302 + Math.sin(worldX * 0.02 + 0.4) * 24;
    context.fillRect(x, ridge, 54, canvas.height - ridge);
  }
};

const drawTerrain = () => {
  const cameraX = player.x - canvas.width * 0.5;
  context.beginPath();
  context.moveTo(0, canvas.height);
  for (let x = 0; x <= canvas.width; x += 6) {
    context.lineTo(x, getGroundY(cameraX + x));
  }
  context.lineTo(canvas.width, canvas.height);
  context.closePath();
  context.fillStyle = state.planetDestroyed ? "#5a2f2f" : "#2e4f34";
  context.fill();

  context.beginPath();
  for (let x = 0; x <= canvas.width; x += 5) {
    const y = getGroundY(cameraX + x);
    if (x === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.strokeStyle = state.planetDestroyed ? "#c08f8f" : "#7fb07a";
  context.lineWidth = 2;
  context.stroke();
};

const drawPlayer = () => {
  if (player.invulnerableTime > 0 && Math.floor(player.invulnerableTime * 12) % 2 === 0) {
    return;
  }
  const screenX = worldToScreenX(player.x);
  const facing = player.face;
  context.save();
  context.translate(screenX, player.y);
  context.scale(facing, 1);

  context.fillStyle = "#9fd4ff";
  context.beginPath();
  context.moveTo(16, 0);
  context.lineTo(-8, -9);
  context.lineTo(-12, 0);
  context.lineTo(-8, 9);
  context.closePath();
  context.fill();

  context.fillStyle = "#e5f2ff";
  context.fillRect(2, -4, 8, 8);

  if (input.thrust && state.running && !state.paused) {
    context.fillStyle = "#ffd595";
    context.beginPath();
    context.moveTo(-10, -3);
    context.lineTo(-19 - Math.random() * 6, 0);
    context.lineTo(-10, 3);
    context.closePath();
    context.fill();
  }

  context.restore();
};

const drawEnemy = (enemy) => {
  const screenX = worldToScreenX(enemy.x);
  if (!onScreen(screenX, 26)) {
    return;
  }
  if (enemy.type === "mutant") {
    context.fillStyle = "#ff8d7c";
    context.beginPath();
    context.moveTo(screenX, enemy.y - 10);
    context.lineTo(screenX + 10, enemy.y - 2);
    context.lineTo(screenX + 12, enemy.y + 8);
    context.lineTo(screenX, enemy.y + 12);
    context.lineTo(screenX - 12, enemy.y + 8);
    context.lineTo(screenX - 10, enemy.y - 2);
    context.closePath();
    context.fill();
    context.fillStyle = "#ffd2cc";
    context.fillRect(screenX - 3, enemy.y - 3, 6, 4);
    return;
  }

  context.fillStyle = "#ffc176";
  context.beginPath();
  context.moveTo(screenX, enemy.y - 11);
  context.lineTo(screenX + 12, enemy.y - 1);
  context.lineTo(screenX + 8, enemy.y + 9);
  context.lineTo(screenX - 8, enemy.y + 9);
  context.lineTo(screenX - 12, enemy.y - 1);
  context.closePath();
  context.fill();

  context.fillStyle = "#ffe8c0";
  context.fillRect(screenX - 5, enemy.y - 2, 10, 4);

  if (enemy.state === "ascending" && enemy.carryingHumanId) {
    context.strokeStyle = "rgba(205, 227, 255, 0.85)";
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(screenX, enemy.y + 10);
    context.lineTo(screenX, enemy.y + 18);
    context.stroke();
  }
};

const drawHumans = () => {
  state.humans.forEach((human) => {
    if (!human.alive) {
      return;
    }
    const screenX = worldToScreenX(human.x);
    if (!onScreen(screenX, 12)) {
      return;
    }
    context.fillStyle = human.flashTimer > 0 ? "#adf0a8" : "#d9e6ff";
    context.fillRect(screenX - 2, human.y - 9, 4, 9);
    context.fillRect(screenX - 3, human.y - 12, 6, 3);
  });
};

const drawBullets = () => {
  context.fillStyle = "#fff2aa";
  state.bullets.forEach((bullet) => {
    const screenX = worldToScreenX(bullet.x);
    if (!onScreen(screenX, 8)) {
      return;
    }
    context.fillRect(screenX - 2, bullet.y - 1, 4, 2);
  });

  context.fillStyle = "#ff9f9f";
  state.enemyShots.forEach((shot) => {
    const screenX = worldToScreenX(shot.x);
    if (!onScreen(screenX, 8)) {
      return;
    }
    context.fillRect(screenX - 2, shot.y - 2, 3, 3);
  });
};

const drawParticles = () => {
  state.particles.forEach((particle) => {
    const screenX = worldToScreenX(particle.x);
    if (!onScreen(screenX, 8)) {
      return;
    }
    context.globalAlpha = clamp(particle.life * 2, 0, 1);
    context.fillStyle = particle.color;
    context.fillRect(screenX, particle.y, 2, 2);
  });
  context.globalAlpha = 1;
};

const drawRadar = () => {
  const radarWidth = 290;
  const radarHeight = 16;
  const radarX = canvas.width - radarWidth - 16;
  const radarY = 12;

  context.fillStyle = "rgba(12, 21, 38, 0.8)";
  context.fillRect(radarX, radarY, radarWidth, radarHeight);
  context.strokeStyle = "rgba(164, 185, 218, 0.9)";
  context.lineWidth = 1;
  context.strokeRect(radarX + 0.5, radarY + 0.5, radarWidth - 1, radarHeight - 1);

  const project = (x) => radarX + (wrapX(x) / world.width) * radarWidth;

  context.fillStyle = "#86c8ff";
  context.fillRect(project(player.x) - 1, radarY + 1, 3, radarHeight - 2);

  context.fillStyle = "#ffe1a7";
  state.enemies.forEach((enemy) => {
    const x = project(enemy.x);
    context.fillRect(x, radarY + 5, 2, 6);
  });

  context.fillStyle = "#c5f4b9";
  state.humans.forEach((human) => {
    if (!human.alive) {
      return;
    }
    const x = project(human.x);
    context.fillRect(x, radarY + 10, 2, 4);
  });
};

const drawHudText = () => {
  context.fillStyle = "rgba(230, 240, 255, 0.93)";
  context.font = "13px Tahoma";
  const message = state.planetDestroyed
    ? "Planet destroyed: clear mutants to restore"
    : "Rescue falling humans and stop abductions";
  context.fillText(message, 14, 22);
};

const render = () => {
  drawSky();
  drawBackgroundHills();
  drawTerrain();
  drawHumans();
  state.enemies.forEach(drawEnemy);
  drawBullets();
  drawParticles();
  drawPlayer();
  drawRadar();
  drawHudText();
};

const gameLoop = (timestamp) => {
  if (!state.lastFrameTime) {
    state.lastFrameTime = timestamp;
  }
  const frameTime = (timestamp - state.lastFrameTime) / 1000;
  state.lastFrameTime = timestamp;
  state.accumulator += frameTime;

  const step = 1 / 60;
  while (state.accumulator >= step) {
    if (state.running && !state.paused) {
      update(step);
    }
    state.accumulator -= step;
  }

  render();
  window.requestAnimationFrame(gameLoop);
};

const keyToAction = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  KeyA: "left",
  KeyD: "right",
  KeyW: "up",
  KeyS: "down",
  ShiftLeft: "thrust",
  ShiftRight: "thrust",
  Space: "fire",
  KeyB: "bomb",
  KeyH: "hyperspace",
};

const setAction = (action, isDown) => {
  if (!(action in input)) {
    return;
  }
  input[action] = isDown;
};

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyP") {
    event.preventDefault();
    togglePause();
    return;
  }
  const action = keyToAction[event.code];
  if (!action) {
    return;
  }
  event.preventDefault();
  setAction(action, true);
});

window.addEventListener("keyup", (event) => {
  const action = keyToAction[event.code];
  if (!action) {
    return;
  }
  setAction(action, false);
});

touchButtons.forEach((button) => {
  const action = button.dataset.action;
  const start = (event) => {
    event.preventDefault();
    setAction(action, true);
  };
  const end = (event) => {
    event.preventDefault();
    setAction(action, false);
  };
  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", end);
  button.addEventListener("pointerleave", end);
  button.addEventListener("pointercancel", end);
});

resetButton.addEventListener("click", () => {
  startGame();
});

pauseButton.addEventListener("click", () => {
  togglePause();
});

backButton.addEventListener("click", () => {
  window.location.href = "../index.html";
});

createStars();
createHumans();
updateHud();
updatePauseButton();
setStatus("Press Start to deploy.");
window.requestAnimationFrame(gameLoop);
