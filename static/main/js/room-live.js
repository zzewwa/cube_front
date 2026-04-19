import * as THREE from 'three';
import { RubiksCube } from './cube.js';
import { CookieSettings } from './cookies.js';
import { CUBE_CONFIG } from './cube-config.js';

const buildRoomCubeConfig = () => {
    const config = JSON.parse(JSON.stringify(CUBE_CONFIG));
    config.scene.backgroundColor = '#202933';
    config.scene.fogEnabled = true;
    config.scene.fogDensity = 0.016;
    config.debug.fpsEnabled = false;
    config.runtime = config.runtime ?? {};
    config.runtime.skinId = 'classic';
    config.controls.zoom.mode = 'smooth';
    config.controls.zoom.min = 4;
    config.controls.zoom.max = 44;
    config.controls.rotateSpeed = 0.85;
    return config;
};

const makeSelectorForElement = (element, prefix) => {
    const uniqueId = `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
    element.dataset.roomLiveStageId = uniqueId;
    return `[data-room-live-stage-id="${uniqueId}"]`;
};

const getInitials = (name, username) => {
    const source = (name || username || '').trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase() || '??';
};

const buildLayout = (players, selfUsername, canPlay) => {
    const centerUser = canPlay ? players.find((player) => player.username === selfUsername) : null;
    const others = centerUser ? players.filter((player) => player.username !== selfUsername) : players;
    const layout = new Map();
    const radius = centerUser ? 12 : 14;

    if (centerUser) {
        layout.set(centerUser.username, { x: 0, y: 0, z: 0 });
    }

    others.forEach((player, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(others.length, 1);
        layout.set(player.username, {
            x: Math.cos(angle) * radius,
            y: 0,
            z: Math.sin(angle) * radius,
        });
    });

    return { layout, radius };
};

const configureCamera = (renderEngine, canPlay) => {
    const controls = renderEngine.controls;
    const camera = renderEngine.camera;

    if (canPlay) {
        controls.target.set(0, 0, 0.8);
        camera.position.set(0, -17, 8.5);
        controls.minDistance = 6;
        controls.maxDistance = 24;
        controls.enablePan = false;
        controls.update();
        return;
    }

    controls.target.set(0, 0, 1.5);
    camera.position.set(0, -30, 16);
    controls.minDistance = 12;
    controls.maxDistance = 44;
    controls.enablePan = false;
    controls.update();
};

const createTextTexture = (text, options = {}) => {
    const width = options.width ?? 384;
    const height = options.height ?? 128;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return null;
    }

    ctx.clearRect(0, 0, width, height);
    if (options.circle) {
        const radius = Math.min(width, height) / 2 - 2;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
        if (options.background) {
            ctx.fillStyle = options.background;
            ctx.fill();
        }
        if (options.stroke) {
            ctx.strokeStyle = options.stroke;
            ctx.lineWidth = options.strokeWidth ?? 2;
            ctx.stroke();
        }
    } else {
        if (options.background) {
            ctx.fillStyle = options.background;
            ctx.fillRect(0, 0, width, height);
        }

        if (options.stroke) {
            ctx.strokeStyle = options.stroke;
            ctx.lineWidth = options.strokeWidth ?? 2;
            ctx.strokeRect(1, 1, width - 2, height - 2);
        }
    }

    ctx.fillStyle = options.color ?? '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = options.font ?? '600 52px "Exo 2", sans-serif';
    ctx.fillText(text, width / 2, height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
};

const initRoomLive = () => {
    const payloadNode = document.getElementById('room-live-payload');
    const stage = document.querySelector('[data-room-live-stage]');
    if (!payloadNode || !stage) {
        return;
    }

    let payload = null;
    try {
        payload = JSON.parse(payloadNode.textContent || '{}');
    } catch (_error) {
        return;
    }

    const roomId = payload.roomId;
    const roomCode = payload.roomCode;
    const matchType = payload.matchType || 'casual';
    const isRanked = matchType === 'ranked';
    const rankedAutoStartAtMs = Number(payload.rankedAutoStartAtMs) || 0;
    const selfUsername = payload.selfUsername;
    const canPlay = Boolean(payload.canPlay);
    const canManageTimer = Boolean(payload.canManageTimer);
    const startMode = payload.startMode;
    const countdownSeconds = Number(payload.countdownSeconds) || 5;
    const studySeconds = Number(payload.studySeconds) || 10;
    const initialPlayers = Array.isArray(payload.players) ? payload.players : [];
    const initialSpectators = Array.isArray(payload.spectators) ? payload.spectators : [];
    if (!roomId) {
        return;
    }

    const timerButton = document.getElementById('room-timer-start-btn');
    const timerValue = document.getElementById('room-game-timer-value');
    const phaseLabel = document.getElementById('room-game-phase-label');
    const noticeLabel = document.getElementById('room-game-notice');
    const overlay = document.getElementById('room-game-overlay');
    const overlayNum = document.getElementById('room-game-overlay-num');
    const overlayHint = document.getElementById('room-game-overlay-hint');

    const playersListEl = document.querySelector('[data-room-players-list]');
    const spectatorsListEl = document.querySelector('[data-room-spectators-list]');
    const playersCountEl = document.querySelector('[data-room-players-count]');
    const spectatorsCountEl = document.querySelector('[data-room-spectators-count]');
    const inviteModal = document.querySelector('[data-room-invite-modal]');
    const inviteBackdrop = document.querySelector('[data-room-invite-backdrop]');
    const inviteCloseButton = document.querySelector('[data-room-invite-close]');
    const inviteToggleButtons = Array.from(document.querySelectorAll('[data-room-add-toggle]'));
    const inviteSearchInput = document.querySelector('[data-room-invite-search]');
    const inviteRoleSelect = document.querySelector('[data-room-invite-role]');
    const inviteResults = document.querySelector('[data-room-invite-results]');
    const inviteStatus = document.querySelector('[data-room-invite-status]');

    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsClose = document.getElementById('settings-close');
    const skinInput = document.getElementById('cfg-skin');
    const speedInput = document.getElementById('cfg-speed');
    const speedValue = document.getElementById('cfg-speed-val');
    const rotateInput = document.getElementById('cfg-rotate-speed');
    const rotateValue = document.getElementById('cfg-rotate-speed-val');
    const cubeNetInput = document.getElementById('cfg-cube-net');
    const lanternOpacityInput = document.getElementById('cfg-lantern-opacity');
    const lanternOpacityValue = document.getElementById('cfg-lantern-opacity-val');
    const lanternLightInput = document.getElementById('cfg-lantern-light');
    const lanternLightValue = document.getElementById('cfg-lantern-light-val');
    const lanternPulseInput = document.getElementById('cfg-lantern-pulse-speed');
    const lanternPulseValue = document.getElementById('cfg-lantern-pulse-speed-val');
    const lanternSizeInput = document.getElementById('cfg-lantern-size');
    const lanternSizeValue = document.getElementById('cfg-lantern-size-val');
    const lanternEmbersInput = document.getElementById('cfg-lantern-embers');
    const spheresRadiusInput = document.getElementById('cfg-spheres-radius');
    const spheresRadiusValue = document.getElementById('cfg-spheres-radius-val');
    const goldenShimmerInput = document.getElementById('cfg-golden-shimmer');
    const goldenShimmerValue = document.getElementById('cfg-golden-shimmer-val');
    const goldenShaderEnabledInput = document.getElementById('cfg-golden-shader-enabled');
    const goldenShimmerSpeedInput = document.getElementById('cfg-golden-shimmer-speed');
    const goldenShimmerSpeedValue = document.getElementById('cfg-golden-shimmer-speed-val');
    const goldenSparkleInput = document.getElementById('cfg-golden-sparkle');
    const goldenSparkleValue = document.getElementById('cfg-golden-sparkle-val');
    const goldenGemGlowModeInput = document.getElementById('cfg-golden-gem-glow-mode');
    const goldenGemGlowIntensityInput = document.getElementById('cfg-golden-gem-glow-intensity');
    const goldenGemGlowIntensityValue = document.getElementById('cfg-golden-gem-glow-intensity-val');
    const roundedInput = document.getElementById('cfg-rounded');
    const radiusInput = document.getElementById('cfg-radius');
    const radiusValue = document.getElementById('cfg-radius-val');
    const metalnessInput = document.getElementById('cfg-metalness');
    const metalnessValue = document.getElementById('cfg-metalness-val');
    const roughnessInput = document.getElementById('cfg-roughness');
    const roughnessValue = document.getElementById('cfg-roughness-val');

    const lanternOpacityRow = document.getElementById('cfg-lantern-opacity-row');
    const lanternLightRow = document.getElementById('cfg-lantern-light-row');
    const lanternPulseRow = document.getElementById('cfg-lantern-pulse-row');
    const lanternSizeRow = document.getElementById('cfg-lantern-size-row');
    const lanternEmbersRow = document.getElementById('cfg-lantern-embers-row');
    const spheresRadiusRow = document.getElementById('cfg-spheres-radius-row');
    const goldenShimmerRow = document.getElementById('cfg-golden-shimmer-row');
    const goldenShaderEnabledRow = document.getElementById('cfg-golden-shader-enabled-row');
    const goldenShimmerSpeedRow = document.getElementById('cfg-golden-shimmer-speed-row');
    const goldenSparkleRow = document.getElementById('cfg-golden-sparkle-row');
    const goldenGemGlowModeRow = document.getElementById('cfg-golden-gem-glow-mode-row');
    const goldenGemGlowIntensityRow = document.getElementById('cfg-golden-gem-glow-intensity-row');
    const roundedRow = document.getElementById('cfg-rounded-row');
    const radiusRow = document.getElementById('cfg-radius-row');
    const metalnessRow = document.getElementById('cfg-metalness-row');
    const roughnessRow = document.getElementById('cfg-roughness-row');

    const textureLoader = new THREE.TextureLoader();
    const settingsCookies = new CookieSettings();
    const persistedSettings = settingsCookies.loadSettings() ?? {};
    const sharedSelector = makeSelectorForElement(stage, 'room-stage');

    const participants = {
        players: [...initialPlayers],
        spectators: [...initialSpectators],
    };

    const settingsState = {
        skinId: 'classic',
        speed: 30,
        rotateSensitivity: 1,
        cubeNetVisible: true,
        lanternOpacity: 0.58,
        lanternLightIntensity: 0.52,
        lanternPulseSpeed: 1.0,
        lanternEmberSize: 0.16,
        lanternShowEmbers: true,
        spheresRadius: 0.56,
        goldenShimmer: 0.18,
        goldenShaderEnabled: true,
        goldenShimmerSpeed: 1.0,
        goldenSparkleScale: 5.0,
        goldenGemGlowMode: 'all',
        goldenGemGlowIntensity: 0.22,
        roundedEnabled: true,
        roundedRadius: 0.12,
        metalness: 0.2,
        roughness: 0.92,
    };

    const cubesByUser = new Map();
    const cubes = [];
    const avatarsByUser = new Map();
    const remoteStateCache = new Map();
    const remoteAppliedState = new Map();
    let ringObject = null;
    let primaryCube = null;
    let selfCube = null;

    let disposed = false;
    let socket = null;
    let roundTimer = null;
    let syncTimer = null;
    let currentRoundStartedAt = null;
    let studyAppliedAt = null;
    let solvingStartedAt = null;
    let gamePhase = 'idle';
    let hasInitialSnapshot = false;
    let solveObservedUnsolved = false;
    let rankedResultResolved = false;
    let rankedSolveReported = false;
    let rankedRoundStarted = false;
    let rankedWaitingTimer = null;

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
        if (!canPlay) {
            return;
        }

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
                    attempt_source: 'room',
                }),
            });

            if (response.ok) {
                return;
            }

            await fetch('/records/personal/', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                },
                body: `solve_time_seconds=${encodeURIComponent(payloadValue)}&attempt_source=room`,
            });
        } catch (_error) {
            // Ignore network errors so room gameplay continues uninterrupted.
        }
    };

    const renderRoster = (targetNode, items, isPlayers) => {
        if (!targetNode) {
            return;
        }

        if (!items.length) {
            targetNode.innerHTML = `<p class="record-history__empty">${isPlayers ? 'Игроков пока нет.' : 'Зрителей пока нет.'}</p>`;
            return;
        }

        targetNode.innerHTML = items
            .map((item) => {
                const selfClass = item.username === selfUsername ? ' is-self' : '';
                const organizerBadge = item.is_organizer ? '<span class="room-roster__badge">Орг</span>' : '';
                const avatarMarkup = item.avatar_url
                    ? `<img src="${item.avatar_url}" alt="Аватар ${item.display_name}">`
                    : `<span>${getInitials(item.display_name, item.username)}</span>`;
                return `
                    <article class="room-roster__item${selfClass}">
                        <div class="room-roster__avatar">${avatarMarkup}</div>
                        <div class="room-roster__meta">
                            <strong>${item.display_name}</strong>
                            <span>@${item.username}</span>
                        </div>
                        ${organizerBadge}
                    </article>
                `;
            })
            .join('');
    };

    const updateRosterUI = () => {
        if (playersCountEl) {
            playersCountEl.textContent = String(participants.players.length);
        }
        if (spectatorsCountEl) {
            spectatorsCountEl.textContent = String(participants.spectators.length);
        }
        renderRoster(playersListEl, participants.players, true);
        renderRoster(spectatorsListEl, participants.spectators, false);
    };

    const setInviteStatus = (message, kind = '') => {
        if (!inviteStatus) {
            return;
        }
        inviteStatus.textContent = message || '';
        inviteStatus.classList.remove('is-success', 'is-error');
        if (kind) {
            inviteStatus.classList.add(kind);
        }
    };

    const setupInviteUi = () => {
        if (!inviteModal || !inviteBackdrop || !inviteSearchInput || !inviteRoleSelect || !inviteResults || !inviteToggleButtons.length || !roomCode) {
            return;
        }

        let inviteSearchTimer = null;
        const setInviteModalOpen = (isOpen) => {
            inviteModal.hidden = !isOpen;
            inviteBackdrop.hidden = !isOpen;
            inviteToggleButtons.forEach((button) => {
                button.setAttribute('aria-expanded', String(isOpen));
            });
            if (!isOpen) {
                inviteResults.classList.remove('is-open');
                inviteResults.innerHTML = '';
            }
        };

        inviteBackdrop.addEventListener('click', () => setInviteModalOpen(false));
        inviteCloseButton?.addEventListener('click', () => setInviteModalOpen(false));

        inviteToggleButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const nextState = inviteModal.hidden;
                setInviteModalOpen(nextState);
                if (nextState) {
                    const defaultRole = button.dataset.defaultRole;
                    if (defaultRole === 'player' || defaultRole === 'spectator') {
                        inviteRoleSelect.value = defaultRole;
                    }
                    setInviteStatus('');
                    setTimeout(() => {
                        inviteSearchInput.focus();
                    }, 50);
                }
            });
        });

        inviteSearchInput.addEventListener('input', () => {
            const query = inviteSearchInput.value.trim();
            if (inviteSearchTimer) {
                clearTimeout(inviteSearchTimer);
            }
            if (query.length < 2) {
                inviteResults.classList.remove('is-open');
                inviteResults.innerHTML = '';
                return;
            }

            inviteSearchTimer = setTimeout(async () => {
                try {
                    const response = await fetch(`/rooms/search-users/?q=${encodeURIComponent(query)}`);
                    if (!response.ok) {
                        return;
                    }
                    const payload = await response.json();
                    const alreadyInRoom = new Set([
                        ...participants.players.map((item) => item.username),
                        ...participants.spectators.map((item) => item.username),
                    ]);
                    const users = (payload.results || []).filter((item) => !alreadyInRoom.has(item.username));
                    if (!users.length) {
                        inviteResults.classList.remove('is-open');
                        inviteResults.innerHTML = '';
                        return;
                    }

                    inviteResults.innerHTML = '';
                    users.forEach((user) => {
                        const button = document.createElement('button');
                        button.type = 'button';
                        button.className = 'rooms-search-item';
                        const avatar = user.avatar_url
                            ? `<img src="${user.avatar_url}" alt="Аватар ${user.display_name}">`
                            : `<span>${getInitials(user.display_name, user.username)}</span>`;
                        button.innerHTML = `
                            <span class="rooms-search-avatar">${avatar}</span>
                            <span>
                                <strong>${user.display_name}</strong>
                                <span>@${user.username}</span>
                            </span>
                        `;
                        button.addEventListener('click', async () => {
                            setInviteStatus('Отправляем приглашение...');
                            try {
                                const inviteResponse = await fetch(`/rooms/r/${roomCode}/invite/`, {
                                    method: 'POST',
                                    credentials: 'same-origin',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'X-CSRFToken': getCsrfToken(),
                                    },
                                    body: JSON.stringify({
                                        username: user.username,
                                        role: inviteRoleSelect.value,
                                    }),
                                });
                                const invitePayload = await inviteResponse.json().catch(() => ({}));
                                if (!inviteResponse.ok) {
                                    setInviteStatus(invitePayload.error || 'Не удалось отправить приглашение', 'is-error');
                                    return;
                                }
                                setInviteStatus(`Приглашение отправлено: @${user.username}`, 'is-success');
                            } catch (_error) {
                                setInviteStatus('Сетевая ошибка при отправке приглашения', 'is-error');
                            }
                        });
                        inviteResults.appendChild(button);
                    });
                    inviteResults.classList.add('is-open');
                } catch (_error) {
                    // ignore search network errors
                }
            }, 220);
        });
    };

    const destroyAvatarMarkers = () => {
        if (!primaryCube) {
            return;
        }
        const scene = primaryCube.renderEngine.scene;
        avatarsByUser.forEach((entry) => {
            scene.remove(entry.group);
        });
        avatarsByUser.clear();
        if (ringObject) {
            scene.remove(ringObject);
            ringObject.geometry?.dispose?.();
            ringObject.material?.dispose?.();
            ringObject = null;
        }
    };

    const createRing = (radius) => {
        if (!primaryCube || participants.players.length < 2) {
            return;
        }
        const points = [];
        const segments = 72;
        for (let i = 0; i < segments; i++) {
            const angle = (Math.PI * 2 * i) / segments;
            points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x6a7380, transparent: true, opacity: 0.55 });
        ringObject = new THREE.LineLoop(geometry, material);
        ringObject.position.set(0, 0, 0);
        primaryCube.renderEngine.scene.add(ringObject);
    };

    const createAvatarGroup = (user, position) => {
        if (!primaryCube) {
            return;
        }
        const scene = primaryCube.renderEngine.scene;

        const group = new THREE.Group();
        group.position.set(position.x, 0, position.z + 4.2);

        const initialsTexture = createTextTexture(getInitials(user.display_name, user.username), {
            width: 256,
            height: 256,
            background: 'rgba(13, 20, 27, 0.9)',
            stroke: 'rgba(255,255,255,0.35)',
            strokeWidth: 4,
            circle: true,
            font: '700 110px "Exo 2", sans-serif',
        });
        const avatarMaterial = new THREE.SpriteMaterial({ map: initialsTexture, transparent: true, depthTest: true });
        const avatarSprite = new THREE.Sprite(avatarMaterial);
        avatarSprite.scale.set(2.8, 2.8, 1);
        group.add(avatarSprite);

        const nameTexture = createTextTexture(user.display_name, {
            width: 420,
            height: 96,
            color: '#f1f4f7',
            font: '600 48px "Exo 2", sans-serif',
        });
        const nameMaterial = new THREE.SpriteMaterial({ map: nameTexture, transparent: true, depthTest: true });
        const nameSprite = new THREE.Sprite(nameMaterial);
        nameSprite.scale.set(4.2, 0.95, 1);
        nameSprite.position.set(0, 0, -2.35);
        group.add(nameSprite);

        if (user.avatar_url) {
            textureLoader.load(
                user.avatar_url,
                (texture) => {
                    avatarSprite.material.map = texture;
                    avatarSprite.material.needsUpdate = true;
                },
                undefined,
                () => {
                    // Keep initials fallback texture on errors.
                }
            );
        }

        scene.add(group);
        avatarsByUser.set(user.username, { group, avatarSprite, nameSprite });
    };

    const syncSkinRows = () => {
        const skinId = settingsState.skinId;
        [lanternOpacityRow, lanternLightRow, lanternPulseRow, lanternSizeRow, lanternEmbersRow].forEach((row) => {
            if (row) {
                row.style.display = skinId === 'lantern' ? '' : 'none';
            }
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
            goldenShimmerSpeedRow.style.display = skinId === 'golden' && settingsState.goldenShaderEnabled ? '' : 'none';
        }
        if (goldenSparkleRow) {
            goldenSparkleRow.style.display = skinId === 'golden' && settingsState.goldenShaderEnabled ? '' : 'none';
        }
        if (goldenGemGlowModeRow) {
            goldenGemGlowModeRow.style.display = skinId === 'golden' ? '' : 'none';
        }
        if (goldenGemGlowIntensityRow) {
            goldenGemGlowIntensityRow.style.display = skinId === 'golden' && settingsState.goldenGemGlowMode !== 'off' ? '' : 'none';
        }
        const isCubieSkin = skinId !== 'spheres';
        if (roundedRow) {
            roundedRow.style.display = isCubieSkin ? '' : 'none';
        }
        if (radiusRow) {
            radiusRow.style.display = isCubieSkin && settingsState.roundedEnabled ? '' : 'none';
        }
        const showMaterialSliders = skinId !== 'golden';
        if (metalnessRow) {
            metalnessRow.style.display = showMaterialSliders ? '' : 'none';
        }
        if (roughnessRow) {
            roughnessRow.style.display = showMaterialSliders ? '' : 'none';
        }
    };

    const applyLocalSettingsToSelfCube = () => {
        if (!selfCube) {
            return;
        }
        selfCube.applyLanternSettings(
            settingsState.lanternOpacity,
            settingsState.lanternLightIntensity,
            settingsState.lanternPulseSpeed,
            settingsState.lanternEmberSize,
            settingsState.lanternShowEmbers
        );
        selfCube.applySpheresSettings(settingsState.spheresRadius);
        selfCube.applyGoldenSettings(
            settingsState.goldenShimmer,
            settingsState.goldenShimmerSpeed,
            settingsState.goldenSparkleScale,
            settingsState.goldenShaderEnabled,
            settingsState.goldenGemGlowMode,
            settingsState.goldenGemGlowIntensity
        );
        selfCube.applyGeometry(settingsState.roundedEnabled, settingsState.roundedRadius);
        selfCube.applyMaterialSettings(settingsState.metalness, settingsState.roughness);
        selfCube.applySkin(settingsState.skinId);
        selfCube.applySpeed(settingsState.speed);
        selfCube.applyRotateSensitivity(settingsState.rotateSensitivity);
        selfCube.setCubeNetVisible(settingsState.cubeNetVisible);

        if (skinInput) {
            skinInput.value = settingsState.skinId;
        }
        if (speedInput && speedValue) {
            speedInput.value = String(settingsState.speed);
            speedValue.textContent = String(settingsState.speed);
        }
        if (rotateInput && rotateValue) {
            rotateInput.value = String(settingsState.rotateSensitivity);
            rotateValue.textContent = Number(settingsState.rotateSensitivity).toFixed(2);
        }
        if (cubeNetInput) {
            cubeNetInput.checked = settingsState.cubeNetVisible;
        }
        if (lanternOpacityInput && lanternOpacityValue) {
            lanternOpacityInput.value = String(settingsState.lanternOpacity);
            lanternOpacityValue.textContent = settingsState.lanternOpacity.toFixed(2);
        }
        if (lanternLightInput && lanternLightValue) {
            lanternLightInput.value = String(settingsState.lanternLightIntensity);
            lanternLightValue.textContent = settingsState.lanternLightIntensity.toFixed(2);
        }
        if (lanternPulseInput && lanternPulseValue) {
            lanternPulseInput.value = String(settingsState.lanternPulseSpeed);
            lanternPulseValue.textContent = settingsState.lanternPulseSpeed.toFixed(1);
        }
        if (lanternSizeInput && lanternSizeValue) {
            lanternSizeInput.value = String(settingsState.lanternEmberSize);
            lanternSizeValue.textContent = settingsState.lanternEmberSize.toFixed(2);
        }
        if (lanternEmbersInput) {
            lanternEmbersInput.checked = settingsState.lanternShowEmbers;
        }
        if (spheresRadiusInput && spheresRadiusValue) {
            spheresRadiusInput.value = String(settingsState.spheresRadius);
            spheresRadiusValue.textContent = settingsState.spheresRadius.toFixed(2);
        }
        if (goldenShimmerInput && goldenShimmerValue) {
            goldenShimmerInput.value = String(settingsState.goldenShimmer);
            goldenShimmerValue.textContent = settingsState.goldenShimmer.toFixed(2);
        }
        if (goldenShaderEnabledInput) {
            goldenShaderEnabledInput.checked = settingsState.goldenShaderEnabled;
        }
        if (goldenShimmerSpeedInput && goldenShimmerSpeedValue) {
            goldenShimmerSpeedInput.value = String(settingsState.goldenShimmerSpeed);
            goldenShimmerSpeedValue.textContent = settingsState.goldenShimmerSpeed.toFixed(2);
        }
        if (goldenSparkleInput && goldenSparkleValue) {
            goldenSparkleInput.value = String(settingsState.goldenSparkleScale);
            goldenSparkleValue.textContent = settingsState.goldenSparkleScale.toFixed(2);
        }
        if (goldenGemGlowModeInput) {
            goldenGemGlowModeInput.value = settingsState.goldenGemGlowMode;
        }
        if (goldenGemGlowIntensityInput && goldenGemGlowIntensityValue) {
            goldenGemGlowIntensityInput.value = String(settingsState.goldenGemGlowIntensity);
            goldenGemGlowIntensityValue.textContent = settingsState.goldenGemGlowIntensity.toFixed(2);
        }
        if (roundedInput) {
            roundedInput.checked = settingsState.roundedEnabled;
        }
        if (radiusInput && radiusValue) {
            radiusInput.value = String(settingsState.roundedRadius);
            radiusValue.textContent = settingsState.roundedRadius.toFixed(2);
        }
        if (metalnessInput && metalnessValue) {
            metalnessInput.value = String(settingsState.metalness);
            metalnessValue.textContent = settingsState.metalness.toFixed(2);
        }
        if (roughnessInput && roughnessValue) {
            roughnessInput.value = String(settingsState.roughness);
            roughnessValue.textContent = settingsState.roughness.toFixed(2);
        }

        syncSkinRows();
    };

    const loadSettings = () => {
        const valueOr = (value, fallback) => {
            if (value === undefined || value === null) {
                return fallback;
            }
            return value;
        };
        settingsState.skinId = String(valueOr(persistedSettings.skinId, settingsState.skinId));
        settingsState.speed = Number(valueOr(persistedSettings.speed, settingsState.speed));
        settingsState.rotateSensitivity = Number(valueOr(persistedSettings.rotateSensitivity, settingsState.rotateSensitivity));
        settingsState.cubeNetVisible = Boolean(valueOr(persistedSettings.cubeNetVisible, settingsState.cubeNetVisible));
        settingsState.lanternOpacity = Number(valueOr(persistedSettings.lanternOpacity, settingsState.lanternOpacity));
        settingsState.lanternLightIntensity = Number(valueOr(persistedSettings.lanternLightIntensity, settingsState.lanternLightIntensity));
        settingsState.lanternPulseSpeed = Number(valueOr(persistedSettings.lanternPulseSpeed, settingsState.lanternPulseSpeed));
        settingsState.lanternEmberSize = Number(valueOr(persistedSettings.lanternEmberSize, settingsState.lanternEmberSize));
        settingsState.lanternShowEmbers = Boolean(valueOr(persistedSettings.lanternShowEmbers, settingsState.lanternShowEmbers));
        settingsState.spheresRadius = Number(valueOr(persistedSettings.spheresRadius, settingsState.spheresRadius));
        settingsState.goldenShimmer = Number(valueOr(persistedSettings.goldenShimmer, settingsState.goldenShimmer));
        settingsState.goldenShaderEnabled = Boolean(valueOr(persistedSettings.goldenShaderEnabled, settingsState.goldenShaderEnabled));
        settingsState.goldenShimmerSpeed = Number(valueOr(persistedSettings.goldenShimmerSpeed, settingsState.goldenShimmerSpeed));
        settingsState.goldenSparkleScale = Number(valueOr(persistedSettings.goldenSparkleScale, settingsState.goldenSparkleScale));
        settingsState.goldenGemGlowMode = String(valueOr(persistedSettings.goldenGemGlowMode, settingsState.goldenGemGlowMode));
        settingsState.goldenGemGlowIntensity = Number(valueOr(persistedSettings.goldenGemGlowIntensity, settingsState.goldenGemGlowIntensity));
        settingsState.roundedEnabled = Boolean(valueOr(persistedSettings.roundedEnabled, settingsState.roundedEnabled));
        settingsState.roundedRadius = Number(valueOr(persistedSettings.roundedRadius, settingsState.roundedRadius));
        settingsState.metalness = Number(valueOr(persistedSettings.metalness, settingsState.metalness));
        settingsState.roughness = Number(valueOr(persistedSettings.roughness, settingsState.roughness));

        if (settingsState.skinId === 'glow') {
            settingsState.skinId = 'lantern';
        }
        if (settingsState.skinId === 'matte') {
            settingsState.skinId = 'classic';
        }
        if (settingsState.skinId === 'water' || settingsState.skinId === 'golden') {
            settingsState.skinId = 'classic';
        }
    };

    const saveSettings = () => {
        Object.assign(persistedSettings, {
            skinId: settingsState.skinId,
            speed: settingsState.speed,
            rotateSensitivity: settingsState.rotateSensitivity,
            cubeNetVisible: settingsState.cubeNetVisible,
            lanternOpacity: settingsState.lanternOpacity,
            lanternLightIntensity: settingsState.lanternLightIntensity,
            lanternPulseSpeed: settingsState.lanternPulseSpeed,
            lanternEmberSize: settingsState.lanternEmberSize,
            lanternShowEmbers: settingsState.lanternShowEmbers,
            spheresRadius: settingsState.spheresRadius,
            goldenShimmer: settingsState.goldenShimmer,
            goldenShaderEnabled: settingsState.goldenShaderEnabled,
            goldenShimmerSpeed: settingsState.goldenShimmerSpeed,
            goldenSparkleScale: settingsState.goldenSparkleScale,
            goldenGemGlowMode: settingsState.goldenGemGlowMode,
            goldenGemGlowIntensity: settingsState.goldenGemGlowIntensity,
            roundedEnabled: settingsState.roundedEnabled,
            roundedRadius: settingsState.roundedRadius,
            metalness: settingsState.metalness,
            roughness: settingsState.roughness,
        });
        settingsCookies.saveSettings(persistedSettings);
    };

    const rebuildSceneCubes = () => {
        const activePlayers = participants.players;
        if (!activePlayers.length) {
            return;
        }

        const previousCameraState = primaryCube?.exportCameraState?.() ?? null;
        if (selfCube && canPlay) {
            const selfSkinId = selfCube.config?.runtime?.skinId || settingsState.skinId;
            const selfAppearance = buildAppearancePayload();
            applyRemoteState(selfUsername, selfCube.exportMaterialsState(), selfSkinId, selfAppearance);
        }

        const { layout, radius } = buildLayout(activePlayers, selfUsername, canPlay);
        const primaryUser = canPlay
            ? activePlayers.find((player) => player.username === selfUsername) ?? activePlayers[0]
            : activePlayers[0];

        if (primaryCube) {
            destroyAvatarMarkers();
            cubes.forEach((cube) => {
                primaryCube.renderEngine.scene.remove(cube.cubeRoot);
            });
            cubes.length = 0;
            cubesByUser.clear();
            remoteAppliedState.clear();
        }

        primaryCube = new RubiksCube(sharedSelector, null, buildRoomCubeConfig(), {
            enableKeyboard: canPlay,
            enableWheel: true,
            autoStart: false,
            addLights: true,
            enableFpsOverlay: false,
            cubeOffset: layout.get(primaryUser.username) ?? { x: 0, y: 0, z: 0 },
            objectNamePrefix: `room-${roomId}-${primaryUser.username}-`,
            statusElementId: primaryUser.username === selfUsername || !canPlay ? 'room-cube-status' : '__room-status-hidden__',
            statusResetClickable: false,
            cubeNetWidgetId: primaryUser.username === selfUsername ? 'cube-net-widget' : '__room-cube-net-hidden__',
        });
        cubesByUser.set(primaryUser.username, primaryCube);
        cubes.push(primaryCube);

        activePlayers
            .filter((player) => player.username !== primaryUser.username)
            .forEach((player) => {
                const cube = new RubiksCube(sharedSelector, null, buildRoomCubeConfig(), {
                    externalRenderEngine: primaryCube.renderEngine,
                    enableKeyboard: false,
                    enableWheel: false,
                    autoStart: false,
                    addLights: false,
                    enableFpsOverlay: false,
                    cubeOffset: layout.get(player.username) ?? { x: 0, y: 0, z: 0 },
                    objectNamePrefix: `room-${roomId}-${player.username}-`,
                    statusElementId: '__room-status-hidden__',
                    statusResetClickable: false,
                    cubeNetWidgetId: '__room-cube-net-hidden__',
                });
                cube.setCubeNetVisible(false);
                cube.setInputEnabled(false);
                cubesByUser.set(player.username, cube);
                cubes.push(cube);
            });

        selfCube = cubesByUser.get(selfUsername) ?? null;

        configureCamera(primaryCube.renderEngine, canPlay);

        if (canPlay && previousCameraState) {
            primaryCube.applyCameraState(previousCameraState);
        }

        destroyAvatarMarkers();
        createRing(radius);
        activePlayers.forEach((player) => {
            createAvatarGroup(player, layout.get(player.username) ?? { x: 0, y: 0, z: 0 });
        });

        applyLocalSettingsToSelfCube();
        setInputEnabled(gamePhase !== 'countdown' && gamePhase !== 'study');
        reapplyCachedRemoteStates();
        setRemoteCubesHiddenForPlayer(gamePhase === 'solving');
        // Re-apply game-active visibility to newly created avatar groups.
        if (canPlay && gamePhase !== 'idle' && gamePhase !== 'done') {
            avatarsByUser.forEach((entry) => { entry.group.visible = false; });
            if (ringObject) ringObject.visible = false;
        }
    };

    const syncParticipantsPayload = (participantsPayload) => {
        if (!participantsPayload) {
            return;
        }

        const nextPlayers = Array.isArray(participantsPayload.players) ? participantsPayload.players : [];
        const nextSpectators = Array.isArray(participantsPayload.spectators) ? participantsPayload.spectators : [];
        const buildPlayersSignature = (items) => items.map((item) => `${item.username}:${item.role || ''}`).join('|');
        const prevPlayersSignature = buildPlayersSignature(participants.players);
        const nextPlayersSignature = buildPlayersSignature(nextPlayers);

        participants.players = nextPlayers;
        participants.spectators = nextSpectators;
        updateRosterUI();

        // Rebuild 3D scene only when player roster changes.
        // Spectator join/leave should not reset camera/cubes during active play.
        if (nextPlayersSignature !== prevPlayersSignature) {
            rebuildSceneCubes();
        }
    };

    const gmFmt = (ms) => {
        const totalMs = Math.max(0, ms);
        const seconds = Math.floor(totalMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const centiseconds = Math.floor((totalMs % 1000) / 10);
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
    };

    const setDisplay = (text) => {
        if (timerValue) {
            timerValue.textContent = text;
        }
    };

    const setPhase = (text) => {
        if (!phaseLabel) {
            return;
        }
        const value = String(text || '').trim();
        phaseLabel.textContent = value;
        phaseLabel.classList.toggle('is-visible', value.length > 0);
        phaseLabel.closest('.dashboard-timer')?.classList.toggle('has-phase', value.length > 0);
    };

    const setNotice = (text, kind = '') => {
        if (!noticeLabel) {
            return;
        }
        noticeLabel.textContent = text || '';
        noticeLabel.classList.remove('is-success', 'is-error');
        if (kind) {
            noticeLabel.classList.add(kind);
        }
    };

    const showOverlay = (visible) => {
        if (!overlay) {
            return;
        }
        overlay.classList.toggle('is-visible', visible);
        overlay.setAttribute('aria-hidden', String(!visible));
    };

    const pulseNumber = (value) => {
        if (!overlayNum) {
            return;
        }
        overlayNum.classList.remove('is-shown');
        void overlayNum.offsetWidth;
        overlayNum.textContent = String(value);
        overlayNum.classList.add('is-shown');
    };

    const setInputEnabled = (enabled) => {
        if (!selfCube) {
            return;
        }
        selfCube.setInputEnabled(canPlay && enabled);
    };

    const setTimerButtonEnabled = (enabled) => {
        if (!timerButton) {
            return;
        }
        const canUseButton = enabled && !isRanked;
        timerButton.disabled = !canUseButton;
        timerButton.setAttribute('aria-label', canUseButton ? 'Начать раунд' : 'Раунд уже идет');
        timerButton.title = canUseButton ? 'Начать раунд' : 'Раунд уже идет';
    };

    const clearRoundTimer = () => {
        if (roundTimer !== null) {
            clearInterval(roundTimer);
            roundTimer = null;
        }
    };

    const buildAppearancePayload = () => ({
        lanternOpacity: settingsState.lanternOpacity,
        lanternLightIntensity: settingsState.lanternLightIntensity,
        lanternPulseSpeed: settingsState.lanternPulseSpeed,
        lanternEmberSize: settingsState.lanternEmberSize,
        lanternShowEmbers: settingsState.lanternShowEmbers,
        spheresRadius: settingsState.spheresRadius,
        goldenShimmer: settingsState.goldenShimmer,
        goldenShaderEnabled: settingsState.goldenShaderEnabled,
        goldenShimmerSpeed: settingsState.goldenShimmerSpeed,
        goldenSparkleScale: settingsState.goldenSparkleScale,
        goldenGemGlowMode: settingsState.goldenGemGlowMode,
        goldenGemGlowIntensity: settingsState.goldenGemGlowIntensity,
        roundedEnabled: settingsState.roundedEnabled,
        roundedRadius: settingsState.roundedRadius,
        metalness: settingsState.metalness,
        roughness: settingsState.roughness,
    });

    const serializeMaterialsState = (materials) => {
        if (!Array.isArray(materials)) {
            return '';
        }
        return materials
            .map((cubeMaterials) => (Array.isArray(cubeMaterials) ? cubeMaterials.join('') : ''))
            .join('|');
    };

    const serializeAppearanceState = (appearance) => {
        if (!appearance || typeof appearance !== 'object') {
            return '';
        }
        return JSON.stringify({
            lanternOpacity: Number(appearance.lanternOpacity),
            lanternLightIntensity: Number(appearance.lanternLightIntensity),
            lanternPulseSpeed: Number(appearance.lanternPulseSpeed),
            lanternEmberSize: Number(appearance.lanternEmberSize),
            lanternShowEmbers: Boolean(appearance.lanternShowEmbers),
            spheresRadius: Number(appearance.spheresRadius),
            goldenShimmer: Number(appearance.goldenShimmer),
            goldenShaderEnabled: Boolean(appearance.goldenShaderEnabled),
            goldenShimmerSpeed: Number(appearance.goldenShimmerSpeed),
            goldenSparkleScale: Number(appearance.goldenSparkleScale),
            goldenGemGlowMode: String(appearance.goldenGemGlowMode ?? 'all'),
            goldenGemGlowIntensity: Number(appearance.goldenGemGlowIntensity),
            roundedEnabled: Boolean(appearance.roundedEnabled),
            roundedRadius: Number(appearance.roundedRadius),
            metalness: Number(appearance.metalness),
            roughness: Number(appearance.roughness),
        });
    };

    const applyRemoteAppearance = (cube, appearance) => {
        if (!appearance || typeof appearance !== 'object') {
            return;
        }
        cube.applyLanternSettings(
            Number(appearance.lanternOpacity),
            Number(appearance.lanternLightIntensity),
            Number(appearance.lanternPulseSpeed),
            Number(appearance.lanternEmberSize),
            Boolean(appearance.lanternShowEmbers)
        );
        cube.applySpheresSettings(Number(appearance.spheresRadius));
        cube.applyGoldenSettings(
            Number(appearance.goldenShimmer),
            Number(appearance.goldenShimmerSpeed),
            Number(appearance.goldenSparkleScale),
            Boolean(appearance.goldenShaderEnabled),
            String(appearance.goldenGemGlowMode ?? 'all'),
            Number(appearance.goldenGemGlowIntensity)
        );
        cube.applyGeometry(Boolean(appearance.roundedEnabled), Number(appearance.roundedRadius));
        cube.applyMaterialSettings(Number(appearance.metalness), Number(appearance.roughness));
    };

    const sendSelfState = (force = false) => {
        if (!selfCube || !socket || socket.readyState !== WebSocket.OPEN) {
            return;
        }

        if (!force && !hasInitialSnapshot) {
            return;
        }

        // During countdown/study we intentionally avoid periodic broadcasts,
        // otherwise a refreshed client may overwrite shared scramble state.
        if (!force && (gamePhase === 'countdown' || gamePhase === 'study')) {
            return;
        }

        socket.send(
            JSON.stringify({
                type: 'cube_state',
                materials: selfCube.exportMaterialsState(),
                skin_id: selfCube.config?.runtime?.skinId || settingsState.skinId,
                appearance: buildAppearancePayload(),
            })
        );
    };

    const applyRemoteState = (username, materials, skinId, appearance) => {
        // Cache the latest known state so scene rebuilds can restore it.
        // IMPORTANT: cache self state too, otherwise rebuildSceneCubes resets self cube to solved.
        if (materials !== undefined || skinId !== undefined || appearance !== undefined) {
            const prev = remoteStateCache.get(username) ?? {};
            remoteStateCache.set(username, {
                materials: materials !== undefined ? materials : prev.materials,
                skinId: (typeof skinId === 'string' && skinId) ? skinId : prev.skinId,
                appearance: appearance && typeof appearance === 'object' ? appearance : prev.appearance,
                materialsSig: materials !== undefined ? serializeMaterialsState(materials) : prev.materialsSig,
                appearanceSig: appearance && typeof appearance === 'object'
                    ? serializeAppearanceState(appearance)
                    : prev.appearanceSig,
            });
        }
        const cube = cubesByUser.get(username);
        if (!cube) {
            return;
        }
        const cachedState = remoteStateCache.get(username) ?? {};
        const resolvedSkinId = (typeof skinId === 'string' && skinId)
            ? skinId
            : cachedState.skinId;
        const resolvedMaterials = Array.isArray(materials) ? materials : cachedState.materials;
        const resolvedAppearance = appearance && typeof appearance === 'object'
            ? appearance
            : cachedState.appearance;
        const resolvedMaterialsSig = Array.isArray(materials)
            ? serializeMaterialsState(materials)
            : (cachedState.materialsSig ?? '');
        const resolvedAppearanceSig = appearance && typeof appearance === 'object'
            ? serializeAppearanceState(appearance)
            : (cachedState.appearanceSig ?? '');

        const appliedState = remoteAppliedState.get(username) ?? {};
        const materialsChanged = Boolean(resolvedMaterialsSig) && resolvedMaterialsSig !== appliedState.materialsSig;
        const appearanceChanged = Boolean(resolvedAppearanceSig) && resolvedAppearanceSig !== appliedState.appearanceSig;
        const skinChanged = Boolean(resolvedSkinId) && resolvedSkinId !== appliedState.skinId;

        if (appearanceChanged) {
            applyRemoteAppearance(cube, resolvedAppearance);
        }
        if (materialsChanged && Array.isArray(resolvedMaterials)) {
            cube.applyMaterialsState(resolvedMaterials);
        }
        if (typeof resolvedSkinId === 'string' && resolvedSkinId && (skinChanged || materialsChanged || appearanceChanged)) {
            cube.applySkin(resolvedSkinId);
        }

        remoteAppliedState.set(username, {
            materialsSig: resolvedMaterialsSig || appliedState.materialsSig || '',
            appearanceSig: resolvedAppearanceSig || appliedState.appearanceSig || '',
            skinId: resolvedSkinId || appliedState.skinId || '',
        });
    };

    const reapplyCachedRemoteStates = () => {
        remoteStateCache.forEach((_state, username) => {
            applyRemoteState(username);
        });
    };

    const setRemoteCubesHiddenForPlayer = (hidden) => {
        if (!canPlay) {
            return;
        }
        cubesByUser.forEach((cube, username) => {
            if (username === selfUsername) {
                cube.cubeRoot.visible = true;
                return;
            }
            cube.cubeRoot.visible = !hidden;
        });
    };

    const setSettingsInteractionLocked = (locked) => {
        const settingsToggleEl = document.getElementById('settings-toggle');
        const controls = [
            skinInput,
            speedInput,
            rotateInput,
            cubeNetInput,
            lanternOpacityInput,
            lanternLightInput,
            lanternPulseInput,
            lanternSizeInput,
            lanternEmbersInput,
            spheresRadiusInput,
            goldenShimmerInput,
            goldenShaderEnabledInput,
            goldenShimmerSpeedInput,
            goldenSparkleInput,
            goldenGemGlowModeInput,
            goldenGemGlowIntensityInput,
            roundedInput,
            radiusInput,
            metalnessInput,
            roughnessInput,
            settingsClose,
        ];

        if (settingsToggleEl) {
            settingsToggleEl.disabled = locked;
            settingsToggleEl.setAttribute('aria-disabled', String(locked));
        }

        if (settingsPanel) {
            settingsPanel.classList.toggle('is-locked', locked);
            if (locked) {
                settingsPanel.classList.remove('is-open');
                settingsPanel.setAttribute('aria-hidden', 'true');
            }
        }

        controls.forEach((control) => {
            if (control) {
                control.disabled = locked;
            }
        });
    };

    const setGameUiMode = (active) => {
        const rail = document.querySelector('.room-right-rail');
        const shouldHideUi = canPlay && active;
        if (rail) {
            rail.classList.toggle('is-game-active', shouldHideUi);
        }
        const settingsToggleEl = document.getElementById('settings-toggle');
        if (settingsToggleEl) {
            settingsToggleEl.style.display = shouldHideUi ? 'none' : '';
        }
        avatarsByUser.forEach((entry) => { entry.group.visible = !shouldHideUi; });
        if (ringObject) {
            ringObject.visible = !shouldHideUi;
        }
        if (shouldHideUi && settingsPanel?.classList.contains('is-open')) {
            settingsPanel.classList.remove('is-open');
            settingsPanel.setAttribute('aria-hidden', 'true');
        }
        setSettingsInteractionLocked(shouldHideUi);
    };

    const finishRound = (elapsedMs) => {
        clearRoundTimer();
        gamePhase = 'done';
        setDisplay(gmFmt(elapsedMs));
        setPhase('собран!');
        setInputEnabled(true);
        setTimerButtonEnabled(canManageTimer && startMode === 'owner');
        setRemoteCubesHiddenForPlayer(false);
        setGameUiMode(false);
        if (selfCube) {
            selfCube.onSolvedChange = null;
        }
        if (!isRanked) {
            void persistPersonalAttempt(elapsedMs);
        }
    };

    const onRankedWin = (eventPayload) => {
        clearRoundTimer();
        rankedResultResolved = true;
        gamePhase = 'done';
        setInputEnabled(false);
        setRemoteCubesHiddenForPlayer(false);
        setGameUiMode(false);
        setDisplay(gmFmt(Number(eventPayload.winner_elapsed_ms) || 0));
        setPhase('победа');
        setNotice('Вы победили! +10 рейтинга', 'is-success');
        window.setTimeout(() => {
            window.location.href = '/ranked/?result=win';
        }, 1400);
    };

    const onRankedLose = (eventPayload) => {
        rankedResultResolved = true;
        rankedSolveReported = true;
        setPhase('поражение');
        setNotice(`Соперник ${eventPayload.winner_display_name || eventPayload.winner_username} уже победил. -10 рейтинга`, 'is-error');
    };

    const onRankedOpponentLeft = (eventPayload) => {
        if (!canPlay) {
            return;
        }
        if (eventPayload.leaver_username === selfUsername) {
            return;
        }
        rankedResultResolved = true;
        rankedSolveReported = true;
        setNotice('Соперник покинул игру. Рейтинг не начисляется.', 'is-error');
    };

    const startSolving = (solveStartedAt) => {
        gamePhase = 'solving';
        solvingStartedAt = solveStartedAt;
        solveObservedUnsolved = false;
        rankedSolveReported = false;
        setPhase('сборка');
        setNotice('');
        showOverlay(false);
        setRemoteCubesHiddenForPlayer(true);
        setInputEnabled(true);
        setTimerButtonEnabled(false);

        if (isRanked && !rankedRoundStarted && socket && socket.readyState === WebSocket.OPEN) {
            rankedRoundStarted = true;
            socket.send(JSON.stringify({ type: 'game_event', action: 'ranked_round_started' }));
        }

        if (selfCube) {
            selfCube._lastSolvedState = null;
            selfCube.onSolvedChange = (isSolved) => {
                if (!isSolved) {
                    solveObservedUnsolved = true;
                    return;
                }
                if (isSolved && gamePhase === 'solving') {
                    if (!solveObservedUnsolved) {
                        return;
                    }
                    const elapsedMs = Date.now() - solvingStartedAt;
                    if (!isRanked) {
                        finishRound(elapsedMs);
                        return;
                    }

                    if (rankedResultResolved) {
                        setPhase('собрано после завершения матча');
                        return;
                    }
                    if (rankedSolveReported) {
                        return;
                    }
                    rankedSolveReported = true;
                    clearRoundTimer();
                    setDisplay(gmFmt(elapsedMs));
                    setPhase('проверка результата...');
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(
                            JSON.stringify({
                                type: 'game_event',
                                action: 'solve_complete',
                                elapsed_ms: Math.max(0, Math.floor(elapsedMs)),
                            })
                        );
                    }
                }
            };
        }

        roundTimer = setInterval(() => {
            setDisplay(gmFmt(Date.now() - solvingStartedAt));
        }, 50);
    };

    const applyStudyState = () => {
        if (!selfCube || studyAppliedAt === currentRoundStartedAt) {
            return;
        }
        studyAppliedAt = currentRoundStartedAt;
        selfCube.resetCube();
        selfCube.scrambleInstant(50);
        sendSelfState(true);
    };

    const runRound = (eventPayload, options = {}) => {
        if (!eventPayload || eventPayload.action !== 'start_round') {
            return;
        }
        if (currentRoundStartedAt === eventPayload.started_at_ms) {
            return;
        }

        const preserveCurrentState = Boolean(options.preserveCurrentState);

        clearRoundTimer();
        currentRoundStartedAt = eventPayload.started_at_ms;
        studyAppliedAt = null;
        solvingStartedAt = null;
        rankedResultResolved = false;
        rankedSolveReported = false;
        gamePhase = 'countdown';
        setGameUiMode(true);
        if (overlayHint) {
            overlayHint.textContent = 'Приготовьтесь...';
        }
        setNotice('');
        setTimerButtonEnabled(false);
        setInputEnabled(false);

        const totalCountdownMs = (Number(eventPayload.countdown_seconds) || countdownSeconds) * 1000;
        const totalStudyMs = (Number(eventPayload.study_seconds) || studySeconds) * 1000;
        let lastCountdownValue = null;

        const tick = () => {
            const elapsed = Date.now() - currentRoundStartedAt;

            if (elapsed < totalCountdownMs) {
                gamePhase = 'countdown';
                setPhase('');
                setDisplay('00:00.00');
                showOverlay(true);
                const remainingValue = Math.max(1, Math.ceil((totalCountdownMs - elapsed) / 1000));
                if (remainingValue !== lastCountdownValue) {
                    lastCountdownValue = remainingValue;
                    pulseNumber(remainingValue);
                }
                return;
            }

            if (elapsed < totalCountdownMs + totalStudyMs) {
                if (gamePhase !== 'study') {
                    gamePhase = 'study';
                    if (!preserveCurrentState) {
                        applyStudyState();
                    } else {
                        studyAppliedAt = currentRoundStartedAt;
                    }
                    if (overlayHint) {
                        overlayHint.textContent = 'Изучение';
                    }
                    if (overlayNum) {
                        overlayNum.classList.remove('is-shown');
                    }
                    showOverlay(false);
                }
                setInputEnabled(false);
                setPhase('изучение');
                setDisplay(gmFmt(totalStudyMs - (elapsed - totalCountdownMs)));
                return;
            }

            clearRoundTimer();
            if (!preserveCurrentState) {
                applyStudyState();
            } else {
                studyAppliedAt = currentRoundStartedAt;
            }
            startSolving(currentRoundStartedAt + totalCountdownMs + totalStudyMs);
        };

        tick();
        roundTimer = setInterval(tick, 50);
    };

    const setupSettingsUi = () => {
        const setSettingsState = (isOpen) => {
            if (!settingsPanel) {
                return;
            }
            settingsPanel.classList.toggle('is-open', isOpen);
            settingsPanel.setAttribute('aria-hidden', String(!isOpen));
        };

        const onRange = (input, valueNode, formatter, callback) => {
            if (!input) {
                return;
            }
            input.addEventListener('input', () => {
                const value = Number(input.value);
                if (valueNode) {
                    valueNode.textContent = formatter(value);
                }
                callback(value);
                applyLocalSettingsToSelfCube();
                saveSettings();
                sendSelfState();
            });
        };

        settingsToggle?.addEventListener('click', () => {
            if (settingsToggle.disabled) {
                return;
            }
            setSettingsState(!settingsPanel?.classList.contains('is-open'));
        });

        settingsClose?.addEventListener('click', () => {
            setSettingsState(false);
        });

        skinInput?.addEventListener('change', () => {
            settingsState.skinId = skinInput.value;
            saveSettings();
            applyLocalSettingsToSelfCube();
            sendSelfState();
        });

        onRange(speedInput, speedValue, (value) => String(Math.round(value)), (value) => {
            settingsState.speed = value;
        });

        onRange(rotateInput, rotateValue, (value) => value.toFixed(2), (value) => {
            settingsState.rotateSensitivity = value;
        });

        onRange(lanternOpacityInput, lanternOpacityValue, (value) => value.toFixed(2), (value) => {
            settingsState.lanternOpacity = value;
        });
        onRange(lanternLightInput, lanternLightValue, (value) => value.toFixed(2), (value) => {
            settingsState.lanternLightIntensity = value;
        });
        onRange(lanternPulseInput, lanternPulseValue, (value) => value.toFixed(1), (value) => {
            settingsState.lanternPulseSpeed = value;
        });
        onRange(lanternSizeInput, lanternSizeValue, (value) => value.toFixed(2), (value) => {
            settingsState.lanternEmberSize = value;
        });
        onRange(spheresRadiusInput, spheresRadiusValue, (value) => value.toFixed(2), (value) => {
            settingsState.spheresRadius = value;
        });
        onRange(goldenShimmerInput, goldenShimmerValue, (value) => value.toFixed(2), (value) => {
            settingsState.goldenShimmer = value;
        });
        onRange(goldenShimmerSpeedInput, goldenShimmerSpeedValue, (value) => value.toFixed(2), (value) => {
            settingsState.goldenShimmerSpeed = value;
        });
        onRange(goldenSparkleInput, goldenSparkleValue, (value) => value.toFixed(2), (value) => {
            settingsState.goldenSparkleScale = value;
        });
        onRange(goldenGemGlowIntensityInput, goldenGemGlowIntensityValue, (value) => value.toFixed(2), (value) => {
            settingsState.goldenGemGlowIntensity = value;
        });
        onRange(radiusInput, radiusValue, (value) => value.toFixed(2), (value) => {
            settingsState.roundedRadius = value;
        });
        onRange(metalnessInput, metalnessValue, (value) => value.toFixed(2), (value) => {
            settingsState.metalness = value;
        });
        onRange(roughnessInput, roughnessValue, (value) => value.toFixed(2), (value) => {
            settingsState.roughness = value;
        });

        lanternEmbersInput?.addEventListener('change', () => {
            settingsState.lanternShowEmbers = lanternEmbersInput.checked;
            applyLocalSettingsToSelfCube();
            saveSettings();
            sendSelfState();
        });

        goldenShaderEnabledInput?.addEventListener('change', () => {
            settingsState.goldenShaderEnabled = goldenShaderEnabledInput.checked;
            applyLocalSettingsToSelfCube();
            saveSettings();
            sendSelfState();
        });

        goldenGemGlowModeInput?.addEventListener('change', () => {
            settingsState.goldenGemGlowMode = goldenGemGlowModeInput.value;
            applyLocalSettingsToSelfCube();
            saveSettings();
            sendSelfState();
        });

        roundedInput?.addEventListener('change', () => {
            settingsState.roundedEnabled = roundedInput.checked;
            applyLocalSettingsToSelfCube();
            saveSettings();
            sendSelfState();
        });

        cubeNetInput?.addEventListener('change', () => {
            settingsState.cubeNetVisible = Boolean(cubeNetInput.checked);
            applyLocalSettingsToSelfCube();
            saveSettings();
        });
    };

    const animate = () => {
        if (disposed) {
            return;
        }
        requestAnimationFrame(animate);
        cubes.forEach((cube) => cube.render());
        if (primaryCube) {
            primaryCube.renderEngine.controls.update();
            primaryCube.renderEngine.renderer.render(primaryCube.renderEngine.scene, primaryCube.renderEngine.camera);
        }
    };

    loadSettings();
    updateRosterUI();
    rebuildSceneCubes();
    setupSettingsUi();
    setupInviteUi();
    setDisplay('00:00.00');
    setPhase('');
    setTimerButtonEnabled(canManageTimer && startMode === 'owner');
    animate();

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(`${protocol}://${window.location.host}/ws/rooms/${roomId}/`);

    socket.addEventListener('message', (event) => {
        let message = null;
        try {
            message = JSON.parse(event.data);
        } catch (_error) {
            return;
        }

        if (message.type === 'snapshot') {
            hasInitialSnapshot = true;
            if (message.participants) {
                syncParticipantsPayload(message.participants);
            }
            const playersState = message.players || {};
            const hasSelfSnapshotState = Array.isArray(playersState?.[selfUsername]?.materials);
            Object.entries(playersState).forEach(([username, state]) => {
                applyRemoteState(username, state?.materials, state?.skin_id, state?.appearance);
            });
            if (message.game) {
                runRound(message.game, { preserveCurrentState: hasSelfSnapshotState });
            } else if (canPlay) {
                sendSelfState(true);
            }
            return;
        }

        if (message.type === 'participants') {
            syncParticipantsPayload(message.participants);
            return;
        }

        if (message.type === 'cube_state') {
            if (message.username === selfUsername) {
                return;
            }
            applyRemoteState(message.username, message.materials, message.skin_id, message.appearance);
            return;
        }

        if (message.type === 'game_event') {
            if (!message.event || typeof message.event !== 'object') {
                return;
            }
            if (message.event.action === 'start_round') {
                runRound(message.event, { preserveCurrentState: false });
                return;
            }
            if (message.event.action === 'ranked_finished') {
                if (!isRanked) {
                    return;
                }
                if (message.event.winner_username === selfUsername) {
                    onRankedWin(message.event);
                    return;
                }
                onRankedLose(message.event);
                return;
            }
            if (message.event.action === 'opponent_left') {
                if (isRanked) {
                    onRankedOpponentLeft(message.event);
                }
                return;
            }

            if (message.event.action === 'ranked_room_cancelled') {
                if (!isRanked) {
                    return;
                }
                if (message.event.leaver_username === selfUsername) {
                    return;
                }
                setNotice('Соперник вышел до старта. Матч отменен.', 'is-error');
                window.setTimeout(() => {
                    window.location.href = '/ranked/?result=cancelled';
                }, 900);
                return;
            }
        }
    });

    if (isRanked && canPlay && rankedAutoStartAtMs > 0) {
        const tickRankedWaiting = () => {
            if (gamePhase !== 'idle' || rankedResultResolved) {
                return;
            }
            const remaining = rankedAutoStartAtMs - Date.now();
            if (remaining > 0) {
                setPhase('старт');
                setDisplay(gmFmt(remaining));
                return;
            }
            if (rankedWaitingTimer !== null) {
                clearInterval(rankedWaitingTimer);
                rankedWaitingTimer = null;
            }
            runRound(
                {
                    action: 'start_round',
                    started_at_ms: rankedAutoStartAtMs,
                    countdown_seconds: countdownSeconds,
                    study_seconds: studySeconds,
                },
                { preserveCurrentState: false }
            );
        };

        tickRankedWaiting();
        rankedWaitingTimer = setInterval(tickRankedWaiting, 100);
    }

    if (canPlay) {
        syncTimer = setInterval(sendSelfState, 180);
    }

    timerButton?.addEventListener('click', () => {
        if (!canManageTimer || startMode !== 'owner' || !socket || socket.readyState !== WebSocket.OPEN) {
            return;
        }
        socket.send(
            JSON.stringify({
                type: 'game_event',
                action: 'start_round',
                countdown_seconds: countdownSeconds,
                study_seconds: studySeconds,
            })
        );
    });

    window.addEventListener('beforeunload', () => {
        disposed = true;
        clearRoundTimer();
        if (rankedWaitingTimer !== null) {
            clearInterval(rankedWaitingTimer);
        }
        if (syncTimer !== null) {
            clearInterval(syncTimer);
        }
        socket?.close();
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRoomLive);
} else {
    initRoomLive();
}
