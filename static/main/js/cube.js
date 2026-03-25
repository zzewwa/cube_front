/**
 * Rubik's Cube 3D visualization and controls
 * Manages Three.js scene, cube creation, and keyboard navigation
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CUBE_CONFIG } from './cube-config.js';

export class RubiksCube {
    constructor(containerSelector, cubeCookies = null) {
        this.container = document.querySelector(containerSelector);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        this.config = CUBE_CONFIG;
        this.scene_color = this.config.scene.backgroundColor;
        this.position_of_cubes = new Map();
        this.materialsByObjectId = new Map();
        this.materialPalette = null;
        this.cubeCookies = cubeCookies;

        this.cubeRoot = new THREE.Group();
        this.cubeMeshList = [];
        this.cubeNetVisible = true;
        this.cubeNetWidget = null;
        this.cubeNetStickers = {
            u: [],
            l: [],
            f: [],
            r: [],
            b: [],
            d: []
        };

        // Slower and smoother quarter-turn animation
        this.stepsPerTurn = this.config.rotation.stepsPerTurn;
        this.stepAngle = Math.PI / (2 * this.stepsPerTurn);
        this.generalQueue = [];
        this.activeGeneralRotation = null;
        this.undoHistory = [];
        this.maxUndoHistory = 50;
        this.generalRotations = [
            {
                time: 0,
                axis: 'x',
                sign: -1,
                change: [7, 16, 25, 4, 13, 22, 1, 10, 19, 1, 4, 7, 10, 13, 16, 19, 22, 25],
                materials: [0, 1, 4, 5, 3, 2]
            },
            {
                time: 1,
                axis: 'x',
                sign: 1,
                change: [1, 4, 7, 10, 13, 16, 19, 22, 25, 7, 16, 25, 4, 13, 22, 1, 10, 19],
                materials: [0, 1, 5, 4, 2, 3]
            },
            {
                time: 2,
                axis: 'z',
                sign: 1,
                change: [1, 2, 3, 4, 5, 6, 7, 8, 9, 3, 6, 9, 2, 5, 8, 1, 4, 7],
                materials: [3, 2, 0, 1, 4, 5]
            },
            {
                time: 3,
                axis: 'z',
                sign: -1,
                change: [3, 6, 9, 2, 5, 8, 1, 4, 7, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                materials: [2, 3, 1, 0, 4, 5]
            }
        ];

        this.rowRotations = [
            {
                time: 4,
                key: 'KeyQ',
                axis: 'x',
                sign: -1,
                change: [19, 10, 1, 22, 13, 4, 25, 16, 7, 1, 4, 7, 10, 13, 16, 19, 22, 25],
                materials: [0, 1, 4, 5, 3, 2]
            },
            {
                time: 5,
                key: 'KeyQ',
                axis: 'x',
                sign: 1,
                change: [7, 16, 25, 4, 13, 22, 1, 10, 19, 1, 4, 7, 10, 13, 16, 19, 22, 25],
                materials: [0, 1, 5, 4, 2, 3]
            },
            {
                time: 6,
                key: 'KeyW',
                axis: 'x',
                sign: -1,
                change: [20, 11, 2, 23, 14, 5, 26, 17, 8, 2, 5, 8, 11, 14, 17, 20, 23, 26],
                materials: [0, 1, 4, 5, 3, 2]
            },
            {
                time: 7,
                key: 'KeyW',
                axis: 'x',
                sign: 1,
                change: [8, 17, 26, 5, 14, 23, 2, 11, 20, 2, 5, 8, 11, 14, 17, 20, 23, 26],
                materials: [0, 1, 5, 4, 2, 3]
            },
            {
                time: 8,
                key: 'KeyE',
                axis: 'x',
                sign: -1,
                change: [21, 12, 3, 24, 15, 6, 27, 18, 9, 3, 6, 9, 12, 15, 18, 21, 24, 27],
                materials: [0, 1, 4, 5, 3, 2]
            },
            {
                time: 9,
                key: 'KeyE',
                axis: 'x',
                sign: 1,
                change: [9, 18, 27, 6, 15, 24, 3, 12, 21, 3, 6, 9, 12, 15, 18, 21, 24, 27],
                materials: [0, 1, 5, 4, 2, 3]
            },
            {
                time: 10,
                key: 'KeyA',
                axis: 'y',
                sign: -1,
                change: [3, 12, 21, 2, 11, 20, 1, 10, 19, 1, 2, 3, 10, 11, 12, 19, 20, 21],
                materials: [5, 4, 2, 3, 0, 1]
            },
            {
                time: 11,
                key: 'KeyA',
                axis: 'y',
                sign: 1,
                change: [19, 10, 1, 20, 11, 2, 21, 12, 3, 1, 2, 3, 10, 11, 12, 19, 20, 21],
                materials: [4, 5, 2, 3, 1, 0]
            },
            {
                time: 12,
                key: 'KeyS',
                axis: 'y',
                sign: -1,
                change: [6, 15, 24, 5, 14, 23, 4, 13, 22, 4, 5, 6, 13, 14, 15, 22, 23, 24],
                materials: [5, 4, 2, 3, 0, 1]
            },
            {
                time: 13,
                key: 'KeyS',
                axis: 'y',
                sign: 1,
                change: [22, 13, 4, 23, 14, 5, 24, 15, 6, 4, 5, 6, 13, 14, 15, 22, 23, 24],
                materials: [4, 5, 2, 3, 1, 0]
            },
            {
                time: 14,
                key: 'KeyD',
                axis: 'y',
                sign: -1,
                change: [9, 18, 27, 8, 17, 26, 7, 16, 25, 7, 8, 9, 16, 17, 18, 25, 26, 27],
                materials: [5, 4, 2, 3, 0, 1]
            },
            {
                time: 15,
                key: 'KeyD',
                axis: 'y',
                sign: 1,
                change: [25, 16, 7, 26, 17, 8, 27, 18, 9, 7, 8, 9, 16, 17, 18, 25, 26, 27],
                materials: [4, 5, 2, 3, 1, 0]
            },
            {
                time: 16,
                key: 'KeyR',
                axis: 'z',
                sign: -1,
                change: [25, 22, 19, 26, 23, 20, 27, 24, 21, 19, 20, 21, 22, 23, 24, 25, 26, 27],
                materials: [2, 3, 1, 0, 4, 5]
            },
            {
                time: 17,
                key: 'KeyR',
                axis: 'z',
                sign: 1,
                change: [21, 24, 27, 20, 23, 26, 19, 22, 25, 19, 20, 21, 22, 23, 24, 25, 26, 27],
                materials: [3, 2, 0, 1, 4, 5]
            },
            {
                time: 18,
                key: 'KeyF',
                axis: 'z',
                sign: -1,
                change: [16, 13, 10, 17, 14, 11, 18, 15, 12, 10, 11, 12, 13, 14, 15, 16, 17, 18],
                materials: [2, 3, 1, 0, 4, 5]
            },
            {
                time: 19,
                key: 'KeyF',
                axis: 'z',
                sign: 1,
                change: [12, 15, 18, 11, 14, 17, 10, 13, 16, 10, 11, 12, 13, 14, 15, 16, 17, 18],
                materials: [3, 2, 0, 1, 4, 5]
            },
            {
                time: 20,
                key: 'KeyV',
                axis: 'z',
                sign: -1,
                change: [7, 4, 1, 8, 5, 2, 9, 6, 3, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                materials: [2, 3, 1, 0, 4, 5]
            },
            {
                time: 21,
                key: 'KeyV',
                axis: 'z',
                sign: 1,
                change: [3, 6, 9, 2, 5, 8, 1, 4, 7, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                materials: [3, 2, 0, 1, 4, 5]
            }
        ];

        this.rotationPlans = new Map(
            [...this.generalRotations, ...this.rowRotations].map((rotation) => [rotation.time, rotation])
        );

        this.arrowKeyToRotationIndex = {
            ArrowUp: 0,
            ArrowDown: 1,
            ArrowRight: 2,
            ArrowLeft: 3
        };

        this.rowKeyToRotationIndex = {
            KeyQ: [4, 5],
            KeyW: [6, 7],
            KeyE: [8, 9],
            KeyA: [10, 11],
            KeyS: [12, 13],
            KeyD: [14, 15],
            KeyR: [16, 17],
            KeyF: [18, 19],
            KeyV: [20, 21]
        };

        this.rowGroupCubeNames = {
            KeyQ: ['1', '4', '7', '10', '13', '16', '19', '22', '25'],
            KeyW: ['2', '5', '8', '11', '14', '17', '20', '23', '26'],
            KeyE: ['3', '6', '9', '12', '15', '18', '21', '24', '27'],
            KeyA: ['1', '2', '3', '10', '11', '12', '19', '20', '21'],
            KeyS: ['4', '5', '6', '13', '14', '15', '22', '23', '24'],
            KeyD: ['7', '8', '9', '16', '17', '18', '25', '26', '27'],
            KeyR: ['19', '20', '21', '22', '23', '24', '25', '26', '27'],
            KeyF: ['10', '11', '12', '13', '14', '15', '16', '17', '18'],
            KeyV: ['1', '2', '3', '4', '5', '6', '7', '8', '9']
        };

        this.inverseRotationIndex = new Map([
            [0, 1], [1, 0],
            [2, 3], [3, 2]
        ]);
        for (const [forwardIndex, reverseIndex] of Object.values(this.rowKeyToRotationIndex)) {
            this.inverseRotationIndex.set(forwardIndex, reverseIndex);
            this.inverseRotationIndex.set(reverseIndex, forwardIndex);
        }

        this.pendingRowQueue = [];
        this.activeRowRotations = Object.fromEntries(
            Object.keys(this.rowGroupCubeNames).map((key) => [key, null])
        );

        this.textureLoader = new THREE.TextureLoader();
        
        this.init();
        this.initCubeNetWidget();

        try {
            this.restoreCubeStateFromCookie();
            if (this.cubeNetVisible) {
                this.updateCubeNet();
            }
        } catch (_error) {
            // Ignore malformed cookie state and keep the freshly created cube.
        }

        this.animate();
    }
    
    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.scene_color);
        this.scene.fog = new THREE.FogExp2(this.scene_color, this.config.scene.fogDensity);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        // Replace canvas background with Three.js renderer
        const sceneBackdrop = document.querySelector('.scene-backdrop');
        if (sceneBackdrop) {
            const existingCanvas = sceneBackdrop.querySelector('canvas');
            if (existingCanvas) {
                existingCanvas.remove();
            }
            sceneBackdrop.appendChild(this.renderer.domElement);
            this.renderer.domElement.style.display = 'block';
        }
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            this.config.camera.fov,
            window.innerWidth / window.innerHeight,
            this.config.camera.near,
            this.config.camera.far
        );
        this.camera.up.set(0, 0, 1);
        this.camera.position.set(
            this.config.camera.position.x,
            this.config.camera.position.y,
            this.config.camera.position.z
        );
        
        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = this.config.controls.dampingFactor;
        this.controls.screenSpacePanning = false;
        this.controls.enableKeys = false;
        this.controls.enablePan = this.config.controls.enablePan;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.35;
        
        // Create Rubik's cube (3x3x3)
        this.createRubiksCube();
        
        // Lighting
        const ambient = new THREE.AmbientLight(
            this.config.lights.ambient.color,
            this.config.lights.ambient.intensity
        );
        this.ambientLight = ambient;
        this.scene.add(ambient);

        const rimLight = new THREE.PointLight(
            this.config.lights.rim.color,
            this.config.lights.rim.intensity,
            this.config.lights.rim.distance,
            this.config.lights.rim.decay
        );
        rimLight.position.set(
            this.config.lights.rim.position.x,
            this.config.lights.rim.position.y,
            this.config.lights.rim.position.z
        );
        this.rimLight = rimLight;
        this.scene.add(rimLight);

        
        // Event listeners
        window.addEventListener('resize', () => this.onWindowResize(), false);
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    createCubeTexture(path, name) {
        let texture = this.textureLoader.load(path);
		texture.anisotropy = this.config.cube.textures.anisotropy;
		return new THREE.MeshStandardMaterial({map: texture, metalness: this.config.cube.textures.metalness, roughness: this.config.cube.textures.roughness, name: name});
    }

    createMaterialPalette() {
        return {
            red: this.createCubeTexture(this.config.cube.textures.skin1.red, 'r'),
            orange: this.createCubeTexture(this.config.cube.textures.skin1.orange, 'o'),
            green: this.createCubeTexture(this.config.cube.textures.skin1.green, 'g'),
            blue: this.createCubeTexture(this.config.cube.textures.skin1.blue, 'b'),
            white: this.createCubeTexture(this.config.cube.textures.skin1.white, 'w'),
            yellow: this.createCubeTexture(this.config.cube.textures.skin1.yellow, 'y'),
            back: this.createCubeTexture(this.config.cube.textures.skin1.back, 'h')
        };
    }

    createCubieGeometry() {
        const roundedConfig = this.config.cube.geometry?.roundedEdges;
        if (roundedConfig?.enabled) {
            return new RoundedBoxGeometry(1, 1, 1, roundedConfig.segments, roundedConfig.radius);
        }

        return new THREE.BoxGeometry(1, 1, 1, 3, 3, 3);
    }

    createCubieMaterials(palette, x, y, z, minCoord, maxCoord) {
        const faceMaterials = [
            x === maxCoord ? palette.red : palette.back,
            x === minCoord ? palette.orange : palette.back,
            y === maxCoord ? palette.green : palette.back,
            y === minCoord ? palette.blue : palette.back,
            z === maxCoord ? palette.white : palette.back,
            z === minCoord ? palette.yellow : palette.back
        ];

        return faceMaterials.map((material) => material.clone());
    }

    createRubiksCube() {
        if (!this.materialPalette) {
            this.materialPalette = this.createMaterialPalette();
        }

        const palette = this.materialPalette;
        const cubieGeometry = this.createCubieGeometry();

        const maxCoord = Math.trunc(this.config.cube.size / 2);
        const minCoord = -maxCoord;

        let count = 0;
        for (let z = minCoord; z < maxCoord + 1; z++) {
            for (let y = minCoord; y < maxCoord + 1; y++) {
                for (let x = minCoord; x < maxCoord + 1; x++) {
                    count++;

                    var name = '' + count;
                    const result_materials = this.createCubieMaterials(palette, x, y, z, minCoord, maxCoord);
                    
                    const cube = new THREE.Mesh(cubieGeometry, result_materials);
                    cube.position.set(x, y, z);
                    cube.name = name;
                    this.position_of_cubes.set(name, [ x, y, z ]);
                    this.materialsByObjectId.set(cube.id, result_materials);
                    
                    this.cubeRoot.add(cube);
                    this.cubeMeshList.push(cube);
                }
            }
        }

        this.scene.add(this.cubeRoot);
    }

    getSortedCubes() {
        return [...this.cubeMeshList].sort((leftCube, rightCube) => Number(leftCube.name) - Number(rightCube.name));
    }

    cloneMaterialByName(materialName) {
        const paletteMap = {
            r: 'red',
            o: 'orange',
            g: 'green',
            b: 'blue',
            w: 'white',
            y: 'yellow',
            h: 'back'
        };

        const paletteKey = paletteMap[materialName] ?? 'back';
        return this.materialPalette[paletteKey].clone();
    }

    applyRestoredCubeState(restoredState) {
        const cubes = this.getSortedCubes();
        if (!restoredState || restoredState.length !== cubes.length) {
            return false;
        }

        cubes.forEach((cube, cubeIndex) => {
            const currentMaterials = this.materialsByObjectId.get(cube.id) || cube.material;
            for (const material of currentMaterials) {
                material.dispose();
            }

            const restoredMaterials = restoredState[cubeIndex].map((materialName) => this.cloneMaterialByName(materialName));
            cube.material = restoredMaterials;
            this.materialsByObjectId.set(cube.id, restoredMaterials);
        });

        return true;
    }

    restoreCubeStateFromCookie() {
        if (!this.cubeCookies) {
            return false;
        }

        return this.applyRestoredCubeState(this.cubeCookies.loadState(this.cubeMeshList.length));
    }

    persistCubeState() {
        if (!this.cubeCookies) {
            return;
        }

        this.cubeCookies.saveState(this.cubeMeshList, this.materialsByObjectId);
    }

    initCubeNetWidget() {
        this.cubeNetWidget = document.getElementById('cube-net-widget');
        if (!this.cubeNetWidget) {
            return;
        }

        for (const faceKey of Object.keys(this.cubeNetStickers)) {
            const faceElement = this.cubeNetWidget.querySelector(`[data-face="${faceKey}"]`);
            if (!faceElement) {
                continue;
            }

            const stickers = [];
            for (let index = 0; index < 9; index++) {
                const sticker = document.createElement('span');
                sticker.className = 'cube-net-sticker';
                faceElement.appendChild(sticker);
                stickers.push(sticker);
            }

            this.cubeNetStickers[faceKey] = stickers;
        }

        this.setCubeNetVisible(this.cubeNetVisible);
        this.updateCubeNet();
    }

    getStickerHexByName(materialName) {
        const palette = {
            r: '#d83a34',
            o: '#f28a2d',
            g: '#39d14a',
            b: '#2e78dc',
            w: '#f2f2f2',
            y: '#e7dc3f',
            h: '#242424'
        };

        return palette[materialName] ?? palette.h;
    }

    getFaceCoord(faceKey, x, y, z) {
        switch (faceKey) {
            case 'f': return { u: y, v: -x };
            case 'b': return { u: -y, v: -x };
            case 'u': return { u: y, v: z };
            case 'd': return { u: y, v: -z };
            case 'r': return { u: -z, v: -x };
            case 'l': return { u: z, v: -x };
            default: return { u: 0, v: 0 };
        }
    }

    updateCubeNet() {
        if (!this.cubeNetVisible || !this.cubeNetWidget) {
            return;
        }

        const maxCoord = Math.trunc(this.config.cube.size / 2);
        const faceState = {
            u: Array(9).fill('h'),
            l: Array(9).fill('h'),
            f: Array(9).fill('h'),
            r: Array(9).fill('h'),
            b: Array(9).fill('h'),
            d: Array(9).fill('h')
        };

        const faceSpecs = [
            { key: 'u', match: (x) => x === maxCoord, materialIndex: 0 },
            { key: 'd', match: (x) => x === -maxCoord, materialIndex: 1 },
            { key: 'r', match: (_x, y) => y === maxCoord, materialIndex: 2 },
            { key: 'l', match: (_x, y) => y === -maxCoord, materialIndex: 3 },
            { key: 'f', match: (_x, _y, z) => z === maxCoord, materialIndex: 4 },
            { key: 'b', match: (_x, _y, z) => z === -maxCoord, materialIndex: 5 }
        ];

        for (const cube of this.cubeMeshList) {
            const x = Math.round(cube.position.x);
            const y = Math.round(cube.position.y);
            const z = Math.round(cube.position.z);
            const materials = this.materialsByObjectId.get(cube.id) || cube.material;

            for (const face of faceSpecs) {
                if (!face.match(x, y, z)) {
                    continue;
                }

                const { u, v } = this.getFaceCoord(face.key, x, y, z);
                const row = 1 - v;
                const col = u + 1;
                const index = row * 3 + col;
                if (index < 0 || index > 8) {
                    continue;
                }

                faceState[face.key][index] = materials[face.materialIndex].name;
            }
        }

        for (const faceKey of Object.keys(faceState)) {
            const stickers = this.cubeNetStickers[faceKey];
            for (let index = 0; index < stickers.length; index++) {
                stickers[index].style.backgroundColor = this.getStickerHexByName(faceState[faceKey][index]);
            }
        }
    }

    handleKeyDown(event) {
        if (event.repeat) {
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ') {
            event.preventDefault();
            this.undoLastMove();
            return;
        }

        if (this.arrowKeyToRotationIndex[event.code] !== undefined) {
            event.preventDefault();
            this.enqueueGeneralRotation(this.arrowKeyToRotationIndex[event.code]);
            return;
        }

        if (this.rowKeyToRotationIndex[event.code]) {
            event.preventDefault();
            const [forwardIndex, reverseIndex] = this.rowKeyToRotationIndex[event.code];
            this.enqueueRowRotation(event.code, event.shiftKey ? reverseIndex : forwardIndex);
        }
    }

    enqueueGeneralRotation(index) {
        this.generalQueue.push({ index, isUndo: false });
        this.compactQueuedTurns(this.generalQueue);
    }

    enqueueRowRotation(keyCode, index, isUndo = false) {
        this.pendingRowQueue.push({ keyCode, index, isUndo });
        this.compactPendingRowTurns();
    }

    compactQueuedTurns(queue) {
        let sameTailCount = 1;
        while (
            sameTailCount < queue.length &&
            queue[queue.length - 1 - sameTailCount].index === queue[queue.length - 1].index
        ) {
            sameTailCount++;
        }

        if (sameTailCount === 4) {
            queue.splice(queue.length - 4, 4);
        }
    }

    compactPendingRowTurns() {
        let sameTailCount = 1;
        while (
            sameTailCount < this.pendingRowQueue.length &&
            this.pendingRowQueue[this.pendingRowQueue.length - 1 - sameTailCount].index === this.pendingRowQueue[this.pendingRowQueue.length - 1].index
        ) {
            sameTailCount++;
        }

        if (sameTailCount === 4) {
            this.pendingRowQueue.splice(this.pendingRowQueue.length - 4, 4);
        }
    }

    createGroupFromNames(cubeNames) {
        const group = new THREE.Group();
        for (const name of cubeNames) {
            const cube = this.scene.getObjectByName(name);
            if (cube) {
                group.add(cube);
            }
        }
        this.scene.add(group);
        return group;
    }

    createGeneralGroup() {
        const cubeNames = [];
        for (let index = 1; index <= this.config.cube.size ** 3; index++) {
            cubeNames.push(String(index));
        }
        return this.createGroupFromNames(cubeNames);
    }

    createRowGroup(keyCode) {
        return this.createGroupFromNames(this.rowGroupCubeNames[keyCode]);
    }

    startNextGeneralRotation() {
        if (this.activeGeneralRotation || this.generalQueue.length === 0 || this.hasActiveRowRotations()) {
            return;
        }

        const queuedRotation = this.generalQueue.shift();
        const plan = this.rotationPlans.get(queuedRotation.index);
        if (!plan) {
            return;
        }

        const group = this.createGeneralGroup();
        group.rotation.x = 0;
        group.rotation.y = 0;
        group.rotation.z = 0;

        this.activeGeneralRotation = {
            ...plan,
            isUndo: queuedRotation.isUndo,
            progress: 0,
            group
        };
    }

    hasActiveRowRotations() {
        return Object.values(this.activeRowRotations).some((rotation) => rotation !== null);
    }

    rowRotationsConflict(leftRotation, rightRotation) {
        if (!leftRotation || !rightRotation) {
            return false;
        }

        if (leftRotation.key === rightRotation.key) {
            return true;
        }

        return leftRotation.axis !== rightRotation.axis;
    }

    canStartRowRotation(plan) {
        if (this.activeGeneralRotation) {
            return false;
        }

        return Object.values(this.activeRowRotations).every((activeRotation) => !this.rowRotationsConflict(activeRotation, plan));
    }

    startRowRotation(keyCode, rotationIndex) {
        const plan = this.rotationPlans.get(rotationIndex.index);
        if (!plan) {
            return;
        }

        const group = this.createRowGroup(keyCode);
        group.rotation.x = 0;
        group.rotation.y = 0;
        group.rotation.z = 0;

        this.activeRowRotations[keyCode] = {
            ...plan,
            isUndo: rotationIndex.isUndo,
            progress: 0,
            group
        };
    }

    startPendingRowRotations() {
        while (this.pendingRowQueue.length > 0) {
            const nextRotation = this.pendingRowQueue[0];
            const plan = this.rotationPlans.get(nextRotation.index);

            if (!plan || !this.canStartRowRotation(plan)) {
                break;
            }

            this.pendingRowQueue.shift();
            this.startRowRotation(nextRotation.keyCode, nextRotation);
        }
    }

    catCube(group, obj, mat, newName) {
        if (!obj) {
            return;
        }

        group.remove(obj);

        const currentMaterials = this.materialsByObjectId.get(obj.id) || obj.material;
        const remappedMaterials = [
            currentMaterials[mat[0]],
            currentMaterials[mat[1]],
            currentMaterials[mat[2]],
            currentMaterials[mat[3]],
            currentMaterials[mat[4]],
            currentMaterials[mat[5]]
        ];

        obj.name = newName;
        const position = this.position_of_cubes.get(newName);
        if (position) {
            obj.position.set(position[0], position[1], position[2]);
        }

        obj.material = remappedMaterials;
        this.materialsByObjectId.set(obj.id, remappedMaterials);
        this.scene.add(obj);
    }

    commitRowRotation(rotation) {
        for (let i = 0; i < 9; i++) {
            this.catCube(
                rotation.group,
                this.scene.getObjectByName(String(rotation.change[9 + i])),
                rotation.materials,
                String(rotation.change[i])
            );
        }

        if (!rotation.isUndo) {
            this.recordHistory({ type: 'row', keyCode: rotation.key, index: rotation.time });
        }
    }

    commitGeneralRotation(rotation) {
        if (rotation.axis === 'x') {
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 9; j++) {
                    this.catCube(
                        rotation.group,
                        this.scene.getObjectByName(String(rotation.change[j] + i)),
                        rotation.materials,
                        String(rotation.change[9 + j] + i)
                    );
                }
            }
            if (!rotation.isUndo) {
                this.recordHistory({ type: 'general', index: rotation.time });
            }
            return;
        }

        for (let i = 0; i < 27; i += 9) {
            for (let j = 0; j < 9; j++) {
                this.catCube(
                    rotation.group,
                    this.scene.getObjectByName(String(rotation.change[j] + i)),
                    rotation.materials,
                    String(rotation.change[9 + j] + i)
                );
            }
        }

        if (!rotation.isUndo) {
            this.recordHistory({ type: 'general', index: rotation.time });
        }
    }

    recordHistory(action) {
        this.undoHistory.push(action);
        if (this.undoHistory.length > this.maxUndoHistory) {
            this.undoHistory.shift();
        }
    }

    undoLastMove() {
        const action = this.undoHistory.pop();
        if (!action) {
            return;
        }

        const oppositeIndex = this.inverseRotationIndex.get(action.index);
        if (oppositeIndex === undefined) {
            return;
        }

        if (action.type === 'row') {
            this.enqueueRowRotation(action.keyCode, oppositeIndex, true);
            return;
        }

        this.generalQueue.push({ index: oppositeIndex, isUndo: true });
        this.compactQueuedTurns(this.generalQueue);
    }

    advanceRotation(rotation, commitRotation) {
        if (!rotation) {
            return null;
        }

        rotation.group.rotation[rotation.axis] += (rotation.sign * this.stepAngle);
        rotation.progress += 1;

        if (rotation.progress < this.stepsPerTurn) {
            return rotation;
        }

        commitRotation(rotation);
        rotation.group.rotation[rotation.axis] -= (rotation.sign * this.stepAngle * this.stepsPerTurn);
        this.scene.remove(rotation.group);
        return null;
    }

    updateGeneralRotation() {
        this.activeGeneralRotation = this.advanceRotation(
            this.activeGeneralRotation,
            (rotation) => this.commitGeneralRotation(rotation)
        );
    }

    updateRowRotations() {
        for (const keyCode of Object.keys(this.activeRowRotations)) {
            this.activeRowRotations[keyCode] = this.advanceRotation(
                this.activeRowRotations[keyCode],
                (rotation) => this.commitRowRotation(rotation)
            );
        }
    }

    render() {
        this.startNextGeneralRotation();
        this.startPendingRowRotations();

        this.updateGeneralRotation();
        this.updateRowRotations();
        this.updateCubeNet();

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    animate = () => {
        requestAnimationFrame(this.animate);
        this.render();
    }
    
    applySceneSettings(bgColor, fogDensity) {
        this.scene.background.set(bgColor);
        if (this.scene.fog) {
            this.scene.fog.color.set(bgColor);
            this.scene.fog.density = fogDensity;
        }
    }

    applyLightSettings(ambientColor, ambientIntensity, rimColor, rimIntensity) {
        this.ambientLight.color.set(ambientColor);
        this.ambientLight.intensity = ambientIntensity;
        this.rimLight.color.set(rimColor);
        this.rimLight.intensity = rimIntensity;
    }

    applyMaterialSettings(metalness, roughness) {
        for (const materials of this.materialsByObjectId.values()) {
            for (const mat of materials) {
                mat.metalness = metalness;
                mat.roughness = roughness;
                mat.needsUpdate = true;
            }
        }
    }

    applySpeed(stepsPerTurn) {
        this.stepsPerTurn = stepsPerTurn;
        this.stepAngle = Math.PI / (2 * this.stepsPerTurn);
    }

    applyGeometry(enabled, radius) {
        const { segments } = this.config.cube.geometry.roundedEdges;
        const newGeometry = enabled
            ? new RoundedBoxGeometry(1, 1, 1, segments, radius)
            : new THREE.BoxGeometry(1, 1, 1, 3, 3, 3);
        let oldGeometry = null;
        for (const mesh of this.cubeMeshList) {
            if (!oldGeometry) oldGeometry = mesh.geometry;
            mesh.geometry = newGeometry;
        }
        oldGeometry?.dispose();
    }

    setSettingsPanelRotationEnabled(enabled) {
        this.controls.autoRotate = Boolean(enabled);
    }

    setCubeNetVisible(enabled) {
        this.cubeNetVisible = Boolean(enabled);
        if (!this.cubeNetWidget) {
            return;
        }

        this.cubeNetWidget.classList.toggle('is-hidden', !this.cubeNetVisible);
        this.cubeNetWidget.setAttribute('aria-hidden', String(!this.cubeNetVisible));

        if (this.cubeNetVisible) {
            this.updateCubeNet();
        }
    }

    onWindowResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
}
