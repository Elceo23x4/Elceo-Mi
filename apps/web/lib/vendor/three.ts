/* eslint-disable no-unused-vars */
export const AdditiveBlending = 2;

export class Scene {
  objects: unknown[] = [];
  add(object: unknown): void {
    this.objects.push(object);
  }
}

export class PerspectiveCamera {
  position = { z: 0 };
  aspect: number;
  constructor(_fov: number, aspect: number, _near: number, _far: number) {
    this.aspect = aspect;
  }
  updateProjectionMatrix(): void {}
}

export class BufferAttribute {
  constructor(public array: Float32Array, public itemSize: number) {}
}

export class BufferGeometry {
  private attrs: Record<string, BufferAttribute> = {};
  setAttribute(name: string, attribute: BufferAttribute): void {
    this.attrs[name] = attribute;
  }
  getAttribute(name: string): BufferAttribute | undefined {
    return this.attrs[name];
  }
  dispose(): void {
    this.attrs = {};
  }
}

export class PointsMaterial {
  color: string;
  size: number;
  transparent: boolean;
  opacity: number;
  blending: number;
  constructor(options: { color: string; size: number; transparent: boolean; opacity: number; blending: number }) {
    this.color = options.color;
    this.size = options.size;
    this.transparent = options.transparent;
    this.opacity = options.opacity;
    this.blending = options.blending;
  }
  dispose(): void {}
}

export class Points {
  rotation = { x: 0, y: 0 };
  constructor(public geometry: BufferGeometry, public material: PointsMaterial) {}
}

export class AmbientLight {
  constructor(public color: string, public intensity = 1) {}
}

export class PointLight {
  position = { set: (_x: number, _y: number, _z: number) => {} };
  constructor(public color: string, public intensity = 1, public distance = 0) {}
}

export class WebGLRenderer {
  domElement: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private width = 0;
  private height = 0;

  constructor(_options?: Record<string, unknown>) {
    this.domElement = document.createElement('canvas');
    this.ctx = this.domElement.getContext('2d');
  }

  setPixelRatio(_value: number): void {}

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.domElement.width = width;
    this.domElement.height = height;
  }

  render(scene: Scene, _camera: PerspectiveCamera): void {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
    const pointsObject = scene.objects.find((item) => item instanceof Points) as Points | undefined;
    if (!pointsObject) return;

    const attr = pointsObject.geometry.getAttribute('position');
    if (!attr) return;

    const points = attr.array;
    this.ctx.fillStyle = pointsObject.material.color;
    this.ctx.globalAlpha = pointsObject.material.opacity;

    for (let i = 0; i < points.length; i += 3) {
      const x = ((points[i] + 25) / 50) * this.width;
      const y = ((points[i + 1] + 25) / 50) * this.height;
      this.ctx.beginPath();
      this.ctx.arc(x, y, Math.max(0.6, pointsObject.material.size * 8), 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  dispose(): void {
    this.ctx = null;
  }
}
