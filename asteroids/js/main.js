const Canvas = document.getElementById('gameCanvas');
const ctx = Canvas.getContext('2d');

let lastTime = 0;
let ship = null;
let asteroids = [];
let bullets = [];
let gameState = 'MENU';
let gameOverTime = 0;

const GameState = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  GAMEOVER: 'GAMEOVER'
};

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
        ship.hit();
        asteroids.splice(aIndex, 1);
      }
    }
    
    if (asteroids.length === 0) {
      for (let i = 0; i < 5 + UI.level; i++) {
        createAsteroid();
      }
    }
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
  } else if (gameState === GameState.GAMEOVER) {
    UI.draw(ctx);
    const canRestart = Date.now() - gameOverTime >= 2000;
    UI.drawMessage(ctx, 'GAME OVER', `Final Score: ${UI.score} - ${canRestart ? 'Press SPACE to Restart' : 'Wait...'}`);
  }
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
requestAnimationFrame(gameLoop);
