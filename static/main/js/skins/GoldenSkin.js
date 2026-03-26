import * as THREE from 'three';
import { BaseSkin } from './BaseSkin.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
        this._gemGeometry = new THREE.IcosahedronGeometry(0.115, 0);
        this._ownedEnvironment = null;
        this._previousEnvironment = null;
        this.shimmerAmount = cube.config.runtime?.golden?.shimmer ?? 0.11;
        this.shimmerSpeed = cube.config.runtime?.golden?.shimmerSpeed ?? 1.0;
        this._time = 0;
    }

    _ensureEnvironment() {
        const scene = this.cube.renderEngine?.scene;
        const renderer = this.cube.renderEngine?.renderer;
        if (!scene || !renderer || scene.environment) {
            return;
        }

        const pmrem = new THREE.PMREMGenerator(renderer);
        const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
        this._previousEnvironment = scene.environment;
        scene.environment = envRT.texture;
        this._ownedEnvironment = { pmrem, envRT };
    }

    _restoreEnvironment() {
        if (!this._ownedEnvironment) {
            return;
        }

        const scene = this.cube.renderEngine?.scene;
        if (scene && scene.environment === this._ownedEnvironment.envRT.texture) {
            scene.environment = this._previousEnvironment;
        }

        this._ownedEnvironment.envRT.dispose();
        this._ownedEnvironment.pmrem.dispose();
        this._ownedEnvironment = null;
        this._previousEnvironment = null;
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
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
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
        const emissive = color.clone().multiplyScalar(0.10);
        return new THREE.MeshPhysicalMaterial({
            color,
            emissive,
            emissiveIntensity: 0.08,
            metalness: 0.0,
            roughness: 0.03,
            transmission: 0.98,
            thickness: 0.55,
            ior: 1.52,
            attenuationDistance: 0.8,
            attenuationColor: color,
            clearcoat: 1.0,
            clearcoatRoughness: 0.02,
            envMapIntensity: 1.35,
            flatShading: true,
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
            // Slight protrusion over the face plane with larger gemstone silhouette.
            gem.position.copy(normal).multiplyScalar(0.512);
            gem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
            gem.scale.set(1.18, 1.18, 0.68);
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
            shader.uniforms.uGoldShimmerAmount = { value: this.shimmerAmount };
            shader.uniforms.uGoldShimmerSpeed = { value: this.shimmerSpeed };
            this._shaderTimeByMaterial.set(material, {
                time: shader.uniforms.uGoldTime,
                amount: shader.uniforms.uGoldShimmerAmount,
                speed: shader.uniforms.uGoldShimmerSpeed,
            });

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
                '#include <common>\nuniform float uGoldTime;\nuniform float uGoldShimmerAmount;\nuniform float uGoldShimmerSpeed;\nvarying vec3 vGoldWorldPos;'
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <emissivemap_fragment>',
                '#include <emissivemap_fragment>\n'
                + 'float lineA = 0.5 + 0.5 * sin(vGoldWorldPos.x * 6.2 + uGoldTime * 1.4 * uGoldShimmerSpeed);\n'
                + 'float lineB = 0.5 + 0.5 * sin(vGoldWorldPos.y * 4.8 - uGoldTime * 1.1 * uGoldShimmerSpeed);\n'
                + 'float lineC = 0.5 + 0.5 * sin((vGoldWorldPos.x + vGoldWorldPos.y) * 3.9 + uGoldTime * 0.9 * uGoldShimmerSpeed);\n'
                + 'float shimmer = max(lineA * 0.58, max(lineB * 0.52, lineC * 0.42));\n'
                + 'float streak = smoothstep(0.82, 1.0, shimmer);\n'
                + 'vec3 shimmerColor = vec3(1.00, 0.90, 0.52);\n'
                + 'totalEmissiveRadiance += shimmerColor * uGoldShimmerAmount * (0.04 + streak * 0.35);'
            );
        };

        material.customProgramCacheKey = () => 'golden-shimmer-v2';
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
                mat.emissiveIntensity = mat.name === 'h' ? 0.06 : 0.10;
                mat.transparent = false;
                mat.opacity = 1;
                mat.depthWrite = true;
                mat.metalness = mat.name === 'h' ? 0.86 : 0.92;
                mat.roughness = mat.name === 'h' ? 0.28 : 0.20;
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
        this._ensureEnvironment();
        this._applyGoldenMaterials();
    }

    update() {
        this._time = performance.now() * 0.001;
        for (const mats of this.cube.materialsByObjectId.values()) {
            for (const mat of mats) {
                const uniforms = this._shaderTimeByMaterial.get(mat);
                if (uniforms) {
                    uniforms.time.value = this._time;
                    uniforms.amount.value = this.shimmerAmount;
                    uniforms.speed.value = this.shimmerSpeed;
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
        this._restoreEnvironment();
    }

    onMaterialChange() {
        // Keep the golden look stable even when global material sliders change.
        this._applyGoldenMaterials();
    }

    setParams({ goldenShimmer, goldenShimmerSpeed }) {
        if (goldenShimmer !== undefined) {
            this.shimmerAmount = Math.min(0.35, Math.max(0.0, Number(goldenShimmer)));
        }
        if (goldenShimmerSpeed !== undefined) {
            this.shimmerSpeed = Math.min(3.0, Math.max(0.1, Number(goldenShimmerSpeed)));
        }
    }
}
