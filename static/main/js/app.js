import { RubiksCube } from './cube.js';
import { CookieCube, CookieSettings } from './cookies.js';

const initApp = () => {
    requestAnimationFrame(() => {
        document.body.classList.add('is-ready');
    });

    const sceneBackdrop = document.querySelector('.scene-backdrop');
    const settingsCookies = new CookieSettings();
    const savedSettings = settingsCookies.loadSettings() ?? {};
    const defaultKeymap = {
        KeyQ: 'KeyQ', KeyW: 'KeyW', KeyE: 'KeyE',
        KeyA: 'KeyA', KeyS: 'KeyS', KeyD: 'KeyD',
        KeyR: 'KeyR', KeyF: 'KeyF', KeyV: 'KeyV'
    };

    let keymap = { ...defaultKeymap, ...(savedSettings.keymap ?? {}) };
    let rotateSensitivity = savedSettings.rotateSensitivity ?? 1.0;
    let zoomMode = savedSettings.zoomMode ?? 'stepped';
    let zoomStep = savedSettings.zoomStep ?? 1.5;
    let zoomSmoothSpeed = savedSettings.zoomSmoothSpeed ?? 1.0;
    let zoomMin = savedSettings.zoomMin ?? 5;
    let zoomMax = savedSettings.zoomMax ?? 30;
    let debugFpsEnabled = savedSettings.debugFpsEnabled ?? false;
    let fogEnabled = savedSettings.fogEnabled ?? true;
    let skinId = savedSettings.skinId ?? 'classic';
    let lanternOpacity = savedSettings.lanternOpacity ?? 0.58;
    let lanternLightIntensity = savedSettings.lanternLightIntensity ?? 0.52;
    let lanternPulseSpeed = savedSettings.lanternPulseSpeed ?? 1.0;
    let lanternEmberSize = savedSettings.lanternEmberSize ?? 0.16;
    let lanternShowEmbers = savedSettings.lanternShowEmbers ?? true;
    let spheresRadius = savedSettings.spheresRadius ?? 0.56;
    if (skinId === 'glow') {
        skinId = 'lantern';
    }
    if (skinId === 'matte') {
        skinId = 'classic';
    }

    if (sceneBackdrop) {
        const cubeCookies = new CookieCube();
        window.cubeApp = new RubiksCube('.scene-backdrop', cubeCookies);

        const persistAppState = () => {
            window.cubeApp?.persistCubeState();
            settingsCookies.saveSettings({
                bgColor,
                fogDensity,
                ambientColor,
                ambientIntensity,
                rimColor,
                rimIntensity,
                metalness,
                roughness,
                roundedEnabled,
                roundedRadius,
                speed: Number(document.getElementById('cfg-speed')?.value ?? 30),
                settingsAutoRotateEnabled,
                cubeNetVisible: cubeNetToggle?.checked ?? true,
                keymap,
                rotateSensitivity,
                zoomMode,
                zoomStep,
                zoomSmoothSpeed,
                zoomMin,
                zoomMax,
                debugFpsEnabled,
                fogEnabled,
                skinId,
                lanternOpacity,
                lanternLightIntensity,
                lanternPulseSpeed,
                lanternEmberSize,
                lanternShowEmbers,
                spheresRadius
            });
        };

        window.addEventListener('pagehide', persistAppState);
        window.addEventListener('beforeunload', persistAppState);
    }

    const pageLoader = document.querySelector('[data-page-loader]');
    if (pageLoader) {
        setTimeout(() => {
            pageLoader.style.pointerEvents = 'none';
        }, 1800);
    }

    const passwordInput = document.querySelector('[data-password-input]');
    const passwordRules = Array.from(document.querySelectorAll('[data-password-rule]'));

    if (passwordInput && passwordRules.length > 0) {
        const validators = {
            length: (value) => value.length >= 8,
            uppercase: (value) => /[A-Z]/.test(value),
            lowercase: (value) => /[a-z]/.test(value),
            digit: (value) => /\d/.test(value),
        };

        const syncPasswordRules = () => {
            passwordRules.forEach((rule) => {
                const isValid = validators[rule.dataset.passwordRule]?.(passwordInput.value) ?? false;
                rule.classList.toggle('is-valid', isValid);
            });
        };

        passwordInput.addEventListener('input', syncPasswordRules);
        syncPasswordRules();
    }

    const root = document.querySelector('[data-menu-root]');
    if (!root) {
        return;
    }

    const toggle = root.querySelector('[data-menu-toggle]');
    const panel = root.querySelector('[data-side-panel]');
    const closeButton = root.querySelector('[data-menu-close]');
    const overlay = root.querySelector('[data-menu-overlay]');

    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsClose = document.getElementById('settings-close');
    const settingsAutoRotateToggle = document.getElementById('cfg-settings-autorotate');
    const cubeNetToggle = document.getElementById('cfg-cube-net');

    const setControlValue = (id, value) => {
        const input = document.getElementById(id);
        if (!input || value === undefined) {
            return;
        }

        if (input.type === 'checkbox') {
            input.checked = Boolean(value);
            return;
        }

        input.value = String(value);
    };

    setControlValue('cfg-bg-color', savedSettings.bgColor);
    setControlValue('cfg-fog', savedSettings.fogDensity);
    setControlValue('cfg-ambient-color', savedSettings.ambientColor);
    setControlValue('cfg-ambient-int', savedSettings.ambientIntensity);
    setControlValue('cfg-rim-color', savedSettings.rimColor);
    setControlValue('cfg-rim-int', savedSettings.rimIntensity);
    setControlValue('cfg-metalness', savedSettings.metalness);
    setControlValue('cfg-roughness', savedSettings.roughness);
    setControlValue('cfg-rounded', savedSettings.roundedEnabled);
    setControlValue('cfg-radius', savedSettings.roundedRadius);
    setControlValue('cfg-speed', savedSettings.speed);
    setControlValue('cfg-settings-autorotate', savedSettings.settingsAutoRotateEnabled);
    setControlValue('cfg-cube-net', savedSettings.cubeNetVisible);
    setControlValue('cfg-lantern-opacity', lanternOpacity);
    setControlValue('cfg-lantern-light', lanternLightIntensity);
    setControlValue('cfg-lantern-pulse-speed', lanternPulseSpeed);
    setControlValue('cfg-lantern-size', lanternEmberSize);
    setControlValue('cfg-lantern-embers', lanternShowEmbers);
    setControlValue('cfg-spheres-radius', spheresRadius);
    setControlValue('cfg-fog-enabled', fogEnabled);
    setControlValue('cfg-skin', skinId);
    setControlValue('cfg-rotate-speed', rotateSensitivity);
    setControlValue('cfg-zoom-step', zoomStep);
    setControlValue('cfg-zoom-smooth-speed', zoomSmoothSpeed);
    setControlValue('cfg-zoom-min', zoomMin);
    setControlValue('cfg-zoom-max', zoomMax);
    setControlValue('cfg-debug-fps', debugFpsEnabled);

    const zoomSteppedInput = document.getElementById('cfg-zoom-stepped');
    const zoomSmoothInput = document.getElementById('cfg-zoom-smooth');
    if (zoomSteppedInput && zoomSmoothInput) {
        zoomSteppedInput.checked = zoomMode !== 'smooth';
        zoomSmoothInput.checked = zoomMode === 'smooth';
    }

    let settingsAutoRotateEnabled = settingsAutoRotateToggle?.checked ?? true;

    const setMenuState = (isOpen) => {
        if (!panel || !overlay || !toggle) {
            return;
        }
        panel.classList.toggle('is-open', isOpen);
        if (!isOpen) panel.classList.remove('showing-controls');
        overlay.classList.toggle('is-visible', isOpen || settingsPanel?.classList.contains('is-open'));
        toggle.setAttribute('aria-expanded', String(isOpen));
    };

    const setSettingsState = (isOpen) => {
        if (!settingsPanel || !overlay) {
            return;
        }
        settingsPanel.classList.toggle('is-open', isOpen);
        settingsPanel.setAttribute('aria-hidden', String(!isOpen));
        overlay.classList.toggle('is-visible', isOpen || panel?.classList.contains('is-open'));
        getCube()?.setSettingsPanelRotationEnabled(isOpen && settingsAutoRotateEnabled);
        if (isOpen) {
            setMenuState(false);
        }
    };

    toggle?.addEventListener('click', () => {
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        setMenuState(!isOpen);
    });

    closeButton?.addEventListener('click', () => {
        setMenuState(false);
    });

    panel?.addEventListener('click', (e) => {
        const navOpenBtn = e.target.closest('[data-nav-open]');
        if (navOpenBtn) {
            e.preventDefault();
            panel.classList.add(`showing-${navOpenBtn.dataset.navOpen}`);
            return;
        }
        if (e.target.closest('[data-side-back]')) {
            panel.classList.remove('showing-controls');
            return;
        }
        if (e.target.closest('[data-menu-close]')) {
            setMenuState(false);
        }
    });

    settingsToggle?.addEventListener('click', () => {
        setSettingsState(!settingsPanel?.classList.contains('is-open'));
    });

    settingsClose?.addEventListener('click', () => {
        setSettingsState(false);
    });

    overlay?.addEventListener('click', () => {
        setMenuState(false);
        setSettingsState(false);
    });

    document.addEventListener('keydown', (event) => {
        const activeTagName = document.activeElement?.tagName;
        const isTypingTarget = activeTagName === 'INPUT' || activeTagName === 'TEXTAREA' || document.activeElement?.isContentEditable;

        if (!isTypingTarget && event.key.toLowerCase() === 'x') {
            event.preventDefault();
            setSettingsState(!settingsPanel?.classList.contains('is-open'));
        }

        if (event.key === 'Escape') {
            setMenuState(false);
            setSettingsState(false);
        }
    });

    const getCube = () => window.cubeApp;

    const onRange = (id, valId, fn, formatValue = (value) => String(value)) => {
        const input = document.getElementById(id);
        const valueNode = valId ? document.getElementById(valId) : null;

        if (!input) {
            return;
        }

        const apply = () => {
            const value = parseFloat(input.value);
            if (valueNode) {
                valueNode.textContent = formatValue(value);
            }
            fn(value);
        };

        input.addEventListener('input', apply);
        apply();
    };

    const onColor = (id, fn) => {
        const input = document.getElementById(id);
        if (!input) {
            return;
        }
        input.addEventListener('input', () => fn(input.value));
        fn(input.value);
    };

    const onCheck = (id, fn) => {
        const input = document.getElementById(id);
        if (!input) {
            return;
        }
        input.addEventListener('change', () => fn(input.checked));
        fn(input.checked);
    };

    const keybindButtons = Array.from(document.querySelectorAll('[data-keybind]'));
    let pendingKeybindSlot = null;

    const formatKeyCode = (code) => {
        if (!code) return '';
        if (code.startsWith('Key')) return code.slice(3).toUpperCase();
        if (code.startsWith('Digit')) return code.slice(5);
        return code;
    };

    const refreshKeybindButtons = () => {
        keybindButtons.forEach((button) => {
            const slot = button.dataset.keybind;
            if (!slot) return;
            button.textContent = pendingKeybindSlot === slot ? '...' : formatKeyCode(keymap[slot]);
            button.classList.toggle('is-listening', pendingKeybindSlot === slot);
        });
    };

    const applyControlSettings = () => {
        const cube = getCube();
        if (!cube) return;
        cube.applyKeymap(keymap);
        cube.applyRotateSensitivity(rotateSensitivity);
        cube.applyZoomSettings(zoomMode, zoomStep, zoomSmoothSpeed, zoomMin, zoomMax);
        cube.applyLanternSettings(lanternOpacity, lanternLightIntensity, lanternPulseSpeed, lanternEmberSize, lanternShowEmbers);
        cube.applySpheresSettings(spheresRadius);
        cube.setDebugOverlayEnabled(debugFpsEnabled);
        cube.setFogEnabled(fogEnabled);
        cube.applySkin(skinId);
    };

    let bgColor = savedSettings.bgColor ?? '#2c3640';
    let fogDensity = savedSettings.fogDensity ?? 0.025;
    const fogRow = document.getElementById('cfg-fog-row');
    const fogRange = document.getElementById('cfg-fog');
    const bgColorInput = document.getElementById('cfg-bg-color');
    const bgPresetButtons = Array.from(document.querySelectorAll('[data-bg-preset]'));

    const setActiveBgPreset = (value) => {
        const normalized = value.toLowerCase();
        bgPresetButtons.forEach((button) => {
            button.classList.toggle('is-active', button.dataset.bgPreset?.toLowerCase() === normalized);
        });
    };

    const applyBackground = (value) => {
        bgColor = value;
        if (bgColorInput && bgColorInput.value.toLowerCase() !== value.toLowerCase()) {
            bgColorInput.value = value;
        }
        setActiveBgPreset(value);
        getCube()?.applySceneSettings(bgColor, fogDensity);
    };

    onColor('cfg-bg-color', (value) => {
        applyBackground(value);
    });

    bgPresetButtons.forEach((button) => {
        button.addEventListener('click', () => {
            if (!button.dataset.bgPreset) {
                return;
            }
            applyBackground(button.dataset.bgPreset);
        });
    });

    onRange('cfg-fog', 'cfg-fog-val', (value) => {
        fogDensity = value;
        getCube()?.applySceneSettings(bgColor, fogDensity);
    }, (value) => value.toFixed(3));

    const syncFogUi = () => {
        if (fogRow) {
            fogRow.style.opacity = fogEnabled ? '1' : '0.55';
        }
        if (fogRange) {
            fogRange.disabled = !fogEnabled;
        }
    };

    onCheck('cfg-fog-enabled', (value) => {
        fogEnabled = value;
        getCube()?.setFogEnabled(value);
        syncFogUi();
    });

    syncFogUi();

    let ambientColor = savedSettings.ambientColor ?? '#f1efe8';
    let ambientIntensity = savedSettings.ambientIntensity ?? 0.5;
    let rimColor = savedSettings.rimColor ?? '#ffffff';
    let rimIntensity = savedSettings.rimIntensity ?? 50;

    const applyLights = () => {
        getCube()?.applyLightSettings(ambientColor, ambientIntensity, rimColor, rimIntensity);
    };

    onColor('cfg-ambient-color', (value) => {
        ambientColor = value;
        applyLights();
    });

    onRange('cfg-ambient-int', 'cfg-ambient-int-val', (value) => {
        ambientIntensity = value;
        applyLights();
    }, (value) => value.toFixed(2));

    onColor('cfg-rim-color', (value) => {
        rimColor = value;
        applyLights();
    });

    onRange('cfg-rim-int', 'cfg-rim-int-val', (value) => {
        rimIntensity = value;
        applyLights();
    }, (value) => String(Math.round(value)));

    let metalness = savedSettings.metalness ?? 0.2;
    let roughness = savedSettings.roughness ?? 0.92;

    const applyMaterials = () => {
        getCube()?.applyMaterialSettings(metalness, roughness);
    };

    onRange('cfg-metalness', 'cfg-metalness-val', (value) => {
        metalness = value;
        applyMaterials();
    }, (value) => value.toFixed(2));

    onRange('cfg-roughness', 'cfg-roughness-val', (value) => {
        roughness = value;
        applyMaterials();
    }, (value) => value.toFixed(2));

    onRange('cfg-lantern-opacity', 'cfg-lantern-opacity-val', (value) => {
        lanternOpacity = value;
        getCube()?.applyLanternSettings(lanternOpacity, lanternLightIntensity, lanternPulseSpeed, lanternEmberSize, lanternShowEmbers);
    }, (value) => value.toFixed(2));

    onRange('cfg-lantern-light', 'cfg-lantern-light-val', (value) => {
        lanternLightIntensity = value;
        getCube()?.applyLanternSettings(lanternOpacity, lanternLightIntensity, lanternPulseSpeed, lanternEmberSize, lanternShowEmbers);
    }, (value) => value.toFixed(2));

    onRange('cfg-lantern-pulse-speed', 'cfg-lantern-pulse-speed-val', (value) => {
        lanternPulseSpeed = value;
        getCube()?.applyLanternSettings(lanternOpacity, lanternLightIntensity, lanternPulseSpeed, lanternEmberSize, lanternShowEmbers);
    }, (value) => value.toFixed(1));

    onRange('cfg-lantern-size', 'cfg-lantern-size-val', (value) => {
        lanternEmberSize = value;
        getCube()?.applyLanternSettings(lanternOpacity, lanternLightIntensity, lanternPulseSpeed, lanternEmberSize, lanternShowEmbers);
    }, (value) => value.toFixed(2));

    onCheck('cfg-lantern-embers', (value) => {
        lanternShowEmbers = value;
        getCube()?.applyLanternSettings(lanternOpacity, lanternLightIntensity, lanternPulseSpeed, lanternEmberSize, lanternShowEmbers);
    });

    onRange('cfg-spheres-radius', 'cfg-spheres-radius-val', (value) => {
        spheresRadius = value;
        getCube()?.applySpheresSettings(spheresRadius);
    }, (value) => value.toFixed(2));

    const skinSelect = document.getElementById('cfg-skin');
    const lanternOpacityRow  = document.getElementById('cfg-lantern-opacity-row');
    const lanternLightRow    = document.getElementById('cfg-lantern-light-row');
    const lanternPulseRow    = document.getElementById('cfg-lantern-pulse-row');
    const lanternSizeRow     = document.getElementById('cfg-lantern-size-row');
    const lanternEmbersRow   = document.getElementById('cfg-lantern-embers-row');
    const spheresRadiusRow   = document.getElementById('cfg-spheres-radius-row');
    const roundedRow         = document.getElementById('cfg-rounded-row');

    const syncLanternRows = () => {
        const visible = skinId === 'lantern';
        [lanternOpacityRow, lanternLightRow, lanternPulseRow, lanternSizeRow, lanternEmbersRow].forEach((row) => {
            if (row) row.style.display = visible ? '' : 'none';
        });
        if (spheresRadiusRow) {
            spheresRadiusRow.style.display = skinId === 'spheres' ? '' : 'none';
        }
        const isCubieSkin = skinId !== 'spheres';
        if (roundedRow) {
            roundedRow.style.display = isCubieSkin ? '' : 'none';
        }
        if (radiusRow) {
            radiusRow.style.display = isCubieSkin && roundedEnabled ? '' : 'none';
        }
    };

    // Defer the heavy skin-switch work by one frame so the dropdown closes first
    skinSelect?.addEventListener('change', () => {
        skinId = skinSelect.value;
        syncLanternRows();
        requestAnimationFrame(() => {
            getCube()?.applyLanternSettings(lanternOpacity, lanternLightIntensity, lanternPulseSpeed, lanternEmberSize, lanternShowEmbers);
            getCube()?.applySpheresSettings(spheresRadius);
            getCube()?.applySkin(skinId);
        });
    });

    let roundedEnabled = savedSettings.roundedEnabled ?? true;
    let roundedRadius = savedSettings.roundedRadius ?? 0.12;
    const radiusRow = document.getElementById('cfg-radius-row');

    const applyGeometry = () => {
        getCube()?.applyGeometry(roundedEnabled, roundedRadius);
    };

    onCheck('cfg-rounded', (value) => {
        roundedEnabled = value;
        syncLanternRows();
        applyGeometry();
    });

    onRange('cfg-radius', 'cfg-radius-val', (value) => {
        roundedRadius = value;
        if (roundedEnabled) {
            applyGeometry();
        }
    }, (value) => value.toFixed(2));

    const speedLabel = (value) => {
        if (value <= 8) return 'молниеносно';
        if (value <= 15) return 'быстро';
        if (value <= 25) return 'средне';
        if (value <= 35) return 'нормально';
        if (value <= 50) return 'медленно';
        return 'плавно';
    };

    onRange('cfg-speed', 'cfg-speed-val', (value) => {
        getCube()?.applySpeed(Math.round(value));
    }, speedLabel);

    onCheck('cfg-settings-autorotate', (value) => {
        settingsAutoRotateEnabled = value;
        getCube()?.setSettingsPanelRotationEnabled(settingsPanel?.classList.contains('is-open') && settingsAutoRotateEnabled);
    });

    onCheck('cfg-cube-net', (value) => {
        getCube()?.setCubeNetVisible(value);
    });

    onCheck('cfg-debug-fps', (value) => {
        debugFpsEnabled = value;
        getCube()?.setDebugOverlayEnabled(value);
    });

    keybindButtons.forEach((button) => {
        button.addEventListener('click', () => {
            pendingKeybindSlot = button.dataset.keybind ?? null;
            refreshKeybindButtons();
        });
    });

    document.addEventListener('keydown', (event) => {
        if (!pendingKeybindSlot) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (event.code === 'Escape') {
            pendingKeybindSlot = null;
            refreshKeybindButtons();
            return;
        }

        if (!/^Key[A-Z]$/.test(event.code) && !/^Digit[0-9]$/.test(event.code)) {
            return;
        }

        const previousSlot = Object.keys(keymap).find((slot) => keymap[slot] === event.code);
        if (previousSlot && previousSlot !== pendingKeybindSlot) {
            const oldCode = keymap[pendingKeybindSlot];
            keymap[previousSlot] = oldCode;
        }

        keymap[pendingKeybindSlot] = event.code;
        pendingKeybindSlot = null;
        refreshKeybindButtons();
        getCube()?.applyKeymap(keymap);
    }, true);

    const zoomStepRow = document.getElementById('ctrl-zoom-step-row');
    const zoomSmoothRow = document.getElementById('ctrl-zoom-smooth-row');

    const syncZoomRows = () => {
        if (zoomStepRow) {
            zoomStepRow.style.display = zoomMode === 'stepped' ? '' : 'none';
        }
        if (zoomSmoothRow) {
            zoomSmoothRow.style.display = zoomMode === 'smooth' ? '' : 'none';
        }
    };

    onRange('cfg-rotate-speed', 'cfg-rotate-speed-val', (value) => {
        rotateSensitivity = value;
        getCube()?.applyRotateSensitivity(value);
    }, (value) => value.toFixed(2));

    onRange('cfg-zoom-step', 'cfg-zoom-step-val', (value) => {
        zoomStep = value;
        getCube()?.applyZoomSettings(zoomMode, zoomStep, zoomSmoothSpeed, zoomMin, zoomMax);
    }, (value) => value.toFixed(2));

    onRange('cfg-zoom-smooth-speed', 'cfg-zoom-smooth-speed-val', (value) => {
        zoomSmoothSpeed = value;
        getCube()?.applyZoomSettings(zoomMode, zoomStep, zoomSmoothSpeed, zoomMin, zoomMax);
    }, (value) => value.toFixed(2));

    onRange('cfg-zoom-min', 'cfg-zoom-min-val', (value) => {
        zoomMin = value;
        if (zoomMin >= zoomMax) {
            zoomMax = zoomMin + 0.5;
            setControlValue('cfg-zoom-max', zoomMax);
            const maxVal = document.getElementById('cfg-zoom-max-val');
            if (maxVal) {
                maxVal.textContent = zoomMax.toFixed(1);
            }
        }
        getCube()?.applyZoomSettings(zoomMode, zoomStep, zoomSmoothSpeed, zoomMin, zoomMax);
    }, (value) => value.toFixed(1));

    onRange('cfg-zoom-max', 'cfg-zoom-max-val', (value) => {
        zoomMax = value;
        if (zoomMax <= zoomMin) {
            zoomMin = zoomMax - 0.5;
            setControlValue('cfg-zoom-min', zoomMin);
            const minVal = document.getElementById('cfg-zoom-min-val');
            if (minVal) {
                minVal.textContent = zoomMin.toFixed(1);
            }
        }
        getCube()?.applyZoomSettings(zoomMode, zoomStep, zoomSmoothSpeed, zoomMin, zoomMax);
    }, (value) => value.toFixed(1));

    [zoomSteppedInput, zoomSmoothInput].forEach((input) => {
        input?.addEventListener('change', () => {
            if (!input.checked) {
                return;
            }
            zoomMode = input.value;
            syncZoomRows();
            getCube()?.applyZoomSettings(zoomMode, zoomStep, zoomSmoothSpeed, zoomMin, zoomMax);
        });
    });

    refreshKeybindButtons();
    syncZoomRows();
    syncLanternRows();
    applyControlSettings();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
