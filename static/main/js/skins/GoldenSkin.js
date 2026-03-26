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
        this._phaseByMaterial = new WeakMap();
        this._gemsByMeshId = new Map();
        this._gemSignatureByMeshId = new Map();
        this._gemGeometry = new THREE.IcosahedronGeometry(0.115, 0);
        this.shimmerAmount = cube.config.runtime?.golden?.shimmer ?? 0.18;
        this.shimmerSpeed = cube.config.runtime?.golden?.shimmerSpeed ?? 1.0;
        this.sparkleScale = cube.config.runtime?.golden?.sparkleScale ?? 5.0;
        this.gemGlowMode = cube.config.runtime?.golden?.gemGlowMode ?? 'all';
        this.gemGlowIntensity = cube.config.runtime?.golden?.gemGlowIntensity ?? 0.22;
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

    _getMaterialPhase(material) {
        const existing = this._phaseByMaterial.get(material);
        if (existing !== undefined) {
            return existing;
        }

        // Stable hash from uuid so every face shimmers with its own phase.
        let hash = 0;
        for (let i = 0; i < material.uuid.length; i++) {
            hash = ((hash << 5) - hash) + material.uuid.charCodeAt(i);
            hash |= 0;
        }
        const phase = Math.abs(hash % 6283) / 1000; // ~[0..2PI]
        this._phaseByMaterial.set(material, phase);
        return phase;
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
            emissiveIntensity: 0.08,
            metalness: 0.0,
            roughness: 0.06,
            transmission: 0.98,
            thickness: 0.55,
            ior: 1.52,
            attenuationDistance: 0.8,
            attenuationColor: color,
            clearcoat: 1.0,
            clearcoatRoughness: 0.02,
            envMapIntensity: 0.25,
            flatShading: true,
        });
    }

    _createGemGlowLight(letter) {
        const color = new THREE.Color(FACE_MARKER[letter]);
        const light = new THREE.PointLight(color, this.gemGlowIntensity, 0.95, 2.0);
        light.castShadow = false;
        light.position.set(0, 0, 0.04);
        return light;
    }

    _shouldAttachGemGlow(coloredFaceCount) {
        if (this.gemGlowMode === 'off') {
            return false;
        }
        if (this.gemGlowMode === 'center') {
            return coloredFaceCount === 1;
        }
        return true;
    }

    _syncGems(mesh, force = false) {
        const letters = this._getFaceLetters(mesh);
        const coloredFaceCount = letters.filter((letter) => Boolean(FACE_MARKER[letter])).length;
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
            this._installGoldShimmer(gem.material);
            if (this._shouldAttachGemGlow(coloredFaceCount)) {
                gem.add(this._createGemGlowLight(letter));
            }
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
            shader.uniforms.uGoldSparkleScale = { value: this.sparkleScale };
            material.userData._goldShader = shader;
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
                [
                    '#include <common>',
                    'uniform float uGoldTime;',
                    'uniform float uGoldShimmerAmount;',
                    'uniform float uGoldShimmerSpeed;',
                    'uniform float uGoldSparkleScale;',
                    'varying vec3 vGoldWorldPos;',
                    'float goldHash(vec2 p) {',
                    '    vec2 q = fract(p * vec2(0.1031, 0.1030));',
                    '    q += dot(q, q.yx + 33.33);',
                    '    return fract((q.x + q.y) * q.x);',
                    '}',
                    'float goldSparkleCell(vec2 cell, float t) {',
                    '    vec2 id = floor(cell);',
                    '    vec2 uv = fract(cell) - 0.5;',
                    '    float h = goldHash(id);',
                    '    float wave = sin(t + h * 6.2832);',
                    '    float peak = pow(max(wave, 0.0), 4.0);',
                    '    float dist = length(uv);',
                    '    return peak * smoothstep(0.38, 0.0, dist);',
                    '}',
                ].join('\n')
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                [
                    'float _gt = uGoldTime * uGoldShimmerSpeed;',
                    'vec3 _wp = vGoldWorldPos * uGoldSparkleScale;',
                    'vec2 _sweep = vec2(uGoldTime * 0.15, uGoldTime * 0.09) * uGoldShimmerSpeed;',
                    'float _spk = max(goldSparkleCell(_wp.xy + _sweep,        _gt),',
                    '            max(goldSparkleCell(_wp.yz + _sweep.yx,      _gt + 1.1),',
                    '                goldSparkleCell(_wp.xz + _sweep * 0.7,  _gt + 2.2)));',
                    'gl_FragColor.rgb += vec3(1.0, 0.95, 0.55) * _spk * uGoldShimmerAmount * 2.0;',
                    '#include <dithering_fragment>',
                ].join('\n')
            );
        };

        // Unique key per material ensures onBeforeCompile runs for every cubie face.
        material.customProgramCacheKey = () => `golden-shimmer-v5-${material.uuid}`;
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
                mat.emissiveIntensity = mat.name === 'h' ? 0.02 : 0.03;
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
                mat.userData._goldShader = undefined;
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
        const updateShader = (shader) => {
            if (shader?.uniforms?.uGoldTime) {
                shader.uniforms.uGoldTime.value = this._time;
                shader.uniforms.uGoldShimmerAmount.value = this.shimmerAmount;
                shader.uniforms.uGoldShimmerSpeed.value = this.shimmerSpeed;
                shader.uniforms.uGoldSparkleScale.value = this.sparkleScale;
            }
        };
        for (const mats of this.cube.materialsByObjectId.values()) {
            for (const mat of mats) {
                updateShader(mat.userData._goldShader);
            }
        }
        for (const group of this._gemsByMeshId.values()) {
            for (const gem of group.children) {
                updateShader(gem.material?.userData?._goldShader);
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

    setParams({ goldenShimmer, goldenShimmerSpeed, goldenSparkleScale, goldenGemGlowMode, goldenGemGlowIntensity }) {
        let shouldRefreshGems = false;
        if (goldenShimmer !== undefined) {
            this.shimmerAmount = Math.min(1.2, Math.max(0.0, Number(goldenShimmer)));
        }
        if (goldenShimmerSpeed !== undefined) {
            this.shimmerSpeed = Math.min(3.0, Math.max(0.0, Number(goldenShimmerSpeed)));
        }
        if (goldenSparkleScale !== undefined) {
            this.sparkleScale = Math.min(12.0, Math.max(2.0, Number(goldenSparkleScale)));
        }
        if (goldenGemGlowMode !== undefined) {
            this.gemGlowMode = ['off', 'center', 'all'].includes(goldenGemGlowMode) ? goldenGemGlowMode : 'all';
            shouldRefreshGems = true;
        }
        if (goldenGemGlowIntensity !== undefined) {
            this.gemGlowIntensity = Math.min(0.5, Math.max(0.0, Number(goldenGemGlowIntensity)));
            shouldRefreshGems = true;
        }

        // Immediate visual feedback even before next frame/shader uniform tick.
        for (const mats of this.cube.materialsByObjectId.values()) {
            for (const mat of mats) {
                mat.needsUpdate = true;
                const shader = mat.userData._goldShader;
                if (shader?.uniforms?.uGoldShimmerAmount) {
                    shader.uniforms.uGoldShimmerAmount.value = this.shimmerAmount;
                    shader.uniforms.uGoldShimmerSpeed.value = this.shimmerSpeed;
                    shader.uniforms.uGoldSparkleScale.value = this.sparkleScale;
                }
            }
        }

        if (shouldRefreshGems) {
            for (const mesh of this.cube.cubeMeshList) {
                this._syncGems(mesh, true);
            }
        }
    }
}
