(function initStateModule() {
  const C = window.JoustConstants;
  let nextEntityId = 1;

  function entityId(prefix) {
    nextEntityId += 1;
    return `${prefix}-${nextEntityId}`;
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function choosePerch() {
    return C.SPAWN_PERCHES[Math.floor(Math.random() * C.SPAWN_PERCHES.length)];
  }

  function nearestPerch(x, y) {
    let best = C.SPAWN_PERCHES[0];
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const perch of C.SPAWN_PERCHES) {
      const dx = perch.x - x;
      const dy = perch.y - y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = perch;
      }
    }

    return best;
  }

  function createRider(options) {
    const { x, y, tier, type, facing } = options;
    return {
      id: entityId(type),
      type,
      tier,
      x,
      y,
      width: 40,
      height: 30,
      vx: 0,
      vy: 0,
      facing,
      flapCooldown: 0,
      collisionLockTimer: 0,
      onGround: false,
      stunTimer: 0,
      invulnerableTimer: type === "player" ? C.PLAYER.invulnerabilitySeconds : 0.65,
      aiDecisionTimer: randomBetween(0.35, 0.9),
      aiTargetX: x,
      aiTargetY: y,
    };
  }

  function createPlayer() {
    return createRider({
      x: C.PLAYER.startX,
      y: C.PLAYER.startY,
      tier: "player",
      type: "player",
      facing: 1,
    });
  }

  function createEgg(options) {
    const { x, y, tier } = options;
    return {
      id: entityId("egg"),
      tier,
      x,
      y,
      width: C.EGG.width,
      height: C.EGG.height,
      vx: randomBetween(-40, 40),
      vy: -130,
      onGround: false,
      hatchTimer: C.EGG.hatchSeconds,
    };
  }

  function createHatchling(options) {
    const { x, y, tier } = options;
    const perch = nearestPerch(x, y);
    return {
      id: entityId("hatchling"),
      tier,
      x,
      y,
      width: C.HATCHLING.width,
      height: C.HATCHLING.height,
      vx: 0,
      vy: 0,
      onGround: false,
      targetPerchX: perch.x,
      targetPerchY: perch.y,
    };
  }

  function createPterodactyl(side) {
    const spawnLeft = side === "left";
    return {
      id: entityId("pterodactyl"),
      x: spawnLeft ? -C.PTERODACTYL.width : C.CANVAS_WIDTH + C.PTERODACTYL.width,
      y: randomBetween(70, 190),
      width: C.PTERODACTYL.width,
      height: C.PTERODACTYL.height,
      vx: spawnLeft ? C.PTERODACTYL.speed : -C.PTERODACTYL.speed,
      vy: 0,
      mouthOffsetX: spawnLeft ? 16 : -16,
    };
  }

  function buildWaveSpawnQueue(config) {
    const queue = [];

    if (config.hasEggWave) {
      const eggCount = Math.max(6, config.bounder + config.hunter + config.shadowLord + 3);
      for (let i = 0; i < eggCount; i += 1) {
        const tier = i % 9 === 0 && config.shadowLord > 0 ? "shadowLord" : i % 3 === 0 && config.hunter > 0 ? "hunter" : "bounder";
        queue.push({
          kind: "egg",
          tier,
          delay: C.WAVE.spawnDelay * 0.22,
        });
      }
      return queue;
    }

    for (let i = 0; i < config.bounder; i += 1) {
      queue.push({ kind: "rider", tier: "bounder", delay: C.WAVE.spawnDelay });
    }
    for (let i = 0; i < config.hunter; i += 1) {
      queue.push({ kind: "rider", tier: "hunter", delay: C.WAVE.spawnDelay });
    }
    for (let i = 0; i < config.shadowLord; i += 1) {
      queue.push({ kind: "rider", tier: "shadowLord", delay: C.WAVE.spawnDelay * 1.1 });
    }

    return queue.sort(() => Math.random() - 0.5);
  }

  function createInitialState() {
    return {
      phase: "ready",
      statusMessage: "Press Start to begin your joust.",
      score: 0,
      lives: 3,
      waveNumber: 0,
      eggChainIndex: 0,
      player: createPlayer(),
      enemies: [],
      eggs: [],
      hatchlings: [],
      pterodactyls: [],
      popups: [],
      waveSpawnQueue: [],
      spawnTimer: 0,
      waveTransitionTimer: 0,
      antiStallTimer: 0,
      restartLockTimer: 0,
      pterodactylArmed: false,
      lavaGlowPhase: 0,
      troll: {
        grabbing: false,
        targetId: null,
        timer: 0,
        flapCount: 0,
        cooldown: 0,
      },
      arena: {
        platforms: C.PLATFORM_LAYOUT,
        lavaY: C.HAZARDS.lavaY,
      },
      input: {
        left: false,
        right: false,
        flapHeld: false,
        flapPressed: false,
        pausePressed: false,
      },
      uiNeedsSync: true,
    };
  }

  window.JoustState = {
    randomBetween,
    choosePerch,
    createRider,
    createPlayer,
    createEgg,
    createHatchling,
    createPterodactyl,
    buildWaveSpawnQueue,
    createInitialState,
  };
})();
