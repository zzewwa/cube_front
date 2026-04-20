import * as THREE from 'three';
import { BaseSkin } from './BaseSkin.js';

/**
 * Magic 8-Ball skin.
 * Rotation-safe implementation: works through face materials only,
 * preserving material names so cube logic and remapping continue to work.
 */
export class Magic8BallSkin extends BaseSkin {
    static createPreview(context = {}) {
        return BaseSkin.createPreview(context);
    }

    constructor(cube) {
        super(cube);
        this._visualMaterialsByMeshId = new Map();
        this._faceSignatureByMeshId = new Map();
        this._textureByLetter = new Map();

        this._predictionsByLetter = {
            r: 'YES',
            o: 'NO',
            g: 'MAYBE',
            b: 'ASK',
            w: 'LATER',
            y: 'TRY',
            h: ''
        };

        this._colorByLetter = {
            r: 0xff2b2b,
            o: 0xff8a00,
            g: 0x26f75d,
            b: 0x1f6fff,
            w: 0xffffff,
            y: 0xffe100,
            h: 0x0a0a0a
        };
    }

    _normalizeLetter(letter) {
        const value = (letter || 'h').toLowerCase();
        return this._colorByLetter[value] !== undefined ? value : 'h';
    }

    _getLogicalMaterials(mesh) {
        return this.cube.materialsByObjectId.get(mesh.id) || mesh.material;
    }

    _getFaceLetters(mesh) {
        const mats = this._getLogicalMaterials(mesh);
        if (!Array.isArray(mats) || mats.length < 6) {
            return ['h', 'h', 'h', 'h', 'h', 'h'];
        }
        return mats.map((m) => this._normalizeLetter(m?.name));
    }

    _isLogicalStateCorrupted() {
        let namedFaces = 0;
        for (const mesh of this.cube.cubeMeshList) {
            const letters = this._getFaceLetters(mesh);
            for (const letter of letters) {
                if (letter !== 'h') namedFaces += 1;
            }
        }
        return namedFaces === 0;
    }

    _rebuildLogicalStateToSolved() {
        const maxCoord = Math.trunc(this.cube.config.cube.size / 2);
        const minCoord = -maxCoord;

        for (const mesh of this.cube.cubeMeshList) {
            const x = Math.round(mesh.position.x);
            const y = Math.round(mesh.position.y);
            const z = Math.round(mesh.position.z);
            const logical = this.cube.createCubieMaterials(this.cube.materialPalette, x, y, z, minCoord, maxCoord);
            this.cube.materialsByObjectId.set(mesh.id, logical);
        }
    }

    _normalizeQuarterTurns(value) {
        const normalized = value % 4;
        return normalized < 0 ? normalized + 4 : normalized;
    }

    _createFaceTexture(letter, faceIndex, quarterTurns = 0) {
        const q = this._normalizeQuarterTurns(quarterTurns);
        const cacheKey = `${letter}|${faceIndex}|${q}`;
        if (this._textureByLetter.has(cacheKey)) {
            return this._textureByLetter.get(cacheKey);
        }

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, 512, 512);

        if (letter !== 'h') {
            // Strict equilateral triangle centered by centroid
            const cx = 256;
            const cy = 256;
            const side = 290;
            const h = side * Math.sqrt(3) / 2;

            const topX = cx;
            const topY = cy - (2 * h) / 3;
            const rightX = cx + side / 2;
            const rightY = cy + h / 3;
            const leftX = cx - side / 2;
            const leftY = cy + h / 3;

            const colorHex = this._colorByLetter[letter] ?? 0xffffff;
            ctx.fillStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
            ctx.beginPath();
            ctx.moveTo(topX, topY);
            ctx.lineTo(rightX, rightY);
            ctx.lineTo(leftX, leftY);
            ctx.closePath();
            ctx.fill();

            const text = this._predictionsByLetter[letter] ?? '';
            if (text) {
                ctx.font = 'bold 68px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.lineWidth = 10;
                ctx.strokeStyle = 'rgba(0,0,0,0.95)';
                ctx.fillStyle = '#ffffff';
                ctx.strokeText(text, cx, cy + 8);
                ctx.fillText(text, cx, cy + 8);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.center.set(0.5, 0.5);

        // Per-face orientation correction (material indices: +X, -X, +Y, -Y, +Z, -Z)
        const faceRotation = [
            -Math.PI / 2, // +X
            Math.PI / 2,  // -X
            Math.PI,      // +Y
            0,            // -Y
            0,            // +Z
            0             // -Z (yellow) - flipped
        ];
        texture.rotation = (faceRotation[faceIndex] ?? 0) + q * (Math.PI / 2);
        texture.needsUpdate = true;
        this._textureByLetter.set(cacheKey, texture);
        return texture;
    }

    _createMagicMaterial(letter, faceIndex, quarterTurns = 0) {
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x000000,
            emissiveIntensity: 0,
            transparent: false,
            opacity: 1,
            map: this._createFaceTexture(letter, faceIndex, quarterTurns)
        });

        material.name = letter;
        return material;
    }

    _buildVisualMaterials(faceLetters, quarterTurns) {
        return faceLetters.map((letter, faceIndex) => this._createMagicMaterial(letter, faceIndex, quarterTurns[faceIndex] ?? 0));
    }

    _disposeVisualMaterials(materials) {
        if (!Array.isArray(materials)) return;
        for (const mat of materials) {
            mat?.dispose?.();
        }
    }

    _ensureVisual(mesh, force = false) {
        const faceLetters = this._getFaceLetters(mesh);
        const quarterTurns = this.cube.faceOrientationEngine.getFaceQuarterTurns(mesh.id);
        const signature = `${faceLetters.join('|')}::${quarterTurns.join('|')}`;

        let visualMaterials = this._visualMaterialsByMeshId.get(mesh.id);
        const prevSignature = this._faceSignatureByMeshId.get(mesh.id);

        if (!visualMaterials || force || prevSignature !== signature) {
            this._disposeVisualMaterials(visualMaterials);
            visualMaterials = this._buildVisualMaterials(faceLetters, quarterTurns);
            this._visualMaterialsByMeshId.set(mesh.id, visualMaterials);
            this._faceSignatureByMeshId.set(mesh.id, signature);
        }

        if (mesh.material !== visualMaterials) {
            mesh.material = visualMaterials;
        }
    }

    apply() {
        // If previous buggy skin versions erased names, recover a valid logical state.
        if (this._isLogicalStateCorrupted()) {
            this._rebuildLogicalStateToSolved();
        }

        this.cube.faceOrientationEngine.ensureAllCubiesInitialized();

        for (const mesh of this.cube.cubeMeshList) {
            this._ensureVisual(mesh, true);
        }
    }

    update() {
        for (const mesh of this.cube.cubeMeshList) {
            this._ensureVisual(mesh, false);
        }
    }

    detach() {
        for (const mesh of this.cube.cubeMeshList) {
            const visual = this._visualMaterialsByMeshId.get(mesh.id);
            this._disposeVisualMaterials(visual);

            const logical = this._getLogicalMaterials(mesh);
            if (Array.isArray(logical)) {
                mesh.material = logical;
            }
        }

        this._visualMaterialsByMeshId.clear();
        this._faceSignatureByMeshId.clear();
    }

    onMaterialChange() {
        for (const mats of this._visualMaterialsByMeshId.values()) {
            for (const mat of mats) {
                mat.metalness = 0.8;
                mat.roughness = 0.2;
                mat.needsUpdate = true;
            }
        }
    }

    setParams(_params) {}
}
