import * as THREE from 'three';
import { BaseSkin } from './BaseSkin.js';

const GOLD_COLOR = new THREE.Color('#d9b24c');
const GOLD_EMISSIVE = new THREE.Color('#4a3300');
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
        this._textureByLetter = new Map();
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

        // Inner golden panel so the face reads like a tile, similar to classical stickers.
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.fillRect(26, 26, size - 52, size - 52);
        ctx.fillStyle = '#d8ae45';
        ctx.fillRect(32, 32, size - 64, size - 64);

        const marker = FACE_MARKER[letter];
        if (marker) {
            const markerSize = 58;
            const markerPos = Math.floor((size - markerSize) / 2);
            ctx.fillStyle = marker;
            ctx.fillRect(markerPos, markerPos, markerSize, markerSize);

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.30)';
            ctx.lineWidth = 4;
            ctx.strokeRect(markerPos + 2, markerPos + 2, markerSize - 4, markerSize - 4);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        return texture;
    }

    _getFaceTexture(letter) {
        const key = FACE_MARKER[letter] ? letter : 'h';
        if (this._textureByLetter.has(key)) {
            return this._textureByLetter.get(key);
        }

        const tex = this._createFaceTexture(key);
        this._textureByLetter.set(key, tex);
        return tex;
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
                mat.needsUpdate = true;
            }
        }
    }

    _disposeTextures() {
        for (const texture of this._textureByLetter.values()) {
            texture.dispose();
        }
        this._textureByLetter.clear();
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
                mat.needsUpdate = true;
            }
        }
    }

    apply() {
        this._applyGoldenMaterials();
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
