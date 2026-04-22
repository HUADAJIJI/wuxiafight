import { COLORS } from './Constants';
import { audioManager } from './Audio';

interface LayerOptions {
    speed: number;
    color: string;
    yOffset: number;
    height: number;
    opacity: number;
    amplitude: number;
    frequency: number;
}

class ParallaxLayer {
    private points: number[] = [];
    private width: number;
    private options: LayerOptions;
    private seed: number;

    constructor(width: number, options: LayerOptions) {
        this.width = width;
        this.options = options;
        this.seed = Math.random() * 1000;
        this.generatePoints();
    }

    private generatePoints() {
        const segments = 100;
        const step = this.width / segments;
        
        // Start and end at same height for seamless looping
        const startHeight = Math.random() * this.options.amplitude;
        
        for (let i = 0; i <= segments; i++) {
            if (i === 0 || i === segments) {
                this.points.push(startHeight);
            } else {
                // Perlin-like noise simplified
                const val = (Math.sin(i * this.options.frequency + this.seed) + Math.sin(i * this.options.frequency * 2.5 + this.seed)) * 0.5;
                this.points.push(val * this.options.amplitude);
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D, cameraX: number, canvasHeight: number) {
        const scrollX = -(cameraX * this.options.speed) % this.width;
        
        ctx.save();
        ctx.globalAlpha = this.options.opacity;
        ctx.fillStyle = this.options.color;

        // Draw twice for seamless looping
        this.drawShape(ctx, scrollX, canvasHeight);
        this.drawShape(ctx, scrollX + this.width, canvasHeight);
        if (scrollX > 0) {
            this.drawShape(ctx, scrollX - this.width, canvasHeight);
        }

        ctx.restore();
    }

    private drawPineTree(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
        ctx.save();
        ctx.translate(x, y);
        
        // Trunk
        ctx.fillStyle = 'rgba(20, 10, 0, 0.7)';
        ctx.fillRect(-scale * 0.1, -scale * 0.5, scale * 0.2, scale * 0.5);
        
        // Branches
        ctx.fillStyle = this.options.color;
        for (let i = 0; i < 3; i++) {
            const bW = scale * (1 - i * 0.2);
            const bH = scale * 0.4;
            ctx.beginPath();
            ctx.moveTo(0, -scale * 1.2 + i * scale * 0.3);
            ctx.lineTo(-bW, -scale * 0.5 + i * scale * 0.3);
            ctx.lineTo(bW, -scale * 0.5 + i * scale * 0.3);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
    }

    private drawCypressTree(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
        ctx.save();
        ctx.translate(x, y);
        
        // Trunk
        ctx.fillStyle = 'rgba(20, 10, 0, 0.6)';
        ctx.fillRect(-scale * 0.05, -scale * 0.2, scale * 0.1, scale * 0.2);
        
        // Foliage (Columnar/Flame shape for Cypress)
        ctx.fillStyle = this.options.color;
        ctx.beginPath();
        ctx.moveTo(0, -scale * 1.6);
        ctx.quadraticCurveTo(scale * 0.5, -scale * 0.8, 0, 0);
        ctx.quadraticCurveTo(-scale * 0.5, -scale * 0.8, 0, -scale * 1.6);
        ctx.fill();
        
        // Add some "flame" texture
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(0, -scale * 1.2);
        ctx.lineTo(scale * 0.2, -scale * 0.6);
        ctx.lineTo(-scale * 0.2, -scale * 0.6);
        ctx.fill();
        
        ctx.restore();
    }

    private drawShape(ctx: CanvasRenderingContext2D, offsetX: number, canvasHeight: number) {
        const segments = this.points.length - 1;
        const step = this.width / segments;
        const baseY = this.options.yOffset;

        ctx.beginPath();
        ctx.moveTo(offsetX, canvasHeight);
        ctx.lineTo(offsetX, baseY + this.points[0]);

        for (let i = 1; i <= segments; i++) {
            const x = offsetX + i * step;
            const y = baseY + this.points[i];
            ctx.lineTo(x, y);
        }

        ctx.lineTo(offsetX + this.width, canvasHeight);
        ctx.closePath();
        ctx.fill();
        
        // Add dense trees on ridges
        // We only add trees to layers that are dark enough (nearer hills)
        if (this.options.speed > 0.3) {
            for (let i = 0; i < segments; i++) {
                // Determine deterministic density based on position and seed
                const posSeed = Math.sin(i * 0.5 + this.seed) * 10000;
                const density = (posSeed - Math.floor(posSeed)); 
                
                if (density > 0.4) { // High density
                    const tx = offsetX + i * step;
                    const ty = baseY + this.points[i];
                    // Vary scale based on i and seed
                    const scale = 10 + (Math.sin(i + this.seed) * 0.5 + 0.5) * 20;
                    
                    // Randomly choose between Pine and Cypress
                    if ((Math.sin(i * 1.2 + this.seed) * 1000) % 1 > 0.5) {
                        this.drawPineTree(ctx, tx, ty, scale);
                    } else {
                        this.drawCypressTree(ctx, tx, ty, scale);
                    }
                }
            }
        }
        
        // Add "Ink Wash" top border
        ctx.strokeStyle = this.options.color;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

class Bamboo {
    private x: number;
    private height: number;
    private width: number;
    private segments: number;
    private phase: number;
    private stiffness: number;
    private color: string;
    private leafPositions: { segment: number, side: number, angle: number, phase: number }[] = [];

    constructor(x: number, maxHeight: number) {
        this.x = x;
        this.height = 200 + Math.random() * maxHeight; // Increased base height
        this.width = 4 + Math.random() * 5; // Slightly thicker
        this.segments = 6 + Math.floor(Math.random() * 5); // More segments for taller bamboo
        this.phase = Math.random() * Math.PI * 2;
        this.stiffness = 0.6 + Math.random() * 0.4; // Slightly stiffer for height
        
        const greens = ['#2D4F3C', '#1E3D2F', '#3E5C4A', '#264032'];
        this.color = greens[Math.floor(Math.random() * greens.length)];

        const leafStartSegment = Math.floor(this.segments * 0.4);
        for (let i = leafStartSegment; i < this.segments; i++) {
            const density = (i / this.segments) * 0.8; 
            const leafCount = Math.random() < density ? 2 : 1;
            for (let j = 0; j < leafCount; j++) {
                this.leafPositions.push({
                    segment: i,
                    side: Math.random() > 0.5 ? 1 : -1,
                    angle: (Math.random() - 0.5) * 0.6,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D, offsetX: number, baseY: number, time: number, globalWind: number) {
        const localX = this.x + offsetX;
        const windOffset = Math.sin(time * 0.0004 - localX * 0.002 + this.phase) * 0.02;
        const totalWind = globalWind + windOffset;
        const sway = totalWind * this.stiffness;
        const x = this.x + offsetX;
        
        ctx.save();
        ctx.translate(x, baseY);
        const segHeight = this.height / this.segments;
        
        for (let i = 0; i < this.segments; i++) {
            ctx.rotate(sway);
            ctx.fillStyle = this.color;
            const w = this.width * (1 - (i / this.segments) * 0.3);
            ctx.fillRect(-w / 2, -segHeight + 2, w, segHeight - 4);
            
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(-w * 0.65, -segHeight, w * 1.3, 3);
            ctx.fillStyle = this.color;
            ctx.fillRect(-w * 0.6, -segHeight + 1, w * 1.2, 1);

            this.leafPositions.filter(l => l.segment === i).forEach(l => {
                this.drawBranch(ctx, l.side * w / 2, -segHeight, l.side, totalWind);
                this.drawLeaf(ctx, l.side * w / 2 + l.side * 5, -segHeight - 5, l.side, l.angle, l.phase, time, totalWind);
            });

            ctx.translate(0, -segHeight);
        }
        ctx.restore();
    }

    private drawBranch(ctx: CanvasRenderingContext2D, x: number, y: number, side: number, totalWind: number) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(side * 0.8 + totalWind * 4);
        ctx.fillStyle = this.color;
        ctx.fillRect(0, -1, side * 10, 2);
        ctx.restore();
    }

    private drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, side: number, baseAngle: number, leafPhase: number, time: number, totalWind: number) {
        ctx.save();
        ctx.translate(x, y);
        const leafJitter = Math.sin(time * 0.002 + leafPhase) * 0.05;
        const windAlignment = -side * totalWind * 12.0;
        ctx.rotate(side * (0.6 + baseAngle) + leafJitter + windAlignment);
        const stretch = 1 + Math.abs(totalWind) * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(side * 15 * stretch, 5, side * 25 * stretch, 0);
        ctx.quadraticCurveTo(side * 15 * stretch, -5, 0, 0);
        ctx.fill();
        ctx.restore();
    }
}

class BambooLayer {
    private bamboos: Bamboo[] = [];
    private width: number;
    private speed: number;
    private opacity: number;

    constructor(width: number, speed: number, count: number, maxHeight: number, opacity: number = 1) {
        this.width = width;
        this.speed = speed;
        this.opacity = opacity;
        
        // Create clustered distribution (疏密有致)
        const clusters = 4;
        for (let i = 0; i < count; i++) {
            let x;
            if (Math.random() < 0.7) { // 70% chance to be in a cluster
                const clusterCenter = (Math.floor(Math.random() * clusters) / clusters) * width;
                x = (clusterCenter + (Math.random() - 0.5) * 200 + width) % width;
            } else {
                x = Math.random() * width;
            }
            this.bamboos.push(new Bamboo(x, maxHeight));
        }
    }

    public getBamboos() { return this.bamboos; }
    public getWidth() { return this.width; }

    draw(ctx: CanvasRenderingContext2D, cameraX: number, baseY: number, time: number, globalWind: number) {
        const scrollX = -(cameraX * this.speed) % this.width;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        this.drawSet(ctx, scrollX, baseY, time, globalWind);
        this.drawSet(ctx, scrollX + this.width, baseY, time, globalWind);
        if (scrollX > 0) {
            this.drawSet(ctx, scrollX - this.width, baseY, time, globalWind);
        }
        ctx.restore();
    }

    private drawSet(ctx: CanvasRenderingContext2D, offsetX: number, baseY: number, time: number, globalWind: number) {
        this.bamboos.forEach(b => b.draw(ctx, offsetX, baseY, time, globalWind));
    }
}

class GrassBlade {
    x: number;
    height: number;
    bend: number = 0;
    targetBend: number = 0;
    phase: number;

    constructor(x: number) {
        this.x = x;
        this.height = 15 + Math.random() * 20; // Increased height from 8-20 to 15-35
        this.phase = Math.random() * Math.PI * 2;
    }

    update(entities: { x: number, width: number }[], time: number, scrollX: number) {
        this.targetBend = Math.sin(time * 0.002 + this.phase) * 0.1; // Idle sway
        
        // Use world position (scrollX + local x) to check interaction with world entities
        const worldX = scrollX + this.x;
        
        for (const e of entities) {
            const dist = worldX - e.x;
            const absDist = Math.abs(dist);
            if (absDist < 50) { // Increased sensing range
                const dir = Math.sign(dist);
                const power = (1 - absDist / 50) * 1.5;
                this.targetBend += dir * power;
            }
        }
        this.bend += (this.targetBend - this.bend) * 0.15;
    }

    draw(ctx: CanvasRenderingContext2D, scrollX: number, baseY: number) {
        const x = scrollX + this.x;
        ctx.save();
        
        // Draw a small cluster of 3 blades per point
        for (let i = 0; i < 3; i++) {
            const offsetX = (i - 1) * 3;
            const h = this.height * (0.8 + i * 0.1);
            
            ctx.beginPath();
            ctx.moveTo(x + offsetX, baseY);
            
            const localBend = this.bend + (i - 1) * 0.1;
            const topX = x + offsetX + localBend * 25; // Increased bend horizontal multiplier
            const topY = baseY - h;
            
            ctx.quadraticCurveTo(x + offsetX + localBend * 10, baseY - h * 0.5, topX, topY);
            ctx.stroke();
        }
        ctx.restore();
    }
}

class GrassLayer {
    private blades: GrassBlade[] = [];
    private width: number;

    constructor(width: number, count: number) {
        this.width = width;
        for (let i = 0; i < count; i++) {
            this.blades.push(new GrassBlade(Math.random() * width));
        }
    }

    draw(ctx: CanvasRenderingContext2D, cameraX: number, baseY: number, entities: { x: number, width: number }[], time: number) {
        // Fix: Since we are drawing INSIDE a translated context (-cameraX), 
        // we only need to handle the tiling base position.
        const baseScrollX = Math.floor(cameraX / this.width) * this.width;
        
        ctx.save();
        ctx.strokeStyle = '#1E3D2F'; // Darker, richer green
        ctx.lineWidth = 2.0;
        ctx.lineCap = 'round';

        // Draw multiple sets for looping based on the baseScrollX
        this.drawSet(ctx, baseScrollX, baseY, entities, time, cameraX);
        this.drawSet(ctx, baseScrollX + this.width, baseY, entities, time, cameraX);
        this.drawSet(ctx, baseScrollX - this.width, baseY, entities, time, cameraX);
        
        ctx.restore();
    }

    private drawSet(ctx: CanvasRenderingContext2D, scrollX: number, baseY: number, entities: { x: number, width: number }[], time: number, cameraX: number) {
        this.blades.forEach(b => {
            // Correct Visibility Check: In a translated context, the visible range is [cameraX, cameraX + width]
            const x = scrollX + b.x;
            if (x > cameraX - 100 && x < cameraX + ctx.canvas.width + 100) {
                b.update(entities, time, scrollX);
                b.draw(ctx, scrollX, baseY);
            }
        });
    }
}

export class BackgroundManager {
    private layers: ParallaxLayer[] = [];
    private bambooLayers: BambooLayer[] = [];
    private grassLayer: GrassLayer;
    private dustMotes: {x: number, y: number, speedX: number, speedY: number, size: number, phase: number}[] = [];
    private currentCameraX: number = 0;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private startTime: number = Date.now();

    constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
        this.canvas = canvas;
        this.ctx = ctx;

        this.layers.push(new ParallaxLayer(2000, {
            speed: 0.1,
            color: '#D2C4A3',
            yOffset: 300,
            height: 150,
            opacity: 0.6,
            amplitude: 100,
            frequency: 0.1
        }));

        this.layers.push(new ParallaxLayer(1800, {
            speed: 0.25,
            color: '#A89B7A',
            yOffset: 400,
            height: 200,
            opacity: 0.8,
            amplitude: 80,
            frequency: 0.15
        }));

        this.layers.push(new ParallaxLayer(1500, {
            speed: 0.5,
            color: '#4A5D4E',
            yOffset: 550,
            height: 100,
            opacity: 1.0,
            amplitude: 40,
            frequency: 0.2
        }));

        // Foreground Bamboo (Increased height and clustered density)
        // Back Bamboo (More dense clusters)
        this.bambooLayers.push(new BambooLayer(1200, 0.7, 60, 450, 0.6));
        // Front Bamboo (Taller, very dense clusters)
        this.bambooLayers.push(new BambooLayer(1000, 1.0, 50, 550, 1.0));
        
        // Interactive Grass
        this.grassLayer = new GrassLayer(1000, 150);

        // Initialize Atmospheric Dust
        for (let i = 0; i < 30; i++) {
            this.dustMotes.push({
                x: Math.random() * 1000,
                y: Math.random() * 600,
                speedX: (Math.random() - 0.5) * 0.2,
                speedY: (Math.random() - 0.5) * 0.2,
                size: 0.5 + Math.random() * 1.5,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    draw(cameraX: number) {
        this.currentCameraX = cameraX; // Store for density checks
        const time = Date.now() - this.startTime;
        const baseBreeze = Math.sin(time * 0.0005) * 0.01;
        const gust = Math.max(0, Math.sin(time * 0.0002) * 2 - 1.2) * 0.08;
        const turbulence = Math.sin(time * 0.0003) * 0.01;
        const globalWind = baseBreeze + gust + turbulence;

        audioManager.updateWind(globalWind);
        this.drawMist();
        this.layers.forEach(layer => layer.draw(this.ctx, cameraX, this.canvas.height));
        
        const groundY = this.canvas.height - 100;
        this.bambooLayers.forEach(layer => layer.draw(this.ctx, cameraX, groundY + 50, time, globalWind));
    }

    drawForeground(cameraX: number, entities: { x: number, width: number }[] = []) {
        const time = Date.now() - this.startTime;
        const groundY = this.canvas.height - 100;

        // Draw Interactive Grass (In front of characters)
        this.grassLayer.draw(this.ctx, cameraX, groundY, entities, time);
    }

    public drawOverlay() {
        // Draw Light and Dust in screen space for constant atmosphere
        this.drawGodRays(this.currentCameraX);
        this.drawDustMotes();
    }

    private getBambooDensity(worldX: number) {
        let density = 0;
        // Check both layers, but front layer has more weight
        this.bambooLayers.forEach((layer, idx) => {
            const weight = idx === 0 ? 0.4 : 1.0;
            const lBamboos = layer.getBamboos();
            const lWidth = layer.getWidth();
            const normalizedX = ((worldX % lWidth) + lWidth) % lWidth;
            
            lBamboos.forEach(b => {
                const dist = Math.abs(b.x - normalizedX);
                if (dist < 40) {
                    density += (1 - dist / 40) * weight;
                }
            });
        });
        return Math.min(2.0, density);
    }

    private drawGodRays(cameraX: number) {
        const time = Date.now() - this.startTime;
        this.ctx.save();
        
        // Use Screen for that intense glow
        this.ctx.globalCompositeOperation = 'screen';
        
        // Intense Top-edge "Sun Source"
        const sunBloom = this.ctx.createLinearGradient(0, 0, 0, 200);
        sunBloom.addColorStop(0, 'rgba(255, 240, 150, 0.5)'); // Brighter source
        sunBloom.addColorStop(1, 'transparent');
        this.ctx.fillStyle = sunBloom;
        this.ctx.fillRect(0, 0, this.canvas.width, 200);

        const rayClusters = 8; // More clusters for dense light
        for (let i = 0; i < rayClusters; i++) {
            const screenX = (i / (rayClusters - 1)) * this.canvas.width;
            const clusterX = screenX - 300 + Math.sin(time * 0.00005 + i) * 100;
            
            const worldX = cameraX + screenX;
            const density = this.getBambooDensity(worldX);
            const transmission = Math.max(0.1, 1.4 - density * 0.6);
            
            const beamsPerCluster = 5;
            for (let j = 0; j < beamsPerCluster; j++) {
                const xBase = clusterX + j * 40 + Math.sin(time * 0.0002 + i * j) * 10;
                const width = 20 + Math.sin(time * 0.0005 + j) * 15;
                
                const grad = this.ctx.createLinearGradient(xBase, 0, xBase + 600, this.canvas.height);
                // Almost full opacity at the top for intense "shredded" look
                const alphaBase = 0.95 * transmission;
                
                grad.addColorStop(0, `rgba(255, 250, 220, ${alphaBase.toFixed(2)})`); // White-Gold core
                grad.addColorStop(0.1, `rgba(255, 220, 50, ${(alphaBase * 0.8).toFixed(2)})`); // Intense Gold
                grad.addColorStop(0.4, `rgba(255, 150, 0, ${(alphaBase * 0.3).toFixed(2)})`); // Warm Falloff
                grad.addColorStop(1, 'transparent');
                
                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.moveTo(xBase, 0);
                this.ctx.lineTo(xBase + width, 0);
                this.ctx.lineTo(xBase + width + 600, this.canvas.height);
                this.ctx.lineTo(xBase + 600, this.canvas.height);
                this.ctx.closePath();
                this.ctx.fill();
            }
        }
        
        this.ctx.restore();
    }

    private drawDustMotes() {
        const time = Date.now() - this.startTime;
        this.ctx.save();
        
        this.dustMotes.forEach(m => {
            const dx = m.x + Math.sin(time * 0.001 + m.phase) * 15;
            const dy = m.y + Math.cos(time * 0.0008 + m.phase) * 15;
            
            const opacity = 0.2 + (Math.sin(time * 0.002 + m.phase) * 0.5 + 0.5) * 0.5;
            this.ctx.globalAlpha = opacity;
            
            // Draw as soft glowy dots
            const glow = this.ctx.createRadialGradient(dx % this.canvas.width, dy % this.canvas.height, 0, dx % this.canvas.width, dy % this.canvas.height, m.size * 2);
            glow.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            this.ctx.fillStyle = glow;
            this.ctx.beginPath();
            this.ctx.arc(dx % this.canvas.width, dy % this.canvas.height, m.size * 2, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.ctx.restore();
    }



    private drawMist() {
        // Lightened Silk Base
        this.ctx.fillStyle = '#FCF8ED'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        grad.addColorStop(0, '#FDF6E3');
        grad.addColorStop(0.5, '#F9F1D8');
        grad.addColorStop(1, '#F2E9CD');
        
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
