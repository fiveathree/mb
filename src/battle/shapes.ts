import * as THREE from 'three';

/** 程式生成嘅基本形狀，全部係單位大小，靠 Batches 嘅縮放變形 */

/** 兩頭圓嘅錐形：手腳、頸、尾都用呢個；頂半徑 1，底半徑 ratio，高 1，中心喺原點 */
export function limbGeo(ratio: number): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const cap = 0.14;
  const steps = 3;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.sin(a) * ratio + 1e-3, -0.5 - cap + (1 - Math.cos(a)) * cap));
  }
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) + 1e-3, 0.5 + Math.sin(a) * cap));
  }
  const geo = new THREE.LatheGeometry(pts, 7);
  geo.scale(1, 0.78, 1);
  return geo;
}

/** 由腰到膊頭嘅身軀：腰細胸闊，闊同深都係 1 */
export function torsoGeo(): THREE.BufferGeometry {
  const profile: [number, number][] = [[0.001, -0.52], [0.36, -0.5], [0.41, -0.32], [0.37, -0.12], [0.43, 0.14], [0.5, 0.32], [0.47, 0.44], [0.24, 0.52], [0.001, 0.54]];
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 9);
}

export interface Ring {
  z: number;
  y: number;
  /** 闊、高（半徑） */
  rx: number;
  ry: number;
}

/** 沿 Z 軸一圈圈橢圓接起嚟；arc 得一截時只包上半身，鞍毯用 */
export function loftGeo(rings: Ring[], seg = 9, arc: [number, number] = [0, Math.PI * 2]): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const closed = arc[1] - arc[0] >= Math.PI * 2 - 1e-3;
  const verts = closed ? seg : seg + 1;
  for (const r of rings) {
    for (let i = 0; i < verts; i++) {
      const a = arc[0] + ((arc[1] - arc[0]) * i) / seg;
      pos.push(Math.cos(a) * r.rx, r.y + Math.sin(a) * r.ry, r.z);
    }
  }
  for (let j = 0; j < rings.length - 1; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * verts + i;
      const b = j * verts + ((i + 1) % verts);
      const c = a + verts;
      const d = b + verts;
      idx.push(a, c, b, b, c, d);
    }
  }
  // 頭尾封口
  if (closed) {
    const first = pos.length / 3;
    const [s, e] = [rings[0], rings[rings.length - 1]];
    pos.push(0, s.y, s.z, 0, e.y, e.z);
    for (let i = 0; i < seg; i++) {
      idx.push(first, i, (i + 1) % seg);
      const base = (rings.length - 1) * verts;
      idx.push(first + 1, base + ((i + 1) % seg), base + i);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** 平面輪廓加厚度，Y 軸係長度方向，轉到 Z 向前 */
function flat(points: [number, number][], bevel = 0.08): THREE.BufferGeometry {
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: true, bevelThickness: 0.4, bevelSize: bevel, bevelSegments: 1, steps: 1 });
  geo.translate(0, 0, -0.5);
  geo.rotateX(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/** 劍身：有血槽感嘅長尖刃 */
export const bladeGeo = () => flat([[-0.5, 0], [0.5, 0], [0.46, 0.8], [0, 1], [-0.46, 0.8]], 0.02);
/** 矛頭：柳葉 */
export const leafGeo = () => flat([[0, 0], [0.5, 0.28], [0.3, 0.62], [0, 1], [-0.3, 0.62], [-0.5, 0.28]], 0.02);
/** 斧刃：月牙 */
export const axeGeo = () => flat([[-0.08, -0.25], [0.12, -0.2], [0.5, -0.62], [0.66, -0.3], [0.7, 0], [0.66, 0.3], [0.5, 0.62], [0.12, 0.2], [-0.08, 0.25]], 0.01);

/** 羽翼：幾層羽毛尖 */
export function wingGeo(): THREE.BufferGeometry {
  const pts: [number, number][] = [[0, 0.14], [0.34, 0.2], [0.72, 0.1], [1, -0.08], [0.82, -0.14], [0.86, -0.3], [0.62, -0.28], [0.62, -0.46], [0.38, -0.4], [0.34, -0.56], [0.12, -0.4], [0, -0.3]];
  return flat(pts, 0.005);
}

/** 弓：一段弧，弦另外加 */
export const bowGeo = () => {
  const geo = new THREE.TorusGeometry(1, 0.05, 5, 14, Math.PI * 0.72);
  geo.rotateZ(Math.PI / 2 - Math.PI * 0.36);
  geo.rotateY(Math.PI / 2);
  return geo;
};
