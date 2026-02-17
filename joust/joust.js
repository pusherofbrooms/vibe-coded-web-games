(function startJoustGame() {
  const C = window.JoustConstants;
  const canvas = document.getElementById("joust-canvas");
  const ctx = canvas.getContext("2d");
  const ui = window.JoustUi.createUiBindings();
  const state = window.JoustState.createInitialState();
  const GAME_OVER_RESTART_DELAY_SECONDS = 2;

  let lastTime = performance.now();
  let accumulator = 0;
  const fixedDt = 1 / 60;

  function acceleratePlayer(player, input, dt) {
    if (player.stunTimer > 0) {
      return;
    }

    const movingLeft = input.left && !input.right;
    const movingRight = input.right && !input.left;

    if (movingLeft) {
      player.vx -= C.PHYSICS.horizontalAcceleration * dt;
      player.facing = -1;
    } else if (movingRight) {
      player.vx += C.PHYSICS.horizontalAcceleration * dt;
      player.facing = 1;
    } else {
      const step = C.PHYSICS.horizontalDeceleration * dt;
      if (Math.abs(player.vx) <= step) {
        player.vx = 0;
      } else {
        player.vx -= Math.sign(player.vx) * step;
      }
    }

    player.vx = window.JoustPhysics.clamp(player.vx, -C.PHYSICS.maxHorizontalSpeed, C.PHYSICS.maxHorizontalSpeed);

    if ((input.flapPressed || (input.flapHeld && player.onGround)) && player.flapCooldown <= 0) {
      player.vy = Math.min(player.vy, C.PHYSICS.flapImpulse);
      player.flapCooldown = C.PHYSICS.flapCooldown;
      player.onGround = false;
    }
  }

  function updateTimers(dt) {
    const actors = [state.player].concat(state.enemies);
    for (const actor of actors) {
      actor.flapCooldown = Math.max(0, actor.flapCooldown - dt);
      actor.collisionLockTimer = Math.max(0, actor.collisionLockTimer - dt);
      actor.stunTimer = Math.max(0, actor.stunTimer - dt);
      actor.invulnerableTimer = Math.max(0, actor.invulnerableTimer - dt);
    }

    state.troll.cooldown = Math.max(0, state.troll.cooldown - dt);
  }

  function spawnFromQueue(dt) {
    if (!state.waveSpawnQueue.length) {
      return;
    }

    state.spawnTimer -= dt;
    if (state.spawnTimer > 0) {
      return;
    }

    const item = state.waveSpawnQueue.shift();
    const perch = window.JoustState.choosePerch();

    if (item.kind === "rider") {
      state.enemies.push(
        window.JoustState.createRider({
          x: perch.x,
          y: perch.y,
          tier: item.tier,
          type: "enemy",
          facing: Math.random() > 0.5 ? 1 : -1,
        }),
      );
    } else {
      state.eggs.push(window.JoustState.createEgg({ x: perch.x, y: perch.y - 12, tier: item.tier }));
    }

    state.spawnTimer = item.delay;
    state.uiNeedsSync = true;
  }

  function startWave(nextWaveNumber) {
    const config = window.JoustWaves.getWaveConfig(nextWaveNumber);

    state.waveNumber = nextWaveNumber;
    state.waveSpawnQueue = window.JoustState.buildWaveSpawnQueue(config);
    state.spawnTimer = 0.25;
    state.antiStallTimer = 0;
    state.pterodactylArmed = config.pterodactylScheduled;
    state.eggChainIndex = 0;
    state.phase = "running";
    state.statusMessage = config.hasEggWave ? `Wave ${nextWaveNumber}: Egg wave.` : `Wave ${nextWaveNumber} begins.`;

    if (config.pterodactylScheduled) {
      window.JoustCollisions.maybeSpawnPterodactyl(state, true);
    }

    state.uiNeedsSync = true;
  }

  function resetBoardForNewLife() {
    state.player = window.JoustState.createPlayer();
    state.player.invulnerableTimer = C.PLAYER.invulnerabilitySeconds;
    state.player.flapCooldown = 0;
    state.troll.grabbing = false;
    state.troll.targetId = null;
    state.troll.timer = 0;
    state.troll.flapCount = 0;
    state.eggChainIndex = 0;
  }

  function onPlayerDeath(extraPoints) {
    const bonus = extraPoints || 0;
    state.lives -= 1;
    if (bonus > 0) {
      state.score += bonus;
    }

    if (state.lives <= 0) {
      state.phase = "gameOver";
      state.restartLockTimer = GAME_OVER_RESTART_DELAY_SECONDS;
      state.statusMessage = `Defeat at wave ${state.waveNumber}. Press Start to play again.`;
      state.uiNeedsSync = true;
      return;
    }

    resetBoardForNewLife();
    state.statusMessage = "You were unhorsed. Continue the wave.";
    state.uiNeedsSync = true;
  }

  function updateEnemies(dt) {
    for (const enemy of state.enemies) {
      window.JoustAi.updateEnemyAi(enemy, state, dt);
      window.JoustPhysics.applyActorPhysics(enemy, dt);
    }
  }

  function updateEggsAndHatchlings(dt) {
    for (const egg of state.eggs) {
      window.JoustPhysics.applyActorPhysics(egg, dt);
    }

    window.JoustCollisions.updateEggLifecycle(state, dt);

    for (const hatchling of state.hatchlings) {
      window.JoustPhysics.moveGroundedWalker(hatchling, hatchling.targetPerchX, dt, C.HATCHLING.speed);
    }

    window.JoustCollisions.remountHatchlings(state);
  }

  function updatePterodactyls(dt) {
    for (const pterodactyl of state.pterodactyls) {
      window.JoustAi.updatePterodactylAi(pterodactyl, state.player, dt);
    }
    window.JoustCollisions.cleanupOffscreenPterodactyls(state);
  }

  function maybeAdvanceWave(dt) {
    const hostileCount = state.enemies.length + state.eggs.length + state.hatchlings.length + state.waveSpawnQueue.length;
    if (hostileCount > 0) {
      state.waveTransitionTimer = 0;
      return;
    }

    state.waveTransitionTimer += dt;
    if (state.waveTransitionTimer < C.WAVE.betweenWavesSeconds) {
      if (state.waveTransitionTimer < 0.08) {
        state.statusMessage = "Wave clear.";
        state.uiNeedsSync = true;
      }
      return;
    }

    startWave(state.waveNumber + 1);
    state.waveTransitionTimer = 0;
  }

  function updateRunning(dt, input) {
    if (input.pausePressed) {
      state.phase = "paused";
      state.statusMessage = "Paused.";
      state.uiNeedsSync = true;
      return;
    }

    updateTimers(dt);

    acceleratePlayer(state.player, input, dt);
    window.JoustPhysics.applyActorPhysics(state.player, dt);

    updateEnemies(dt);
    updateEggsAndHatchlings(dt);
    updatePterodactyls(dt);

    window.JoustCollisions.resolvePlayerEnemyCollisions(state, onPlayerDeath);
    window.JoustCollisions.resolvePterodactylCollisions(state, onPlayerDeath);
    window.JoustCollisions.resolvePlayerCollectibles(state);
    window.JoustCollisions.resolveLavaAndTroll(state, input, dt, onPlayerDeath);

    state.antiStallTimer += dt;
    if (state.antiStallTimer >= C.WAVE.antiStallPterodactylSeconds && state.enemies.length > 0) {
      window.JoustCollisions.maybeSpawnPterodactyl(state, true);
    }

    spawnFromQueue(dt);
    maybeAdvanceWave(dt);
  }

  function updatePaused(input) {
    if (input.pausePressed) {
      state.phase = "running";
      state.statusMessage = `Wave ${state.waveNumber} resumed.`;
      state.uiNeedsSync = true;
    }
  }

  function stepSimulation(dt) {
    const input = window.JoustInput.consumeFrameInput(state);
    state.restartLockTimer = Math.max(0, state.restartLockTimer - dt);

    if (state.phase === "ready" || state.phase === "gameOver") {
      if (input.flapPressed && state.restartLockTimer <= 0) {
        startGame();
      }
      return;
    }

    if (state.phase === "running") {
      updateRunning(dt, input);
    } else if (state.phase === "paused") {
      updatePaused(input);
    }
  }

  function frame(now) {
    const deltaSeconds = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    accumulator += deltaSeconds;

    while (accumulator >= fixedDt) {
      stepSimulation(fixedDt);
      accumulator -= fixedDt;
    }

    window.JoustRender.renderFrame(ctx, state, deltaSeconds);
    if (state.uiNeedsSync) {
      window.JoustUi.syncUi(state, ui);
    }

    requestAnimationFrame(frame);
  }

  function startGame() {
    state.phase = "running";
    state.score = 0;
    state.lives = 3;
    state.waveNumber = 0;
    state.enemies = [];
    state.eggs = [];
    state.hatchlings = [];
    state.pterodactyls = [];
    state.popups = [];
    state.waveSpawnQueue = [];
    state.waveTransitionTimer = 0;
    state.antiStallTimer = 0;
    state.restartLockTimer = 0;
    state.eggChainIndex = 0;
    state.troll.grabbing = false;
    state.troll.targetId = null;
    state.troll.timer = 0;
    state.troll.flapCount = 0;
    state.troll.cooldown = 0;
    resetBoardForNewLife();
    startWave(1);
  }

  ui.startButton.addEventListener("click", () => {
    if (state.restartLockTimer > 0) {
      return;
    }
    if (state.phase === "ready" || state.phase === "gameOver") {
      startGame();
      return;
    }
    startGame();
  });

  ui.pauseButton.addEventListener("click", () => {
    if (state.phase === "running") {
      state.phase = "paused";
      state.statusMessage = "Paused.";
      state.uiNeedsSync = true;
    } else if (state.phase === "paused") {
      state.phase = "running";
      state.statusMessage = `Wave ${state.waveNumber} resumed.`;
      state.uiNeedsSync = true;
    }
  });

  ui.backButton.addEventListener("click", () => {
    window.location.href = "../index.html";
  });

  window.JoustInput.attachInput(state, ui);
  window.JoustUi.syncUi(state, ui);
  requestAnimationFrame(frame);
})();
