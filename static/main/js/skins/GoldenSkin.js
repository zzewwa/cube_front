import * as THREE from 'three';
import { BaseSkin } from './BaseSkin.js';

const GOLD_COLOR = new THREE.Color('#d9b24c');
const GOLD_EMISSIVE = new THREE.Color('#4a3300');
const HIDDEN_COLOR = new THREE.Color('#0a0a0a');

export class GoldenSkin extends BaseSkin {
    constructor(cube) {
        super(cube);
        this._originalState = new WeakMap();
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

                const hidden = mat.name === 'h';
                mat.map = null;
                mat.color.copy(hidden ? HIDDEN_COLOR : GOLD_COLOR);
                mat.emissive.copy(hidden ? HIDDEN_COLOR : GOLD_EMISSIVE);
                mat.emissiveIntensity = hidden ? 0 : 0.12;
                mat.transparent = false;
                mat.opacity = 1;
                mat.depthWrite = true;
                mat.metalness = hidden ? 0.05 : 0.92;
                mat.roughness = hidden ? 0.95 : 0.22;
                mat.needsUpdate = true;
            }
        }
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
    }

    onMaterialChange() {
        // Keep the golden look stable even when global material sliders change.
        this._applyGoldenMaterials();
    }
}
