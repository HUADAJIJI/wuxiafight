import Matter from 'matter-js';
import { COLORS, CHARACTER, PHYSICS } from './Constants';

export interface CharacterOptions {
    primaryColor: string;
    farColor: string;
    collisionGroup: number;
    facingDir?: number;
    maxHp?: number;
    damageMultiplier?: number;
    stiffnessMultiplier?: number;
    moveMultiplier?: number;
    thresholdModifier?: number;
}

export class Character {
    public torso: Matter.Body;
    public head: Matter.Body;
    public sword?: Matter.Body;
    public facingDir: number = 1; // 1 for Right, -1 for Left
    public hp: number;
    public maxHp: number;
    public damageMultiplier: number;
    public stunTimer: number = 0;
    public isDead: boolean = false;
    public scoreCounted: boolean = false;
    public deathTime?: number;
    public limbs: { [key: string]: Matter.Body } = {};
    public constraints: Matter.Constraint[] = [];
    public handConstraint?: Matter.Constraint;
    public composite: Matter.Composite;
    private world: Matter.World;
    public stiffnessMultiplier: number = 1.0;
    public moveMultiplier: number = 1.0;
    public thresholdModifier: number = 0;

    // Target angles for PD control
    public targetAngles: { [key: string]: number } = {
        neck: 0,
        l_shoulder: 0.2,   // Back shoulder (relative)
        r_shoulder: -0.2,  // Front shoulder (relative)
        l_elbow: 0.5,
        r_elbow: -0.1,
        l_hip: 0.1,
        r_hip: -0.1,
        l_knee: 0.2,
        r_knee: -0.2,
    };

    public readonly options: CharacterOptions;

    constructor(x: number, y: number, world: Matter.World, options: CharacterOptions) {
        this.world = world;
        this.options = options;
        this.facingDir = options.facingDir || 1;
        this.maxHp = options.maxHp || CHARACTER.MAX_HP;
        this.hp = this.maxHp;
        this.damageMultiplier = options.damageMultiplier || 1.0;
        this.stiffnessMultiplier = options.stiffnessMultiplier || 1.0;
        this.moveMultiplier = options.moveMultiplier || 1.0;
        this.thresholdModifier = options.thresholdModifier || 0;
        this.composite = Matter.Composite.create({ label: 'Character' });

        const group = options.collisionGroup;
        const front = this.facingDir;
        const back = -this.facingDir;

        // 1. Create Parts
        this.torso = Matter.Bodies.rectangle(x, y, CHARACTER.TORSO_WIDTH, CHARACTER.TORSO_HEIGHT, {
            collisionFilter: { group },
            friction: PHYSICS.FRICTION,
            frictionAir: PHYSICS.FRICTION_AIR / this.moveMultiplier, // Reduce air resistance as speed moves up
            render: { fillStyle: options.primaryColor },
            label: 'torso'
        });

        this.head = Matter.Bodies.circle(x, y - CHARACTER.TORSO_HEIGHT / 2 - CHARACTER.HEAD_RADIUS, CHARACTER.HEAD_RADIUS, {
            collisionFilter: { group },
            frictionAir: PHYSICS.FRICTION_AIR,
            render: { fillStyle: COLORS.SILK },
            label: 'head'
        });

        // Visual Details
        const headband = Matter.Bodies.rectangle(x, y - CHARACTER.TORSO_HEIGHT / 2 - CHARACTER.HEAD_RADIUS, CHARACTER.HEAD_RADIUS * 2.2, 4, {
            collisionFilter: { group },
            render: { fillStyle: COLORS.LACQUER }
        });
        const sash = Matter.Bodies.rectangle(x, y, CHARACTER.TORSO_WIDTH + 2, 8, {
            collisionFilter: { group },
            angle: Math.PI / 4,
            render: { fillStyle: COLORS.GOLD }
        });

        // Limbs based on direction
        const farColor = options.farColor;
        const nearColor = options.primaryColor;

        // Shoulder/Hip offsets
        const shoulderW = CHARACTER.TORSO_WIDTH / 2;
        const hipW = 10;

        // "Left" limbs are always "Back", "Right" limbs are always "Front"
        this.limbs.l_upper_arm = this.createLimb(x + back * shoulderW, y - 20, CHARACTER.ARM_WIDTH, CHARACTER.ARM_HEIGHT, group, farColor);
        this.limbs.l_lower_arm = this.createLimb(x + back * shoulderW, y + 10, CHARACTER.ARM_WIDTH, CHARACTER.ARM_HEIGHT, group, farColor);
        this.limbs.r_upper_arm = this.createLimb(x + front * shoulderW, y - 20, CHARACTER.ARM_WIDTH, CHARACTER.ARM_HEIGHT, group, nearColor);
        this.limbs.r_lower_arm = this.createLimb(x + front * shoulderW, y + 10, CHARACTER.ARM_WIDTH, CHARACTER.ARM_HEIGHT, group, nearColor);

        this.limbs.l_upper_leg = this.createLimb(x + back * hipW, y + CHARACTER.TORSO_HEIGHT / 2, CHARACTER.LEG_WIDTH, CHARACTER.LEG_HEIGHT, group, farColor);
        this.limbs.l_lower_leg = this.createLimb(x + back * hipW, y + CHARACTER.TORSO_HEIGHT / 2 + 40, CHARACTER.LEG_WIDTH, CHARACTER.LEG_HEIGHT, group, farColor);
        this.limbs.r_upper_leg = this.createLimb(x + front * hipW, y + CHARACTER.TORSO_HEIGHT / 2, CHARACTER.LEG_WIDTH, CHARACTER.LEG_HEIGHT, group, nearColor);
        this.limbs.r_lower_leg = this.createLimb(x + front * hipW, y + CHARACTER.TORSO_HEIGHT / 2 + 40, CHARACTER.LEG_WIDTH, CHARACTER.LEG_HEIGHT, group, nearColor);

        // 2. Constraints
        this.addJoint(this.torso, this.head, { x: 0, y: -CHARACTER.TORSO_HEIGHT / 2 }, { x: 0, y: CHARACTER.HEAD_RADIUS }, 'neck');

        Matter.Composite.add(this.composite, [
            Matter.Constraint.create({ bodyA: this.head, bodyB: headband, stiffness: 1, length: 0, render: { visible: false } }),
            Matter.Constraint.create({ bodyA: this.torso, bodyB: sash, stiffness: 1, length: 0, render: { visible: false } })
        ]);

        this.addJoint(this.torso, this.limbs.l_upper_arm, { x: back * shoulderW, y: -20 }, { x: 0, y: -CHARACTER.ARM_HEIGHT / 2 }, 'l_shoulder');
        this.addJoint(this.limbs.l_upper_arm, this.limbs.l_lower_arm, { x: 0, y: CHARACTER.ARM_HEIGHT / 2 }, { x: 0, y: -CHARACTER.ARM_HEIGHT / 2 }, 'l_elbow');
        this.addJoint(this.torso, this.limbs.r_upper_arm, { x: front * shoulderW, y: -20 }, { x: 0, y: -CHARACTER.ARM_HEIGHT / 2 }, 'r_shoulder');
        this.addJoint(this.limbs.r_upper_arm, this.limbs.r_lower_arm, { x: 0, y: CHARACTER.ARM_HEIGHT / 2 }, { x: 0, y: -CHARACTER.ARM_HEIGHT / 2 }, 'r_elbow');

        this.addJoint(this.torso, this.limbs.l_upper_leg, { x: back * hipW, y: CHARACTER.TORSO_HEIGHT / 2 }, { x: 0, y: -CHARACTER.LEG_HEIGHT / 2 }, 'l_hip');
        this.addJoint(this.limbs.l_upper_leg, this.limbs.l_lower_leg, { x: 0, y: CHARACTER.LEG_HEIGHT / 2 }, { x: 0, y: -CHARACTER.LEG_HEIGHT / 2 }, 'l_knee');
        this.addJoint(this.torso, this.limbs.r_upper_leg, { x: front * hipW, y: CHARACTER.TORSO_HEIGHT / 2 }, { x: 0, y: -CHARACTER.LEG_HEIGHT / 2 }, 'r_hip');
        this.addJoint(this.limbs.r_upper_leg, this.limbs.r_lower_leg, { x: 0, y: CHARACTER.LEG_HEIGHT / 2 }, { x: 0, y: -CHARACTER.LEG_HEIGHT / 2 }, 'r_knee');

        // 3. Create YaoDao
        const swordX = x + front * 50;
        const bladeWidth = CHARACTER.SWORD_WIDTH;
        const bladeHeight = CHARACTER.SWORD_HEIGHT;

        const bladeBase = Matter.Bodies.rectangle(swordX, y + 10, bladeWidth, bladeHeight - 30, { render: { fillStyle: COLORS.SILK }, label: 'blade' });
        const bladeTip = Matter.Bodies.fromVertices(swordX, y - bladeHeight / 2 + 15, [[
            { x: -bladeWidth / 2, y: 15 * front }, { x: bladeWidth / 2, y: 15 * front },
            { x: 15 * front, y: -15 }, { x: -bladeWidth / 2, y: -10 }
        ]], { render: { fillStyle: COLORS.SILK }, label: 'blade' });
        // Correcting vertex mirroring above: front affects X and Y in certain logic but simpler to just scale later if needed.
        // Actually, let's just use manual vertices mirrored by 'front'
        const tipVertices = [
            { x: -front * bladeWidth / 2, y: 15 },
            { x: front * bladeWidth / 2, y: 15 },
            { x: front * 15, y: -15 },
            { x: -front * bladeWidth / 2, y: -10 }
        ];
        Matter.Body.setVertices(bladeTip, tipVertices);
        Matter.Body.setPosition(bladeTip, { x: swordX, y: y - bladeHeight / 2 + 15 });

        const guard = Matter.Bodies.circle(swordX, y + bladeHeight / 2, 14, { render: { fillStyle: COLORS.GOLD }, label: 'guard' });
        const handle = Matter.Bodies.rectangle(swordX, y + bladeHeight / 2 + 14, CHARACTER.SWORD_WIDTH + 2, 28, { render: { fillStyle: COLORS.LACQUER }, label: 'handle' });

        this.sword = Matter.Body.create({
            parts: [bladeBase, bladeTip, guard, handle],
            collisionFilter: { group },
            mass: CHARACTER.YAODAO_MASS,
            label: 'sword'
        });
        Matter.Body.setInertia(this.sword, 80000);

        this.handConstraint = Matter.Constraint.create({
            bodyA: this.limbs.r_lower_arm,
            pointA: { x: 0, y: CHARACTER.ARM_HEIGHT / 2 },
            bodyB: this.sword,
            pointB: { x: 0, y: bladeHeight / 2 + 14 },
            stiffness: 1, length: 0, render: { visible: false }
        });

        Matter.Composite.add(this.composite, [
            this.torso, this.head, ...Object.values(this.limbs),
            this.sword, headband, sash, ...this.constraints, this.handConstraint
        ]);

        Matter.World.add(world, this.composite);
    }

    private createLimb(x: number, y: number, w: number, h: number, group: number, color: string) {
        return Matter.Bodies.rectangle(x, y, w, h, {
            collisionFilter: { group },
            friction: PHYSICS.FRICTION, frictionAir: PHYSICS.FRICTION_AIR,
            render: { fillStyle: color },
            label: 'limb'
        });
    }

    private addJoint(bodyA: Matter.Body, bodyB: Matter.Body, pointA: any, pointB: any, label: string) {
        const constraint = Matter.Constraint.create({
            bodyA, bodyB, pointA, pointB,
            stiffness: 1, damping: PHYSICS.JOINT_DAMPING, length: 0,
            render: { visible: false }, label
        });
        this.constraints.push(constraint);
    }

    public update(input: { left: boolean, right: boolean, jump: boolean, flip: boolean }, mousePos?: { x: number, y: number }, gameTime: number = Date.now()) {
        if (this.isDead) {
            // Even if dead, we should still call applyPDControl to handle the "limp" state decay 
            // if we were applying any stiffness, but here we just return early to prevent movement.
            this.applyPDControl();
            return;
        }
        this.applyPDControl();

        if (mousePos && this.sword) {
            const shoulderX = this.torso.position.x + (this.facingDir * CHARACTER.TORSO_WIDTH / 2);
            const dy = mousePos.y - (this.torso.position.y - 20);
            const dx = mousePos.x - shoulderX;
            const targetAngle = Math.atan2(dy, dx);

            let normalizedTarget = targetAngle - this.torso.angle;
            if (this.facingDir === -1) {
                normalizedTarget = Math.PI - normalizedTarget;
                while (normalizedTarget > Math.PI) normalizedTarget -= Math.PI * 2;
                while (normalizedTarget < -Math.PI) normalizedTarget += Math.PI * 2;
            }

            const baseTarget = Math.max(-1.2, Math.min(2.0, normalizedTarget));
            
            // Only update shoulder target and apply sword torque if NOT stunned
            if (this.stunTimer <= 0) {
                // Shenfa affects responsiveness
                this.targetAngles.r_shoulder += (baseTarget - this.targetAngles.r_shoulder) * (0.2 * this.stiffnessMultiplier);
                
                this.targetAngles.r_elbow = -0.1;

                let angleError = (targetAngle + Math.PI / 2) - this.sword.angle;
                while (angleError > Math.PI) angleError -= Math.PI * 2;
                while (angleError < -Math.PI) angleError += Math.PI * 2;

                // Bili increases grip strength (torque limit)
                const torqueLimit = 4.0 * this.damageMultiplier; 
                this.sword.torque += Math.max(-torqueLimit, Math.min(torqueLimit, angleError * 1.5 - this.sword.angularVelocity * 0.25));
            } else {
                // When stunned, allow limbs to follow momentum more freely
                this.targetAngles.r_shoulder += (baseTarget - this.targetAngles.r_shoulder) * 0.02; // Very slow drift
            }
        }

        if (input.left || input.right) {
            // Animation speed scales with movement multiplier
            const time = gameTime * 0.01 * (1 + (this.moveMultiplier - 1) * 0.5);
            const walkSpeed = 0.8;
            this.targetAngles.l_hip = Math.sin(time) * walkSpeed;
            this.targetAngles.r_hip = -Math.sin(time) * walkSpeed;
            this.targetAngles.l_knee = Math.max(0, Math.sin(time + Math.PI / 2)) * walkSpeed;
            this.targetAngles.r_knee = Math.max(0, -Math.sin(time + Math.PI / 2)) * walkSpeed;
            // Apply force at the leg level
            const forcePos = { x: this.torso.position.x, y: this.torso.position.y + CHARACTER.TORSO_HEIGHT / 2 + 40 };
            const runForce = 0.004 * this.moveMultiplier;
            Matter.Body.applyForce(this.torso, forcePos, { x: input.right ? runForce : -runForce, y: 0 });
        } else {
            this.targetAngles.l_hip = 0.1; this.targetAngles.r_hip = -0.1;
            this.targetAngles.l_knee = 0.2; this.targetAngles.r_knee = -0.2;
        }

        const bodies = Matter.Composite.allBodies(this.world).filter(b => !Matter.Composite.allBodies(this.composite).includes(b));
        if (input.jump && (Matter.Query.collides(this.limbs.l_lower_leg, bodies).length > 0 || Matter.Query.collides(this.limbs.r_lower_leg, bodies).length > 0)) {
            const jumpForce = 0.15 * this.moveMultiplier;
            Matter.Body.applyForce(this.torso, this.torso.position, { x: 0, y: -jumpForce });
            this.targetAngles.l_hip = -0.5; this.targetAngles.r_hip = 0.5;
            this.targetAngles.l_knee = 1.5; this.targetAngles.r_knee = 1.5;
        }

        // 1. Balance Control (Torso stabilization) - scale with moveMultiplier to keep upright
        const angleErr = 0 - this.torso.angle;
        // Increase balance force proportionally to movement power
        const balanceK = PHYSICS.TORSO_K * this.moveMultiplier;
        const balanceD = PHYSICS.TORSO_D * Math.sqrt(this.moveMultiplier);
        this.torso.torque += angleErr * balanceK - this.torso.angularVelocity * balanceD;
    }

    private applyPDControl() {
        if (this.isDead) return; // Go completely limp when dead

        const isStunned = this.stunTimer > 0;
        const stiffness = (isStunned ? PHYSICS.PD_K * 0.5 : PHYSICS.PD_K) * this.stiffnessMultiplier;
        const damping = (isStunned ? PHYSICS.PD_D * 0.2 : PHYSICS.PD_D) * this.stiffnessMultiplier;

        this.constraints.forEach(c => {
            if (!c.label) return;
            const currentAngle = c.bodyB!.angle - c.bodyA!.angle;
            const target = (this.targetAngles[c.label] || 0) * this.facingDir;
            const torque = (target - currentAngle) * (stiffness * 10) - (c.bodyB!.angularVelocity - c.bodyA!.angularVelocity) * (damping * 5);
            const limited = Math.max(-0.3, Math.min(0.3, torque));
            c.bodyB!.torque += limited; c.bodyA!.torque -= limited;
        });

        if (this.stunTimer > 0) this.stunTimer--;
    }

    public destroy() {
        Matter.World.remove(this.world, this.composite);
    }

    public getPhysicalState() {
        return {
            position: { ...this.torso.position },
            velocity: { ...this.torso.velocity },
            angularVelocity: this.torso.angularVelocity,
            angle: this.torso.angle,
            hp: this.hp,
            maxHp: this.maxHp,
            damageMultiplier: this.damageMultiplier
        };
    }

    public applyPhysicalState(state: any) {
        Matter.Body.setPosition(this.torso, state.position);
        Matter.Body.setVelocity(this.torso, state.velocity);
        Matter.Body.setAngle(this.torso, state.angle);
        Matter.Body.setAngularVelocity(this.torso, state.angularVelocity);
        this.hp = state.hp ?? this.hp;
        this.maxHp = state.maxHp ?? this.maxHp;
        this.damageMultiplier = state.damageMultiplier ?? this.damageMultiplier;
    }

    public takeDamage(amount: number, gameTime: number = Date.now()) {
        if (this.isDead) return;
        this.hp = Math.max(0, this.hp - amount);
        if (this.hp <= 0) {
            this.isDead = true;
            this.deathTime = gameTime;
            if (this.handConstraint) {
                Matter.Composite.remove(this.composite, this.handConstraint);
                this.handConstraint = undefined;
            }
        }
    }
}
