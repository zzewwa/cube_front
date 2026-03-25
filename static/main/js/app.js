import { RubiksCube } from './cube.js';
import { CookieCube, CookieSettings } from './cookies.js';

const initApp = () => {
    requestAnimationFrame(() => {
        document.body.classList.add('is-ready');
    });

    const sceneBackdrop = document.querySelector('.scene-backdrop');
    const settingsCookies = new CookieSettings();
    const savedSettings = settingsCookies.loadSettings() ?? {};

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
                cubeNetVisible: cubeNetToggle?.checked ?? true
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

    let bgColor = savedSettings.bgColor ?? '#2c3640';
    let fogDensity = savedSettings.fogDensity ?? 0.025;
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

    let roundedEnabled = savedSettings.roundedEnabled ?? true;
    let roundedRadius = savedSettings.roundedRadius ?? 0.12;
    const radiusRow = document.getElementById('cfg-radius-row');

    const applyGeometry = () => {
        getCube()?.applyGeometry(roundedEnabled, roundedRadius);
    };

    onCheck('cfg-rounded', (value) => {
        roundedEnabled = value;
        if (radiusRow) {
            radiusRow.style.display = value ? '' : 'none';
        }
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
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
