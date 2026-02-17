(function initRenderModule() {
  const C = window.JoustConstants;

  function drawBackground(ctx, state) {
    const gradient = ctx.createLinearGradient(0, 0, 0, C.CANVAS_HEIGHT);
    gradient.addColorStop(0, C.COLORS.skyTop);
    gradient.addColorStop(1, C.COLORS.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, C.CANVAS_WIDTH, C.CANVAS_HEIGHT);

    ctx.save();
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 80; i += 1) {
      const x = (i * 97) % C.CANVAS_WIDTH;
      const y = ((i * 173) % 350) + 8;
      ctx.fillStyle = i % 7 === 0 ? "#c8dbff" : "#ffffff";
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.restore();

    ctx.fillStyle = "rgba(19, 29, 53, 0.35)";
    ctx.beginPath();
    ctx.moveTo(0, 425);
    ctx.lineTo(170, 355);
    ctx.lineTo(270, 420);
    ctx.lineTo(430, 340);
    ctx.lineTo(590, 430);
    ctx.lineTo(710, 365);
    ctx.lineTo(C.CANVAS_WIDTH, 425);
    ctx.lineTo(C.CANVAS_WIDTH, C.CANVAS_HEIGHT);
    ctx.lineTo(0, C.CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fill();

    const lavaGradient = ctx.createLinearGradient(0, C.HAZARDS.lavaY, 0, C.CANVAS_HEIGHT);
    lavaGradient.addColorStop(0, C.COLORS.lavaTop);
    lavaGradient.addColorStop(1, C.COLORS.lavaBottom);
    ctx.fillStyle = lavaGradient;
    ctx.fillRect(0, C.HAZARDS.lavaY, C.CANVAS_WIDTH, C.CANVAS_HEIGHT - C.HAZARDS.lavaY);

    state.lavaGlowPhase += 0.05;
    ctx.fillStyle = C.COLORS.lavaGlow;
    ctx.fillRect(0, C.HAZARDS.lavaY - (Math.sin(state.lavaGlowPhase) + 1) * 4, C.CANVAS_WIDTH, 12);
  }

  function drawPlatforms(ctx) {
    for (const platform of C.PLATFORM_LAYOUT) {
      ctx.fillStyle = C.COLORS.platform;
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.fillStyle = C.COLORS.platformLight;
      ctx.fillRect(platform.x + 1, platform.y + 1, platform.width - 2, 4);
      ctx.fillStyle = C.COLORS.platformShadow;
      ctx.fillRect(platform.x + 1, platform.y + platform.height - 4, platform.width - 2, 3);
    }
  }

  function drawWingedRider(ctx, rider, color, accent, flash) {
    ctx.save();
    if (flash) {
      ctx.globalAlpha = 0.48 + Math.sin(Date.now() * 0.025) * 0.24;
    }

    ctx.translate(rider.x, rider.y);
    ctx.scale(rider.facing, 1);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.ellipse(-8, -3, 16, 7, -0.18, 0, Math.PI * 2);
    ctx.ellipse(8, -3, 16, 7, 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.fillRect(-4, -18, 8, 14);

    ctx.strokeStyle = "#f4f4f4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, -14);
    ctx.lineTo(24, -18);
    ctx.stroke();

    ctx.fillStyle = "#fce5c7";
    ctx.beginPath();
    ctx.arc(0, -21, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawEgg(ctx, egg) {
    ctx.fillStyle = C.COLORS.egg;
    ctx.beginPath();
    ctx.ellipse(egg.x, egg.y, egg.width * 0.5, egg.height * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c4c4b8";
    ctx.stroke();
  }

  function drawHatchling(ctx, hatchling) {
    ctx.fillStyle = C.COLORS.hatchling;
    ctx.fillRect(hatchling.x - 6, hatchling.y - 8, 12, 10);
    ctx.fillRect(hatchling.x - 3, hatchling.y - 15, 7, 8);
    ctx.strokeStyle = "#8e5e2f";
    ctx.beginPath();
    ctx.moveTo(hatchling.x - 3, hatchling.y + 2);
    ctx.lineTo(hatchling.x - 5, hatchling.y + 9);
    ctx.moveTo(hatchling.x + 3, hatchling.y + 2);
    ctx.lineTo(hatchling.x + 5, hatchling.y + 9);
    ctx.stroke();
  }

  function drawPterodactyl(ctx, pterodactyl) {
    const facing = Math.sign(pterodactyl.vx || 1);
    ctx.save();
    ctx.translate(pterodactyl.x, pterodactyl.y);
    ctx.scale(facing, 1);
    ctx.fillStyle = C.COLORS.pterodactyl;
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(-4, -9);
    ctx.lineTo(18, -4);
    ctx.lineTo(6, 3);
    ctx.lineTo(18, 8);
    ctx.lineTo(-4, 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#194b57";
    ctx.fillRect(12, -2, 9, 4);
    ctx.restore();
  }

  function drawPopups(ctx, state, dt) {
    for (let i = state.popups.length - 1; i >= 0; i -= 1) {
      const popup = state.popups[i];
      popup.ttl -= dt;
      popup.y -= 20 * dt;
      if (popup.ttl <= 0) {
        state.popups.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, popup.ttl / 0.9);
      ctx.fillStyle = popup.color;
      ctx.font = "bold 15px Tahoma, sans-serif";
      ctx.fillText(popup.text, popup.x - 10, popup.y);
      ctx.restore();
    }
  }

  function drawInCanvasHud(ctx, state) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(10, 8, 280, 32);
    ctx.fillStyle = C.COLORS.text;
    ctx.font = "bold 14px Tahoma, sans-serif";
    ctx.fillText(`Wave ${state.waveNumber}`, 18, 28);
    ctx.fillText(`Enemies ${state.enemies.length + state.eggs.length + state.hatchlings.length}`, 98, 28);
    if (state.troll.grabbing) {
      ctx.fillStyle = "#ffe08f";
      ctx.fillText(`Escape: ${state.troll.flapCount}/6`, 220, 28);
    }
  }

  function renderFrame(ctx, state, dt) {
    drawBackground(ctx, state);
    drawPlatforms(ctx);

    for (const egg of state.eggs) {
      drawEgg(ctx, egg);
    }

    for (const hatchling of state.hatchlings) {
      drawHatchling(ctx, hatchling);
    }

    for (const enemy of state.enemies) {
      const profile = C.ENEMY_TIERS[enemy.tier];
      drawWingedRider(ctx, enemy, profile.color, "#253044", enemy.invulnerableTimer > 0);
    }

    for (const pterodactyl of state.pterodactyls) {
      drawPterodactyl(ctx, pterodactyl);
    }

    drawWingedRider(ctx, state.player, C.COLORS.player, C.COLORS.playerAccent, state.player.invulnerableTimer > 0);

    if (state.phase === "paused") {
      ctx.fillStyle = "rgba(10, 14, 26, 0.42)";
      ctx.fillRect(0, 0, C.CANVAS_WIDTH, C.CANVAS_HEIGHT);
      ctx.fillStyle = C.COLORS.white;
      ctx.font = "bold 38px Tahoma, sans-serif";
      ctx.fillText("Paused", C.CANVAS_WIDTH / 2 - 65, C.CANVAS_HEIGHT / 2 - 8);
    }

    if (state.phase === "gameOver") {
      ctx.fillStyle = "rgba(16, 10, 8, 0.56)";
      ctx.fillRect(0, 0, C.CANVAS_WIDTH, C.CANVAS_HEIGHT);
      ctx.fillStyle = "#fff1dd";
      ctx.font = "bold 42px Tahoma, sans-serif";
      ctx.fillText("Game Over", C.CANVAS_WIDTH / 2 - 120, C.CANVAS_HEIGHT / 2 - 14);
    }

    drawPopups(ctx, state, dt);
    drawInCanvasHud(ctx, state);
  }

  window.JoustRender = {
    renderFrame,
  };
})();
