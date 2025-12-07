/* ---------- LocalStorage Setup ---------- */
const LS = {
  bankrollUSD: "michel_royale_bankroll",
  bankrollXRP: "michel_royale_bankroll_xrp",
  currency: "michel_royale_currency",
  hands: "michel_royale_hands_played",
  streak: "michel_royale_win_streak",
};

const bankrolls = {
  USD: parseInt(localStorage.getItem(LS.bankrollUSD), 10) || 500,
  XRP: parseFloat(localStorage.getItem(LS.bankrollXRP)) || 150,
};

let currencyMode = localStorage.getItem(LS.currency) || "USD";
let bankroll = bankrolls[currencyMode] ?? bankrolls.USD;
let handsPlayed = parseInt(localStorage.getItem(LS.hands)) || 0;
let winStreak = parseInt(localStorage.getItem(LS.streak)) || 0;
let inRound = false;

/* ---------- Game Variables ---------- */
let deck = [];
let playerHands = [];
let activeHandIndex = 0;
let dealerCards = [];
let currentBet = 0;
let gameOver = false;

/* ---------- Currency Helpers ---------- */
const chipSets = {
  USD: [5, 10, 25, 50, 100],
  XRP: [1, 2, 5, 10, 20],
};

const XRPL_DEMO_ADDRESS = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";

function getCurrencySymbol() {
  return currencyMode === "XRP" ? "XRP " : "$";
}

function formatAmount(value) {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return value;

  const formatted = currencyMode === "XRP"
    ? numericValue.toFixed(2)
    : Math.round(numericValue).toString();

  return formatted.replace(/\.00$/, "");
}

function persistBankroll() {
  bankrolls[currencyMode] = bankroll;
  const key = currencyMode === "XRP" ? LS.bankrollXRP : LS.bankrollUSD;
  localStorage.setItem(key, bankroll);
  localStorage.setItem(LS.currency, currencyMode);
}

function changeBankroll(delta) {
  bankroll = Math.max(0, bankroll + delta);
  persistBankroll();
}

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
  dealerDiv.innerHTML = "";

  dealerCards.forEach((card, i) => {
    const img = document.createElement("img");
    img.src = (i === 0 && !gameOver) ?
      "https://deckofcardsapi.com/static/img/back.png" :
      card.image;
    dealerDiv.appendChild(img);
  });

  renderPlayerHands();
}

function renderChips() {
  const chipsContainer = document.getElementById("chips");
  chipsContainer.innerHTML = "";

  chipSets[currencyMode].forEach(value => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.dataset.value = value;
    chip.textContent = `${getCurrencySymbol()}${formatAmount(value)}`;

    chip.addEventListener("click", () => {
      if (inRound) return;
      const val = parseFloat(chip.dataset.value);
      if (bankroll >= val) {
        currentBet += val;
        changeBankroll(-val);
        updateUI();
      }
    });

    chipsContainer.appendChild(chip);
  });
}

function renderPlayerHands() {
  const playerDiv = document.getElementById("player-hand");
  playerDiv.innerHTML = "";

  playerHands.forEach((hand, idx) => {
    const wrapper = document.createElement("div");
    wrapper.className = "player-hand";
    if (idx === activeHandIndex && !gameOver && inRound) {
      wrapper.classList.add("active-hand");
    }

    const label = document.createElement("div");
    label.className = "hand-label";
    const handResult = hand.outcome ? ` — ${outcomeLabel(hand.outcome)}` : "";
    label.textContent = `Hand ${idx + 1}${handResult}`;
    wrapper.appendChild(label);

    const cardsRow = document.createElement("div");
    cardsRow.className = "hand";
    hand.cards.forEach(card => {
      const img = document.createElement("img");
      img.src = card.image;
      cardsRow.appendChild(img);
    });

    wrapper.appendChild(cardsRow);
    playerDiv.appendChild(wrapper);
  });
}

function outcomeLabel(outcome) {
  switch (outcome) {
    case "player":
    case "dealerBust":
      return "Win";
    case "dealer":
      return "Lose";
    case "push":
      return "Push";
    case "bust":
      return "Bust";
    default:
      return "";
  }
}

/* ---------- UI Update ---------- */
function updateUI() {
  document.getElementById("bankroll").textContent = `Bankroll: ${getCurrencySymbol()}${formatAmount(bankroll)} (${currencyMode})`;
  const totalBet = inRound && playerHands.length
    ? playerHands.reduce((sum, hand) => sum + hand.bet, 0)
    : currentBet;
  document.getElementById("betDisplay").textContent = `Current Bet: ${getCurrencySymbol()}${formatAmount(totalBet)}`;
  updateActionButtons();
  toggleXrpControls();
}

function updateActionButtons() {
  const hitBtn = document.getElementById("hitBtn");
  const standBtn = document.getElementById("standBtn");
  const splitBtn = document.getElementById("splitBtn");

  hitBtn.disabled = !inRound || gameOver;
  standBtn.disabled = !inRound || gameOver;

  const currentHand = playerHands[activeHandIndex];
  const canSplitNow = inRound && !gameOver && playerHands.length === 1 && canSplit(currentHand);
  splitBtn.disabled = !canSplitNow;
}

function toggleXrpControls() {
  const xrpControls = document.getElementById("xrpControls");
  const xrpOnly = currencyMode === "XRP";

  if (!xrpControls) return;

  xrpControls.style.display = xrpOnly ? "block" : "none";
  document.getElementById("xrplAddress").textContent = XRPL_DEMO_ADDRESS;

  const status = document.getElementById("xrpStatus");
  if (xrpOnly) {
    status.textContent = "XRP mode is live — fund via Xaman and place bets in XRP.";
  } else {
    status.textContent = "Switch to XRP to use your Xaman wallet for bets.";
  }
}

// Initialize UI on load
renderChips();
updateUI();

/* ---------- Currency + Xaman Helpers ---------- */
const currencySelect = document.getElementById("currencyMode");
currencySelect.value = currencyMode;

currencySelect.addEventListener("change", () => {
  if (inRound) {
    alert("Finish the current hand before switching currencies.");
    currencySelect.value = currencyMode;
    return;
  }

  currencyMode = currencySelect.value;
  bankroll = bankrolls[currencyMode] ?? (currencyMode === "XRP" ? 150 : 500);
  persistBankroll();
  currentBet = 0;
  gameOver = false;
  renderChips();
  render();
  updateUI();
});

document.getElementById("xamanLink").addEventListener("click", () => {
  const deepLink = `https://xumm.app/detect/xapp?to=${XRPL_DEMO_ADDRESS}`;
  window.open(deepLink, "_blank");
});

document.getElementById("addXrpBtn").addEventListener("click", () => {
  if (currencyMode !== "XRP") {
    alert("Switch to XRP mode to record Xaman deposits.");
    return;
  }

  const amountField = document.getElementById("xrpAmount");
  const amount = parseFloat(amountField.value);

  if (!amount || amount <= 0) {
    alert("Enter a valid XRP amount to add to your bankroll.");
    return;
  }

  changeBankroll(amount);
  amountField.value = "";
  document.getElementById("xrpStatus").textContent = `Added ${formatAmount(amount)} XRP from Xaman.`;
  updateUI();
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

  newDeck();
  playerHands = [{
    cards: draw(2),
    bet: currentBet,
    outcome: null,
    done: false,
  }];
  activeHandIndex = 0;
  dealerCards = draw(2);

  gameOver = false;
  document.getElementById("status").textContent = "";
  render();
  updateActionButtons();
};

/* ---------- Hit ---------- */
document.getElementById("hitBtn").onclick = () => {
  if (gameOver || !inRound) return;
  const hand = playerHands[activeHandIndex];
  hand.cards.push(...draw(1));

  if (handValue(hand.cards) > 21) {
    hand.outcome = "bust";
    hand.done = true;
    advanceToNextHand();
  } else {
    render();
    updateActionButtons();
  }
};

/* ---------- Stand ---------- */
document.getElementById("standBtn").onclick = () => {
  if (gameOver || !inRound) return;
  playerHands[activeHandIndex].done = true;
  advanceToNextHand();
};

/* ---------- Split ---------- */
function canSplit(hand) {
  if (!hand) return false;
  if (hand.cards.length !== 2) return false;
  return cardValue(hand.cards[0]) === cardValue(hand.cards[1]);
}

document.getElementById("splitBtn").onclick = () => {
  if (gameOver || !inRound) return;

  const hand = playerHands[activeHandIndex];
  if (!canSplit(hand)) return;

  if (bankroll < hand.bet) {
    alert("Not enough bankroll to split.");
    return;
  }

  changeBankroll(-hand.bet);
  currentBet += hand.bet;

  const [firstCard, secondCard] = hand.cards;
  hand.cards = [firstCard, ...draw(1)];

  const newHand = {
    cards: [secondCard, ...draw(1)],
    bet: hand.bet,
    outcome: null,
    done: false,
  };

  playerHands.splice(activeHandIndex + 1, 0, newHand);
  render();
  updateUI();
};

function advanceToNextHand() {
  const nextIndex = playerHands.findIndex((hand, idx) => !hand.done && idx > activeHandIndex);

  if (nextIndex !== -1) {
    activeHandIndex = nextIndex;
    render();
    updateActionButtons();
    return;
  }

  resolveDealerRound();
}

function resolveDealerRound() {
  if (gameOver) return;

  while (handValue(dealerCards) < 17) {
    dealerCards.push(...draw(1));
  }

  const dealerTotal = handValue(dealerCards);
  let wins = 0;
  let losses = 0;

  const results = playerHands.map((hand, idx) => {
    const outcome = hand.outcome || evaluateOutcome(hand, dealerTotal);
    hand.outcome = outcome;

    if (outcome === "player" || outcome === "dealerBust") {
      changeBankroll(hand.bet * 2);
      wins++;
    } else if (outcome === "push") {
      changeBankroll(hand.bet);
    } else {
      losses++;
    }

    const label = outcomeLabel(outcome);
    return `Hand ${idx + 1}: ${label}`;
  });

  handsPlayed++;
  inRound = false;
  gameOver = true;

  if (losses > 0) {
    winStreak = 0;
  } else if (wins > 0) {
    winStreak++;
  }

  localStorage.setItem(LS.hands, handsPlayed);
  localStorage.setItem(LS.streak, winStreak);
  persistBankroll();

  currentBet = 0;
  document.getElementById("status").innerHTML = results.join("<br>");
  document.getElementById("dealBtn").disabled = false;
  document.getElementById("hitBtn").disabled = true;
  document.getElementById("standBtn").disabled = true;
  document.getElementById("splitBtn").disabled = true;
  render();
  updateUI();
}

function evaluateOutcome(hand, dealerTotal) {
  const playerTotal = handValue(hand.cards);

  if (playerTotal > 21) return "bust";
  if (dealerTotal > 21) return "dealerBust";
  if (playerTotal > dealerTotal) return "player";
  if (playerTotal < dealerTotal) return "dealer";
  return "push";
}

/* ---------- Restart ---------- */
document.getElementById("restartBtn").onclick = () => {
  location.reload();
};
