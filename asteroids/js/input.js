const Input = {
  keys: {},
  blockedKeys: new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space']),
  
  init() {
    window.addEventListener('keydown', (e) => {
      if (this.blockedKeys.has(e.code)) {
        e.preventDefault();
      }
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      if (this.blockedKeys.has(e.code)) {
        e.preventDefault();
      }
      this.keys[e.code] = false;
    });
    window.addEventListener('blur', () => {
      this.keys = {};
    });
  },
  
  isDown(code) {
    return this.keys[code] === true;
  }
};
