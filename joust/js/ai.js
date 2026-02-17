(function initAiModule() {
  const C = window.JoustConstants;

  function approach(current, target, maxDelta) {
    if (current < target) {
      return Math.min(target, current + maxDelta);
    }
    return Math.max(target, current - maxDelta);
  }

  function findBypassTarget(enemy, player) {
    for (const platform of C.PLATFORM_LAYOUT) {
      const top = platform.y;
      const bottom = platform.y + platform.height;
      const horizontalMargin = 12;
      const enemyWithinColumn = enemy.x >= platform.x - horizontalMargin && enemy.x <= platform.x + platform.width + horizontalMargin;
      const playerWithinColumn = player.x >= platform.x - horizontalMargin && player.x <= platform.x + platform.width + horizontalMargin;
      const enemyUnderPlatform = enemy.y > bottom + 4;
      const enemyAbovePlatform = enemy.y < top - 4;
      const playerUnderPlatform = player.y > bottom + 4;
      const playerAbovePlatform = player.y < top - 4;
      const blockedVerticalRoute = (enemyUnderPlatform && playerAbovePlatform) || (enemyAbovePlatform && playerUnderPlatform);

      if (!enemyWithinColumn || !playerWithinColumn || !blockedVerticalRoute) {
        continue;
      }

      const leftExit = platform.x - 24;
      const rightExit = platform.x + platform.width + 24;
      const useLeft = Math.abs(enemy.x - leftExit) < Math.abs(enemy.x - rightExit);

      return {
        x: useLeft ? leftExit : rightExit,
        y: enemy.y + 24,
      };
    }

    return null;
  }

  function updateEnemyAi(enemy, state, dt) {
    if (enemy.stunTimer > 0) {
      return;
    }

    const player = state.player;
    const profile = C.ENEMY_TIERS[enemy.tier];
    if (!profile) {
      return;
    }

    enemy.aiDecisionTimer -= dt;
    if (enemy.aiDecisionTimer <= 0) {
      enemy.aiDecisionTimer = window.JoustState.randomBetween(profile.reactionMin, profile.reactionMax);
      const bypass = findBypassTarget(enemy, player);
      if (bypass) {
        enemy.aiTargetX = bypass.x;
        enemy.aiTargetY = bypass.y;
      } else {
        const predictiveX = player.x + player.vx * 0.28;
        enemy.aiTargetX = predictiveX + window.JoustState.randomBetween(-26, 26);
        enemy.aiTargetY = player.y + window.JoustState.randomBetween(-38, 38);
      }
    }

    const dir = enemy.aiTargetX > enemy.x ? 1 : -1;
    enemy.facing = dir;
    const desiredSpeed = dir * profile.maxSpeed;
    enemy.vx = approach(enemy.vx, desiredSpeed, profile.accel * dt);

    const shouldFlap = enemy.y > enemy.aiTargetY + 18 || (enemy.onGround && Math.random() < profile.flapBias * dt * 7.5);
    if (shouldFlap && enemy.flapCooldown <= 0) {
      enemy.vy = Math.min(enemy.vy, C.PHYSICS.flapImpulse * window.JoustState.randomBetween(0.92, 1.08));
      enemy.flapCooldown = C.PHYSICS.flapCooldown * window.JoustState.randomBetween(0.9, 1.1);
      enemy.onGround = false;
    }
  }

  function updatePterodactylAi(pterodactyl, player, dt) {
    const targetY = player.y - 14;
    const dy = targetY - pterodactyl.y;
    pterodactyl.vy += dy * C.PTERODACTYL.verticalBias * dt;
    pterodactyl.vy = Math.max(-160, Math.min(160, pterodactyl.vy));
    pterodactyl.y += pterodactyl.vy * dt;
    pterodactyl.x += pterodactyl.vx * dt;
  }

  window.JoustAi = {
    updateEnemyAi,
    updatePterodactylAi,
  };
})();
