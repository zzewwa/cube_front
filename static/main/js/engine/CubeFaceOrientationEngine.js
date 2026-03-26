import * as THREE from 'three';

export class CubeFaceOrientationEngine {
    constructor(cube) {
        this.cube = cube;
        this._faceQuarterTurnsByMeshId = new Map();
    }

    _normalizeQuarterTurns(value) {
        const normalized = value % 4;
        return normalized < 0 ? normalized + 4 : normalized;
    }

    _getFaceRotationQuarterTurns() {
        return [-1, 1, 2, 0, 0, 0];
    }

    _getFaceNormal(faceIndex) {
        const normals = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1)
        ];
        return normals[faceIndex]?.clone() || new THREE.Vector3(0, 0, 1);
    }

    _getRotationAxisVector(axis) {
        if (axis === 'x') return new THREE.Vector3(1, 0, 0);
        if (axis === 'y') return new THREE.Vector3(0, 1, 0);
        return new THREE.Vector3(0, 0, 1);
    }

    _getDefaultTextureUp(faceIndex) {
        const upVectors = [
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0, -1),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 1, 0)
        ];
        return upVectors[faceIndex]?.clone() || new THREE.Vector3(0, 1, 0);
    }

    _roundVector(vector) {
        return new THREE.Vector3(
            Math.round(vector.x),
            Math.round(vector.y),
            Math.round(vector.z)
        );
    }

    _rotateQuarterVector(vector, axisVector, quarterTurns) {
        const normalizedTurns = this._normalizeQuarterTurns(quarterTurns);
        return this._roundVector(
            vector.clone().applyAxisAngle(axisVector, normalizedTurns * (Math.PI / 2))
        );
    }

    _vectorKey(vector) {
        return `${Math.round(vector.x)},${Math.round(vector.y)},${Math.round(vector.z)}`;
    }

    _getBaseUpVector(faceIndex) {
        const normal = this._getFaceNormal(faceIndex);
        const defaultUp = this._getDefaultTextureUp(faceIndex);
        const baseQuarterTurns = this._getFaceRotationQuarterTurns()[faceIndex] ?? 0;
        return this._rotateQuarterVector(defaultUp, normal, baseQuarterTurns);
    }

    _getOrientedUpVector(faceIndex, quarterTurns) {
        const normal = this._getFaceNormal(faceIndex);
        const baseUp = this._getBaseUpVector(faceIndex);
        return this._rotateQuarterVector(baseUp, normal, quarterTurns);
    }

    _findQuarterTurnsForUpVector(faceIndex, targetUp) {
        const targetKey = this._vectorKey(targetUp);
        for (let quarterTurns = 0; quarterTurns < 4; quarterTurns++) {
            const candidate = this._getOrientedUpVector(faceIndex, quarterTurns);
            if (this._vectorKey(candidate) === targetKey) {
                return quarterTurns;
            }
        }
        return 0;
    }

    ensureAllCubiesInitialized() {
        for (const mesh of this.cube.cubeMeshList) {
            if (!this._faceQuarterTurnsByMeshId.has(mesh.id)) {
                this._faceQuarterTurnsByMeshId.set(mesh.id, [0, 0, 0, 0, 0, 0]);
            }
        }
    }

    clear() {
        this._faceQuarterTurnsByMeshId.clear();
    }

    getFaceQuarterTurns(meshId) {
        const existing = this._faceQuarterTurnsByMeshId.get(meshId);
        if (existing) {
            return existing;
        }

        const initial = [0, 0, 0, 0, 0, 0];
        this._faceQuarterTurnsByMeshId.set(meshId, initial);
        return initial;
    }

    setFaceQuarterTurns(meshId, faceTurns) {
        const normalized = Array.from({ length: 6 }, (_, faceIndex) => {
            const value = Array.isArray(faceTurns) ? Number(faceTurns[faceIndex]) || 0 : 0;
            return this._normalizeQuarterTurns(value);
        });
        this._faceQuarterTurnsByMeshId.set(meshId, normalized);
    }

    onCubieRemap(mesh, remap, rotationAxis, sign) {
        const oldTurns = this.getFaceQuarterTurns(mesh.id);
        const newTurns = [0, 0, 0, 0, 0, 0];
        const axisVector = this._getRotationAxisVector(rotationAxis);

        for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
            const sourceIndex = remap[faceIndex] ?? faceIndex;
            const prev = oldTurns[sourceIndex] ?? 0;
            const sourceUp = this._getOrientedUpVector(sourceIndex, prev);
            const rotatedUp = this._rotateQuarterVector(sourceUp, axisVector, sign);
            newTurns[faceIndex] = this._findQuarterTurnsForUpVector(faceIndex, rotatedUp);
        }

        this._faceQuarterTurnsByMeshId.set(mesh.id, newTurns);
    }

    exportState() {
        const cubes = this.cube.getSortedCubes?.() || [...this.cube.cubeMeshList];
        return {
            version: 1,
            quarterTurns: cubes.map((mesh) => this.getFaceQuarterTurns(mesh.id).map((value) => this._normalizeQuarterTurns(value)))
        };
    }

    importState(state) {
        if (!state || !Array.isArray(state.quarterTurns)) {
            return false;
        }

        const cubes = this.cube.getSortedCubes?.() || [...this.cube.cubeMeshList];
        if (state.quarterTurns.length !== cubes.length) {
            return false;
        }

        for (let index = 0; index < cubes.length; index++) {
            this.setFaceQuarterTurns(cubes[index].id, state.quarterTurns[index]);
        }

        return true;
    }

    importLegacyMagic8BallState(state) {
        if (!state || state.skinId !== 'magic8ball' || !Array.isArray(state.quarterTurns)) {
            return false;
        }

        return this.importState({ quarterTurns: state.quarterTurns });
    }
}
