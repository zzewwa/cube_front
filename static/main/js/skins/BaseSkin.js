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
     * Called after cube._metalness / cube._roughness change.
     * Default implementation propagates the new values to all materials.
     */
    onMaterialChange() {
        for (const mats of this.cube.materialsByObjectId.values()) {
            for (const mat of mats) {
                mat.metalness = this.cube._metalness;
                mat.roughness = this.cube._roughness;
                mat.needsUpdate = true;
            }
        }
    }

    /**
     * Called when skin-specific settings are updated from the UI.
     * @param {object} _params - skin-specific parameter bag
     */
    setParams(_params) {}
}
