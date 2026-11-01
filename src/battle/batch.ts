import * as THREE from 'three';

const BOX_CAPACITY = 3000;
const OTHER_CAPACITY = 8000;
/** 橢球同四肢每個人用得最多 */
const HUMAN_CAPACITY = 20000;
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

interface Batch {
  mesh: THREE.InstancedMesh;
  next: number;
}

/** 一件要畫嘅模型部件；gate 隱藏時部件唔畫 */
export interface Part {
  node: THREE.Object3D;
  mesh: THREE.InstancedMesh;
  index: number;
  gate: THREE.Object3D | null;
}

/** 所有人同馬嘅部件共用 InstancedMesh，令百人同場都只係幾個 draw call */
export class Batches {
  private batches = new Map<string, Batch>();
  private color = new THREE.Color();

  constructor(private scene: THREE.Scene) {}

  private batch(key: string, make: () => THREE.BufferGeometry): Batch {
    let b = this.batches.get(key);
    if (!b) {
      const capacity = key === 'box' ? BOX_CAPACITY : key.includes('ell') || key.includes('limb') ? HUMAN_CAPACITY : OTHER_CAPACITY;
      // 鍵頭 m| 係金屬件，用高光材質；其餘圓滑光影
      const material = key.startsWith('m|')
        ? new THREE.MeshPhongMaterial({ shininess: 70, specular: 0x8a8a8a })
        : key.startsWith('e|')
          ? new THREE.MeshBasicMaterial({ fog: false })
          : new THREE.MeshLambertMaterial({ flatShading: key === 'box' });
      const mesh = new THREE.InstancedMesh(make(), material, capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.scene.add(mesh);
      b = { mesh, next: 0 };
      this.batches.set(key, b);
    }
    return b;
  }

  alloc(key: string, make: () => THREE.BufferGeometry, color: number, node: THREE.Object3D, gate: THREE.Object3D | null): Part {
    const b = this.batch(key, make);
    const index = b.next++;
    b.mesh.count = b.next;
    b.mesh.setColorAt(index, this.color.set(color));
    b.mesh.instanceColor!.needsUpdate = true;
    return { node, mesh: b.mesh, index, gate };
  }

  /** 新一場戰鬥由頭分配 */
  reset() {
    for (const b of this.batches.values()) {
      b.next = 0;
      b.mesh.count = 0;
    }
  }

  commit() {
    for (const b of this.batches.values()) {
      if (!b.next) continue;
      // 只傳用緊嘅部分：成個緩衝區每幀上傳會拖死內顯
      const m = b.mesh.instanceMatrix;
      m.clearUpdateRanges();
      m.addUpdateRange(0, b.next * 16);
      m.needsUpdate = true;
    }
  }

  get drawCount(): number {
    return this.batches.size;
  }
}

/** 將 rig 嘅部件世界矩陣寫入 InstancedMesh */
export function flushParts(root: THREE.Object3D, parts: Part[], hidden = false, only?: THREE.Object3D) {
  // 骨架單位只畫頭頂標記，唔使成副 rig 重算
  if (only) {
    root.updateWorldMatrix(false, false);
    only.updateWorldMatrix(false, true);
  } else if (!hidden) root.updateMatrixWorld(true);
  for (const p of parts) {
    const off = hidden || (p.gate !== null && !p.gate.visible) || (only !== undefined && p.gate !== only);
    p.mesh.setMatrixAt(p.index, off ? ZERO : p.node.matrixWorld);
  }
}
