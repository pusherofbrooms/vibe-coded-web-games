(function initUiModule() {
  function createUiBindings() {
    return {
      score: document.getElementById("score"),
      lives: document.getElementById("lives"),
      wave: document.getElementById("wave"),
      enemies: document.getElementById("enemies"),
      status: document.getElementById("status"),
      startButton: document.getElementById("start-game"),
      pauseButton: document.getElementById("toggle-pause"),
      backButton: document.getElementById("back-button"),
      touchButtons: document.querySelectorAll(".touch-controls button"),
    };
  }

  function syncUi(state, ui) {
    ui.score.textContent = String(Math.floor(state.score));
    ui.lives.textContent = String(state.lives);
    ui.wave.textContent = String(state.waveNumber);
    ui.enemies.textContent = String(state.enemies.length + state.eggs.length + state.hatchlings.length + state.pterodactyls.length);
    ui.status.textContent = state.statusMessage;
    ui.pauseButton.textContent = state.phase === "paused" ? "Resume" : "Pause";
    ui.startButton.textContent = state.phase === "ready" || state.phase === "gameOver" ? "Start" : "Reset";
    state.uiNeedsSync = false;
  }

  window.JoustUi = {
    createUiBindings,
    syncUi,
  };
})();
