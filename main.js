const menuButtons = document.querySelectorAll(".menu button");

const gameCopy = {
  minesweeper: {
    href: "minesweeper/index.html",
  },
  conway: {
    href: "game-of-life/index.html",
  },
  tetris: {
    href: "tetris/index.html",
  },
  snake: {
    href: "snake/index.html",
  },
  breakout: {
    href: "breakout/index.html",
  },
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
