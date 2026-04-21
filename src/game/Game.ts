import { PhysicsEngine } from './PhysicsEngine';
import { Character } from './Character';
import { AIController } from './AIController';
import { COLORS, CHARACTER, COMBAT, SPAWN } from './Constants';
import { ParticleSystem } from './VisualEffects';
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
    private lastFrameTime: number = 0;
    private lastSpawnTime: number = 0;
    private wasFPressed = false; // DEBUG ONLY
    private playerGroup: number;
    private enemyGroup: number;
    private spawnBias: number = 0.5; // Starts balanced (0.5 = 50% Left)

    constructor(containerId: string) {
        this.canvas = document.createElement('canvas');
        const container = document.getElementById(containerId);
        if (container) {
            container.appendChild(this.canvas);
        }
        this.ctx = this.canvas.getContext('2d')!;

        // Create Restart Button
        this.restartBtn = document.createElement('button');
        this.restartBtn.className = 'restart-btn';
        this.restartBtn.innerText = '再战一回';
        if (container) container.appendChild(this.restartBtn);
        this.restartBtn.onclick = () => this.restart();

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
            collisionGroup: this.playerGroup
        });

        this.enemies = [];
        this.ais = [];
        this.wasEnemiesFlipPressed = [];

        this.vfx = new ParticleSystem();

        // Spawn first enemy immediately
        this.spawnEnemy();
        this.lastSpawnTime = Date.now();

        // Register Collisions
        Matter.Events.on(this.physics.engine, 'collisionStart', (event) => {
            event.pairs.forEach(pair => this.handleCollision(pair));
        });

        this.setupInputs();
        this.physics.start();
        this.loop();
    }

    private setupInputs() {
        window.addEventListener('keydown', (e) => {
            if (['KeyA', 'KeyD', 'KeyS', 'Space', 'KeyF'].includes(e.code)) {
                e.preventDefault();
            }
            this.keys[e.code] = true;
        });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left + this.camera.x;
            this.mouse.y = e.clientY - rect.top + this.camera.y;
        });
    }

    private resize() {
        const container = this.canvas.parentElement;
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        } else {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    private loop() {
        const now = Date.now();
        if (now - this.lastSpawnTime > SPAWN.INTERVAL_MS) {
            this.spawnEnemy();
            this.lastSpawnTime = now;
        }

        // 1. Process PLAYER inputs
        const playerRaw = {
            left: this.keys['KeyA'],
            right: this.keys['KeyD'],
            jump: this.keys['Space'],
            flip: this.keys['KeyS']
        };

        // --- DEBUG KEY BLOCK (F: Kill Random Enemy) ---
        if (this.keys['KeyF'] && !this.wasFPressed) {
            const aliveEnemies = this.enemies.filter(e => !e.isDead);
            if (aliveEnemies.length > 0) {
                const victim = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
                victim.takeDamage(1000); // Fatal damage
            }
        }
        this.wasFPressed = this.keys['KeyF'];
        // ----------------------------------------------

        const { input: pIn, mouse: pMouse } = this.processCharacterInput(playerRaw, this.mouse, this.character);

        // Handle Reconstruction Flip for Player
        if (pIn.flip && !this.wasPlayerFlipPressed) {
            this.character = this.flipCharacter(this.character);
            this.ais.forEach((ai, i) => ai.updateReferences(this.enemies[i], this.character));
        }
        this.wasPlayerFlipPressed = pIn.flip;
        this.character.update(pIn, pMouse);

        // 2. Process AI inputs
        this.enemies.forEach((enemy, i) => {
            if (enemy.isDead) {
                // Cleanup Sword for dead enemies after 2 seconds
                if (enemy.deathTime && enemy.sword) {
                    if (now - enemy.deathTime > 2000) {
                        Matter.Composite.remove(enemy.composite, enemy.sword);
                        enemy.sword = undefined;
                    }
                }
                enemy.update({ left: false, right: false, jump: false, flip: false });
                return;
            }

            const ai = this.ais[i];
            const aiRaw = ai.getInputs();
            const { input: eIn, mouse: eMouse } = this.processCharacterInput(aiRaw.inputs, aiRaw.mousePos, enemy);

            // Handle Reconstruction Flip for AI
            if (eIn.flip && !this.wasEnemiesFlipPressed[i]) {
                const newEnemy = this.flipCharacter(enemy);
                this.enemies[i] = newEnemy;
                ai.updateReferences(newEnemy, this.character);
            }
            this.wasEnemiesFlipPressed[i] = eIn.flip;
            this.enemies[i].update(eIn, eMouse);
        });

        // Camera Follow Logic (Follow player only)
        const targetX = this.character.torso.position.x - this.canvas.width / 2;
        this.camera.x += (targetX - this.camera.x) * 0.1; // Smooth follow

        this.vfx.update(this.canvas.height - 100);

        // Show button if player is dead (no more victory condition)
        if (this.character.isDead) {
            this.restartBtn.style.display = 'block';
        } else {
            this.restartBtn.style.display = 'none';
        }

        this.draw();

        requestAnimationFrame(() => this.loop());
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
        
        const enemy = new Character(spawnX, this.canvas.height - 200, this.physics.world, {
            primaryColor: COLORS.INDIGO,
            farColor: '#1E3A5F',
            collisionGroup: this.enemyGroup
        });

        this.enemies.push(enemy);
        this.ais.push(new AIController(enemy, this.character));
        this.wasEnemiesFlipPressed.push(false);
    }

    private processCharacterInput(rawInput: any, rawMouse: { x: number, y: number }, char: Character) {
        const input = { ...rawInput };
        const mouse = { ...rawMouse };

        // MOUSE/MOVEMENT: No mirroring needed here anymore because the Character 
        // will be physically flipped in the engine.

        return { input, mouse };
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

        // Spawn Player (Red)
        this.character = new Character(this.canvas.width / 2, this.canvas.height - 200, this.physics.world, {
            primaryColor: COLORS.VERMILION,
            farColor: '#7A1E1E',
            collisionGroup: this.playerGroup
        });

        this.enemies = [];
        this.ais = [];
        this.wasEnemiesFlipPressed = [];
        
        this.spawnEnemy(); // Spawn immediately on restart
        this.lastSpawnTime = Date.now();

        this.restartBtn.style.display = 'none';
        
        // Let camera reset gracefully based on new player pos
    }

    private handleCollision(pair: Matter.Pair) {
        const { bodyA, bodyB } = pair;

        // Check for Blade vs Body Part
        const isBladeA = bodyA.label === 'blade';
        const isBladeB = bodyB.label === 'blade';

        if (!isBladeA && !isBladeB) return; // No blade involved
        if (isBladeA && isBladeB) return;   // Sword clash (ignoring for HP)

        const [blade, target] = isBladeA ? [bodyA, bodyB] : [bodyB, bodyA];
        
        // Identify which character owns the target body
        const targetChar = this.getCharacterFromBody(target);
        const bladeChar = this.getCharacterFromBody(blade);

        if (!targetChar || !bladeChar || targetChar === bladeChar) return; // Self-hit or invalid

        // Body part labels: 'head', 'torso', 'limb'
        if (['head', 'torso', 'limb'].includes(target.label)) {
            // Calculate Damage
            const relVel = Vector.sub(blade.velocity, target.velocity);
            const speed = Vector.magnitude(relVel);

            if (speed > COMBAT.VELOCITY_THRESHOLD) {
                const multiplier = COMBAT.PART_MULTIPLIERS[target.label as keyof typeof COMBAT.PART_MULTIPLIERS] || 1.0;
                const damage = (speed - COMBAT.VELOCITY_THRESHOLD) * multiplier * COMBAT.DAMAGE_SCALE;
                
                targetChar.takeDamage(damage);
                targetChar.stunTimer = Math.min(30, Math.floor(damage * 1.5));

                // Apply Force
                const forceDir = Vector.normalise(Vector.sub(target.position, blade.position));
                const forceMag = speed * 0.005 * multiplier;
                Matter.Body.applyForce(target, target.position, Vector.mult(forceDir, forceMag));

                // Blood VFX
                const contact = pair.contacts[0]?.vertex;
                if (contact) {
                    const baseCount = Math.floor(damage * 3) + 10; // More blood
                    // 1. Spatter on target
                    this.vfx.spawn(contact.x, contact.y, COLORS.VERMILION, baseCount, speed * 0.4, target);
                    // 2. Spatter on blade
                    this.vfx.spawn(contact.x, contact.y, COLORS.VERMILION, Math.floor(baseCount * 0.3), speed * 0.2, blade);
                    // 3. Ambient splatter (flies and hits ground/other)
                    this.vfx.spawn(contact.x, contact.y, COLORS.VERMILION, baseCount, speed * 1.0);
                }

                console.log(`${target.label} hit! Speed: ${speed.toFixed(2)}, Damage: ${damage.toFixed(2)}`);
            }
        }
    }

    private getCharacterFromBody(body: Matter.Body): Character | null {
        // Check Player
        if (this.character.composite.bodies.some(b => b === body || b.parts.includes(body))) return this.character;
        if (this.character.sword && (this.character.sword === body || this.character.sword.parts.includes(body))) return this.character;

        // Check Enemies
        for (const enemy of this.enemies) {
            if (enemy.composite.bodies.some(b => b === body || b.parts.includes(body))) return enemy;
            if (enemy.sword && (enemy.sword === body || enemy.sword.parts.includes(body))) return enemy;
        }

        return null;
    }

    private draw() {
        this.ctx.fillStyle = COLORS.LACQUER;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        const facing = this.character.facingDir;
        const charX = this.character.torso.position.x;

        // Draw bodies - Only draw sub-parts for compound bodies to avoid "blob" hulls
        const allBodies = Matter.Composite.allBodies(this.physics.world);
        allBodies.forEach(body => {
            const partsToDraw = body.parts.length > 1 ? body.parts.slice(1) : [body];

            partsToDraw.forEach(part => {
                this.ctx.save();

                // The character's flip is now handled physically in the engine,
                // so we don't need any ctx.scale transformation here.

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

        this.vfx.draw(this.ctx);

        this.ctx.restore();

        // ---------------------------------------------------------
        // Overhead Health Bars
        // ---------------------------------------------------------
        const barW = 60;
        const barH = 5;

        const drawOverheadBar = (char: Character, color: string) => {
            const headPos = char.head.position;
            const screenX = headPos.x - this.camera.x - barW / 2;
            const screenY = headPos.y - this.camera.y - 45; // Above head

            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(screenX, screenY, barW, barH);
            this.ctx.fillStyle = color;
            this.ctx.fillRect(screenX, screenY, barW * (char.hp / CHARACTER.MAX_HP), barH);
            this.ctx.strokeStyle = COLORS.GOLD;
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(screenX, screenY, barW, barH);
        };

        // Draw for player
        drawOverheadBar(this.character, COLORS.VERMILION);

        // Draw for enemies
        this.enemies.forEach(enemy => {
            drawOverheadBar(enemy, COLORS.INDIGO);
        });

        // Death Text Overlay
        if (this.character.isDead) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = COLORS.GOLD;
            this.ctx.font = 'bold 84px "Cinzel", serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('惜  败', this.canvas.width / 2, this.canvas.height / 2 - 20);
            
            this.ctx.font = '600 28px "EB Garamond", serif';
            this.ctx.fillText('无 尽 之 战 ， 终 有 一 死', this.canvas.width / 2, this.canvas.height / 2 + 80);
            
            // Reset text baseline for other renderings
            this.ctx.textBaseline = 'alphabetic';
        }
    }
}
