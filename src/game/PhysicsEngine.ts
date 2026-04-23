import Matter from 'matter-js';
import { PHYSICS } from './Constants';

export class PhysicsEngine {
  public engine: Matter.Engine;
  public world: Matter.World;
  public runner: Matter.Runner;

  constructor() {
    this.engine = Matter.Engine.create();
    this.world = this.engine.world;
    this.world.gravity.y = PHYSICS.GRAVITY;
    this.engine.positionIterations = 10;
    this.engine.velocityIterations = 10;
    
    this.runner = Matter.Runner.create();
  }

  public start() {
    Matter.Runner.run(this.runner, this.engine);
  }

  public update() {
    // Manual update if needed, but Runner handles it by default
  }

  public createGround(x: number, y: number, width: number, height: number) {
    const ground = Matter.Bodies.rectangle(x, y, width, height, {
      isStatic: true,
      friction: 1,
      render: { fillStyle: '#3E2723' }
    });
    Matter.World.add(this.world, ground);
    return ground;
  }
}
