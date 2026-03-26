export const CUBE_CONFIG = {
    scene: {
        backgroundColor: 0x2c3640,
        fogDensity: 0.025,
        fogEnabled: true
    },
    camera: {
        fov: 45,
        near: 1,
        far: 500,
        position: { x: 0, y: -11, z: 8 }
    },
    controls: {
        dampingFactor: 0.05,
        enablePan: false,
        rotateSpeed: 1,
        zoom: {
            mode: 'stepped',
            step: 1.5,
            smoothSpeed: 1,
            min: 5,
            max: 30,
            smoothDamping: 0.86
        }
    },
    rotation: {
        stepsPerTurn: 30
    },
    history: {
        maxUndoHistory: 50
    },
    debug: {
        fpsEnabled: false
    },
    lights: {
        ambient: {
            color: 0xf1efe8,
            intensity: 0.5
        },
        rim: {
            color: 0xffffff,
            intensity: 50,
            distance: 30,
            decay: 1.5,
            position: { x: 0, y: -6, z: 0 }
        }
    },
    cube: {
        size: 3,
        geometry: {
            roundedEdges: {
                enabled: true,
                radius: 0.12,
                segments: 4
            }
        },
        textures: {
            metalness: 0.2,
            roughness: 0.92,
            anisotropy: 4,
            skin1: {
                red: '/static/main/textures/rednew_new.png',
                orange: '/static/main/textures/orange_new.png',
                green: '/static/main/textures/green_new.png',
                blue: '/static/main/textures/blue_new.png',
                white: '/static/main/textures/white_new.png',
                yellow: '/static/main/textures/yellow_new.png',
                back: '/static/main/textures/back.png'
            }
        },
    }
    ,
    runtime: {
        skinId: 'classic',
        lantern: {
            opacity: 0.58,
            lightIntensity: 0.52,
            pulseSpeed: 1.0,
            emberSize: 0.16,
            showEmbers: true
        },
        spheres: {
            radius: 0.56
        },
        water: {
            fillLevel: 0.62,
            spring: 14,
            damping: 4,
            response: 1.3
        }
    }
};
