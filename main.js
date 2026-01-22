const menuButtons = document.querySelectorAll(".menu button");

const gameCopy = {
  minesweeper: {
    href: "minesweeper/index.html",
  },
  conway: {
    href: "game-of-life/index.html",
  },
  tetris: {},
  mystery: {},
};


menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const { href } = gameCopy[button.dataset.game] || {};
    if (href) {
      window.location.href = href;
      return;
    }
    window.alert("That game is still on the way!");
  });
});
