/* game.js - Extended Fantasy Stick Wars */
(function() {
  // Screen references
  const screens = {
    hubScreen: document.getElementById('hubScreen'),
    battleScreen: document.getElementById('battleScreen'),
    areaCompleteScreen: document.getElementById('areaCompleteScreen'),
    basicUpgradeScreen: document.getElementById('basicUpgradeScreen'),
    troopSelectScreen: document.getElementById('troopSelectScreen'),
    godUpgradeScreen: document.getElementById('godUpgradeScreen')
  };

  function showScreen(id) {
    for (const key in screens) {
      screens[key].style.display = key === id ? 'block' : 'none';
    }
  }

  // Game state
  const gameState = {
    age: 1,
    gold: 0,
    baseHealth: 100,
    turretLevel: 0,
    economyLevel: 0,
    upgradeSkillPoints: 0,
    worshipPoints: 0,
    gods: { fire: 0, water: 0, earth: 0, air: 0 },
    units: { warrior: 0, archer: 0, mage: 0 },
    selectedTroops: ['warrior','archer','mage'],
    currentArea: 1,
    playerBattleHealth: 0,
    enemyBattleHealth: 0
  };

  // Logging
  function logMessage(msg) {
    const logDiv = document.getElementById('log');
    const p = document.createElement('p');
    p.textContent = msg;
    logDiv.appendChild(p);
    logDiv.scrollTop = logDiv.scrollHeight;
  }

  // Cost functions
  function costWarrior() { return Math.max(10, 50 - gameState.gods.earth * 5); }
  function costArcher() { return Math.max(20, 100 - gameState.gods.earth * 10); }
  function costMage() { return Math.max(30, 150 - gameState.gods.earth * 15); }
  function ageCost() { return Math.max(10, gameState.age * 100 - gameState.gods.water * 20); }
  function goldPerMine() { return 10 + 5 * gameState.gods.fire + 5 * gameState.economyLevel; }

  // Update functions
  function updateHubUI() {
    document.getElementById('age').textContent = 'Age ' + gameState.age;
    document.getElementById('resources').textContent = 'Gold: ' + gameState.gold;
    document.getElementById('god1').textContent = 'God of Fire: ' + gameState.gods.fire;
    document.getElementById('god2').textContent = 'God of Water: ' + gameState.gods.water;
    document.getElementById('god3').textContent = 'God of Earth: ' + gameState.gods.earth;
    document.getElementById('god4').textContent = 'God of Air: ' + gameState.gods.air;
    document.getElementById('warriorCount').textContent = 'Warriors: ' + gameState.units.warrior;
    document.getElementById('archerCount').textContent = 'Archers: ' + gameState.units.archer;
    document.getElementById('mageCount').textContent = 'Mages: ' + gameState.units.mage;

    const wBtn = document.getElementById('buyWarriorBtn');
    const aBtn = document.getElementById('buyArcherBtn');
    const mBtn = document.getElementById('buyMageBtn');
    wBtn.textContent = 'Train Warrior (Cost: ' + costWarrior() + ')';
    aBtn.textContent = 'Train Archer (Cost: ' + costArcher() + ')';
    mBtn.textContent = 'Train Mage (Cost: ' + costMage() + ')';
    wBtn.disabled = gameState.gold < costWarrior();
    aBtn.disabled = gameState.age < 2 || gameState.gold < costArcher();
    mBtn.disabled = gameState.age < 3 || gameState.gold < costMage();

    document.getElementById('area1').disabled = !(gameState.currentArea === 1);
    document.getElementById('area2').disabled = !(gameState.currentArea === 2);
    document.getElementById('area3').disabled = !(gameState.currentArea === 3);
  }

  function updateBasicUpgradeUI() {
    document.getElementById('basicSkillPointsDisplay').textContent = gameState.upgradeSkillPoints;
    document.getElementById('upgradeBaseHealthBtn').disabled = gameState.upgradeSkillPoints <= 0;
    document.getElementById('upgradeTurretBtn').disabled = gameState.upgradeSkillPoints <= 0;
    document.getElementById('upgradeEconomyBtn').disabled = gameState.upgradeSkillPoints <= 0;
  }

  function updateTroopSelectUI() {
    document.getElementById('selectWarrior').checked = gameState.selectedTroops.includes('warrior');
    document.getElementById('selectArcher').checked = gameState.selectedTroops.includes('archer');
    document.getElementById('selectMage').checked = gameState.selectedTroops.includes('mage');
  }

  function updateGodUpgradeUI() {
    document.getElementById('worshipPointsDisplay').textContent = gameState.worshipPoints;
    const disable = gameState.worshipPoints <= 0;
    document.getElementById('worshipFireBtn').disabled = disable;
    document.getElementById('worshipWaterBtn').disabled = disable;
    document.getElementById('worshipEarthBtn').disabled = disable;
    document.getElementById('worshipAirBtn').disabled = disable;
  }

  // Battle start
  function startBattle(area) {
    gameState.currentArea = area;
    gameState.playerBattleHealth = gameState.baseHealth;
    gameState.enemyBattleHealth = 100 + (area - 1) * 50;
    document.getElementById('playerBaseHealth').textContent = gameState.playerBattleHealth;
    document.getElementById('enemyBaseHealth').textContent = gameState.enemyBattleHealth;
    showScreen('battleScreen');
  }

  function summonUnit(type) {
    let damage = 0;
    if (type === 'warrior' && gameState.units.warrior > 0) {
      gameState.units.warrior--;
      damage = 10;
    } else if (type === 'archer' && gameState.units.archer > 0) {
      gameState.units.archer--;
      damage = 20;
    } else if (type === 'mage' && gameState.units.mage > 0) {
      gameState.units.mage--;
      damage = 35;
    } else {
      logMessage('No ' + type + 's available to summon.');
      return;
    }
    gameState.enemyBattleHealth = Math.max(0, gameState.enemyBattleHealth - damage);
    document.getElementById('enemyBaseHealth').textContent = gameState.enemyBattleHealth;
    updateHubUI();
    logMessage('Summoned ' + type + ' for ' + damage + ' damage.');
    if (gameState.enemyBattleHealth <= 0) {
      finishBattle(true);
    }
  }

  function upgradeBaseDuringBattle() {
    const cost = 30;
    if (gameState.gold >= cost) {
      gameState.gold -= cost;
      gameState.playerBattleHealth += 20;
      document.getElementById('playerBaseHealth').textContent = gameState.playerBattleHealth;
      updateHubUI();
      logMessage('Upgraded base during battle.');
    } else {
      logMessage('Not enough gold to upgrade base.');
    }
  }

  function finishBattle(victory) {
    if (victory) {
      const skillPointsAwarded = 2;
      const worshipPointsAwarded = 1;
      gameState.upgradeSkillPoints += skillPointsAwarded;
      gameState.worshipPoints += worshipPointsAwarded;
      document.getElementById('areaCompleteMessage').textContent = 'You cleared Area ' + gameState.currentArea + '!';
      if (gameState.currentArea < 3) {
        gameState.currentArea += 1;
      }
    } else {
      document.getElementById('areaCompleteMessage').textContent = 'You were defeated in Area ' + gameState.currentArea + '.';
    }
    showScreen('areaCompleteScreen');
  }

  // Event listeners
  document.getElementById('mineBtn').addEventListener('click', () => {
    const goldGain = goldPerMine();
    gameState.gold += goldGain;
    updateHubUI();
    logMessage('Mined ' + goldGain + ' gold.');
  });

  document.getElementById('advanceAgeBtn').addEventListener('click', () => {
    const cost = ageCost();
    if (gameState.gold >= cost) {
      gameState.gold -= cost;
      gameState.age++;
      updateHubUI();
      logMessage('Advanced to Age ' + gameState.age + '.');
    } else {
      logMessage('Not enough gold to advance age.');
    }
  });

  document.getElementById('buyWarriorBtn').addEventListener('click', () => {
    const cost = costWarrior();
    if (gameState.gold >= cost) {
      gameState.gold -= cost;
      gameState.units.warrior++;
      updateHubUI();
      logMessage('Trained a Warrior.');
    } else {
      logMessage('Not enough gold to train Warrior.');
    }
  });

  document.getElementById('buyArcherBtn').addEventListener('click', () => {
    const cost = costArcher();
    if (gameState.gold >= cost) {
      gameState.gold -= cost;
      gameState.units.archer++;
      updateHubUI();
      logMessage('Trained an Archer.');
    } else {
      logMessage('Not enough gold to train Archer.');
    }
  });

  document.getElementById('buyMageBtn').addEventListener('click', () => {
    const cost = costMage();
    if (gameState.gold >= cost) {
      gameState.gold -= cost;
      gameState.units.mage++;
      updateHubUI();
      logMessage('Trained a Mage.');
    } else {
      logMessage('Not enough gold to train Mage.');
    }
  });

  // Invest in gods from hub
  document.getElementById('investFireBtn').addEventListener('click', () => {
    if (gameState.gold >= 50) {
      gameState.gold -= 50;
      gameState.gods.fire++;
      updateHubUI();
      logMessage('Invested in Fire.');
    } else {
      logMessage('Not enough gold to invest in Fire.');
    }
  });
  document.getElementById('investWaterBtn').addEventListener('click', () => {
    if (gameState.gold >= 50) {
      gameState.gold -= 50;
      gameState.gods.water++;
      updateHubUI();
      logMessage('Invested in Water.');
    } else {
      logMessage('Not enough gold to invest in Water.');
    }
  });
  document.getElementById('investEarthBtn').addEventListener('click', () => {
    if (gameState.gold >= 50) {
      gameState.gold -= 50;
      gameState.gods.earth++;
      updateHubUI();
      logMessage('Invested in Earth.');
    } else {
      logMessage('Not enough gold to invest in Earth.');
    }
  });
  document.getElementById('investAirBtn').addEventListener('click', () => {
    if (gameState.gold >= 50) {
      gameState.gold -= 50;
      gameState.gods.air++;
      updateHubUI();
      logMessage('Invested in Air.');
    } else {
      logMessage('Not enough gold to invest in Air.');
    }
  });

  document.getElementById('area1').addEventListener('click', () => startBattle(1));
  document.getElementById('area2').addEventListener('click', () => startBattle(2));
  document.getElementById('area3').addEventListener('click', () => startBattle(3));

  document.getElementById('summonWarriorBtn').addEventListener('click', () => summonUnit('warrior'));
  document.getElementById('summonArcherBtn').addEventListener('click', () => summonUnit('archer'));
  document.getElementById('summonMageBtn').addEventListener('click', () => summonUnit('mage'));
  document.getElementById('upgradeBaseBtn').addEventListener('click', () => upgradeBaseDuringBattle());
  document.getElementById('finishBattleBtn').addEventListener('click', () => {
    const victory = gameState.enemyBattleHealth <= 0;
    finishBattle(victory);
  });

  document.getElementById('continueToUpgradesBtn').addEventListener('click', () => {
    showScreen('basicUpgradeScreen');
    updateBasicUpgradeUI();
  });

  document.getElementById('upgradeBaseHealthBtn').addEventListener('click', () => {
    if (gameState.upgradeSkillPoints > 0) {
      gameState.upgradeSkillPoints--;
      gameState.baseHealth += 20;
      updateBasicUpgradeUI();
    }
  });
  document.getElementById('upgradeTurretBtn').addEventListener('click', () => {
    if (gameState.upgradeSkillPoints > 0) {
      gameState.upgradeSkillPoints--;
      gameState.turretLevel++;
      updateBasicUpgradeUI();
    }
  });
  document.getElementById('upgradeEconomyBtn').addEventListener('click', () => {
    if (gameState.upgradeSkillPoints > 0) {
      gameState.upgradeSkillPoints--;
      gameState.economyLevel++;
      updateBasicUpgradeUI();
    }
  });

  document.getElementById('continueToTroopSelectBtn').addEventListener('click', () => {
    showScreen('troopSelectScreen');
    updateTroopSelectUI();
  });

  function updateSelectedTroops() {
    const selections = [];
    if (document.getElementById('selectWarrior').checked) selections.push('warrior');
    if (document.getElementById('selectArcher').checked) selections.push('archer');
    if (document.getElementById('selectMage').checked) selections.push('mage');
    if (selections.length > 6) {
      selections.length = 6;
    }
    gameState.selectedTroops = selections;
  }
  document.getElementById('selectWarrior').addEventListener('change', updateSelectedTroops);
  document.getElementById('selectArcher').addEventListener('change', updateSelectedTroops);
  document.getElementById('selectMage').addEventListener('change', updateSelectedTroops);

  document.getElementById('continueToGodUpgradeBtn').addEventListener('click', () => {
    showScreen('godUpgradeScreen');
    updateGodUpgradeUI();
  });

  document.getElementById('worshipFireBtn').addEventListener('click', () => {
    if (gameState.worshipPoints > 0) {
      gameState.worshipPoints--;
      gameState.gods.fire++;
      updateGodUpgradeUI();
    }
  });
  document.getElementById('worshipWaterBtn').addEventListener('click', () => {
    if (gameState.worshipPoints > 0) {
      gameState.worshipPoints--;
      gameState.gods.water++;
      updateGodUpgradeUI();
    }
  });
  document.getElementById('worshipEarthBtn').addEventListener('click', () => {
    if (gameState.worshipPoints > 0) {
      gameState.worshipPoints--;
      gameState.gods.earth++;
      updateGodUpgradeUI();
    }
  });
  document.getElementById('worshipAirBtn').addEventListener('click', () => {
    if (gameState.worshipPoints > 0) {
      gameState.worshipPoints--;
      gameState.gods.air++;
      updateGodUpgradeUI();
    }
  });

  document.getElementById('finishUpgradesBtn').addEventListener('click', () => {
    updateHubUI();
    showScreen('hubScreen');
  });

  // Initial call
  updateHubUI();
  showScreen('hubScreen');
})();
