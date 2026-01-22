const panel = document.getElementById("game-panel");
const backButton = document.getElementById("back-button");
const menuButtons = document.querySelectorAll(".menu button");

const gameCopy = {
  minesweeper: {
    title: "Minesweeper",
    body: "Flag the mines and clear the grid. We'll drop the full board here soon.",
  },
  conway: {
    title: "Conway's Game of Life",
    body: "Seed a pattern and watch it evolve. Controls will appear in this panel.",
  },
  tetris: {
    title: "Tetris",
    body: "Stack and clear the lines. Gameplay is on deck for this space.",
  },
  mystery: {
    title: "Surprise Me",
    body: "We're keeping room for more puzzles. Tell us what you want next!",
  },
};

function showGame(gameKey) {
  const { title, body } = gameCopy[gameKey];
  panel.querySelector("h2").textContent = title;
  panel.querySelector("p").textContent = body;
  backButton.hidden = false;
  backButton.focus();
}

function showMenu() {
  panel.querySelector("h2").textContent = "Welcome!";
  panel.querySelector("p").textContent =
    "Select a game to see it here. We'll keep the menu available for quick switching.";
  backButton.hidden = true;
}

menuButtons.forEach((button) => {
  button.addEventListener("click", () => showGame(button.dataset.game));
});

backButton.addEventListener("click", showMenu);
