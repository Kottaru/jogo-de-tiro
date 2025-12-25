const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const MAP = 2500;
let wave = 0, kills = 0, isGameOver = false;
let enemies = [], bullets = [], drops = [], particles = [];
const keys = {};
const mouse = { x: 0, y: 0, down: false };

// Inputs
window.onkeydown = e => keys[e.code] = true;
window.onkeyup = e => keys[e.code] = false;
window.onmousemove = e => { mouse.x = e.clientX; mouse.y = e.clientY; };
window.onmousedown = () => mouse.down = true;
window.onmouseup = () => mouse.down = false;

class Player {
    constructor() {
        this.x = MAP/2; this.y = MAP/2;
        this.radius = 22; this.hp = 100; this.shield = 0;
        this.speed = 5; this.weapon = 'knife'; // 'knife' ou 'gun'
        this.lastAttack = 0;
    }

    update() {
        if (keys['KeyW']) this.y -= this.speed;
        if (keys['KeyS']) this.y += this.speed;
        if (keys['KeyA']) this.x -= this.speed;
        if (keys['KeyD']) this.x += this.speed;
        if (keys['Digit1']) { this.weapon = 'knife'; document.getElementById('weapon-name').innerText = 'FACA'; }
        if (keys['Digit2']) { this.weapon = 'gun'; document.getElementById('weapon-name').innerText = 'PISTOLA'; }

        this.angle = Math.atan2(mouse.y - canvas.height/2, mouse.x - canvas.width/2);

        if (mouse.down) {
            let now = Date.now();
            if (this.weapon === 'knife' && now - this.lastAttack > 300) {
                this.attackKnife();
                this.lastAttack = now;
            } else if (this.weapon === 'gun' && now - this.lastAttack > 180) {
                bullets.push(new Bullet(this.x, this.y, this.angle, true));
                this.lastAttack = now;
            }
        }
    }

    attackKnife() {
        enemies.forEach(en => {
            let d = Math.hypot(this.x - en.x, this.y - en.y);
            if (d < 80) { // Alcance da faca
                en.hp -= 80;
                spawnBlood(en.x, en.y, 8);
            }
        });
    }

    damage(v) {
        if (this.shield > 0) { this.shield -= v; if (this.shield < 0) this.shield = 0; }
        else this.hp -= v;
        if (this.hp <= 0) { isGameOver = true; document.getElementById('game-over').style.display = 'flex'; }
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x; this.y = y; this.radius = 20;
        this.hp = 40 + (wave * 20);
        this.speed = 1.5 + (wave * 0.2);
        this.lastShot = 0;
    }
    update() {
        let d = Math.hypot(player.x - this.x, player.y - this.y);
        let ang = Math.atan2(player.y - this.y, player.x - this.x);
        
        if (d > 250) {
            this.x += Math.cos(ang) * this.speed;
            this.y += Math.sin(ang) * this.speed;
        } else {
            // Recuar ou circular se estiver muito perto
            this.x += Math.cos(ang + 1.5) * this.speed;
            this.y += Math.sin(ang + 1.5) * this.speed;
            
            if (Date.now() - this.lastShot > 2000 - (wave * 100)) {
                bullets.push(new Bullet(this.x, this.y, ang, false));
                this.lastShot = Date.now();
            }
        }
    }
}

class Bullet {
    constructor(x, y, ang, isPlayer) {
        this.x = x; this.y = y;
        this.vx = Math.cos(ang) * 12;
        this.vy = Math.sin(ang) * 12;
        this.isPlayer = isPlayer;
        this.active = true;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        if (this.isPlayer) {
            enemies.forEach(en => {
                if (Math.hypot(this.x - en.x, this.y - en.y) < en.radius) {
                    en.hp -= 30; this.active = false;
                }
            });
        } else if (Math.hypot(this.x - player.x, this.y - player.y) < player.radius) {
            player.damage(10); this.active = false;
        }
    }
}

const player = new Player();

function spawnWave() {
    wave++;
    const banner = document.getElementById('wave-banner');
    banner.innerText = "ONDA " + wave;
    banner.style.display = 'block';
    setTimeout(() => {
        banner.style.display = 'none';
        for(let i=0; i < 4 + wave*2; i++) {
            let a = Math.random()*Math.PI*2;
            enemies.push(new Enemy(player.x + Math.cos(a)*700, player.y + Math.sin(a)*700));
        }
    }, 2000);
}

function spawnBlood(x, y, n) {
    for(let i=0; i<n; i++) particles.push({x, y, vx:(Math.random()-0.5)*10, vy:(Math.random()-0.5)*10, l:1});
}

function loop() {
    if (isGameOver) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const cx = player.x - canvas.width/2, cy = player.y - canvas.height/2;

    // Fundo e Grid
    ctx.fillStyle = '#111'; ctx.fillRect(0,0, canvas.width, canvas.height);
    ctx.strokeStyle = '#222'; ctx.beginPath();
    for(let i=-cx%100; i<canvas.width; i+=100) { ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); }
    for(let i=-cy%100; i<canvas.height; i+=100) { ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); }
    ctx.stroke();

    player.update();
    
    // Partículas (Sangue)
    particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.l -= 0.02;
        ctx.fillStyle = `rgba(255, 0, 0, ${p.l})`;
        ctx.fillRect(p.x-cx, p.y-cy, 4, 4);
        if (p.l <= 0) particles.splice(i, 1);
    });

    // Inimigos
    enemies.forEach((en, i) => {
        en.update();
        ctx.fillStyle = '#ff4757'; ctx.beginPath(); ctx.arc(en.x-cx, en.y-cy, en.radius, 0, Math.PI*2); ctx.fill();
        if (en.hp <= 0) {
            enemies.splice(i, 1); kills++;
            if (Math.random() > 0.7) drops.push({x: en.x, y: en.y, t: Math.random()>0.5?'h':'s'});
            if (enemies.length === 0) spawnWave();
        }
    });

    // Balas
    bullets.forEach((b, i) => {
        b.update();
        ctx.fillStyle = b.isPlayer ? '#f1c40f' : '#fff';
        ctx.beginPath(); ctx.arc(b.x-cx, b.y-cy, 4, 0, Math.PI*2); ctx.fill();
        if (!b.active || b.x<0 || b.x>MAP || b.y<0 || b.y>MAP) bullets.splice(i, 1);
    });

    // Drops
    drops.forEach((d, i) => {
        ctx.fillStyle = d.t === 'h' ? '#2ecc71' : '#2f35f8';
        ctx.fillRect(d.x-cx-10, d.y-cy-10, 20, 20);
        if (Math.hypot(player.x-d.x, player.y-d.y) < 30) {
            if (d.t === 'h') player.hp = Math.min(100, player.hp+20);
            else player.shield = Math.min(100, player.shield+40);
            drops.splice(i, 1);
        }
    });

    // Desenhar Player e Faca/Arma
    ctx.save(); ctx.translate(player.x-cx, player.y-cy); ctx.rotate(player.angle);
    ctx.fillStyle = player.weapon === 'knife' ? '#ccc' : '#444';
    ctx.fillRect(15, -2, player.weapon === 'knife' ? 35 : 20, 4);
    ctx.fillStyle = '#3498db'; ctx.beginPath(); ctx.arc(0,0, player.radius, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // UI
    document.getElementById('hp-bar').style.width = player.hp + '%';
    document.getElementById('shield-bar').style.width = player.shield + '%';
    document.getElementById('kills-val').innerText = kills;
    document.getElementById('wave-val').innerText = wave;

    requestAnimationFrame(loop);
}

spawnWave();
loop();
