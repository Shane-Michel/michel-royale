/* ---------- LocalStorage Setup ---------- */
const LS = {
  bankroll: "michel_royale_bankroll",
  hands: "michel_royale_hands_played",
  streak: "michel_royale_win_streak",
};

let bankroll = parseInt(localStorage.getItem(LS.bankroll)) || 500;
let handsPlayed = parseInt(localStorage.getItem(LS.hands)) || 0;
let winStreak = parseInt(localStorage.getItem(LS.streak)) || 0;
let inRound = false;

/* ---------- Game Variables ---------- */
let deck = [];
let playerCards = [];
let dealerCards = [];
let currentBet = 0;
let gameOver = false;

/* ---------- Local Deck ---------- */
function buildDeck() {
  const suits = ["HEARTS", "DIAMONDS", "CLUBS", "SPADES"];
  const values = [
    "ACE", "2", "3", "4", "5", "6", "7", "8", "9", "10", "JACK", "QUEEN", "KING"
  ];

  return suits.flatMap(suit => values.map(value => {
    const codeValue = value === "10" ? "0" : value[0];
    const code = `${codeValue}${suit[0]}`;

    return {
      value,
      suit,
      image: `https://deckofcardsapi.com/static/img/${code}.png`,
    };
  }));
}

function shuffleDeck(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function newDeck() {
  deck = shuffleDeck(buildDeck());
}

function draw(count = 1) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (deck.length === 0) newDeck();
    drawn.push(deck.pop());
  }
  return drawn;
}

/* ---------- Card Values ---------- */
function cardValue(card) {
  if (["KING", "QUEEN", "JACK"].includes(card.value)) return 10;
  if (card.value === "ACE") return 11;
  return parseInt(card.value);
}

function handValue(cards) {
  let total = cards.reduce((s, c) => s + cardValue(c), 0);
  let aces = cards.filter(c => c.value === "ACE").length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

/* ---------- Rendering ---------- */
function render() {
  const dealerDiv = document.getElementById("dealer-hand");
  const playerDiv = document.getElementById("player-hand");
  dealerDiv.innerHTML = "";
  playerDiv.innerHTML = "";

  dealerCards.forEach((card, i) => {
    const img = document.createElement("img");
    img.src = (i === 0 && !gameOver) ?
      "https://deckofcardsapi.com/static/img/back.png" :
      card.image;
    dealerDiv.appendChild(img);
  });

  playerCards.forEach(card => {
    const img = document.createElement("img");
    img.src = card.image;
    playerDiv.appendChild(img);
  });
}

/* ---------- UI Update ---------- */
function updateUI() {
  document.getElementById("bankroll").textContent = `Bankroll: $${bankroll}`;
  document.getElementById("betDisplay").textContent = `Current Bet: $${currentBet}`;
}

// Initialize UI on load
updateUI();

/* ---------- Betting Chips ---------- */
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    if (inRound) return; // lock bets during an active hand
    const val = parseInt(chip.dataset.value);
    if (bankroll >= val) {
      currentBet += val;
      bankroll -= val;
      updateUI();
    }
  });
});

/* ---------- Deal Button ---------- */
document.getElementById("dealBtn").onclick = () => {
  if (currentBet === 0) {
    alert("Place a bet first!");
    return;
  }

  if (inRound) return;

  inRound = true;
  document.getElementById("dealBtn").disabled = true;

  document.getElementById("hitBtn").disabled = false;
  document.getElementById("standBtn").disabled = false;

  newDeck();
  playerCards = draw(2);
  dealerCards = draw(2);

  gameOver = false;
  document.getElementById("status").textContent = "";
  render();
};

/* ---------- Hit ---------- */
document.getElementById("hitBtn").onclick = () => {
  if (gameOver) return;
  const newCard = draw(1);
  playerCards.push(...newCard);

  if (handValue(playerCards) > 21) {
    endGame("bust");
  } else {
    render();
  }
};

/* ---------- Stand ---------- */
document.getElementById("standBtn").onclick = () => {
  gameOver = true;

  while (handValue(dealerCards) < 17) {
    const newCard = draw(1);
    dealerCards.push(...newCard);
  }

  determineWinner();
};

/* ---------- Determine Winner ---------- */
function determineWinner() {
  const dealer = handValue(dealerCards);
  const player = handValue(playerCards);

  if (player > 21) return endGame("bust");
  if (dealer > 21) return endGame("dealerBust");
  if (player > dealer) return endGame("player");
  if (player < dealer) return endGame("dealer");
  return endGame("push");
}

/* ---------- End Game ---------- */
function endGame(outcome) {
  gameOver = true;
  handsPlayed++;
  inRound = false;

  let status = "";
  switch (outcome) {
    case "bust":
      status = "❌ You busted! Dealer wins.";
      winStreak = 0;
      break;
    case "dealerBust":
      status = "🎉 Dealer busts! You win!";
      bankroll += currentBet * 2;
      winStreak++;
      break;
    case "player":
      status = "🎉 You win!";
      bankroll += currentBet * 2;
      winStreak++;
      break;
    case "dealer":
      status = "❌ Dealer wins.";
      winStreak = 0;
      break;
    case "push":
      status = "🤝 Push — bet returned.";
      bankroll += currentBet;
      break;
  }

  // Save stats
  localStorage.setItem(LS.bankroll, bankroll);
  localStorage.setItem(LS.hands, handsPlayed);
  localStorage.setItem(LS.streak, winStreak);

  currentBet = 0;
  document.getElementById("status").textContent = status;
  document.getElementById("dealBtn").disabled = false;
  document.getElementById("hitBtn").disabled = true;
  document.getElementById("standBtn").disabled = true;
  render();
  updateUI();
}

/* ---------- Restart ---------- */
document.getElementById("restartBtn").onclick = () => {
  location.reload();
};
