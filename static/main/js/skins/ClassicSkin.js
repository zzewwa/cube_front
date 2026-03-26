import { BaseSkin } from './BaseSkin.js';

/**
 * Classic skin — standard opaque faces with no extra effects.
 * Serves as the default / fallback skin.
 */
export class ClassicSkin extends BaseSkin {
    apply() {
        for (const mats of this.cube.materialsByObjectId.values()) {
            for (const mat of mats) {
                mat.transparent       = false;
                mat.opacity           = 1;
                mat.depthWrite        = true;
                mat.emissive.setHex(0x000000);
                mat.emissiveIntensity = 0;
                mat.metalness         = this.cube._metalness;
                mat.roughness         = this.cube._roughness;
                mat.needsUpdate       = true;
            }
        }
    }
}
