import * as THREE from 'three';
import { BaseSkin } from './BaseSkin.js';

// ── Shared resources ──────────────────────────────────────────────────────────

/** Soft radial-gradient sprite texture shared across all LanternSkin instances. */
let _spriteTexture = null;

function getSpriteTexture() {
    if (_spriteTexture) return _spriteTexture;

    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width  = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cx  = size / 2;

    // Gaussian-like soft falloff — looks like a "cloud" not a sharp sphere
    const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
    grad.addColorStop(0.00, 'rgba(255,255,255,1.00)');
    grad.addColorStop(0.20, 'rgba(255,255,255,0.80)');
    grad.addColorStop(0.50, 'rgba(255,255,255,0.30)');
    grad.addColorStop(0.80, 'rgba(255,255,255,0.06)');
    grad.addColorStop(1.00, 'rgba(255,255,255,0.00)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    _spriteTexture = new THREE.CanvasTexture(canvas);
    return _spriteTexture;
}

// Color of the inner glow per face letter
const COLOR_PALETTE = {
    r: 0xff4d4d,
    o: 0xffb347,
    g: 0x49ff8c,
    b: 0x4b78ff,
    w: 0xe4e9ff,
    y: 0xfff56b,
};

// Emissive tint per face letter
const EMISSIVE_PALETTE = {
    r: 0x5b1313,
    o: 0x744114,
    g: 0x0e4f25,
    b: 0x12388c,
    w: 0x6c728f,
    y: 0x6e6b19,
};

// Hard bounds to keep ember visual inside a cubie.
const EMBER_RENDER_MIN = 0.06;
const EMBER_RENDER_MAX = 0.49;

// ── LanternSkin ───────────────────────────────────────────────────────────────

/**
 * Lantern skin — semi-transparent faces with pulsating inner soft-glow sprites.
 *
 * Parameters (read from cube.* on construction, then kept in sync via setParams):
 *   opacity          0.20 – 0.90   face transparency
 *   lightIntensity   0.05 – 1.80   point-light + emissive brightness
 *   pulseSpeed       0.10 – 5.00   pulsation multiplier
 *   emberSize        0.08 – 0.40   base glow size (kept inside cubie bounds)
 *   showEmbers       boolean        whether the glow sprites are visible
 */
export class LanternSkin extends BaseSkin {
    static createPreview(context = {}) {
        return BaseSkin.createPreview(context);
    }

    constructor(cube) {
        super(cube);
        this.opacity        = cube.config.runtime?.lantern?.opacity ?? 0.58;
        this.lightIntensity = cube.config.runtime?.lantern?.lightIntensity ?? 0.52;
        this.pulseSpeed     = cube.config.runtime?.lantern?.pulseSpeed ?? 1.0;
        this.emberSize      = cube.config.runtime?.lantern?.emberSize ?? 0.16;
        this.showEmbers     = cube.config.runtime?.lantern?.showEmbers ?? true;
        this._embers = [];
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    _averageColor(materials) {
        const visible = materials
            .map((m) => COLOR_PALETTE[m.name])
            .filter((hex) => hex !== undefined);
        if (!visible.length) return 0x222222;
        const c = new THREE.Color(0, 0, 0);
        for (const hex of visible) c.add(new THREE.Color(hex));
        c.multiplyScalar(1 / visible.length);
        return c.getHex();
    }

    _applyMaterials() {
        for (const mats of this.cube.materialsByObjectId.values()) {
            for (const mat of mats) {
                mat.metalness = this.cube.config.cube.textures.metalness;
                mat.roughness = this.cube.config.cube.textures.roughness;
                if (mat.name === 'h') {
                    mat.transparent       = false;
                    mat.opacity           = 1;
                    mat.depthWrite        = true;
                    mat.emissive.setHex(0x000000);
                    mat.emissiveIntensity = 0;
                } else {
                    mat.transparent       = true;
                    mat.opacity           = this.opacity;
                    mat.depthWrite        = false;
                    mat.emissive.setHex(EMISSIVE_PALETTE[mat.name] ?? 0x000000);
                    mat.emissiveIntensity = Math.min(1.2, 0.2 + this.lightIntensity * 0.45);
                }
                mat.needsUpdate = true;
            }
        }
    }

    _buildEmbers() {
        this._clearEmbers();
        const texture = getSpriteTexture();

        for (const cubieMesh of this.cube.cubeMeshList) {
            const mats = this.cube.materialsByObjectId.get(cubieMesh.id) ?? cubieMesh.material;
            if (!mats.some((m) => m.name !== 'h')) continue;

            const color = this._averageColor(mats);

            // PointLight for room-lighting effect on adjacent faces
            const light = new THREE.PointLight(color, this.lightIntensity, 1.8, 1.9);
            cubieMesh.add(light);

            // Soft-glow sprite — looks like a small cloud / ember
            const sprite = new THREE.Sprite(
                new THREE.SpriteMaterial({
                    map:             texture,
                    color:           color,
                    transparent:     true,
                    opacity:         this.showEmbers ? 0.8 : 0,
                    blending:        THREE.AdditiveBlending,
                    depthWrite:      false,
                    sizeAttenuation: true,
                })
            );
            const baseSize = Math.min(0.4, Math.max(0.08, this.emberSize));
            sprite.scale.set(baseSize, baseSize, 1);
            sprite.visible = this.showEmbers;
            cubieMesh.add(sprite);

            this._embers.push({
                sprite,
                light,
                phase:        Math.random() * Math.PI * 2,
                relSpeed:     1.6 + Math.random() * 1.4,   // multiplied by this.pulseSpeed
                relIntensity: 0.82 + Math.random() * 0.36, // multiplied by this.lightIntensity
                relScale:     0.82 + Math.random() * 0.32,
            });
        }
    }

    _clearEmbers() {
        for (const e of this._embers) {
            e.light.parent?.remove(e.light);
            e.sprite.parent?.remove(e.sprite);
            e.sprite.material.dispose();
        }
        this._embers = [];
    }

    // ── BaseSkin interface ────────────────────────────────────────────────────

    apply() {
        this._applyMaterials();
        this._buildEmbers();
    }

    detach() {
        this._clearEmbers();
        // Restore default material state so the next skin starts clean
        for (const mats of this.cube.materialsByObjectId.values()) {
            for (const mat of mats) {
                mat.transparent       = false;
                mat.opacity           = 1;
                mat.depthWrite        = true;
                mat.emissive.setHex(0x000000);
                mat.emissiveIntensity = 0;
                mat.needsUpdate       = true;
            }
        }
    }

    update() {
        if (!this._embers.length) return;
        const time = performance.now() * 0.0025;

        for (const e of this._embers) {
            const speed = e.relSpeed * this.pulseSpeed;
            const p1    = 0.76 + 0.24 * Math.sin(time * speed       + e.phase);
            const p2    = 0.90 + 0.10 * Math.sin(time * 3.1         + e.phase * 0.7);
            const pulse = p1 * p2;

            e.light.intensity = Math.max(0.06, this.lightIntensity * e.relIntensity * pulse);

            e.sprite.visible = this.showEmbers;
            if (this.showEmbers) {
                e.sprite.material.opacity = Math.min(0.95, 0.35 + pulse * 0.58);
                const pulseScale = 0.72 + pulse * 0.56;
                const rawScale = this.emberSize * pulseScale * e.relScale;
                const s = Math.min(EMBER_RENDER_MAX, Math.max(EMBER_RENDER_MIN, rawScale));
                e.sprite.scale.set(s, s, 1);
            }
        }
    }

    onMaterialChange() {
        this._applyMaterials();
    }

    /** @param {{ opacity, lightIntensity, pulseSpeed, emberSize, showEmbers }} params */
    setParams({ opacity, lightIntensity, pulseSpeed, emberSize, showEmbers }) {
        this.opacity        = opacity;
        this.lightIntensity = lightIntensity;
        this.pulseSpeed     = pulseSpeed;
        this.emberSize      = Math.min(0.4, Math.max(0.08, emberSize));
        this.showEmbers     = showEmbers;
        this._applyMaterials();
        // update() reads this.lightIntensity/pulseSpeed/showEmbers each frame — no rebuild needed
    }
}
