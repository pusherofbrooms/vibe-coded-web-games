const menuButtons = document.querySelectorAll(".menu button");

const gameCopy = {
  minesweeper: {
    href: "minesweeper/index.html",
  },
  "missile-command": {
    href: "missile-command/index.html",
  },
  conway: {
    href: "game-of-life/index.html",
  },
  defender: {
    href: "defender/index.html",
  },
  frogger: {
    href: "frogger/index.html",
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
  "space-invaders": {
    href: "space-invaders/index.html",
  },
  "simon-says": {
    href: "simon-says/index.html",
  },
  slalom: {
    href: "slalom/index.html",
  },
  "klondike-solitaire": {
    href: "klondike-solitaire/index.html",
  },
  hamurabi: {
    href: "hamurabi/index.html",
  },
  joust: {
    href: "joust/index.html",
  },
  "retro-racer": {
    href: "retro-racer/index.html",
  },
  "river-raid": {
    href: "river-raid/index.html",
  },
  asteroids: {
    href: "asteroids/index.html",
  },
};


menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const explicitHref = button.dataset.href;
    const { href: mappedHref } = gameCopy[button.dataset.game] || {};
    const href = explicitHref || mappedHref;
    if (href) {
      window.location.href = href;
      return;
    }
    window.alert("That game is still on the way!");
  });
});
