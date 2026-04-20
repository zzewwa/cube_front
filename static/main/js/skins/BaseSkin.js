/**
 * Base class for all cube skins.
 *
 * To add a new skin:
 *   1. Create a new file in this folder extending BaseSkin.
 *   2. Import it in cube.js and add to SKIN_REGISTRY.
 */
export class BaseSkin {
    /** @param {object} cube - RubiksCube instance */
    constructor(cube) {
        this.cube = cube;
    }

    /** Called once when this skin becomes active. */
    apply() {}

    /** Called when this skin is replaced; remove all side effects. */
    detach() {}

    /** Called every animation frame. */
    update() {}

    /**
     * Called when cube state is persisted.
     * Return serializable plain object (or null) with skin-specific state.
     */
    getPersistentState() {
        return null;
    }

    /**
     * Called when cube state is restored.
     * @param {object|null} _state
     * @returns {boolean} true if state consumed by this skin
     */
    applyPersistentState(_state) {
        return false;
    }

    /**
     * Called when cube remaps a cubie materials after a completed turn.
     * @param {THREE.Mesh} _mesh
     * @param {number[]} _remap
     * @param {'x'|'y'|'z'} _axis
     * @param {1|-1} _sign
     */
    onCubieRemap(_mesh, _remap, _axis, _sign) {}

    /**
     * Called after cube material settings change.
     * Default implementation propagates the new values to all materials.
     */
    onMaterialChange() {
        for (const mats of this.cube.materialsByObjectId.values()) {
            for (const mat of mats) {
                mat.metalness = this.cube.config.cube.textures.metalness;
                mat.roughness = this.cube.config.cube.textures.roughness;
                mat.needsUpdate = true;
            }
        }
    }

    /**
     * Called when skin-specific settings are updated from the UI.
     * @param {object} _params - skin-specific parameter bag
     */
    setParams(_params) {}

    /**
     * Build a skin preview inside an external container.
     * @param {{ previewFactory?: Function }} context
     * @returns {{ destroy?: Function }|null}
     */
    static createPreview(context = {}) {
        if (typeof context.previewFactory !== 'function') {
            return null;
        }
        return context.previewFactory();
    }
}
