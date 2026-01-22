const playfieldCanvas = document.getElementById("playfield");
const scoreElement = document.getElementById("score");
const livesElement = document.getElementById("lives");
const levelElement = document.getElementById("level");
const statusElement = document.getElementById("status");
const resetButton = document.getElementById("reset-game");
const pauseButton = document.getElementById("toggle-pause");
const backButton = document.getElementById("back-button");
const touchButtons = document.querySelectorAll(".touch-controls button");

const context = playfieldCanvas.getContext("2d");

const playfieldWidth = playfieldCanvas.width;
const playfieldHeight = playfieldCanvas.height;

const paddle = {
  width: 110,
  height: 14,
  speed: 420,
  x: 0,
  y: playfieldHeight - 32,
};

const ball = {
  radius: 7,
  speed: 260,
  x: playfieldWidth / 2,
  y: playfieldHeight / 2,
  velocityX: 0,
  velocityY: 0,
  launched: false,
};

const brickLayout = {
  rows: 5,
  columns: 10,
  width: 52,
  height: 18,
  padding: 8,
  offsetTop: 50,
  offsetLeft: 30,
};

const brickColors = ["#f38c85", "#f3c26b", "#92d48c", "#6fb3e8", "#b08be8"];

let bricks = [];
let score = 0;
let lives = 3;
let level = 1;
let lastTime = 0;
let gameActive = false;
let paused = false;
let leftPressed = false;
let rightPressed = false;

function createBricks() {
  bricks = [];
  for (let row = 0; row < brickLayout.rows; row += 1) {
    for (let column = 0; column < brickLayout.columns; column += 1) {
      bricks.push({
        row,
        column,
        x: brickLayout.offsetLeft + column * (brickLayout.width + brickLayout.padding),
        y: brickLayout.offsetTop + row * (brickLayout.height + brickLayout.padding),
        color: brickColors[row % brickColors.length],
        active: true,
      });
    }
  }
}

function resetPaddle() {
  paddle.x = (playfieldWidth - paddle.width) / 2;
  paddle.y = playfieldHeight - 32;
}

function resetBall() {
  ball.x = paddle.x + paddle.width / 2;
  ball.y = paddle.y - ball.radius - 2;
  ball.velocityX = 0;
  ball.velocityY = 0;
  ball.launched = false;
}

function updateScoreboard() {
  scoreElement.textContent = score;
  livesElement.textContent = lives;
  levelElement.textContent = level;
}

function updateStatus(message) {
  statusElement.textContent = message;
}

function updatePauseButton() {
  pauseButton.textContent = paused ? "Resume" : "Pause";
}

function startGame() {
  score = 0;
  lives = 3;
  level = 1;
  lastTime = 0;
  gameActive = true;
  paused = false;
  resetButton.textContent = "Reset";
  updatePauseButton();
  resetPaddle();
  resetBall();
  createBricks();
  updateScoreboard();
  updateStatus("Press Space to launch the ball.");
}

function endGame(won) {
  gameActive = false;
  paused = false;
  resetButton.textContent = "Start";
  updatePauseButton();
  if (won) {
    updateStatus("You cleared the wall! Press Start to play again.");
  } else {
    updateStatus("Out of lives. Press Start to try again.");
  }
}

function togglePause() {
  if (!gameActive) {
    return;
  }
  paused = !paused;
  updatePauseButton();
  updateStatus(paused ? "Paused." : "Press Space to launch the ball.");
}

function launchBall() {
  if (!gameActive || paused || ball.launched) {
    return;
  }
  const direction = Math.random() < 0.5 ? -1 : 1;
  ball.velocityX = direction * ball.speed * 0.6;
  ball.velocityY = -ball.speed;
  ball.launched = true;
  updateStatus("Stay sharp!");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function handleBrickCollision() {
  let remaining = 0;
  bricks.forEach((brick) => {
    if (!brick.active) {
      return;
    }
    remaining += 1;
    if (
      ball.x + ball.radius < brick.x ||
      ball.x - ball.radius > brick.x + brickLayout.width ||
      ball.y + ball.radius < brick.y ||
      ball.y - ball.radius > brick.y + brickLayout.height
    ) {
      return;
    }

    const overlapLeft = ball.x + ball.radius - brick.x;
    const overlapRight = brick.x + brickLayout.width - (ball.x - ball.radius);
    const overlapTop = ball.y + ball.radius - brick.y;
    const overlapBottom = brick.y + brickLayout.height - (ball.y - ball.radius);
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapLeft || minOverlap === overlapRight) {
      ball.velocityX *= -1;
    } else {
      ball.velocityY *= -1;
    }

    brick.active = false;
    score += 10;
  });

  if (remaining === 0) {
    level += 1;
    ball.speed = Math.min(420, ball.speed + 30);
    createBricks();
    resetPaddle();
    resetBall();
    updateScoreboard();
    updateStatus("Wall cleared! Press Space to launch the next round.");
  }
}

function handlePaddleCollision() {
  if (
    ball.y + ball.radius < paddle.y ||
    ball.x + ball.radius < paddle.x ||
    ball.x - ball.radius > paddle.x + paddle.width ||
    ball.y - ball.radius > paddle.y + paddle.height
  ) {
    return;
  }

  const paddleCenter = paddle.x + paddle.width / 2;
  const relativeHit = (ball.x - paddleCenter) / (paddle.width / 2);
  const clampedHit = clamp(relativeHit, -1, 1);
  const bounceAngle = clampedHit * (Math.PI / 3);
  const speed = Math.sqrt(ball.velocityX ** 2 + ball.velocityY ** 2) || ball.speed;
  ball.velocityX = speed * Math.sin(bounceAngle);
  ball.velocityY = -Math.abs(speed * Math.cos(bounceAngle));
  ball.y = paddle.y - ball.radius - 1;
}

function updateBall(deltaSeconds) {
  if (!ball.launched) {
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.radius - 2;
    return;
  }

  ball.x += ball.velocityX * deltaSeconds;
  ball.y += ball.velocityY * deltaSeconds;

  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.velocityX *= -1;
  } else if (ball.x + ball.radius >= playfieldWidth) {
    ball.x = playfieldWidth - ball.radius;
    ball.velocityX *= -1;
  }

  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.velocityY *= -1;
  }

  if (ball.y - ball.radius > playfieldHeight) {
    lives -= 1;
    updateScoreboard();
    if (lives <= 0) {
      endGame(false);
      return;
    }
    resetPaddle();
    resetBall();
    updateStatus("Life lost. Press Space to launch again.");
  }

  handlePaddleCollision();
  handleBrickCollision();
}

function updatePaddle(deltaSeconds) {
  if (!leftPressed && !rightPressed) {
    return;
  }

  const direction = rightPressed ? 1 : -1;
  paddle.x += direction * paddle.speed * deltaSeconds;
  paddle.x = clamp(paddle.x, 0, playfieldWidth - paddle.width);
  if (!ball.launched) {
    ball.x = paddle.x + paddle.width / 2;
  }
}

function drawBackground() {
  context.fillStyle = "#142034";
  context.fillRect(0, 0, playfieldWidth, playfieldHeight);
}

function drawBricks() {
  bricks.forEach((brick) => {
    if (!brick.active) {
      return;
    }
    context.fillStyle = brick.color;
    context.fillRect(brick.x, brick.y, brickLayout.width, brickLayout.height);
    context.strokeStyle = "rgba(0, 0, 0, 0.25)";
    context.strokeRect(brick.x + 0.5, brick.y + 0.5, brickLayout.width - 1, brickLayout.height - 1);
  });
}

function drawPaddle() {
  context.fillStyle = "#8fa6d6";
  context.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  context.strokeStyle = "#2a3c57";
  context.strokeRect(paddle.x + 0.5, paddle.y + 0.5, paddle.width - 1, paddle.height - 1);
}

function drawBall() {
  context.beginPath();
  context.fillStyle = "#f2f1f0";
  context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#2a3c57";
  context.stroke();
}

function update(time = 0) {
  const delta = (time - lastTime) / 1000;
  lastTime = time;

  if (gameActive && !paused) {
    updatePaddle(delta);
    updateBall(delta);
  }

  drawBackground();
  drawBricks();
  drawPaddle();
  drawBall();
  window.requestAnimationFrame(update);
}

function handleInput(event) {
  const { code, type } = event;
  if (code === "KeyP" && type === "keydown") {
    togglePause();
    return;
  }

  if (code === "Space" && type === "keydown") {
    event.preventDefault();
    launchBall();
    return;
  }

  if (code === "ArrowLeft" || code === "KeyA") {
    event.preventDefault();
    leftPressed = type === "keydown";
  }

  if (code === "ArrowRight" || code === "KeyD") {
    event.preventDefault();
    rightPressed = type === "keydown";
  }
}

function startMove(direction) {
  if (!gameActive || paused) {
    return;
  }
  if (direction === "left") {
    leftPressed = true;
    rightPressed = false;
  } else if (direction === "right") {
    rightPressed = true;
    leftPressed = false;
  }
}

function stopMove(direction) {
  if (direction === "left") {
    leftPressed = false;
  } else if (direction === "right") {
    rightPressed = false;
  }
}

resetButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
window.addEventListener("keydown", handleInput);
window.addEventListener("keyup", handleInput);
touchButtons.forEach((button) => {
  const action = button.dataset.action;
  if (!action) {
    return;
  }
  const activate = () => {
    if (!gameActive) {
      startGame();
    }
    if (action === "launch") {
      launchBall();
      return;
    }
    startMove(action);
  };

  const deactivate = () => {
    if (action === "launch") {
      return;
    }
    stopMove(action);
  };

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    activate();
  });
  button.addEventListener("pointerup", deactivate);
  button.addEventListener("pointerleave", deactivate);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    activate();
    if (action !== "launch") {
      stopMove(action);
    }
  });
});
backButton.addEventListener("click", () => {
  window.location.href = "../index.html";
});

resetPaddle();
resetBall();
createBricks();
updateScoreboard();
updateStatus("Press Start to play.");
updatePauseButton();
window.requestAnimationFrame(update);
