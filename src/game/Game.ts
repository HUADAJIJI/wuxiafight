import { PhysicsEngine } from './PhysicsEngine';
import { Character } from './Character';
import { AIController } from './AIController';
import { COLORS, CHARACTER, COMBAT, SPAWN, MEDICINE, getTranslation } from './Constants';
import { ParticleSystem } from './VisualEffects';
import { audioManager } from './Audio';
import { BackgroundManager } from './Background';
import Matter from 'matter-js';
import { Vector } from 'matter-js';

export class Game {
    private physics: PhysicsEngine;
    private character: Character;
    private enemies: Character[] = [];
    private ais: AIController[] = [];
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private keys: { [key: string]: boolean } = {};
    private wasPlayerFlipPressed = false;
    private wasEnemiesFlipPressed: boolean[] = [];
    private camera = { x: 0, y: 0 };
    private mouse = { x: 0, y: 0 };
    private vfx: ParticleSystem;
    private restartBtn: HTMLButtonElement;
    private homeBtn: HTMLButtonElement;
    private pauseOverlay: HTMLDivElement;
    private isPaused: boolean = false;
    private gameTime: number = 0;
    private lastTick: number = Date.now();
    private lastSpawnTime: number = 0;
    private wasFPressed = false; // DEBUG ONLY
    private playerGroup: number;
    private enemyGroup: number;
    private spawnBias: number = 0.5; // Starts balanced (0.5 = 50% Left)
    private difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'NIGHTMARE';
    private attributes: any;
    private currentScore: number = 0;
    private totalScore: number = 0;
    private killsInSession: number = 0;
    private medicines: Matter.Body[] = [];
    private lang: 'ZH' | 'EN';
    private medicinePityCount: number = 0; // Pity counter for drops
    private shake: number = 0;
    private hellOverlay: HTMLElement | null;
    private bg: BackgroundManager;

    constructor(containerId: string, difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'NIGHTMARE', attributes: any, lang: 'ZH' | 'EN') {
        this.difficulty = difficulty;
        this.attributes = attributes;
        this.lang = lang;
        this.canvas = document.createElement('canvas');
        const container = document.getElementById(containerId);
        if (container) {
            container.appendChild(this.canvas);
        }
        this.ctx = this.canvas.getContext('2d')!;

        // Load Total Score
        const savedScore = localStorage.getItem('wuxia_total_score');
        this.totalScore = savedScore ? parseInt(savedScore) : 0;

        // Create Restart Button
        this.restartBtn = document.createElement('button');
        this.restartBtn.className = 'restart-btn';
        this.restartBtn.innerText = this.t('RETRY_BTN');
        if (container) container.appendChild(this.restartBtn);
        this.restartBtn.onclick = () => this.restart();

        // Create Home Button
        this.homeBtn = document.createElement('button');
        this.homeBtn.className = 'home-btn';
        this.homeBtn.innerText = this.t('HOME_BTN');
        if (container) container.appendChild(this.homeBtn);
        this.homeBtn.onclick = () => location.reload();

        // Create Pause Overlay
        this.pauseOverlay = document.createElement('div');
        this.pauseOverlay.className = 'pause-overlay';
        this.pauseOverlay.innerHTML = `
            <div class="pause-content">
                <h2>${this.t('PAUSE_TITLE')}</h2>
                <div class="pause-actions">
                    <button id="resume-btn">${this.t('RESUME_BTN')}</button>
                    <button id="pause-home-btn">${this.t('QUIT_BTN')}</button>
                </div>
            </div>
        `;
        if (container) container.appendChild(this.pauseOverlay);
        this.pauseOverlay.querySelector('#resume-btn')?.addEventListener('click', () => this.togglePause());
        this.pauseOverlay.querySelector('#pause-home-btn')?.addEventListener('click', () => {
            this.saveGameProgress();
            location.reload();
        });
        
        this.hellOverlay = document.getElementById('hell-indicator-overlay');
        if (this.difficulty === 'NIGHTMARE' && this.hellOverlay) {
            this.hellOverlay.style.display = 'block';
        }

        this.bg = new BackgroundManager(this.canvas, this.ctx);

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.physics = new PhysicsEngine();
        this.physics.createGround(0, this.canvas.height - 50, 200000, 100);

        this.playerGroup = Matter.Body.nextGroup(true);
        this.enemyGroup = Matter.Body.nextGroup(true);

        // Spawn Player (Red)
        this.character = new Character(this.canvas.width / 2, this.canvas.height - 200, this.physics.world, {
            primaryColor: COLORS.VERMILION,
            farColor: '#7A1E1E',
            collisionGroup: this.playerGroup,
            maxHp: CHARACTER.MAX_HP * (1 + (this.attributes.gengu - 1) * (9 / (CHARACTER.MAX_ATTR_LEVEL - 1))),
            damageMultiplier: 1 + (this.attributes.bili - 1) * (9 / (CHARACTER.MAX_ATTR_LEVEL - 1)),
            moveMultiplier: 1 + (this.attributes.shenfa - 1) * (4 / (CHARACTER.MAX_ATTR_LEVEL - 1)),
            stiffnessMultiplier: 1 + (this.attributes.shenfa - 1) * (0.495 / (CHARACTER.MAX_ATTR_LEVEL - 1)),
            thresholdModifier: (this.attributes.neigong - 1) * (1.35 / (CHARACTER.MAX_ATTR_LEVEL - 1))
        });

        this.enemies = [];
        this.ais = [];
        this.wasEnemiesFlipPressed = [];

        this.vfx = new ParticleSystem();

        // Register Collisions
        Matter.Events.on(this.physics.engine, 'collisionStart', (event) => {
            event.pairs.forEach(pair => this.handleCollision(pair));
        });

        this.setupInputs();
        
        // Initialize Audio (will start ambient sounds)
        audioManager.init();
        
        // Start immediately since difficulty is already chosen
        this.spawnEnemy();
        this.lastSpawnTime = 0; // Use 0 for gameTime
        this.lastTick = Date.now();
        this.physics.start();
        this.loop();
    }

    private t(key: any, params: any = {}) {
        return getTranslation(this.lang, key, params);
    }

    private setupInputs() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                this.togglePause();
                return;
            }
            if (['KeyA', 'KeyD', 'KeyS', 'Space', 'KeyF'].includes(e.code)) {
                e.preventDefault();
            }
            this.keys[e.code] = true;
        });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scale = (window as any).gameScale || 1;
            this.mouse.x = (e.clientX - rect.left) / scale + this.camera.x;
            this.mouse.y = (e.clientY - rect.top) / scale + this.camera.y;
        });
    }

    private resize() {
        this.canvas.width = 1280;
        this.canvas.height = 720;
    }

    private loop() {
        const now = Date.now();
        const dt = now - this.lastTick;
        this.lastTick = now;

        if (!this.isPaused) {
            this.gameTime += dt;
            
            const intervalMs = SPAWN.DIFFICULTY[this.difficulty].interval;
            if (this.gameTime - this.lastSpawnTime > intervalMs) {
                this.spawnEnemy();
                this.lastSpawnTime = this.gameTime;
            }

            // 1. Process player inputs (Only if alive)
            if (!this.character.isDead) {
                const playerInput = {
                    left: this.keys['KeyA'],
                    right: this.keys['KeyD'],
                    jump: this.keys['Space'],
                    flip: this.keys['KeyS']
                };
                
                // Handle Reconstruction Flip for Player
                if (playerInput.flip && !this.wasPlayerFlipPressed) {
                    this.character = this.flipCharacter(this.character);
                    this.ais.forEach((ai, i) => ai.updateReferences(this.enemies[i], this.character));
                }
                this.wasPlayerFlipPressed = playerInput.flip;
                this.character.update(playerInput, { x: this.mouse.x, y: this.mouse.y }, this.gameTime);
            }

            // --- DEBUG KEY BLOCK (F: Kill Random Enemy) ---
            if (this.keys['KeyF'] && !this.wasFPressed) {
                const aliveEnemies = this.enemies.filter(e => !e.isDead);
                if (aliveEnemies.length > 0) {
                    const victim = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
                    victim.takeDamage(1000, this.gameTime); // Fatal damage
                }
            }
            this.wasFPressed = this.keys['KeyF'];
            // ----------------------------------------------

            // 2. Process AI inputs
            this.enemies.forEach((enemy, i) => {
                if (enemy.isDead) {
                    // Count score once
                    if (!enemy.scoreCounted) {
                        let reward = SPAWN.DIFFICULTY[this.difficulty].scoreReward;
                        if (this.difficulty === 'NIGHTMARE') {
                            const extraLayer = Math.floor(this.killsInSession / 5);
                            reward += extraLayer * 2;
                        }
                        this.currentScore += reward;
                        this.killsInSession++;
                        enemy.scoreCounted = true;
                        
                        // Screen shake on kill
                        this.shake = Math.max(this.shake, 12);

                        // Try drop medicine if not Nightmare
                        if (this.difficulty !== 'NIGHTMARE') {
                            this.tryDropMedicine(enemy.torso.position.x, enemy.torso.position.y);
                        }
                    }

                    // Cleanup Sword for dead enemies after 2 seconds
                    if (enemy.deathTime !== undefined && enemy.sword) {
                        if (this.gameTime - enemy.deathTime > 2000) {
                            Matter.Composite.remove(enemy.composite, enemy.sword);
                            enemy.sword = undefined;
                        }
                    }
                    enemy.update({ left: false, right: false, jump: false, flip: false }, undefined, this.gameTime);
                    return;
                }

                const ai = this.ais[i];
                const aiRaw = ai.getInputs(this.gameTime);
                const { input: eIn, mouse: eMouse } = this.processCharacterInput(aiRaw.inputs, aiRaw.mousePos, enemy);

                // Handle Reconstruction Flip for AI
                if (eIn.flip && !this.wasEnemiesFlipPressed[i]) {
                    const newEnemy = this.flipCharacter(enemy);
                    this.enemies[i] = newEnemy;
                    ai.updateReferences(newEnemy, this.character);
                }
                this.wasEnemiesFlipPressed[i] = eIn.flip;
                this.enemies[i].update(eIn, eMouse, this.gameTime);
            });

            // Camera Follow Logic (Follow player only)
            const targetX = this.character.torso.position.x - this.canvas.width / 2;
            this.camera.x += (targetX - this.camera.x) * 0.1; // Smooth follow

            // Handle Shake Decay
            if (this.shake > 0) {
                this.shake *= 0.9;
                if (this.shake < 0.1) this.shake = 0;
            }

            this.vfx.update(this.canvas.height - 100);

            // --- Hell Mode Atmosphere: Rising Embers ---
            if (this.difficulty === 'NIGHTMARE' && Math.random() < 0.3) {
                const spawnX = this.camera.x + Math.random() * this.canvas.width;
                const spawnY = this.canvas.height; 
                this.vfx.spawn(spawnX, spawnY, '#FF4500', 1, 0.5); // Orange-red embers
                // Tweak the last particle's velocity to rise
                const p = this.vfx.particles[this.vfx.particles.length - 1];
                if (p) {
                    p.vy = -Math.random() * 2 - 1;
                    p.vx = (Math.random() - 0.5) * 1;
                    p.maxLife = p.life = 100 + Math.random() * 100;
                    p.gravityScale = -0.1; // Slowly rise
                }
            }

            // Show buttons if player is dead (no more victory condition)
            if (this.character.isDead) {
                if (this.restartBtn.style.display !== 'block') {
                    this.saveGameProgress();
                }
                this.restartBtn.style.display = 'block';
                this.homeBtn.style.display = 'block';
            } else {
                this.restartBtn.style.display = 'none';
                this.homeBtn.style.display = 'none';
            }
        }

        this.draw();

        requestAnimationFrame(() => this.loop());
    }

    private togglePause() {
        if (this.character.isDead) return; // Cannot pause on death screen

        this.isPaused = !this.isPaused;
        this.physics.runner.enabled = !this.isPaused;
        
        // Reset lastTick when resuming to avoid a huge jump in gameTime
        if (!this.isPaused) {
            this.lastTick = Date.now();
        }

        this.pauseOverlay.style.display = this.isPaused ? 'flex' : 'none';
    }

    private spawnEnemy() {
        // Pseudo-random: if many spawn on one side, increase probability for the other
        const isLeft = Math.random() < this.spawnBias;
        
        // Adjust bias: 
        // If spawned Left, decrease bias (making Right more likely)
        // If spawned Right, increase bias (making Left more likely)
        if (isLeft) {
            this.spawnBias = Math.max(0.1, this.spawnBias - 0.3);
        } else {
            this.spawnBias = Math.min(0.9, this.spawnBias + 0.3);
        }

        const spawnX = this.character.torso.position.x + (isLeft ? -SPAWN.OFFSET_X : SPAWN.OFFSET_X);
        const diffConfig = SPAWN.DIFFICULTY[this.difficulty];
        
        let hpMult = diffConfig.hpMultiplier;
        let dmgMult = diffConfig.damageMultiplier;

        // Nightmare Scaling
        if (this.difficulty === 'NIGHTMARE') {
            const extraLayer = Math.floor(this.killsInSession / 5);
            hpMult += extraLayer * 0.2;
            dmgMult += extraLayer * 0.2;
        }

        const enemy = new Character(spawnX, this.canvas.height - 200, this.physics.world, {
            primaryColor: COLORS.INDIGO,
            farColor: '#1E3A5F',
            collisionGroup: this.enemyGroup,
            maxHp: CHARACTER.MAX_HP * hpMult,
            damageMultiplier: dmgMult
        });

        this.enemies.push(enemy);
        this.ais.push(new AIController(enemy, this.character));
        this.wasEnemiesFlipPressed.push(false);
    }

    private processCharacterInput(rawInput: any, rawMouse: { x: number, y: number }, _char: Character) {
        const input = { ...rawInput };
        const mouse = { ...rawMouse };
        return { input, mouse };
    }

    private saveGameProgress() {
        if (this.currentScore <= 0) return;

        // Save total score for upgrading
        this.totalScore += this.currentScore;
        localStorage.setItem('wuxia_total_score', this.totalScore.toString());

        // Save to Leaderboard (Top 20 with Date)
        let leaderboard: { score: number, date: string }[] = JSON.parse(localStorage.getItem('wuxia_leaderboard') || '[]');

        // Migration check: if old data was number[], clear it or handle it
        if (leaderboard.length > 0 && typeof (leaderboard[0] as any) === 'number') {
            leaderboard = [];
        }

        const nowTime = new Date();
        const dateStr = `${nowTime.getFullYear()}-${String(nowTime.getMonth() + 1).padStart(2, '0')}-${String(nowTime.getDate()).padStart(2, '0')} ${String(nowTime.getHours()).padStart(2, '0')}:${String(nowTime.getMinutes()).padStart(2, '0')}:${String(nowTime.getSeconds()).padStart(2, '0')}`;

        leaderboard.push({ score: this.currentScore, date: dateStr });
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 20);
        localStorage.setItem('wuxia_leaderboard', JSON.stringify(leaderboard));
    }

    private flipCharacter(char: Character): Character {
        const state = char.getPhysicalState();
        const options = { ...char.options, facingDir: -char.facingDir };

        char.destroy();

        const newChar = new Character(state.position.x, state.position.y, this.physics.world, options);
        newChar.applyPhysicalState(state);

        return newChar;
    }

    private restart() {
        // Clear current characters
        this.character.destroy();
        this.enemies.forEach(e => e.destroy());

        this.currentScore = 0;
        this.killsInSession = 0;

        // Spawn Player (Red)
        this.character = new Character(this.canvas.width / 2, this.canvas.height - 200, this.physics.world, {
            primaryColor: COLORS.VERMILION,
            farColor: '#7A1E1E',
            collisionGroup: this.playerGroup,
            maxHp: CHARACTER.MAX_HP * (1 + (this.attributes.gengu - 1) * (9 / (CHARACTER.MAX_ATTR_LEVEL - 1))),
            damageMultiplier: 1 + (this.attributes.bili - 1) * (9 / (CHARACTER.MAX_ATTR_LEVEL - 1)),
            moveMultiplier: 1 + (this.attributes.shenfa - 1) * (4 / (CHARACTER.MAX_ATTR_LEVEL - 1)),
            stiffnessMultiplier: 1 + (this.attributes.shenfa - 1) * (0.495 / (CHARACTER.MAX_ATTR_LEVEL - 1)),
            thresholdModifier: (this.attributes.neigong - 1) * (1.35 / (CHARACTER.MAX_ATTR_LEVEL - 1))
        });

        this.enemies = [];
        this.ais = [];
        this.wasEnemiesFlipPressed = [];
        
        // Clear medicines
        this.medicines.forEach(m => Matter.Composite.remove(this.physics.world, m));
        this.medicines = [];
        
        this.spawnEnemy(); // Spawn immediately on restart
        this.lastSpawnTime = this.gameTime;
        this.lastTick = Date.now();

        this.restartBtn.style.display = 'none';
        
        // Let camera reset gracefully based on new player pos
    }

    private handleCollision(pair: Matter.Pair) {
        const { bodyA, bodyB } = pair;

        // --- Medicine Pickup Logic ---
        const isMedA = bodyA.label?.startsWith('medicine_');
        const isMedB = bodyB.label?.startsWith('medicine_');
        if (isMedA || isMedB) {
            const med = isMedA ? bodyA : bodyB;
            const other = isMedA ? bodyB : bodyA;
            const char = this.getCharacterFromBody(other);
            
            if (char === this.character) { // Only player picks up
                 const type = med.label === 'medicine_large' ? 'LARGE' : 'SMALL';
                 const healAmount = char.maxHp * (type === 'LARGE' ? 0.6 : 0.3);
                 char.hp = Math.min(char.maxHp, char.hp + healAmount);
                 
                 // Effect
                 this.vfx.spawn(med.position.x, med.position.y, (med.render.fillStyle as string), 15, 2.0);
                 
                 // Remove
                 Matter.Composite.remove(this.physics.world, med);
                 this.medicines = this.medicines.filter(m => m !== med);
            }
            return;
        }

        const isSwordA = bodyA.label === 'blade' || bodyA.label === 'guard' || bodyA.label === 'handle' || (bodyA.parent && bodyA.parent.label === 'sword');
        const isSwordB = bodyB.label === 'blade' || bodyB.label === 'guard' || bodyB.label === 'handle' || (bodyB.parent && bodyB.parent.label === 'sword');

        if (!isSwordA && !isSwordB) return; // No sword involved

        // 1. Blade vs Blade (Sword Clash / 弹刀)
        if (isSwordA && isSwordB) {
            const parentA = bodyA.parent || bodyA;
            const parentB = bodyB.parent || bodyB;
            
            // 排除同一把剑内部零件的自碰撞
            if (parentA === parentB) return;

            const relVel = Vector.sub(parentA.velocity, parentB.velocity);
            const speed = Vector.magnitude(relVel);
            
            if (speed > 0.2) {
                const charA = this.getCharacterFromBody(parentA);
                const charB = this.getCharacterFromBody(parentB);
                
                // 排除同一个角色的自碰撞
                if (charA && charB && charA === charB) return;

                if (charA && charB) {
                    const normal = pair.collision.normal;
                    const recoil = COMBAT.CLASH.RECOIL_FORCE * speed;

                    // Physical Force
                    Matter.Body.applyForce(parentA, bodyA.position, Vector.mult(normal, -recoil * 1.5));
                    Matter.Body.applyForce(charA.torso, charA.torso.position, Vector.mult(normal, -recoil * 0.4));

                    Matter.Body.applyForce(parentB, bodyB.position, Vector.mult(normal, recoil * 1.5));
                    Matter.Body.applyForce(charB.torso, charB.torso.position, Vector.mult(normal, recoil * 0.4));

                    // Velocity Impulse
                    const impulseMag = speed * 0.5;
                    const impulseA = Vector.mult(normal, -impulseMag);
                    const impulseB = Vector.mult(normal, impulseMag);
                    
                    Matter.Body.setVelocity(parentA, Vector.add(parentA.velocity, impulseA));
                    Matter.Body.setVelocity(parentB, Vector.add(parentB.velocity, impulseB));
                    Matter.Body.setVelocity(charA.torso, Vector.add(charA.torso.velocity, Vector.mult(impulseA, 0.5)));
                    Matter.Body.setVelocity(charB.torso, Vector.add(charB.torso.velocity, Vector.mult(impulseB, 0.5)));

                    charA.stunTimer = Math.max(charA.stunTimer, COMBAT.CLASH.STUN_FRAMES);
                    charB.stunTimer = Math.max(charB.stunTimer, COMBAT.CLASH.STUN_FRAMES);

                    // Sword Torque
                    const torqueMag = speed * 0.8;
                    parentA.torque -= normal.x > 0 ? torqueMag : -torqueMag;
                    parentB.torque += normal.x > 0 ? torqueMag : -torqueMag;

                    // Visual sparks
                    const contact = pair.contacts[0]?.vertex;
                    if (contact && speed > COMBAT.CLASH.SPARK_THRESHOLD) {
                        this.vfx.spawn(contact.x, contact.y, COLORS.GOLD, COMBAT.CLASH.SPARK_COUNT, speed * 0.4);
                        // 非线性音量：让速度对音量的影响更明显
                        const relativeSpeed = Math.max(0, speed - COMBAT.CLASH.SPARK_THRESHOLD);
                        const dynamicVol = Math.min(0.8, Math.pow(relativeSpeed, 1.2) * 0.15);
                        audioManager.playClash(dynamicVol);
                    }
                }
            }
            return;
        }

        const [blade, target] = isSwordA ? [bodyA, bodyB] : [bodyB, bodyA];
        
        const targetChar = this.getCharacterFromBody(target);
        const bladeChar = this.getCharacterFromBody(blade);

        if (!targetChar || !bladeChar || targetChar === bladeChar) return;

        if (['head', 'torso', 'limb'].includes(target.label)) {
            const relVel = Vector.sub(blade.velocity, target.velocity);
            const speed = Vector.magnitude(relVel);
            
            const threshold = COMBAT.VELOCITY_THRESHOLD - bladeChar.thresholdModifier;
            if (speed > threshold) {
                const multiplier = COMBAT.PART_MULTIPLIERS[target.label as keyof typeof COMBAT.PART_MULTIPLIERS] || 1.0;
                const damage = (speed - threshold) * multiplier * COMBAT.DAMAGE_SCALE * bladeChar.damageMultiplier;
                
                targetChar.takeDamage(damage, this.gameTime);
                targetChar.stunTimer = Math.min(30, Math.floor(damage * 1.5));

                const forceDir = Vector.normalise(Vector.sub(target.position, blade.position));
                const forceMag = speed * 0.005 * multiplier;
                Matter.Body.applyForce(target, target.position, Vector.mult(forceDir, forceMag));

                const contact = pair.contacts[0]?.vertex;
                if (contact) {
                    const baseCount = Math.floor(damage * 3) + 10;
                    this.vfx.spawn(contact.x, contact.y, COLORS.VERMILION, baseCount, speed * 0.4, target);
                    this.vfx.spawn(contact.x, contact.y, COLORS.VERMILION, Math.floor(baseCount * 0.3), speed * 0.2, blade);
                    this.vfx.spawn(contact.x, contact.y, COLORS.VERMILION, baseCount, speed * 1.0);
                    // 非线性音量：增强速度对打击音量的反馈，让重击更有力
                    const impactIntensity = Math.max(0, damage - 1); 
                    const dynamicVol = Math.min(1.0, Math.pow(impactIntensity, 1.1) * 0.08);
                    audioManager.playHit(dynamicVol);
                }
            }
        }
    }

    private tryDropMedicine(x: number, y: number) {
        // Pseudo-random: increase chance by 10% for every consecutive miss
        const pityBonus = this.medicinePityCount * 0.10;
        const rand = Math.random();
        let medConfig = null;

        // Distribute pity bonus between large and small (30% to large, 70% to small)
        const largeChance = MEDICINE.LARGE.chance + (pityBonus * 0.3);
        const totalChance = (MEDICINE.LARGE.chance + MEDICINE.SMALL.chance) + pityBonus;

        if (rand < largeChance) {
            medConfig = MEDICINE.LARGE;
        } else if (rand < totalChance) {
            medConfig = MEDICINE.SMALL;
        }

        if (medConfig) {
            this.medicinePityCount = 0; // Reset on drop
            const medBody = Matter.Bodies.circle(x, y, MEDICINE.RADIUS, {
                label: medConfig.label,
                friction: 0.5,
                frictionAir: 0.02,
                restitution: 0.5,
                collisionFilter: {
                    group: 0, // No specific group
                    mask: 1   // Only collide with Default Category (usually just the Ground)
                },
                render: { fillStyle: medConfig.color }
            });
            Matter.Composite.add(this.physics.world, medBody);
            this.medicines.push(medBody);
        } else {
            this.medicinePityCount++; // Increment pity if no drop
        }
    }

    private getCharacterFromBody(body: Matter.Body): Character | null {
        if (this.character.composite.bodies.some(b => b === body || b.parts.includes(body))) return this.character;
        if (this.character.sword && (this.character.sword === body || this.character.sword.parts.includes(body))) return this.character;

        for (const enemy of this.enemies) {
            if (enemy.composite.bodies.some(b => b === body || b.parts.includes(body))) return enemy;
            if (enemy.sword && (enemy.sword === body || enemy.sword.parts.includes(body))) return enemy;
        }
        return null;
    }

    private draw() {
        // 1. Draw Far Background and Bamboo (Behind characters)
        this.bg.draw(this.camera.x);

        this.ctx.save();
        
        // Apply Shake to Camera
        if (this.shake > 0) {
            const sx = (Math.random() - 0.5) * this.shake;
            const sy = (Math.random() - 0.5) * this.shake;
            this.ctx.translate(sx, sy);
        }

        this.ctx.translate(-this.camera.x, -this.camera.y);

        const allBodies = Matter.Composite.allBodies(this.physics.world);
        allBodies.forEach(body => {
            const partsToDraw = body.parts.length > 1 ? body.parts.slice(1) : [body];
            partsToDraw.forEach(part => {
                this.ctx.save();
                this.ctx.beginPath();
                const vertices = part.vertices;
                this.ctx.moveTo(vertices[0].x, vertices[0].y);
                for (let i = 1; i < vertices.length; i++) {
                    this.ctx.lineTo(vertices[i].x, vertices[i].y);
                }
                this.ctx.closePath();
                this.ctx.fillStyle = (part.render.fillStyle as string) || COLORS.GOLD;
                this.ctx.fill();
                this.ctx.strokeStyle = COLORS.GOLD;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
                this.ctx.restore();
            });
        });

        // 5. Draw Foreground (Grass and Overlay - in front of characters)
        const entities = [this.character, ...this.enemies].map(e => ({ x: e.torso.position.x, width: 40 }));
        this.bg.drawForeground(this.camera.x, entities);

        this.vfx.draw(this.ctx);
        this.ctx.restore();

        // 6. Draw Screen-Space Overlays (Parchment, Vignette)
        this.bg.drawOverlay();

        // --- Apply Nightmare Atmosphere (Overlay) ---
        if (this.difficulty === 'NIGHTMARE') {
            const pulse = Math.sin(this.gameTime * 0.002) * 0.1 + 0.15;
            
            // Outer red glow (vignette)
            const grad = this.ctx.createRadialGradient(
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.height * 0.3,
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.height * 0.8
            );
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(1, `rgba(142, 35, 35, ${pulse})`);
            
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        const barW = 60;
        const barH = 5;

        const drawOverheadBar = (char: Character, color: string) => {
            const headPos = char.head.position;
            const screenX = headPos.x - this.camera.x - barW / 2;
            const screenY = headPos.y - this.camera.y - 45;
            
            // 1. Draw BG
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(screenX, screenY, barW, barH);
            
            // 2. Draw Fill
            this.ctx.fillStyle = color;
            this.ctx.fillRect(screenX, screenY, barW * (char.hp / char.maxHp), barH);
            
            // 3. Draw Border
            this.ctx.strokeStyle = COLORS.GOLD;
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(screenX, screenY, barW, barH);

            // 4. Draw Numeric Value (New)
            this.ctx.fillStyle = COLORS.SILK;
            this.ctx.font = 'bold 11px "EB Garamond", serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${Math.ceil(char.hp)} / ${Math.ceil(char.maxHp)}`, screenX + barW / 2, screenY - 5);
        };

        drawOverheadBar(this.character, COLORS.VERMILION);
        this.enemies.forEach(enemy => drawOverheadBar(enemy, COLORS.INDIGO));

        if (this.character.isDead) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = COLORS.GOLD;
            this.ctx.font = 'bold 84px "Cinzel", serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.t('DEFEAT_TITLE'), this.canvas.width / 2, this.canvas.height / 2 - 20);
            this.ctx.font = '600 28px "EB Garamond", serif';
            this.ctx.fillText(this.t('DEFEAT_SUB'), this.canvas.width / 2, this.canvas.height / 2 + 80);
            
            this.ctx.fillStyle = COLORS.GOLD;
            this.ctx.font = '24px "EB Garamond", serif';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = 'black';
            this.ctx.fillText(`${this.t('SESSION_SCORE')}: ${this.currentScore} ${this.t('SCORE_UNIT')}`, this.canvas.width / 2, this.canvas.height / 2 + 130);
            this.ctx.fillText(`${this.t('TOTAL_POWER')}: ${this.totalScore} ${this.t('SCORE_UNIT')}`, this.canvas.width / 2, this.canvas.height / 2 + 170);
            this.ctx.shadowBlur = 0;

            this.ctx.textBaseline = 'alphabetic';
        }

        // Draw HUD Score
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(20, 20, 200, 40);
        this.ctx.strokeStyle = COLORS.GOLD;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(20, 20, 200, 40);
        
        this.ctx.fillStyle = COLORS.GOLD;
        this.ctx.font = 'bold 20px "EB Garamond", serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${this.t('CURRENT_SCORE')}: ${this.currentScore}`, 40, 47);

        // Nightmare indicator in DOM
        if (this.difficulty === 'NIGHTMARE' && this.hellOverlay) {
            const currentLayer = Math.floor(this.killsInSession / 5) + 1;
            this.hellOverlay.innerText = this.t('HELL_INDICATOR', { layer: currentLayer });
        }

        this.ctx.textAlign = 'center'; // Restore for other calls
    }
}
