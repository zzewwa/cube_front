const CUBIE_MATERIAL_COUNT = 6;
const COOKIE_MAX_AGE_SECONDS = 31536000;

function materialNameToCode(materialName) {
    switch (materialName) {
        case 'r': return '1';
        case 'o': return '2';
        case 'g': return '3';
        case 'b': return '4';
        case 'w': return '5';
        case 'y': return '6';
        case 'h':
        default:
            return '0';
    }
}

function materialCodeToName(materialCode) {
    switch (materialCode) {
        case '1': return 'r';
        case '2': return 'o';
        case '3': return 'g';
        case '4': return 'b';
        case '5': return 'w';
        case '6': return 'y';
        case '0':
        default:
            return 'h';
    }
}

function getSortedCubes(cubeMeshList) {
    return [...cubeMeshList].sort((leftCube, rightCube) => Number(leftCube.name) - Number(rightCube.name));
}

export class Cookies {
    constructor(defaultOptions = {}) {
        this.defaultOptions = {
            path: '/',
            maxAge: COOKIE_MAX_AGE_SECONDS,
            sameSite: 'lax',
            ...defaultOptions
        };
    }

    read(name) {
        const encodedName = `${encodeURIComponent(name)}=`;
        const cookies = document.cookie ? document.cookie.split('; ') : [];
        for (const cookie of cookies) {
            if (cookie.startsWith(encodedName)) {
                return decodeURIComponent(cookie.slice(encodedName.length));
            }
        }

        return null;
    }

    write(name, value, options = {}) {
        const settings = { ...this.defaultOptions, ...options };
        document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${settings.path}; max-age=${settings.maxAge}; samesite=${settings.sameSite}`;
    }
}

export class CookieCube extends Cookies {
    constructor() {
        super();
        this.stateCookieName = 'rubiks_cube_state';
        this.skinStateCookieName = 'rubiks_cube_skin_state';
    }

    serializeState(cubeMeshList, materialsByObjectId) {
        return getSortedCubes(cubeMeshList)
            .map((cube) => {
                const materials = materialsByObjectId.get(cube.id) || cube.material;
                return materials.map((material) => materialNameToCode(material.name)).join('');
            })
            .join('');
    }

    deserializeState(serializedState, cubeCount) {
        const expectedLength = cubeCount * CUBIE_MATERIAL_COUNT;
        if (!serializedState || serializedState.length !== expectedLength || /[^0-6]/.test(serializedState)) {
            return null;
        }

        const restoredState = [];
        for (let cubeIndex = 0; cubeIndex < cubeCount; cubeIndex++) {
            const chunk = serializedState.slice(
                cubeIndex * CUBIE_MATERIAL_COUNT,
                (cubeIndex + 1) * CUBIE_MATERIAL_COUNT
            );
            restoredState.push([...chunk].map((materialCode) => materialCodeToName(materialCode)));
        }

        return restoredState;
    }

    loadState(cubeCount) {
        const materials = this.deserializeState(this.read(this.stateCookieName), cubeCount);
        if (!materials) {
            return null;
        }

        let skinState = null;
        let additionalInfo = null;
        const rawSkinState = this.read(this.skinStateCookieName);
        if (rawSkinState) {
            try {
                const parsed = JSON.parse(rawSkinState);
                if (parsed && typeof parsed === 'object') {
                    const hasEnvelope = Object.prototype.hasOwnProperty.call(parsed, 'skinState')
                        || Object.prototype.hasOwnProperty.call(parsed, 'additionalInfo');
                    if (hasEnvelope) {
                        skinState = parsed.skinState && typeof parsed.skinState === 'object' ? parsed.skinState : null;
                        additionalInfo = parsed.additionalInfo && typeof parsed.additionalInfo === 'object'
                            ? parsed.additionalInfo
                            : null;
                    } else {
                        skinState = parsed;
                    }
                }
            } catch (_error) {
                skinState = null;
                additionalInfo = null;
            }
        }

        return { materials, skinState, additionalInfo };
    }

    saveState(cubeMeshList, materialsByObjectId, skinState = null, additionalInfo = null) {
        this.write(this.stateCookieName, this.serializeState(cubeMeshList, materialsByObjectId));
        const payload = {
            version: 2,
            skinState,
            additionalInfo: additionalInfo && typeof additionalInfo === 'object' ? additionalInfo : null
        };
        this.write(this.skinStateCookieName, JSON.stringify(payload));
    }
}

export class CookieSettings extends Cookies {
    constructor() {
        super();
        this.settingsCookieName = 'rubiks_cube_settings';
    }

    loadSettings() {
        const rawValue = this.read(this.settingsCookieName);
        if (!rawValue) {
            return null;
        }

        try {
            const parsedValue = JSON.parse(rawValue);
            return parsedValue && typeof parsedValue === 'object' ? parsedValue : null;
        } catch (_error) {
            return null;
        }
    }

    saveSettings(settings) {
        this.write(this.settingsCookieName, JSON.stringify(settings));
    }
}