import { GameEngine } from "../../core/GameEngine.js";
import { ApiService } from "../../services/ApiService.js";
import { StorageService } from "../../services/StorageService.js";
import { clearElement, createElement, formatTime, priorityLabel, statusLabel } from "../dom.js";
export function GamePage() {
    const apiService = new ApiService();
    const storageService = new StorageService();
    const page = createElement("section", "game-layout mode-locked");
    const modeOverlay = createElement("div", "mode-overlay");
    const modeOverlayCard = createElement("div", "retro-window mode-overlay-card");
    modeOverlayCard.appendChild(createElement("h2", "", "Обери режим гри"));
    const modeOverlayText = createElement("p", "mode-overlay-text", "Класика — ручний вибір замовлень. Аркада — 90 секунд випадкових доставок на очки.");
    const overlayButtons = createElement("div", "mode-overlay-buttons");
    const classicOverlayButton = createElement("button", "retro-button overlay-mode-button", "Класика");
    const arcadeOverlayButton = createElement("button", "retro-button overlay-mode-button", "Аркада 90с");
    overlayButtons.append(classicOverlayButton, arcadeOverlayButton);
    modeOverlayCard.append(modeOverlayText, overlayButtons);
    modeOverlay.appendChild(modeOverlayCard);
    let engine = null;
    let resultSaved = false;
    let lastOrdersRenderKey = "";
    let selectedMode = null;
    const canvasPanel = createElement("div", "retro-window canvas-panel");
    const canvasWrap = createElement("div", "canvas-wrap");
    const canvas = createElement("canvas");
    canvas.id = "gameCanvas";
    canvas.setAttribute("aria-label", "Ігрова карта міста Courier Rush");
    canvasWrap.appendChild(canvas);
    canvasPanel.appendChild(canvasWrap);
    const mobileControlsPanel = createElement("div", "retro-window mobile-controls-panel");
    mobileControlsPanel.appendChild(createElement("h2", "", "Керування"));
    const sidebar = createElement("aside", "game-sidebar");
    const statsPanel = createElement("div", "retro-window stats-panel");
    statsPanel.appendChild(createElement("h2", "", "Статус зміни"));
    const sessionActions = createElement("div", "session-actions");
    const startButton = createElement("button", "retro-button", "Старт");
    const pauseButton = createElement("button", "retro-button", "Пауза");
    const mobileStartButton = createElement("button", "retro-button", "Старт");
    const mobilePauseButton = createElement("button", "retro-button", "Пауза");
    const mobilePickupButton = createElement("button", "retro-button", "Взяти [E]");
    const mobileDeliverButton = createElement("button", "retro-button", "Доставлено");
    const mobileBoostButton = createElement("button", "retro-button boost-button", "Прискорення");
    const startButtons = [startButton, mobileStartButton];
    const pauseButtons = [pauseButton, mobilePauseButton];
    [startButton, pauseButton, mobileStartButton, mobilePauseButton, mobilePickupButton, mobileDeliverButton, mobileBoostButton].forEach((button) => button.setAttribute("type", "button"));
    sessionActions.append(startButton, pauseButton);
    const mobileActionRow = createElement("div", "mobile-action-row");
    mobileActionRow.append(mobileStartButton, mobilePauseButton, mobilePickupButton, mobileDeliverButton, mobileBoostButton);
    const mobilePad = createMobilePad((direction, pressed) => engine?.setMobileDirection(direction, pressed), (pressed) => engine?.setBoosting(pressed));
    mobileControlsPanel.append(mobileActionRow, mobilePad);
    const statGrid = createElement("div", "stat-grid");
    const statNodes = createStats(statGrid);
    const messageBox = createElement("div", "message-box", "Готово до запуску гри.");
    statsPanel.append(sessionActions, statGrid, messageBox);
    const ordersPanel = createElement("div", "retro-window orders-panel");
    ordersPanel.appendChild(createElement("h2", "", "Замовлення"));
    const orderList = createElement("div", "order-list");
    ordersPanel.appendChild(orderList);
    canvasPanel.appendChild(mobileControlsPanel);
    sidebar.append(statsPanel, ordersPanel);
    page.append(modeOverlay, canvasPanel, sidebar);
    const applySelectedMode = (mode) => {
        selectedMode = mode;
        engine?.setGameMode(mode);
        modeOverlay.classList.add("hidden");
        page.classList.remove("mode-locked");
    };
    classicOverlayButton.addEventListener("click", () => applySelectedMode("classic"));
    arcadeOverlayButton.addEventListener("click", () => applySelectedMode("arcade"));
    const startGame = () => {
        resultSaved = false;
        engine?.start();
    };
    const togglePause = () => engine?.togglePause();
    startButtons.forEach((button) => button.addEventListener("click", startGame));
    pauseButtons.forEach((button) => button.addEventListener("click", togglePause));
    mobilePickupButton.addEventListener("click", () => engine?.pickupOrder());
    mobileDeliverButton.addEventListener("click", () => engine?.completeDelivery());
    mobileBoostButton.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        mobileBoostButton.setPointerCapture(event.pointerId);
        engine?.setBoosting(true);
        mobileBoostButton.classList.add("active-boost");
    });
    mobileBoostButton.addEventListener("pointerup", (event) => {
        event.preventDefault();
        engine?.setBoosting(false);
        mobileBoostButton.classList.remove("active-boost");
    });
    mobileBoostButton.addEventListener("pointercancel", () => {
        engine?.setBoosting(false);
        mobileBoostButton.classList.remove("active-boost");
    });
    mobileBoostButton.addEventListener("pointerleave", () => {
        engine?.setBoosting(false);
        mobileBoostButton.classList.remove("active-boost");
    });
    const actionKeyHandler = (event) => {
        const target = event.target;
        const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
        if (isTyping) {
            return;
        }
        const key = event.key.toLowerCase();
        if (key === "e" || event.code === "KeyE") {
            event.preventDefault();
            engine?.pickupOrder();
            return;
        }
        if (event.code === "Space" || key === "f" || event.code === "KeyF") {
            event.preventDefault();
            engine?.completeDelivery();
        }
    };
    window.addEventListener("keydown", actionKeyHandler);
    loadGame();
    return {
        element: page,
        destroy: () => {
            window.removeEventListener("keydown", actionKeyHandler);
            engine?.destroy();
            engine = null;
        }
    };
    async function loadGame() {
        try {
            const orders = await apiService.getOrders();
            engine = new GameEngine(canvas, orders);
            engine.addSnapshotListener((snapshot) => renderSnapshot(snapshot));
            engine.addFinishListener((result) => handleFinish(result));
            if (selectedMode) {
                engine.setGameMode(selectedMode);
            }
            messageBox.textContent = "Спочатку обери режим гри.";
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Невідома помилка завантаження.";
            messageBox.textContent = `Помилка: ${message}`;
            orderList.appendChild(createElement("p", "", "Перевір, чи запущений локальний сервер через npm run serve."));
        }
    }
    function createStats(container) {
        const time = createStatBox(container, "Час", "04:00");
        const score = createStatBox(container, "Бали", "0");
        const delivered = createStatBox(container, "Доставлено", "0");
        const expired = createStatBox(container, "Прострочено", "0");
        const speed = createStatBox(container, "Швидкість", "0 км/год");
        const mode = createStatBox(container, "Режим", "звичайний");
        return { time, score, delivered, expired, speed, mode };
    }
    function createStatBox(container, label, value) {
        const box = createElement("div", "stat-box");
        const labelElement = createElement("span", "stat-label", label);
        const valueElement = createElement("span", "stat-value", value);
        box.append(labelElement, valueElement);
        container.appendChild(box);
        return valueElement;
    }
    function renderSnapshot(snapshot) {
        statNodes.time.textContent = formatTime(snapshot.timeLeft);
        statNodes.score.textContent = String(snapshot.score);
        statNodes.delivered.textContent = String(snapshot.deliveredCount);
        statNodes.expired.textContent = String(snapshot.expiredCount);
        statNodes.speed.textContent = `${snapshot.speedKmh} км/год`;
        statNodes.mode.textContent = snapshot.speedMode === "boost" ? "прискорення" : "звичайний";
        messageBox.textContent = snapshot.message;
        pauseButtons.forEach((button) => {
            button.textContent = snapshot.isPaused ? "Продовжити" : "Пауза";
            button.disabled = !snapshot.isRunning || snapshot.isFinished;
        });
        startButtons.forEach((button) => {
            button.textContent = snapshot.isFinished ? "Нова гра" : "Старт";
        });
        mobilePickupButton.disabled = !snapshot.isRunning || snapshot.isPaused || snapshot.isFinished;
        mobileDeliverButton.disabled = !snapshot.isRunning || snapshot.isPaused || snapshot.isFinished;
        mobileBoostButton.disabled = !snapshot.isRunning || snapshot.isPaused || snapshot.isFinished;
        mobileBoostButton.classList.toggle("active-boost", snapshot.speedMode === "boost");
        const ordersRenderKey = createOrdersRenderKey(snapshot);
        if (ordersRenderKey !== lastOrdersRenderKey) {
            lastOrdersRenderKey = ordersRenderKey;
            renderOrders(snapshot);
        }
    }
    function createOrdersRenderKey(snapshot) {
        const second = Math.floor(snapshot.elapsedSeconds);
        const orderState = snapshot.orders
            .map((order) => `${order.id}:${order.status}:${snapshot.selectedOrderId === order.id ? "1" : "0"}`)
            .join("|");
        return `${second}|${snapshot.selectedOrderId ?? "none"}|${orderState}`;
    }
    function renderOrders(snapshot) {
        clearElement(orderList);
        if (snapshot.currentMode === "arcade") {
            ordersPanel.classList.add("hidden-panel");
            return;
        }
        ordersPanel.classList.remove("hidden-panel");
        snapshot.orders.forEach((order) => {
            const card = createOrderCard(order, snapshot);
            orderList.appendChild(card);
        });
    }
    function createOrderCard(order, snapshot) {
        const selected = snapshot.selectedOrderId === order.id;
        const card = createElement("article", `order-card ${selected ? "selected" : ""}`);
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", `Вибрати замовлення ${order.street}`);
        const header = createElement("header");
        const title = createElement("h3", "", `${order.clientName}`);
        const statusBadge = createElement("span", `badge ${order.status}`, statusLabel(order.status));
        header.append(title, statusBadge);
        const address = createElement("p", "", order.street);
        const timeLeft = Math.max(0, order.deadlineSeconds - snapshot.elapsedSeconds);
        const meta = createElement("div", "order-meta");
        meta.append(createElement("span", `badge ${order.priority}`, `пріоритет: ${priorityLabel(order.priority)}`), createElement("span", "badge", `вага: ${order.weightKg} кг`), createElement("span", "badge", `₴${order.reward}`), createElement("span", "badge", `дедлайн: ${formatTime(timeLeft)}`));
        card.append(header, address, meta);
        const canSelect = snapshot.currentMode === "classic" && (order.status === "waiting" || order.status === "picked");
        if (canSelect) {
            card.addEventListener("click", () => engine?.selectOrder(order.id));
            card.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    engine?.selectOrder(order.id);
                }
            });
        }
        return card;
    }
    function handleFinish(result) {
        if (resultSaved) {
            return;
        }
        resultSaved = true;
        storageService.saveGameResult(result, selectedMode ?? "classic");
    }
}
function createModeSelector(onSelect, compact = false) {
    const root = createElement("div", `mode-selector${compact ? " compact" : ""}`);
    const title = createElement("span", "mode-selector-label", "Режим гри");
    const buttons = createElement("div", "mode-selector-buttons");
    const classicButton = createElement("button", "retro-button mode-button active", "Класика");
    const arcadeButton = createElement("button", "retro-button mode-button", "Аркада 90с");
    [classicButton, arcadeButton].forEach((button) => button.setAttribute("type", "button"));
    classicButton.addEventListener("click", () => onSelect("classic"));
    arcadeButton.addEventListener("click", () => onSelect("arcade"));
    buttons.append(classicButton, arcadeButton);
    root.append(title, buttons);
    return {
        root,
        setActive: (mode, locked) => {
            classicButton.classList.toggle("active-mode", mode === "classic");
            arcadeButton.classList.toggle("active-mode", mode === "arcade");
            classicButton.disabled = locked;
            arcadeButton.disabled = locked;
        }
    };
}
function createMobilePad(onChange, onBoost) {
    const pad = createElement("div", "mobile-pad");
    const buttons = [
        { direction: "up", label: "▲", className: "mobile-up" },
        { direction: "left", label: "◀", className: "mobile-left" },
        { direction: "down", label: "▼", className: "mobile-down" },
        { direction: "right", label: "▶", className: "mobile-right" }
    ];
    buttons.forEach((item) => {
        const button = createElement("button", item.className, item.label);
        button.setAttribute("type", "button");
        button.setAttribute("aria-label", `Рух ${item.direction}`);
        button.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            button.setPointerCapture(event.pointerId);
            onChange(item.direction, true);
        });
        button.addEventListener("pointerup", (event) => {
            event.preventDefault();
            onChange(item.direction, false);
        });
        button.addEventListener("pointercancel", () => onChange(item.direction, false));
        button.addEventListener("pointerleave", () => onChange(item.direction, false));
        pad.appendChild(button);
    });
    const boost = createElement("button", "mobile-boost", "BOOST");
    boost.setAttribute("type", "button");
    boost.setAttribute("aria-label", "Прискорення");
    boost.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        boost.setPointerCapture(event.pointerId);
        onBoost(true);
    });
    boost.addEventListener("pointerup", (event) => {
        event.preventDefault();
        onBoost(false);
    });
    boost.addEventListener("pointercancel", () => onBoost(false));
    boost.addEventListener("pointerleave", () => onBoost(false));
    pad.appendChild(boost);
    return pad;
}
