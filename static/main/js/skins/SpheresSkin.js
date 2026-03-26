import * as THREE from 'three';
import { BaseSkin } from './BaseSkin.js';

export class SpheresSkin extends BaseSkin {
    constructor(cube) {
        super(cube);
        this._originalGeometryByMeshId = new Map();
        this._sphereGeometryByMeshId = new Map();
        this._sphereMaterialByMeshId = new Map();
        this._faceSignatureByMeshId = new Map();
        this.radius = cube.spheresRadius ?? 0.56;
        this._namedColor = {
            r: new THREE.Color('#ff2b2b'),
            o: new THREE.Color('#ff8a00'),
            g: new THREE.Color('#26f75d'),
            b: new THREE.Color('#1f6fff'),
            w: new THREE.Color('#ffffff'),
            y: new THREE.Color('#ffe100'),
            h: new THREE.Color('#000000')
        };
    }

    _createSphereGeometry() {
        return new THREE.SphereGeometry(this.radius, 28, 18);
    }

    _getLogicalMaterials(mesh) {
        return this.cube.materialsByObjectId.get(mesh.id) || mesh.material;
    }

    _getFaceNames(mesh) {
        const mats = this._getLogicalMaterials(mesh);
        if (!Array.isArray(mats) || mats.length < 6) {
            return ['h', 'h', 'h', 'h', 'h', 'h'];
        }
        return mats.map((m) => m?.name ?? 'h');
    }

    _buildVertexGradient(geometry, faceNames) {
        const position = geometry.attributes.position;
        const colorArray = new Float32Array(position.count * 3);

        const faceColors = [
            this._namedColor[faceNames[0]] ?? this._namedColor.h, // +X
            this._namedColor[faceNames[1]] ?? this._namedColor.h, // -X
            this._namedColor[faceNames[2]] ?? this._namedColor.h, // +Y
            this._namedColor[faceNames[3]] ?? this._namedColor.h, // -Y
            this._namedColor[faceNames[4]] ?? this._namedColor.h, // +Z
            this._namedColor[faceNames[5]] ?? this._namedColor.h  // -Z
        ];

        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = position.getZ(i);

            const invLen = 1 / Math.max(1e-6, Math.hypot(x, y, z));
            const nx = x * invLen;
            const ny = y * invLen;
            const nz = z * invLen;

            const w = [
                Math.pow(Math.max(nx, 0), 1.4),
                Math.pow(Math.max(-nx, 0), 1.4),
                Math.pow(Math.max(ny, 0), 1.4),
                Math.pow(Math.max(-ny, 0), 1.4),
                Math.pow(Math.max(nz, 0), 1.4),
                Math.pow(Math.max(-nz, 0), 1.4)
            ];

            const ws = w[0] + w[1] + w[2] + w[3] + w[4] + w[5] || 1;

            let r = 0;
            let g = 0;
            let b = 0;
            for (let k = 0; k < 6; k++) {
                const wk = w[k] / ws;
                r += faceColors[k].r * wk;
                g += faceColors[k].g * wk;
                b += faceColors[k].b * wk;
            }

            const p = i * 3;
            colorArray[p] = r;
            colorArray[p + 1] = g;
            colorArray[p + 2] = b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
        geometry.attributes.color.needsUpdate = true;
    }

    _ensureSphereVisual(mesh, forceColors = false) {
        const faceNames = this._getFaceNames(mesh);
        const signature = faceNames.join('|');

        let sphereGeometry = this._sphereGeometryByMeshId.get(mesh.id);
        if (!sphereGeometry) {
            sphereGeometry = this._createSphereGeometry();
            this._sphereGeometryByMeshId.set(mesh.id, sphereGeometry);
            mesh.geometry = sphereGeometry;
            forceColors = true;
        } else if (mesh.geometry !== sphereGeometry) {
            mesh.geometry = sphereGeometry;
            forceColors = true;
        }

        let sphereMaterial = this._sphereMaterialByMeshId.get(mesh.id);
        if (!sphereMaterial) {
            sphereMaterial = new THREE.MeshStandardMaterial({
                vertexColors: true,
                metalness: this.cube._metalness,
                roughness: this.cube._roughness
            });
            this._sphereMaterialByMeshId.set(mesh.id, sphereMaterial);
        }
        sphereMaterial.metalness = this.cube._metalness;
        sphereMaterial.roughness = this.cube._roughness;
        sphereMaterial.needsUpdate = true;

        if (mesh.material !== sphereMaterial) {
            mesh.material = sphereMaterial;
        }

        const prevSignature = this._faceSignatureByMeshId.get(mesh.id);
        if (forceColors || prevSignature !== signature) {
            this._buildVertexGradient(sphereGeometry, faceNames);
            this._faceSignatureByMeshId.set(mesh.id, signature);
        }
    }

    _applyMaterialState() {
        for (const material of this._sphereMaterialByMeshId.values()) {
            material.metalness = this.cube._metalness;
            material.roughness = this.cube._roughness;
            material.needsUpdate = true;
        }
    }

    apply() {
        this._originalGeometryByMeshId.clear();
        for (const mesh of this.cube.cubeMeshList) {
            this._originalGeometryByMeshId.set(mesh.id, mesh.geometry);
            this._ensureSphereVisual(mesh, true);
        }

        this._applyMaterialState();
    }

    detach() {
        for (const mesh of this.cube.cubeMeshList) {
            const original = this._originalGeometryByMeshId.get(mesh.id);
            if (original) {
                mesh.geometry = original;
            }

            const logicalMaterials = this.cube.materialsByObjectId.get(mesh.id);
            if (logicalMaterials) {
                mesh.material = logicalMaterials;
            }
        }
        this._originalGeometryByMeshId.clear();

        for (const geometry of this._sphereGeometryByMeshId.values()) {
            geometry.dispose();
        }
        for (const material of this._sphereMaterialByMeshId.values()) {
            material.dispose();
        }
        this._sphereGeometryByMeshId.clear();
        this._sphereMaterialByMeshId.clear();
        this._faceSignatureByMeshId.clear();
    }

    onMaterialChange() {
        this._applyMaterialState();
    }

    setParams({ spheresRadius }) {
        if (spheresRadius === undefined) {
            return;
        }

        const nextRadius = Math.min(0.72, Math.max(0.42, Number(spheresRadius)));
        if (Math.abs(nextRadius - this.radius) < 1e-6) {
            return;
        }

        this.radius = nextRadius;

        for (const mesh of this.cube.cubeMeshList) {
            const oldGeometry = this._sphereGeometryByMeshId.get(mesh.id);
            oldGeometry?.dispose();

            const geometry = this._createSphereGeometry();
            this._sphereGeometryByMeshId.set(mesh.id, geometry);
            mesh.geometry = geometry;
            this._ensureSphereVisual(mesh, true);
        }
    }

    update() {
        for (const mesh of this.cube.cubeMeshList) {
            this._ensureSphereVisual(mesh, false);
        }
    }
}
