const BG_PARALLAX = { 1: 1.0, 2: 1.0, 3: 1.0 };

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Tooltip element for unit descriptions. This div is defined in index.html.
  const tooltip = document.getElementById('tooltip');

  // Scaling factor for enlarging units and bases. By increasing this value you
  // enlarge the game elements so that they use more of the available
  // battlefield. A factor of 1 means original size.
  const SCALE = 1.4;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function drawRoundedRect(ctx, x, y, w, h, r, fillStyle, strokeStyle) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.stroke();
    }
  }

  class ManaPlant {
    constructor(x, y, side) {
      this.x = x;
      this.y = y;
      this.side = side; // 'player' or 'enemy'
      this.occupied = false;
      this.harvester = null;
    }

  // ==== Drawing Functions ====
  draw(stage) {
      const S = SCALE;
      ctx.save();
      // Stem
      ctx.strokeStyle = this.side === 'player' ? '#6ad6f0' : '#d05e6e';
      ctx.lineWidth = 4 * S;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x, this.y - 25 * S);
      ctx.stroke();
      // Leaves
      ctx.fillStyle = this.side === 'player' ? '#7cd7ff' : '#f26c6c';
      ctx.beginPath();
      ctx.ellipse(this.x - 8 * S, this.y - 15 * S, 10 * S, 5 * S, -Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(this.x + 8 * S, this.y - 15 * S, 10 * S, 5 * S, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      // Bud
      const budColor = this.side === 'player'
        ? (stage === 1 ? '#a86dff' : '#8ec2ff')
        : (stage === 1 ? '#ff5e5e' : '#ff8e5e');
      ctx.fillStyle = budColor;
      ctx.beginPath();
      ctx.arc(this.x, this.y - 30 * S, 6 * S, 0, Math.PI * 2);
      ctx.fill();

      
      const time = Date.now() / 800;
      for (let i = 0; i < 4; i++) {
        const angle = time + i * Math.PI / 2;
        const radius = 12 * S;
        const sx = this.x + radius * Math.cos(angle);
        const sy = (this.y - 30 * S) + radius * Math.sin(angle);
        const alpha = 0.4 + 0.4 * Math.sin(time * 2 + i);
        // Player sparkles blueish, enemy reddish
        const sparkleColor = this.side === 'player'
          ? `rgba(180,220,255,${alpha})`
          : `rgba(255,120,140,${alpha})`;
        ctx.fillStyle = sparkleColor;
        ctx.beginPath();
        ctx.arc(sx, sy, 2 * S, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  class Base {
    constructor(side, x, y) {
      this.side = side; // 'player' or 'enemy'
      this.x = x;
      this.y = y;
      // Bases scale up with SCALE to fill more of the play area
      this.width = 80 * SCALE;
      this.height = 120 * SCALE;
      this.maxHp = 1000;
      this.hp = this.maxHp;
     
      this.hasTurret = false;
      this.turretCooldown = 0;
      this.turrets = [];
    }
    takeDamage(amount) {
      this.hp -= amount;
      if (this.hp < 0) this.hp = 0;
    }

  // ==== Drawing Functions ====
  draw() {
      // Draw base body and HP bar based on side
      if (this.side === 'player') {
        this.drawArcaneTower();
      } else {
        this.drawObsidianGate();
      }
      // HP bar
      const barWidth = 100;
      const barHeight = 6;
      const hpRatio = this.hp / this.maxHp;
      const barX = this.x + (this.width / 2) - (barWidth / 2);
      const barY = this.y - 20;
      ctx.fillStyle = '#444';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = this.side === 'player' ? '#36f0a8' : '#f03636';
      ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(barX, barY, barWidth, barHeight);

    
      const turretCount = this.turrets ? this.turrets.length : 0;
      for (let i = 0; i < turretCount; i++) {
        const turret = this.turrets[i];
        const offsetX = (i - (turretCount - 1) / 2) * 20 * SCALE;
        if (turret.type === 'bullet') {
          // Draw a small arcane cannon: a rectangle barrel on a pedestal
          const tx = this.x + this.width / 2 + offsetX;
          const ty = this.y + this.height * 0.25;
          ctx.fillStyle = '#5cd4f3';
          ctx.fillRect(tx - 6 * SCALE, ty - 8 * SCALE, 12 * SCALE, 6 * SCALE);
          ctx.fillStyle = '#308da8';
          ctx.fillRect(tx - 4 * SCALE, ty - 2 * SCALE, 8 * SCALE, 4 * SCALE);
        } else if (turret.type === 'mage') {
          // Draw a little mage: robe, head and a glowing staff
          const tx = this.x + this.width / 2 + offsetX;
          const ty = this.y + this.height * 0.2;
          // Robe
          ctx.fillStyle = '#bc6ef8';
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx - 6 * SCALE, ty + 12 * SCALE);
          ctx.lineTo(tx + 6 * SCALE, ty + 12 * SCALE);
          ctx.closePath();
          ctx.fill();
          // Head
          ctx.fillStyle = '#f2d6ff';
          ctx.beginPath();
          ctx.arc(tx, ty - 4 * SCALE, 3 * SCALE, 0, Math.PI * 2);
          ctx.fill();
          // Hat
          ctx.fillStyle = '#8e4dc9';
          ctx.beginPath();
          ctx.moveTo(tx, ty - 6 * SCALE);
          ctx.lineTo(tx - 4 * SCALE, ty - 2 * SCALE);
          ctx.lineTo(tx + 4 * SCALE, ty - 2 * SCALE);
          ctx.closePath();
          ctx.fill();
          // Staff with glow
          ctx.strokeStyle = '#d3a6ff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tx + 5 * SCALE, ty + 12 * SCALE);
          ctx.lineTo(tx + 5 * SCALE, ty);
          ctx.stroke();
          ctx.fillStyle = 'rgba(200, 180, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(tx + 5 * SCALE, ty, 2 * SCALE, 0, Math.PI * 2);
          ctx.fill();
        } else if (turret.type === 'cloud') {
          const frontX = this.side === 'player' ? this.x + this.width + 60 * SCALE : this.x - 60 * SCALE;
          const tx = frontX + offsetX;
          const ty = this.y + this.height * 0.15;
          ctx.fillStyle = '#b5aaff';
          ctx.beginPath();
          ctx.arc(tx - 10 * SCALE, ty, 8 * SCALE, 0, Math.PI * 2);
          ctx.arc(tx, ty - 5 * SCALE, 9 * SCALE, 0, Math.PI * 2);
          ctx.arc(tx + 10 * SCALE, ty, 8 * SCALE, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    drawArcaneTower() {
      ctx.save();
      ctx.translate(this.x, this.y);
      // base rectangle
      ctx.fillStyle = '#4a4a8c';
      ctx.fillRect(0, 0, this.width, this.height);
      // tower spire
      ctx.fillStyle = '#6e6ec3';
      ctx.beginPath();
      ctx.moveTo(this.width / 2, -40);
      ctx.lineTo(-10, this.height / 2);
      ctx.lineTo(this.width + 10, this.height / 2);
      ctx.closePath();
      ctx.fill();
      // glowing crystal on top
      ctx.fillStyle = '#a37aff';
      ctx.beginPath();
      ctx.arc(this.width / 2, -50, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    drawObsidianGate() {
      ctx.save();
      ctx.translate(this.x, this.y);
      // main fortress body
      ctx.fillStyle = '#2a1a2a';
      ctx.fillRect(0, 0, this.width, this.height);
      // arch
      ctx.fillStyle = '#3d233d';
      ctx.beginPath();
      ctx.moveTo(0, this.height);
      ctx.lineTo(this.width / 2, this.height - 40);
      ctx.lineTo(this.width, this.height);
      ctx.closePath();
      ctx.fill();
      // lava veins
      ctx.strokeStyle = '#ff5e5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.width * 0.25, this.height);
      ctx.lineTo(this.width * 0.35, this.height * 0.3);
      ctx.moveTo(this.width * 0.75, this.height);
      ctx.lineTo(this.width * 0.65, this.height * 0.3);
      ctx.stroke();
      ctx.restore();
    }

  // ==== Update Loop ====
  update(delta, game) {
      if (this.hasTurret && this.turrets.length === 0) {
        this.turrets.push({ type: 'bullet', cooldown: 0 });
      }
      for (const turret of this.turrets) {
        turret.cooldown -= delta;
        if (turret.cooldown <= 0) {
          // Determine firing parameters based on turret type
          let range = 250;
          let damage = 20;
          let splash = false;
          let projRadius = 4;
          let cooldownTime = 2.5;
          if (turret.type === 'mage') {
            range = 280;
            damage = 25;
            cooldownTime = 3.0;
            projRadius = 5;
          } else if (turret.type === 'cloud') {
            range = 320;
            damage = 35;
            splash = true;
            cooldownTime = 2.0; // faster fire rate for rain
            projRadius = 6;
          }
          // Cloud turrets rain down from a fixed position in front of the base
          if (turret.type === 'cloud') {        
            const cloudX = this.side === 'player' ? this.x + this.width + 60 * SCALE : this.x - 60 * SCALE;
            const startX = cloudX;
            const startY = this.y + this.height * 0.15;
            // Rain falls straight down onto units passing underneath; no horizontal velocity
            const vx = 0;
            const vy = 250;
            const proj = new Projectile(startX, startY, vx, vy, damage, this.side, projRadius, true);
            game.projectiles.push(proj);
            turret.cooldown = cooldownTime;
            continue;
          }
          // For bullet and mage turrets, find nearest target within range
          let nearest = null;
          let nearestDist = Infinity;
          const enemyUnits = this.side === 'player' ? game.enemyUnits : game.playerUnits;
          for (const unit of enemyUnits) {
            if (!unit.alive) continue;
            // horizontal distance from base edge depending on side
            const dx = (unit.x - this.x) - (this.side === 'player' ? this.width : 0);
            const dy = unit.y - (this.y + this.height / 2);
            const dist = Math.hypot(dx, dy);
            if (dist < nearestDist && dist <= range) {
              nearest = unit;
              nearestDist = dist;
            }
          }
          if (nearest) {
            // Standard or mage turret: fire directly at target
            const startX = this.side === 'player' ? this.x + this.width : this.x;
            const startY = this.y + this.height / 3;
            const angle = Math.atan2(nearest.y - startY, nearest.x - startX);
            const speed = 300;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const proj = new Projectile(startX, startY, vx, vy, damage, this.side, projRadius, splash);
            game.projectiles.push(proj);
            turret.cooldown = cooldownTime;
          }
        }
      }
    }
    fireAt(target, game) {
      // Create a projectile heading towards target
      const startX = this.side === 'player' ? this.x + this.width : this.x;
      const startY = this.y + this.height * 0.5;
      const angle = Math.atan2(target.y - startY, target.x - startX);
      const speed = 300; // px per second
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const damage = 20;
      const projectile = new Projectile(startX, startY, vx, vy, damage, this.side);
      game.projectiles.push(projectile);
    }
  }

  class Projectile {
    constructor(x, y, vx, vy, damage, originSide, radius = 4, splash = false) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.damage = damage;
      this.originSide = originSide; // 'player' or 'enemy'
      this.radius = radius;
      this.splash = splash;
      this.alive = true;
    }

  // ==== Update Loop ====
  update(delta, game) {
      this.x += this.vx * delta;
      this.y += this.vy * delta;
      // Check offscreen
      if (this.x < -50 || this.x > canvas.width + 50 || this.y < -50 || this.y > canvas.height + 50) {
        this.alive = false;
        return;
      }
      // Collision detection
      const targets = this.originSide === 'player' ? game.enemyUnits : game.playerUnits;
      for (const unit of targets) {
        // Skip dead or intangible
        if (!unit.alive) continue;
        // ground melee cannot hit flying if projectile is not anti-air? We'll allow all projectiles to hit air.
        const dx = unit.x - this.x;
        const dy = unit.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < this.radius + unit.hitRadius) {
          // Hit!
          if (this.splash) {
            // Splash area damage
            const splashRadius = 30;
            for (const u of targets) {
              const d2 = Math.hypot(u.x - this.x, u.y - this.y);
              if (d2 < splashRadius + u.hitRadius) {
                u.takeDamage(this.damage);
              }
            }
            // Add explosion particles
            game.spawnExplosion(this.x, this.y, this.originSide);
          } else {
            unit.takeDamage(this.damage);
          }
          this.alive = false;
          return;
        }
      }
    }

  // ==== Drawing Functions ====
  draw() {
      ctx.fillStyle = this.originSide === 'player' ? '#aef' : '#f68';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  class Unit {
    constructor(side, x, y, config) {
      this.side = side; // 'player' or 'enemy'
      this.x = x;
      this.y = y;
      this.hp = config.hp;
      this.maxHp = config.hp;
      this.speed = config.speed;
      this.range = config.range;
      this.damage = config.damage;
      this.cooldownMax = config.cooldown;
      this.cooldown = 0;
      this.hitRadius = config.hitRadius || 12;
      this.drawFunc = config.drawFunc;
      this.isRanged = config.isRanged || false;
      this.isFlying = config.isFlying || false;
      this.canAttackAir = config.canAttackAir || false;
      this.splash = config.splash || false;
      this.knockback = config.knockback || 0;
      this.canPassMelee = config.canPassMelee || false;
      this.alive = true;
      this.controlled = false;

      this.attackAnimTimer = 0;
    }
    takeDamage(amount) {
      this.hp -= amount;
      if (this.hp <= 0) {
        this.alive = false;
      }
    }

  // ==== Drawing Functions ====
  draw() {
      if (!this.alive) return;
      ctx.save();
      this.drawFunc(ctx, this);
      ctx.restore();
      // HP bar above unit
      const barWidth = 30;
      const barHeight = 4;
      const hpRatio = this.hp / this.maxHp;
      ctx.fillStyle = '#000';
      ctx.fillRect(this.x - barWidth / 2, this.y - this.hitRadius - 12, barWidth, barHeight);
      ctx.fillStyle = this.side === 'player' ? '#36f0a8' : '#f03636';
      ctx.fillRect(this.x - barWidth / 2, this.y - this.hitRadius - 12, barWidth * hpRatio, barHeight);
    }
  }

  class EconomyUnit {
    constructor(side, base, plants) {
      this.side = side;
      this.base = base;
      this.plants = plants;
      this.speed = 60; // px/s
      // States: toPlant -> walking to plant; channeling -> harvesting; returning -> depositing
      this.state = 'toPlant';
      this.targetPlant = null;
      this.channelTime = 3; // seconds to channel
      this.channelTimer = 0;

      if (base.side === 'player') {
        this.x = base.x - 10 * SCALE;
      } else {
        this.x = base.x + base.width + 10 * SCALE;
      }
      // Vertical spawn slightly above the ground
      this.y = base.y + base.height * 0.85;
    }

  // ==== Update Loop ====
  update(delta, game) {
      if (this.state === 'toPlant') {
        if (!this.targetPlant) {
          // Find an available plant. Prefer a plant that currently has no
          // harvester assigned. If all plants are busy, pick the first one.
          let freePlant = null;
          for (const plant of this.plants) {
            if (!plant.harvester) {
              freePlant = plant;
              break;
            }
          }
          this.targetPlant = freePlant || this.plants[0];
        }
        if (this.targetPlant) {
          // move towards target plant
          const dx = this.targetPlant.x - this.x;
          const dy = this.targetPlant.y - this.y;
          const dist = Math.hypot(dx, dy);
          // Arrival threshold
          const threshold = 5 * SCALE;
          if (dist < threshold) {
            // reached plant
            // Only begin channeling if the plant is not currently being
            // harvested by another unit. Otherwise wait patiently.
            if (!this.targetPlant.harvester) {
              this.targetPlant.harvester = this;
              // Mark plant as occupied for legacy code
              this.targetPlant.occupied = true;
              this.state = 'channeling';
              this.channelTimer = this.channelTime;
            } else {
              // Stay near the plant until it becomes free. Slightly jitter to
              // avoid overlapping perfectly (optional). No movement.
            }
          } else {
            this.x += (dx / dist) * this.speed * delta;
            this.y += (dy / dist) * this.speed * delta;
          }
        }
      } else if (this.state === 'channeling') {
        this.channelTimer -= delta;
        if (this.channelTimer <= 0) {
          // finished harvesting
          this.state = 'returning';
        }
      } else if (this.state === 'returning') {
        const targetX = this.base.x + this.base.width / 2;
        const targetY = this.base.y + this.base.height - 10 * SCALE;
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);
        const threshold = 20 * SCALE;
        if (dist < threshold) {
          // deposit mana
          if (this.side === 'player') {
            game.playerMana = Math.min(game.playerMana + game.manaPerTrip, game.playerManaCap);
          } else {
            game.enemyMana += game.manaPerTrip;
          }
          // Update UI after deposit so upgrade buttons reflect new mana
          game.updateUI();
          // free plant
          if (this.targetPlant) {
            if (this.targetPlant.harvester === this) {
              this.targetPlant.harvester = null;
              this.targetPlant.occupied = false;
            }
            this.targetPlant = null;
          }
          // restart cycle
          this.state = 'toPlant';
        } else {
          // move towards deposit
          this.x += (dx / dist) * this.speed * delta;
          this.y += (dy / dist) * this.speed * delta;
        }
      }
    }

  // ==== Drawing Functions ====
  draw(stage) {
      ctx.save();
      const S = SCALE;
      // Fairy body and wings. Use soft pastel colours for player and warm pinks for enemy.
      const bodyColor = this.side === 'player' ? '#c8e7ff' : '#f8b3d1';
      const wingColor = this.side === 'player'
        ? 'rgba(210,240,255,0.5)'
        : 'rgba(255,190,220,0.5)';
      // Wings: draw larger translucent wings with slight upward tilt
      ctx.fillStyle = wingColor;
      ctx.beginPath();
      ctx.ellipse(this.x - 8 * S, this.y - 2 * S, 10 * S, 6 * S, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(this.x + 8 * S, this.y - 2 * S, 10 * S, 6 * S, 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Body: slender torso with dress shape
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - 5 * S);
      ctx.quadraticCurveTo(this.x - 4 * S, this.y + 4 * S, this.x, this.y + 10 * S);
      ctx.quadraticCurveTo(this.x + 4 * S, this.y + 4 * S, this.x, this.y - 5 * S);
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.arc(this.x, this.y - 9 * S, 4 * S, 0, Math.PI * 2);
      ctx.fill();
      // Hair: a small arc on top of the head
      ctx.fillStyle = this.side === 'player' ? '#ffe5f9' : '#ffd6e8';
      ctx.beginPath();
      ctx.arc(this.x, this.y - 11 * S, 3 * S, 0, Math.PI * 2);
      ctx.fill();
      // Wand or star above head to emphasise magic
      ctx.fillStyle = this.side === 'player' ? '#d8f3ff' : '#ffd5eb';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - 15 * S);
      for (let i = 0; i < 5; i++) {
        const angle = i * (2 * Math.PI / 5) - Math.PI / 2;
        const r = 2.5 * S;
        ctx.lineTo(this.x + Math.cos(angle) * r, this.y - 15 * S + Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();
      // Face sparkle/eyes (small white dot)
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.x + 1 * S, this.y - 9 * S, 0.8 * S, 0, Math.PI * 2);
      ctx.fill();
      const game = window.game;
      if (game) {
        const level = Math.max(0, Math.floor((game.manaPerTrip - 25) / 10));
        // Base width and height of the bar
        const baseW = 20 * S;
        const baseH = 3 * S;
        // Increase bar dimensions per level
        const barW = baseW + level * 4 * S;
        const barH = baseH + level * 0.8 * S;
        // Compute progress (0 to 1). Only show bar while channeling.
        let progress = 0;
        if (this.state === 'channeling') {
          progress = (this.channelTime - this.channelTimer) / this.channelTime;
        }
        const bx = this.x - barW / 2;
        const by = this.y + 12 * S;
        ctx.fillStyle = '#3d3d6f';
        ctx.fillRect(bx, by, barW, barH);
        // Fill colour depends on side and level. Higher levels use a
        // brighter colour to emphasise upgrades.
        let colour;
        if (this.side === 'player') {
          const baseColour = [100, 200, 255];
          const boost = level * 20;
          colour = `rgb(${baseColour[0] + boost},${baseColour[1] + boost},${baseColour[2] + boost})`;
        } else {
          const baseColour = [255, 140, 160];
          const boost = level * 20;
          colour = `rgb(${Math.min(255, baseColour[0] + boost)},${Math.min(255, baseColour[1] + boost)},${Math.min(255, baseColour[2] + boost)})`;
        }
        ctx.fillStyle = colour;
        ctx.fillRect(bx, by, barW * progress, barH);
        // Outline
        ctx.strokeStyle = '#4a4a7a';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, barW, barH);
      }
      ctx.restore();
    }
  }

  class Game {

  // ==== Game Setup ====
    constructor() {
      // Entities
      this.playerUnits = [];
      this.enemyUnits = [];
      this.projectiles = [];
      this.econUnits = [];
      this.enemyEconUnits = [];
      // Reset mana plants for each side.  Each side will maintain its own list
      // of plants behind its base from which its harvesters gather mana.
      this.playerPlants = [];
      this.enemyPlants = [];
      this.stage = 1;
      this.playerBase = null;
      this.enemyBase = null;
      // Economy
      this.playerMana = 0;
      this.playerManaCap = 200;
      this.enemyMana = 0;
      this.enemyManaCap = 1000;
      this.manaPerTrip = 25;
      // AI
      this.enemySpawnTimer = 0;
      this.enemySpawnInterval = 8; // seconds initially, will update per stage
      // Input
      this.keys = {};
      this.controlledUnit = null;
      // Upgrades
      this.upgrades = [];
      this.upgradeMenuVisible = false;
      // Track currently selected upgrade category. Default to mana.
      this.currentUpgradeCategory = 'mana';
      // Stage backgrounds
      this.stageBackgroundDrawers = {
        3: this.drawBackgroundStage3.bind(this),
        1: this.
  // ==== Background Functions ====
  drawBackgroundStage1.bind(this),
        2: this.drawBackgroundStage2.bind(this)
      };
      // Track unlocked units (persistent across stages)
      this.unlocksBought = {
        swordsman: true,
        witch: true,
        golem: true,
        rogue: false,
        drake: false
      };
      this.bgMushrooms = [];
      this.bgCracks = [];
      this.bgLavaPits = [];

      this.bgStars = [];

      // Track upgrade purchases
      this.upgradeStates = {};


      // Game paused flag
      this.paused = false;

      this.skillPoints = 0;
      this.passiveUpgrades = {
        manaBoost: false,
        hpBoost: false,
        damageBoost: false,
        speedBoost: false
      };
      this.damageMultiplier = 1;
      this.speedMultiplier = 1;
      this.selectedUnits = ['swordsman', 'witch', 'golem'];
      this.groundStart = 0.65;
      this.commandMode = 'attack';
      // Camera settings for horizontal scrolling. The battlefield world is
      // wider than the visible canvas. cameraX defines the current view
      // offset, worldWidth defines total width, and cameraSpeed
      // determines scroll speed. scrollLeft/scrollRight flags respond to
      // key presses.
      this.cameraX = 0;
      // Define the width of the entire scrollable world.  Each stage can
      // adjust this value when loaded.  A default of 1.6× Use worldWidth rather than
      // canvas.width when clamping unit positions so that manual
      // movement works across the extended battlefield.
      this.worldWidth = canvas.width * 1.6;
        this.cameraX = 0;
      this.cameraSpeed = 300;
      this.scrollLeft = false;
      this.scrollRight = false;
      // Track which stage will load after the skill screen is closed.
      this.nextStage = null;
      this.fallingStars = [];
      this.fallingStarTimer = 0;
      this.nextFallingStarTime = 0;
    }

    purchaseUpgrade(up, listElement) {
      if (this.playerMana < up.cost) return;
      // Deduct mana
      this.playerMana -= up.cost;
      // Apply the upgrade effect in the context of this Game instance.
      if (typeof up.apply === 'function') {
        // Bind `this` manually to ensure the upgrade applies on the game
        // instance, even if the original apply function was an arrow
        // capturing a different context.
        up.apply.call(this);
      }
      // For non‑repeatable upgrades, mark as purchased and remove from list
      if (!up.repeatable && up.id) {
        this.upgradeStates[up.id] = true;
        this.upgrades = this.upgrades.filter(u => u.id !== up.id);
      }
      // Update UI and repopulate menu if visible
      this.updateUI();
      if (this.upgradeMenuVisible && listElement) {
        this.populateUpgradeMenu(listElement);
      }
    }

    buyUpgradeById(id) {
      // Find the upgrade by id. Repeatable upgrades also have id
      // properties so they can be purchased multiple times.
      const up = this.upgrades.find(u => u.id === id);
      if (!up) return;
      const listEl = document.getElementById('upgradeList');
      this.purchaseUpgrade(up, listEl);
    }
    init() {
      // Initialize event listeners (keyboard, mouse, UI)
      this.initEventListeners();
      // Load the first stage of the campaign
      this.loadStage(1);
      window.game = this;
    }

    buyUpgradeById(id) {
      const up = this.upgrades.find(u => u.id === id);
      if (up) {
        const listEl = document.getElementById('upgradeList');
        this.purchaseUpgrade(up, listEl);
      }
    }
    loadStage(stage) {
      this.stage = stage;
      // Reset entities and economy
      this.playerUnits = [];
      this.enemyUnits = [];
      this.projectiles = [];
      this.econUnits = [];
      this.enemyEconUnits = [];
      this.playerPlants = [];
      this.enemyPlants = [];
      this.controlledUnit = null;
      // Do not reset playerMana here; leftover mana carries into the next stage
      // Reset enemy mana each stage
      this.enemyMana = 0;
      // Configure stage specific parameters
      if (stage === 1) {
        // Default world width for stage 1 (mild scrolling) and reset camera
        this.worldWidth = canvas.width * 1.6;
        this.cameraX = 0;
        this.cameraX = 0;
        // Player base and enemy base positions
        // Move bases forward to make space behind them for mana plants.
        const margin = 140;
        this.playerBase = new Base('player', margin, 0);
        // Position base near the horizon (ground line at 65% of canvas height)
        // Position the base so that its bottom sits roughly midway between
        // the horizon (groundStart) and the bottom of the canvas.  Using
        // (groundStart + (1 - groundStart) * 0.5) yields a y‑coordinate
        // halfway between the horizon and the bottom.  Subtract the base
        // height to anchor the base on this ground line.  This moves the
        // castle downwards compared to earlier builds so it appears firmly
        // on the ground rather than floating on the horizon.
        this.playerBase.y = canvas.height * (this.groundStart + (1 - this.groundStart) * 0.5) - this.playerBase.height;
        this.playerBase.maxHp = 800;
        this.playerBase.hp = this.playerBase.maxHp;
        this.enemyBase = new Base('enemy', 0, 0);
        this.enemyBase.y = canvas.height * (this.groundStart + (1 - this.groundStart) * 0.5) - this.enemyBase.height;
        // Position enemy base near the far right of the world, leaving only a
        // small area behind it for its mana plants. Use worldWidth instead
        // of canvas.width so the battlefield extension is respected.
        this.enemyBase.x = this.worldWidth - this.enemyBase.width - margin;
        this.enemyBase.maxHp = 800;
        this.enemyBase.hp = this.enemyBase.maxHp;
        // Spawn one mana plant behind each base
        const playerPlantX = this.playerBase.x - 50;
        const playerPlantY = this.playerBase.y + this.playerBase.height * 0.8;
        this.playerPlants.push(new ManaPlant(playerPlantX, playerPlantY, 'player'));
        const enemyPlantX = this.enemyBase.x + this.enemyBase.width + 50;
        const enemyPlantY = this.enemyBase.y + this.enemyBase.height * 0.8;
        this.enemyPlants.push(new ManaPlant(enemyPlantX, enemyPlantY, 'enemy'));
        // Economy units for both sides. Start with a single harvester for each side.
        this.econUnits.push(new EconomyUnit('player', this.playerBase, this.playerPlants));
        this.enemyEconUnits.push(new EconomyUnit('enemy', this.enemyBase, this.enemyPlants));
        this.enemySpawnInterval = 7; // slower spawning in stage 1
        // Available units list
        this.availableUnits = ['swordsman', 'witch', 'golem'];
        this.unlocksBought = { swordsman: true, witch: true, golem: true, rogue: false, drake: false };
        // Upgrades definition
        this.initUpgrades();
        // Generate static background decorations for stage 1
        this.generateBackgroundDecorations(1);

        if (this.playerMana < 60) {
          this.playerMana = 60;
        }

        this.fallingStars = [];
        this.fallingStarTimer = 0;
        this.nextFallingStarTime = 15 + Math.random() * 10;
      } else if (stage === 2) {
        // Slightly larger world for stage 2
        this.worldWidth = canvas.width * 1.8;
        this.cameraX = 0;
        // Stage 2 resets bases but increases difficulty
        const margin = 140;
        this.playerBase = new Base('player', margin, 0);
        // Position the stage 2 base halfway between the horizon and the bottom of the canvas
        this.playerBase.y = canvas.height * (this.groundStart + (1 - this.groundStart) * 0.5) - this.playerBase.height;
        this.playerBase.maxHp = 1000;
        this.playerBase.hp = this.playerBase.maxHp;
        this.enemyBase = new Base('enemy', 0, 0);
        this.enemyBase.y = canvas.height * (this.groundStart + (1 - this.groundStart) * 0.5) - this.enemyBase.height;
        // Position enemy base near the far right of the world to leave
        // limited space behind it for plants. Use worldWidth instead of
        // canvas.width.
        this.enemyBase.x = this.worldWidth - this.enemyBase.width - margin;
        this.enemyBase.maxHp = 1200;
        this.enemyBase.hp = this.enemyBase.maxHp;
        // Plants for stage 2: one initial plant behind each base
        const pPlantX2 = this.playerBase.x - 50;
        const pPlantY2 = this.playerBase.y + this.playerBase.height * 0.8;
        this.playerPlants.push(new ManaPlant(pPlantX2, pPlantY2, 'player'));
        const ePlantX2 = this.enemyBase.x + this.enemyBase.width + 50;
        const ePlantY2 = this.enemyBase.y + this.enemyBase.height * 0.8;
        this.enemyPlants.push(new ManaPlant(ePlantX2, ePlantY2, 'enemy'));
        // Increase number of economy units for stage 2 (one additional on each side)
        this.econUnits.push(new EconomyUnit('player', this.playerBase, this.playerPlants));
        this.enemyEconUnits.push(new EconomyUnit('enemy', this.enemyBase, this.enemyPlants));
        this.enemySpawnInterval = 4; // faster spawns
        this.availableUnits = this.selectedUnits.slice();
        for (const type of this.availableUnits) {
          this.unlocksBought[type] = true;
        }
        // Base turret for enemy on stage 2
        this.enemyBase.hasTurret = true;
        this.initUpgrades(false);
        // Generate static background decorations for stage 2
        this.generateBackgroundDecorations(2);

        this.fallingStars = [];
        this.fallingStarTimer = 0;
        this.nextFallingStarTime = 10 + Math.random() * 6;
      }
      else if (stage === 3) {
        // Stage 3 setup: match Stage 1 scroll width and margin
        const margin = 140;
        this.worldWidth = canvas.width * 1.6;
        this.cameraX = 0;
        this.playerBase = new Base('player', margin, 0);
        this.playerBase.y = canvas.height * (this.groundStart + (1 - this.groundStart) * 0.5) - this.playerBase.height;
        this.playerBase.maxHp = 1200;
        this.playerBase.hp = this.playerBase.maxHp;
        this.enemyBase = new Base('enemy', 0, 0);
        this.enemyBase.y = canvas.height * (this.groundStart + (1 - this.groundStart) * 0.5) - this.enemyBase.height;
        this.enemyBase.x = this.worldWidth - this.enemyBase.width - margin;
        this.enemyBase.maxHp = 1400;
        this.enemyBase.hp = this.enemyBase.maxHp;
        const pX3 = this.playerBase.x - 50;
        const pY3 = this.playerBase.y + this.playerBase.height * 0.8;
        this.playerPlants.push(new ManaPlant(pX3, pY3, 'player'));
        const eX3 = this.enemyBase.x + this.enemyBase.width + 50;
        const eY3 = this.enemyBase.y + this.enemyBase.height * 0.8;
        this.enemyPlants.push(new ManaPlant(eX3, eY3, 'enemy'));
        // Increase economy units: two mages for player and enemy by default
        this.econUnits.push(new EconomyUnit('player', this.playerBase, this.playerPlants));
        this.enemyEconUnits.push(new EconomyUnit('enemy', this.enemyBase, this.enemyPlants));
        this.enemyEconUnits.push(new EconomyUnit('enemy', this.enemyBase, this.enemyPlants));
        // Enemy spawns faster and has more types including the Shadow Wraith
        this.enemySpawnInterval = 3.5;
        // Available player units for stage 3 come from the selection
        this.availableUnits = this.selectedUnits.slice();
        // Unlock any units present in selection
        for (const type of this.availableUnits) {
          this.unlocksBought[type] = true;
        }
        // Give enemy base a mage turret by default to increase challenge
        this.enemyBase.turrets.push({ type: 'mage', cooldown: 0 });
        this.initUpgrades(false);
        // Generate background decorations: reuse stage 2’s cracked wasteland
        this.generateBackgroundDecorations(2);
        this.fallingStars = [];
        this.fallingStarTimer = 0;
        this.nextFallingStarTime = 8 + Math.random() * 4;
      }
      // Create UI for unit buttons
      this.buildUnitButtons();
      this.updateUI();
      // Reset timers
      this.enemySpawnTimer = 0;

      // Prepare upgrade menu list without automatically displaying it
      const upgradeMenu = document.getElementById('upgradeMenu');
      const upgradeList = document.getElementById('upgradeList');
      this.upgradeMenuVisible = false;
      this.populateUpgradeMenu(upgradeList);
      upgradeMenu.classList.add('hidden');
    }

    generateBackgroundDecorations(stage) {
      if (stage === 1) {
        this.bgMushrooms = [];
        // Generate a handful of mushrooms at fixed positions
        const count = 5;
        for (let i = 0; i < count; i++) {
          const mx = this.worldWidth * (0.1 + 0.8 * Math.random());
          const my = canvas.height * this.groundStart + Math.random() * canvas.height * (1 - this.groundStart) * 0.35;
          this.bgMushrooms.push({ x: mx, y: my });
        }
        // Stage 1 has no cracks or lava
        this.bgCracks = [];
        this.bgLavaPits = [];

        this.bgStars = [];
        const starCount = 60;
        for (let i = 0; i < starCount; i++) {
          // Scatter stars across the entire world width
          const sx = this.worldWidth * Math.random();
          // Place stars in the upper 40% of the canvas to decorate the night sky
          const sy = canvas.height * 0.4 * Math.random();
          const r = 0.5 + Math.random() * 1.5;
          this.bgStars.push({ x: sx, y: sy, r });
        }

        // Generate twist offsets for stage 1 trees. We precompute a pair of
        // horizontal offsets for the middle and top of each trunk so the tree
        // shape remains stable each frame. These values determine how much the
        // trunk twists to the left or right as it ascends. A small random
        // amount gives each tree a unique, whimsical silhouette.
        const treeCount = 6;
        this.bgTrees = [];
        for (let i = 0; i < treeCount; i++) {
          // Increase the twist range to give each tree a more pronounced
          // whimsical shape.  Using a wider range yields more noticeable
          // bends in the trunk.
          const twistMid = (Math.random() - 0.5) * 60; // range [-30,30]
          const twistTop = (Math.random() - 0.5) * 60;
          this.bgTrees.push({ twistMid, twistTop });
        }
      } else if (stage === 2) {
        // For stage 2, generate a static set of cracks (lines) and lava pits
        this.bgCracks = [];
        const crackCount = 15;
        for (let i = 0; i < crackCount; i++) {
          // Spread cracks across the entire world width
          const startX = this.worldWidth * Math.random();
          const startY = canvas.height * (this.groundStart + (1 - this.groundStart) * Math.random());
          const segments = 3 + Math.floor(Math.random() * 3);
          let prevX = startX;
          let prevY = startY;
          const points = [];
          points.push({ x: prevX, y: prevY });
          for (let j = 0; j < segments; j++) {
            const nx = prevX + (Math.random() - 0.5) * 60;
            const ny = prevY - Math.random() * 30;
            points.push({ x: nx, y: ny });
            prevX = nx;
            prevY = ny;
          }
          this.bgCracks.push(points);
        }
        this.bgLavaPits = [];
        const lavaCount = 3;
        for (let i = 0; i < lavaCount; i++) {
          // Scatter lava pits across the world width
          const lx = this.worldWidth * (0.1 + 0.8 * Math.random());
          const ly = canvas.height * (0.7 + 0.25 * Math.random());
          const radius = 25 + Math.random() * 20;
          this.bgLavaPits.push({ x: lx, y: ly, r: radius });
        }
        this.bgMushrooms = [];
      }
    }

    initUpgrades(reset = true) {
      if (reset) {
        this.upgrades = [];
        this.upgradeStates = {};
      }
      const createUpgrade = (id, name, desc, cost, category, applyFunc) => {
        // Ensure upgrade state exists for non-repeatable upgrades
        if (id && !this.upgradeStates.hasOwnProperty(id)) {
          this.upgradeStates[id] = false;
        }
        return { id, name, desc, cost, category, apply: applyFunc };
      };
      const upgradesList = [];
      // Increase base HP (non-repeatable)
      upgradesList.push(createUpgrade('hp', 'Increase Base HP', 'Increase maximum HP of your base by 200.', 100, 'base', () => {
        this.playerBase.maxHp += 200;
        this.playerBase.hp += 200;
      }));
      upgradesList.push({ id: 'turretBullet', name: 'Arcane Turret', desc: 'Add an arcane turret that fires bolts at enemies.', cost: 120, repeatable: true, category: 'turrets', apply: () => {
        // Add a bullet‑type turret to the player's base
        this.playerBase.turrets.push({ type: 'bullet', cooldown: 0 });
      }});
      upgradesList.push({ id: 'turretMage', name: 'Mage Turret', desc: 'Add a mage that casts powerful spells at your foes.', cost: 160, repeatable: true, category: 'turrets', apply: () => {
        this.playerBase.turrets.push({ type: 'mage', cooldown: 0 });
      }});
      upgradesList.push({ id: 'turretCloud', name: 'Storm Cloud', desc: 'Summon a storm cloud that rains magical energy on enemies.', cost: 180, repeatable: true, category: 'turrets', apply: () => {
        this.playerBase.turrets.push({ type: 'cloud', cooldown: 0 });
      }});
      // Increase mana cap (non-repeatable)
      upgradesList.push(createUpgrade('manaCap', 'Increase Mana Cap', 'Increase mana cap by 200.', 80, 'mana', () => {
        this.playerManaCap += 200;
      }));
      // Improve mana harvest (non-repeatable)
      upgradesList.push(createUpgrade('econ', 'Improve Mana Harvest', 'Increase mana per trip by 10.', 50, 'mana', () => {
        this.manaPerTrip += 10;
      }));
      // Remove unit unlock upgrades. Units will now unlock automatically on stage progression.
      // Add a new mana plant (repeatable upgrade)
      upgradesList.push({ id: 'addPlant', name: 'Grow Mana Plant', desc: 'Plant an additional mana plant behind your base.', cost: 80, repeatable: true, category: 'mana', apply: () => {
        const index = this.playerPlants.length;
        const offset = 50 + index * 30;
        const x = this.playerBase.x - offset;
        const y = this.playerBase.y + this.playerBase.height * 0.8 + (Math.random() - 0.5) * 30;
        const plant = new ManaPlant(x, y, 'player');
        this.playerPlants.push(plant);
      }});
      // Add a new mana mage (repeatable upgrade)
      upgradesList.push({ id: 'addMage', name: 'Hire Mana Mage', desc: 'Hire an additional mana mage to harvest mana.', cost: 60, repeatable: true, category: 'mana', apply: () => {
        const mage = new EconomyUnit('player', this.playerBase, this.playerPlants);
        this.econUnits.push(mage);
      }});
      // Filter upgrades: include repeatable upgrades always, non-repeatables only if not purchased, and unlocks only if not already unlocked
      this.upgrades = upgradesList.filter(up => {
        if (up.repeatable) return true;
        // Only include non‑repeatable upgrades that haven't been purchased.
        return !this.upgradeStates[up.id];
      });
    }

    buildUnitButtons() {
      const unitButtonsDiv = document.getElementById('unitButtons');
      unitButtonsDiv.innerHTML = '';
      // Remove existing event listeners by clearing content
      for (const type of this.availableUnits) {
        if (!this.unlocksBought[type]) continue;
        const config = unitConfigs[type];
        const button = document.createElement('button');
        button.classList.add('unit-button');
        button.dataset.type = type;
        const iconCanvas = document.createElement('canvas');
        const iconSize = 70;
        iconCanvas.width = iconSize;
        iconCanvas.height = iconSize;
        const iconCtx = iconCanvas.getContext('2d');
        const iconScale = 0.6;
        iconCtx.save();
        iconCtx.scale(iconScale, iconScale);
        const drawX = (iconSize / 2) / iconScale;
        const drawY = (iconSize * 0.55) / iconScale;
        const dummy = new Unit('player', drawX, drawY, config);
        config.drawFunc(iconCtx, dummy);
        iconCtx.restore();
        // Copy canvas into button as background image
        const dataURL = iconCanvas.toDataURL();
        button.style.backgroundImage = `url(${dataURL})`;
        button.style.backgroundSize = 'contain';
        button.style.backgroundRepeat = 'no-repeat';
        // Move the background image up to leave room at the bottom for the cost label.
        button.style.backgroundPosition = 'center 0px';
        // Label cost
        const costSpan = document.createElement('span');
        costSpan.classList.add('cost');
        costSpan.textContent = config.cost;
        button.appendChild(costSpan);
        // Tooltip includes name, description and cost using default browser tooltip
        button.title = `${config.name}: ${config.desc} (Cost: ${config.cost})`;
        // Click handler
        button.addEventListener('click', () => {
          this.spawnUnit(type, 'player');
        });
        unitButtonsDiv.appendChild(button);
      }
    }

    initEventListeners() {
      // Keyboard input
      window.addEventListener('keydown', (e) => {
        this.keys[e.key.toLowerCase()] = true;
        // Prevent default arrow key scroll
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
          e.preventDefault();
        }
        // Camera scroll keys (Q/E) when not controlling a unit
        if (e.key.toLowerCase() === 'q') {
          this.scrollLeft = true;
        }
        if (e.key.toLowerCase() === 'e') {
          this.scrollRight = true;
        }
        // Exit control mode on Escape
        if (e.key === 'Escape') {
          if (this.controlledUnit) {
            this.controlledUnit.controlled = false;
            this.controlledUnit = null;
            this.updateUI();
          }
        }
      });
      window.addEventListener('keyup', (e) => {
        this.keys[e.key.toLowerCase()] = false;
        if (e.key.toLowerCase() === 'q') {
          this.scrollLeft = false;
        }
        if (e.key.toLowerCase() === 'e') {
          this.scrollRight = false;
        }
      });
      // Click on canvas to select/deselect unit
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        // Check if clicking on player's unit
        for (const unit of this.playerUnits) {
          if (!unit.alive) continue;
          const dx = unit.x - mx;
          const dy = unit.y - my;
          const dist = Math.hypot(dx, dy);
          if (dist < unit.hitRadius + 5) {
            // select unit
            // Remove buff and control from previous unit
            if (this.controlledUnit) {
              this.removeControlBuff(this.controlledUnit);
              this.controlledUnit.controlled = false;
            }
            this.controlledUnit = unit;
            unit.controlled = true;
            // Apply control buff to the selected unit
            this.applyControlBuff(unit);
            this.updateUI();
            return;
          }
        }
        // Deselect if clicked empty space
        if (this.controlledUnit) {
          // Remove buff from previously controlled unit
          this.removeControlBuff(this.controlledUnit);
          this.controlledUnit.controlled = false;
          this.controlledUnit = null;
          this.updateUI();
        }
      });
      // Upgrade menu toggle
      const upgradeToggle = document.getElementById('upgradeToggle');
      const upgradeMenu = document.getElementById('upgradeMenu');
      const upgradeList = document.getElementById('upgradeList');
      const closeUpgrade = document.getElementById('closeUpgrade');
      upgradeToggle.addEventListener('click', () => {
        this.upgradeMenuVisible = !this.upgradeMenuVisible;
        if (this.upgradeMenuVisible) {
          // Ensure the active tab reflects the current category
          const tabs = document.querySelectorAll('#upgradeTabs button');
          tabs.forEach(tab => {
            if (tab.getAttribute('data-category') === this.currentUpgradeCategory) {
              tab.classList.add('active');
            } else {
              tab.classList.remove('active');
            }
          });
          this.populateUpgradeMenu(upgradeList);
          upgradeMenu.classList.remove('hidden');
        } else {
          upgradeMenu.classList.add('hidden');
        }
      });
      closeUpgrade.addEventListener('click', () => {
        upgradeMenu.classList.add('hidden');
        this.upgradeMenuVisible = false;
      });

      // Continue button on skill screen
      const continueBtn = document.getElementById('continueButton');
      continueBtn.addEventListener('click', () => {
        this.closeSkillScreen();
      });

      // Pause button
      const pauseBtn = document.getElementById('pauseButton');
      pauseBtn.addEventListener('click', () => {
        this.paused = !this.paused;
        pauseBtn.textContent = this.paused ? 'Resume' : 'Pause';
      });

      // Skip stage button: advance to the next stage when clicked. This is
      // primarily for testing or for players who wish to jump ahead. Only
      // available if the button exists in the DOM. It preserves mana
      // between stages.
      const skipBtn = document.getElementById('skipStageButton');
      if (skipBtn) {
        skipBtn.addEventListener('click', () => {
          // Trigger victory condition by destroying the enemy base. This
          // causes the game to award skill points and open the skill
          // screen between stages, rather than jumping directly to the
          // next level. If on the final stage, restart the campaign.
          if (this.stage < 3) {
            this.enemyBase.hp = 0;
          } else {
            this.enemyBase.hp = 0;
          }
        });
      }

      // Defend/Attack mode buttons. Clicking these toggles the command
      // mode used by AI-controlled player units. Only one can be active at
      // a time; the active button receives a highlight.
      const defendBtn = document.getElementById('defendButton');
      const attackBtn = document.getElementById('attackButton');
      const updateModeButtons = () => {
        // Remove highlight from both
        defendBtn.classList.remove('mode-active');
        attackBtn.classList.remove('mode-active');
        // Add highlight to current mode
        if (this.commandMode === 'defend') {
          defendBtn.classList.add('mode-active');
        } else {
          attackBtn.classList.add('mode-active');
        }
      };
      defendBtn.addEventListener('click', () => {
        this.commandMode = 'defend';
        updateModeButtons();
      });
      attackBtn.addEventListener('click', () => {
        this.commandMode = 'attack';
        updateModeButtons();
      });
      // Initialise mode button highlight
      updateModeButtons();

      // Upgrade category tab events: clicking a tab switches category and
      // refreshes the upgrade list. Highlight the active tab.
      const upgradeTabs = document.getElementById('upgradeTabs');
      if (upgradeTabs) {
        upgradeTabs.querySelectorAll('button').forEach(tab => {
          tab.addEventListener('click', () => {
            // Remove active class from all tabs
            upgradeTabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            tab.classList.add('active');
            // Update current category
            this.currentUpgradeCategory = tab.getAttribute('data-category');
            // Repopulate list if menu is visible
            if (this.upgradeMenuVisible) {
              this.populateUpgradeMenu(upgradeList);
            }
          });
        });
      }
    }

    populateUpgradeMenu(listElement) {
      listElement.innerHTML = '';
      // Filter upgrades by the currently selected category if provided
      const filtered = this.upgrades.filter(up => {
        // If a category is set, only include upgrades that match it. Repeatable
        // upgrades default to 'mana' if they have no category specified.
        const cat = up.category || 'mana';
        return this.currentUpgradeCategory ? cat === this.currentUpgradeCategory : true;
      });
      for (const up of filtered) {
        const li = document.createElement('li');
        // Create a span for the description and cost. Using a span prevents
        // innerHTML from wiping out event listeners on the button we will add.
        const desc = document.createElement('span');
        desc.textContent = `${up.name} – ${up.desc} (Cost: ${up.cost})`;
        li.appendChild(desc);
        // Create a buy button for this upgrade
        const btn = document.createElement('button');
        btn.classList.add('ui-button');
        btn.textContent = 'Buy';
        if (this.playerMana < up.cost) {
          btn.classList.add('disabled');
        }
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.purchaseUpgrade(up, listElement);
        });
        li.addEventListener('click', () => {
          this.purchaseUpgrade(up, listElement);
        });
        li.appendChild(btn);
        // Store metadata on the list item so that updateUI can update
        // disabled states without rebuilding the list each frame.
        li.dataset.cost = up.cost;
        li.dataset.id = up.id || '';
        listElement.appendChild(li);
      }
      if (filtered.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No available upgrades in this category.';
        listElement.appendChild(li);
      }
    }

    spawnUnit(type, side) {
      const config = unitConfigs[type];
      if (side === 'player') {
        if (this.playerMana < config.cost) return;
        this.playerMana -= config.cost;
        // spawn near base, offset by number of current units
        const x = this.playerBase.x + this.playerBase.width + 10 * SCALE;
      const y = this.playerBase.y + this.playerBase.height - 40 * SCALE - Math.random() * 60 * SCALE;
        // Clone the config and apply passive modifiers for damage and speed
        const modified = Object.assign({}, config);
        modified.speed = config.speed * this.speedMultiplier;
        modified.damage = config.damage * this.damageMultiplier;
        const unit = new Unit('player', x, y, modified);
      // Store movement bounds for manual control.  Keep ground units
      // within a vertical band so they cannot walk above the horizon.  The
      // range is derived from the player base’s vertical position: allow
      // some randomness but clamp manual movement to this band.  For
      // flying units (isFlying true), leave undefined to allow full
      // movement.
      if (!unit.isFlying) {
        // Constrain ground units so they cannot walk above the horizon line
        // (groundStart).  Use the horizon (groundStart) as the top bound for
        // manual movement.  Place the lower bound slightly above the
        // bottom of the base so units don't sink into the ground.
        const minY = canvas.height * this.groundStart + 5 * SCALE;
        const maxY = this.playerBase.y + this.playerBase.height - 20 * SCALE;
        unit.minY = minY;
        unit.maxY = maxY;
      }
        this.playerUnits.push(unit);
      } else {
        if (this.enemyMana < config.cost) return;
        this.enemyMana -= config.cost;
        const x = this.enemyBase.x - 10 * SCALE;
      const y = this.enemyBase.y + this.enemyBase.height - 40 * SCALE - Math.random() * 60 * SCALE;
      const unit = new Unit('enemy', x, y, config);
      if (!unit.isFlying) {
        // Apply the same vertical constraints to enemy ground units
        const minY = canvas.height * this.groundStart + 5 * SCALE;
        const maxY = this.enemyBase.y + this.enemyBase.height - 20 * SCALE;
        unit.minY = minY;
        unit.maxY = maxY;
      }
      this.enemyUnits.push(unit);
      }
      this.updateUI();
    }

    enemyAI(delta) {
      this.enemySpawnTimer += delta;
      if (this.enemySpawnTimer >= this.enemySpawnInterval) {
        this.enemySpawnTimer = 0;
        // Determine spawn list based on stage
        let possible = [];
        if (this.stage === 1) {
          possible = ['bloodHound', 'necromancer'];
        } else if (this.stage === 2) {
          possible = ['bloodHound', 'necromancer', 'boneGiant', 'flameDjinn'];
        } else if (this.stage === 3) {
          // Stage 3 enemy has access to all prior units plus the new shadow wraith
          possible = ['bloodHound', 'necromancer', 'boneGiant', 'flameDjinn', 'shadowWraith'];
        }
        // Filter by cost affordability
        possible = possible.filter(t => unitConfigs[t].cost <= this.enemyMana);
        if (possible.length > 0) {
          const type = randomChoice(possible);
          this.spawnUnit(type, 'enemy');
        }
      }
    }

  // ==== Update Loop ====
  update(delta) {
      // Update economy units
      for (const econ of this.econUnits) {
        econ.
  // ==== Update Loop ====
  update(delta, this);
      }
      for (const econ of this.enemyEconUnits) {
        econ.
  // ==== Update Loop ====
  update(delta, this);
      }
      // Update bases
      this.playerBase.
  // ==== Update Loop ====
  update(delta, this);
      this.enemyBase.
  // ==== Update Loop ====
  update(delta, this);
      // Spawn enemy units via AI
      this.enemyAI(delta);
      // Update player units
      this.updateUnits(this.playerUnits, this.enemyUnits, delta);
      // Update enemy units
      this.updateUnits(this.enemyUnits, this.playerUnits, delta);
      // Update projectiles
      for (const p of this.projectiles) {
        p.
  // ==== Update Loop ====
  update(delta, this);
      }
      // Remove dead projectiles
      this.projectiles = this.projectiles.filter(p => p.alive);

      this.updateFallingStars(delta);

      // Update camera movement. The player can scroll left or right when
      // not controlling a unit using Q and E keys. Clamp camera within
      // world boundaries so the view doesn’t go beyond the battlefield.
      if (this.scrollLeft) {
        this.cameraX -= this.cameraSpeed * delta;
      }
      if (this.scrollRight) {
        this.cameraX += this.cameraSpeed * delta;
      }
      this.cameraX = clamp(this.cameraX, 0, this.worldWidth - canvas.width);
      // Check base destruction
      if (this.enemyBase.hp <= 0) {
        // The enemy base has fallen. Award skill points and present the
        // inter‑stage skill screen instead of immediately loading the next
        // stage. This allows players to spend upgrade points and choose
        // their unit roster for the next stage. Stage numbers start at 1.
        if (this.stage < 3) {
          // Determine points awarded based on the stage just completed
          const pointsEarned = this.stage === 1 ? 2 : 3;
          this.skillPoints += pointsEarned;
          // Set the stage to load after closing the skill screen
          this.nextStage = this.stage + 1;
          this.showSkillScreen();
          return;
        } else {
          // Stage 3 victory! Show a simple alert and restart the campaign.
          alert('You defeated the enemy and completed the campaign!');
          this.loadStage(1);
          return;
        }
      }
      if (this.playerBase.hp <= 0) {
        alert('Your base has fallen! Try again.');
        this.loadStage(1);
        return;
      }
    }

    updateUnits(ownUnits, enemyUnits, delta) {
      // Sort own units by x coordinate for blocking logic
      ownUnits.sort((a, b) => (a.side === 'player' ? a.x - b.x : b.x - a.x));
      for (const unit of ownUnits) {
        if (!unit.alive) continue;
        // Remove units that reach enemy base and attack it
        const base = unit.side === 'player' ? this.enemyBase : this.playerBase;
        // Attack base if reached
        const reachX = unit.side === 'player' ? base.x : base.x + base.width;
        const dir = unit.side === 'player' ? 1 : -1;
        // Control and movement
        if (unit.controlled) {
          // Manual control using WASD or arrow keys
          let vx = 0;
          let vy = 0;
          if (this.keys['w'] || this.keys['arrowup']) vy -= 1;
          if (this.keys['s'] || this.keys['arrowdown']) vy += 1;
          if (this.keys['a'] || this.keys['arrowleft']) vx -= 1;
          if (this.keys['d'] || this.keys['arrowright']) vx += 1;
          const length = Math.hypot(vx, vy);
          if (length > 0) {
            unit.x += (vx / length) * unit.speed * delta;
            unit.y += (vy / length) * unit.speed * delta;
            // Keep inside battlefield: clamp to world width instead of
            // canvas width so manual movement works across the extended
            // world.  Clamp vertical position within the unit’s
            // predetermined ground band if defined.  This prevents
            // ground units from walking above the horizon line.  Flying
            // units (no minY) are free to roam.
            unit.x = clamp(unit.x, 0, this.worldWidth);
            if (typeof unit.minY === 'number' && typeof unit.maxY === 'number') {
              unit.y = clamp(unit.y, unit.minY, unit.maxY);
            } else {
              unit.y = clamp(unit.y, 0, canvas.height - 40);
            }
          }
          // Manual attack on spacebar
          if (this.keys[' ']) {
            // Attack once if cooldown <= 0
            if (unit.cooldown <= 0) {
              this.attackWithUnit(unit, enemyUnits);
              unit.cooldown = unit.cooldownMax;
            }
          }
          // Decrease attack animation timer so arms return after melee
          if (unit.attackAnimTimer > 0) {
            unit.attackAnimTimer -= delta;
            if (unit.attackAnimTimer < 0) unit.attackAnimTimer = 0;
          }
        } else {
          // AI control
          // Cooldown reduce
          unit.cooldown -= delta;
          // Decrease attack animation timer for melee units. When greater
          // than zero, the draw function can animate limbs. Clamp at 0.
          if (unit.attackAnimTimer > 0) {
            unit.attackAnimTimer -= delta;
            if (unit.attackAnimTimer < 0) unit.attackAnimTimer = 0;
          }
          // Determine front friendly blocking (don't overlap)
          let blocked = false;
          for (const other of ownUnits) {
            if (other === unit || !other.alive) continue;
            if (unit.side === 'player') {
              if (other.x > unit.x && Math.abs(other.y - unit.y) < unit.hitRadius * 2) {
                // friend in front
                if (other.x - unit.x < unit.hitRadius * 1.5) {
                  blocked = true;
                }
              }
            } else {
              if (other.x < unit.x && Math.abs(other.y - unit.y) < unit.hitRadius * 2) {
                if (unit.x - other.x < unit.hitRadius * 1.5) {
                  blocked = true;
                }
              }
            }
          }
          // Attack enemy units within range
          let attacked = false;
          let nearestEnemy = null;
          let nearestDist = Infinity;
          for (const enemy of enemyUnits) {
            if (!enemy.alive) continue;
            // Skip flying units if this unit can't attack air
            if (enemy.isFlying && !unit.canAttackAir) continue;
            const dx = enemy.x - unit.x;
            // Defence range: units will also consider enemies behind them if close to base
            const defenseRange = 150 * SCALE;
            // Skip enemies behind if they are far beyond defense range
            if ((unit.side === 'player' && dx < 0 && Math.abs(dx) > defenseRange) ||
                (unit.side === 'enemy' && dx > 0 && Math.abs(dx) > defenseRange)) {
              continue;
            }
            const dy = enemy.y - unit.y;
            const dist = Math.hypot(dx, dy);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestEnemy = enemy;
            }
          }
          // Prevent passing through enemies: if in contact with nearest enemy and unit cannot pass melee, treat as blocked
          if (nearestEnemy && !unit.canPassMelee) {
            const engageDist = unit.hitRadius + nearestEnemy.hitRadius + 2;
            if (nearestDist < engageDist) {
              blocked = true;
            }
          }
          if (nearestEnemy && nearestDist <= unit.range + unit.hitRadius + nearestEnemy.hitRadius) {
            // Attack
            if (unit.cooldown <= 0) {
              this.attackWithUnit(unit, enemyUnits);
              unit.cooldown = unit.cooldownMax;
            }
            attacked = true;
          }
          if (!attacked) {
            // Move towards enemy base if not blocked
            if (!blocked) {
              if (unit.side === 'player' && this.commandMode === 'defend') {
                // Compute defend line location in front of the base
                const defendX = this.playerBase.x + this.playerBase.width + 80 * SCALE;
                // Distance within which units will step forward to attack
                const defenseRange = 150 * SCALE;
                if (nearestEnemy && Math.abs(nearestEnemy.x - unit.x) <= defenseRange) {
                  const signDir = nearestEnemy.x > unit.x ? 1 : -1;
                  unit.x += signDir * unit.speed * delta;
                } else {
                  if (unit.x < defendX - 2) {
                    unit.x += unit.speed * delta;
                    if (unit.x > defendX) unit.x = defendX;
                  } else if (unit.x > defendX + 2) {
                    unit.x -= unit.speed * delta;
                    if (unit.x < defendX) unit.x = defendX;
                  }
                }
                // Clamp within world bounds
                unit.x = clamp(unit.x, 0, this.worldWidth);
              } else {
                const sign = unit.side === 'player' ? 1 : -1;
                unit.x += sign * unit.speed * delta;
                unit.x = clamp(unit.x, 0, this.worldWidth);
              }
            }
          }
          // Check if reached enemy base to attack base directly
          if ((unit.side === 'player' && unit.x >= reachX) || (unit.side === 'enemy' && unit.x <= reachX)) {
            // Attack base
            if (unit.cooldown <= 0) {
              if (unit.side === 'player') {
                this.enemyBase.takeDamage(unit.damage);
              } else {
                this.playerBase.takeDamage(unit.damage);
              }
              unit.cooldown = unit.cooldownMax;
            }
            // Prevent unit from moving inside base: hold them just outside the base edge
            if (unit.side === 'player') {
              unit.x = Math.min(unit.x, reachX - 1);
            } else {
              unit.x = Math.max(unit.x, reachX + 1);
            }
          }
        }
        // Reduce cooldown over time
        unit.cooldown -= delta;
      }
      // Remove dead units
      for (let i = ownUnits.length - 1; i >= 0; i--) {
        if (!ownUnits[i].alive) ownUnits.splice(i, 1);
      }
    }

    attackWithUnit(unit, enemyUnits) {
      // Find target again for attack
      let nearest = null;
      let nearestDist = Infinity;
      const defenseRange = 150 * SCALE;
      for (const enemy of enemyUnits) {
        if (!enemy.alive) continue;
        if (enemy.isFlying && !unit.canAttackAir) continue;
        const dx = enemy.x - unit.x;
        // Skip enemies behind if far beyond defence range
        if ((unit.side === 'player' && dx < 0 && Math.abs(dx) > defenseRange) ||
            (unit.side === 'enemy' && dx > 0 && Math.abs(dx) > defenseRange)) {
          continue;
        }
        const dy = enemy.y - unit.y;
        const dist = Math.hypot(dx, dy);
        if (dist < nearestDist) {
          nearest = enemy;
          nearestDist = dist;
        }
      }
      if (!nearest) return;
      // Attack
      if (unit.isRanged) {
        // Spawn projectile from unit towards enemy
        const angle = Math.atan2(nearest.y - unit.y, nearest.x - unit.x);
        const speed = 400;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const proj = new Projectile(unit.x, unit.y, vx, vy, unit.damage, unit.side, 4, unit.splash);
        this.projectiles.push(proj);
      } else {
        // Melee damage directly
        nearest.takeDamage(unit.damage);
        // Knockback effect
        if (unit.knockback > 0) {
          const push = unit.knockback;
          if (unit.side === 'player') {
            nearest.x += push;
          } else {
            nearest.x -= push;
          }
        }
        unit.attackAnimTimer = unit.cooldownMax;
      }
    }

  // ==== Drawing Functions ====
  draw() {
      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      const p = BG_PARALLAX[this.stage] ?? 1;
      ctx.translate(-this.cameraX * p, 0);
      // Background
      this.stageBackgroundDrawers[this.stage]();
      // Falling stars behind foreground objects
      this.drawFallingStars();
      // Mana plants
      for (const plant of this.playerPlants) {
        plant.
  // ==== Drawing Functions ====
  draw(this.stage);
      }
      for (const plant of this.enemyPlants) {
        plant.
  // ==== Drawing Functions ====
  draw(this.stage);
      }
      // Bases
      this.playerBase.
  // ==== Drawing Functions ====
  draw();
      this.enemyBase.
  // ==== Drawing Functions ====
  draw();

      const S = SCALE;
      const drawJar = (base, currentMana, manaCap, side) => {
        // Base jar dimensions and scaling for cap
        const baseHeight = 40 * S;
        const extraHeight = ((manaCap - 200) / 200) * 20 * S;
        const jarHeight = Math.min(baseHeight + Math.max(0, extraHeight), base.height * 0.6);
        const jarWidth = 24 * S;
        const x = base.x + (base.width - jarWidth) / 2;
        const y = base.y + base.height - jarHeight + 4 * S;
        // Fill level calculation
        const fillRatio = manaCap > 0 ? clamp(currentMana / manaCap, 0, 1) : 0;
        const fillHeight = jarHeight * fillRatio;
        if (side === 'player') {
          // Draw player jar: simple rectangular jar with a lighter, more visible body.
          // Outline
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillRect(x - 2, y - 2, jarWidth + 4, jarHeight + 4);
          // Body: use a brighter purple tone so it stands out against the base
          ctx.fillStyle = '#7560b1';
          ctx.fillRect(x, y, jarWidth, jarHeight);
          // Mana fill: bright bluish glow
          ctx.fillStyle = 'rgba(150,230,255,0.85)';
          ctx.fillRect(x, y + jarHeight - fillHeight, jarWidth, fillHeight);
          // Rim: lighter shade of purple
          ctx.fillStyle = '#9c87d6';
          ctx.fillRect(x - 2, y - 6 * S, jarWidth + 4, 6 * S);
        } else {
          // Enemy jar: tapered jar with more saturated hues and brighter colours.
          // Outline shadow
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.beginPath();
          ctx.moveTo(x - 2, y - 2);
          ctx.lineTo(x + jarWidth + 2, y - 2);
          ctx.lineTo(x + jarWidth * 0.85 + 2, y + jarHeight + 2);
          ctx.lineTo(x + jarWidth * 0.15 - 2, y + jarHeight + 2);
          ctx.closePath();
          ctx.fill();
          // Body: bright magenta tone so the jar stands out clearly against the dark base.
          ctx.fillStyle = '#d57abb';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + jarWidth, y);
          ctx.lineTo(x + jarWidth * 0.85, y + jarHeight);
          ctx.lineTo(x + jarWidth * 0.15, y + jarHeight);
          ctx.closePath();
          ctx.fill();
          // Fill: bright, saturated pink glow for enemy mana
          ctx.fillStyle = 'rgba(255,160,210,0.85)';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + jarWidth, y);
          const fillY = y + jarHeight * (1 - fillRatio);
          ctx.lineTo(x + jarWidth * 0.85, fillY);
          ctx.lineTo(x + jarWidth * 0.15, fillY);
          ctx.closePath();
          ctx.fill();
          // Rim: bright pink rim
          ctx.fillStyle = '#f3a0cf';
          ctx.fillRect(x - 2, y - 6 * S, jarWidth + 4, 6 * S);
        }
      };
      // Player jar
      drawJar(this.playerBase, this.playerMana, this.playerManaCap, 'player');
      drawJar(this.enemyBase, this.enemyMana, this.playerManaCap, 'enemy');
      // Draw economy units
      for (const econ of this.econUnits) {
        econ.
  // ==== Drawing Functions ====
  draw(this.stage);
      }
      for (const econ of this.enemyEconUnits) {
        econ.
  // ==== Drawing Functions ====
  draw(this.stage);
      }
      // Draw projectiles
      for (const p of this.projectiles) {
        p.
  // ==== Drawing Functions ====
  draw();
      }
      // Draw units
      for (const unit of this.playerUnits) {
        unit.
  // ==== Drawing Functions ====
  draw();
        // Highlight controlled unit
        if (unit.controlled) {
          ctx.strokeStyle = '#ff0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(unit.x, unit.y, unit.hitRadius + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      for (const unit of this.enemyUnits) {
        unit.
  // ==== Drawing Functions ====
  draw();
      }

      ctx.restore();
    }

  // ==== Background Functions ====
  drawBackgroundStage1() {
      // Sky gradient: blend of deep purple and indigo for a magical twilight
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0, '#2b005e');
      sky.addColorStop(1, '#52288b');
      ctx.fillStyle = sky;
      // Fill the entire world width so that scrolling does not reveal blank space
      ctx.fillRect(0, 0, this.worldWidth, canvas.height);

      // Draw twinkling stars.  These stars flicker gently to add visual
      // interest to the night sky.  Their alpha oscillates over time.
      const starTime = Date.now() / 1000;
      for (let s = 0; s < this.bgStars.length; s++) {
        const star = this.bgStars[s];
        const alpha = 0.4 + 0.4 * Math.sin(starTime + s);
        // Brighten stars slightly by increasing the RGB values
        ctx.fillStyle = `rgba(220,220,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const swirlTime = Date.now() / 20000; // slow rotation
      const orbCount = 30;
      const centerX = this.worldWidth / 2;
      const centerY = canvas.height * 0.25;
      // Pastel palette for magical twilight
      const swirlPalette = ['#a46ee9', '#6e99e8', '#c07de9', '#7eacff', '#d193ff'];
      for (let i = 0; i < orbCount; i++) {
        // Each orb orbits at a different radius and phase
        const angle = swirlTime * (1 + i * 0.02) + i * 0.3;
        const radius = 30 + i * 6;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius * 0.5;
        // Orbs gradually shrink with index to create depth
        const size = 16 - i * 0.3;
        const colour = swirlPalette[i % swirlPalette.length];
        ctx.fillStyle = colour;
        // Fade orbs gently in and out
        ctx.globalAlpha = 0.3 + 0.4 * Math.sin(swirlTime * 2 + i);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      // Reset alpha for other drawing
      ctx.globalAlpha = 1;

      const groundGrad = ctx.createLinearGradient(0, canvas.height * this.groundStart, 0, canvas.height);
      // Brighten ground gradient to provide more contrast and charm
      groundGrad.addColorStop(0, '#3d235f');
      groundGrad.addColorStop(1, '#261140');
      ctx.fillStyle = groundGrad;
      // Fill ground across the world width
      ctx.fillRect(0, canvas.height * this.groundStart, this.worldWidth, canvas.height * (1 - this.groundStart));

      // Draw static glowing mushrooms from generated positions
      ctx.save();
      for (const m of this.bgMushrooms) {
        const glow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 15);
        glow.addColorStop(0, 'rgba(180,90,255,0.6)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 15, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawBackgroundStage2() {
      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0, '#23030a');
      sky.addColorStop(1, '#3f1919');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, this.worldWidth, canvas.height);
      // Ground cracked
      ctx.fillStyle = '#2f0f0f';
      // Draw ground across the entire world width starting at groundStart
      ctx.fillRect(0, canvas.height * this.groundStart, this.worldWidth, canvas.height * (1 - this.groundStart));
      // Draw static cracks generated in generateBackgroundDecorations
      ctx.strokeStyle = '#5e1a1a';
      ctx.lineWidth = 1;
      for (const crack of this.bgCracks) {
        ctx.beginPath();
        for (let i = 0; i < crack.length; i++) {
          const pt = crack[i];
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }

        ctx.stroke();
      }
      // Draw static lava pits
      for (const pit of this.bgLavaPits) {
        const gradient = ctx.createRadialGradient(pit.x, pit.y, 0, pit.x, pit.y, pit.r);
        gradient.addColorStop(0, 'rgba(255,80,40,0.7)');
        gradient.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pit.x, pit.y, pit.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawBackgroundStage3() {
      // Sky gradient: dark green to black
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0, '#0e2f1e');
      sky.addColorStop(1, '#001100');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, this.worldWidth, canvas.height);

      // Silhouette of jagged trees/mountains
      ctx.fillStyle = '#163d27';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height * this.groundStart);
      const step = 100 * SCALE;
      for (let x = 0; x <= this.worldWidth + step; x += step) {
        const peak = canvas.height * this.groundStart - (Math.random() * 50 + 10) * SCALE;
        ctx.lineTo(x, peak);
      }
      ctx.lineTo(this.worldWidth, canvas.height * this.groundStart);
      ctx.closePath();
      ctx.fill();

      // Ground layer with moss
      ctx.fillStyle = '#14532d';
      ctx.fillRect(0, canvas.height * this.groundStart, this.worldWidth, canvas.height * (1 - this.groundStart));

      // Glowing mushrooms scattered around
      for (let i = 0; i < 30; i++) {
        const mx = Math.random() * this.worldWidth;
        const my = canvas.height * this.groundStart - (Math.random() * 20 + 5) * SCALE;
        // Stem
        ctx.fillStyle = '#e6e6e6';
        ctx.fillRect(mx - 1 * SCALE, my, 2 * SCALE, 10 * SCALE);
        // Cap
        ctx.beginPath();
        ctx.arc(mx, my, 5 * SCALE, 0, Math.PI, true);
        ctx.fillStyle = '#ff66cc';
        ctx.fill();
      }
    }

    updateUI() {
      // Show mana out of total cap (e.g., 75 / 200).  This gives the player
      // immediate feedback on how full their mana jar is relative to the cap.
      document.getElementById('manaDisplay').textContent = `${Math.floor(this.playerMana)} / ${this.playerManaCap}`;
      document.getElementById('hpDisplay').textContent = `${Math.floor(this.playerBase.hp)} / ${this.playerBase.maxHp}`;
      document.getElementById('stageDisplay').textContent = this.stage;
      const controlIndicator = document.getElementById('controlIndicator');
      // If the control indicator exists, update its text; otherwise omit
      if (controlIndicator) {
        if (this.controlledUnit) {
          controlIndicator.textContent = `Control: ${this.controlledUnit.isFlying ? 'Flying' : ''}`;
        } else {
          controlIndicator.textContent = '';
        }
      }
      // Update spawn buttons disabled state based on mana
      const unitButtons = document.querySelectorAll('.unit-button');
      unitButtons.forEach(button => {
        const type = button.dataset.type;
        const config = unitConfigs[type];
        if (config.cost > this.playerMana) {
          button.classList.add('disabled');
        } else {
          button.classList.remove('disabled');
        }
      });

      // Also update upgrade buttons disabled state while the menu is open.
      if (this.upgradeMenuVisible) {
        const upgradeListEl = document.getElementById('upgradeList');
        // Do not rebuild the list every frame; instead update the disabled
        // class on each button based on current mana using stored cost
        // metadata. This preserves event listeners and improves
        // responsiveness.
        if (upgradeListEl) {
          const items = upgradeListEl.querySelectorAll('li');
          items.forEach((li) => {
            const btn = li.querySelector('button');
            const cost = parseFloat(li.dataset.cost);
            if (!btn || isNaN(cost)) return;
            if (this.playerMana < cost) {
              btn.classList.add('disabled');
            } else {
              btn.classList.remove('disabled');
            }
          });
        }
      }
    }

    applyControlBuff(unit) {
      if (!unit || unit._buffed) return;
      unit.maxHp *= 1.1;
      unit.hp *= 1.1;
      unit.damage *= 1.1;
      unit.speed *= 1.1;
      unit._buffed = true;
    }

    removeControlBuff(unit) {
      if (!unit || !unit._buffed) return;
      unit.maxHp /= 1.1;
      unit.hp = Math.min(unit.hp, unit.maxHp);
      unit.damage /= 1.1;
      unit.speed /= 1.1;
      unit._buffed = false;
    }

    spawnExplosion(x, y, side) {
      // We'll push several fading circles into an array to draw later
      const count = 6;
      for (let i = 0; i < count; i++) {
        const particle = {
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          radius: 6 + Math.random() * 6,
          alpha: 1,
          decay: 1 + Math.random(),
          color: side === 'player' ? '255,200,255' : '255,100,100'
        };
        this.explosions.push(particle);
      }
    }

    start() {
      this.lastTimestamp = performance.now();
      this.explosions = [];
      const loop = (timestamp) => {
        const deltaMs = timestamp - this.lastTimestamp;
        const delta = deltaMs / 1000;
        this.lastTimestamp = timestamp;
        if (!this.paused) {
          // Update only when not paused
          this.
  // ==== Update Loop ====
  update(delta);
        }
        // Always draw current state
        this.
  // ==== Drawing Functions ====
  draw();
        // Update and draw particle explosions regardless of pause to maintain fade
        this.updateExplosions(delta);
        // UI
        this.updateUI();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
    updateExplosions(delta) {
      // Update and draw particles
      const newExplosions = [];
      for (const p of this.explosions) {
        p.alpha -= p.decay * delta;
        if (p.alpha > 0) {
          newExplosions.push(p);
          ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      this.explosions = newExplosions;
    }

    showSkillScreen() {
      this.paused = true;
      // Hide upgrade menu if open
      const upgradeMenu = document.getElementById('upgradeMenu');
      upgradeMenu.classList.add('hidden');
      this.upgradeMenuVisible = false;
      // Update skill points display
      const pointsEl = document.getElementById('skillPointsDisplay');
      pointsEl.textContent = `Skill Points: ${this.skillPoints}`;
      // Populate passive upgrades and unit selection
      this.populatePassiveUpgrades();
      this.populateUnitSelection();
      // Show overlay
      const screen = document.getElementById('skillScreen');
      screen.classList.remove('hidden');
    }

    closeSkillScreen() {
      const screen = document.getElementById('skillScreen');
      screen.classList.add('hidden');
      this.paused = false;
      // Load the next stage using selected units
      if (this.nextStage) {
        this.loadStage(this.nextStage);
        this.nextStage = null;
      }
    }

    populatePassiveUpgrades() {
      const container = document.getElementById('passiveUpgrades');
      container.innerHTML = '';
      const upgrades = [
        { key: 'manaBoost', name: 'Mana Flow', desc: '+10 mana per trip' },
        { key: 'hpBoost', name: 'Sturdy Walls', desc: '+200 base HP' },
        { key: 'damageBoost', name: 'Arcane Weapons', desc: '+20% unit damage' },
        { key: 'speedBoost', name: 'Swift Boots', desc: '+20% unit speed' }
      ];
      for (const up of upgrades) {
        const item = document.createElement('div');
        item.classList.add('upgrade-item');
        if (this.passiveUpgrades[up.key]) {
          item.classList.add('purchased');
        }
        const title = document.createElement('strong');
        title.textContent = up.name;
        const desc = document.createElement('div');
        desc.style.fontSize = '12px';
        desc.style.marginTop = '4px';
        desc.textContent = up.desc;
        item.appendChild(title);
        item.appendChild(desc);
        // Show cost indicator
        const cost = document.createElement('div');
        cost.style.fontSize = '10px';
        cost.style.marginTop = '4px';
        cost.style.color = '#a8d5ff';
        cost.textContent = 'Cost: 1 pt';
        item.appendChild(cost);
        // Click to purchase
        item.addEventListener('click', () => {
          this.purchasePassiveUpgrade(up.key);
        });
        container.appendChild(item);
      }
    }

    purchasePassiveUpgrade(key) {
      // Already purchased or no points
      if (this.passiveUpgrades[key]) return;
      if (this.skillPoints <= 0) return;
      this.skillPoints -= 1;
      this.passiveUpgrades[key] = true;
      // Apply effect
      if (key === 'manaBoost') {
        this.manaPerTrip += 10;
      } else if (key === 'hpBoost') {
        // Increase base HP for current base and record bonus for future stages
        this.playerBase.maxHp += 200;
        this.playerBase.hp += 200;
      } else if (key === 'damageBoost') {
        this.damageMultiplier *= 1.2;
      } else if (key === 'speedBoost') {
        this.speedMultiplier *= 1.2;
      }
      // Update displays
      document.getElementById('skillPointsDisplay').textContent = `Skill Points: ${this.skillPoints}`;
      // Refresh upgrade list to mark purchase
      this.populatePassiveUpgrades();
    }

    populateUnitSelection() {
      const selectedDiv = document.getElementById('selectedUnits');
      const availableDiv = document.getElementById('availableUnitsSelect');
      selectedDiv.innerHTML = '';
      availableDiv.innerHTML = '';
      const fullList = ['swordsman', 'witch', 'golem'];
      // Unlock Rogue at stage 2
      if (this.stage >= 2 || (this.nextStage && this.nextStage >= 2)) {
        fullList.push('rogue');
      }
      // Unlock Drake at stage 3
      if (this.stage >= 3 || (this.nextStage && this.nextStage >= 3)) {
        fullList.push('drake');
      }
      // Unlock Guardian at stage 4 and beyond (future stages)
      if (this.stage >= 4 || (this.nextStage && this.nextStage >= 4)) {
        fullList.push('guardian');
      }
      // Render selected slots
      for (let i = 0; i < 5; i++) {
        const slot = document.createElement('div');
        slot.classList.add('unit-slot');
        if (i < this.selectedUnits.length) {
          const type = this.selectedUnits[i];
          // draw icon using the unit draw function on an offscreen canvas
          const iconCanvas = document.createElement('canvas');
          const size = 60;
          iconCanvas.width = size;
          iconCanvas.height = size;
          const ctxIcon = iconCanvas.getContext('2d');
          const scale = 0.45;
          ctxIcon.save();
          ctxIcon.scale(scale, scale);
          const dummy = new Unit('player', (size/2)/scale, (size*0.6)/scale, unitConfigs[type]);
          unitConfigs[type].drawFunc(ctxIcon, dummy);
          ctxIcon.restore();
          slot.style.backgroundImage = `url(${iconCanvas.toDataURL()})`;
          // Provide tooltip with unit description and stats
          const conf = unitConfigs[type];
          const descParts = [];
          if (conf.desc) descParts.push(conf.desc);
          descParts.push(`HP: ${conf.hp}`);
          descParts.push(`Damage: ${conf.damage}`);
          descParts.push(`Speed: ${conf.speed}`);
          descParts.push(`Cooldown: ${conf.cooldown}`);
          if (conf.range) descParts.push(`Range: ${conf.range}`);
          if (conf.isFlying) descParts.push('Flying');
          if (conf.isRanged) descParts.push('Ranged');
          slot.title = descParts.join(' | ');
          // cost label
          const costLabel = document.createElement('div');
          costLabel.classList.add('cost-label');
          costLabel.textContent = unitConfigs[type].cost;
          slot.appendChild(costLabel);
          // click to remove
          slot.addEventListener('click', () => {
            // Remove this type from selection
            this.selectedUnits = this.selectedUnits.filter(t => t !== type);
            this.populateUnitSelection();
          });
        }
        selectedDiv.appendChild(slot);
      }
      // Render available units not currently selected
      for (const type of fullList) {
        if (this.selectedUnits.includes(type)) continue;
        const slot = document.createElement('div');
        slot.classList.add('unit-slot');
        // draw icon
        const iconCanvas = document.createElement('canvas');
        const size = 60;
        iconCanvas.width = size;
        iconCanvas.height = size;
        const ctxIcon = iconCanvas.getContext('2d');
        const scale = 0.45;
        ctxIcon.save();
        ctxIcon.scale(scale, scale);
        const dummy = new Unit('player', (size/2)/scale, (size*0.6)/scale, unitConfigs[type]);
        unitConfigs[type].drawFunc(ctxIcon, dummy);
        ctxIcon.restore();
        slot.style.backgroundImage = `url(${iconCanvas.toDataURL()})`;
        // Provide tooltip with unit description and stats
        const conf2 = unitConfigs[type];
        const parts = [];
        if (conf2.desc) parts.push(conf2.desc);
        parts.push(`HP: ${conf2.hp}`);
        parts.push(`Damage: ${conf2.damage}`);
        parts.push(`Speed: ${conf2.speed}`);
        parts.push(`Cooldown: ${conf2.cooldown}`);
        if (conf2.range) parts.push(`Range: ${conf2.range}`);
        if (conf2.isFlying) parts.push('Flying');
        if (conf2.isRanged) parts.push('Ranged');
        slot.title = parts.join(' | ');
        const costLabel = document.createElement('div');
        costLabel.classList.add('cost-label');
        costLabel.textContent = unitConfigs[type].cost;
        slot.appendChild(costLabel);
        // click to add if slots remain
        slot.addEventListener('click', () => {
          if (this.selectedUnits.length < 5) {
            this.selectedUnits.push(type);
            this.populateUnitSelection();
          }
        });
        availableDiv.appendChild(slot);
      }
    }

    updateFallingStars(delta) {
      // Accumulate time and spawn a new star when the timer exceeds the
      // threshold. Stars appear in both stages but spawn faster in stage 2.
      this.fallingStarTimer += delta;
      if (this.fallingStarTimer >= this.nextFallingStarTime) {
        // Choose a random horizontal position away from the extreme edges.
        const margin = canvas.width * 0.2;
        const x = margin + Math.random() * (canvas.width - margin * 2);
        const star = {
          x: x,
          y: -30,
          vy: 200 + Math.random() * 100,
          radius: 6 * SCALE,
          alive: true
        };
        this.fallingStars.push(star);
        // Reset timer and set next spawn time based on stage difficulty.
        this.fallingStarTimer = 0;
        this.nextFallingStarTime = (this.stage === 1 ? 15 : 10) + Math.random() * (this.stage === 1 ? 10 : 6);
      }
      // Update existing stars: move them down and handle collisions.
      const survivors = [];
      for (const star of this.fallingStars) {
        star.y += star.vy * delta;
        let exploded = false;
        // Check collision with ground (approx ground y coordinate). If the
        // star passes below ground, trigger an explosion.
        const groundY = canvas.height - 50;
        if (star.y >= groundY) {
          exploded = true;
        }
        // Check collision with bases (simplified bounding box check).
        if (!exploded) {
          const pb = this.playerBase;
          if (star.x >= pb.x && star.x <= pb.x + pb.width && star.y >= pb.y && star.y <= pb.y + pb.height) {
            exploded = true;
          }
        }
        if (!exploded) {
          const eb = this.enemyBase;
          if (star.x >= eb.x && star.x <= eb.x + eb.width && star.y >= eb.y && star.y <= eb.y + eb.height) {
            exploded = true;
          }
        }
        if (exploded) {
          // Deal area damage to nearby units.
          const blastRadius = 60 * SCALE;
          const damage = 40;
          for (const unit of this.playerUnits) {
            if (!unit.alive) continue;
            const d = Math.hypot(unit.x - star.x, unit.y - star.y);
            if (d < blastRadius + unit.hitRadius) {
              unit.takeDamage(damage);
            }
          }
          for (const unit of this.enemyUnits) {
            if (!unit.alive) continue;
            const d = Math.hypot(unit.x - star.x, unit.y - star.y);
            if (d < blastRadius + unit.hitRadius) {
              unit.takeDamage(damage);
            }
          }
          // Damage bases if the star lands within their horizontal footprint.
          const pbCenterDist = Math.abs(star.x - (this.playerBase.x + this.playerBase.width / 2));
          if (pbCenterDist < this.playerBase.width / 2) {
            this.playerBase.takeDamage(damage);
          }
          const ebCenterDist = Math.abs(star.x - (this.enemyBase.x + this.enemyBase.width / 2));
          if (ebCenterDist < this.enemyBase.width / 2) {
            this.enemyBase.takeDamage(damage);
          }
          // Explosion visual effect
          this.spawnExplosion(star.x, star.y, 'player');
          star.alive = false;
        }
        if (star.alive) {
          survivors.push(star);
        }
      }
      this.fallingStars = survivors;
    }

    drawFallingStars() {
      for (const star of this.fallingStars) {
        // Trail: a triangular gradient fading from invisible to bright at the star.
        const trailLength = 20 * SCALE;
        const grad = ctx.createLinearGradient(star.x, star.y - trailLength, star.x, star.y);
        grad.addColorStop(0, 'rgba(255,255,200,0)');
        grad.addColorStop(1, 'rgba(255,255,150,0.8)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(star.x - star.radius / 2, star.y);
        ctx.lineTo(star.x + star.radius / 2, star.y);
        ctx.lineTo(star.x, star.y - trailLength);
        ctx.closePath();
        ctx.fill();
        // Star body: five‑point star shape for a whimsical effect.
        ctx.fillStyle = '#fff2b0';
        ctx.beginPath();
        const points = 5;
        const outer = star.radius;
        const inner = star.radius * 0.4;
        for (let i = 0; i < points * 2; i++) {
          const r = i % 2 === 0 ? outer : inner;
          const angle = (Math.PI / points) * i - Math.PI / 2;
          const sx = star.x + r * Math.cos(angle);
          const sy = star.y + r * Math.sin(angle);
          if (i === 0) {
            ctx.moveTo(sx, sy);
          } else {
            ctx.lineTo(sx, sy);
          }
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  const unitConfigs = {
    // Player units
    swordsman: {
      name: 'Arcane Swordsman',
      desc: 'Balanced melee warrior with arcane shield and sword.',
      cost: 40,
      hp: 120,
      speed: 60,
      range: 15,
      damage: 20,
      cooldown: 1.1,
      // Multiply hit radius by scale so units appear larger on the battlefield
      hitRadius: 14 * SCALE,
      isRanged: false,
      canAttackAir: false,
      drawFunc: (ctx, unit) => {
        const S = SCALE;
        const dir = unit.side === 'player' ? 1 : -1;
        // Legs
        ctx.fillStyle = '#5568aa';
        ctx.fillRect(unit.x - 6 * S, unit.y, 4 * S, 12 * S);
        ctx.fillRect(unit.x + 2 * S, unit.y, 4 * S, 12 * S);
        // Body torso
        ctx.fillStyle = '#6f89c2';
        ctx.fillRect(unit.x - 8 * S, unit.y - 14 * S, 16 * S, 14 * S);
        // Head
        ctx.fillStyle = '#99bbff';
        ctx.beginPath();
        ctx.arc(unit.x, unit.y - 20 * S, 6 * S, 0, Math.PI * 2);
        ctx.fill();
        // Shield with rune
        ctx.strokeStyle = '#3a529c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(unit.x - dir * 12 * S, unit.y - 8 * S, 6 * S, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#a8d0ff';
        ctx.beginPath();
        ctx.arc(unit.x - dir * 12 * S, unit.y - 8 * S, 3 * S, 0, Math.PI * 2);
        ctx.fill();
        // Sword
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(unit.x + dir * 10 * S, unit.y - 10 * S);
        ctx.lineTo(unit.x + dir * 22 * S, unit.y - 18 * S);
        ctx.stroke();
      }
    },
    witch: {
      name: 'Ember Witch',
      desc: 'Ranged fire caster that deals splash damage.',
      cost: 60,
      hp: 90,
      speed: 50,
      range: 140,
      damage: 18,
      cooldown: 2.0,
      hitRadius: 12 * SCALE,
      isRanged: true,
      canAttackAir: true,
      splash: true,
      drawFunc: (ctx, unit) => {
        const S = SCALE;
        const dir = unit.side === 'player' ? 1 : -1;
        // Robe
        ctx.fillStyle = '#ff9a66';
        ctx.fillRect(unit.x - 8 * S, unit.y - 16 * S, 16 * S, 18 * S);
        // Head
        ctx.fillStyle = '#ffb380';
        ctx.beginPath();
        ctx.arc(unit.x, unit.y - 20 * S, 6 * S, 0, Math.PI * 2);
        ctx.fill();
        // Hat
        ctx.fillStyle = '#dd6040';
        ctx.beginPath();
        ctx.moveTo(unit.x, unit.y - 28 * S);
        ctx.lineTo(unit.x - 12 * S, unit.y - 20 * S);
        ctx.lineTo(unit.x + 12 * S, unit.y - 20 * S);
        ctx.closePath();
        ctx.fill();
        // Staff
        ctx.strokeStyle = '#a04c30';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(unit.x + dir * 10 * S, unit.y - 16 * S);
        ctx.lineTo(unit.x + dir * 10 * S, unit.y + 4 * S);
        ctx.stroke();
        // Flame on staff
        ctx.fillStyle = 'rgba(255,150,80,0.8)';
        ctx.beginPath();
        const flameRadius = 5 * S + (typeof Date !== 'undefined' ? Math.sin(Date.now() / 200) * 2 * S : 0);
        ctx.arc(unit.x + dir * 10 * S, unit.y - 18 * S, flameRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    golem: {
      name: 'Stone Golem',
      desc: 'Tanky melee unit with strong knockback and high HP.',
      cost: 80,
      hp: 300,
      speed: 40,
      // Reduce range slightly so the golem must get closer to attack. This
      // encourages him to engage hand‑to‑hand rather than striking from too
      // far away.
      range: 15,
      damage: 30,
      cooldown: 2.0,
      hitRadius: 18 * SCALE,
      isRanged: false,
      canAttackAir: false,
      knockback: 10,
      drawFunc: (ctx, unit) => {
        const S = SCALE;
        // Main boulder body with rounded corners
        ctx.fillStyle = '#8f9ab0';
        drawRoundedRect(ctx, unit.x - 18 * S, unit.y - 24 * S, 36 * S, 48 * S, 4 * S, '#8f9ab0');
        // Arms made of stacked stones. Raise one arm when attackAnimTimer
        // is active. Player golems raise their right arm (towards the enemy
        // base), while enemy golems raise their left arm. The raise amount
        // is proportional to the remaining attack animation time.
        ctx.fillStyle = '#8f9ab0';
        const raiseProgress = unit.attackAnimTimer > 0 ? unit.attackAnimTimer / 0.35 : 0;
        // For each segment index, compute vertical offset for the raised arm
        for (let i = 0; i < 3; i++) {
          // Left arm segments (for player on left side, enemy on right)
          let lx = unit.x - 26 * S + 2 * S * i;
          let ly = unit.y - 20 * S + 10 * S * i;
          // Right arm segments
          let rx = unit.x + 21 * S - 2 * S * i;
          let ry = unit.y - 20 * S + 10 * S * i;
          // Determine which arm to raise based on unit side
          if (unit.side === 'player') {
            // Raise right arm upward to mimic attacking motion
            ry -= 6 * S * raiseProgress;
          } else {
            // Raise left arm for enemy units
            ly -= 6 * S * raiseProgress;
          }
          ctx.beginPath();
          ctx.ellipse(lx, ly, 5 * S, 8 * S, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(rx, ry, 5 * S, 8 * S, -0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        // Head with helmet band
        ctx.fillStyle = '#b0b8c6';
        ctx.beginPath();
        ctx.arc(unit.x, unit.y - 32 * S, 14 * S, 0, Math.PI * 2);
        ctx.fill();
        // Helmet band
        ctx.fillStyle = '#7c87a2';
        ctx.fillRect(unit.x - 14 * S, unit.y - 35 * S, 28 * S, 4 * S);
        // Eyes glow
        ctx.fillStyle = '#3ecaff';
        ctx.beginPath();
        ctx.arc(unit.x - 5 * S, unit.y - 34 * S, 2 * S, 0, Math.PI * 2);
        ctx.arc(unit.x + 5 * S, unit.y - 34 * S, 2 * S, 0, Math.PI * 2);
        ctx.fill();
        // Arcane veins: draw branching lightning lines across body. Use a
        // brighter cyan colour and slight opacity to evoke crackling
        // lightning. The lines branch outward from the centre. A thicker
        // line gives the veins more presence.
        ctx.strokeStyle = 'rgba(90, 220, 255, 0.9)';
        ctx.lineWidth = 2.5 * S;
        const veinPaths = [
          [[-16, -18], [-8, -4], [0, 8]],
          [[-4, -24], [8, -12], [14, 0]],
          [[6, -18], [12, -10], [20, -2]]
        ];
        for (const path of veinPaths) {
          ctx.beginPath();
          ctx.moveTo(unit.x + path[0][0] * S, unit.y + path[0][1] * S);
          for (let i = 1; i < path.length; i++) {
            ctx.lineTo(unit.x + path[i][0] * S, unit.y + path[i][1] * S);
          }
          ctx.stroke();
        }
      }
    },
    rogue: {
      name: 'Moonshade Rogue',
      desc: 'Fast assassin that can bypass melee units and strike from shadows.',
      cost: 70,
      hp: 80,
      speed: 90,
      range: 15,
      damage: 28,
      cooldown: 1.3,
      hitRadius: 10 * SCALE,
      isRanged: false,
      canAttackAir: true,
      canPassMelee: true,
      drawFunc: (ctx, unit) => {
        const S = SCALE;
        const dir = unit.side === 'player' ? 1 : -1;
        // Cloak/body
        ctx.fillStyle = '#3a3a3a';
        ctx.beginPath();
        ctx.ellipse(unit.x, unit.y - 6 * S, 12 * S, 16 * S, 0, 0, Math.PI * 2);
        ctx.fill();
        // Hooded head
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.arc(unit.x, unit.y - 20 * S, 8 * S, 0, Math.PI * 2);
        ctx.fill();
        // Mask
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(unit.x, unit.y - 20 * S, 4 * S, 0, Math.PI * 2);
        ctx.fill();
        // Daggers as triangles
        ctx.fillStyle = '#bbb';
        ctx.beginPath();
        ctx.moveTo(unit.x + dir * 6 * S, unit.y - 2 * S);
        ctx.lineTo(unit.x + dir * 14 * S, unit.y - 6 * S);
        ctx.lineTo(unit.x + dir * 10 * S, unit.y + 4 * S);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(unit.x + dir * 6 * S, unit.y + 4 * S);
        ctx.lineTo(unit.x + dir * 14 * S, unit.y + 8 * S);
        ctx.lineTo(unit.x + dir * 10 * S, unit.y + 14 * S);
        ctx.closePath();
        ctx.fill();
      }
    },
    drake: {
      name: 'Sky Drake',
      desc: 'Flying unit immune to ground melee; vulnerable to ranged.',
      cost: 100,
      hp: 160,
      speed: 80,
      range: 25,
      damage: 22,
      cooldown: 1.5,
      hitRadius: 14 * SCALE,
      isRanged: false,
      canAttackAir: true,
      isFlying: true,
      drawFunc: (ctx, unit) => {
        const S = SCALE;
        const dir = unit.side === 'player' ? 1 : -1;
        // Body core
        ctx.fillStyle = '#6aa0e6';
        ctx.beginPath();
        ctx.ellipse(unit.x, unit.y, 20 * S, 12 * S, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        ctx.fillStyle = '#5a8cd6';
        ctx.beginPath();
        ctx.moveTo(unit.x - dir * 20 * S, unit.y + 4 * S);
        ctx.lineTo(unit.x - dir * 30 * S, unit.y + 10 * S);
        ctx.lineTo(unit.x - dir * 20 * S, unit.y + 8 * S);
        ctx.closePath();
        ctx.fill();
        // Wings
        ctx.fillStyle = '#8ab5f0';
        ctx.beginPath();
        ctx.ellipse(unit.x - dir * 18 * S, unit.y - 8 * S, 16 * S, 8 * S, -dir * Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(unit.x + dir * 18 * S, unit.y - 8 * S, 16 * S, 8 * S, dir * Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.fillStyle = '#6aa0e6';
        ctx.beginPath();
        ctx.arc(unit.x + dir * 14 * S, unit.y - 6 * S, 6 * S, 0, Math.PI * 2);
        ctx.fill();
        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(unit.x + dir * 16 * S, unit.y - 7 * S, 2 * S, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    // New player unit available in stage 3. The Guardian is a heavily armoured
    // protector imbued with runic magic. It has high HP and damage but
    // moves slowly. Its glowing aura reflects its arcane power. Once
    // unlocked, it can be selected on the skill screen for stages 3 and
    // beyond.
    guardian: {
      name: 'Runic Guardian',
      desc: 'Heavily armoured knight wielding a runic hammer. Slow but devastating.',
      cost: 120,
      hp: 450,
      speed: 40,
      range: 20,
      damage: 40,
      cooldown: 2.5,
      hitRadius: 20 * SCALE,
      isRanged: false,
      canAttackAir: false,
      knockback: 12,
      drawFunc: (ctx, unit) => {
        const S = SCALE;
        const dir = unit.side === 'player' ? 1 : -1;
        // Lower body armour
        ctx.fillStyle = '#505468';
        ctx.beginPath();
        ctx.ellipse(unit.x, unit.y, 18 * S, 20 * S, 0, 0, Math.PI * 2);
        ctx.fill();
        // Chest plate
        ctx.fillStyle = '#686d88';
        ctx.fillRect(unit.x - 16 * S, unit.y - 22 * S, 32 * S, 22 * S);
        // Shoulder pauldrons
        ctx.fillStyle = '#505468';
        ctx.beginPath();
        ctx.arc(unit.x - 18 * S, unit.y - 22 * S, 8 * S, 0, Math.PI * 2);
        ctx.arc(unit.x + 18 * S, unit.y - 22 * S, 8 * S, 0, Math.PI * 2);
        ctx.fill();
        // Head with visor
        ctx.fillStyle = '#888da8';
        ctx.beginPath();
        ctx.arc(unit.x, unit.y - 34 * S, 10 * S, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#444857';
        ctx.fillRect(unit.x - 10 * S, unit.y - 36 * S, 20 * S, 4 * S);
        // Glowing eyes
        ctx.fillStyle = '#3ecaff';
        ctx.beginPath();
        ctx.arc(unit.x - 4 * S, unit.y - 34 * S, 2 * S, 0, Math.PI * 2);
        ctx.arc(unit.x + 4 * S, unit.y - 34 * S, 2 * S, 0, Math.PI * 2);
        ctx.fill();
        // Hammer
        ctx.fillStyle = '#686d88';
        ctx.fillRect(unit.x + dir * 16 * S, unit.y - 14 * S, 12 * S, 4 * S);
        ctx.fillRect(unit.x + dir * 26 * S, unit.y - 22 * S, 6 * S, 16 * S);
        // Runic glow on hammer
        ctx.strokeStyle = '#7cd7ff';
        ctx.lineWidth = 1.5 * S;
        ctx.beginPath();
        ctx.moveTo(unit.x + dir * 29 * S, unit.y - 21 * S);
        ctx.lineTo(unit.x + dir * 29 * S, unit.y - 6 * S);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(unit.x + dir * 29 * S, unit.y - 21 * S, 1.5 * S, 0, Math.PI * 2);
        ctx.fillStyle = '#7cd7ff';
        ctx.fill();
        // Arcane aura around the guardian
        ctx.strokeStyle = 'rgba(100, 180, 255, 0.4)';
        ctx.lineWidth = 3 * S;
        ctx.beginPath();
        ctx.arc(unit.x, unit.y - 16 * S, 30 * S, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
    // Enemy units
    bloodHound: {
      name: 'Blood Hound',
      desc: 'Fast melee beast that rushes into battle.',
      cost: 30,
      hp: 80,
      speed: 90,
      range: 15,
      damage: 18,
      cooldown: 0.9,
      hitRadius: 12 * SCALE,
      isRanged: false,
      canAttackAir: false,
      drawFunc: (ctx, unit) => {
        const S = SCALE;
        const dir = unit.side === 'player' ? 1 : -1;
        // Body
        ctx.fillStyle = '#992222';
        ctx.beginPath();
        ctx.ellipse(unit.x, unit.y, 14 * S, 8 * S, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.fillStyle = '#aa3333';
        ctx.beginPath();
        ctx.ellipse(unit.x + dir * 12 * S, unit.y - 4 * S, 10 * S, 6 * S, 0, 0, Math.PI * 2);
        ctx.fill();
        // Ears
        ctx.fillStyle = '#771111';
        ctx.beginPath();
        ctx.ellipse(unit.x + dir * 18 * S, unit.y - 10 * S, 4 * S, 6 * S, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(unit.x + dir * 6 * S, unit.y - 10 * S, 4 * S, 6 * S, 0, 0, Math.PI * 2);
        ctx.fill();
        // Legs
        ctx.fillStyle = '#662222';
        ctx.fillRect(unit.x - 10 * S, unit.y + 4 * S, 4 * S, 8 * S);
        ctx.fillRect(unit.x - 2 * S, unit.y + 4 * S, 4 * S, 8 * S);
        ctx.fillRect(unit.x + 6 * S, unit.y + 4 * S, 4 * S, 8 * S);
        ctx.fillRect(unit.x + 14 * S, unit.y + 4 * S, 4 * S, 8 * S);
      }
    },
    necromancer: {
      name: 'Necromancer',
      desc: 'Ranged mage that casts dark bolts at enemies.',
      cost: 50,
      hp: 100,
      speed: 50,
      range: 130,
      damage: 16,
      cooldown: 2.0,
      hitRadius: 12 * SCALE,
      isRanged: true,
      canAttackAir: true,
      splash: false,
      drawFunc: (ctx, unit) => {
        const S = SCALE;
        const dir = unit.side === 'player' ? 1 : -1;
        // Robe
        ctx.fillStyle = '#553388';
        ctx.fillRect(unit.x - 8 * S, unit.y - 12 * S, 16 * S, 24 * S);
        // Head
        ctx.fillStyle = '#6940aa';
        ctx.beginPath();
        ctx.arc(unit.x, unit.y - 20 * S, 8 * S, 0, Math.PI * 2);
        ctx.fill();
        // Hat
        ctx.fillStyle = '#3b2266';
        ctx.beginPath();
        ctx.moveTo(unit.x, unit.y - 30 * S);
        ctx.lineTo(unit.x - 12 * S, unit.y - 20 * S);
        ctx.lineTo(unit.x + 12 * S, unit.y - 20 * S);
        ctx.closePath();
        ctx.fill();
        // Staff
        ctx.strokeStyle = '#7860a8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(unit.x + dir * 8 * S, unit.y - 12 * S);
        ctx.lineTo(unit.x + dir * 8 * S, unit.y + 6 * S);
        ctx.stroke();
      }
    },
    boneGiant: {
      name: 'Bone Giant',
      desc: 'High HP tank that lumbers forward crushing foes.',
      cost: 90,
      hp: 280,
      speed: 35,
      range: 20,
      damage: 26,
      cooldown: 2.5,
      hitRadius: 18 * SCALE,
      isRanged: false,
      canAttackAir: false,
      drawFunc: (ctx, unit) => {
        const S = SCALE;
        // Torso
        ctx.fillStyle = '#c7c7c7';
        ctx.fillRect(unit.x - 18 * S, unit.y - 26 * S, 36 * S, 52 * S);
        // Arms
        ctx.fillStyle = '#c7c7c7';
        ctx.fillRect(unit.x - 26 * S, unit.y - 22 * S, 8 * S, 32 * S);
        ctx.fillRect(unit.x + 18 * S, unit.y - 22 * S, 8 * S, 32 * S);
        // Head
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.arc(unit.x, unit.y - 34 * S, 14 * S, 0, Math.PI * 2);
        ctx.fill();
        // Eye sockets
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(unit.x - 5 * S, unit.y - 36 * S, 3 * S, 0, Math.PI * 2);
        ctx.arc(unit.x + 5 * S, unit.y - 36 * S, 3 * S, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    flameDjinn: {
      name: 'Flame Djinn',
      desc: 'Flying fire caster that hurls burning energy at targets.',
      cost: 70,
      hp: 130,
      speed: 70,
      range: 120,
      damage: 20,
      cooldown: 1.8,
      hitRadius: 12 * SCALE,
      isRanged: true,
      canAttackAir: true,
      isFlying: true,
      drawFunc: (ctx, unit) => {
        const S = SCALE;
        // Lower swirl
        ctx.fillStyle = '#e05a3e';
        ctx.beginPath();
        ctx.ellipse(unit.x, unit.y + 4 * S, 16 * S, 12 * S, 0, 0, Math.PI * 2);
        ctx.fill();
        // Upper body
        ctx.fillStyle = '#f07c5a';
        ctx.beginPath();
        ctx.ellipse(unit.x, unit.y - 4 * S, 14 * S, 10 * S, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head flame
        ctx.fillStyle = '#ff9d76';
        const flameRadius2 = 6 * S + (typeof Date !== 'undefined' ? Math.sin(Date.now() / 200) * 2 * S : 0);
        ctx.beginPath();
        ctx.arc(unit.x, unit.y - 14 * S, flameRadius2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // Append new enemy unit definition for stage 3. The Shadow Wraith is a
  // terrifying apparition that floats above the ground and drains life
  // from its foes. It deals heavy ranged damage and is difficult to kill.
  unitConfigs.shadowWraith = {
    name: 'Shadow Wraith',
    desc: 'Spectral caster that siphons life from enemies.',
    cost: 90,
    hp: 200,
    speed: 70,
    range: 140,
    damage: 24,
    cooldown: 2.0,
    hitRadius: 14 * SCALE,
    isRanged: true,
    canAttackAir: true,
    isFlying: true,
    drawFunc: (ctx, unit) => {
      const S = SCALE;
      // Dark swirling body
      ctx.fillStyle = '#4a2e63';
      ctx.beginPath();
      ctx.ellipse(unit.x, unit.y, 20 * S, 14 * S, 0, 0, Math.PI * 2);
      ctx.fill();
      // Spectral hood
      ctx.fillStyle = '#5e3a80';
      ctx.beginPath();
      ctx.ellipse(unit.x, unit.y - 12 * S, 16 * S, 12 * S, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes glow
      ctx.fillStyle = '#d86eff';
      ctx.beginPath();
      ctx.arc(unit.x - 4 * S, unit.y - 14 * S, 2 * S, 0, Math.PI * 2);
      ctx.arc(unit.x + 4 * S, unit.y - 14 * S, 2 * S, 0, Math.PI * 2);
      ctx.fill();
      // Wisp trails
      ctx.strokeStyle = 'rgba(210,110,255,0.6)';
      ctx.lineWidth = 2 * S;
      ctx.beginPath();
      ctx.moveTo(unit.x - 8 * S, unit.y + 6 * S);
      ctx.quadraticCurveTo(unit.x - 12 * S, unit.y + 14 * S, unit.x - 4 * S, unit.y + 22 * S);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(unit.x + 8 * S, unit.y + 6 * S);
      ctx.quadraticCurveTo(unit.x + 12 * S, unit.y + 14 * S, unit.x + 4 * S, unit.y + 22 * S);
      ctx.stroke();
    }
  };

  // Instantiate and start the game
  const game = new Game();
  game.init();
  game.start();
})();