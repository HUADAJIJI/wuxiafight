import Matter from 'matter-js';

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
    parentBody?: Matter.Body;
    localPos?: { x: number, y: number };
    isStatic?: boolean; // For ground blood
    gravityScale?: number;
}

export class ParticleSystem {
    public particles: Particle[] = [];
    private maxParticles: number = 800; // Limit for performance

    public spawn(x: number, y: number, color: string, count: number, speedScale: number = 1, attachedBody?: Matter.Body) {
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) this.particles.shift();

            const angle = Math.random() * Math.PI * 2;
            const speed = (Math.random() * 2 + 1) * speedScale;
            const life = 500 + Math.random() * 200; // ~10 seconds

            const p: Particle = {
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                life,
                maxLife: life,
                color,
                size: Math.random() * 3 + 1
            };

            // Chance to stick immediately to the body
            if (attachedBody && Math.random() < 0.4) {
                p.parentBody = attachedBody;
                const dx = x - attachedBody.position.x;
                const dy = y - attachedBody.position.y;
                const cos = Math.cos(-attachedBody.angle);
                const sin = Math.sin(-attachedBody.angle);
                p.localPos = {
                    x: dx * cos - dy * sin,
                    y: dx * sin + dy * cos
                };
            }

            this.particles.push(p);
        }
    }

    public update(groundY: number) {

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            if (p.parentBody) {
                // Follow body
                const b = p.parentBody;
                const lp = p.localPos!;
                p.x = b.position.x + lp.x * Math.cos(b.angle) - lp.y * Math.sin(b.angle);
                p.y = b.position.y + lp.x * Math.sin(b.angle) + lp.y * Math.cos(b.angle);
            } else if (!p.isStatic) {
                // Fly
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.15 * (p.gravityScale ?? 1.0); // Gravity
                p.vx *= 0.98; // Friction

                // Ground hit
                if (p.y > groundY - p.size) {
                    p.y = groundY - p.size;
                    p.isStatic = true;
                    p.vx = 0; p.vy = 0;
                    p.size *= 1.5; // Flatten/Spread
                }
            }

            p.life--;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        this.particles.forEach(p => {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        });
        ctx.globalAlpha = 1.0;
    }
}
