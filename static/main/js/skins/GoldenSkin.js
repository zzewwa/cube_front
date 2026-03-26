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
        this._bumpByLetter = new Map();
        this._shaderTimeByMaterial = new WeakMap();
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

        const marker = FACE_MARKER[letter];
        if (marker) {
            const markerSize = 74;
            const markerPos = Math.floor((size - markerSize) / 2);
            const m0 = markerPos;
            const m1 = markerPos + markerSize;
            const c = markerPos + markerSize * 0.5;
            const inset = 10;

            // Gem base (octagon) with color gradient.
            const gemGrad = ctx.createLinearGradient(m0, m0, m1, m1);
            gemGrad.addColorStop(0.0, '#ffffff');
            gemGrad.addColorStop(0.25, marker);
            gemGrad.addColorStop(1.0, '#1a1a1a');

            ctx.beginPath();
            ctx.moveTo(c, m0);
            ctx.lineTo(m1 - inset, m0 + inset);
            ctx.lineTo(m1, c);
            ctx.lineTo(m1 - inset, m1 - inset);
            ctx.lineTo(c, m1);
            ctx.lineTo(m0 + inset, m1 - inset);
            ctx.lineTo(m0, c);
            ctx.lineTo(m0 + inset, m0 + inset);
            ctx.closePath();
            ctx.fillStyle = gemGrad;
            ctx.fill();

            // Facet lines.
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(c, m0 + 2);
            ctx.lineTo(c, m1 - 2);
            ctx.moveTo(m0 + 2, c);
            ctx.lineTo(m1 - 2, c);
            ctx.moveTo(m0 + inset, m0 + inset);
            ctx.lineTo(m1 - inset, m1 - inset);
            ctx.moveTo(m1 - inset, m0 + inset);
            ctx.lineTo(m0 + inset, m1 - inset);
            ctx.stroke();

            // Small specular point.
            const spark = ctx.createRadialGradient(c - 14, c - 14, 1, c - 14, c - 14, 16);
            spark.addColorStop(0, 'rgba(255,255,255,0.9)');
            spark.addColorStop(1, 'rgba(255,255,255,0.0)');
            ctx.fillStyle = spark;
            ctx.fillRect(c - 30, c - 30, 40, 40);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        return texture;
    }

    _createBumpTexture(letter) {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Mid gray base.
        ctx.fillStyle = 'rgb(120,120,120)';
        ctx.fillRect(0, 0, size, size);

        if (FACE_MARKER[letter]) {
            const markerSize = 74;
            const markerPos = Math.floor((size - markerSize) / 2);
            const c = markerPos + markerSize * 0.5;

            // Bright dome gives visible "protrusion" via bump mapping.
            const dome = ctx.createRadialGradient(c, c, 6, c, c, markerSize * 0.55);
            dome.addColorStop(0.00, 'rgb(255,255,255)');
            dome.addColorStop(0.60, 'rgb(218,218,218)');
            dome.addColorStop(1.00, 'rgb(132,132,132)');
            ctx.fillStyle = dome;
            ctx.fillRect(markerPos - 4, markerPos - 4, markerSize + 8, markerSize + 8);

            // Facet ridges in height map.
            ctx.strokeStyle = 'rgb(236,236,236)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(c, markerPos + 2);
            ctx.lineTo(c, markerPos + markerSize - 2);
            ctx.moveTo(markerPos + 2, c);
            ctx.lineTo(markerPos + markerSize - 2, c);
            ctx.stroke();
        }

        const bump = new THREE.CanvasTexture(canvas);
        bump.needsUpdate = true;
        return bump;
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

    _getBumpTexture(letter) {
        const key = FACE_MARKER[letter] ? letter : 'h';
        if (this._bumpByLetter.has(key)) {
            return this._bumpByLetter.get(key);
        }

        const bump = this._createBumpTexture(key);
        this._bumpByLetter.set(key, bump);
        return bump;
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
                'float shimmerA = 0.5 + 0.5 * sin(vGoldWorldPos.x * 4.6 + uGoldTime * 1.7);\n'
                + 'float shimmerB = 0.5 + 0.5 * sin(vGoldWorldPos.y * 6.3 - uGoldTime * 1.2);\n'
                + 'float shimmer = (shimmerA * 0.6 + shimmerB * 0.4) * 0.22;\n'
                + 'vec3 goldSheen = vec3(1.00, 0.86, 0.45);\n'
                + 'outgoingLight += goldSheen * shimmer;\n'
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
                        bumpMap: mat.bumpMap,
                        bumpScale: mat.bumpScale,
                        onBeforeCompile: mat.onBeforeCompile,
                        customProgramCacheKey: mat.customProgramCacheKey,
                        goldenShimmerInstalled: mat.userData.goldenShimmerInstalled,
                    });
                }

                mat.map = this._getFaceTexture(mat.name);
                mat.bumpMap = this._getBumpTexture(mat.name);
                mat.bumpScale = mat.name === 'h' ? 0.03 : 0.10;
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
    }

    _disposeTextures() {
        for (const texture of this._albedoByLetter.values()) {
            texture.dispose();
        }
        for (const texture of this._bumpByLetter.values()) {
            texture.dispose();
        }
        this._albedoByLetter.clear();
        this._bumpByLetter.clear();
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
                mat.bumpMap = state.bumpMap;
                mat.bumpScale = state.bumpScale;
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
        this._time += 0.016;
        for (const mats of this.cube.materialsByObjectId.values()) {
            for (const mat of mats) {
                const timeUniform = this._shaderTimeByMaterial.get(mat);
                if (timeUniform) {
                    timeUniform.value = this._time;
                }
            }
        }
    }

    detach() {
        this._restoreMaterials();
        this._disposeTextures();
    }

    onMaterialChange() {
        // Keep the golden look stable even when global material sliders change.
        this._applyGoldenMaterials();
    }
}
