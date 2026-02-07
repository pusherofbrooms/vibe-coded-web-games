const Canvas = document.getElementById('gameCanvas');
const ctx = Canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const levelElement = document.getElementById('level');
const statusElement = document.getElementById('status');
const resetButton = document.getElementById('reset-game');
const pauseButton = document.getElementById('toggle-pause');
const backButton = document.getElementById('back-button');
const touchButtons = document.querySelectorAll('.touch-controls button');

let lastTime = 0;
let ship = null;
let asteroids = [];
let bullets = [];
let gameState = 'MENU';
let gameOverTime = 0;

const GameState = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER'
};

function updateStatus(message) {
  if (statusElement) {
    statusElement.textContent = message;
  }
}

function updateHUD() {
  if (!ship) {
    if (scoreElement) scoreElement.textContent = '0';
    if (livesElement) livesElement.textContent = '3';
    if (levelElement) levelElement.textContent = '1';
    return;
  }

  if (scoreElement) scoreElement.textContent = String(UI.score);
  if (livesElement) livesElement.textContent = String(ship.lives);
  if (levelElement) levelElement.textContent = String(UI.level);
}

function setPlaying(isPlaying) {
  if (!pauseButton) {
    return;
  }
  pauseButton.textContent = isPlaying ? 'Pause' : 'Resume';
}

function initGame() {
  ship = new Ship();
  asteroids = [];
  bullets = [];
  UI.init();
  
  for (let i = 0; i < 5; i++) {
    createAsteroid();
  }
  
  gameState = GameState.PLAYING;
  gameOverTime = 0;
  updateHUD();
  updateStatus('Destroy the asteroid field.');
  if (resetButton) {
    resetButton.textContent = 'Restart';
  }
  setPlaying(true);
}

function createAsteroid() {
  let x, y;
  do {
    x = Math.random() * Canvas.width;
    y = Math.random() * Canvas.height;
  } while (Math.sqrt((x - ship.x) ** 2 + (y - ship.y) ** 2) < 100);
  
  asteroids.push(new Asteroid(x, y, 40));
}

function update(deltaTime) {
  if (gameState === GameState.GAMEOVER) {
    if (Input.isDown('Space') && Date.now() - gameOverTime >= 2000) {
      initGame();
    }
  } else if (gameState === GameState.PAUSED) {
    return;
  } else if (gameState === GameState.PLAYING) {
    ship.update(deltaTime);
    
    bullets.forEach(bullet => bullet.update(deltaTime));
    bullets = bullets.filter(bullet => !bullet.isDead());
    
    asteroids.forEach(asteroid => asteroid.update(deltaTime));
    
    bullets.forEach((bullet, bIndex) => {
      for (let aIndex = 0; aIndex < asteroids.length; aIndex++) {
        const asteroid = asteroids[aIndex];
        if (Collision.checkCircle(bullet.x, bullet.y, bullet.radius, asteroid.x, asteroid.y, asteroid.radius)) {
          UI.addScore(asteroid.getScore());
          const newAsteroids = asteroid.split();
          asteroids.splice(aIndex, 1);
          asteroids.push(...newAsteroids);
          bullets.splice(bIndex, 1);
          break;
        }
      }
    });
    
    for (let aIndex = 0; aIndex < asteroids.length; aIndex++) {
      const asteroid = asteroids[aIndex];
      if (Collision.checkCircle(ship.x, ship.y, ship.radius, asteroid.x, asteroid.y, asteroid.radius)) {
        const previousLives = ship.lives;
        ship.hit();
        asteroids.splice(aIndex, 1);
        if (ship.lives < previousLives && ship.lives > 0) {
          updateStatus('Ship hit! Respawning...');
        } else if (gameState === GameState.GAMEOVER) {
          updateStatus('Game over. Press Start or Space to play again.');
          setPlaying(false);
        }
      }
    }
    
    if (asteroids.length === 0) {
      for (let i = 0; i < 5 + UI.level; i++) {
        createAsteroid();
      }
    }

    updateHUD();
  }
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, Canvas.width, Canvas.height);
  
  if (gameState === GameState.MENU) {
    UI.drawMessage(ctx, 'ASTEROIDS', 'Press SPACE to Start');
  } else if (gameState === GameState.PLAYING) {
    ship.draw(ctx);
    bullets.forEach(bullet => bullet.draw(ctx));
    asteroids.forEach(asteroid => asteroid.draw(ctx));
    UI.draw(ctx);
  } else if (gameState === GameState.PAUSED) {
    ship.draw(ctx);
    bullets.forEach(bullet => bullet.draw(ctx));
    asteroids.forEach(asteroid => asteroid.draw(ctx));
    UI.draw(ctx);
    UI.drawMessage(ctx, 'PAUSED', 'Press P or Resume to continue');
  } else if (gameState === GameState.GAMEOVER) {
    UI.draw(ctx);
    const canRestart = Date.now() - gameOverTime >= 2000;
    UI.drawMessage(ctx, 'GAME OVER', `Final Score: ${UI.score} - ${canRestart ? 'Press SPACE to Restart' : 'Wait...'}`);
  }
}

function togglePause() {
  if (gameState === GameState.PLAYING) {
    gameState = GameState.PAUSED;
    updateStatus('Paused.');
    setPlaying(false);
  } else if (gameState === GameState.PAUSED) {
    gameState = GameState.PLAYING;
    updateStatus('Destroy the asteroid field.');
    setPlaying(true);
  }
}

function setTouchKey(action, isDown) {
  if (action === 'left') Input.keys.ArrowLeft = isDown;
  if (action === 'right') Input.keys.ArrowRight = isDown;
  if (action === 'thrust') Input.keys.ArrowUp = isDown;
  if (action === 'fire') Input.keys.Space = isDown;
}

function bindUI() {
  if (resetButton) {
    resetButton.addEventListener('click', initGame);
  }

  if (pauseButton) {
    pauseButton.addEventListener('click', togglePause);
  }

  if (backButton) {
    backButton.addEventListener('click', () => {
      window.location.href = '../index.html';
    });
  }

  touchButtons.forEach((button) => {
    const action = button.dataset.action;
    if (!action) return;

    const press = (event) => {
      event.preventDefault();
      setTouchKey(action, true);
    };
    const release = (event) => {
      event.preventDefault();
      setTouchKey(action, false);
    };

    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyP') {
      event.preventDefault();
      togglePause();
    }
  });
}

function gameLoop(timestamp) {
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  
  if (gameState === GameState.MENU && Input.isDown('Space')) {
    initGame();
  }
  
  update(deltaTime);
  draw();
  
  requestAnimationFrame(gameLoop);
}

Input.init();
bindUI();
updateHUD();
updateStatus('Press Start or Space to begin.');
requestAnimationFrame(gameLoop);
