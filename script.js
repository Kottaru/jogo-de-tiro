const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const miniCanvas = document.getElementById('minimapCanvas');
const miniCtx = miniCanvas.getContext('2d');

const MAP = 2500; // Tamanho total do mapa quadrado
let wave = 0, kills = 0, isGameOver = false;
let enemies = [], bullets = [], drops = [], particles = [];
const keys = {};
const mouse = { x: 0, y: 0, down: false };

// Joystick Mobile
let moveX = 0, moveY = 0, touchStartX = 0, touchStartY = 0;

// Configuração Minimapa
miniCanvas.width = 150;
miniCanvas.height = 150;

class Player {
    constructor() {
        this.x = MAP / 2; this.y = MAP / 2;
        this.radius = 22; this.hp = 100; this.shield = 0;
        this.speed = 5; this.weapon = 'knife';
        this.angle = 0; this.lastAttack = 0;
    }

    update() {
        let vx = 0, vy = 0;
        if (keys['KeyW']) vy = -1; if (keys['KeyS']) vy = 1;
        if (keys['KeyA']) vx = -1; if (keys['KeyD']) vx = 1;

        if (moveX !== 0 || moveY !== 0) { vx = moveX; vy = moveY; }

        this.x += vx * this.speed;
        this.y += vy * this.speed;

        // Linha Vermelha Mortal
        if (this.x < 0 || this.x > MAP || this.y < 0 || this.y > MAP) {
            this.hp -= 0.5; // Dano por estar fora
            if (this.hp <= 0) {
                document.getElementById('death-msg').innerText = "VOCÊ SAIU DOS LIMITES!";
                this.die();
            }
        }

        this.angle = Math.atan2(mouse.y - canvas.height / 2, mouse.x - canvas.width / 2);
        if (keys['Digit1']) this.setWeapon('knife');
        if (keys['Digit2']) this.setWeapon('gun');

        if (mouse.down) {
            let now = Date.now();
            if (this.weapon === 'knife' && now - this.lastAttack > 300) {
                this.attackKnife(); this.lastAttack = now;
            } else if (this.weapon === 'gun' && now - this.lastAttack > 180) {
                bullets.push(new Bullet(this.x, this.y, this.angle, true));
                this.lastAttack = now;
            }
        }
    }

    setWeapon(type) {
        this.weapon = type;
        document.getElementById('weapon-name').innerText = type === 'knife' ? 'FACA' : 'PISTOLA';
    }

    attackKnife() {
        enemies.forEach(en => {
            if (Math.hypot(this.x - en.x, this.y - en.y) < 85) {
                en.hp -= 80;
                for(let i=0; i<8; i++) particles.push(new Particle(en.x, en.y, '#ff0000'));
            }
        });
    }

    damage(v) {
        if (this.shield > 0) { this.shield -= v; if (this.shield < 0) this.shield = 0; }
        else this.hp -= v;
        if (this.hp <= 0) this.die();
    }

    die() {
        isGameOver = true;
        document.getElementById('game-over').style.display = 'flex';
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x; this.y = y; this.radius = 20;
        this.hp = 50 + (wave * 15);
        this.speed = 1.8 + (wave * 0.15);
        this.lastShot = 0;
    }
    update() {
        let d = Math.hypot(player.x - this.x, player.y - this.y);
        let ang = Math.atan2(player.y - this.y, player.x - this.x);
        
        if (d > 220) {
            this.x += Math.cos(ang) * this.speed;
            this.y += Math.sin(ang) * this.speed;
        } else {
            this.x += Math.cos(ang + 1.2) * this.speed; // Circula o player
            this.y += Math.sin(ang + 1.2) * this.speed;
            
            if (Date.now() - this.lastShot > 2000 - (wave * 50)) {
                bullets.push(new Bullet(this.x, this.y, ang, false));
                this.lastShot = Date.now();
            }
        }
    }
}

class Bullet {
    constructor(x, y, ang, isPlayer) {
        this.x = x; this.y = y;
        this.vx = Math.cos(ang) * 12; this.vy = Math.sin(ang) * 12;
        this.isPlayer = isPlayer; this.active = true;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        if (this.isPlayer) {
            enemies.forEach(en => {
                if (Math.hypot(this.x - en.x, this.y - en.y) < en.radius) {
                    en.hp -= 25; this.active = false;
                }
            });
        } else if (Math.hypot(this.x - player.x, this.y - player.y) < player.radius) {
            player.damage(10); this.active = false;
        }
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.vx = (Math.random()-0.5)*8; this.vy = (Math.random()-0.5)*8;
        this.l = 1.0;
    }
    draw(cx, cy) {
        this.x += this.vx; this.y += this.vy; this.l -= 0.03;
        ctx.fillStyle = this.color; ctx.globalAlpha = this.l;
        ctx.fillRect(this.x - cx, this.y - cy, 4, 4);
        ctx.globalAlpha = 1;
    }
}

const player = new Player();

function spawnWave() {
    wave++;
    document.getElementById('wave-val').innerText = wave;
    const banner = document.getElementById('wave-banner');
    banner.innerText = "ONDA " + wave; banner.style.display = 'block';
    setTimeout(() => {
        banner.style.display = 'none';
        for(let i=0; i < 3 + wave * 2; i++){
            let a = Math.random()*Math.PI*2;
            enemies.push(new Enemy(player.x + Math.cos(a)*800, player.y + Math.sin(a)*800));
        }
    }, 2000);
}

function drawMinimap() {
    miniCtx.fillStyle = "rgba(0,0,0,0.8)";
    miniCtx.fillRect(0,0,150,150);
    
    const s = 150 / MAP; // Escala
    
    // Player
    miniCtx.fillStyle = "#3498db";
    miniCtx.fillRect(player.x * s - 2, player.y * s - 2, 4, 4);
    
    // Inimigos
    miniCtx.fillStyle = "#ff4757";
    enemies.forEach(en => miniCtx.fillRect(en.x * s - 1, en.y * s - 1, 3, 3));
    
    // Borda do Mapa no Minimapa
    miniCtx.strokeStyle = "red";
    miniCtx.strokeRect(0, 0, 150, 150);
}

function loop() {
    if (isGameOver) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const cx = player.x - canvas.width/2, cy = player.y - canvas.height/2;

    ctx.fillStyle = '#111'; ctx.fillRect(0,0, canvas.width, canvas.height);
    
    // Grid e Linha Vermelha
    ctx.strokeStyle = '#222'; ctx.beginPath();
    for(let i=-cx%100; i<canvas.width; i+=100){ ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); }
    for(let i=-cy%100; i<canvas.height; i+=100){ ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); }
    ctx.stroke();

    ctx.strokeStyle = 'red'; ctx.lineWidth = 10;
    ctx.strokeRect(-cx, -cy, MAP, MAP);

    player.update();

    // Inimigos Armados
    enemies.forEach((en, i) => {
        en.update();
        ctx.save(); ctx.translate(en.x - cx, en.y - cy);
        ctx.rotate(Math.atan2(player.y - en.y, player.x - en.x));
        ctx.fillStyle = '#444'; ctx.fillRect(10, -3, 15, 6); // Arminha do Bot
        ctx.fillStyle = '#ff4757'; ctx.beginPath(); ctx.arc(0,0, en.radius, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        if (en.hp <= 0) {
            if (Math.random() > 0.8) drops.push({x:en.x, y:en.y, t:Math.random()>0.5?'h':'s'});
            enemies.splice(i, 1); kills++;
            if (enemies.length === 0) spawnWave();
        }
    });

    bullets.forEach((b, i) => {
        b.update();
        ctx.fillStyle = b.isPlayer ? '#f1c40f' : '#fff';
        ctx.beginPath(); ctx.arc(b.x-cx, b.y-cy, 4, 0, Math.PI*2); ctx.fill();
        if(!b.active || b.x< -100 || b.x > MAP+100) bullets.splice(i,1);
    });

    particles.forEach((p, i) => { p.draw(cx, cy); if(p.l <= 0) particles.splice(i,1); });

    drops.forEach((d, i) => {
        ctx.fillStyle = d.t === 'h' ? '#2ecc71' : '#2f35f8';
        ctx.fillRect(d.x-cx-10, d.y-cy-10, 20, 20);
        if(Math.hypot(player.x-d.x, player.y-d.y) < 30){
            if(d.t==='h') player.hp = Math.min(100, player.hp+20);
            else player.shield = Math.min(100, player.shield+40);
            drops.splice(i, 1);
        }
    });

    // Player com Faca ou Arma
    ctx.save(); ctx.translate(player.x-cx, player.y-cy); ctx.rotate(player.angle);
    if(player.weapon === 'knife'){
        ctx.fillStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(15, -2); ctx.lineTo(50, 0); ctx.lineTo(15, 2); ctx.fill(); // Faca pontuda
    } else {
        ctx.fillStyle = '#444'; ctx.fillRect(15, -5, 25, 10); // Cano da arma
    }
    ctx.fillStyle = '#3498db'; ctx.beginPath(); ctx.arc(0,0, player.radius, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    document.getElementById('hp-bar').style.width = player.hp + '%';
    document.getElementById('shield-bar').style.width = player.shield + '%';
    document.getElementById('kills-val').innerText = kills;

    drawMinimap();
    requestAnimationFrame(loop);
}

// Eventos Mobile
const stick = document.getElementById('joystick-stick');
const joyBase = document.getElementById('joystick-base');
joyBase.ontouchstart = e => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; };
joyBase.ontouchmove = e => {
    let dx = e.touches[0].clientX - touchStartX; let dy = e.touches[0].clientY - touchStartY;
    let dist = Math.min(Math.hypot(dx, dy), 30); let ang = Math.atan2(dy, dx);
    moveX = (Math.cos(ang) * dist) / 30; moveY = (Math.sin(ang) * dist) / 30;
    stick.style.transform = `translate(${Math.cos(ang)*dist}px, ${Math.sin(ang)*dist}px)`;
};
joyBase.ontouchend = () => { moveX = 0; moveY = 0; stick.style.transform = `translate(0px, 0px)`; };
document.getElementById('btn-attack').ontouchstart = () => mouse.down = true;
document.getElementById('btn-attack').ontouchend = () => mouse.down = false;
document.getElementById('btn-knife').onclick = () => player.setWeapon('knife');
document.getElementById('btn-gun').onclick = () => player.setWeapon('gun');

window.onkeydown = e => keys[e.code] = true;
window.onkeyup = e => keys[e.code] = false;
window.onmousemove = e => { mouse.x = e.clientX; mouse.y = e.clientY; };
window.onmousedown = () => mouse.down = true;
window.onmouseup = () => mouse.down = false;

spawnWave();
loop();
