const panel = document.getElementById("game-panel");
const backButton = document.getElementById("back-button");
const launchButton = document.getElementById("launch-button");
const menuButtons = document.querySelectorAll(".menu button");

const gameCopy = {
  minesweeper: {
    title: "Minesweeper",
    body: "Flag the mines and clear the grid. We'll drop the full board here soon.",
  },
  conway: {
    title: "Conway's Game of Life",
    body: "Seed a pattern and watch it evolve. Click to play or jump into the full game.",
    href: "game-of-life/index.html",
    actionLabel: "Open Game of Life",
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
  const { title, body, href, actionLabel } = gameCopy[gameKey];
  panel.querySelector("h2").textContent = title;
  panel.querySelector("p").textContent = body;
  backButton.hidden = false;

  if (href) {
    launchButton.hidden = false;
    launchButton.textContent = actionLabel || "Open Game";
    launchButton.dataset.href = href;
  } else {
    launchButton.hidden = true;
    launchButton.removeAttribute("data-href");
  }

  backButton.focus();
}

function showMenu() {
  panel.querySelector("h2").textContent = "Welcome!";
  panel.querySelector("p").textContent =
    "Select a game to see it here. We'll keep the menu available for quick switching.";
  backButton.hidden = true;
  launchButton.hidden = true;
  launchButton.removeAttribute("data-href");
}

menuButtons.forEach((button) => {
  button.addEventListener("click", () => showGame(button.dataset.game));
});

launchButton.addEventListener("click", () => {
  if (launchButton.dataset.href) {
    window.location.href = launchButton.dataset.href;
  }
});

backButton.addEventListener("click", showMenu);
