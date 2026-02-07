class Ship {
  constructor() {
    this.x = Canvas.width / 2;
    this.y = Canvas.height / 2;
    this.radius = 15;
    this.rotation = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.thrust = 200;
    this.turnSpeed = 3;
    this.shootCooldown = 0;
    this.lives = 3;
    this.respawnTimer = 0;
    this.invulnerable = false;
  }

  update(deltaTime) {
    if (this.respawnTimer > 0) {
      this.respawnTimer -= deltaTime;
      if (this.respawnTimer <= 0) {
        this.invulnerable = false;
        this.respawnTimer = 0;
      }
      return;
    }

    if (Input.isDown('ArrowLeft') || Input.isDown('KeyA')) {
      this.rotation -= this.turnSpeed * deltaTime;
    }
    if (Input.isDown('ArrowRight') || Input.isDown('KeyD')) {
      this.rotation += this.turnSpeed * deltaTime;
    }
    if (Input.isDown('ArrowUp') || Input.isDown('KeyW')) {
      this.velocityX += this.thrust * Math.cos(this.rotation) * deltaTime;
      this.velocityY += this.thrust * Math.sin(this.rotation) * deltaTime;
    }

    this.x += this.velocityX * deltaTime;
    this.y += this.velocityY * deltaTime;

    if (Input.isDown('Space') && this.shootCooldown <= 0) {
      this.shoot();
      this.shootCooldown = 0.2;
    }
    if (this.shootCooldown > 0) {
      this.shootCooldown -= deltaTime;
    }

    if (this.x < 0) this.x = Canvas.width;
    if (this.x > Canvas.width) this.x = 0;
    if (this.y < 0) this.y = Canvas.height;
    if (this.y > Canvas.height) this.y = 0;
  }

  shoot() {
    bullets.push(new Bullet(
      this.x + Math.cos(this.rotation) * this.radius,
      this.y + Math.sin(this.rotation) * this.radius,
      this.rotation,
      this.velocityX,
      this.velocityY
    ));
  }

  respawn() {
    this.x = Canvas.width / 2;
    this.y = Canvas.height / 2;
    this.velocityX = 0;
    this.velocityY = 0;
    this.rotation = 0;
    this.invulnerable = true;
    this.respawnTimer = 3;
    this.shootCooldown = 0;
    Input.keys = {};
  }

  isInvulnerable() {
    return this.invulnerable;
  }

  hit() {
    if (this.invulnerable) return;
    
    this.lives--;
    if (this.lives <= 0) {
      gameState = 'GAMEOVER';
      gameOverTime = Date.now();
    } else {
      this.respawn();
    }
  }

  draw(ctx) {
    if (this.respawnTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    
    ctx.beginPath();
    ctx.moveTo(this.radius, 0);
    ctx.lineTo(-this.radius * 0.5, -this.radius * 0.7);
    ctx.lineTo(-this.radius * 0.5, this.radius * 0.7);
    ctx.closePath();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (Input.isDown('ArrowUp') || Input.isDown('KeyW')) {
      ctx.beginPath();
      ctx.moveTo(-this.radius * 0.7, -this.radius * 0.5);
      ctx.lineTo(-this.radius * 1.5, 0);
      ctx.lineTo(-this.radius * 0.7, this.radius * 0.5);
      ctx.closePath();
      ctx.strokeStyle = '#f00';
      ctx.stroke();
    }

    ctx.restore();
  }
}
