const canvas = document.getElementById("racer-canvas");
const context = canvas.getContext("2d");

const distanceElement = document.getElementById("distance");
const speedElement = document.getElementById("speed");
const passedElement = document.getElementById("passed");
const livesElement = document.getElementById("lives");
const statusElement = document.getElementById("status");
const resetButton = document.getElementById("reset-game");
const pauseButton = document.getElementById("toggle-pause");
const backButton = document.getElementById("back-button");
const touchButtons = document.querySelectorAll(".touch-controls button");

const inputState = {
  left: false,
  right: false,
  accelerate: false,
  brake: false,
};

const player = {
  laneOffset: 0,
  speed: 165,
  lives: 3,
  invulnerableTimer: 0,
};

const track = {
  curve: 0,
  targetCurve: 0,
  curveTimer: 0,
  offset: 0,
};

const colors = {
  skyTop: "#4a78a8",
  skyBottom: "#b7d2ea",
  mountainDark: "#52607a",
  mountainLight: "#6d7e9d",
  horizonGrass: "#436b4d",
  nearGrass: "#2d5738",
  roadA: "#596273",
  roadB: "#4c5566",
  shoulderA: "#f4f4f4",
  shoulderB: "#d65353",
  lane: "#f4d97d",
  playerBody: "#d63f37",
  playerTrim: "#f7f7f7",
  playerGlass: "#79b8d8",
};

const perspective = {
  nearRoadSway: 760,
  curveSway: 210,
  nearWeightPower: 2.75,
  farMountainParallax: 280,
  nearMountainParallax: 420,
  maxTrackOffset: 0.55,
};

const horizonY = 154;
const roadBottomY = canvas.height + 34;
const cars = [];

let passedCars = 0;
let distanceMiles = 0;
let spawnTimer = 0;
let lastTime = 0;
let running = false;
let paused = false;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateStatus(message) {
  statusElement.textContent = message;
}

function updatePauseButton() {
  pauseButton.textContent = paused ? "Resume" : "Pause";
}

function updateHud() {
  distanceElement.textContent = `${distanceMiles.toFixed(1)} mi`;
  speedElement.textContent = `${Math.round(player.speed)} mph`;
  passedElement.textContent = String(passedCars);
  livesElement.textContent = String(player.lives);
}

function projectY(depth) {
  const easedDepth = depth ** 2.45;
  return horizonY + easedDepth * (roadBottomY - horizonY);
}

function roadHalfWidth(depth) {
  return 12 + depth ** 1.9 * 368;
}

function roadCenter(depth) {
  const nearWeight = depth ** perspective.nearWeightPower;
  return (
    canvas.width / 2 +
    (track.offset * perspective.nearRoadSway + track.curve * perspective.curveSway) * nearWeight
  );
}

function drawBackground() {
  const farShift = track.offset * perspective.farMountainParallax;
  const nearShift = track.offset * perspective.nearMountainParallax;

  const skyGradient = context.createLinearGradient(0, 0, 0, horizonY + 90);
  skyGradient.addColorStop(0, colors.skyTop);
  skyGradient.addColorStop(1, colors.skyBottom);
  context.fillStyle = skyGradient;
  context.fillRect(0, 0, canvas.width, horizonY + 90);

  context.fillStyle = colors.mountainDark;
  context.beginPath();
  context.moveTo(0, horizonY + 30);
  for (let x = 0; x <= canvas.width; x += 24) {
    const wave = Math.sin((x + farShift) * 0.022) * 16;
    const ridge = Math.sin((x + farShift * 0.55) * 0.048) * 12;
    context.lineTo(x, horizonY + 28 - wave - ridge);
  }
  context.lineTo(canvas.width, horizonY + 90);
  context.lineTo(0, horizonY + 90);
  context.closePath();
  context.fill();

  context.fillStyle = colors.mountainLight;
  context.beginPath();
  context.moveTo(0, horizonY + 40);
  for (let x = 0; x <= canvas.width; x += 18) {
    const wave = Math.sin((x + nearShift) * 0.026) * 10;
    context.lineTo(x, horizonY + 40 - wave);
  }
  context.lineTo(canvas.width, horizonY + 90);
  context.lineTo(0, horizonY + 90);
  context.closePath();
  context.fill();

  const grassGradient = context.createLinearGradient(0, horizonY, 0, canvas.height);
  grassGradient.addColorStop(0, colors.horizonGrass);
  grassGradient.addColorStop(1, colors.nearGrass);
  context.fillStyle = grassGradient;
  context.fillRect(0, horizonY, canvas.width, canvas.height - horizonY);
}

function drawRoad() {
  const stripCount = 96;
  const stripeIndex = Math.floor(distanceMiles * 16);

  for (let i = stripCount - 1; i >= 0; i -= 1) {
    const nearDepth = i / stripCount;
    const farDepth = (i + 1) / stripCount;

    const yNear = projectY(nearDepth);
    const yFar = projectY(farDepth);

    const centerNear = roadCenter(nearDepth);
    const centerFar = roadCenter(farDepth);

    const roadNear = roadHalfWidth(nearDepth);
    const roadFar = roadHalfWidth(farDepth);

    const leftNear = centerNear - roadNear;
    const rightNear = centerNear + roadNear;
    const leftFar = centerFar - roadFar;
    const rightFar = centerFar + roadFar;

    const shoulderNear = roadNear + 10 + nearDepth * 34;
    const shoulderFar = roadFar + 10 + farDepth * 34;

    context.fillStyle = (i + stripeIndex) % 2 === 0 ? colors.shoulderA : colors.shoulderB;
    context.beginPath();
    context.moveTo(centerNear - shoulderNear, yNear);
    context.lineTo(centerNear + shoulderNear, yNear);
    context.lineTo(centerFar + shoulderFar, yFar);
    context.lineTo(centerFar - shoulderFar, yFar);
    context.closePath();
    context.fill();

    context.fillStyle = (i + stripeIndex) % 2 === 0 ? colors.roadA : colors.roadB;
    context.beginPath();
    context.moveTo(leftNear, yNear);
    context.lineTo(rightNear, yNear);
    context.lineTo(rightFar, yFar);
    context.lineTo(leftFar, yFar);
    context.closePath();
    context.fill();

    const laneVisible = (i + stripeIndex) % 9 < 3;
    if (laneVisible) {
      const markerNear = Math.max(1.5, roadNear * 0.02);
      const markerFar = Math.max(1, roadFar * 0.02);

      context.fillStyle = colors.lane;
      context.beginPath();
      context.moveTo(centerNear - markerNear, yNear);
      context.lineTo(centerNear + markerNear, yNear);
      context.lineTo(centerFar + markerFar, yFar);
      context.lineTo(centerFar - markerFar, yFar);
      context.closePath();
      context.fill();
    }
  }
}

function carColor(index) {
  const palette = ["#e08a2e", "#51a4cb", "#9d7ddb", "#67b86b", "#d95e66"];
  return palette[index % palette.length];
}

function drawCarSprite(x, y, width, height, bodyColor, detailColor) {
  const bottom = y + height * 0.52;
  const top = y - height * 0.52;
  const shoulder = width * 0.52;
  const roof = width * 0.28;

  context.fillStyle = "rgba(0, 0, 0, 0.2)";
  context.fillRect(x - width * 0.4 + 3, bottom - height * 0.1 + 4, width * 0.8, height * 0.22);

  context.fillStyle = bodyColor;
  context.beginPath();
  context.moveTo(x - shoulder, bottom);
  context.lineTo(x + shoulder, bottom);
  context.lineTo(x + roof, top + height * 0.2);
  context.lineTo(x - roof, top + height * 0.2);
  context.closePath();
  context.fill();

  context.fillStyle = detailColor;
  context.beginPath();
  context.moveTo(x - roof * 0.9, top + height * 0.25);
  context.lineTo(x + roof * 0.9, top + height * 0.25);
  context.lineTo(x + roof * 0.55, top + height * 0.55);
  context.lineTo(x - roof * 0.55, top + height * 0.55);
  context.closePath();
  context.fill();

  context.fillStyle = "#f7f7f7";
  context.fillRect(x - width * 0.34, y - height * 0.12, width * 0.68, height * 0.1);

  context.fillStyle = "#2c2f3f";
  context.fillRect(x - width * 0.46, bottom - height * 0.13, width * 0.16, height * 0.11);
  context.fillRect(x + width * 0.3, bottom - height * 0.13, width * 0.16, height * 0.11);

  context.fillStyle = "#d3223a";
  context.fillRect(x - width * 0.22, bottom - height * 0.08, width * 0.12, height * 0.06);
  context.fillRect(x + width * 0.1, bottom - height * 0.08, width * 0.12, height * 0.06);
}

function drawTrafficCar(trafficCar, index) {
  const depth = trafficCar.depth;
  const center = roadCenter(depth);
  const halfRoad = roadHalfWidth(depth);
  const x = center + trafficCar.lane * halfRoad * 0.78;
  const y = projectY(depth);

  const width = 8 + depth * 42;
  const height = 9 + depth * 52;

  drawCarSprite(x, y, width, height, carColor(index), "#d9eefc");
}

function drawTraffic() {
  const ordered = [...cars].sort((a, b) => a.depth - b.depth);
  ordered.forEach((trafficCar, index) => {
    drawTrafficCar(trafficCar, index);
  });
}

function playerScreenX() {
  const nearDepth = 0.98;
  return canvas.width / 2 + player.laneOffset * roadHalfWidth(nearDepth) * 0.8;
}

function drawPlayer() {
  const x = playerScreenX();
  const y = canvas.height - 66;
  const width = 48;
  const height = 64;

  if (player.invulnerableTimer > 0 && Math.floor(player.invulnerableTimer * 12) % 2 === 0) {
    return;
  }

  drawCarSprite(x, y, width, height, colors.playerBody, colors.playerGlass);

  context.fillStyle = colors.playerTrim;
  context.fillRect(x - width * 0.36, y - height * 0.06, width * 0.72, height * 0.12);
}

function drawHudLine() {
  context.strokeStyle = "rgba(255, 255, 255, 0.35)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, horizonY);
  context.lineTo(canvas.width, horizonY);
  context.stroke();
}

function drawFrame() {
  drawBackground();
  drawRoad();
  drawTraffic();
  drawPlayer();
  drawHudLine();
}

function setActionState(action, isDown) {
  if (!Object.prototype.hasOwnProperty.call(inputState, action)) {
    return;
  }
  inputState[action] = isDown;
}

function resetInputs() {
  inputState.left = false;
  inputState.right = false;
  inputState.accelerate = false;
  inputState.brake = false;
  touchButtons.forEach((button) => {
    button.classList.remove("is-active");
  });
}

function startGame() {
  player.laneOffset = 0;
  player.speed = 165;
  player.lives = 3;
  player.invulnerableTimer = 0;

  passedCars = 0;
  distanceMiles = 0;
  spawnTimer = 700;

  track.curve = 0;
  track.targetCurve = 0;
  track.curveTimer = 0;
  track.offset = 0;

  cars.length = 0;
  running = true;
  paused = false;
  resetButton.textContent = "Reset";
  updatePauseButton();
  updateStatus("Push for speed and stay clean through traffic.");
  updateHud();
}

function stopGame(message) {
  running = false;
  paused = false;
  resetButton.textContent = "Start";
  updatePauseButton();
  updateStatus(message);
}

function togglePause() {
  if (!running) {
    return;
  }
  paused = !paused;
  updatePauseButton();
  updateStatus(paused ? "Paused." : "Back on track.");
}

function spawnTrafficCar() {
  const lane = -0.68 + Math.random() * 1.36;
  const speed = 110 + Math.random() * 120;
  cars.push({ lane, speed, depth: 0.04 + Math.random() * 0.08 });
}

function crash(message) {
  if (player.invulnerableTimer > 0 || !running) {
    return;
  }

  player.lives -= 1;
  player.speed = 115;
  player.laneOffset *= 0.25;
  player.invulnerableTimer = 1.4;

  if (player.lives <= 0) {
    stopGame(message || "Out of lives. Press Start for another run.");
  } else {
    updateStatus(message || "Crash! Recover and keep racing.");
  }
  updateHud();
}

function updatePlayer(deltaSeconds) {
  const steering = (inputState.right ? 1 : 0) - (inputState.left ? 1 : 0);
  const steeringRate = 1.25 + player.speed / 340;
  player.laneOffset += steering * steeringRate * deltaSeconds;

  const acceleration = inputState.accelerate ? 170 : 0;
  const braking = inputState.brake ? 250 : 0;
  const rollingDrag = 56;
  player.speed += (acceleration - braking - rollingDrag) * deltaSeconds;
  player.speed = clamp(player.speed, 85, 320);

  player.laneOffset = clamp(player.laneOffset, -1.08, 1.08);
  if (Math.abs(player.laneOffset) > 0.92) {
    player.speed = Math.max(80, player.speed - 90 * deltaSeconds);
  }

  if (Math.abs(player.laneOffset) > 1.04) {
    crash("You slid off the shoulder!");
  }

  if (player.invulnerableTimer > 0) {
    player.invulnerableTimer = Math.max(0, player.invulnerableTimer - deltaSeconds);
  }
}

function updateTrack(deltaSeconds) {
  track.curveTimer -= deltaSeconds;
  if (track.curveTimer <= 0) {
    track.curveTimer = 2.3 + Math.random() * 2.2;
    track.targetCurve = (Math.random() * 2 - 1) * 0.82;
  }
  track.curve += (track.targetCurve - track.curve) * deltaSeconds * 0.36;
  track.offset += track.curve * player.speed * deltaSeconds * 0.0011;
  track.offset *= 1 - deltaSeconds * 0.08;
  track.offset = clamp(track.offset, -perspective.maxTrackOffset, perspective.maxTrackOffset);
}

function updateTraffic(deltaSeconds) {
  spawnTimer -= deltaSeconds * 1000;
  if (spawnTimer <= 0) {
    spawnTrafficCar();
    const spawnBias = clamp(player.speed / 320, 0, 1);
    spawnTimer = 620 + Math.random() * 820 - spawnBias * 160;
  }

  for (let i = cars.length - 1; i >= 0; i -= 1) {
    const trafficCar = cars[i];
    const relativeSpeed = player.speed - trafficCar.speed;
    const approach = 0.18 + (relativeSpeed + 120) / 620;
    trafficCar.depth += approach * deltaSeconds;

    if (trafficCar.depth > 1.08) {
      cars.splice(i, 1);
      passedCars += 1;
      continue;
    }

    const closeEnough = trafficCar.depth > 0.82;
    if (closeEnough && Math.abs(trafficCar.lane - player.laneOffset) < 0.17) {
      cars.splice(i, 1);
      crash("Traffic collision!");
    }
  }
}

function updateDistance(deltaSeconds) {
  distanceMiles += player.speed * deltaSeconds * 0.0046;
}

function step(time = 0) {
  const deltaMs = Math.min(48, Math.max(0, time - lastTime));
  const deltaSeconds = deltaMs / 1000;
  lastTime = time;

  if (running && !paused) {
    updatePlayer(deltaSeconds);
    updateTrack(deltaSeconds);
    updateTraffic(deltaSeconds);
    updateDistance(deltaSeconds);
    updateHud();
  }

  drawFrame();
  window.requestAnimationFrame(step);
}

function handleKeyDown(event) {
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    setActionState("left", true);
    event.preventDefault();
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    setActionState("right", true);
    event.preventDefault();
  }
  if (event.code === "ArrowUp" || event.code === "KeyW") {
    setActionState("accelerate", true);
    event.preventDefault();
  }
  if (event.code === "ArrowDown" || event.code === "KeyS") {
    setActionState("brake", true);
    event.preventDefault();
  }
  if (event.code === "KeyP") {
    togglePause();
  }
}

function handleKeyUp(event) {
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    setActionState("left", false);
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    setActionState("right", false);
  }
  if (event.code === "ArrowUp" || event.code === "KeyW") {
    setActionState("accelerate", false);
  }
  if (event.code === "ArrowDown" || event.code === "KeyS") {
    setActionState("brake", false);
  }
}

resetButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
backButton.addEventListener("click", () => {
  window.location.href = "../index.html";
});

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("blur", resetInputs);

touchButtons.forEach((button) => {
  const action = button.dataset.action;

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.classList.add("is-active");
    setActionState(action, true);
  });

  button.addEventListener("pointerup", (event) => {
    event.preventDefault();
    button.classList.remove("is-active");
    setActionState(action, false);
  });

  button.addEventListener("pointerleave", () => {
    button.classList.remove("is-active");
    setActionState(action, false);
  });

  button.addEventListener("pointercancel", () => {
    button.classList.remove("is-active");
    setActionState(action, false);
  });
});

updateHud();
updateStatus("Press Start to race.");
updatePauseButton();
drawFrame();
window.requestAnimationFrame(step);
