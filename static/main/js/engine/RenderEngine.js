import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class RenderEngine {
    constructor({
        containerSelector,
        cameraConfig,
        controlsConfig,
        sceneColor,
        fogEnabled,
        fogDensity,
        onResize,
        onKeyDown,
        onWheel
    }) {
        this.containerSelector = containerSelector;
        this.cameraConfig = cameraConfig;
        this.controlsConfig = controlsConfig;
        this.sceneColor = sceneColor;
        this.fogEnabled = fogEnabled;
        this.fogDensity = fogDensity;
        this.onResize = onResize;
        this.onKeyDown = onKeyDown;
        this.onWheel = onWheel;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        this._isRunning = false;
        this._animationFrameId = null;
        this._onFrame = null;

        this._boundResize = () => {
            this.resize();
            this.onResize?.();
        };
        this._boundKeyDown = (event) => {
            this.onKeyDown?.(event);
        };
        this._boundWheel = (event) => {
            this.onWheel?.(event);
        };
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.sceneColor);
        this.scene.fog = this.fogEnabled
            ? new THREE.FogExp2(this.sceneColor, this.fogDensity)
            : null;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        const sceneBackdrop = document.querySelector(this.containerSelector);
        if (sceneBackdrop) {
            const existingCanvas = sceneBackdrop.querySelector('canvas');
            if (existingCanvas) {
                existingCanvas.remove();
            }
            sceneBackdrop.appendChild(this.renderer.domElement);
            this.renderer.domElement.style.display = 'block';
        }

        this.camera = new THREE.PerspectiveCamera(
            this.cameraConfig.fov,
            window.innerWidth / window.innerHeight,
            this.cameraConfig.near,
            this.cameraConfig.far
        );
        this.camera.up.set(0, 0, 1);
        this.camera.position.set(
            this.cameraConfig.position.x,
            this.cameraConfig.position.y,
            this.cameraConfig.position.z
        );

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = this.controlsConfig.dampingFactor;
        this.controls.screenSpacePanning = false;
        this.controls.enableKeys = false;
        this.controls.enablePan = this.controlsConfig.enablePan;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.35;

        window.addEventListener('resize', this._boundResize, false);
        document.addEventListener('keydown', this._boundKeyDown);
        this.renderer.domElement.addEventListener('wheel', this._boundWheel, { passive: false });
    }

    start(onFrame) {
        this._onFrame = onFrame;
        if (this._isRunning) {
            return;
        }

        this._isRunning = true;
        const loop = () => {
            if (!this._isRunning) {
                return;
            }

            this._animationFrameId = requestAnimationFrame(loop);
            this._onFrame?.();
            this.controls?.update();
            this.renderer?.render(this.scene, this.camera);
        };
        loop();
    }

    stop() {
        this._isRunning = false;
        if (this._animationFrameId !== null) {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }
    }

    resize() {
        if (!this.renderer || !this.camera) {
            return;
        }

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    setSceneSettings(bgColor, fogEnabled, fogDensity) {
        this.sceneColor = bgColor;
        this.fogEnabled = Boolean(fogEnabled);
        this.fogDensity = fogDensity;

        if (!this.scene) {
            return;
        }

        this.scene.background?.set?.(bgColor);
        if (this.fogEnabled) {
            if (!this.scene.fog) {
                this.scene.fog = new THREE.FogExp2(bgColor, fogDensity);
            } else {
                this.scene.fog.color.set(bgColor);
                this.scene.fog.density = fogDensity;
            }
        } else {
            this.scene.fog = null;
        }
    }
}
