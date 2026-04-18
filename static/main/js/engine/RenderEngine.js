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
        onWheel,
        enableInteractionEvents = true,
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
        this.enableInteractionEvents = enableInteractionEvents;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.container = null;

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

    _getViewportSize() {
        if (!this.container) {
            return { width: window.innerWidth, height: window.innerHeight };
        }

        const rect = this.container.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        return { width, height };
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.sceneColor);
        this.scene.fog = this.fogEnabled
            ? new THREE.FogExp2(this.sceneColor, this.fogDensity)
            : null;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.container = document.querySelector(this.containerSelector);
        if (this.container) {
            const existingCanvas = this.container.querySelector('canvas');
            if (existingCanvas) {
                existingCanvas.remove();
            }
            this.container.appendChild(this.renderer.domElement);
            this.renderer.domElement.style.display = 'block';
            this.renderer.domElement.style.width = '100%';
            this.renderer.domElement.style.height = '100%';
        }

        const viewport = this._getViewportSize();
        this.renderer.setSize(viewport.width, viewport.height);

        this.camera = new THREE.PerspectiveCamera(
            this.cameraConfig.fov,
            viewport.width / viewport.height,
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
        if (this.enableInteractionEvents) {
            document.addEventListener('keydown', this._boundKeyDown);
            this.renderer.domElement.addEventListener('wheel', this._boundWheel, { passive: false });
        }
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

        const viewport = this._getViewportSize();
        this.renderer.setSize(viewport.width, viewport.height);
        this.camera.aspect = viewport.width / viewport.height;
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
