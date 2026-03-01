const stockCount = document.getElementById("stock-count");
const moveCount = document.getElementById("move-count");
const statusMessage = document.getElementById("status");
const backButton = document.getElementById("back-button");
const newGameButton = document.getElementById("new-game");
const undoButton = document.getElementById("undo-move");

const piles = {
  stock: document.querySelector('[data-pile="stock"]'),
  waste: document.querySelector('[data-pile="waste"]'),
  foundations: Array.from({ length: 4 }, (_, index) =>
    document.querySelector(`[data-pile="foundation-${index}"]`)
  ),
  tableau: Array.from({ length: 7 }, (_, index) =>
    document.querySelector(`[data-pile="tableau-${index}"]`)
  ),
};

const suitNames = ["spades", "hearts", "diamonds", "clubs"];
const rankLabels = {
  1: "Ace",
  11: "Jack",
  12: "Queen",
  13: "King",
};
const tableauSpacing = 28;
const tableauFaceDownSpacing = 14;
const maxWaste = 3;

let gameState = null;
let moveHistory = [];
let dragState = null;
let activeHighlights = [];

function updateStatus(message) {
  statusMessage.textContent = message;
}

function updateCounts() {
  stockCount.textContent = gameState.stock.length;
  moveCount.textContent = gameState.moves;
}

function createDeck() {
  const deck = [];
  suitNames.forEach((suit, suitIndex) => {
    for (let rank = 1; rank <= 13; rank += 1) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        suitIndex,
        isFaceUp: false,
      });
    }
  });
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const swapIndex = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[swapIndex]] = [deck[swapIndex], deck[i]];
  }
  return deck;
}

function dealNewGame() {
  const deck = createDeck();
  const tableau = Array.from({ length: 7 }, () => []);

  for (let column = 0; column < 7; column += 1) {
    for (let row = 0; row <= column; row += 1) {
      const card = deck.pop();
      card.isFaceUp = row === column;
      tableau[column].push(card);
    }
  }

  gameState = {
    stock: deck,
    waste: [],
    foundations: Array.from({ length: 4 }, () => []),
    tableau,
    moves: 0,
  };

  moveHistory = [];
  undoButton.disabled = true;
  updateStatus("Draw three cards from the stock.");
  renderBoard();
}

function recordMove(entry) {
  moveHistory.push(entry);
  undoButton.disabled = false;
  gameState.moves += 1;
  updateCounts();
}

function undoMove() {
  const entry = moveHistory.pop();
  if (!entry) {
    undoButton.disabled = true;
    return;
  }

  if (entry.type === "draw") {
    entry.cards.forEach((card) => {
      card.isFaceUp = false;
      gameState.stock.push(card);
    });
    gameState.waste.splice(gameState.waste.length - entry.cards.length, entry.cards.length);
  } else if (entry.type === "recycle") {
    gameState.waste = entry.waste;
    gameState.stock = entry.stock;
  } else if (entry.type === "flip") {
    entry.card.isFaceUp = false;
  } else if (entry.type === "move") {
    const fromPile = getPileArray(entry.from);
    const toPile = getPileArray(entry.to);
    const moved = toPile.splice(toPile.length - entry.cards.length, entry.cards.length);
    moved.forEach((card) => {
      fromPile.push(card);
    });
    if (entry.revealedCard) {
      entry.revealedCard.isFaceUp = false;
    }
  }

  gameState.moves = Math.max(0, gameState.moves - 1);
  updateCounts();
  if (moveHistory.length === 0) {
    undoButton.disabled = true;
  }
  renderBoard();
}

function isRed(card) {
  return card.suit === "hearts" || card.suit === "diamonds";
}

function canPlaceOnTableau(card, targetCard) {
  if (!targetCard) {
    return card.rank === 13;
  }
  return isRed(card) !== isRed(targetCard) && card.rank === targetCard.rank - 1;
}

function canPlaceOnFoundation(card, foundation) {
  if (foundation.length === 0) {
    return card.rank === 1;
  }
  const topCard = foundation[foundation.length - 1];
  return card.suit === topCard.suit && card.rank === topCard.rank + 1;
}

function parseIndexedPileId(pileId, type) {
  const match = pileId.match(new RegExp(`^${type}-(\\d+)$`));
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

function getPileArray(pileId) {
  if (pileId === "stock") {
    return gameState.stock;
  }
  if (pileId === "waste") {
    return gameState.waste;
  }
  if (pileId.startsWith("foundation")) {
    const index = parseIndexedPileId(pileId, "foundation");
    return index == null ? null : gameState.foundations[index];
  }
  if (pileId.startsWith("tableau")) {
    const tableauIndex = parseIndexedPileId(pileId, "tableau");
    return tableauIndex == null ? null : gameState.tableau[tableauIndex];
  }
  return null;
}

function getPileElement(pileId) {
  if (pileId === "stock") {
    return piles.stock;
  }
  if (pileId === "waste") {
    return piles.waste;
  }
  if (pileId.startsWith("foundation")) {
    const index = parseIndexedPileId(pileId, "foundation");
    return index == null ? null : piles.foundations[index];
  }
  if (pileId.startsWith("tableau")) {
    const tableauIndex = parseIndexedPileId(pileId, "tableau");
    return tableauIndex == null ? null : piles.tableau[tableauIndex];
  }
  return null;
}

function getCardSource(cardId) {
  const allPiles = {
    stock: gameState.stock,
    waste: gameState.waste,
    foundations: gameState.foundations,
    tableau: gameState.tableau,
  };

  if (allPiles.stock.some((card) => card.id === cardId)) {
    return { pileId: "stock", pileIndex: null };
  }
  if (allPiles.waste.some((card) => card.id === cardId)) {
    return { pileId: "waste", pileIndex: null };
  }
  const foundationIndex = allPiles.foundations.findIndex((foundation) =>
    foundation.some((card) => card.id === cardId)
  );
  if (foundationIndex >= 0) {
    return { pileId: `foundation-${foundationIndex}`, pileIndex: foundationIndex };
  }
  const tableauIndex = allPiles.tableau.findIndex((column) =>
    column.some((card) => card.id === cardId)
  );
  if (tableauIndex >= 0) {
    return { pileId: `tableau-${tableauIndex}`, pileIndex: tableauIndex };
  }
  return null;
}

function getCardById(cardId) {
  const allCards = [
    ...gameState.stock,
    ...gameState.waste,
    ...gameState.foundations.flat(),
    ...gameState.tableau.flat(),
  ];
  return allCards.find((card) => card.id === cardId);
}

function cardFacePosition(card) {
  const column = card.rank - 1;
  const row = card.suitIndex;
  const cardWidth = 80;
  const cardHeight = 111;
  return {
    x: column * cardWidth * -1,
    y: row * cardHeight * -1,
  };
}

function clearHighlights() {
  activeHighlights.forEach((pile) => pile.classList.remove("is-highlighted"));
  activeHighlights = [];
}

function highlightTargets(card) {
  clearHighlights();
  const targets = [];

  piles.tableau.forEach((pile, index) => {
    const targetCard = gameState.tableau[index][gameState.tableau[index].length - 1];
    if (targetCard?.isFaceUp || !targetCard) {
      if (canPlaceOnTableau(card, targetCard)) {
        targets.push(pile);
      }
    }
  });

  piles.foundations.forEach((pile, index) => {
    if (canPlaceOnFoundation(card, gameState.foundations[index])) {
      targets.push(pile);
    }
  });

  targets.forEach((pile) => pile.classList.add("is-highlighted"));
  activeHighlights = targets;
}

function drawFromStock() {
  if (gameState.stock.length === 0) {
    if (gameState.waste.length === 0) {
      return;
    }
    const recycled = [...gameState.waste];
    recycled.forEach((card) => {
      card.isFaceUp = false;
    });
    gameState.stock = recycled.reverse();
    gameState.waste = [];
    recordMove({ type: "recycle", stock: [...gameState.stock], waste: [...recycled] });
    updateStatus("Stock refreshed.");
    renderBoard();
    return;
  }

  const drawCount = Math.min(maxWaste, gameState.stock.length);
  const drawn = gameState.stock.splice(gameState.stock.length - drawCount, drawCount);
  drawn.forEach((card) => {
    card.isFaceUp = true;
    gameState.waste.push(card);
  });
  recordMove({ type: "draw", cards: drawn });
  updateStatus("Move cards from the waste pile.");
  renderBoard();
}

function handleCardClick(cardId, event) {
  if (dragState?.isDragging) {
    return;
  }
  const card = getCardById(cardId);
  if (!card) {
    return;
  }
  if (!card.isFaceUp) {
    const source = getCardSource(card.id);
    if (!source) {
      return;
    }
    if (source.pileId.startsWith("tableau")) {
      const column = getPileArray(source.pileId);
      if (column && column[column.length - 1]?.id === card.id) {
        card.isFaceUp = true;
        recordMove({ type: "flip", card });
        updateStatus("Revealed a card.");
        renderBoard();
      }
    }
  }
}

function attemptAutoFoundation(card) {
  const source = getCardSource(card.id);
  if (!source) {
    return;
  }
  if (source.pileId.startsWith("tableau")) {
    const column = getPileArray(source.pileId);
    if (!column) {
      return;
    }
    const index = column.findIndex((item) => item.id === card.id);
    if (index !== column.length - 1) {
      return;
    }
  }
  if (source.pileId === "stock") {
    return;
  }

  const foundationIndex = gameState.foundations.findIndex((foundation) =>
    canPlaceOnFoundation(card, foundation)
  );
  if (foundationIndex < 0) {
    return;
  }

  const wasMove = moveCards(card.id, source.pileId, `foundation-${foundationIndex}`);
  if (wasMove) {
    updateStatus("Sent card to foundation.");
  }
}

function moveCards(cardId, fromPileId, toPileId) {
  const fromPile = getPileArray(fromPileId);
  const toPile = getPileArray(toPileId);
  if (!fromPile || !toPile || fromPileId === toPileId) {
    return false;
  }

  const cardIndex = fromPile.findIndex((card) => card.id === cardId);
  if (cardIndex < 0) {
    return false;
  }

  const movingCards = fromPile.slice(cardIndex);
  if (movingCards.some((card) => !card.isFaceUp)) {
    return false;
  }

  const leadCard = movingCards[0];
  const topTarget = toPile[toPile.length - 1];

  if (fromPileId === "waste" && cardIndex !== fromPile.length - 1) {
    return false;
  }
  if (fromPileId.startsWith("foundation") && cardIndex !== fromPile.length - 1) {
    return false;
  }

  if (toPileId.startsWith("foundation")) {
    if (movingCards.length > 1 || !canPlaceOnFoundation(leadCard, toPile)) {
      return false;
    }
  } else if (toPileId.startsWith("tableau")) {
    if (!canPlaceOnTableau(leadCard, topTarget)) {
      return false;
    }
  } else {
    return false;
  }

  fromPile.splice(cardIndex, movingCards.length);
  toPile.push(...movingCards);

  let revealedCard = null;
  if (fromPileId.startsWith("tableau") && fromPile.length > 0) {
    const newTop = fromPile[fromPile.length - 1];
    if (!newTop.isFaceUp) {
      newTop.isFaceUp = true;
      revealedCard = newTop;
    }
  }

  recordMove({
    type: "move",
    from: fromPileId,
    to: toPileId,
    cards: movingCards,
    revealedCard,
  });
  updateStatus("Keep stacking in alternating colors.");
  renderBoard();
  checkAutoFinish();
  return true;
}

function cardDragStart(cardId, event) {
  if (!event.isPrimary || event.button !== 0) {
    return;
  }

  const card = getCardById(cardId);
  if (!card || !card.isFaceUp) {
    return;
  }

  const source = getCardSource(cardId);
  if (!source || source.pileId === "stock") {
    return;
  }
  if (source.pileId === "waste") {
    const topCard = gameState.waste[gameState.waste.length - 1];
    if (topCard?.id !== cardId) {
      return;
    }
  }
  if (source.pileId.startsWith("foundation")) {
    const foundation = getPileArray(source.pileId);
    if (!foundation || foundation[foundation.length - 1]?.id !== cardId) {
      return;
    }
  }

  const fromPile = getPileArray(source.pileId);
  if (!fromPile) {
    return;
  }

  const cardIndex = fromPile.findIndex((item) => item.id === cardId);
  if (cardIndex < 0) {
    return;
  }

  const movingCards = fromPile.slice(cardIndex);
  if (movingCards.some((item) => !item.isFaceUp)) {
    return;
  }

  const element = event.currentTarget;

  dragState = {
    cardId,
    fromPileId: source.pileId,
    element,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: 0,
    offsetY: 0,
    pointerId: event.pointerId,
    isDragging: false,
  };
}

function beginDragging(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  const { element } = dragState;
  const rect = element.getBoundingClientRect();
  dragState.offsetX = event.clientX - rect.left;
  dragState.offsetY = event.clientY - rect.top;
  dragState.isDragging = true;

  element.classList.add("is-dragging");
  element.style.position = "fixed";
  element.style.left = `${rect.left}px`;
  element.style.top = `${rect.top}px`;
  element.style.zIndex = "1000";
  element.setPointerCapture(dragState.pointerId);
  highlightTargets(getCardById(dragState.cardId));
}

function cardDragMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  const deltaX = Math.abs(event.clientX - dragState.startX);
  const deltaY = Math.abs(event.clientY - dragState.startY);

  if (!dragState.isDragging) {
    if (deltaX < 6 && deltaY < 6) {
      return;
    }
    beginDragging(event);
  }

  event.preventDefault();
  const { element, offsetX, offsetY } = dragState;
  element.style.left = `${event.clientX - offsetX}px`;
  element.style.top = `${event.clientY - offsetY}px`;
}

function cardDragEnd(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  const { cardId, fromPileId, element, pointerId, isDragging } = dragState;
  dragState = null;

  if (!isDragging) {
    return;
  }

  clearHighlights();
  element.classList.remove("is-dragging");
  element.style.position = "";
  element.style.left = "";
  element.style.top = "";
  element.style.zIndex = "";
  if (pointerId != null && element.hasPointerCapture(pointerId)) {
    element.releasePointerCapture(pointerId);
  }

  if (event.type === "lostpointercapture") {
    renderBoard();
    return;
  }

  const dropTarget = document.elementFromPoint(event.clientX, event.clientY)?.closest(".pile");
  if (!dropTarget) {
    renderBoard();
    return;
  }

  const targetPileId = dropTarget.dataset.pile;
  if (!targetPileId || targetPileId === fromPileId) {
    renderBoard();
    return;
  }

  if (!moveCards(cardId, fromPileId, targetPileId)) {
    renderBoard();
  }
}

function checkAutoFinish() {
  const allTableauUp = gameState.tableau.every((column) =>
    column.every((card) => card.isFaceUp)
  );
  if (!allTableauUp) {
    return;
  }

  let moved = false;
  gameState.tableau.forEach((column, columnIndex) => {
    const topCard = column[column.length - 1];
    if (!topCard) {
      return;
    }
    const foundationIndex = gameState.foundations.findIndex((foundation) =>
      canPlaceOnFoundation(topCard, foundation)
    );
    if (foundationIndex >= 0) {
      moveCards(topCard.id, `tableau-${columnIndex}`, `foundation-${foundationIndex}`);
      moved = true;
    }
  });

  if (moved) {
    window.setTimeout(checkAutoFinish, 120);
  } else if (gameState.foundations.every((foundation) => foundation.length === 13)) {
    updateStatus("You win! All foundations complete.");
  }
}

function renderCard(card, index, pileId, topOffset) {
  const cardElement = document.createElement("div");
  cardElement.className = "card";
  cardElement.dataset.cardId = card.id;
  cardElement.setAttribute("role", "button");
  const rankLabel = rankLabels[card.rank] ?? card.rank;
  const faceLabel = card.isFaceUp ? `${rankLabel} of ${card.suit}` : "Face down card";
  cardElement.setAttribute("aria-label", faceLabel);

  if (!card.isFaceUp) {
    cardElement.classList.add("is-face-down");
  }

  if (pileId.startsWith("tableau")) {
    const topValue = topOffset ?? 0;
    cardElement.style.top = `${topValue}px`;
  } else if (pileId === "waste") {
    const offset = Math.min(index, maxWaste - 1);
    cardElement.style.left = `${offset * 18}px`;
  } else {
    cardElement.style.top = "6px";
    cardElement.style.left = "6px";
  }

  const face = document.createElement("div");
  face.className = "card__face";

  if (card.isFaceUp) {
    face.classList.add("is-front");
    const { x, y } = cardFacePosition(card);
    face.style.backgroundPosition = `${x}px ${y}px`;
  } else {
    face.classList.add("is-back");
  }

  cardElement.appendChild(face);

  cardElement.addEventListener("click", (event) => handleCardClick(card.id, event));
  cardElement.addEventListener("dblclick", () => attemptAutoFoundation(card));
  cardElement.addEventListener("pointerdown", (event) => cardDragStart(card.id, event));
  cardElement.addEventListener("pointermove", cardDragMove);
  cardElement.addEventListener("pointerup", cardDragEnd);
  cardElement.addEventListener("pointercancel", cardDragEnd);
  cardElement.addEventListener("lostpointercapture", cardDragEnd);

  return cardElement;
}

function renderPile(pileId, cards) {
  const pileElement = getPileElement(pileId);
  pileElement.innerHTML = "";

  if (pileId.startsWith("tableau")) {
    let currentTop = 0;
    cards.forEach((card, index) => {
      const cardElement = renderCard(card, index, pileId, currentTop);
      pileElement.appendChild(cardElement);
      const spacing = card.isFaceUp ? tableauSpacing : tableauFaceDownSpacing;
      currentTop += spacing;
    });
    return;
  }

  cards.forEach((card, index) => {
    const cardElement = renderCard(card, index, pileId);
    pileElement.appendChild(cardElement);
  });
}

function renderBoard() {
  renderPile("stock", gameState.stock.slice(-1));
  renderPile("waste", gameState.waste.slice(-maxWaste));
  piles.stock.classList.toggle("is-empty", gameState.stock.length === 0);
  piles.waste.classList.toggle("is-empty", gameState.waste.length === 0);
  piles.foundations.forEach((pile, index) => {
    pile.classList.toggle("is-empty", gameState.foundations[index].length === 0);
  });
  piles.tableau.forEach((pile, index) => {
    pile.classList.toggle("is-empty", gameState.tableau[index].length === 0);
  });
  piles.foundations.forEach((_, index) => {
    renderPile(`foundation-${index}`, gameState.foundations[index].slice(-1));
  });
  piles.tableau.forEach((_, index) => {
    renderPile(`tableau-${index}`, gameState.tableau[index]);
  });
  updateCounts();
  updatePileAria();
}

function updatePileAria() {
  const stockLabel = `Stock pile with ${gameState.stock.length} cards`;
  piles.stock.setAttribute("aria-label", stockLabel);

  const wasteTop = gameState.waste[gameState.waste.length - 1];
  const wasteRank = wasteTop ? rankLabels[wasteTop.rank] ?? wasteTop.rank : null;
  const wasteLabel = wasteTop
    ? `Waste pile top card ${wasteRank} of ${wasteTop.suit}`
    : "Waste pile empty";
  piles.waste.setAttribute("aria-label", wasteLabel);

  piles.foundations.forEach((pile, index) => {
    const topCard = gameState.foundations[index][gameState.foundations[index].length - 1];
    const rankLabel = topCard ? rankLabels[topCard.rank] ?? topCard.rank : null;
    const label = topCard
      ? `Foundation ${index + 1} top card ${rankLabel} of ${topCard.suit}`
      : `Foundation ${index + 1} empty`;
    pile.setAttribute("aria-label", label);
  });

  piles.tableau.forEach((pile, index) => {
    const column = gameState.tableau[index];
    const faceUpCount = column.filter((card) => card.isFaceUp).length;
    const label = `Tableau ${index + 1} with ${column.length} cards, ${faceUpCount} face up`;
    pile.setAttribute("aria-label", label);
  });
}

function setupInteractions() {
  piles.stock.addEventListener("click", drawFromStock);
  piles.waste.addEventListener("click", (event) => {
    const topCard = gameState.waste[gameState.waste.length - 1];
    if (!topCard) {
      return;
    }
    if (event.detail === 2) {
      attemptAutoFoundation(topCard);
      return;
    }
    highlightTargets(topCard);
    window.setTimeout(clearHighlights, 500);
  });

  window.addEventListener("pointermove", cardDragMove);
  window.addEventListener("pointerup", cardDragEnd);
  window.addEventListener("pointercancel", cardDragEnd);
  window.addEventListener("blur", () => {
    if (!dragState) {
      return;
    }

    const { element, pointerId, isDragging } = dragState;
    dragState = null;
    if (!isDragging) {
      return;
    }

    clearHighlights();
    element.classList.remove("is-dragging");
    element.style.position = "";
    element.style.left = "";
    element.style.top = "";
    element.style.zIndex = "";
    if (pointerId != null && element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
    renderBoard();
  });

  newGameButton.addEventListener("click", dealNewGame);
  undoButton.addEventListener("click", undoMove);
  backButton.addEventListener("click", () => {
    window.location.href = "../index.html";
  });
}

setupInteractions();
dealNewGame();
