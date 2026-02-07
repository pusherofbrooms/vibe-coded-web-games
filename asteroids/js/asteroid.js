class Asteroid {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 2;
    this.velocityX = (Math.random() - 0.5) * 200 + 50;
    this.velocityY = (Math.random() - 0.5) * 200 + 50;
    
    this.vertices = [];
    const numVertices = 8;
    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * Math.PI * 2;
      const r = this.radius * (0.8 + Math.random() * 0.4);
      this.vertices.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      });
    }
  }

  update(deltaTime) {
    this.x += this.velocityX * deltaTime;
    this.y += this.velocityY * deltaTime;
    this.rotation += this.rotationSpeed * deltaTime;

    if (this.x < 0) this.x = Canvas.width;
    if (this.x > Canvas.width) this.x = 0;
    if (this.y < 0) this.y = Canvas.height;
    if (this.y > Canvas.height) this.y = 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  split() {
    if (this.radius === 15) return [];
    
    const newRadius = this.radius === 40 ? 25 : 15;
    return [
      new Asteroid(this.x, this.y, newRadius),
      new Asteroid(this.x, this.y, newRadius)
    ];
  }

  getScore() {
    if (this.radius === 40) return 20;
    if (this.radius === 25) return 50;
    return 100;
  }
}
