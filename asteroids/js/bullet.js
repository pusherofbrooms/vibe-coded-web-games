class Bullet {
  constructor(x, y, rotation, velocityX, velocityY) {
    this.x = x;
    this.y = y;
    this.radius = 2;
    this.life = 2;
    this.age = 0;
    this.velocityX = velocityX + Math.cos(rotation) * 400;
    this.velocityY = velocityY + Math.sin(rotation) * 400;
  }

  update(deltaTime) {
    this.x += this.velocityX * deltaTime;
    this.y += this.velocityY * deltaTime;
    this.age += deltaTime;

    if (this.x < 0) this.x = Canvas.width;
    if (this.x > Canvas.width) this.x = 0;
    if (this.y < 0) this.y = Canvas.height;
    if (this.y > Canvas.height) this.y = 0;
  }

  isDead() {
    return this.age >= this.life;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
}
