/* script.js - Fantasy Stick Wars polished game */

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = document.getElementById('gameCanvas').offsetHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Game state
const gameState = {
  age: 1,
  gold: 0,
  gods: {
    fire: 0,
    water: 0,
    earth: 0,
    air: 0
  },
  units: {
    warrior: 0,
    archer: 0,
    mage: 0
  },
  mapProgress: 0 // 0: none, 1: Plains completed, 2: Forest, 3: Mountains
};

// Costs & parameters
const unitCosts = {
  warrior: 50,
  archer: 100,
  mage: 150
};

function totalStrength() {
  // assign strength values: warrior=1, archer=2, mage=3
  return gameState.units.warrior * 1 + gameState.units.archer * 2 + gameState.units.mage * 3;
}

// UI update
function updateUI() {
  document.getElementById('age').textContent = 'Age ' + gameState.age;
  document.getElementById('resources').textContent = 'Gold: ' + gameState.gold;
  document.getElementById('warriorCount').textContent = 'Warriors: ' + gameState.units.warrior;
  document.getElementById('archerCount').textContent = 'Archers: ' + gameState.units.archer;
  document.getElementById('mageCount').textContent = 'Mages: ' + gameState.units.mage;
  document.getElementById('god1').textContent = 'God of Fire: ' + gameState.gods.fire;
  document.getElementById('god2').textContent = 'God of Water: ' + gameState.gods.water;
  document.getElementById('god3').textContent = 'God of Earth: ' + gameState.gods.earth;
  document.getElementById('god4').textContent = 'God of Air: ' + gameState.gods.air;

  // enable/disable unit buttons based on age and gold
  const warriorBtn = document.getElementById('buyWarriorBtn');
  const archerBtn = document.getElementById('buyArcherBtn');
  const mageBtn = document.getElementById('buyMageBtn');

  warriorBtn.disabled = gameState.gold < getUnitCost('warrior') || gameState.age < 1;
  archerBtn.disabled = gameState.gold < getUnitCost('archer') || gameState.age < 2;
  mageBtn.disabled   = gameState.gold < getUnitCost('mage')   || gameState.age < 3;

  // enable/disable advance age button
  const ageCost = getAgeCost();
  document.getElementById('advanceAgeBtn').disabled = gameState.gold < ageCost;

  // enable map buttons depending on age
  document.getElementById('area1').disabled = (gameState.mapProgress >= 1);
  document.getElementById('area2').disabled = (gameState.age < 2 || gameState.mapProgress >= 2);
  document.getElementById('area3').disabled = (gameState.age < 3 || gameState.mapProgress >= 3);
}

// Logging
function log(message) {
  const logDiv = document.getElementById('log');
  const entry = document.createElement('div');
  entry.textContent = message;
  logDiv.appendChild(entry);
  logDiv.scrollTop = logDiv.scrollHeight;
}

// Helper: compute gold per mine (with fire points)
function goldPerMine() {
  return 10 + gameState.gods.fire * 5;
}

// Helper: age cost (with water points discount)
function getAgeCost() {
  const base = gameState.age * 100;
  const discount = gameState.gods.water * 0.1;
  return Math.floor(base * (1 - discount));
}

// Helper: unit cost (with earth points discount)
function getUnitCost(unit) {
  const base = unitCosts[unit];
  const discount = gameState.gods.earth * 0.1;
  return Math.floor(base * (1 - discount));
}

// Mining action
document.getElementById('mineBtn').addEventListener('click', () => {
  const gained = goldPerMine();
  gameState.gold += gained;
  log(`Mined ${gained} gold.`);
  updateUI();
});

// Advance age
document.getElementById('advanceAgeBtn').addEventListener('click', () => {
  const cost = getAgeCost();
  if (gameState.gold >= cost) {
    gameState.gold -= cost;
    gameState.age += 1;
    log(`Advanced to Age ${gameState.age} (cost ${cost} gold).`);
    updateUI();
  } else {
    log(`Not enough gold to advance age. Need ${cost} gold.`);
  }
});

// Purchase units
function purchaseUnit(unit) {
  const cost = getUnitCost(unit);
  if (gameState.gold >= cost) {
    gameState.gold -= cost;
    gameState.units[unit] += 1;
    log(`Purchased a ${unit}.`);
    updateUI();
  } else {
    log(`Not enough gold to purchase ${unit}. Need ${cost} gold.`);
  }
}

document.getElementById('buyWarriorBtn').addEventListener('click', () => purchaseUnit('warrior'));
document.getElementById('buyArcherBtn').addEventListener('click', () => purchaseUnit('archer'));
document.getElementById('buyMageBtn').addEventListener('click', () => purchaseUnit('mage'));

// Invest in gods
function invest(godKey) {
  let cost = 50;
  // Air reduces cost of investing by 10% per Air point (but no discount on itself)
  if (godKey !== 'air') {
    const airDiscount = gameState.gods.air * 0.1;
    cost = Math.floor(cost * (1 - airDiscount));
  }
  if (gameState.gold >= cost) {
    gameState.gold -= cost;
    gameState.gods[godKey] += 1;
    log(`Invested in ${godKey.charAt(0).toUpperCase() + godKey.slice(1)}.`);
    updateUI();
  } else {
    log(`Not enough gold to invest in ${godKey}. Need ${cost} gold.`);
  }
}

document.getElementById('investFireBtn').addEventListener('click', () => invest('fire'));
document.getElementById('investWaterBtn').addEventListener('click', () => invest('water'));
document.getElementById('investEarthBtn').addEventListener('click', () => invest('earth'));
document.getElementById('investAirBtn').addEventListener('click', () => invest('air'));

// Map area events
document.getElementById('area1').addEventListener('click', () => {
  // Plains requirement minimal; simply progress to mapProgress 1
  gameState.mapProgress = Math.max(gameState.mapProgress, 1);
  log('Exploring Plains... You have secured the Plains!');
  updateBackground();
  updateUI();
});
document.getElementById('area2').addEventListener('click', () => {
  // require some strength (e.g. 10)
  if (totalStrength() < 10) {
    log('Not enough army strength to explore the Forest. Train more units.');
    return;
  }
  gameState.mapProgress = Math.max(gameState.mapProgress, 2);
  log('Exploring Forest... The trees whisper with magic. You advance!');
  updateBackground();
  updateUI();
});
document.getElementById('area3').addEventListener('click', () => {
  // require stronger army (e.g. 20)
  if (totalStrength() < 20) {
    log('Not enough army strength to explore the Mountains. Train more units.');
    return;
  }
  gameState.mapProgress = Math.max(gameState.mapProgress, 3);
  log('Exploring Mountains... You reached the peaks of power!');
  updateBackground();
  updateUI();
});

// Background color depending on mapProgress
function updateBackground() {
  const colors = ['#1a1a2e', '#2e1a1a', '#1a2e1a', '#2e1a2e'];
  ctx.fillStyle = colors[gameState.mapProgress];
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Dummy draw function for future
function draw() {
  // Additional canvas drawing (units, backgrounds) can be added here
}

// Game loop
function gameLoop() {
  draw();
  requestAnimationFrame(gameLoop);
}

// Initialize UI
updateUI();
updateBackground();
gameLoop();
