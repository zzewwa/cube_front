import * as THREE from 'three';
import { BaseSkin } from './BaseSkin.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const GRAVITY_UP = new THREE.Vector3(0, 0, 1);
const ZUP        = new THREE.Vector3(0, 0, 1);

const FACE_COLORS = {
    r: new THREE.Color('#ff3e32'),
    o: new THREE.Color('#ff8c1a'),
    g: new THREE.Color('#1ecc50'),
    b: new THREE.Color('#1a6aff'),
    w: new THREE.Color('#ffffff'),
    y: new THREE.Color('#ffe020'),
    h: new THREE.Color('#030810'),
};

const BASE_WATER = new THREE.Color('#0e7fce');
const SHALLOW    = new THREE.Color('#6ad4f0');
const GLASS_BASE = new THREE.Color('#b8d8f2');

const BOX       = 0.74;
const HALF      = BOX * 0.5;
const CUBE_EXTENT = 1.37;
const SURFACE_SIZE = BOX;
const SURFACE_SEGMENTS = 40;

// Rounded volume gives less "hard box" look than plain BoxGeometry
const VOLUME_GEO  = new RoundedBoxGeometry(BOX, BOX, BOX, 4, 0.08);
// Full square surface instead of circle/disc
const SURFACE_GEO = new THREE.PlaneGeometry(
    SURFACE_SIZE,
    SURFACE_SIZE,
    SURFACE_SEGMENTS,
    SURFACE_SEGMENTS
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cfClamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

function fillOffset(level) {
    return -HALF + cfClamp(level, 0.18, 0.82) * BOX;
}

// ─── Surface ShaderMaterial with Gerstner waves ───────────────────────────────

function mkSurfaceMat() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uFaceColors: { value: Array.from({ length: 6 }, () => new THREE.Color('#ffffff')) },
            uCubieCoord: { value: new THREE.Vector3() },
            uTime:  { value: 0.0 },
        },
        vertexShader: /* glsl */`
            uniform float uTime;

            varying vec3 vWorldPos;
            varying vec3 vWorldNormal;
            varying vec3 vLocalPos;
            varying vec2 vUV;

            // Gerstner wave: returns (xDisp, yDisp, zDisp)
            vec3 gerstner(vec2 p, float A, float k, vec2 D, float omega) {
                float th = dot(D, p) * k + uTime * omega;
                float c  = cos(th);
                float s  = sin(th);
                return vec3(D.x * A * c, D.y * A * c, A * s);
            }

            void main() {
                vUV       = uv;
                vec3 pos  = position;
                // Rounded corners: blend square + circular distance for soft edges
                float sqDist = max(abs(pos.x), abs(pos.y));
                float circDist = length(pos.xy);
                float edgeDist = mix(sqDist, circDist, 0.4);
                // Smooth mask with rounded falloff — matches BOX/2 = 0.37
                float mask = 1.0 - smoothstep(0.34, 0.37, edgeDist);

                vec3 d1 = gerstner(pos.xy, 0.012, 5.0,  normalize(vec2( 1.00,  0.40)), 2.2);
                vec3 d2 = gerstner(pos.xy, 0.008, 6.8,  normalize(vec2(-0.65,  1.00)), 3.0);
                vec3 d3 = gerstner(pos.xy, 0.005, 9.5,  normalize(vec2( 0.85, -0.80)), 2.7);
                vec3 d4 = gerstner(pos.xy, 0.003, 13.0, normalize(vec2(-0.30, -0.70)), 4.2);
                vec3 d5 = gerstner(pos.xy, 0.0025, 18.0, normalize(vec2( 0.20,  1.00)), 5.6);
                vec3 d  = (d1 + d2 + d3 + d4 + d5) * mask;
                pos    += d;

                // Approximate surface normal from wave slope
                vec3 rawN = normalize(vec3(-d.x * 8.0, -d.y * 8.0, 1.0));

                // World-space outputs
                vec4 wp     = modelMatrix * vec4(pos, 1.0);
                vWorldPos   = wp.xyz;
                vWorldNormal = normalize(mat3(transpose(inverse(modelMatrix))) * rawN);
                vLocalPos = pos;

                gl_Position = projectionMatrix * viewMatrix * wp;
            }
        `,
        fragmentShader: /* glsl */`
            precision highp float;

            uniform vec3  uFaceColors[6];
            uniform vec3  uCubieCoord;
            uniform float uTime;

            varying vec3 vWorldPos;
            varying vec3 vWorldNormal;
            varying vec3 vLocalPos;
            varying vec2 vUV;

            vec3 sampleGradientColor(vec3 localPos) {
                vec3 cubePos = (uCubieCoord + localPos) / 1.37;
                float ax = abs(cubePos.x);
                float ay = abs(cubePos.y);
                float az = abs(cubePos.z);
                float maxAxis = max(max(ax, ay), az);

                float d0 = max(0.03, 1.0 - cubePos.x);
                float d1 = max(0.03, 1.0 + cubePos.x);
                float d2 = max(0.03, 1.0 - cubePos.y);
                float d3 = max(0.03, 1.0 + cubePos.y);
                float d4 = max(0.03, 1.0 - cubePos.z);
                float d5 = max(0.03, 1.0 + cubePos.z);

                float w0 = 1.0 / pow(d0, 2.2);
                float w1 = 1.0 / pow(d1, 2.2);
                float w2 = 1.0 / pow(d2, 2.2);
                float w3 = 1.0 / pow(d3, 2.2);
                float w4 = 1.0 / pow(d4, 2.2);
                float w5 = 1.0 / pow(d5, 2.2);
                float ws = w0 + w1 + w2 + w3 + w4 + w5;

                vec3 mixed = (
                    uFaceColors[0] * w0 +
                    uFaceColors[1] * w1 +
                    uFaceColors[2] * w2 +
                    uFaceColors[3] * w3 +
                    uFaceColors[4] * w4 +
                    uFaceColors[5] * w5
                ) / max(ws, 0.0001);

                float n0 = w0 / ws;
                float n1 = w1 / ws;
                float n2 = w2 / ws;
                float n3 = w3 / ws;
                float n4 = w4 / ws;
                float n5 = w5 / ws;
                float e0 = pow(n0, 2.6);
                float e1 = pow(n1, 2.6);
                float e2 = pow(n2, 2.6);
                float e3 = pow(n3, 2.6);
                float e4 = pow(n4, 2.6);
                float e5 = pow(n5, 2.6);
                float es = e0 + e1 + e2 + e3 + e4 + e5;

                vec3 dominant = (
                    uFaceColors[0] * e0 +
                    uFaceColors[1] * e1 +
                    uFaceColors[2] * e2 +
                    uFaceColors[3] * e3 +
                    uFaceColors[4] * e4 +
                    uFaceColors[5] * e5
                ) / max(es, 0.0001);

                vec3 avg = (
                    uFaceColors[0] + uFaceColors[1] + uFaceColors[2] +
                    uFaceColors[3] + uFaceColors[4] + uFaceColors[5]
                ) / 6.0;

                float edgeBlend = smoothstep(0.38, 0.90, maxAxis);
                float centerBlend = 1.0 - smoothstep(0.12, 0.42, maxAxis);
                vec3 readable = mix(mixed, dominant, edgeBlend * 0.82);
                return mix(readable, avg, centerBlend * 0.34);
            }

            float hash(vec2 p) {
                p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
                return -1.0 + 2.0 * fract(sin(p.x + p.y) * 43758.5453123);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
                    u.y
                ) * 0.5 + 0.5;
            }

            float fbm(vec2 p) {
                float f = 0.0;
                float a = 0.5;
                for (int i = 0; i < 4; i++) {
                    f += a * noise(p);
                    p *= 2.0;
                    a *= 0.5;
                }
                return f;
            }

            void main() {
                vec3 N = normalize(vWorldNormal);
                vec3 V = normalize(cameraPosition - vWorldPos);
                vec3 R = reflect(-V, N);

                // Fresnel (Schlick)
                float NdotV = max(dot(N, V), 0.0);
                float F     = 0.04 + 0.96 * pow(1.0 - NdotV, 4.0);

                // Blinn-Phong specular (bright sun from upper-front)
                vec3 L = normalize(vec3(0.55, 0.70, 1.0));
                vec3 H = normalize(V + L);
                float spec = pow(max(dot(N, H), 0.0), 180.0) * 2.0;

                // Sky reflection tint (WebGPU-backdrop style approximation)
                float skyT = pow(clamp(R.z * 0.5 + 0.5, 0.0, 1.0), 1.4);
                vec3 skyA = vec3(0.06, 0.12, 0.22);
                vec3 skyB = vec3(0.45, 0.73, 0.98);
                vec3 skyReflection = mix(skyA, skyB, skyT);

                // Foam near square edges (subtle, so surface is not read as detached plate)
                float edgeDist = max(abs(vUV.x - 0.5), abs(vUV.y - 0.5));
                float foam     = smoothstep(0.45, 0.50, edgeDist) * 0.24;

                // Micro-ripple breakup + subtle caustic flicker
                float micro = fbm(vWorldPos.xy * 11.0 + vec2(uTime * 0.8, -uTime * 1.1));
                float caust = abs(sin(vWorldPos.x * 18.0 + uTime * 2.3)
                                * sin(vWorldPos.y * 16.0 + uTime * 1.9)) * 0.12;

                vec3 deepCol = sampleGradientColor(vLocalPos);
                vec3 foamCol = mix(deepCol, vec3(1.0), 0.72);
                vec3 col = mix(deepCol, foamCol, foam);
                col += F    * skyReflection * 0.85;
                col += spec * vec3(1.00, 0.97, 0.93) * (0.8 + micro * 0.4);
                col += deepCol * caust * (1.0 - foam);
                col *= (0.93 + micro * 0.12);

                float alpha = 0.88 + foam * 0.05 + F * 0.05;
                gl_FragColor = vec4(col, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
    });
}

// ─── Volume ShaderMaterial (water body, clipped at fill level) ────────────────

function mkVolumeMat() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uFaceColors: { value: Array.from({ length: 6 }, () => new THREE.Color('#ffffff')) },
            uCubieCoord: { value: new THREE.Vector3() },
            uN:     { value: new THREE.Vector3(0, 0, 1) },
            uFill:  { value: 0.0 },
        },
        vertexShader: /* glsl */`
            varying vec3 vLP;
            void main() {
                vLP         = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */`
            uniform vec3  uFaceColors[6];
            uniform vec3  uCubieCoord;
            uniform vec3  uN;
            uniform float uFill;

            varying vec3 vLP;

            vec3 sampleGradientColor(vec3 localPos) {
                vec3 cubePos = (uCubieCoord + localPos) / 1.37;
                float ax = abs(cubePos.x);
                float ay = abs(cubePos.y);
                float az = abs(cubePos.z);
                float maxAxis = max(max(ax, ay), az);

                float d0 = max(0.03, 1.0 - cubePos.x);
                float d1 = max(0.03, 1.0 + cubePos.x);
                float d2 = max(0.03, 1.0 - cubePos.y);
                float d3 = max(0.03, 1.0 + cubePos.y);
                float d4 = max(0.03, 1.0 - cubePos.z);
                float d5 = max(0.03, 1.0 + cubePos.z);

                float w0 = 1.0 / pow(d0, 2.2);
                float w1 = 1.0 / pow(d1, 2.2);
                float w2 = 1.0 / pow(d2, 2.2);
                float w3 = 1.0 / pow(d3, 2.2);
                float w4 = 1.0 / pow(d4, 2.2);
                float w5 = 1.0 / pow(d5, 2.2);
                float ws = w0 + w1 + w2 + w3 + w4 + w5;

                vec3 mixed = (
                    uFaceColors[0] * w0 +
                    uFaceColors[1] * w1 +
                    uFaceColors[2] * w2 +
                    uFaceColors[3] * w3 +
                    uFaceColors[4] * w4 +
                    uFaceColors[5] * w5
                ) / max(ws, 0.0001);

                float n0 = w0 / ws;
                float n1 = w1 / ws;
                float n2 = w2 / ws;
                float n3 = w3 / ws;
                float n4 = w4 / ws;
                float n5 = w5 / ws;
                float e0 = pow(n0, 2.6);
                float e1 = pow(n1, 2.6);
                float e2 = pow(n2, 2.6);
                float e3 = pow(n3, 2.6);
                float e4 = pow(n4, 2.6);
                float e5 = pow(n5, 2.6);
                float es = e0 + e1 + e2 + e3 + e4 + e5;

                vec3 dominant = (
                    uFaceColors[0] * e0 +
                    uFaceColors[1] * e1 +
                    uFaceColors[2] * e2 +
                    uFaceColors[3] * e3 +
                    uFaceColors[4] * e4 +
                    uFaceColors[5] * e5
                ) / max(es, 0.0001);

                vec3 avg = (
                    uFaceColors[0] + uFaceColors[1] + uFaceColors[2] +
                    uFaceColors[3] + uFaceColors[4] + uFaceColors[5]
                ) / 6.0;

                float edgeBlend = smoothstep(0.38, 0.90, maxAxis);
                float centerBlend = 1.0 - smoothstep(0.12, 0.42, maxAxis);
                vec3 readable = mix(mixed, dominant, edgeBlend * 0.82);
                return mix(readable, avg, centerBlend * 0.34);
            }

            void main() {
                // Discard everything above the tilted fill plane
                if (dot(vLP, normalize(uN)) - uFill > 0.006) discard;

                // Depth absorption (Beer-Lambert style approximation) — stronger absorption
                float depth = clamp((uFill - dot(vLP, normalize(uN))) / 0.45, 0.0, 1.0);
                float absorb = exp(-depth * 4.2);
                vec3  deepCol = sampleGradientColor(vLP);
                vec3  shallCol = mix(deepCol, vec3(0.97, 0.985, 1.0), 0.36);
                vec3  col    = mix(deepCol, shallCol, absorb * 0.70);
                // Much higher opacity to avoid see-through effect and z-fighting issues
                float alpha  = 0.86 + depth * 0.12;
                gl_FragColor = vec4(col, alpha);
            }
        `,
        transparent: true,
        side: THREE.FrontSide,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: 1,
    });
}

// Opaque side walls material — blocks view downward
// ─── WaterSkin ────────────────────────────────────────────────────────────────

export class WaterSkin extends BaseSkin {
    static createPreview(context = {}) {
        return BaseSkin.createPreview(context);
    }

    constructor(cube) {
        super(cube);
        this.fillLevel = cube.config.runtime?.water?.fillLevel ?? 0.62;
        this.spring    = cube.config.runtime?.water?.spring    ?? 14;
        this.damping   = cube.config.runtime?.water?.damping   ?? 4;
        this.response  = cube.config.runtime?.water?.response  ?? 1.3;

        this._dataById  = new Map();   // meshId → { volume, surface }
        this._stateById = new Map();   // meshId → { surfaceNormal, velocity }
        this._shellMaterialState = new WeakMap();

        this._lastUpdateAt = performance.now();
        this._time         = 0;

        this._lastCamAz  = 0;
        this._lastCamPol = 0;
        this._camReady   = false;

        // Reusable temp objects (avoid per-frame allocation)
        this._tmpQ    = new THREE.Quaternion();
        this._tmpM4   = new THREE.Matrix4();
        this._tmpM3   = new THREE.Matrix3();
        this._tmpV3   = new THREE.Vector3();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    _mats(mesh) {
        return this.cube.materialsByObjectId.get(mesh.id) ?? mesh.material;
    }

    _getLogicalPosition(mesh) {
        return this.cube.position_of_cubes.get(mesh.name) ?? [mesh.position.x, mesh.position.y, mesh.position.z];
    }

    _getMeshAtCoord(x, y, z) {
        for (const candidate of this.cube.cubeMeshList) {
            const [cx, cy, cz] = this._getLogicalPosition(candidate);
            if (cx === x && cy === y && cz === z) {
                return candidate;
            }
        }
        return null;
    }

    _getGlobalSideColors() {
        const maxCoord = Math.max(1, Math.trunc(this.cube.config.cube.size / 2));
        const minCoord = -maxCoord;
        const centers = [
            { coord: [ maxCoord, 0, 0 ], materialIndex: 0 },
            { coord: [ minCoord, 0, 0 ], materialIndex: 1 },
            { coord: [ 0, maxCoord, 0 ], materialIndex: 2 },
            { coord: [ 0, minCoord, 0 ], materialIndex: 3 },
            { coord: [ 0, 0, maxCoord ], materialIndex: 4 },
            { coord: [ 0, 0, minCoord ], materialIndex: 5 },
        ];

        return centers.map(({ coord, materialIndex }) => {
            const mesh = this._getMeshAtCoord(coord[0], coord[1], coord[2]);
            const mats = mesh ? this._mats(mesh) : null;
            const faceName = Array.isArray(mats) ? (mats[materialIndex]?.name ?? 'h') : 'h';
            return (FACE_COLORS[faceName] ?? GLASS_BASE).clone();
        });
    }

    _getWaterColor(mesh) {
        const [x, y, z] = this._getLogicalPosition(mesh);
        const maxCoord = Math.max(1, Math.trunc(this.cube.config.cube.size / 2));
        const nx = x / maxCoord;
        const ny = y / maxCoord;
        const nz = z / maxCoord;
        const sideColors = this._getGlobalSideColors();
        const falloff = 2.15;
        const edgeEps = 0.08;
        const weights = [
            Math.pow(1 / Math.max(edgeEps, 1 - nx), falloff),
            Math.pow(1 / Math.max(edgeEps, 1 + nx), falloff),
            Math.pow(1 / Math.max(edgeEps, 1 - ny), falloff),
            Math.pow(1 / Math.max(edgeEps, 1 + ny), falloff),
            Math.pow(1 / Math.max(edgeEps, 1 - nz), falloff),
            Math.pow(1 / Math.max(edgeEps, 1 + nz), falloff),
        ];

        let totalWeight = 0;
        const mixed = new THREE.Color(0, 0, 0);
        for (let index = 0; index < 6; index++) {
            totalWeight += weights[index];
            mixed.r += sideColors[index].r * weights[index];
            mixed.g += sideColors[index].g * weights[index];
            mixed.b += sideColors[index].b * weights[index];
        }

        mixed.r /= totalWeight;
        mixed.g /= totalWeight;
        mixed.b /= totalWeight;

        const centerBlend = 1.0 - Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz));
        const average = new THREE.Color(0, 0, 0);
        for (const color of sideColors) {
            average.r += color.r;
            average.g += color.g;
            average.b += color.b;
        }
        average.r /= 6;
        average.g /= 6;
        average.b /= 6;

        mixed.lerp(average, centerBlend * 0.45);
        return mixed;
    }

    _createMeshes(mesh) {
        const vol = new THREE.Mesh(VOLUME_GEO, mkVolumeMat());
        vol.renderOrder = 1;
        mesh.add(vol);

        const surf = new THREE.Mesh(SURFACE_GEO, mkSurfaceMat());
        surf.renderOrder = 2;
        mesh.add(surf);

        const data  = { volume: vol, surface: surf };
        const state = { surfaceNormal: new THREE.Vector3(0, 0, 1), velocity: new THREE.Vector3() };
        this._dataById.set(mesh.id,  data);
        this._stateById.set(mesh.id, state);
        this._positionSurface(surf, state.surfaceNormal);
        return data;
    }

    _ensure(mesh) {
        return this._dataById.get(mesh.id) ?? this._createMeshes(mesh);
    }

    /** Orient and translate the surface plane to match the current physics normal */
    _positionSurface(surf, normal) {
        const fo = fillOffset(this.fillLevel);
        surf.position.set(normal.x * fo, normal.y * fo, normal.z * fo);
        if (Math.abs(normal.z) < 0.9999) {
            surf.quaternion.setFromUnitVectors(ZUP, normal);
        } else {
            surf.quaternion.identity();
            if (normal.z < 0) surf.quaternion.set(1, 0, 0, 0);
        }
    }

    _syncColors(mesh, data) {
        const sideColors = this._getGlobalSideColors();
        const [x, y, z] = this._getLogicalPosition(mesh);

        for (const mat of [data.volume.material, data.surface.material]) {
            const u = mat.uniforms;
            for (let i = 0; i < 6; i++) u.uFaceColors.value[i].copy(sideColors[i]);
            u.uCubieCoord.value.set(x, y, z);
        }
    }

    _applyShellMaterials() {
        for (const mats of this.cube.materialsByObjectId.values()) {
            for (const mat of mats) {
                if (!this._shellMaterialState.has(mat)) {
                    this._shellMaterialState.set(mat, {
                        map: mat.map,
                        color: mat.color.clone(),
                        emissive: mat.emissive.clone(),
                        emissiveIntensity: mat.emissiveIntensity,
                        transparent: mat.transparent,
                        opacity: mat.opacity,
                        depthWrite: mat.depthWrite,
                        metalness: mat.metalness,
                        roughness: mat.roughness,
                    });
                }

                const hidden = mat.name === 'h';
                mat.map               = null;
                mat.color.copy(hidden ? FACE_COLORS.h : new THREE.Color('#f3fbff'));
                mat.transparent       = true;
                mat.opacity           = hidden ? 0.02 : 0.18;
                mat.depthWrite        = false;
                mat.metalness         = 0.0;
                mat.roughness         = 0.02;
                mat.emissive.copy(hidden ? FACE_COLORS.h : new THREE.Color('#d9eefc'));
                mat.emissiveIntensity = hidden ? 0.0 : 0.08;
                mat.needsUpdate       = true;
            }
        }
    }

    _restoreShellMaterials() {
        for (const mats of this.cube.materialsByObjectId.values()) {
            for (const mat of mats) {
                const state = this._shellMaterialState.get(mat);
                if (state) {
                    mat.map = state.map;
                    mat.color.copy(state.color);
                    mat.emissive.copy(state.emissive);
                    mat.emissiveIntensity = state.emissiveIntensity;
                    mat.transparent = state.transparent;
                    mat.opacity = state.opacity;
                    mat.depthWrite = state.depthWrite;
                    mat.metalness = state.metalness;
                    mat.roughness = state.roughness;
                } else {
                    mat.transparent       = false;
                    mat.opacity           = 1;
                    mat.depthWrite        = true;
                    mat.metalness         = this.cube.config.cube.textures.metalness;
                    mat.roughness         = this.cube.config.cube.textures.roughness;
                    mat.color.copy(new THREE.Color(0xffffff));
                    mat.emissive.setHex(0x000000);
                    mat.emissiveIntensity = 0;
                    mat.map = null;
                }
                mat.needsUpdate       = true;
            }
        }
    }

    _targetNormal(mesh) {
        mesh.updateWorldMatrix(true, false);
        mesh.getWorldQuaternion(this._tmpQ);
        return GRAVITY_UP.clone().applyQuaternion(this._tmpQ.invert()).normalize();
    }

    // ── Public API ────────────────────────────────────────────────────────────

    apply() {
        this._lastUpdateAt = performance.now();
        this._time     = 0;
        this._camReady = false;
        this._applyShellMaterials();
        for (const mesh of this.cube.cubeMeshList) {
            this._syncColors(mesh, this._ensure(mesh));
        }
        this.update();
    }

    detach() {
        for (const mesh of this.cube.cubeMeshList) {
            const data = this._dataById.get(mesh.id);
            if (!data) continue;
            mesh.remove(data.volume);
            mesh.remove(data.surface);
            data.volume.material.dispose();
            data.surface.material.dispose();
        }
        this._dataById.clear();
        this._stateById.clear();
        this._restoreShellMaterials();
    }

    update() {
        const now = performance.now();
        const dt  = Math.min(0.05, Math.max(0.001, (now - this._lastUpdateAt) / 1000));
        this._lastUpdateAt = now;
        this._time        += dt;

        // ── Camera angular velocity → water slosh impulse ─────────────────────
        let camAzVel = 0, camPolVel = 0;
        const controls = this.cube.renderEngine?.controls;
        if (controls?.getAzimuthalAngle) {
            const az  = controls.getAzimuthalAngle();
            const pol = controls.getPolarAngle();
            if (this._camReady) {
                let dAz = az - this._lastCamAz;
                if (dAz >  Math.PI) dAz -= 2 * Math.PI;
                if (dAz < -Math.PI) dAz += 2 * Math.PI;
                camAzVel  = dAz              / dt;
                camPolVel = (pol - this._lastCamPol) / dt;
            }
            this._lastCamAz  = az;
            this._lastCamPol = pol;
            this._camReady   = true;
        }

        const camQ    = this.cube.renderEngine?.camera?.quaternion ?? new THREE.Quaternion();
        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camQ);
        const camUp   = new THREE.Vector3(0, 1, 0).applyQuaternion(camQ);

        for (const mesh of this.cube.cubeMeshList) {
            const data  = this._ensure(mesh);
            const state = this._stateById.get(mesh.id);
            if (!state) continue;

            // Camera-rotation impulse (world → local space)
            if (Math.abs(camAzVel) > 0.005 || Math.abs(camPolVel) > 0.005) {
                mesh.updateWorldMatrix(true, false);
                this._tmpM3.setFromMatrix4(this._tmpM4.copy(mesh.matrixWorld).invert());
                state.velocity
                    .add(camRight.clone().applyMatrix3(this._tmpM3).multiplyScalar(camAzVel  * -0.09))
                    .add(camUp.clone().applyMatrix3(this._tmpM3).multiplyScalar(camPolVel * -0.07));
            }

            // Spring-damper
            const target = this._targetNormal(mesh);
            state.velocity.addScaledVector(
                target.clone().sub(state.surfaceNormal),
                this.spring * dt * this.response
            );
            state.velocity.multiplyScalar(Math.exp(-this.damping * dt));
            state.surfaceNormal.addScaledVector(state.velocity, dt).normalize();

            // Volume clip overshoots surface by an amount proportional to tilt,
            // so the rounded box always reaches upward past the ripple plane.
            const tiltAmount = 1.0 - Math.abs(state.surfaceNormal.dot(target));
            const fillVal = fillOffset(this.fillLevel);
            const volumeOvershoot = tiltAmount * BOX * 0.55;

            const vu = data.volume.material.uniforms;
            vu.uN.value.copy(state.surfaceNormal);
            vu.uFill.value = fillVal + volumeOvershoot;

            data.surface.material.uniforms.uTime.value = this._time;
            this._positionSurface(data.surface, state.surfaceNormal);
        }
    }

    onMaterialChange() {
        this._applyShellMaterials();
        for (const mesh of this.cube.cubeMeshList) {
            const data = this._dataById.get(mesh.id);
            if (data) this._syncColors(mesh, data);
        }
    }

    /** Called after cube rotation completes — refresh water tints */
    onCubieRemap() {
        for (const mesh of this.cube.cubeMeshList) {
            const data = this._dataById.get(mesh.id);
            if (data) this._syncColors(mesh, data);
        }
    }

    setParams(_params) {}
}
