import Matter from 'matter-js';
import { COLORS, CHARACTER, PHYSICS } from './Constants';

export class Character {
    public torso: Matter.Body;
    public head: Matter.Body;
    public sword?: Matter.Body;
    public facingDir: number = 1; // 1 for Right, -1 for Left
    public limbs: { [key: string]: Matter.Body } = {};
    public constraints: Matter.Constraint[] = [];
    private world: Matter.World;
    private wasFlipKeyPressed: boolean = false;
    
    // Target angles for PD control
    private targetAngles: { [key: string]: number } = {
        neck: 0,
        l_shoulder: 0.2,
        r_shoulder: -0.2,
        l_elbow: 0.5,
        r_elbow: -0.5,
        l_hip: 0.1,
        r_hip: -0.1,
        l_knee: 0.2,
        r_knee: -0.2,
    };
    public composite: Matter.Composite;

    constructor(x: number, y: number, world: Matter.World, options: { primaryColor: string, farColor: string, collisionGroup: number }) {
        this.world = world;
        this.composite = Matter.Composite.create({ label: 'Character' });
        
        // 1. Create Parts
        const group = options.collisionGroup;

        this.torso = Matter.Bodies.rectangle(x, y, CHARACTER.TORSO_WIDTH, CHARACTER.TORSO_HEIGHT, {
            collisionFilter: { group },
            friction: PHYSICS.FRICTION,
            frictionAir: PHYSICS.FRICTION_AIR,
            render: { fillStyle: options.primaryColor }
        });
        
        this.head = Matter.Bodies.circle(x, y - CHARACTER.TORSO_HEIGHT/2 - CHARACTER.HEAD_RADIUS, CHARACTER.HEAD_RADIUS, {
            collisionFilter: { group },
            frictionAir: PHYSICS.FRICTION_AIR,
            render: { fillStyle: COLORS.SILK }
        });

        // 1.5. Visual Details (Headband & Sash)
        const headband = Matter.Bodies.rectangle(x, y - CHARACTER.TORSO_HEIGHT/2 - CHARACTER.HEAD_RADIUS, CHARACTER.HEAD_RADIUS * 2.2, 4, {
            collisionFilter: { group },
            render: { fillStyle: COLORS.LACQUER }
        });
        
        const sash = Matter.Bodies.rectangle(x, y, CHARACTER.TORSO_WIDTH + 2, 8, {
            collisionFilter: { group },
            angle: Math.PI / 4,
            render: { fillStyle: COLORS.GOLD }
        });

        // Arms & Legs - Differentiate colors for "Near" and "Far" side
        const farColor = options.farColor; 
        this.limbs.l_upper_arm = this.createLimb(x - CHARACTER.TORSO_WIDTH/2, y - 20, CHARACTER.ARM_WIDTH, CHARACTER.ARM_HEIGHT, group, farColor);
        this.limbs.l_lower_arm = this.createLimb(x - CHARACTER.TORSO_WIDTH/2, y + 10, CHARACTER.ARM_WIDTH, CHARACTER.ARM_HEIGHT, group, farColor);
        this.limbs.r_upper_arm = this.createLimb(x + CHARACTER.TORSO_WIDTH/2, y - 20, CHARACTER.ARM_WIDTH, CHARACTER.ARM_HEIGHT, group, options.primaryColor);
        this.limbs.r_lower_arm = this.createLimb(x + CHARACTER.TORSO_WIDTH/2, y + 10, CHARACTER.ARM_WIDTH, CHARACTER.ARM_HEIGHT, group, options.primaryColor);

        this.limbs.l_upper_leg = this.createLimb(x - 10, y + CHARACTER.TORSO_HEIGHT/2, CHARACTER.LEG_WIDTH, CHARACTER.LEG_HEIGHT, group, farColor);
        this.limbs.l_lower_leg = this.createLimb(x - 10, y + CHARACTER.TORSO_HEIGHT/2 + 40, CHARACTER.LEG_WIDTH, CHARACTER.LEG_HEIGHT, group, farColor);
        this.limbs.r_upper_leg = this.createLimb(x + 10, y + CHARACTER.TORSO_HEIGHT/2, CHARACTER.LEG_WIDTH, CHARACTER.LEG_HEIGHT, group, options.primaryColor);
        this.limbs.r_lower_leg = this.createLimb(x + 10, y + CHARACTER.TORSO_HEIGHT/2 + 40, CHARACTER.LEG_WIDTH, CHARACTER.LEG_HEIGHT, group, options.primaryColor);

        // 2. Constraints (Joints)
        this.addJoint(this.torso, this.head, { x: 0, y: -CHARACTER.TORSO_HEIGHT/2 }, { x: 0, y: CHARACTER.HEAD_RADIUS }, 'neck');
        
        // Attach visual details
        Matter.Composite.add(this.composite, [
            Matter.Constraint.create({ bodyA: this.head, bodyB: headband, stiffness: 1, length: 0, render: { visible: false } }),
            Matter.Constraint.create({ bodyA: this.torso, bodyB: sash, stiffness: 1, length: 0, render: { visible: false } })
        ]);
        
        this.addJoint(this.torso, this.limbs.l_upper_arm, { x: -CHARACTER.TORSO_WIDTH/2, y: -20 }, { x: 0, y: -CHARACTER.ARM_HEIGHT/2 }, 'l_shoulder');
        this.addJoint(this.limbs.l_upper_arm, this.limbs.l_lower_arm, { x: 0, y: CHARACTER.ARM_HEIGHT/2 }, { x: 0, y: -CHARACTER.ARM_HEIGHT/2 }, 'l_elbow');
        
        this.addJoint(this.torso, this.limbs.r_upper_arm, { x: CHARACTER.TORSO_WIDTH/2, y: -20 }, { x: 0, y: -CHARACTER.ARM_HEIGHT/2 }, 'r_shoulder');
        this.addJoint(this.limbs.r_upper_arm, this.limbs.r_lower_arm, { x: 0, y: CHARACTER.ARM_HEIGHT/2 }, { x: 0, y: -CHARACTER.ARM_HEIGHT/2 }, 'r_elbow');

        this.addJoint(this.torso, this.limbs.l_upper_leg, { x: -10, y: CHARACTER.TORSO_HEIGHT/2 }, { x: 0, y: -CHARACTER.LEG_HEIGHT/2 }, 'l_hip');
        this.addJoint(this.limbs.l_upper_leg, this.limbs.l_lower_leg, { x: 0, y: CHARACTER.LEG_HEIGHT/2 }, { x: 0, y: -CHARACTER.LEG_HEIGHT/2 }, 'l_knee');
        
        this.addJoint(this.torso, this.limbs.r_upper_leg, { x: 10, y: CHARACTER.TORSO_HEIGHT/2 }, { x: 0, y: -CHARACTER.LEG_HEIGHT/2 }, 'r_hip');
        this.addJoint(this.limbs.r_upper_leg, this.limbs.r_lower_leg, { x: 0, y: CHARACTER.LEG_HEIGHT/2 }, { x: 0, y: -CHARACTER.LEG_HEIGHT/2 }, 'r_knee');

        // 3. Create Fine YaoDao (Ming Sabre) - Compound Body
        const bladeWidth = CHARACTER.SWORD_WIDTH;
        const bladeHeight = CHARACTER.SWORD_HEIGHT;
        
        // Blade Base (Straight part)
        const bladeBase = Matter.Bodies.rectangle(x + 50, y + 10, bladeWidth, bladeHeight - 30, {
            render: { fillStyle: COLORS.SILK },
            restitution: 0,
            friction: 1
        });

        // Blade Tip (Triangular/Pointed part)
        const bladeTip = Matter.Bodies.fromVertices(x + 50, y - bladeHeight/2 + 15, [[
            { x: -bladeWidth / 2, y: 15 },
            { x: bladeWidth / 2, y: 15 },
            { x: 15, y: -15 }, // Sharp curved tip
            { x: -bladeWidth / 2, y: -10 }
        ]], {
            render: { fillStyle: COLORS.SILK },
            restitution: 0,
            friction: 1
        });

        // Disc Guard (镡) typical for YaoDao
        const guard = Matter.Bodies.circle(x + 50, y + bladeHeight / 2, 14, {
            render: { fillStyle: COLORS.GOLD },
            restitution: 0
        });

        const handle = Matter.Bodies.rectangle(x + 50, y + bladeHeight / 2 + 14, CHARACTER.SWORD_WIDTH + 2, 28, {
            render: { fillStyle: COLORS.LACQUER },
            restitution: 0
        });

        this.sword = Matter.Body.create({
            parts: [bladeBase, bladeTip, guard, handle],
            collisionFilter: { group },
            friction: 1,
            restitution: 0,
            mass: CHARACTER.YAODAO_MASS
        });

        // Set high inertia to prevent "twitching"
        Matter.Body.setInertia(this.sword, 80000); 

        const handConstraint = Matter.Constraint.create({
            bodyA: this.limbs.r_lower_arm,
            pointA: { x: 0, y: CHARACTER.ARM_HEIGHT / 2 },
            bodyB: this.sword,
            pointB: { x: 0, y: bladeHeight / 2 + 14 }, 
            stiffness: 1,
            length: 0,
            render: { visible: false }
        });

        Matter.Composite.add(this.composite, [
            this.torso, this.head,
            ...Object.values(this.limbs),
            this.sword,
            headband,
            sash,
            ...this.constraints,
            handConstraint
        ]);
        
        Matter.World.add(world, this.composite);
    }

    private createLimb(x: number, y: number, w: number, h: number, group: number, color: string) {
        return Matter.Bodies.rectangle(x, y, w, h, {
            collisionFilter: { group },
            friction: PHYSICS.FRICTION,
            frictionAir: PHYSICS.FRICTION_AIR,
            render: { fillStyle: color }
        });
    }

    private addJoint(bodyA: Matter.Body, bodyB: Matter.Body, pointA: any, pointB: any, label: string) {
        const constraint = Matter.Constraint.create({
            bodyA, bodyB, pointA, pointB,
            stiffness: 1, 
            damping: PHYSICS.JOINT_DAMPING,
            length: 0,
            render: { visible: false },
            label
        });
        this.constraints.push(constraint);
    }

    public update(input: { left: boolean, right: boolean, jump: boolean, flip: boolean }, mousePos?: { x: number, y: number }) {
        this.applyPDControl();
        
        // Handle Orientation Flip (Toggle on Rising Edge)
        if (input.flip && !this.wasFlipKeyPressed) {
            this.facingDir *= -1;
            console.log('Orientation Flipped (Paper Cutout Style):', this.facingDir > 0 ? 'Right' : 'Left');
        }
        this.wasFlipKeyPressed = input.flip;

        // --- COMBAT TARGETING (Direct Physics Guiding) ---
        // Logic always assumes Facing Right. Game.ts will mirror mousePos for us.
        if (mousePos && this.sword) {
            // 1. Position the arm generally toward the mouse
            const dy = mousePos.y - (this.torso.position.y - 20);
            const dx = mousePos.x - (this.torso.position.x + CHARACTER.TORSO_WIDTH/2);
            const targetAngle = Math.atan2(dy, dx);
            
            // Limit arm target to prevent twisting
            const relativeArmAngle = Math.max(-1.2, Math.min(2.0, targetAngle - this.torso.angle));
            this.targetAngles.r_shoulder += (relativeArmAngle - this.targetAngles.r_shoulder) * 0.15;
            this.targetAngles.r_elbow = -0.1;

            // 2. Apply "Invisible Force" (Torque) directly to the sword
            const currentSwordAngle = this.sword.angle;
            const swordTargetAngle = targetAngle + Math.PI/2;
            
            let angleError = swordTargetAngle - currentSwordAngle;
            while (angleError > Math.PI) angleError -= Math.PI * 2;
            while (angleError < -Math.PI) angleError += Math.PI * 2;

            const guideTorque = angleError * 0.6 - this.sword.angularVelocity * 0.15;
            const maxGuideTorque = 1.2;
            this.sword.torque += Math.max(-maxGuideTorque, Math.min(maxGuideTorque, guideTorque));
        }
        
        // Handle Walking
        if (input.left || input.right) {
            const time = Date.now() * 0.01;
            const walkSpeed = 0.8;
            this.targetAngles.l_hip = Math.sin(time) * walkSpeed;
            this.targetAngles.r_hip = -Math.sin(time) * walkSpeed;
            this.targetAngles.l_knee = Math.max(0, Math.sin(time + Math.PI/2)) * walkSpeed;
            this.targetAngles.r_knee = Math.max(0, -Math.sin(time + Math.PI/2)) * walkSpeed;
            
            const force = input.right ? 0.002 : -0.002;
            Matter.Body.applyForce(this.torso, this.torso.position, { x: force, y: 0 });
        } else {
            // Reset to Idle
            this.targetAngles.l_hip = 0.1;
            this.targetAngles.r_hip = -0.1;
            this.targetAngles.l_knee = 0.2;
            this.targetAngles.r_knee = -0.2;
        }

        const ground = this.world.bodies.find(b => b.isStatic);
        const isGrounded = ground ? (
            Matter.Query.collides(this.limbs.l_lower_leg, [ground]).length > 0 ||
            Matter.Query.collides(this.limbs.r_lower_leg, [ground]).length > 0
        ) : false;

        if (input.jump && isGrounded) {
            // Stronger jump impulse
            Matter.Body.applyForce(this.torso, this.torso.position, { x: 0, y: -0.15 });
            
            // "Solid" jump tuck pose
            this.targetAngles.l_hip = -0.5;
            this.targetAngles.r_hip = 0.5;
            this.targetAngles.l_knee = 1.5;
            this.targetAngles.r_knee = 1.5;
        }
        
        // Keep torso upright - Strengthened recovery
        const uprightTorque = -this.torso.angle * 0.8 - this.torso.angularVelocity * 0.15;
        const maxTorque = 0.8;
        this.torso.torque = Math.max(-maxTorque, Math.min(maxTorque, uprightTorque));
    }

    private applyPDControl() {
        // For each joint constraint, we apply torque to the child body relative to parent
        this.constraints.forEach(c => {
            if (!c.label) return;
            const bodyA = c.bodyA!;
            const bodyB = c.bodyB!;
            
            const currentAngle = bodyB.angle - bodyA.angle;
            const target = this.targetAngles[c.label] || 0;
            
            const error = target - currentAngle;
            const derivative = - (bodyB.angularVelocity - bodyA.angularVelocity);
            
            // Moderated gains and torque limiting
            const torque = error * (PHYSICS.PD_K * 10) + derivative * (PHYSICS.PD_D * 5);
            const jointMaxTorque = 0.3;
            const limitedTorque = Math.max(-jointMaxTorque, Math.min(jointMaxTorque, torque));
            
            bodyB.torque += limitedTorque;
            bodyA.torque -= limitedTorque; 
        });
    }
}
