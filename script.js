// script.js - Fantasy Stick Wars Game Prototype
// Basic canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Game state object with placeholder properties
const gameState = {
  age: 1,            // current age level
  resources: 0,      // generic resource count
  upgrades: {},      // upgrade tree placeholder
  gods: {
    fire: { points: 0 },
    water: { points: 0 },
    earth: { points: 0 },
    air: { points: 0 }
  },
  units: [],         // array to hold units
  mapProgress: 0     // progress in campaign map
};

// Placeholder functions for game mechanics
function advanceAge() {
  // Logic to move to next age and unlock new units/upgrades
  gameState.age += 1;
  // TODO: unlock additional content based on new age
}

function purchaseUnit(type) {
  // Deduct resources and add a new unit of given type
  // TODO: implement unit cost and properties
  gameState.units.push({ type: type, health: 100 });
}

function investInGod(god) {
  // Spend points in a god skill tree to gain abilities
  if (gameState.gods[god]) {
    gameState.gods[god].points += 1;
    // TODO: apply bonuses based on god and points
  }
}

function update() {
  // Update game logic each frame
  // For now, this is a stub where future mechanics will be implemented
}

function draw() {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Draw placeholder UI text
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px sans-serif';
  ctx.fillText('Stick Wars Fantasy Prototype', 40, 50);
  ctx.fillText('Age: ' + gameState.age, 40, 80);
  ctx.fillText('Resources: ' + gameState.resources, 40, 110);
  ctx.fillText('Fire God Points: ' + gameState.gods.fire.points, 40, 140);
  ctx.fillText('Water God Points: ' + gameState.gods.water.points, 40, 170);
  ctx.fillText('Earth God Points: ' + gameState.gods.earth.points, 40, 200);
  ctx.fillText('Air God Points: ' + gameState.gods.air.points, 40, 230);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();
