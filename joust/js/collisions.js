(function initCollisionModule() {
  const C = window.JoustConstants;

  function lanceTip(rider) {
    return {
      x: rider.x + C.COMBAT.lanceForwardOffset * rider.facing,
      y: rider.y + C.COMBAT.lanceHeightOffset,
    };
  }

  function enqueuePopup(state, text, x, y, color) {
    state.popups.push({ text, x, y, color, ttl: 0.9 });
  }

  function scoreForEnemyTier(tier) {
    if (tier === "bounder") {
      return C.SCORING.bounder;
    }
    if (tier === "hunter") {
      return C.SCORING.hunter;
    }
    return C.SCORING.shadowLord;
  }

  function nextChainScore(state) {
    const score = C.SCORING.chainValues[Math.min(state.eggChainIndex, C.SCORING.chainValues.length - 1)];
    state.eggChainIndex = Math.min(state.eggChainIndex + 1, C.SCORING.chainValues.length - 1);
    return score;
  }

  function bounceApart(player, enemy) {
    player.vx = -enemy.facing * C.COMBAT.bounceX;
    player.vy = C.COMBAT.bounceY;
    enemy.vx = player.facing * C.COMBAT.bounceX;
    enemy.vy = C.COMBAT.bounceY;
    player.stunTimer = 0.2;
    enemy.stunTimer = 0.25;
    player.collisionLockTimer = 0.18;
    enemy.collisionLockTimer = 0.18;
  }

  function separateActorsHorizontally(player, enemy) {
    const push = 14;
    const direction = player.x <= enemy.x ? -1 : 1;

    player.x += direction * push;
    enemy.x -= direction * push;

    if (player.x < 0) {
      player.x += C.CANVAS_WIDTH;
    } else if (player.x > C.CANVAS_WIDTH) {
      player.x -= C.CANVAS_WIDTH;
    }

    if (enemy.x < 0) {
      enemy.x += C.CANVAS_WIDTH;
    } else if (enemy.x > C.CANVAS_WIDTH) {
      enemy.x -= C.CANVAS_WIDTH;
    }
  }

  function resolvePlayerEnemyCollisions(state, onPlayerDeath) {
    const player = state.player;

    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      if (player.collisionLockTimer > 0 || enemy.collisionLockTimer > 0) {
        continue;
      }
      if (!window.JoustPhysics.aabbOverlap(player, enemy, C.COMBAT.collisionPadding)) {
        continue;
      }

      const playerLance = lanceTip(player);
      const enemyLance = lanceTip(enemy);
      const delta = playerLance.y - enemyLance.y;

      if (Math.abs(delta) <= C.COMBAT.equalTolerance) {
        bounceApart(player, enemy);
        separateActorsHorizontally(player, enemy);
        continue;
      }

      if (delta < 0) {
        const points = scoreForEnemyTier(enemy.tier);
        state.score += points;
        enqueuePopup(state, String(points), enemy.x, enemy.y - 20, "#fff3a7");
        state.eggs.push(window.JoustState.createEgg({ x: enemy.x, y: enemy.y, tier: enemy.tier }));
        state.enemies.splice(i, 1);
        state.uiNeedsSync = true;
      } else if (player.invulnerableTimer <= 0) {
        onPlayerDeath(C.SCORING.playerDeathBonus);
        return;
      } else {
        bounceApart(player, enemy);
        separateActorsHorizontally(player, enemy);
      }
    }
  }

  function resolvePlayerCollectibles(state) {
    const player = state.player;

    for (let i = state.eggs.length - 1; i >= 0; i -= 1) {
      const egg = state.eggs[i];
      if (!window.JoustPhysics.aabbOverlap(player, egg, 0)) {
        continue;
      }
      const points = nextChainScore(state);
      state.score += points;
      enqueuePopup(state, String(points), egg.x, egg.y - 14, "#ffe8ad");
      state.eggs.splice(i, 1);
      state.uiNeedsSync = true;
    }

    for (let i = state.hatchlings.length - 1; i >= 0; i -= 1) {
      const hatchling = state.hatchlings[i];
      if (!window.JoustPhysics.aabbOverlap(player, hatchling, 0)) {
        continue;
      }
      const points = nextChainScore(state);
      state.score += points;
      enqueuePopup(state, String(points), hatchling.x, hatchling.y - 14, "#ffdb8a");
      state.hatchlings.splice(i, 1);
      state.uiNeedsSync = true;
    }
  }

  function resolvePterodactylCollisions(state, onPlayerDeath) {
    const player = state.player;

    for (let i = state.pterodactyls.length - 1; i >= 0; i -= 1) {
      const pterodactyl = state.pterodactyls[i];
      if (!window.JoustPhysics.aabbOverlap(player, pterodactyl, 0)) {
        continue;
      }

      const mouthX = pterodactyl.x + Math.sign(pterodactyl.vx || 1) * 14;
      const mouthY = pterodactyl.y - 2;
      const playerLance = lanceTip(player);
      const dx = playerLance.x - mouthX;
      const dy = playerLance.y - mouthY;

      if (dx * dx + dy * dy <= 22 * 22 && playerLance.y < mouthY + 8) {
        state.score += C.SCORING.pterodactyl;
        enqueuePopup(state, String(C.SCORING.pterodactyl), pterodactyl.x, pterodactyl.y - 18, "#a5fff0");
        state.pterodactyls.splice(i, 1);
        state.uiNeedsSync = true;
        continue;
      }

      if (player.invulnerableTimer <= 0) {
        onPlayerDeath();
        return;
      }
    }
  }

  function resolveLavaAndTroll(state, input, dt, onPlayerDeath) {
    const player = state.player;
    const troll = state.troll;

    if (!troll.grabbing && troll.cooldown <= 0 && window.JoustPhysics.inLava(player) && player.invulnerableTimer <= 0) {
      troll.grabbing = true;
      troll.targetId = player.id;
      troll.timer = C.HAZARDS.trollGrabWindowSeconds;
      troll.flapCount = 0;
      state.statusMessage = "Lava Troll grabbed you. Flap rapidly to escape.";
      state.uiNeedsSync = true;
    }

    if (troll.grabbing) {
      troll.timer -= dt;
      player.vx *= 0.88;
      player.vy = Math.max(player.vy, 120);
      player.y += 60 * dt;

      if (input.flapPressed) {
        troll.flapCount += 1;
      }

      if (troll.flapCount >= C.HAZARDS.trollRequiredFlaps) {
        troll.grabbing = false;
        troll.targetId = null;
        troll.cooldown = C.HAZARDS.trollRecoverySeconds;
        player.vy = -460;
        player.y = C.HAZARDS.lavaY - player.height;
        state.statusMessage = "Escaped the Lava Troll.";
        state.uiNeedsSync = true;
      } else if (troll.timer <= 0 || window.JoustPhysics.belowLavaKillLine(player)) {
        troll.grabbing = false;
        troll.targetId = null;
        troll.cooldown = C.HAZARDS.trollRecoverySeconds;
        onPlayerDeath();
        return;
      }
    }

    state.enemies = state.enemies.filter((enemy) => !window.JoustPhysics.belowLavaKillLine(enemy));

    for (let i = state.eggs.length - 1; i >= 0; i -= 1) {
      if (window.JoustPhysics.belowLavaKillLine(state.eggs[i])) {
        state.eggs.splice(i, 1);
      }
    }

    for (let i = state.hatchlings.length - 1; i >= 0; i -= 1) {
      if (window.JoustPhysics.belowLavaKillLine(state.hatchlings[i])) {
        state.hatchlings.splice(i, 1);
      }
    }
  }

  function updateEggLifecycle(state, dt) {
    for (let i = state.eggs.length - 1; i >= 0; i -= 1) {
      const egg = state.eggs[i];
      egg.hatchTimer -= dt;
      if (egg.hatchTimer <= 0) {
        state.eggs.splice(i, 1);
        state.hatchlings.push(window.JoustState.createHatchling({ x: egg.x, y: egg.y, tier: egg.tier }));
      }
    }
  }

  function remountHatchlings(state) {
    for (let i = state.hatchlings.length - 1; i >= 0; i -= 1) {
      const hatchling = state.hatchlings[i];
      const dx = hatchling.targetPerchX - hatchling.x;
      const dy = hatchling.targetPerchY - hatchling.y;
      if (dx * dx + dy * dy <= C.HATCHLING.remountRadius * C.HATCHLING.remountRadius) {
        state.hatchlings.splice(i, 1);
        state.enemies.push(
          window.JoustState.createRider({
            x: hatchling.targetPerchX,
            y: hatchling.targetPerchY,
            tier: hatchling.tier,
            type: "enemy",
            facing: Math.random() > 0.5 ? 1 : -1,
          }),
        );
        state.statusMessage = "A hatchling found a new mount.";
        state.uiNeedsSync = true;
      }
    }
  }

  function maybeSpawnPterodactyl(state, forced) {
    if (state.pterodactyls.length > 0) {
      return;
    }
    if (!forced && state.waveNumber < 8) {
      return;
    }
    state.pterodactyls.push(window.JoustState.createPterodactyl(Math.random() > 0.5 ? "left" : "right"));
    state.antiStallTimer = 0;
    state.pterodactylArmed = false;
    state.statusMessage = "Pterodactyl incoming.";
    state.uiNeedsSync = true;
  }

  function cleanupOffscreenPterodactyls(state) {
    state.pterodactyls = state.pterodactyls.filter((pterodactyl) => pterodactyl.x > -90 && pterodactyl.x < C.CANVAS_WIDTH + 90);
  }

  window.JoustCollisions = {
    resolvePlayerEnemyCollisions,
    resolvePlayerCollectibles,
    resolvePterodactylCollisions,
    resolveLavaAndTroll,
    updateEggLifecycle,
    remountHatchlings,
    maybeSpawnPterodactyl,
    cleanupOffscreenPterodactyls,
  };
})();
