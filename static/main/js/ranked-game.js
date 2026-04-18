const initRankedGame = () => {
    const root = document.querySelector('[data-ranked-root]');
    if (!root) {
        return;
    }

    const findButton = root.querySelector('[data-ranked-find-btn]');
    const statusNode = root.querySelector('[data-ranked-status]');
    const waitingCountNode = root.querySelector('[data-ranked-waiting-count]');
    const waitTimeNode = root.querySelector('[data-ranked-wait-time]');

    let inQueue = false;
    let waitSeconds = 0;
    let pollTimer = null;

    const formatWait = (seconds) => {
        const total = Math.max(0, Math.floor(seconds));
        const mm = Math.floor(total / 60);
        const ss = total % 60;
        return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    };

    const setStatus = (text, kind = '') => {
        if (!statusNode) {
            return;
        }
        statusNode.textContent = text || '';
        statusNode.classList.remove('is-success', 'is-error');
        if (kind) {
            statusNode.classList.add(kind);
        }
    };

    const applyQueueUi = ({ waitingCount = 0, queueSeconds = 0, queued = false }) => {
        inQueue = queued;
        waitSeconds = queueSeconds;
        if (waitingCountNode) {
            waitingCountNode.textContent = String(waitingCount);
        }
        if (waitTimeNode) {
            waitTimeNode.textContent = formatWait(queueSeconds);
        }
        if (findButton) {
            findButton.disabled = queued;
            findButton.textContent = queued ? 'Поиск соперника...' : 'Найти игру';
        }
    };

    const joinQueue = async () => {
        if (findButton) {
            findButton.disabled = true;
        }
        setStatus('Встаем в очередь...');

        try {
            const response = await fetch('/ranked/queue/join/', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'X-CSRFToken': window.getCsrfToken ? window.getCsrfToken() : '',
                },
            });
            const payload = await response.json();
            if (!response.ok || !payload.ok) {
                setStatus(payload.error || 'Не удалось встать в очередь', 'is-error');
                applyQueueUi({ queued: false, waitingCount: 0, queueSeconds: 0 });
                return;
            }

            if (payload.matched && payload.room_code) {
                window.location.href = `/rooms/r/${encodeURIComponent(payload.room_code)}/`;
                return;
            }

            setStatus('Ожидаем соперника...');
            applyQueueUi({
                queued: true,
                waitingCount: Number(payload.waiting_count) || 1,
                queueSeconds: 0,
            });
        } catch (_error) {
            setStatus('Сетевая ошибка при постановке в очередь', 'is-error');
            applyQueueUi({ queued: false, waitingCount: 0, queueSeconds: 0 });
        }
    };

    const pollStatus = async () => {
        try {
            const response = await fetch('/ranked/queue/status/', {
                credentials: 'same-origin',
            });
            if (!response.ok) {
                return;
            }
            const payload = await response.json();
            if (!payload.ok) {
                return;
            }

            if (payload.matched && payload.room_code) {
                window.location.href = `/rooms/r/${encodeURIComponent(payload.room_code)}/`;
                return;
            }

            const queued = Boolean(payload.in_queue);
            applyQueueUi({
                queued,
                waitingCount: Number(payload.waiting_count) || 0,
                queueSeconds: Number(payload.wait_seconds) || 0,
            });
            if (queued) {
                setStatus('Ожидаем соперника...');
            }
        } catch (_error) {
            // Ignore poll errors; next tick will retry.
        }
    };

    findButton?.addEventListener('click', () => {
        if (inQueue) {
            return;
        }
        void joinQueue();
    });

    pollTimer = window.setInterval(() => {
        if (inQueue) {
            waitSeconds += 1;
            if (waitTimeNode) {
                waitTimeNode.textContent = formatWait(waitSeconds);
            }
        }
        void pollStatus();
    }, 1000);

    void pollStatus();

    window.addEventListener('beforeunload', () => {
        if (pollTimer !== null) {
            clearInterval(pollTimer);
        }
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRankedGame);
} else {
    initRankedGame();
}
