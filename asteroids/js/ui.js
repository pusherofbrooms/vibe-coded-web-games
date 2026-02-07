const UI = {
  score: 0,
  level: 1,
  scoreElement: null,
  livesElement: null,
  levelElement: null,
  statusElement: null,

  bindElements() {
    this.scoreElement = document.getElementById('score');
    this.livesElement = document.getElementById('lives');
    this.levelElement = document.getElementById('level');
    this.statusElement = document.getElementById('status');
  },

  renderStatus(lives) {
    if (this.scoreElement) {
      this.scoreElement.textContent = String(this.score);
    }
    if (this.levelElement) {
      this.levelElement.textContent = String(this.level);
    }
    if (this.livesElement) {
      this.livesElement.textContent = String(lives);
    }
  },

  setStatus(message) {
    if (this.statusElement) {
      this.statusElement.textContent = message;
    }
  },
  
  init() {
    if (!this.scoreElement) {
      this.bindElements();
    }
    this.score = 0;
    this.level = 1;
    this.renderStatus(ship ? ship.lives : 3);
  },
  
  addScore(points) {
    this.score += points;
    if (this.score % 1000 === 0) {
      this.level++;
    }
    this.renderStatus(ship ? ship.lives : 3);
  },
  
  draw(ctx) {
    ctx.fillStyle = '#fff';
    ctx.font = '20px "Courier New", Courier, monospace';
    ctx.fillText(`Score: ${this.score}`, 20, 30);
    ctx.fillText(`Lives: ${ship.lives}`, Canvas.width - 100, 30);
    ctx.fillText(`Level: ${this.level}`, 20, Canvas.height - 10);
  },
  
  drawMessage(ctx, text, subtext) {
    ctx.fillStyle = '#fff';
    ctx.font = '40px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, Canvas.width / 2, Canvas.height / 2 - 20);
    
    if (subtext) {
      ctx.font = '20px "Courier New", Courier, monospace';
      ctx.fillText(subtext, Canvas.width / 2, Canvas.height / 2 + 30);
    }
    ctx.textAlign = 'left';
  }
};
