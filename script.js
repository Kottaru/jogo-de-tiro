const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Configurações do Jogo
const MAP_SIZE = 3000;
let wave = 0;
let kills = 0;
let isGameOver = false;
let entities = [];
let bullets = [];
let drops = [];

// Input
const keys = {};
const mouse = { x: 0, y: 0, down: false };

window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mousedown', () => mouse.down = true);
window.addEventListener('mouseup', () => mouse.down = false);

class Player {
    constructor() {
        this.x = MAP_SIZE / 2;
        this.y = MAP_SIZE / 2;
        this.radius = 25;
        this.hp = 100;
        this.shield = 0;
        this.speed = 5;
        this.angle = 0;
        this.lastShot = 0;
    }

    update() {
        if (keys['KeyW']) this.y -= this.speed;
        if (keys['KeyS']) this.y += this.speed;
        if (keys['KeyA']) this.x -= this.speed;
        if (keys['KeyD']) this.x += this.speed;

        this.angle = Math.atan2(mouse.y - canvas.height/2, mouse.x - canvas.width/2);

        if (mouse.down && Date.now() - this.lastShot > 150) {
            this.shoot();
            this.lastShot = Date.now();
        }
    }

    shoot() {
        bullets.push(new Bullet(this.x, this.y, this.angle, true));
    }

    takeDamage(amount) {
        if (this.shield > 0) {
            this.shield -= amount;
            if (this.shield < 0) {
                this.hp += this.shield;
                this.shield = 0;
            }
        } else {
            this.hp -= amount;
        }
        if (this.hp <= 0) endGame();
    }
}

class Enemy {
    constructor(x, y, waveLevel) {
        this.x = x;
        this.y = y;
        this.radius = 22;
        this.hp = 50 + (waveLevel * 10);
        this.speed = 2 + (waveLevel * 0.2);
        this.color = '#ff4757';
    }

    update() {
        let angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;

        // Dano por contato
        if (Math.hypot(player.x - this.x, player.y - this.y) < player.radius + this.radius) {
            player.takeDamage(0.5); // Dano contínuo ao encostar
        }
    }
}

class Bullet {
    constructor(x, y, angle, fromPlayer) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * 15;
        this.vy = Math.sin(angle) * 15;
        this.fromPlayer = fromPlayer;
        this.active = true;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > MAP_SIZE || this.y < 0 || this.y > MAP_SIZE) this.active = false;
    }
}

class Drop {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.type = Math.random() > 0.7 ? 'shield' : 'hp';
        this.radius = 15;
    }
}

const player = new Player();

function nextWave() {
    wave++;
    document.getElementById('wave-alert').style.display = 'block';
    setTimeout(() => {
        document.getElementById('wave-alert').style.display = 'none';
        spawnEnemies();
    }, 2000);
}

function spawnEnemies() {
    const amount = 5 + (wave * 3);
    for (let i = 0; i < amount; i++) {
        let angle = Math.random() * Math.PI * 2;
        let dist = 800 + Math.random() * 200;
        let ex = player.x + Math.cos(angle) * dist;
        let ey = player.y + Math.sin(angle) * dist;
        entities.push(new Enemy(ex, ey, wave));
    }
}

function endGame() {
    isGameOver = true;
    document.getElementById('game-over').style.display = 'flex';
    document.getElementById('final-wave').innerText = wave;
}

function gameLoop() {
    if (isGameOver) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const camX = player.x - canvas.width / 2;
    const camY = player.y - canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar Grid
    ctx.strokeStyle = '#222';
    for (let x = -camX % 100; x < canvas.width; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = -camY % 100; y < canvas.height; y += 100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Bordas
    ctx.strokeStyle = '#ff4757';
    ctx.lineWidth = 10;
    ctx.strokeRect(-camX, -camY, MAP_SIZE, MAP_SIZE);

    player.update();

    // Atualizar UI
    document.getElementById('hp-bar').style.width = player.hp + '%';
    document.getElementById('shield-bar').style.width = player.shield + '%';
    document.getElementById('wave-val').innerText = wave;
    document.getElementById('kills-val').innerText = kills;

    // Desenhar Player
    ctx.save();
    ctx.translate(player.x - camX, player.y - camY);
    ctx.rotate(player.angle);
    ctx.fillStyle = '#3498db';
    ctx.beginPath(); ctx.arc(0, 0, player.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222'; ctx.fillRect(10, -5, 25, 10);
    ctx.restore();

    // Inimigos
    entities.forEach((en, i) => {
        en.update();
        ctx.fillStyle = en.color;
        ctx.beginPath(); ctx.arc(en.x - camX, en.y - camY, en.radius, 0, Math.PI * 2); ctx.fill();

        if (en.hp <= 0) {
            if (Math.random() > 0.8) drops.push(new Drop(en.x, en.y));
            entities.splice(i, 1);
            kills++;
            if (entities.length === 0) nextWave();
        }
    });

    // Balas
    bullets.forEach((b, i) => {
        b.update();
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.arc(b.x - camX, b.y - camY, 5, 0, Math.PI * 2); ctx.fill();

        entities.forEach(en => {
            if (Math.hypot(b.x - en.x, b.y - en.y) < en.radius) {
                en.hp -= 25;
                b.active = false;
            }
        });

        if (!b.active) bullets.splice(i, 1);
    });

    // Drops
    drops.forEach((d, i) => {
        ctx.fillStyle = d.type === 'shield' ? '#2f35f8' : '#ff4757';
        ctx.fillRect(d.x - camX - 10, d.y - camY - 10, 20, 20);
        
        if (Math.hypot(player.x - d.x, player.y - d.y) < player.radius + d.radius) {
            if (d.type === 'shield') player.shield = Math.min(100, player.shield + 50);
            else player.hp = Math.min(100, player.hp + 25);
            drops.splice(i, 1);
        }
    });

    requestAnimationFrame(gameLoop);
}

nextWave();
gameLoop();
