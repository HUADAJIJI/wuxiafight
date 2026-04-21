import { Character } from './Character';

const AIState = {
    NEUTRAL: 0,
    WINDUP_CLEAVE: 1,
    STRIKE_CLEAVE: 2,
    WINDUP_THRUST: 3,
    STRIKE_THRUST: 4
} as const;

type AIState = typeof AIState[keyof typeof AIState];

export class AIController {
    private source: Character;
    private target: Character;
    private lastFlipTime: number = 0;
    
    // AI Spacing Constants
    private readonly PREFERRED_DIST_MIN = 130;
    private readonly PREFERRED_DIST_MAX = 200;
    private readonly CHASE_DIST = 220;
    
    private state: AIState = AIState.NEUTRAL;
    private stateTimer: number = 0;
    private stateDuration: number = 2000; // ms

    constructor(source: Character, target: Character) {
        this.source = source;
        this.target = target;
    }

    public updateReferences(source: Character, target: Character) {
        this.source = source;
        this.target = target;
    }

    public getInputs() {
        const sourcePos = this.source.torso.position;
        const targetPos = this.target.torso.position;
        const time = Date.now();
        const delta = 16; 
        
        this.stateTimer += delta;

        const dx = targetPos.x - sourcePos.x;
        const dist = Math.abs(dx);
        
        const inputs = {
            left: false,
            right: false,
            jump: false,
            flip: false
        };

        // 1. Movement & Flip Logic (Always face player)
        const shouldFaceRight = dx > 0;
        const isFacingRight = this.source.facingDir === 1;
        if (shouldFaceRight !== isFacingRight && time - this.lastFlipTime > 500) {
            inputs.flip = true;
            this.lastFlipTime = time;
        }

        // 2. Dynamic Spacing Logic
        // AI will now try to maintain distance even during windups or neutral
        const canMove = this.state === AIState.NEUTRAL || 
                        this.state === AIState.WINDUP_CLEAVE || 
                        this.state === AIState.WINDUP_THRUST;

        if (canMove) {
            if (dist > this.CHASE_DIST) {
                // Too far, chase
                if (dx > 0) inputs.right = true;
                else inputs.left = true;
            } else if (dist < this.PREFERRED_DIST_MIN) {
                // Too close, back off
                if (dx > 0) inputs.left = true;
                else inputs.right = true;
            } else if (dist > this.PREFERRED_DIST_MAX) {
                // Slightly too far, nudge closer
                if (dx > 0) inputs.right = true;
                else inputs.left = true;
            }
        }

        // 3. Special Movement: Lunge during Strike (Thrust)
        if (this.state === AIState.STRIKE_THRUST) {
            if (dx > 0) inputs.right = true;
            else inputs.left = true;
        } else if (this.state === AIState.STRIKE_CLEAVE) {
            // Step forward slightly during cleave
            if (dx > 0) inputs.right = true;
            else inputs.left = true;
        }

        // 4. State Machine Transitions
        if (this.stateTimer > this.stateDuration) {
            this.stateTimer = 0;
            this.transitionState();
        }

        // 3. Combat Commands with Interpolated Paths
        const progress = Math.min(1.0, this.stateTimer / this.stateDuration);
        const mousePos = this.calculateTargeting(targetPos, time, progress);

        return { inputs, mousePos };
    }

    private transitionState() {
        const rand = Math.random();
        
        switch (this.state) {
            case AIState.NEUTRAL:
                if (rand < 0.6) {
                    this.state = AIState.WINDUP_CLEAVE;
                    this.stateDuration = 1000; // Slightly longer windup for visibility
                } else {
                    this.state = AIState.WINDUP_THRUST;
                    this.stateDuration = 700;
                }
                break;
                
            case AIState.WINDUP_CLEAVE:
                this.state = AIState.STRIKE_CLEAVE;
                this.stateDuration = 500; // Fast strike
                break;
                
            case AIState.WINDUP_THRUST:
                this.state = AIState.STRIKE_THRUST;
                this.stateDuration = 400; // Sharp lunge
                break;
                
            default:
                this.state = AIState.NEUTRAL;
                this.stateDuration = 1500 + Math.random() * 2000;
                break;
        }
    }

    private calculateTargeting(targetPos: { x: number, y: number }, time: number, progress: number) {
        const sourcePos = this.source.torso.position;
        const sway = Math.sin(time * 0.003) * 30;
        const facing = this.source.facingDir;
        
        switch (this.state) {
            case AIState.WINDUP_CLEAVE:
                // Raise high (Neutral to High Guard)
                return { 
                    x: sourcePos.x + (facing * 20), 
                    y: sourcePos.y - 120 - (progress * 60) // Continue rising
                };
                
            case AIState.STRIKE_CLEAVE:
                // PERFORM THE ARC: Quarter-circle from top to front-down
                // Angle starts at -PI/2 (up), ends at roughly 0 or PI/4 (front)
                const startAngle = -Math.PI / 2;
                const endAngle = Math.PI / 4; 
                const currentAngle = startAngle + (endAngle - startAngle) * progress;
                const radius = 180; // Distance of the "mouse" from shoulder
                
                return { 
                    x: sourcePos.x + Math.cos(currentAngle) * radius * facing, 
                    y: sourcePos.y + Math.sin(currentAngle) * radius 
                };
                
            case AIState.WINDUP_THRUST:
                // Pull sword toward own rear/torso
                return { 
                    x: sourcePos.x - (facing * 40), 
                    y: targetPos.y 
                };
                
            case AIState.STRIKE_THRUST:
                // Linear extension across horizontal axis
                // Use power easing for "snap" forward
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const thrustX = sourcePos.x - (facing * 40) + (facing * 240 * easeOut);
                return { 
                    x: thrustX, 
                    y: targetPos.y 
                };
                
            default:
                // Neutral sway tracking player torso
                return { 
                    x: targetPos.x, 
                    y: targetPos.y + sway 
                };
        }
    }
}
