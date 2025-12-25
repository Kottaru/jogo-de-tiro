/**
 * ARENA SHOOTER .IO - JS PURO
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const healthBar = document.getElementById('health-bar');
const gameOverScreen = document.getElementById('game-over');

// Configurações do Mundo
const WORLD = {
    width: 3000,
    height: 3000,
    gridSize: 50,
    obstacles: []
};

// Estado do Jogo
let score = 0;
let isGameOver = false;
const keys = {};
const mouse = { x: 0, y: 0, down: false };

// Classes de Entidades
class Entity {
    constructor(x, y, radius, color, speed) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.speed = speed;
        this.hp = 100;
        this.maxHp = 100;
        this.angle = 0;
        this.lastShot = 0;
        this.shootDelay = 400; // ms
        this.isHit = false;
    }

    drawLifeBar(camX, camY) {
        const barW = 40;
        const barH = 6;
        const x = this.x - camX - barW / 2;
        const y = this.y - camY - this.radius - 15;
        
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, y, barW, barH);
        ctx.fillStyle = this.hp > 30 ? '#2ecc71' : '#e74c3c';
        ctx.fillRect(x, y, barW * (this.hp / this.maxHp), barH);
    }
}

class Player extends Entity {
    update() {
        let dx = 0;
        let dy = 0;

        if (keys['w'] || keys['ArrowUp']) dy -= this.speed;
        if (keys['s'] || keys['ArrowDown']) dy += this.speed;
        if (keys['a'] || keys['ArrowLeft']) dx -= this.speed;
        if (keys['d'] || keys['ArrowRight']) dx += this.speed;

        // Colisão com bordas do mapa
        const nextX = this.x + dx;
        const nextY = this.y + dy;

        if (nextX > this.radius && nextX < WORLD.width - this.radius) {
            if (!checkWallCollision(nextX, this.y, this.radius)) this.x = nextX;
        }
        if (nextY > this.radius && nextY < WORLD.height - this.radius) {
            if (!checkWallCollision(this.x, nextY, this.radius)) this.y = nextY;
        }

        // Mira
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        this.angle = Math.atan2(mouse.y - screenY, mouse.x - screenX);

        if (mouse.down) this.shoot();
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot > this.shootDelay) {
            bullets.push(new Bullet(this.x, this.y, this.angle, true));
            this.lastShot = now;
        }
    }
}

class Bot extends Entity {
    constructor(x, y, difficulty) {
        super(x, y, 20, '#e74c3c', difficulty.speed);
        this.difficulty = difficulty; // {accuracy, speed, reaction}
        this.state = 'PATROL';
        this.targetAngle = Math.random() * Math.PI * 2;
        this.stateTimer = 0;
    }

    update(player) {
        const dist = Math.hypot(player.x - this.x, player.y - this.y);

        // Lógica de IA
        if (this.hp < 30) {
            this.state = 'FLEE';
        } else if (dist < 500) {
            this.state = 'ATTACK';
        } else {
            this.state = 'PATROL';
        }

        if (this.state === 'ATTACK') {
            const idealAngle = Math.atan2(player.y - this.y, player.x - this.x);
            // Aplica erro de precisão baseado na dificuldade
            this.angle += (idealAngle - this.angle) * this.difficulty.accuracy;
            
            if (dist > 200) { // Aproximar
                this.moveInAngle(this.angle);
            }
            
            if (Date.now() - this.lastShot > this.shootDelay + (1000 - this.difficulty.reaction)) {
                bullets.push(new Bullet(this.x, this.y, this.angle, false));
                this.lastShot = Date.now();
            }
        } else if (this.state === 'FLEE') {
            const escapeAngle = Math.atan2(this.y - player.y, this.x - player.x);
            this.moveInAngle(escapeAngle);
        } else {
            // Patrol
            if (Date.now() > this.stateTimer) {
                this.targetAngle = Math.random() * Math.PI * 2;
                this.stateTimer = Date.now() + 2000;
            }
            this.moveInAngle(this.targetAngle);
        }
    }

    moveInAngle(angle) {
        const nx = this.x + Math.cos(angle) * this.speed;
        const ny = this.y + Math.sin(angle) * this.speed;
        if (!checkWallCollision(nx, ny, this.radius)) {
            this.x = nx;
            this.y = ny;
        }
    }
}

class Bullet {
    constructor(x, y, angle, isFromPlayer) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 12;
        this.damage = isFromPlayer ? 25 : 10;
        this.isFromPlayer = isFromPlayer;
        this.distanceTraveled = 0;
        this.maxDistance = 800;
        this.active = true;
    }

    update() {
        const dx = Math.cos(this.angle) * this.speed;
        const dy = Math.sin(this.angle) * this.speed;
        this.x += dx;
        this.y += dy;
        this.distanceTraveled += this.speed;

        if (this.distanceTraveled > this.maxDistance || checkWallCollision(this.x, this.y, 2)) {
            this.active = false;
        }
    }

    draw(camX, camY) {
        ctx.fillStyle = this.isFromPlayer ? '#f1c40f' : '#fff';
        ctx.beginPath();
        ctx.arc(this.x - camX, this.y - camY, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Inicialização
const player = new Player(WORLD.width / 2, WORLD.height / 2, 22, '#3498db', 5);
const camera = { x: 0, y: 0 };
const bullets = [];
const bots = [];
const particles = [];

function spawnBots() {
    if (bots.length < 10) {
        const difficulties = [
            { accuracy: 0.05, speed: 2, reaction: 200 }, // Fácil
            { accuracy: 0.1, speed: 3, reaction: 500 },  // Médio
            { accuracy: 0.2, speed: 4, reaction: 800 }   // Difícil
        ];
        const diff = difficulties[Math.floor(Math.random() * difficulties.length)];
        bots.push(new Bot(Math.random() * WORLD.width, Math.random() * WORLD.height, diff));
    }
}

function initWorld() {
    // Gerar obstáculos aleatórios
    for (let i = 0; i < 15; i++) {
        WORLD.obstacles.push({
            x: Math.random() * (WORLD.width - 200),
            y: Math.random() * (WORLD.height - 200),
            w: 100 + Math.random() * 200,
            h: 100 + Math.random() * 200
        });
    }
}

function checkWallCollision(x, y, r) {
    return WORLD.obstacles.some(o => (
        x + r > o.x && x - r < o.x + o.w &&
        y + r > o.y && y - r < o.y + o.h
    ));
}

// Input Handlers
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('mousedown', () => mouse.down = true);
window.addEventListener('mouseup', () => mouse.down = false);

function handleCollisions() {
    bullets.forEach(b => {
        if (!b.active) return;

        if (b.isFromPlayer) {
            bots.forEach(bot => {
                if (Math.hypot(b.x - bot.x, b.y - bot.y) < bot.radius + 4) {
                    bot.hp -= b.damage;
                    b.active = false;
                    createParticles(b.x, b.y, bot.color);
                }
            });
        } else {
            if (Math.hypot(b.x - player.x, b.y - player.y) < player.radius + 4) {
                player.hp -= b.damage;
                b.active = false;
                createParticles(b.x, b.y, player.color);
                healthBar.style.width = player.hp + '%';
            }
        }
    });
}

function createParticles(x, y, color) {
    for (let i = 0; i < 5; i++) {
        particles.push({
            x, y, 
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 1,
            color
        });
    }
}

// Game Loop Principal
function update() {
    if (isGameOver) return;

    player.update();
    
    // Câmera segue o jogador
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    bullets.forEach((b, i) => {
        b.update();
        if (!b.active) bullets.splice(i, 1);
    });

    bots.forEach((bot, i) => {
        bot.update(player);
        if (bot.hp <= 0) {
            bots.splice(i, 1);
            score++;
            scoreEl.innerText = score;
            spawnBots();
        }
    });

    particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) particles.splice(i, 1);
    });

    handleCollisions();

    if (player.hp <= 0) {
        isGameOver = true;
        gameOverScreen.style.display = 'block';
        document.getElementById('final-score').innerText = score;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar Fundo (Grid)
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    for (let x = -camera.x % WORLD.gridSize; x < canvas.width; x += WORLD.gridSize) {
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    }
    for (let y = -camera.y % WORLD.gridSize; y < canvas.height; y += WORLD.gridSize) {
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // Desenhar Obstáculos
    ctx.fillStyle = '#444';
    WORLD.obstacles.forEach(o => {
        ctx.fillRect(o.x - camera.x, o.y - camera.y, o.w, o.h);
    });

    // Desenhar Bots
    bots.forEach(bot => {
        ctx.save();
        ctx.translate(bot.x - camera.x, bot.y - camera.y);
        ctx.rotate(bot.angle);
        ctx.fillStyle = bot.color;
        ctx.beginPath();
        ctx.arc(0, 0, bot.radius, 0, Math.PI * 2);
        ctx.fill();
        // Arma do bot
        ctx.fillStyle = '#222';
        ctx.fillRect(10, -5, 20, 10);
        ctx.restore();
        bot.drawLifeBar(camera.x, camera.y);
    });

    // Desenhar Player
    ctx.save();
    ctx.translate(player.x - camera.x, player.y - camera.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(15, -6, 25, 12);
    ctx.restore();

    // Desenhar Balas e Partículas
    bullets.forEach(b => b.draw(camera.x, camera.y));
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - camera.x, p.y - camera.y, 4, 4);
    });
    ctx.globalAlpha = 1;
}

function loop() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    update();
    draw();
    requestAnimationFrame(loop);
}

// Start
initWorld();
for(let i=0; i<6; i++) spawnBots();
loop();
