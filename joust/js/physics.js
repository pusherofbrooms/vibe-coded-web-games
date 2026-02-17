(function initPhysicsModule() {
  const C = window.JoustConstants;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function wrapX(entity) {
    const margin = entity.width * 0.5;
    if (entity.x < -margin) {
      entity.x = C.CANVAS_WIDTH + margin;
    } else if (entity.x > C.CANVAS_WIDTH + margin) {
      entity.x = -margin;
    }
  }

  function aabbOverlap(a, b, padding) {
    return (
      a.x - a.width / 2 < b.x + b.width / 2 - padding
      && a.x + a.width / 2 > b.x - b.width / 2 + padding
      && a.y - a.height / 2 < b.y + b.height / 2 - padding
      && a.y + a.height / 2 > b.y - b.height / 2 + padding
    );
  }

  function checkPlatformLanding(entity, previousBottom) {
    entity.onGround = false;

    for (const platform of C.PLATFORM_LAYOUT) {
      const left = platform.x;
      const right = platform.x + platform.width;
      const top = platform.y;
      const bottom = platform.y + platform.height;
      const previousTop = previousBottom - entity.height;

      const withinHorizontal = entity.x + entity.width * 0.4 >= left && entity.x - entity.width * 0.4 <= right;
      const currentBottom = entity.y + entity.height / 2;
      const currentTop = entity.y - entity.height / 2;

      if (!withinHorizontal) {
        continue;
      }

      if (previousBottom <= top && currentBottom >= top && entity.vy >= 0) {
        entity.y = top - entity.height / 2;
        entity.vy = 0;
        entity.onGround = true;
        return;
      }

      if (previousTop >= bottom && currentTop <= bottom && entity.vy < 0) {
        entity.y = bottom + entity.height / 2;
        entity.vy = 0;
        return;
      }
    }
  }

  function applyActorPhysics(entity, dt) {
    const dragFactor = Math.max(0, 1 - C.PHYSICS.airDragPerSecond * dt);
    entity.vx *= dragFactor;

    entity.vy += C.PHYSICS.gravity * dt;
    entity.vy = clamp(entity.vy, C.PHYSICS.maxRiseSpeed, C.PHYSICS.maxFallSpeed);

    const previousBottom = entity.y + entity.height / 2;
    entity.x += entity.vx * dt;
    entity.y += entity.vy * dt;

    wrapX(entity);
    checkPlatformLanding(entity, previousBottom);

    const topLimit = entity.height / 2;
    if (entity.y < topLimit) {
      entity.y = topLimit;
      entity.vy = Math.max(0, entity.vy);
    }

    if (entity.y > C.CANVAS_HEIGHT + entity.height) {
      entity.y = C.CANVAS_HEIGHT + entity.height;
    }
  }

  function moveGroundedWalker(entity, targetX, dt, speed) {
    entity.vx = targetX > entity.x ? speed : -speed;
    entity.x += entity.vx * dt;
    wrapX(entity);

    const previousBottom = entity.y + entity.height / 2;
    entity.vy += C.PHYSICS.gravity * dt;
    entity.vy = clamp(entity.vy, -220, 480);
    entity.y += entity.vy * dt;
    checkPlatformLanding(entity, previousBottom);
  }

  function inLava(entity) {
    return entity.y + entity.height / 2 >= C.HAZARDS.lavaY;
  }

  function belowLavaKillLine(entity) {
    return entity.y + entity.height / 2 >= C.HAZARDS.lavaKillY;
  }

  window.JoustPhysics = {
    clamp,
    aabbOverlap,
    applyActorPhysics,
    moveGroundedWalker,
    inLava,
    belowLavaKillLine,
  };
})();
