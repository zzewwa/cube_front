import * as THREE from 'three';
import { BaseSkin } from './BaseSkin.js';

const GOLD_EMISSIVE = new THREE.Color('#4f3600');
const FACE_MARKER = {
    r: '#ff3e32',
    o: '#ff8c1a',
    g: '#1ecc50',
    b: '#1a6aff',
    w: '#ffffff',
    y: '#ffe020',
};

export class GoldenSkin extends BaseSkin {
    constructor(cube) {
        super(cube);
        this._originalState = new WeakMap();
        this._albedoByLetter = new Map();
        this._shaderTimeByMaterial = new WeakMap();
        this._gemsByMeshId = new Map();
        this._gemSignatureByMeshId = new Map();
        this._gemGeometry = new THREE.OctahedronGeometry(0.075, 1);
        this._time = 0;
    }

    _createFaceTexture(letter) {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const base = ctx.createLinearGradient(0, 0, size, size);
        base.addColorStop(0.00, '#f3d57a');
        base.addColorStop(0.50, '#d9b24c');
        base.addColorStop(1.00, '#b88f2b');
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, size, size);

        // Inner panel so the face still reads like a tile.
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.fillRect(26, 26, size - 52, size - 52);
        ctx.fillStyle = '#d8ae45';
        ctx.fillRect(32, 32, size - 64, size - 64);

        // Subtle brushed pattern so gold is not flat.
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 32; i++) {
            const y = 28 + i * 6;
            ctx.beginPath();
            ctx.moveTo(34, y);
            ctx.lineTo(size - 34, y + ((i % 2) ? 2 : -2));
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        return texture;
    }

    _getFaceTexture(letter) {
        const key = FACE_MARKER[letter] ? letter : 'h';
        if (this._albedoByLetter.has(key)) {
            return this._albedoByLetter.get(key);
        }

        const tex = this._createFaceTexture(key);
        this._albedoByLetter.set(key, tex);
        return tex;
    }

    _getLogicalMaterials(mesh) {
        return this.cube.materialsByObjectId.get(mesh.id) || mesh.material;
    }

    _getFaceLetters(mesh) {
        const mats = this._getLogicalMaterials(mesh);
        if (!Array.isArray(mats) || mats.length < 6) {
            return ['h', 'h', 'h', 'h', 'h', 'h'];
        }
        return mats.map((m) => m?.name ?? 'h');
    }

    _faceNormalByIndex(index) {
        const normals = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1),
        ];
        return normals[index] ?? new THREE.Vector3(0, 0, 1);
    }

    _createGemMaterial(letter) {
        const color = new THREE.Color(FACE_MARKER[letter]);
        const emissive = color.clone().multiplyScalar(0.16);
        return new THREE.MeshPhysicalMaterial({
            color,
            emissive,
            emissiveIntensity: 0.35,
            metalness: 0.05,
            roughness: 0.12,
            clearcoat: 1.0,
            clearcoatRoughness: 0.06,
            sheen: 0.25,
            sheenColor: color.clone().multiplyScalar(1.2),
        });
    }

    _syncGems(mesh, force = false) {
        const letters = this._getFaceLetters(mesh);
        const signature = letters.join('|');
        if (!force && this._gemSignatureByMeshId.get(mesh.id) === signature) {
            return;
        }

        let group = this._gemsByMeshId.get(mesh.id);
        if (!group) {
            group = new THREE.Group();
            group.name = 'golden-gems';
            mesh.add(group);
            this._gemsByMeshId.set(mesh.id, group);
        }

        for (const child of group.children) {
            child.material?.dispose?.();
        }
        group.clear();

        for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
            const letter = letters[faceIndex];
            if (!FACE_MARKER[letter]) continue;

            const gem = new THREE.Mesh(this._gemGeometry, this._createGemMaterial(letter));
            const normal = this._faceNormalByIndex(faceIndex);
            gem.position.copy(normal).multiplyScalar(0.54); // clearly protrudes beyond 0.5 face plane
            gem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
            gem.scale.set(0.95, 0.95, 1.25);
            group.add(gem);
        }

        this._gemSignatureByMeshId.set(mesh.id, signature);
    }

    _installGoldShimmer(material) {
        if (material.userData.goldenShimmerInstalled) {
            return;
        }

        material.userData.goldenShimmerInstalled = true;
        material.onBeforeCompile = (shader) => {
            shader.uniforms.uGoldTime = { value: this._time };
            this._shaderTimeByMaterial.set(material, shader.uniforms.uGoldTime);

            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                '#include <common>\nvarying vec3 vGoldWorldPos;'
            );

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                '#include <begin_vertex>\nvGoldWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                '#include <common>\nuniform float uGoldTime;\nvarying vec3 vGoldWorldPos;'
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <output_fragment>',
                'float shimmerA = 0.5 + 0.5 * sin(vGoldWorldPos.x * 6.8 + uGoldTime * 2.6);\n'
                + 'float shimmerB = 0.5 + 0.5 * sin(vGoldWorldPos.y * 8.9 - uGoldTime * 2.1);\n'
                + 'float shimmerC = 0.5 + 0.5 * sin(vGoldWorldPos.z * 5.2 + uGoldTime * 1.4);\n'
                + 'float shimmer = clamp((shimmerA * 0.45 + shimmerB * 0.35 + shimmerC * 0.20), 0.0, 1.0);\n'
                + 'float streak = smoothstep(0.72, 1.0, shimmer);\n'
                + 'vec3 goldSheen = vec3(1.00, 0.86, 0.45);\n'
                + 'outgoingLight += goldSheen * (0.10 + streak * 0.65);\n'
                + '#include <output_fragment>'
            );
        };

        material.customProgramCacheKey = () => 'golden-shimmer-v1';
    }

    _applyGoldenMaterials() {
        for (const mats of this.cube.materialsByObjectId.values()) {
            for (const mat of mats) {
                if (!this._originalState.has(mat)) {
                    this._originalState.set(mat, {
                        map: mat.map,
                        color: mat.color.clone(),
                        emissive: mat.emissive.clone(),
                        emissiveIntensity: mat.emissiveIntensity,
                        transparent: mat.transparent,
                        opacity: mat.opacity,
                        depthWrite: mat.depthWrite,
                        metalness: mat.metalness,
                        roughness: mat.roughness,
                        onBeforeCompile: mat.onBeforeCompile,
                        customProgramCacheKey: mat.customProgramCacheKey,
                        goldenShimmerInstalled: mat.userData.goldenShimmerInstalled,
                    });
                }

                mat.map = this._getFaceTexture(mat.name);
                mat.color.setHex(0xffffff);
                mat.emissive.copy(GOLD_EMISSIVE);
                mat.emissiveIntensity = mat.name === 'h' ? 0.05 : 0.12;
                mat.transparent = false;
                mat.opacity = 1;
                mat.depthWrite = true;
                mat.metalness = mat.name === 'h' ? 0.86 : 0.92;
                mat.roughness = mat.name === 'h' ? 0.30 : 0.22;
                this._installGoldShimmer(mat);
                mat.needsUpdate = true;
            }
        }

        for (const mesh of this.cube.cubeMeshList) {
            this._syncGems(mesh, true);
        }
    }

    _disposeTextures() {
        for (const texture of this._albedoByLetter.values()) {
            texture.dispose();
        }
        this._albedoByLetter.clear();
    }

    _disposeGems() {
        for (const mesh of this.cube.cubeMeshList) {
            const group = this._gemsByMeshId.get(mesh.id);
            if (!group) continue;
            for (const child of group.children) {
                child.material?.dispose?.();
            }
            group.clear();
            mesh.remove(group);
        }
        this._gemsByMeshId.clear();
        this._gemSignatureByMeshId.clear();
    }

    _restoreMaterials() {
        for (const mats of this.cube.materialsByObjectId.values()) {
            for (const mat of mats) {
                const state = this._originalState.get(mat);
                if (!state) {
                    continue;
                }

                mat.map = state.map;
                mat.color.copy(state.color);
                mat.emissive.copy(state.emissive);
                mat.emissiveIntensity = state.emissiveIntensity;
                mat.transparent = state.transparent;
                mat.opacity = state.opacity;
                mat.depthWrite = state.depthWrite;
                mat.metalness = state.metalness;
                mat.roughness = state.roughness;
                mat.onBeforeCompile = state.onBeforeCompile;
                mat.customProgramCacheKey = state.customProgramCacheKey;
                mat.userData.goldenShimmerInstalled = state.goldenShimmerInstalled;
                mat.needsUpdate = true;
            }
        }
    }

    apply() {
        this._time = 0;
        this._applyGoldenMaterials();
    }

    update() {
        this._time = performance.now() * 0.001;
        for (const mats of this.cube.materialsByObjectId.values()) {
            for (const mat of mats) {
                const timeUniform = this._shaderTimeByMaterial.get(mat);
                if (timeUniform) {
                    timeUniform.value = this._time;
                }
            }
        }

        for (const mesh of this.cube.cubeMeshList) {
            this._syncGems(mesh, false);
        }
    }

    detach() {
        this._restoreMaterials();
        this._disposeGems();
        this._disposeTextures();
    }

    onMaterialChange() {
        // Keep the golden look stable even when global material sliders change.
        this._applyGoldenMaterials();
    }
}
