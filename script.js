/* script.js - Fantasy Stick Wars Game */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  // Set canvas width to full window width, height set by CSS
  canvas.width = window.innerWidth;
  // height remains as set in CSS via style; but adjust to element height
  canvas.height = document.getElementById('gameCanvas').offsetHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const gameState = {
  age: 1,
  resources: 0,
  gods: {
    fire: { points: 0 },
    water: { points: 0 },
    earth: { points: 0 },
    air: { points: 0 }
  },
  mapProgress: 0
};

function updateUI() {
  document.getElementById('age').textContent = 'Age ' + gameState.age;
  document.getElementById('resources').textContent = 'Gold: ' + gameState.resources;
  document.getElementById('god1').textContent = 'God of Fire: ' + gameState.gods.fire.points;
  document.getElementById('god2').textContent = 'God of Water: ' + gameState.gods.water.points;
  document.getElementById('god3').textContent = 'God of Earth: ' + gameState.gods.earth.points;
  document.getElementById('god4').textContent = 'God of Air: ' + gameState.gods.air.points;
}

function log(message) {
  const logDiv = document.getElementById('log');
  const entry = document.createElement('div');
  entry.textContent = message;
  logDiv.appendChild(entry);
  logDiv.scrollTop = logDiv.scrollHeight;
}

document.getElementById('mineBtn').addEventListener('click', () => {
  gameState.resources += 10;
  log('Mined 10 gold.');
  updateUI();
});

document.getElementById('advanceAgeBtn').addEventListener('click', () => {
  const cost = gameState.age * 100;
  if (gameState.resources >= cost) {
    gameState.resources -= cost;
    gameState.age += 1;
    log('Advanced to Age ' + gameState.age + ' (cost ' + cost + ' gold).');
    if (gameState.age >= 2) {
      document.getElementById('area2').disabled = false;
    }
    if (gameState.age >= 3) {
      document.getElementById('area3').disabled = false;
    }
    updateUI();
  } else {
    log('Not enough gold to advance age. Need ' + cost + ' gold.');
  }
});

function invest(godKey) {
  const cost = 50;
  if (gameState.resources >= cost) {
    gameState.resources -= cost;
    gameState.gods[godKey].points += 1;
    log('Invested in ' + godKey.charAt(0).toUpperCase() + godKey.slice(1) + '.');
    updateUI();
  } else {
    log('Not enough gold to invest in ' + godKey + '. Need ' + cost + ' gold.');
  }
}

document.getElementById('investFireBtn').addEventListener('click', () => invest('fire'));
document.getElementById('investWaterBtn').addEventListener('click', () => invest('water'));
document.getElementById('investEarthBtn').addEventListener('click', () => invest('earth'));
document.getElementById('investAirBtn').addEventListener('click', () => invest('air'));

document.getElementById('area1').addEventListener('click', () => {
  gameState.mapProgress = Math.max(gameState.mapProgress, 1);
  log('Exploring Plains... You have completed the first area!');
  document.getElementById('area1').disabled = true;
  document.getElementById('area2').disabled = false;
  updateBackground();
});
document.getElementById('area2').addEventListener('click', () => {
  gameState.mapProgress = Math.max(gameState.mapProgress, 2);
  log('Exploring Forest... New challenges await!');
  document.getElementById('area2').disabled = true;
  document.getElementById('area3').disabled = false;
  updateBackground();
});
document.getElementById('area3').addEventListener('click', () => {
  gameState.mapProgress = Math.max(gameState.mapProgress, 3);
  log('Exploring Mountains... You reached the third area!');
  document.getElementById('area3').disabled = true;
  updateBackground();
});

function updateBackground() {
  const colors = ['#1a1a2e', '#2e1a1a', '#1a2e1a', '#2e1a2e'];
  ctx.fillStyle = colors[gameState.mapProgress];
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function draw() {
  // Additional drawing code could go here; background is drawn via updateBackground
}

function gameLoop() {
  draw();
  requestAnimationFrame(gameLoop);
}

// Initialize UI and start game
updateUI();
updateBackground();
gameLoop();
