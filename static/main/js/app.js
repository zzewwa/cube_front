import { RubiksCube } from './cube.js';
import { CookieCube, CookieSettings } from './cookies.js';
import { CUBE_CONFIG } from './cube-config.js';

const initApp = () => {
    // Remove legacy telemetry widget nodes if stale markup is still cached by the client.
    document.querySelectorAll('#platform-pulse, .platform-pulse, [data-platform-pulse]').forEach((node) => {
        node.remove();
    });

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
    const normalizeSelectableSkin = (value) => {
        if (value === 'golden' || value === 'water') {
            return 'classic';
        }
        return value;
    };

    let keymap = { ...defaultKeymap, ...(savedSettings.keymap ?? {}) };
    let reverseModifierCode = savedSettings.reverseModifierCode ?? 'ShiftLeft';
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
    let goldenShimmer = savedSettings.goldenShimmer ?? 0.18;
    let goldenShaderEnabled = savedSettings.goldenShaderEnabled ?? true;
    let goldenShimmerSpeed = savedSettings.goldenShimmerSpeed ?? 1.0;
    let goldenSparkleScale = savedSettings.goldenSparkleScale ?? 5.0;
    let goldenGemGlowMode = savedSettings.goldenGemGlowMode ?? 'all';
    let goldenGemGlowIntensity = savedSettings.goldenGemGlowIntensity ?? 0.22;
    let metalness = savedSettings.metalness ?? 0.2;
    let roughness = savedSettings.roughness ?? 0.92;
    let roundedEnabled = savedSettings.roundedEnabled ?? true;
    let roundedRadius = savedSettings.roundedRadius ?? 0.12;
    if (skinId === 'glow') {
        skinId = 'lantern';
    }
    if (skinId === 'matte') {
        skinId = 'classic';
    }
    skinId = normalizeSelectableSkin(skinId);

    const cubeConfig = JSON.parse(JSON.stringify(CUBE_CONFIG));
    if (savedSettings.bgColor !== undefined) cubeConfig.scene.backgroundColor = savedSettings.bgColor;
    if (savedSettings.fogDensity !== undefined) cubeConfig.scene.fogDensity = Number(savedSettings.fogDensity);
    if (savedSettings.fogEnabled !== undefined) cubeConfig.scene.fogEnabled = Boolean(savedSettings.fogEnabled);
    if (savedSettings.ambientColor !== undefined) cubeConfig.lights.ambient.color = savedSettings.ambientColor;
    if (savedSettings.ambientIntensity !== undefined) cubeConfig.lights.ambient.intensity = Number(savedSettings.ambientIntensity);
    if (savedSettings.rimColor !== undefined) cubeConfig.lights.rim.color = savedSettings.rimColor;
    if (savedSettings.rimIntensity !== undefined) cubeConfig.lights.rim.intensity = Number(savedSettings.rimIntensity);
    if (savedSettings.metalness !== undefined) cubeConfig.cube.textures.metalness = Number(savedSettings.metalness);
    if (savedSettings.roughness !== undefined) cubeConfig.cube.textures.roughness = Number(savedSettings.roughness);
    if (savedSettings.roundedEnabled !== undefined) cubeConfig.cube.geometry.roundedEdges.enabled = Boolean(savedSettings.roundedEnabled);
    if (savedSettings.roundedRadius !== undefined) cubeConfig.cube.geometry.roundedEdges.radius = Number(savedSettings.roundedRadius);
    if (savedSettings.speed !== undefined) cubeConfig.rotation.stepsPerTurn = Number(savedSettings.speed);
    if (savedSettings.rotateSensitivity !== undefined) cubeConfig.controls.rotateSpeed = Number(savedSettings.rotateSensitivity);
    if (savedSettings.zoomMode !== undefined) cubeConfig.controls.zoom.mode = savedSettings.zoomMode;
    if (savedSettings.zoomStep !== undefined) cubeConfig.controls.zoom.step = Number(savedSettings.zoomStep);
    if (savedSettings.zoomSmoothSpeed !== undefined) cubeConfig.controls.zoom.smoothSpeed = Number(savedSettings.zoomSmoothSpeed);
    if (savedSettings.zoomMin !== undefined) cubeConfig.controls.zoom.min = Number(savedSettings.zoomMin);
    if (savedSettings.zoomMax !== undefined) cubeConfig.controls.zoom.max = Number(savedSettings.zoomMax);
    cubeConfig.controls.zoom.smoothDamping = 0.9 - Math.min(0.08, cubeConfig.controls.zoom.smoothSpeed * 0.02);
    if (savedSettings.debugFpsEnabled !== undefined) cubeConfig.debug.fpsEnabled = Boolean(savedSettings.debugFpsEnabled);
    cubeConfig.runtime = cubeConfig.runtime ?? {};
    cubeConfig.runtime.skinId = skinId;
    cubeConfig.runtime.reverseModifierCode = reverseModifierCode;
    cubeConfig.runtime.lantern = cubeConfig.runtime.lantern ?? {};
    cubeConfig.runtime.lantern.opacity = lanternOpacity;
    cubeConfig.runtime.lantern.lightIntensity = lanternLightIntensity;
    cubeConfig.runtime.lantern.pulseSpeed = lanternPulseSpeed;
    cubeConfig.runtime.lantern.emberSize = lanternEmberSize;
    cubeConfig.runtime.lantern.showEmbers = lanternShowEmbers;
    cubeConfig.runtime.spheres = cubeConfig.runtime.spheres ?? {};
    cubeConfig.runtime.spheres.radius = spheresRadius;
    cubeConfig.runtime.golden = cubeConfig.runtime.golden ?? {};
    cubeConfig.runtime.golden.shimmer = goldenShimmer;
    cubeConfig.runtime.golden.shaderEnabled = goldenShaderEnabled;
    cubeConfig.runtime.golden.shimmerSpeed = goldenShimmerSpeed;
    cubeConfig.runtime.golden.sparkleScale = goldenSparkleScale;
    cubeConfig.runtime.golden.gemGlowMode = goldenGemGlowMode;
    cubeConfig.runtime.golden.gemGlowIntensity = goldenGemGlowIntensity;

    if (sceneBackdrop) {
        const cubeCookies = new CookieCube();
        
        const initCubeFromDB = () => {
            return fetch('/api/cube-state/load/', { credentials: 'same-origin' })
                .then(response => {
                    if (response.ok) {
                        return response.json().then(data => {
                            const hasMaterials = typeof data.cube_materials === 'string' && data.cube_materials.length > 0;
                            const hasSkinState = Boolean(data.skin_state && typeof data.skin_state === 'object' && Object.keys(data.skin_state).length > 0);
                            const hasAdditionalInfo = Boolean(data.additional_info && typeof data.additional_info === 'object' && Object.keys(data.additional_info).length > 0);

                            if (hasMaterials) {
                                cubeCookies.write(cubeCookies.stateCookieName, data.cube_materials);
                            }

                            if (hasSkinState || hasAdditionalInfo) {
                                if (hasSkinState) {
                                    const dbSkinState = data.skin_state;
                                    if (typeof dbSkinState.skinId === 'string' && dbSkinState.skinId) {
                                        skinId = dbSkinState.skinId;
                                        if (skinId === 'glow') {
                                            skinId = 'lantern';
                                        }
                                        if (skinId === 'matte') {
                                            skinId = 'classic';
                                        }
                                        skinId = normalizeSelectableSkin(skinId);
                                        cubeConfig.runtime.skinId = skinId;

                                        setTimeout(syncSkinSelectUi, 0);
                                        setTimeout(syncSkinSelectUi, 200);
                                    }
                                    if (dbSkinState.lanternOpacity !== undefined) lanternOpacity = Number(dbSkinState.lanternOpacity);
                                    if (dbSkinState.lanternLightIntensity !== undefined) lanternLightIntensity = Number(dbSkinState.lanternLightIntensity);
                                    if (dbSkinState.lanternPulseSpeed !== undefined) lanternPulseSpeed = Number(dbSkinState.lanternPulseSpeed);
                                    if (dbSkinState.lanternEmberSize !== undefined) lanternEmberSize = Number(dbSkinState.lanternEmberSize);
                                    if (dbSkinState.lanternShowEmbers !== undefined) lanternShowEmbers = Boolean(dbSkinState.lanternShowEmbers);
                                    if (dbSkinState.spheresRadius !== undefined) spheresRadius = Number(dbSkinState.spheresRadius);
                                    if (dbSkinState.goldenShimmer !== undefined) goldenShimmer = Number(dbSkinState.goldenShimmer);
                                    if (dbSkinState.goldenShaderEnabled !== undefined) goldenShaderEnabled = Boolean(dbSkinState.goldenShaderEnabled);
                                    if (dbSkinState.goldenShimmerSpeed !== undefined) goldenShimmerSpeed = Number(dbSkinState.goldenShimmerSpeed);
                                    if (dbSkinState.goldenSparkleScale !== undefined) goldenSparkleScale = Number(dbSkinState.goldenSparkleScale);
                                    if (dbSkinState.goldenGemGlowMode !== undefined) goldenGemGlowMode = dbSkinState.goldenGemGlowMode;
                                    if (dbSkinState.goldenGemGlowIntensity !== undefined) goldenGemGlowIntensity = Number(dbSkinState.goldenGemGlowIntensity);
                                    if (dbSkinState.roundedEnabled !== undefined) roundedEnabled = Boolean(dbSkinState.roundedEnabled);
                                    if (dbSkinState.roundedRadius !== undefined) roundedRadius = Number(dbSkinState.roundedRadius);
                                    if (dbSkinState.metalness !== undefined) metalness = Number(dbSkinState.metalness);
                                    if (dbSkinState.roughness !== undefined) roughness = Number(dbSkinState.roughness);

                                    cubeConfig.runtime.lantern.opacity = lanternOpacity;
                                    cubeConfig.runtime.lantern.lightIntensity = lanternLightIntensity;
                                    cubeConfig.runtime.lantern.pulseSpeed = lanternPulseSpeed;
                                    cubeConfig.runtime.lantern.emberSize = lanternEmberSize;
                                    cubeConfig.runtime.lantern.showEmbers = lanternShowEmbers;
                                    cubeConfig.runtime.spheres.radius = spheresRadius;
                                    cubeConfig.runtime.golden.shimmer = goldenShimmer;
                                    cubeConfig.runtime.golden.shaderEnabled = goldenShaderEnabled;
                                    cubeConfig.runtime.golden.shimmerSpeed = goldenShimmerSpeed;
                                    cubeConfig.runtime.golden.sparkleScale = goldenSparkleScale;
                                    cubeConfig.runtime.golden.gemGlowMode = goldenGemGlowMode;
                                    cubeConfig.runtime.golden.gemGlowIntensity = goldenGemGlowIntensity;
                                    cubeConfig.cube.geometry.roundedEdges.enabled = roundedEnabled;
                                    cubeConfig.cube.geometry.roundedEdges.radius = roundedRadius;
                                    cubeConfig.cube.textures.metalness = metalness;
                                    cubeConfig.cube.textures.roughness = roughness;
                                }

                                const skinPayload = {
                                    version: 2,
                                    skinState: hasSkinState ? data.skin_state : null,
                                    additionalInfo: hasAdditionalInfo ? data.additional_info : null
                                };
                                cubeCookies.write(cubeCookies.skinStateCookieName, JSON.stringify(skinPayload));
                            }
                        });
                    }
                })
                .catch(() => {
                    // use browser cookies if API fails
                });
        };
        
        initCubeFromDB().then(() => {
            window.cubeApp = new RubiksCube('.scene-backdrop', cubeCookies, cubeConfig);

        const persistAppState = () => {
            window.cubeApp?.persistCubeState();

            const cubeState = cubeCookies.loadState(window.cubeApp?.cubeMeshList.length);
            const skinStatePayload = {
                skinId,
                lanternOpacity,
                lanternLightIntensity,
                lanternPulseSpeed,
                lanternEmberSize,
                lanternShowEmbers,
                spheresRadius,
                goldenShimmer,
                goldenShaderEnabled,
                goldenShimmerSpeed,
                goldenSparkleScale,
                goldenGemGlowMode,
                goldenGemGlowIntensity,
                roundedEnabled,
                roundedRadius,
                metalness,
                roughness,
            };

            fetch('/api/cube-state/save/', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.getCsrfToken ? window.getCsrfToken() : ''
                },
                body: JSON.stringify({
                    cube_materials: cubeCookies.read(cubeCookies.stateCookieName) || '',
                    skin_state: skinStatePayload,
                    additional_info: cubeState?.additionalInfo || {}
                })
            }).catch(() => {});
            
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
                reverseModifierCode,
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
                spheresRadius,
                goldenShimmer,
                goldenShaderEnabled,
                goldenShimmerSpeed,
                goldenSparkleScale,
                goldenGemGlowMode,
                goldenGemGlowIntensity
            });
        };

        let persistDebounceTimer = null;
        const schedulePersistAppState = () => {
            if (persistDebounceTimer !== null) {
                clearTimeout(persistDebounceTimer);
            }
            persistDebounceTimer = setTimeout(() => {
                persistAppState();
            }, 250);
        };

        document.addEventListener('input', (event) => {
            const target = event.target;
            if (!target || !(target instanceof HTMLElement)) {
                return;
            }
            if (target.id && target.id.startsWith('cfg-')) {
                schedulePersistAppState();
            }
        });

        document.addEventListener('change', (event) => {
            const target = event.target;
            if (!target || !(target instanceof HTMLElement)) {
                return;
            }
            if (target.id && target.id.startsWith('cfg-')) {
                schedulePersistAppState();
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                persistAppState();
            }
        });

        window.addEventListener('pagehide', persistAppState);
        window.addEventListener('beforeunload', persistAppState);
        });
    }

    const pageLoader = document.querySelector('[data-page-loader]');
    if (pageLoader) {
        setTimeout(() => {
            pageLoader.style.pointerEvents = 'none';
        }, 1800);
    }

    const customSelectRegistry = new Map();
    const customNumberRegistry = new Map();

    const syncSkinSelectUi = () => {
        const skinSelectInput = document.getElementById('cfg-skin');
        if (!skinSelectInput) {
            return;
        }
        if (skinSelectInput.value !== skinId) {
            skinSelectInput.value = skinId;
        }

        const entry = customSelectRegistry.get(skinSelectInput);
        if (!entry) {
            return;
        }

        const selectedOption = skinSelectInput.options[skinSelectInput.selectedIndex] ?? skinSelectInput.options[0] ?? null;
        entry.label.textContent = selectedOption?.textContent || '';
        Array.from(entry.menu.querySelectorAll('.custom-select__option')).forEach((button) => {
            button.classList.toggle('is-selected', button.dataset.optionValue === skinSelectInput.value);
        });
    };

    const closeAllCustomSelects = () => {
        customSelectRegistry.forEach(({ wrapper }) => {
            wrapper.classList.remove('is-open');
        });
    };

    const buildCustomSelectOptions = (select, menu) => {
        menu.innerHTML = '';
        Array.from(select.options).forEach((option, index) => {
            const optionButton = document.createElement('button');
            optionButton.type = 'button';
            optionButton.className = 'custom-select__option';
            optionButton.dataset.optionValue = option.value;
            optionButton.dataset.optionIndex = String(index);
            optionButton.textContent = option.textContent || option.label || option.value;
            optionButton.disabled = option.disabled;
            optionButton.classList.toggle('is-selected', option.selected);
            if (option.disabled) {
                optionButton.classList.add('is-disabled');
            }
            optionButton.addEventListener('click', () => {
                if (option.disabled) {
                    return;
                }
                if (select.value !== option.value) {
                    select.value = option.value;
                    select.dispatchEvent(new Event('input', { bubbles: true }));
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
                closeAllCustomSelects();
            });
            menu.appendChild(optionButton);
        });
    };

    const syncCustomSelectState = (select) => {
        const entry = customSelectRegistry.get(select);
        if (!entry) {
            return;
        }

        const selectedOption = select.options[select.selectedIndex] ?? select.options[0] ?? null;
        entry.label.textContent = selectedOption?.textContent || '';
        entry.trigger.disabled = select.disabled;
        entry.wrapper.classList.toggle('is-disabled', select.disabled);

        const optionButtons = Array.from(entry.menu.querySelectorAll('.custom-select__option'));
        optionButtons.forEach((button) => {
            const isSelected = button.dataset.optionValue === select.value;
            button.classList.toggle('is-selected', isSelected);
        });
    };

    const initCustomSelects = (root = document) => {
        const selects = Array.from(root.querySelectorAll('select.site-select')).filter((select) => !select.dataset.customSelectReady);
        selects.forEach((select) => {
            select.dataset.customSelectReady = 'true';

            const wrapper = document.createElement('div');
            wrapper.className = 'custom-select';

            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'custom-select__trigger';
            trigger.setAttribute('aria-haspopup', 'listbox');
            trigger.setAttribute('aria-expanded', 'false');

            const label = document.createElement('span');
            label.className = 'custom-select__label';

            const arrow = document.createElement('span');
            arrow.className = 'custom-select__arrow';
            arrow.innerHTML = `
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M3.5 5.75 8 10.25l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
            `;

            const menu = document.createElement('div');
            menu.className = 'custom-select__menu';
            menu.setAttribute('role', 'listbox');

            select.parentNode.insertBefore(wrapper, select);
            wrapper.appendChild(select);
            wrapper.appendChild(trigger);
            trigger.appendChild(label);
            trigger.appendChild(arrow);
            wrapper.appendChild(menu);

            select.classList.add('site-select--native');
            buildCustomSelectOptions(select, menu);

            customSelectRegistry.set(select, { wrapper, trigger, label, menu });
            syncCustomSelectState(select);

            trigger.addEventListener('click', () => {
                if (select.disabled) {
                    return;
                }
                const willOpen = !wrapper.classList.contains('is-open');
                closeAllCustomSelects();
                wrapper.classList.toggle('is-open', willOpen);
                trigger.setAttribute('aria-expanded', String(willOpen));
            });

            trigger.addEventListener('keydown', (event) => {
                const enabledOptions = Array.from(select.options).filter((option) => !option.disabled);
                const currentEnabledIndex = enabledOptions.findIndex((option) => option.value === select.value);
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    const direction = event.key === 'ArrowDown' ? 1 : -1;
                    const nextIndex = currentEnabledIndex < 0
                        ? 0
                        : (currentEnabledIndex + direction + enabledOptions.length) % enabledOptions.length;
                    const nextOption = enabledOptions[nextIndex];
                    if (nextOption) {
                        select.value = nextOption.value;
                        select.dispatchEvent(new Event('input', { bubbles: true }));
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    wrapper.classList.add('is-open');
                    trigger.setAttribute('aria-expanded', 'true');
                }
                if (event.key === 'Escape') {
                    closeAllCustomSelects();
                    trigger.setAttribute('aria-expanded', 'false');
                }
            });

            select.addEventListener('change', () => {
                buildCustomSelectOptions(select, menu);
                syncCustomSelectState(select);
            });
        });
    };

    const syncCustomNumberState = (input) => {
        const entry = customNumberRegistry.get(input);
        if (!entry) {
            return;
        }
        const isDisabled = input.disabled;
        entry.wrapper.classList.toggle('is-disabled', isDisabled);
        entry.decrement.disabled = isDisabled;
        entry.increment.disabled = isDisabled;
    };

    const initCustomNumberInputs = (root = document) => {
        const inputs = Array.from(root.querySelectorAll('input.profile-input[type="number"]'))
            .filter((input) => !input.dataset.customNumberReady);

        inputs.forEach((input) => {
            input.dataset.customNumberReady = 'true';

            const wrapper = document.createElement('div');
            wrapper.className = 'custom-number';

            const controls = document.createElement('div');
            controls.className = 'custom-number__controls';

            const increment = document.createElement('button');
            increment.type = 'button';
            increment.className = 'custom-number__button custom-number__button--inc';
            increment.setAttribute('aria-label', 'Увеличить значение');
            increment.textContent = '+';

            const decrement = document.createElement('button');
            decrement.type = 'button';
            decrement.className = 'custom-number__button custom-number__button--dec';
            decrement.setAttribute('aria-label', 'Уменьшить значение');
            decrement.textContent = '−';

            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
            wrapper.appendChild(controls);
            controls.appendChild(increment);
            controls.appendChild(decrement);

            input.classList.add('profile-input--number-enhanced');
            customNumberRegistry.set(input, { wrapper, increment, decrement });

            const stepValue = (direction) => {
                if (input.disabled) {
                    return;
                }
                if (!input.value && input.min !== '') {
                    input.value = input.min;
                }
                if (!input.value && direction > 0) {
                    input.value = '0';
                }
                try {
                    if (direction > 0) {
                        input.stepUp();
                    } else {
                        input.stepDown();
                    }
                } catch (_error) {
                    const step = Number(input.step) || 1;
                    const current = Number(input.value) || 0;
                    input.value = String(current + (step * direction));
                }
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.focus();
            };

            increment.addEventListener('click', () => stepValue(1));
            decrement.addEventListener('click', () => stepValue(-1));
            input.addEventListener('input', () => syncCustomNumberState(input));
            input.addEventListener('change', () => syncCustomNumberState(input));

            syncCustomNumberState(input);
        });
    };

    document.addEventListener('click', (event) => {
        const insideCustomSelect = event.target.closest('.custom-select');
        if (!insideCustomSelect) {
            closeAllCustomSelects();
            customSelectRegistry.forEach(({ trigger }) => {
                trigger.setAttribute('aria-expanded', 'false');
            });
        }
    });

    initCustomSelects();
    initCustomNumberInputs();
    syncSkinSelectUi();

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

    const initRoomsCreateUi = () => {
        const roomRoot = document.querySelector('[data-room-create-root]');
        if (!roomRoot) {
            return;
        }

        const createToggle = roomRoot.querySelector('[data-room-create-toggle]');
        const createPanel = roomRoot.querySelector('[data-room-create-panel]');
        const searchInput = roomRoot.querySelector('[data-room-user-search]');
        const resultsNode = roomRoot.querySelector('[data-room-search-results]');
        const selectedNode = roomRoot.querySelector('[data-room-selected-invites]');
        const payloadInput = document.getElementById('id_invite_payload');
        if (!searchInput || !resultsNode || !selectedNode || !payloadInput) {
            return;
        }

        let profileCardBackdrop = null;
        let profileCardDialog = null;

        const initProfileCardBackdrop = () => {
            if (profileCardBackdrop) return;

            profileCardBackdrop = document.createElement('div');
            profileCardBackdrop.className = 'profile-card-backdrop';

            profileCardDialog = document.createElement('div');
            profileCardDialog.className = 'profile-card-dialog';

            document.body.appendChild(profileCardBackdrop);
            document.body.appendChild(profileCardDialog);

            profileCardBackdrop.addEventListener('click', () => {
                profileCardBackdrop?.classList.remove('is-open');
            });
        };

        const showProfileCard = async (username) => {
            initProfileCardBackdrop();

            try {
                const response = await fetch(`/rooms/profile-card/${encodeURIComponent(username)}/`);
                if (!response.ok) return;

                const data = await response.json();

                profileCardDialog.innerHTML = `
                    <div class="profile-card__header">
                        <div class="profile-card__avatar">
                            ${data.avatar_url ? `<img src="${data.avatar_url}" alt="Аватар ${data.display_name}">` : `<span>${String(data.display_name || data.username).slice(0, 2).toUpperCase()}</span>`}
                        </div>
                        <div>
                            <p class="profile-card__name">${data.display_name}</p>
                            <p class="profile-card__username">@${data.username}</p>
                        </div>
                    </div>
                    <div class="profile-card__stats">
                        <div class="profile-card__stat">
                            <p class="profile-card__stat-label">Лучше всего</p>
                            <p class="profile-card__stat-value">${data.personal_best}</p>
                        </div>
                        <div class="profile-card__stat">
                            <p class="profile-card__stat-label">Рейтинг</p>
                            <p class="profile-card__stat-value is-accent">${data.rating_points}</p>
                        </div>
                        <div class="profile-card__stat">
                            <p class="profile-card__stat-label">Место</p>
                            <p class="profile-card__stat-value">${data.rating_position || '—'}</p>
                        </div>
                        <div class="profile-card__stat">
                            <p class="profile-card__stat-label">Соревн. лучше</p>
                            <p class="profile-card__stat-value">${data.public_best}</p>
                        </div>
                    </div>
                    <div class="profile-card__footer">
                        <a href="${data.profile_url}" class="profile-card__link">Полный профиль</a>
                    </div>
                `;

                profileCardBackdrop?.classList.add('is-open');
            } catch (_error) {
                // silently fail
            }
        };

        const setCreatePanelState = (isOpen) => {
            createPanel?.classList.toggle('is-open', isOpen);
            createToggle?.setAttribute('aria-expanded', String(isOpen));
            if (!isOpen) {
                resultsNode.classList.remove('is-open');
            }
        };

        createToggle?.addEventListener('click', () => {
            const isOpen = createToggle.getAttribute('aria-expanded') === 'true';
            setCreatePanelState(!isOpen);
            if (!isOpen) {
                window.setTimeout(() => searchInput.focus(), 120);
            }
        });

        setCreatePanelState(createPanel?.classList.contains('is-open') ?? false);

        const selected = new Map();
        let searchTimer = null;


        const toPayload = () => JSON.stringify(
            Array.from(selected.values()).map((item) => ({
                username: item.username,
                role: item.role,
            }))
        );

        const renderSelected = () => {
            payloadInput.value = toPayload();
            if (!selected.size) {
                selectedNode.innerHTML = '<p class="record-history__empty">Пока никого не пригласили.</p>';
                return;
            }

            selectedNode.innerHTML = '';
            selected.forEach((item) => {
                const row = document.createElement('div');
                row.className = 'rooms-selected-item';
                const avatar = item.avatarUrl
                    ? `<img src="${item.avatarUrl}" alt="Аватар ${item.displayName}">`
                    : `<span>${String(item.displayName || item.username).slice(0, 2).toUpperCase()}</span>`;
                row.innerHTML = `
                    <div class="rooms-selected-item__main">
                        <span class="rooms-search-avatar rooms-selected-item__avatar" data-profile-user="${item.username}" style="cursor: pointer;">${avatar}</span>
                        <div class="rooms-selected-item__identity">
                            <strong>${item.displayName}</strong>
                            <span>@${item.username}</span>
                        </div>
                    </div>
                    <div class="rooms-selected-item__actions">
                        <select class="profile-input site-select" data-invite-role="${item.username}">
                            <option value="player" ${item.role === 'player' ? 'selected' : ''}>Игрок</option>
                            <option value="spectator" ${item.role === 'spectator' ? 'selected' : ''}>Зритель</option>
                        </select>
                        <button type="button" class="icon-square-btn icon-square-btn--sm" aria-label="Удалить приглашение" data-remove-invite="${item.username}">×</button>
                    </div>
                `;
                selectedNode.appendChild(row);
            });
            initCustomSelects(selectedNode);

            selectedNode.querySelectorAll('[data-profile-user]').forEach((avatarEl) => {
                avatarEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const username = avatarEl.dataset.profileUser;
                    showProfileCard(username);
                });
            });
        };

        const renderSearchResults = (users) => {
            if (!users.length) {
                resultsNode.classList.remove('is-open');
                resultsNode.innerHTML = '';
                return;
            }

            resultsNode.innerHTML = '';
            users.forEach((user) => {
                if (selected.has(user.username)) {
                    return;
                }

                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'rooms-search-item';
                button.dataset.inviteUser = user.username;

                const avatar = user.avatar_url
                    ? `<img src="${user.avatar_url}" alt="Аватар ${user.display_name}">`
                    : `<span>${String(user.display_name || user.username).slice(0, 2).toUpperCase()}</span>`;

                button.innerHTML = `
                    <span class="rooms-search-avatar">${avatar}</span>
                    <span>
                        <strong>${user.display_name}</strong>
                        <span>@${user.username}</span>
                    </span>
                `;
                resultsNode.appendChild(button);
            });

            resultsNode.classList.toggle('is-open', !!resultsNode.children.length);
        };

        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            if (searchTimer) {
                clearTimeout(searchTimer);
            }

            if (query.length < 2) {
                resultsNode.classList.remove('is-open');
                resultsNode.innerHTML = '';
                return;
            }

            searchTimer = setTimeout(async () => {
                try {
                    const response = await fetch(`/rooms/search-users/?q=${encodeURIComponent(query)}`);
                    if (!response.ok) {
                        renderSearchResults([]);
                        return;
                    }
                    const payload = await response.json();
                    renderSearchResults(payload.results || []);
                } catch (_error) {
                    renderSearchResults([]);
                }
            }, 180);
        });

        resultsNode.addEventListener('click', (event) => {
            const button = event.target.closest('[data-invite-user]');
            if (!button) {
                return;
            }

            const username = button.dataset.inviteUser;
            const strongNode = button.querySelector('strong');
            const avatarImage = button.querySelector('img');
            selected.set(username, {
                username,
                displayName: strongNode?.textContent || username,
                avatarUrl: avatarImage?.getAttribute('src') || '',
                role: 'player',
            });
            renderSelected();
            button.remove();
            if (!resultsNode.children.length) {
                resultsNode.classList.remove('is-open');
            }
        });

        selectedNode.addEventListener('change', (event) => {
            const select = event.target.closest('[data-invite-role]');
            if (!select) {
                return;
            }
            const username = select.dataset.inviteRole;
            const current = selected.get(username);
            if (!current) {
                return;
            }
            current.role = select.value;
            selected.set(username, current);
            payloadInput.value = toPayload();
        });

        selectedNode.addEventListener('click', (event) => {
            const removeButton = event.target.closest('[data-remove-invite]');
            if (!removeButton) {
                return;
            }
            selected.delete(removeButton.dataset.removeInvite);
            renderSelected();
        });

        const pendingBadgeNode = roomRoot.querySelector('[data-pending-invitations-badge]');
        const pendingListNode = roomRoot.querySelector('[data-pending-invitations-list]');

        const renderPendingInvitations = (items) => {
            if (!pendingListNode) {
                return;
            }

            if (!Array.isArray(items) || !items.length) {
                pendingListNode.innerHTML = '<p class="record-history__empty">Новых приглашений нет.</p>';
                return;
            }

            const csrfToken = window.getCsrfToken ? window.getCsrfToken() : '';
            pendingListNode.innerHTML = items
                .map((invitation) => `
                    <article class="rooms-invitation-item">
                        <div>
                            <strong>${invitation.room_name}</strong>
                            <p>@${invitation.inviter_username} приглашает как: ${invitation.as_role_display}</p>
                        </div>
                        <div class="rooms-invitation-actions">
                            <form method="post" action="/rooms/invitations/${invitation.id}/accept/">
                                <input type="hidden" name="csrfmiddlewaretoken" value="${csrfToken}">
                                <button type="submit" class="profile-tabs__button is-active">Принять</button>
                            </form>
                            <form method="post" action="/rooms/invitations/${invitation.id}/decline/">
                                <input type="hidden" name="csrfmiddlewaretoken" value="${csrfToken}">
                                <button type="submit" class="profile-tabs__button">Отклонить</button>
                            </form>
                        </div>
                    </article>
                `)
                .join('');
        };

        const syncPendingInvitations = async () => {
            if (!pendingListNode) {
                return;
            }

            try {
                const response = await fetch('/rooms/pending-invitations/', { credentials: 'same-origin' });
                if (!response.ok) {
                    return;
                }
                const payload = await response.json();
                if (pendingBadgeNode) {
                    pendingBadgeNode.textContent = String(payload.count ?? 0);
                }
                renderPendingInvitations(payload.invitations || []);
            } catch (_error) {
                // ignore poll errors
            }
        };

        syncPendingInvitations();
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                syncPendingInvitations();
            }
        }, 3000);

        renderSelected();
    };

    initRoomsCreateUi();

    const initPresenceHeartbeat = () => {
        const isAuthenticated = document.body.dataset.userAuthenticated === '1';
        if (!isAuthenticated) {
            return;
        }

        const ping = async () => {
            try {
                await fetch('/api/presence/ping/', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'X-CSRFToken': window.getCsrfToken ? window.getCsrfToken() : '',
                    },
                });
            } catch (_error) {
                // ignore transient ping errors
            }
        };

        ping();
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                ping();
            }
        }, 25000);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                ping();
            }
        });
    };

    initPresenceHeartbeat();

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
    const profileModal = document.querySelector('[data-profile-modal]');
    const profileBackdrop = document.querySelector('[data-profile-backdrop]');
    const profileOpenButton = document.querySelector('[data-profile-open]');
    const profileCloseButton = document.querySelector('[data-profile-close]');
    const profileTabButtons = Array.from(document.querySelectorAll('[data-profile-tab-trigger]'));
    const profileTabPanels = Array.from(document.querySelectorAll('[data-profile-tab-panel]'));
    const profileAvatarInput = document.getElementById('id_avatar');
    const profileForm = document.querySelector('.profile-form');
    const profileSaveButton = document.querySelector('[data-profile-save-button]');
    const profileAvatarPreviewNodes = Array.from(document.querySelectorAll('[data-profile-avatar-preview]'));
    const profileAvatarFallbackNodes = Array.from(document.querySelectorAll('[data-profile-avatar-preview-fallback]'));
    const profileShareButton = document.querySelector('[data-profile-share]');
    const bugReportOpenButton = document.querySelector('[data-bug-report-open]');
    const bugReportCloseButton = document.querySelector('[data-bug-report-close]');
    const bugReportBackdrop = document.querySelector('[data-bug-report-backdrop]');
    const bugReportModal = document.querySelector('[data-bug-report-modal]');
    const profileFlashContainer = document.querySelector('.profile-flashes');
    const avatarCropperBackdrop = document.querySelector('[data-avatar-cropper-backdrop]');
    const avatarCropperModal = document.querySelector('[data-avatar-cropper-modal]');
    const avatarCropperApply = document.querySelector('[data-avatar-cropper-apply]');
    const avatarCropperCancelButtons = Array.from(document.querySelectorAll('[data-avatar-cropper-cancel]'));
    const avatarEditorRoot = document.querySelector('[data-avatar-editor]');
    const avatarViewport = document.querySelector('[data-avatar-viewport]');
    const avatarEditorImage = document.querySelector('[data-avatar-editor-image]');
    const avatarEditorPlaceholder = document.querySelector('[data-avatar-editor-placeholder]');
    const avatarScaleInput = document.querySelector('[data-avatar-scale]');
    const avatarScaleValue = document.querySelector('[data-avatar-scale-value]');
    const avatarScaleField = document.getElementById('id_avatar_scale');
    const avatarOffsetXField = document.getElementById('id_avatar_offset_x');
    const avatarOffsetYField = document.getElementById('id_avatar_offset_y');
    const isProfileOpen = () => profileModal?.classList.contains('is-open') ?? false;
    const isAvatarCropperOpen = () => avatarCropperModal?.classList.contains('is-open') ?? false;
    let pendingAvatarObjectUrl = null;
    let profileInitialFingerprint = '';

    const avatarEditorState = {
        scale: Number(avatarScaleField?.value || 1),
        offsetX: Number(avatarOffsetXField?.value || 0),
        offsetY: Number(avatarOffsetYField?.value || 0),
        imageWidth: 0,
        imageHeight: 0,
        dragging: false,
        pointerId: null,
        lastX: 0,
        lastY: 0,
    };

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
    setControlValue('cfg-golden-shimmer', goldenShimmer);
    setControlValue('cfg-golden-shader-enabled', goldenShaderEnabled);
    setControlValue('cfg-golden-shimmer-speed', goldenShimmerSpeed);
    setControlValue('cfg-golden-sparkle', goldenSparkleScale);
    setControlValue('cfg-golden-gem-glow-mode', goldenGemGlowMode);
    setControlValue('cfg-golden-gem-glow-intensity', goldenGemGlowIntensity);
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

    const setActiveProfileTab = (tabId) => {
        if (!profileTabButtons.length || !profileTabPanels.length) {
            return;
        }

        const availableTabs = new Set(profileTabButtons.map((button) => button.dataset.profileTabTrigger));
        const requestedTab = tabId || profileModal?.dataset.profileInitialTab || 'info';
        const targetTab = availableTabs.has(requestedTab)
            ? requestedTab
            : (profileTabButtons[0]?.dataset.profileTabTrigger || 'info');
        profileTabButtons.forEach((button) => {
            button.classList.toggle('is-active', button.dataset.profileTabTrigger === targetTab);
        });
        profileTabPanels.forEach((panel) => {
            panel.classList.toggle('is-active', panel.dataset.profileTabPanel === targetTab);
        });
        if (profileModal) {
            profileModal.dataset.profileInitialTab = targetTab;
        }
    };

    const setProfileState = (isOpen, tabId) => {
        if (!profileModal || !profileBackdrop) {
            return;
        }

        profileModal.classList.toggle('is-open', isOpen);
        profileBackdrop.classList.toggle('is-open', isOpen);
        profileModal.setAttribute('aria-hidden', String(!isOpen));
        document.body.classList.toggle('profile-open', isOpen);
        if (isOpen) {
            setMenuState(false);
            setSettingsState(false);
            setActiveProfileTab(tabId);
        } else {
            setAvatarCropperState(false);
            profileFlashContainer?.querySelectorAll('.profile-flash--success').forEach((node) => node.remove());
            if (profileFlashContainer && !profileFlashContainer.children.length) {
                profileFlashContainer.remove();
            }
            const url = new URL(window.location.href);
            url.searchParams.delete('profile');
            url.searchParams.delete('tab');
            window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        }
    };

    const setBugReportState = (isOpen) => {
        if (!bugReportModal || !bugReportBackdrop) {
            return;
        }

        bugReportModal.classList.toggle('is-open', isOpen);
        bugReportBackdrop.classList.toggle('is-open', isOpen);
        bugReportModal.setAttribute('aria-hidden', String(!isOpen));

        if (isOpen) {
            setMenuState(false);
            setSettingsState(false);
        }
    };

    const initAttemptCharts = () => {
        const chartRoots = Array.from(document.querySelectorAll('[data-attempt-chart]'));
        if (!chartRoots.length) {
            return;
        }

        chartRoots.forEach((chartRoot) => {
            const dataScriptId = chartRoot.dataset.chartPointsId;
            const plot = chartRoot.querySelector('[data-attempt-chart-plot]');
            const controls = Array.from(chartRoot.querySelectorAll('[data-attempt-chart-count]'));
            if (!dataScriptId || !plot || !controls.length) {
                return;
            }

            const sourceNode = document.getElementById(dataScriptId);
            if (!sourceNode) {
                return;
            }

            let points = [];
            try {
                points = JSON.parse(sourceNode.textContent || '[]');
            } catch (_error) {
                points = [];
            }

            const render = (count) => {
                controls.forEach((button) => {
                    button.classList.toggle('is-active', Number(button.dataset.attemptChartCount) === count);
                });

                if (!Array.isArray(points) || !points.length) {
                    plot.innerHTML = '<p class="record-history__empty">Пока нет попыток для графика.</p>';
                    return;
                }

                const visible = points.slice(-count);
                const values = visible.map((item) => Number(item.seconds) || 0);
                const minSeconds = Math.min(...values);
                const maxSeconds = Math.max(...values);
                const range = Math.max(0.01, maxSeconds - minSeconds);

                const width = 760;
                const height = 220;
                const padTop = 18;
                const padBottom = 46;
                const padLeft = 46;
                const padRight = 18;
                const chartWidth = width - padLeft - padRight;
                const chartHeight = height - padTop - padBottom;

                const toX = (index) => {
                    if (visible.length === 1) {
                        return padLeft + chartWidth / 2;
                    }
                    return padLeft + (index / (visible.length - 1)) * chartWidth;
                };

                const toY = (seconds) => {
                    const normalized = (seconds - minSeconds) / range;
                    return padTop + chartHeight - normalized * chartHeight;
                };

                const yTicks = [minSeconds, (minSeconds + maxSeconds) / 2, maxSeconds];
                const gridLines = yTicks
                    .map((value) => {
                        const y = toY(value);
                        return `<line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="attempt-chart__grid-line" />`;
                    })
                    .join('');

                const yLabels = yTicks
                    .map((value) => {
                        const y = toY(value);
                        return `<text x="${padLeft - 8}" y="${y}" class="attempt-chart__axis-label" text-anchor="end" dominant-baseline="middle">${value.toFixed(2)}</text>`;
                    })
                    .join('');

                let segments = '';
                for (let index = 1; index < visible.length; index++) {
                    const prev = values[index - 1];
                    const current = values[index];
                    const x1 = toX(index - 1);
                    const y1 = toY(prev);
                    const x2 = toX(index);
                    const y2 = toY(current);
                    const trendClass = current < prev
                        ? 'attempt-chart__segment--improve'
                        : current > prev
                            ? 'attempt-chart__segment--regress'
                            : 'attempt-chart__segment--stable';
                    segments += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="attempt-chart__segment ${trendClass}" />`;
                }

                const baselineY = padTop + chartHeight;
                const areaPoints = visible
                    .map((_item, index) => `${toX(index)},${toY(values[index])}`)
                    .join(' ');
                const areaPath = visible.length > 1
                    ? `M ${toX(0)} ${baselineY} L ${areaPoints} L ${toX(visible.length - 1)} ${baselineY} Z`
                    : '';

                const dots = visible
                    .map((item, index) => {
                        const x = toX(index);
                        const y = toY(values[index]);
                        const tooltip = `${item.time || '—'} • ${item.datetime || ''}`;
                        return `<circle cx="${x}" cy="${y}" r="4.5" class="attempt-chart__dot" data-tooltip="${tooltip}" data-attempt-index="${index + 1}" tabindex="0"></circle>`;
                    })
                    .join('');

                const xLabels = visible
                    .map((item, index) => {
                        const x = toX(index);
                        const attemptLabel = String(index + 1);
                        return `<text x="${x}" y="${height - 20}" class="attempt-chart__axis-label" text-anchor="middle">${attemptLabel}</text>`;
                    })
                    .join('');

                const gradientId = `attemptChartAreaGradient-${Math.random().toString(36).slice(2, 10)}`;

                plot.innerHTML = `
                    <div class="attempt-chart__line-wrap">
                        <svg class="attempt-chart__svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="График попыток: по X номер попытки, по Y время в секундах">
                            <defs>
                                <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="rgba(52, 211, 153, 0.35)"></stop>
                                    <stop offset="100%" stop-color="rgba(52, 211, 153, 0.02)"></stop>
                                </linearGradient>
                            </defs>
                            ${gridLines}
                            ${yLabels}
                            ${areaPath ? `<path d="${areaPath}" class="attempt-chart__area" style="fill:url(#${gradientId})"></path>` : ''}
                            ${segments}
                            ${dots}
                            ${xLabels}
                        </svg>
                        <div class="attempt-chart__tooltip" hidden></div>
                    </div>
                `;

                const wrap = plot.querySelector('.attempt-chart__line-wrap');
                const tooltipNode = plot.querySelector('.attempt-chart__tooltip');
                if (!wrap || !tooltipNode) {
                    return;
                }

                const showTooltip = (_event, dot) => {
                    const hint = dot.dataset.tooltip || '';
                    const attemptIndex = dot.dataset.attemptIndex || '';
                    tooltipNode.textContent = `Попытка ${attemptIndex}: ${hint}`;
                    tooltipNode.hidden = false;

                    const wrapRect = wrap.getBoundingClientRect();
                    const dotRect = dot.getBoundingClientRect();
                    const dotCenterX = dotRect.left - wrapRect.left + dotRect.width / 2;
                    const dotCenterY = dotRect.top - wrapRect.top + dotRect.height / 2;

                    tooltipNode.style.left = `${dotCenterX}px`;
                    tooltipNode.style.top = `${dotCenterY}px`;

                    const wrapPadding = 8;
                    const tipRect = tooltipNode.getBoundingClientRect();
                    let x = dotCenterX - tipRect.width / 2;

                    const yAbove = dotCenterY - tipRect.height - 10;
                    const yBelow = dotCenterY + 10;
                    let y = yAbove >= wrapPadding
                        ? yAbove
                        : (yBelow + tipRect.height <= wrapRect.height - wrapPadding ? yBelow : wrapPadding);

                    if (x + tipRect.width > wrapRect.width - wrapPadding) {
                        x = wrapRect.width - wrapPadding - tipRect.width;
                    }
                    if (y + tipRect.height > wrapRect.height - wrapPadding) {
                        y = wrapRect.height - wrapPadding - tipRect.height;
                    }
                    x = Math.max(wrapPadding, x);
                    y = Math.max(wrapPadding, y);

                    tooltipNode.style.left = `${x}px`;
                    tooltipNode.style.top = `${y}px`;
                };

                const hideTooltip = () => {
                    tooltipNode.hidden = true;
                };

                const dotNodes = Array.from(plot.querySelectorAll('.attempt-chart__dot'));
                dotNodes.forEach((dot) => {
                    dot.addEventListener('mousemove', (event) => showTooltip(event, dot));
                    dot.addEventListener('mouseenter', (event) => showTooltip(event, dot));
                    dot.addEventListener('focus', (event) => showTooltip(event, dot));
                    dot.addEventListener('mouseleave', hideTooltip);
                    dot.addEventListener('blur', hideTooltip);
                });
            };

            controls.forEach((button) => {
                button.addEventListener('click', () => {
                    render(Number(button.dataset.attemptChartCount));
                });
            });

            const defaultCount = Number(chartRoot.dataset.defaultCount || 10);
            render(defaultCount);
        });
    };

    const setAvatarCropperState = (isOpen) => {
        if (!avatarCropperModal || !avatarCropperBackdrop) {
            return;
        }

        avatarCropperModal.classList.toggle('is-open', isOpen);
        avatarCropperBackdrop.classList.toggle('is-open', isOpen);
        avatarCropperModal.setAttribute('aria-hidden', String(!isOpen));
    };

    const getProfileFormFingerprint = () => {
        if (!profileForm) {
            return '';
        }

        const formData = new FormData(profileForm);
        formData.delete('csrfmiddlewaretoken');
        const items = [];
        for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
                items.push(`${key}=file:${value.name}:${value.size}:${value.lastModified}`);
                continue;
            }
            items.push(`${key}=${value}`);
        }
        items.sort();
        return items.join('|');
    };

    const syncProfileSaveButtonState = () => {
        if (!profileSaveButton || !profileForm) {
            return;
        }

        const hasErrors = Boolean(profileForm.querySelector('.profile-field__error, .profile-form-errors'));
        const isDirty = getProfileFormFingerprint() !== profileInitialFingerprint;
        profileSaveButton.classList.toggle('is-hidden', !hasErrors && !isDirty);
    };

    const clampAvatarOffsets = () => {
        if (!avatarViewport || !avatarEditorImage || !avatarEditorState.imageWidth || !avatarEditorState.imageHeight) {
            return;
        }

        const viewportSize = avatarViewport.clientWidth;
        const baseScale = Math.max(viewportSize / avatarEditorState.imageWidth, viewportSize / avatarEditorState.imageHeight);
        const renderedWidth = avatarEditorState.imageWidth * baseScale * avatarEditorState.scale;
        const renderedHeight = avatarEditorState.imageHeight * baseScale * avatarEditorState.scale;
        const maxOffsetX = Math.max(0, (renderedWidth - viewportSize) / 2);
        const maxOffsetY = Math.max(0, (renderedHeight - viewportSize) / 2);

        avatarEditorState.offsetX = Math.min(maxOffsetX, Math.max(-maxOffsetX, avatarEditorState.offsetX));
        avatarEditorState.offsetY = Math.min(maxOffsetY, Math.max(-maxOffsetY, avatarEditorState.offsetY));
    };

    const renderAvatarEditor = () => {
        if (!avatarEditorImage || !avatarViewport) {
            return;
        }

        const viewportSize = avatarViewport.clientWidth;
        const baseScale = avatarEditorState.imageWidth && avatarEditorState.imageHeight
            ? Math.max(viewportSize / avatarEditorState.imageWidth, viewportSize / avatarEditorState.imageHeight)
            : 1;

        clampAvatarOffsets();
        avatarEditorImage.style.width = `${avatarEditorState.imageWidth * baseScale}px`;
        avatarEditorImage.style.height = `${avatarEditorState.imageHeight * baseScale}px`;
        avatarEditorImage.style.transform = `translate(calc(-50% + ${avatarEditorState.offsetX}px), calc(-50% + ${avatarEditorState.offsetY}px)) scale(${avatarEditorState.scale})`;
        if (avatarScaleInput) {
            avatarScaleInput.value = String(avatarEditorState.scale);
        }
        if (avatarScaleValue) {
            avatarScaleValue.textContent = `${avatarEditorState.scale.toFixed(2)}x`;
        }
        if (avatarScaleField) {
            avatarScaleField.value = avatarEditorState.scale.toFixed(4);
        }
        if (avatarOffsetXField) {
            avatarOffsetXField.value = avatarEditorState.offsetX.toFixed(2);
        }
        if (avatarOffsetYField) {
            avatarOffsetYField.value = avatarEditorState.offsetY.toFixed(2);
        }
    };

    const activateAvatarEditor = (src) => {
        if (!avatarEditorImage) {
            return;
        }

        avatarEditorImage.onload = () => {
            avatarEditorState.imageWidth = avatarEditorImage.naturalWidth;
            avatarEditorState.imageHeight = avatarEditorImage.naturalHeight;
            avatarEditorState.scale = 1;
            avatarEditorState.offsetX = 0;
            avatarEditorState.offsetY = 0;
            avatarEditorImage.classList.remove('is-hidden');
            avatarEditorPlaceholder?.classList.add('is-hidden');
            renderAvatarEditor();
        };
        avatarEditorImage.src = src;
    };

    const resetAvatarEditorState = () => {
        avatarEditorState.scale = 1;
        avatarEditorState.offsetX = 0;
        avatarEditorState.offsetY = 0;
        if (avatarScaleInput) {
            avatarScaleInput.value = '1';
        }
        renderAvatarEditor();
    };

    const buildAvatarCropPreview = () => {
        if (!avatarEditorImage || !avatarViewport || !avatarEditorState.imageWidth || !avatarEditorState.imageHeight) {
            return null;
        }

        const viewportSize = avatarViewport.clientWidth;
        const baseScale = Math.max(viewportSize / avatarEditorState.imageWidth, viewportSize / avatarEditorState.imageHeight);
        const drawWidth = avatarEditorState.imageWidth * baseScale * avatarEditorState.scale;
        const drawHeight = avatarEditorState.imageHeight * baseScale * avatarEditorState.scale;
        const drawX = (viewportSize - drawWidth) / 2 + avatarEditorState.offsetX;
        const drawY = (viewportSize - drawHeight) / 2 + avatarEditorState.offsetY;

        const canvas = document.createElement('canvas');
        canvas.width = viewportSize;
        canvas.height = viewportSize;
        const context = canvas.getContext('2d');
        if (!context) {
            return null;
        }

        context.drawImage(avatarEditorImage, drawX, drawY, drawWidth, drawHeight);
        return canvas.toDataURL('image/png');
    };

    const setAvatarPreviewData = (src) => {
        profileAvatarPreviewNodes.forEach((node) => {
            if (node.tagName !== 'IMG') {
                return;
            }
            if (!node.dataset.originalSrc && node.getAttribute('src')) {
                node.dataset.originalSrc = node.getAttribute('src');
            }
            node.src = src;
            node.classList.remove('is-hidden');
        });
        profileAvatarFallbackNodes.forEach((node) => {
            node.classList.add('is-hidden');
        });
    };

    const syncAvatarPreview = (file, options = {}) => {
        if (!profileAvatarPreviewNodes.length) {
            return;
        }

        const preserveTransform = options.preserveTransform === true;

        if (!file) {
            profileAvatarPreviewNodes.forEach((node) => {
                if (node.dataset.originalSrc) {
                    node.src = node.dataset.originalSrc;
                    node.classList.remove('is-hidden');
                    return;
                }
                node.classList.add('is-hidden');
            });
            profileAvatarFallbackNodes.forEach((node) => {
                node.classList.remove('is-hidden');
            });
            if (avatarEditorImage?.getAttribute('src')) {
                activateAvatarEditor(avatarEditorImage.getAttribute('src'));
            }
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setAvatarPreviewData(objectUrl);
        if (!preserveTransform) {
            activateAvatarEditor(objectUrl);
        }
    };

    avatarScaleInput?.addEventListener('input', () => {
        avatarEditorState.scale = Number(avatarScaleInput.value);
        renderAvatarEditor();
    });

    avatarViewport?.addEventListener('pointerdown', (event) => {
        if (!avatarEditorImage || avatarEditorImage.classList.contains('is-hidden')) {
            return;
        }
        avatarEditorState.dragging = true;
        avatarEditorState.pointerId = event.pointerId;
        avatarEditorState.lastX = event.clientX;
        avatarEditorState.lastY = event.clientY;
        avatarViewport.setPointerCapture(event.pointerId);
    });

    avatarViewport?.addEventListener('pointermove', (event) => {
        if (!avatarEditorState.dragging || event.pointerId !== avatarEditorState.pointerId) {
            return;
        }
        avatarEditorState.offsetX += event.clientX - avatarEditorState.lastX;
        avatarEditorState.offsetY += event.clientY - avatarEditorState.lastY;
        avatarEditorState.lastX = event.clientX;
        avatarEditorState.lastY = event.clientY;
        renderAvatarEditor();
    });

    const stopAvatarDragging = (event) => {
        if (!avatarEditorState.dragging || event.pointerId !== avatarEditorState.pointerId) {
            return;
        }
        avatarEditorState.dragging = false;
        avatarViewport?.releasePointerCapture(event.pointerId);
    };

    avatarViewport?.addEventListener('pointerup', stopAvatarDragging);
    avatarViewport?.addEventListener('pointercancel', stopAvatarDragging);

    if (avatarEditorImage?.getAttribute('src')) {
        activateAvatarEditor(avatarEditorImage.getAttribute('src'));
    }

    if (window.location.search.includes('profile=1')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('profile');
        url.searchParams.delete('tab');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }

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

    profileOpenButton?.addEventListener('click', () => {
        if (window.__profileStatsDirty) {
            const url = new URL(window.location.href);
            url.searchParams.set('profile', '1');
            url.searchParams.set('tab', 'personal-records');
            window.location.href = `${url.pathname}${url.search}${url.hash}`;
            return;
        }
        setProfileState(true, profileModal?.dataset.profileInitialTab || 'info');
    });

    profileCloseButton?.addEventListener('click', () => {
        setProfileState(false);
    });

    profileBackdrop?.addEventListener('click', () => {
        setProfileState(false);
    });

    profileTabButtons.forEach((button) => {
        button.addEventListener('click', () => {
            setActiveProfileTab(button.dataset.profileTabTrigger);
        });
    });

    profileAvatarInput?.addEventListener('change', () => {
        const selectedFile = profileAvatarInput.files?.[0] ?? null;
        if (!selectedFile) {
            return;
        }

        if (pendingAvatarObjectUrl) {
            URL.revokeObjectURL(pendingAvatarObjectUrl);
        }
        pendingAvatarObjectUrl = URL.createObjectURL(selectedFile);
        activateAvatarEditor(pendingAvatarObjectUrl);
        setAvatarCropperState(true);
    });

    avatarCropperApply?.addEventListener('click', () => {
        const selectedFile = profileAvatarInput?.files?.[0] ?? null;
        if (selectedFile) {
            const croppedPreview = buildAvatarCropPreview();
            if (croppedPreview) {
                setAvatarPreviewData(croppedPreview);
            } else {
                syncAvatarPreview(selectedFile, { preserveTransform: true });
            }
        }
        setAvatarCropperState(false);
        syncProfileSaveButtonState();
    });

    const cancelAvatarCropper = () => {
        if (profileAvatarInput) {
            profileAvatarInput.value = '';
        }
        syncAvatarPreview(null);
        resetAvatarEditorState();
        setAvatarCropperState(false);
        syncProfileSaveButtonState();
    };

    avatarCropperCancelButtons.forEach((button) => {
        button.addEventListener('click', cancelAvatarCropper);
    });

    avatarCropperBackdrop?.addEventListener('click', cancelAvatarCropper);

    profileShareButton?.addEventListener('click', async () => {
        const sharePath = profileShareButton.dataset.profileShareUrl;
        if (!sharePath) {
            return;
        }

        const fullUrl = new URL(sharePath, window.location.origin).toString();

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(fullUrl);
            } else {
                const input = document.createElement('input');
                input.value = fullUrl;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
            }
            profileShareButton.classList.add('is-copied');
            const previousTitle = profileShareButton.title;
            profileShareButton.title = 'Ссылка скопирована';
            setTimeout(() => {
                profileShareButton.classList.remove('is-copied');
                profileShareButton.title = previousTitle;
            }, 1800);
        } catch (_error) {
            profileShareButton.title = 'Не удалось скопировать';
        }
    });

    bugReportOpenButton?.addEventListener('click', () => {
        setBugReportState(true);
    });

    bugReportCloseButton?.addEventListener('click', () => {
        setBugReportState(false);
    });

    bugReportBackdrop?.addEventListener('click', () => {
        setBugReportState(false);
    });

    if (profileForm) {
        profileInitialFingerprint = getProfileFormFingerprint();
        profileForm.addEventListener('input', syncProfileSaveButtonState);
        profileForm.addEventListener('change', syncProfileSaveButtonState);
        syncProfileSaveButtonState();
    }

    if (profileModal?.classList.contains('is-open')) {
        setActiveProfileTab(profileModal.dataset.profileInitialTab || 'info');
    }
    initAttemptCharts();

    overlay?.addEventListener('click', () => {
        setMenuState(false);
        setSettingsState(false);
        setBugReportState(false);
    });

    document.addEventListener('keydown', (event) => {
        const activeTagName = document.activeElement?.tagName;
        const isTypingTarget = activeTagName === 'INPUT' || activeTagName === 'TEXTAREA' || document.activeElement?.isContentEditable;

        if (isAvatarCropperOpen()) {
            if (event.key === 'Escape') {
                cancelAvatarCropper();
            }
            return;
        }

        if (isProfileOpen()) {
            if (event.key === 'Escape') {
                setProfileState(false);
            }
            return;
        }

        if (!isTypingTarget && event.key.toLowerCase() === 'x') {
            event.preventDefault();
            setSettingsState(!settingsPanel?.classList.contains('is-open'));
        }

        if (event.key === 'Escape') {
            setMenuState(false);
            setSettingsState(false);
            setProfileState(false);
            setBugReportState(false);
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
    const reverseKeybindButton = document.querySelector('[data-reverse-keybind]');
    let pendingKeybindSlot = null;
    let pendingReverseKeybind = false;

    const formatKeyCode = (code) => {
        if (!code) return '';
        if (code === 'Space') return 'SPACE';
        if (code === 'ShiftLeft' || code === 'ShiftRight') return 'SHIFT';
        if (code === 'ControlLeft' || code === 'ControlRight') return 'CTRL';
        if (code === 'AltLeft' || code === 'AltRight') return 'ALT';
        if (code === 'MetaLeft' || code === 'MetaRight') return 'META';
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
        if (reverseKeybindButton) {
            reverseKeybindButton.textContent = pendingReverseKeybind ? '...' : formatKeyCode(reverseModifierCode);
            reverseKeybindButton.classList.toggle('is-listening', pendingReverseKeybind);
        }
    };

    const applyControlSettings = () => {
        const cube = getCube();
        if (!cube) return;
        cube.applyKeymap(keymap);
        cube.applyReverseModifierKey(reverseModifierCode);
        cube.applyRotateSensitivity(rotateSensitivity);
        cube.applyZoomSettings(zoomMode, zoomStep, zoomSmoothSpeed, zoomMin, zoomMax);
        cube.applyLanternSettings(lanternOpacity, lanternLightIntensity, lanternPulseSpeed, lanternEmberSize, lanternShowEmbers);
        cube.applySpheresSettings(spheresRadius);
        cube.applyGoldenSettings(goldenShimmer, goldenShimmerSpeed, goldenSparkleScale, goldenShaderEnabled, goldenGemGlowMode, goldenGemGlowIntensity);
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

    onRange('cfg-golden-shimmer', 'cfg-golden-shimmer-val', (value) => {
        goldenShimmer = value;
        getCube()?.applyGoldenSettings(goldenShimmer, goldenShimmerSpeed, goldenSparkleScale, goldenShaderEnabled, goldenGemGlowMode, goldenGemGlowIntensity);
    }, (value) => value.toFixed(2));

    onRange('cfg-golden-shimmer-speed', 'cfg-golden-shimmer-speed-val', (value) => {
        goldenShimmerSpeed = value;
        getCube()?.applyGoldenSettings(goldenShimmer, goldenShimmerSpeed, goldenSparkleScale, goldenShaderEnabled, goldenGemGlowMode, goldenGemGlowIntensity);
    }, (value) => value.toFixed(2));

    onRange('cfg-golden-sparkle', 'cfg-golden-sparkle-val', (value) => {
        goldenSparkleScale = value;
        getCube()?.applyGoldenSettings(goldenShimmer, goldenShimmerSpeed, goldenSparkleScale, goldenShaderEnabled, goldenGemGlowMode, goldenGemGlowIntensity);
    }, (value) => value.toFixed(2));

    onRange('cfg-golden-gem-glow-intensity', 'cfg-golden-gem-glow-intensity-val', (value) => {
        goldenGemGlowIntensity = value;
        getCube()?.applyGoldenSettings(goldenShimmer, goldenShimmerSpeed, goldenSparkleScale, goldenShaderEnabled, goldenGemGlowMode, goldenGemGlowIntensity);
    }, (value) => value.toFixed(2));

    const goldenGemGlowModeSelect = document.getElementById('cfg-golden-gem-glow-mode');
    goldenGemGlowModeSelect?.addEventListener('change', () => {
        goldenGemGlowMode = goldenGemGlowModeSelect.value;
        getCube()?.applyGoldenSettings(goldenShimmer, goldenShimmerSpeed, goldenSparkleScale, goldenShaderEnabled, goldenGemGlowMode, goldenGemGlowIntensity);
        syncLanternRows();
    });

    const skinSelect = document.getElementById('cfg-skin');
    const lanternOpacityRow  = document.getElementById('cfg-lantern-opacity-row');
    const lanternLightRow    = document.getElementById('cfg-lantern-light-row');
    const lanternPulseRow    = document.getElementById('cfg-lantern-pulse-row');
    const lanternSizeRow     = document.getElementById('cfg-lantern-size-row');
    const lanternEmbersRow   = document.getElementById('cfg-lantern-embers-row');
    const spheresRadiusRow   = document.getElementById('cfg-spheres-radius-row');
    const goldenShimmerRow   = document.getElementById('cfg-golden-shimmer-row');
    const goldenShaderEnabledRow = document.getElementById('cfg-golden-shader-enabled-row');
    const goldenShimmerSpeedRow = document.getElementById('cfg-golden-shimmer-speed-row');
    const goldenSparkleRow   = document.getElementById('cfg-golden-sparkle-row');
    const goldenGemGlowModeRow = document.getElementById('cfg-golden-gem-glow-mode-row');
    const goldenGemGlowIntensityRow = document.getElementById('cfg-golden-gem-glow-intensity-row');
    const roundedRow         = document.getElementById('cfg-rounded-row');
    const metalnessRow       = document.getElementById('cfg-metalness-row');
    const roughnessRow       = document.getElementById('cfg-roughness-row');

    const syncLanternRows = () => {
        const visible = skinId === 'lantern';
        [lanternOpacityRow, lanternLightRow, lanternPulseRow, lanternSizeRow, lanternEmbersRow].forEach((row) => {
            if (row) row.style.display = visible ? '' : 'none';
        });
        if (spheresRadiusRow) {
            spheresRadiusRow.style.display = skinId === 'spheres' ? '' : 'none';
        }
        if (goldenShimmerRow) {
            goldenShimmerRow.style.display = skinId === 'golden' ? '' : 'none';
        }
        if (goldenShaderEnabledRow) {
            goldenShaderEnabledRow.style.display = skinId === 'golden' ? '' : 'none';
        }
        if (goldenShimmerSpeedRow) {
            goldenShimmerSpeedRow.style.display = skinId === 'golden' && goldenShaderEnabled ? '' : 'none';
        }
        if (goldenSparkleRow) {
            goldenSparkleRow.style.display = skinId === 'golden' && goldenShaderEnabled ? '' : 'none';
        }
        if (goldenGemGlowModeRow) {
            goldenGemGlowModeRow.style.display = skinId === 'golden' ? '' : 'none';
        }
        if (goldenGemGlowIntensityRow) {
            const showIntensity = skinId === 'golden' && goldenGemGlowMode !== 'off';
            goldenGemGlowIntensityRow.style.display = showIntensity ? '' : 'none';
        }
        const isCubieSkin = skinId !== 'spheres';
        if (roundedRow) {
            roundedRow.style.display = isCubieSkin ? '' : 'none';
        }
        if (radiusRow) {
            radiusRow.style.display = isCubieSkin && roundedEnabled ? '' : 'none';
        }
        const showMaterialSliders = skinId !== 'golden';
        if (metalnessRow) {
            metalnessRow.style.display = showMaterialSliders ? '' : 'none';
        }
        if (roughnessRow) {
            roughnessRow.style.display = showMaterialSliders ? '' : 'none';
        }
    };

    const goldenShaderToggle = document.getElementById('cfg-golden-shader-enabled');
    goldenShaderToggle?.addEventListener('change', () => {
        goldenShaderEnabled = goldenShaderToggle.checked;
        getCube()?.applyGoldenSettings(goldenShimmer, goldenShimmerSpeed, goldenSparkleScale, goldenShaderEnabled, goldenGemGlowMode, goldenGemGlowIntensity);
        syncLanternRows();
    });

    // Defer the heavy skin-switch work by one frame so the dropdown closes first
    skinSelect?.addEventListener('change', () => {
        skinId = skinSelect.value;
        syncLanternRows();
        requestAnimationFrame(() => {
            getCube()?.applyLanternSettings(lanternOpacity, lanternLightIntensity, lanternPulseSpeed, lanternEmberSize, lanternShowEmbers);
            getCube()?.applySpheresSettings(spheresRadius);
            getCube()?.applyGoldenSettings(goldenShimmer, goldenShimmerSpeed, goldenSparkleScale, goldenShaderEnabled, goldenGemGlowMode, goldenGemGlowIntensity);
            getCube()?.applySkin(skinId);
        });
    });

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
        if (value <= 0) return 'без анимации';
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
            pendingReverseKeybind = false;
            refreshKeybindButtons();
        });
    });

    reverseKeybindButton?.addEventListener('click', () => {
        pendingKeybindSlot = null;
        pendingReverseKeybind = true;
        refreshKeybindButtons();
    });

    document.addEventListener('keydown', (event) => {
        if (!pendingKeybindSlot && !pendingReverseKeybind) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (event.code === 'Escape') {
            pendingKeybindSlot = null;
            pendingReverseKeybind = false;
            refreshKeybindButtons();
            return;
        }

        if (pendingReverseKeybind) {
            reverseModifierCode = event.code;
            pendingReverseKeybind = false;
            refreshKeybindButtons();
            getCube()?.applyReverseModifierKey(reverseModifierCode);
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

    // ── Game mode ────────────────────────────────────────────────────────────────
    const timerIconBtn    = document.getElementById('timer-icon-btn');
    const gameTimerValEl  = document.getElementById('game-timer-value');
    const goOverlay       = document.getElementById('game-overlay');
    const goNum           = document.getElementById('game-overlay-num');
    const goHint          = document.getElementById('game-overlay-hint');
    const goPhaseLbl      = document.getElementById('game-phase-label');

    // idle → countdown → study → solving → done
    let gamePhase        = 'idle';
    let gameTimerHandle  = null;
    let gameCountSecs    = 5;
    let gameSolveStartMs = 0;
    let gameObservedUnsolved = false;
    let gameSolveToken = 0;

    const getCsrfToken = () => {
        const cookie = document.cookie
            .split(';')
            .map((chunk) => chunk.trim())
            .find((chunk) => chunk.startsWith('csrftoken='));
        if (!cookie) {
            return '';
        }
        return decodeURIComponent(cookie.slice('csrftoken='.length));
    };

    const persistPersonalAttempt = async (elapsedMs) => {
        const solveTimeSeconds = Number((elapsedMs / 1000).toFixed(2));
        if (!Number.isFinite(solveTimeSeconds) || solveTimeSeconds <= 0) {
            return;
        }

        const payloadValue = solveTimeSeconds.toFixed(2);

        try {
            const response = await fetch('/records/personal/', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                },
                body: JSON.stringify({
                    solve_time_seconds: payloadValue,
                    attempt_source: 'single',
                }),
            });

            if (response.ok) {
                window.__profileStatsDirty = true;
                return;
            }

            await fetch('/records/personal/', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                },
                body: `solve_time_seconds=${encodeURIComponent(payloadValue)}&attempt_source=single`,
            });
            window.__profileStatsDirty = true;
        } catch (_error) {
            // Ignore network errors: timer UX should not break if request fails.
        }
    };

    const gmClear = () => {
        if (gameTimerHandle !== null) { clearInterval(gameTimerHandle); gameTimerHandle = null; }
    };

    const gmDisplay = (text) => { if (gameTimerValEl) gameTimerValEl.textContent = text; };

    const gmPhase = (text) => {
        if (!goPhaseLbl) {
            return;
        }
        const value = String(text || '').trim();
        goPhaseLbl.textContent = value;
        goPhaseLbl.classList.toggle('is-visible', value.length > 0);
        goPhaseLbl.closest('.dashboard-timer')?.classList.toggle('has-phase', value.length > 0);
    };

    const gmFmt = (ms) => {
        const s  = Math.floor(ms / 1000);
        const m  = Math.floor(s / 60);
        const ss = s % 60;
        const cs = Math.floor((ms % 1000) / 10);
        return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    };

    const gmOverlay = (visible) => {
        if (!goOverlay) return;
        goOverlay.classList.toggle('is-visible', visible);
        goOverlay.setAttribute('aria-hidden', String(!visible));
    };

    const gmPulse = (n) => {
        if (!goNum) return;
        goNum.classList.remove('is-shown');
        void goNum.offsetWidth; // force reflow for re-trigger
        goNum.textContent = String(n);
        goNum.classList.add('is-shown');
    };

    const gmIconActive = (active) => {
        if (!timerIconBtn) return;
        timerIconBtn.disabled = !active;
        timerIconBtn.setAttribute('aria-label', active ? 'Начать игру' : 'Игра идёт');
        timerIconBtn.title = active ? 'Начать игру' : 'Игра идёт';
    };

    const gmInput = (enabled) => {
        getCube()?.setInputEnabled(enabled);
    };

    const gmResetUi = () => {
        gameSolveToken += 1;
        gmClear();
        gamePhase = 'idle';
        gmDisplay('00:00.00');
        gmPhase('');
        gmOverlay(false);
        if (goNum) goNum.classList.remove('is-shown');
        if (goHint) goHint.textContent = 'Приготовьтесь...';
        gmIconActive(true);
        gmInput(true);
        const cube = getCube();
        if (cube) {
            cube.onSolvedChange = null;
        }
    };

    const gmAbort = () => {
        gmResetUi();
    };

    const gmFinish = (elapsedMs, token = gameSolveToken) => {
        if (token !== gameSolveToken) {
            return;
        }
        gamePhase = 'done';
        gmClear();
        gmDisplay(gmFmt(elapsedMs));
        gmPhase('собран!');
        gmIconActive(true);
        gmInput(true);
        void persistPersonalAttempt(elapsedMs);
        gameSolveToken += 1;
        const cube = getCube();
        if (cube) cube.onSolvedChange = null;
    };

    const gmBindManualReset = () => {
        const cube = getCube();
        if (!cube) {
            return;
        }
        cube.onManualReset = () => {
            gmAbort();
        };
    };

    const gmStartSolving = () => {
        gamePhase = 'solving';
        gmPhase('сборка');
        gmInput(true);
        gameSolveStartMs = performance.now();
        gameObservedUnsolved = false;
        gameSolveToken += 1;
        const activeSolveToken = gameSolveToken;

        const cube = getCube();
        if (cube) {
            // Reset solved-change flag so a pre-scrambled solved state doesn't fire
            cube._lastSolvedState = null;
            cube.onSolvedChange = (isSolved) => {
                if (activeSolveToken !== gameSolveToken) {
                    return;
                }
                if (!isSolved) {
                    gameObservedUnsolved = true;
                    return;
                }
                if (isSolved && gamePhase === 'solving') {
                    if (!gameObservedUnsolved) {
                        return;
                    }
                    gmFinish(performance.now() - gameSolveStartMs, activeSolveToken);
                }
            };
        }

        gameTimerHandle = setInterval(() => {
            gmDisplay(gmFmt(performance.now() - gameSolveStartMs));
        }, 50);
    };

    const gmStartStudy = () => {
        gamePhase = 'study';
        gmInput(false);
        // Scramble right here — overlay is still opaque so the solve state is hidden
        getCube()?.resetCube();
        getCube()?.scrambleInstant(50);
        // Dismiss overlay (fade out number + background together)
        if (goNum) goNum.classList.remove('is-shown');
        gmOverlay(false);
        gmPhase('изучение');

        const studyEndMs = performance.now() + 10000;
        gmDisplay(gmFmt(10000));

        gameTimerHandle = setInterval(() => {
            const remaining = Math.max(0, studyEndMs - performance.now());
            gmDisplay(gmFmt(remaining));
            if (remaining <= 0) {
                gmClear();
                gmStartSolving();
            }
        }, 50);
    };

    const gmStartCountdown = () => {
        gmBindManualReset();
        gamePhase = 'countdown';
        gmClear();
        gmIconActive(false);
        gmInput(false);
        gmPhase('');
        gmDisplay('00:00.00');

        if (goHint) goHint.textContent = 'Приготовьтесь...';
        gmOverlay(true);
        gameCountSecs = 5;
        gmPulse(gameCountSecs);

        gameTimerHandle = setInterval(() => {
            gameCountSecs--;
            if (gameCountSecs > 0) {
                gmPulse(gameCountSecs);
            } else {
                gmClear();
                gmStartStudy();
            }
        }, 1000);
    };

    timerIconBtn?.addEventListener('click', () => {
        if (gamePhase === 'idle' || gamePhase === 'done') {
            gmStartCountdown();
        }
    });

    gmBindManualReset();
    // ── End game mode ────────────────────────────────────────────────────────────

    applyControlSettings();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
