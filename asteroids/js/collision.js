const Collision = {
  checkCircle(x1, y1, radius1, x2, y2, radius2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (radius1 + radius2);
  }
};
