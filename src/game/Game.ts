import { PhysicsEngine } from './PhysicsEngine';
import { Character } from './Character';
import { AIController } from './AIController';
import { COLORS } from './Constants';
import Matter from 'matter-js';

export class Game {
    private physics: PhysicsEngine;
    private character: Character;
    private enemy: Character;
    private ai: AIController;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private keys: { [key: string]: boolean } = {};
    private camera = { x: 0, y: 0 };
    private mouse = { x: 0, y: 0 };

    constructor(containerId: string) {
        this.canvas = document.createElement('canvas');
        const container = document.getElementById(containerId);
        if (container) {
            container.appendChild(this.canvas);
        }
        this.ctx = this.canvas.getContext('2d')!;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.physics = new PhysicsEngine();
        this.physics.createGround(this.canvas.width / 2, this.canvas.height - 50, this.canvas.width * 2, 100);
        
        // Spawn Player (Red)
        this.character = new Character(this.canvas.width / 2 - 100, this.canvas.height - 200, this.physics.world, {
            primaryColor: COLORS.VERMILION,
            farColor: '#7A1E1E',
            collisionGroup: Matter.Body.nextGroup(true)
        });

        // Spawn Enemy (Blue)
        this.enemy = new Character(this.canvas.width / 2 + 100, this.canvas.height - 200, this.physics.world, {
            primaryColor: COLORS.INDIGO,
            farColor: '#1E3A5F',
            collisionGroup: Matter.Body.nextGroup(true)
        });

        this.ai = new AIController(this.enemy, this.character);
        
        this.setupInputs();
        this.physics.start();
        this.loop();
    }

    private setupInputs() {
        window.addEventListener('keydown', (e) => {
            if (['KeyA', 'KeyD', 'KeyS', 'Space'].includes(e.code)) {
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
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    private loop() {
        // 1. Process PLAYER inputs
        const playerRaw = {
            left: this.keys['KeyA'],
            right: this.keys['KeyD'],
            jump: this.keys['Space'],
            flip: this.keys['KeyS']
        };
        const { input: pIn, mouse: pMouse } = this.processCharacterInput(playerRaw, this.mouse, this.character);
        this.character.update(pIn, pMouse);
        
        // 2. Process AI inputs
        const aiRaw = this.ai.getInputs();
        const { input: eIn, mouse: eMouse } = this.processCharacterInput(aiRaw.inputs, aiRaw.mousePos, this.enemy);
        this.enemy.update(eIn, eMouse);
        
        // Camera Follow Logic (Follow midpoint of duel)
        const midpointX = (this.character.torso.position.x + this.enemy.torso.position.x) / 2;
        const targetX = midpointX - this.canvas.width / 2;
        this.camera.x += (targetX - this.camera.x) * 0.1; // Smooth follow
        
        this.draw();
        
        requestAnimationFrame(() => this.loop());
    }

    private processCharacterInput(rawInput: any, rawMouse: { x: number, y: number }, char: Character) {
        const input = { ...rawInput };
        const mouse = { ...rawMouse };
        
        // MOVEMENT: Use absolute controls (A=Left, D=Right) to prevent AI orientation conflicts.
        // We do NOT mirror input.left/right here anymore.

        if (char.facingDir === -1) {
            // MOUSE: Still mirror mouse X relative to character's torso for the visual flip
            const charX = char.torso.position.x;
            mouse.x = charX - (rawMouse.x - charX);
        }
        
        return { input, mouse };
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
                
                // If the body is part of a character, apply its specific visual flip
                const isPlayerBody = Matter.Composite.allBodies(this.character.composite).includes(body);
                const isEnemyBody = Matter.Composite.allBodies(this.enemy.composite).includes(body);
                
                if (isPlayerBody || isEnemyBody) {
                    const char = isPlayerBody ? this.character : this.enemy;
                    const charFacing = char.facingDir;
                    const charTorsoX = char.torso.position.x;
                    
                    this.ctx.translate(charTorsoX, 0);
                    this.ctx.scale(charFacing, 1);
                    this.ctx.translate(-charTorsoX, 0);
                }

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

        this.ctx.restore();

        // Overlay UI/Atmosphere (Fixed to screen)
        this.ctx.strokeStyle = COLORS.GOLD;
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(20, 20, this.canvas.width - 40, this.canvas.height - 40);
    }
}
