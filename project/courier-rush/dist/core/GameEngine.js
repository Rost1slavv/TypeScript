import { ScoreManager } from "./ScoreManager.js";
export class GameEngine {
    constructor(canvas, orders, options = {}) {
        this.scoreManager = new ScoreManager();
        this.snapshotListeners = [];
        this.finishListeners = [];
        this.classicDurationSeconds = 240;
        this.arcadeDurationSeconds = 90;
        this.settings = {
            durationSeconds: 240,
            mapWidth: 1220,
            mapHeight: 760,
            interactionRadius: 44
        };
        this.worldWidth = 1800;
        this.worldHeight = 1260;
        this.roads = this.createRoads();
        this.crosswalks = this.createCrosswalks();
        this.buildings = this.createBuildings();
        this.parks = this.createParks();
        this.speedCameras = this.createSpeedCameras();
        this.depot = { x: 92, y: 1070 };
        this.depotBuilding = { x: 22, y: 1160, width: 132, height: 62 };
        this.keys = { up: false, down: false, left: false, right: false };
        this.redPenaltyTimes = new Map();
        this.speedCameraPenaltyTimes = new Map();
        this.speedConfig = {
            normalMax: 190,
            boostMax: 315,
            acceleration: 520,
            braking: 620,
            friction: 410,
            kmhMultiplier: 0.32
        };
        this.courier = {
            position: { ...this.depot },
            speed: 0,
            carriedOrderId: null
        };
        this.currentVelocity = { x: 0, y: 0 };
        this.courierDirection = "right";
        this.selectedOrderId = null;
        this.currentMode = "classic";
        this.message = "Обери режим і натисни «Старт».";
        this.elapsedSeconds = 0;
        this.timeLeft = this.settings.durationSeconds;
        this.deliveredCount = 0;
        this.expiredCount = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.isFinished = false;
        this.isBoosting = false;
        this.lastTimestamp = 0;
        this.animationId = null;
        this.collisionCooldownUntil = 0;
        this.camera = { x: 0, y: 500 };
        this.trafficLights = this.createTrafficLights();
        this.trafficCars = this.createTrafficCars();
        this.pedestrians = this.createPedestrians();
        this.flashStartedAt = 0;
        this.flashUntil = 0;
        this.flashText = "";
        this.keyDownHandler = (event) => this.handleKeyDown(event);
        this.keyUpHandler = (event) => this.handleKeyUp(event);
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Canvas API недоступний у цьому браузері.");
        }
        this.canvas = canvas;
        this.ctx = context;
        this.canvas.width = this.settings.mapWidth;
        this.canvas.height = this.settings.mapHeight;
        this.isInteractive = options.interactive ?? true;
        this.initialOrders = this.cloneOrders(orders);
        this.orders = this.prepareOrders(0);
        if (this.isInteractive) {
            window.addEventListener("keydown", this.keyDownHandler);
            window.addEventListener("keyup", this.keyUpHandler);
        }
        this.updateCamera();
        this.draw();
        this.emitSnapshot();
    }
    destroy() {
        if (this.isInteractive) {
            window.removeEventListener("keydown", this.keyDownHandler);
            window.removeEventListener("keyup", this.keyUpHandler);
        }
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    addSnapshotListener(listener) {
        this.snapshotListeners.push(listener);
        listener(this.createSnapshot());
    }
    addFinishListener(listener) {
        this.finishListeners.push(listener);
    }
    setGameMode(mode) {
        if (this.isRunning && !this.isFinished) {
            this.message = "Режим не можна змінювати під час активної гри.";
            this.emitSnapshot();
            return;
        }
        this.currentMode = mode;
        this.settings.durationSeconds = mode === "arcade" ? this.arcadeDurationSeconds : this.classicDurationSeconds;
        this.resetSession();
        this.message = mode === "arcade"
            ? "Аркада на 90 секунд готова. Замовлення будуть випадати автоматично."
            : "Класичний режим готовий. Вибери замовлення вручну й натисни «Старт».";
        this.emitSnapshot();
    }
    start() {
        if (this.isFinished) {
            this.resetSession();
        }
        if (!this.isRunning && this.elapsedSeconds === 0) {
            if (this.currentMode === "arcade") {
                const assigned = this.assignRandomArcadeOrder();
                this.message = assigned
                    ? `Аркада почалась. Нове замовлення автоматично видано для ${assigned.clientName}.`
                    : "Аркада почалась. Очікується нове замовлення.";
            }
            else {
                this.message = "Зміна почалась. Обери замовлення та вирушай на маршрут.";
            }
        }
        this.isRunning = true;
        this.isPaused = false;
        this.lastTimestamp = performance.now();
        if (this.animationId === null) {
            this.animationId = requestAnimationFrame((timestamp) => this.loop(timestamp));
        }
        this.emitSnapshot();
    }
    togglePause() {
        if (!this.isRunning || this.isFinished) {
            return;
        }
        this.isPaused = !this.isPaused;
        this.message = this.isPaused ? "Пауза. Натисни «Пауза» ще раз, щоб продовжити." : "Гру продовжено.";
        this.lastTimestamp = performance.now();
        this.emitSnapshot();
    }
    selectOrder(orderId) {
        if (this.currentMode === "arcade") {
            this.message = "У режимі аркади замовлення призначаються автоматично.";
            this.emitSnapshot();
            return;
        }
        const order = this.orders.find((item) => item.id === orderId) ?? null;
        if (!order) {
            return;
        }
        if (this.courier.carriedOrderId && this.courier.carriedOrderId !== orderId) {
            this.message = "Кур'єр може перевозити тільки одне замовлення одночасно.";
            this.emitSnapshot();
            return;
        }
        if (order.status !== "waiting" && order.status !== "picked") {
            this.message = "Це замовлення вже недоступне для вибору.";
            this.emitSnapshot();
            return;
        }
        this.selectedOrderId = order.id;
        this.message = `Вибрано замовлення для ${order.clientName}. Спочатку їдь на службову парковку складу ліворуч від дороги.`;
        this.emitSnapshot();
    }
    pickupOrder() {
        const order = this.getSelectedOrder();
        if (!this.isRunning || this.isPaused || this.isFinished) {
            this.message = "Спочатку запусти гру.";
            this.emitSnapshot();
            return;
        }
        if (!order) {
            this.message = this.currentMode === "arcade" ? "Зачекай, система підбере наступне замовлення." : "Вибери замовлення зі списку.";
            this.emitSnapshot();
            return;
        }
        if (this.courier.carriedOrderId) {
            this.message = "У машині вже є посилка. Спочатку достав її клієнту.";
            this.emitSnapshot();
            return;
        }
        if (order.status !== "waiting") {
            this.message = "Цю посилку вже неможливо забрати.";
            this.emitSnapshot();
            return;
        }
        if (this.distance(this.courier.position, order.pickup) > this.settings.interactionRadius) {
            this.message = "Під'їдь ближче до жовтого маркера службової парковки. Швидка клавіша: E.";
            this.emitSnapshot();
            return;
        }
        order.status = "picked";
        order.pickedAtSeconds = Math.round(this.elapsedSeconds);
        this.courier.carriedOrderId = order.id;
        this.message = `Посилку для ${order.clientName} забрано. Їдь до клієнта: ${order.street}. Завершення: Space або F.`;
        this.emitSnapshot();
    }
    completeDelivery() {
        const order = this.getCarriedOrder();
        if (!this.isRunning || this.isPaused || this.isFinished) {
            this.message = "Спочатку запусти гру.";
            this.emitSnapshot();
            return;
        }
        if (!order) {
            this.message = "У машині немає активної посилки.";
            this.emitSnapshot();
            return;
        }
        if (this.distance(this.courier.position, order.destination) > this.settings.interactionRadius) {
            this.message = "Під'їдь ближче до маркера клієнта, щоб завершити доставку. Швидка клавіша: Space або F.";
            this.emitSnapshot();
            return;
        }
        const secondsRemaining = Math.max(0, order.deadlineSeconds - this.elapsedSeconds);
        const added = this.scoreManager.addDelivery(order, secondsRemaining);
        order.status = "delivered";
        order.deliveredAtSeconds = Math.round(this.elapsedSeconds);
        this.courier.carriedOrderId = null;
        this.selectedOrderId = null;
        this.deliveredCount += 1;
        if (this.currentMode === "arcade") {
            const nextOrder = this.assignRandomArcadeOrder();
            this.message = nextOrder
                ? `Доставлено! +${added} балів. Нове замовлення: ${nextOrder.clientName}, ${nextOrder.street}.`
                : `Доставлено! +${added} балів.`;
        }
        else {
            this.message = `Доставлено! +${added} балів. Можна брати наступне замовлення.`;
        }
        this.emitSnapshot();
        this.checkFinishConditions();
    }
    setMobileDirection(direction, pressed) {
        if (!this.isInteractive) {
            return;
        }
        this.keys[direction] = pressed;
    }
    setBoosting(pressed) {
        if (!this.isInteractive) {
            return;
        }
        this.isBoosting = pressed;
    }
    loop(timestamp) {
        this.animationId = requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
        if (this.lastTimestamp === 0) {
            this.lastTimestamp = timestamp;
        }
        const deltaSeconds = Math.min(0.05, Math.max(0, (timestamp - this.lastTimestamp) / 1000));
        this.lastTimestamp = timestamp;
        if (this.isRunning && !this.isPaused && !this.isFinished) {
            this.update(deltaSeconds);
            this.emitSnapshot();
        }
        this.draw();
    }
    update(deltaSeconds) {
        this.elapsedSeconds += deltaSeconds;
        this.timeLeft = Math.max(0, this.settings.durationSeconds - this.elapsedSeconds);
        this.updateTrafficLights(deltaSeconds);
        this.updateTrafficCars(deltaSeconds);
        this.updatePedestrians(deltaSeconds);
        this.expireLateOrders();
        this.updateCourier(deltaSeconds);
        this.checkTrafficCollisions();
        this.checkPedestrianCollision();
        this.checkFinishConditions();
    }
    updateCourier(deltaSeconds) {
        const vector = this.getManualVector();
        const hasInput = vector !== null;
        let targetVelocity = { x: 0, y: 0 };
        if (vector) {
            const length = Math.hypot(vector.x, vector.y);
            if (length > 0) {
                const normalized = { x: vector.x / length, y: vector.y / length };
                const maxSpeed = this.isBoosting ? this.speedConfig.boostMax : this.speedConfig.normalMax;
                targetVelocity = { x: normalized.x * maxSpeed, y: normalized.y * maxSpeed };
                this.courierDirection = this.vectorToDirection(normalized);
            }
        }
        const acceleration = hasInput ? this.speedConfig.acceleration : this.speedConfig.braking;
        this.currentVelocity.x = this.moveToward(this.currentVelocity.x, targetVelocity.x, acceleration * deltaSeconds);
        this.currentVelocity.y = this.moveToward(this.currentVelocity.y, targetVelocity.y, acceleration * deltaSeconds);
        if (!hasInput) {
            this.currentVelocity.x = this.applyFriction(this.currentVelocity.x, this.speedConfig.friction * deltaSeconds);
            this.currentVelocity.y = this.applyFriction(this.currentVelocity.y, this.speedConfig.friction * deltaSeconds);
        }
        const speed = Math.hypot(this.currentVelocity.x, this.currentVelocity.y);
        this.courier.speed = speed;
        if (speed < 0.5) {
            this.currentVelocity = { x: 0, y: 0 };
            this.courier.speed = 0;
            return;
        }
        const next = {
            x: this.courier.position.x + this.currentVelocity.x * deltaSeconds,
            y: this.courier.position.y + this.currentVelocity.y * deltaSeconds
        };
        const previousPosition = { ...this.courier.position };
        let moved = false;
        if (this.canMoveTo(next)) {
            this.courier.position = next;
            moved = true;
        }
        else {
            const nextX = { x: next.x, y: this.courier.position.y };
            const nextY = { x: this.courier.position.x, y: next.y };
            const canMoveX = this.canMoveTo(nextX);
            const canMoveY = this.canMoveTo(nextY);
            if (canMoveX) {
                this.courier.position = nextX;
                this.currentVelocity.y = 0;
                moved = true;
            }
            else if (canMoveY) {
                this.courier.position = nextY;
                this.currentVelocity.x = 0;
                moved = true;
            }
            else {
                this.currentVelocity = { x: 0, y: 0 };
                this.courier.speed = 0;
                this.message = "Далі не можна: машина має рухатися тільки по дорогах, смугах і парковці складу.";
            }
        }
        if (moved) {
            this.updateCamera();
            const movementDirection = this.vectorToDirection({
                x: this.courier.position.x - previousPosition.x,
                y: this.courier.position.y - previousPosition.y
            });
            this.checkRedLightPenalty(movementDirection);
            this.checkSpeedCameraPenalty();
        }
    }
    getManualVector() {
        const x = (this.keys.left ? -1 : 0) + (this.keys.right ? 1 : 0);
        const y = (this.keys.up ? -1 : 0) + (this.keys.down ? 1 : 0);
        if (x === 0 && y === 0) {
            return null;
        }
        return { x, y };
    }
    checkRedLightPenalty(direction) {
        const axis = direction === "left" || direction === "right" ? "horizontal" : "vertical";
        const now = this.elapsedSeconds;
        for (const light of this.trafficLights) {
            if (this.distance(this.courier.position, { x: light.x, y: light.y }) > 40) {
                continue;
            }
            if (light.phase === axis) {
                continue;
            }
            const lastPenalty = this.redPenaltyTimes.get(light.id) ?? -999;
            if (now - lastPenalty >= 2.4) {
                const penalty = this.scoreManager.applyRedLightPenalty();
                this.redPenaltyTimes.set(light.id, now);
                this.message = `Штраф за червоний сигнал: -${penalty} балів.`;
            }
        }
    }
    checkSpeedCameraPenalty() {
        const currentSpeed = this.getCurrentSpeedKmh();
        const now = this.elapsedSeconds;
        for (const camera of this.speedCameras) {
            if (this.distance(this.courier.position, { x: camera.x, y: camera.y }) > camera.detectionRadius) {
                continue;
            }
            if (currentSpeed <= camera.speedLimitKmh) {
                continue;
            }
            const lastPenalty = this.speedCameraPenaltyTimes.get(camera.id) ?? -999;
            if (now - lastPenalty < 5.5) {
                continue;
            }
            const penalty = this.scoreManager.applySpeedCameraPenalty();
            this.speedCameraPenaltyTimes.set(camera.id, now);
            this.triggerCameraFlash(camera, penalty, currentSpeed);
            this.message = `📸 Радáр ${camera.label} зафіксував ${currentSpeed} км/год при ліміті ${camera.speedLimitKmh}. Штраф: -${penalty} балів.`;
        }
    }
    triggerCameraFlash(camera, penalty, currentSpeed) {
        this.flashStartedAt = this.elapsedSeconds;
        this.flashUntil = this.elapsedSeconds + 1.05;
        this.flashText = `${camera.label}: ${currentSpeed} км/год  -${penalty}`;
    }
    updateTrafficLights(deltaSeconds) {
        this.trafficLights = this.trafficLights.map((light) => {
            const timeInPhase = light.timeInPhase + deltaSeconds;
            if (timeInPhase >= light.cycleSeconds) {
                return {
                    ...light,
                    phase: light.phase === "horizontal" ? "vertical" : "horizontal",
                    timeInPhase: 0
                };
            }
            return { ...light, timeInPhase };
        });
    }
    updateTrafficCars(deltaSeconds) {
        this.trafficCars = this.trafficCars.map((car) => {
            const currentTarget = car.route[car.routeIndex];
            if (!currentTarget) {
                return car;
            }
            const dx = currentTarget.x - car.position.x;
            const dy = currentTarget.y - car.position.y;
            const distanceToTarget = Math.hypot(dx, dy);
            if (distanceToTarget <= 2) {
                const resetPoint = car.route[1] ?? car.position;
                const targetPoint = car.route[0] ?? car.position;
                return {
                    ...car,
                    routeIndex: 0,
                    direction: this.vectorToDirection({ x: targetPoint.x - resetPoint.x, y: targetPoint.y - resetPoint.y }),
                    position: { ...resetPoint }
                };
            }
            const nx = dx / distanceToTarget;
            const ny = dy / distanceToTarget;
            const nextDirection = this.vectorToDirection({ x: nx, y: ny });
            if (this.shouldTrafficCarStop(car, nextDirection)) {
                return { ...car, direction: nextDirection };
            }
            const travel = Math.min(car.speed * deltaSeconds, distanceToTarget);
            return {
                ...car,
                direction: nextDirection,
                position: {
                    x: car.position.x + nx * travel,
                    y: car.position.y + ny * travel
                }
            };
        });
    }
    shouldTrafficCarStop(car, direction) {
        return this.mustStopAtRedLight(car.position, direction)
            || this.mustYieldToPedestrian(car.position, direction)
            || this.mustKeepDistanceFromCarAhead(car, direction);
    }
    mustKeepDistanceFromCarAhead(car, direction) {
        const axis = direction === "left" || direction === "right" ? "horizontal" : "vertical";
        for (const other of this.trafficCars) {
            if (other.id === car.id) {
                continue;
            }
            const otherAxis = other.direction === "left" || other.direction === "right" ? "horizontal" : "vertical";
            if (axis !== otherAxis) {
                continue;
            }
            const lateralDistance = axis === "horizontal"
                ? Math.abs(car.position.y - other.position.y)
                : Math.abs(car.position.x - other.position.x);
            if (lateralDistance > 18) {
                continue;
            }
            const forwardDistance = this.forwardDistance(car.position, other.position, direction);
            if (forwardDistance > 0 && forwardDistance < 30) {
                return true;
            }
        }
        return false;
    }
    mustYieldAtUncontrolledCrossing(_car, _direction) {
        return false;
    }
    pointAhead(position, direction, distance) {
        if (direction === "right") {
            return { x: position.x + distance, y: position.y };
        }
        if (direction === "left") {
            return { x: position.x - distance, y: position.y };
        }
        if (direction === "down") {
            return { x: position.x, y: position.y + distance };
        }
        return { x: position.x, y: position.y - distance };
    }
    isPointControlledByTrafficLight(point) {
        return this.trafficLights.some((light) => Math.abs(point.x - light.x) <= 34 && Math.abs(point.y - light.y) <= 34);
    }
    mustStopAtRedLight(position, direction) {
        const axis = direction === "left" || direction === "right" ? "horizontal" : "vertical";
        for (const light of this.trafficLights) {
            if (this.isGreenForDirection(light, direction)) {
                continue;
            }
            const lateralDistance = axis === "horizontal" ? Math.abs(position.y - light.y) : Math.abs(position.x - light.x);
            if (lateralDistance > 54) {
                continue;
            }
            const stopPoint = this.getStopLinePoint(light, direction);
            const forwardDistance = this.forwardDistance(position, stopPoint, direction);
            if (forwardDistance >= 0 && forwardDistance <= 30) {
                return true;
            }
        }
        return false;
    }
    isGreenForDirection(light, direction) {
        const axis = direction === "left" || direction === "right" ? "horizontal" : "vertical";
        if (axis === "vertical") {
            return light.phase === "vertical" && !this.isYellowPhase(light);
        }
        return light.phase === "horizontal";
    }
    isYellowPhase(light) {
        return light.phase === "vertical" && light.timeInPhase >= Math.max(0, light.cycleSeconds - light.yellowSeconds);
    }
    getStopLinePoint(light, direction) {
        const offset = 54;
        if (direction === "right") {
            return { x: light.x - offset, y: light.y };
        }
        if (direction === "left") {
            return { x: light.x + offset, y: light.y };
        }
        if (direction === "down") {
            return { x: light.x, y: light.y - offset };
        }
        return { x: light.x, y: light.y + offset };
    }
    mustYieldToPedestrian(position, direction) {
        const carAxis = direction === "left" || direction === "right" ? "horizontal" : "vertical";
        for (const pedestrian of this.pedestrians) {
            if (this.elapsedSeconds < pedestrian.pauseUntilSeconds) {
                continue;
            }
            const crosswalk = this.crosswalks.find((item) => this.isPointInsideRect(pedestrian.position, item, 2));
            if (!crosswalk || !this.isPedestrianInsideRoadPart(pedestrian, crosswalk)) {
                continue;
            }
            const crossingAxis = crosswalk.orientation === "vertical" ? "horizontal" : "vertical";
            if (carAxis !== crossingAxis) {
                continue;
            }
            const crosswalkCenter = { x: crosswalk.x + crosswalk.width / 2, y: crosswalk.y + crosswalk.height / 2 };
            const lateralDistance = carAxis === "horizontal" ? Math.abs(position.y - crosswalkCenter.y) : Math.abs(position.x - crosswalkCenter.x);
            if (lateralDistance > 30) {
                continue;
            }
            const forwardDistance = this.forwardDistance(position, crosswalkCenter, direction);
            if (forwardDistance >= 0 && forwardDistance <= 36) {
                return true;
            }
        }
        return false;
    }
    isPedestrianInsideRoadPart(pedestrian, crosswalk) {
        const margin = 10;
        if (crosswalk.orientation === "horizontal") {
            return pedestrian.position.x > crosswalk.x + margin && pedestrian.position.x < crosswalk.x + crosswalk.width - margin;
        }
        return pedestrian.position.y > crosswalk.y + margin && pedestrian.position.y < crosswalk.y + crosswalk.height - margin;
    }
    forwardDistance(from, target, direction) {
        if (direction === "right") {
            return target.x - from.x;
        }
        if (direction === "left") {
            return from.x - target.x;
        }
        if (direction === "down") {
            return target.y - from.y;
        }
        return from.y - target.y;
    }
    isPointInsideRect(point, rect, margin = 0) {
        return point.x >= rect.x - margin && point.x <= rect.x + rect.width + margin && point.y >= rect.y - margin && point.y <= rect.y + rect.height + margin;
    }
    updatePedestrians(deltaSeconds) {
        this.pedestrians = this.pedestrians.map((pedestrian, index) => {
            if (this.elapsedSeconds < pedestrian.pauseUntilSeconds) {
                return pedestrian;
            }
            const target = pedestrian.direction === 1 ? pedestrian.end : pedestrian.start;
            const dx = target.x - pedestrian.position.x;
            const dy = target.y - pedestrian.position.y;
            const distanceToTarget = Math.hypot(dx, dy);
            if (distanceToTarget <= 2) {
                const nextDirection = pedestrian.direction === 1 ? -1 : 1;
                return {
                    ...pedestrian,
                    direction: nextDirection,
                    position: { ...target },
                    pauseUntilSeconds: this.elapsedSeconds + 3.2 + index * 0.65
                };
            }
            const travel = Math.min(pedestrian.speed * deltaSeconds, distanceToTarget);
            const nx = dx / distanceToTarget;
            const ny = dy / distanceToTarget;
            return {
                ...pedestrian,
                position: {
                    x: pedestrian.position.x + nx * travel,
                    y: pedestrian.position.y + ny * travel
                }
            };
        });
    }
    checkTrafficCollisions() {
        if (this.elapsedSeconds < this.collisionCooldownUntil) {
            return;
        }
        const collided = this.trafficCars.some((car) => this.distance(this.courier.position, car.position) < 28);
        if (!collided) {
            return;
        }
        const penalty = this.scoreManager.applyCollisionPenalty();
        this.collisionCooldownUntil = this.elapsedSeconds + 1.5;
        const pushed = {
            x: this.clamp(this.courier.position.x - this.directionSignX(this.courierDirection) * 52, 0, this.worldWidth),
            y: this.clamp(this.courier.position.y - this.directionSignY(this.courierDirection) * 52, 0, this.worldHeight)
        };
        this.courier.position = this.canMoveTo(pushed) ? pushed : { ...this.depot };
        this.currentVelocity = { x: 0, y: 0 };
        this.courier.speed = 0;
        this.updateCamera();
        this.message = `Зіткнення з трафіком: -${penalty} балів. Машину відкинуло назад.`;
    }
    checkPedestrianCollision() {
        const hitPedestrian = this.pedestrians.find((pedestrian) => this.distance(this.courier.position, pedestrian.position) < 18);
        if (!hitPedestrian || this.isFinished) {
            return;
        }
        this.currentVelocity = { x: 0, y: 0 };
        this.courier.speed = 0;
        this.finishGame(`Гру завершено: кур'єр збив пішохода на переході. Дотримуйся правил дорожнього руху.`);
    }
    expireLateOrders() {
        let expiredSomething = false;
        let lastExpiredStreet = "";
        let lastPenalty = 0;
        for (const order of this.orders) {
            if ((order.status === "waiting" || order.status === "picked") && this.elapsedSeconds >= order.deadlineSeconds) {
                order.status = "expired";
                this.expiredCount += 1;
                expiredSomething = true;
                lastExpiredStreet = order.street;
                lastPenalty = this.scoreManager.applyLatePenalty();
                if (this.courier.carriedOrderId === order.id) {
                    this.courier.carriedOrderId = null;
                    this.selectedOrderId = null;
                }
            }
        }
        if (expiredSomething) {
            if (this.currentMode === "arcade" && !this.courier.carriedOrderId) {
                const nextOrder = this.assignRandomArcadeOrder();
                this.message = nextOrder
                    ? `Замовлення ${lastExpiredStreet} прострочено. Штраф: -${lastPenalty} балів. Нове замовлення: ${nextOrder.clientName}, ${nextOrder.street}.`
                    : `Замовлення ${lastExpiredStreet} прострочено. Штраф: -${lastPenalty} балів.`;
            }
            else {
                this.message = `Замовлення ${lastExpiredStreet} прострочено. Штраф: -${lastPenalty} балів.`;
            }
        }
    }
    checkFinishConditions() {
        if (this.isFinished) {
            return;
        }
        if (this.currentMode === "arcade") {
            if (this.timeLeft <= 0) {
                this.finishGame(`Час аркади завершився. Результат: ${this.scoreManager.getScore()} балів, доставлено: ${this.deliveredCount}.`);
            }
            return;
        }
        const allResolved = this.orders.every((order) => order.status === "delivered" || order.status === "expired");
        if (this.timeLeft <= 0 || allResolved) {
            this.finishGame();
        }
    }
    finishGame(customMessage) {
        if (this.isFinished) {
            return;
        }
        this.isFinished = true;
        this.isRunning = false;
        this.isPaused = false;
        this.timeLeft = 0;
        this.currentVelocity = { x: 0, y: 0 };
        this.courier.speed = 0;
        this.message = customMessage ?? `Гру завершено. Результат: ${this.scoreManager.getScore()} балів, доставлено: ${this.deliveredCount}.`;
        const result = {
            score: this.scoreManager.getScore(),
            delivered: this.deliveredCount,
            expired: this.expiredCount,
            total: this.orders.length
        };
        this.finishListeners.forEach((listener) => listener(result));
        this.emitSnapshot();
    }
    resetSession() {
        this.settings.durationSeconds = this.currentMode === "arcade" ? this.arcadeDurationSeconds : this.classicDurationSeconds;
        this.orders = this.prepareOrders(0);
        this.scoreManager.reset();
        this.courier = { position: { ...this.depot }, speed: 0, carriedOrderId: null };
        this.currentVelocity = { x: 0, y: 0 };
        this.courierDirection = "right";
        this.selectedOrderId = null;
        this.elapsedSeconds = 0;
        this.timeLeft = this.settings.durationSeconds;
        this.deliveredCount = 0;
        this.expiredCount = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.isFinished = false;
        this.isBoosting = false;
        this.collisionCooldownUntil = 0;
        this.flashStartedAt = 0;
        this.flashUntil = 0;
        this.flashText = "";
        this.redPenaltyTimes.clear();
        this.speedCameraPenaltyTimes.clear();
        this.trafficLights = this.createTrafficLights();
        this.trafficCars = this.createTrafficCars();
        this.pedestrians = this.createPedestrians();
        this.keys.up = false;
        this.keys.down = false;
        this.keys.left = false;
        this.keys.right = false;
        this.camera = { x: 0, y: 500 };
        this.updateCamera();
        this.message = this.currentMode === "arcade"
            ? "Аркада готова. Натисни «Старт», щоб отримати перше випадкове замовлення."
            : "Класичний режим готовий. Натисни «Старт».";
    }
    updateCamera() {
        this.camera = {
            x: this.clamp(this.courier.position.x - this.settings.mapWidth / 2, 0, this.worldWidth - this.settings.mapWidth),
            y: this.clamp(this.courier.position.y - this.settings.mapHeight / 2, 0, this.worldHeight - this.settings.mapHeight)
        };
    }
    canMoveTo(position) {
        if (position.x < 0 || position.x > this.worldWidth || position.y < 0 || position.y > this.worldHeight) {
            return false;
        }
        const halfWidth = 12;
        const halfHeight = 9;
        const points = [
            { x: position.x, y: position.y },
            { x: position.x - halfWidth, y: position.y - halfHeight },
            { x: position.x + halfWidth, y: position.y - halfHeight },
            { x: position.x - halfWidth, y: position.y + halfHeight },
            { x: position.x + halfWidth, y: position.y + halfHeight }
        ];
        return points.every((point) => this.isPointOnRoad(point));
    }
    isPointOnRoad(point) {
        return this.roads.some((road) => this.isPointInRectRoad(point, road));
    }
    isPointInRectRoad(point, road) {
        const x = road.x ?? 0;
        const y = road.y ?? 0;
        const width = road.width ?? 0;
        const height = road.height ?? 0;
        return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
    }
    getSelectedOrder() {
        if (!this.selectedOrderId) {
            return null;
        }
        return this.orders.find((order) => order.id === this.selectedOrderId) ?? null;
    }
    getCarriedOrder() {
        if (!this.courier.carriedOrderId) {
            return null;
        }
        return this.orders.find((order) => order.id === this.courier.carriedOrderId) ?? null;
    }
    prepareOrders(offsetSeconds) {
        return this.cloneOrders(this.initialOrders).map((order) => ({
            ...order,
            status: "waiting",
            pickedAtSeconds: null,
            deliveredAtSeconds: null,
            deadlineSeconds: order.deadlineSeconds + offsetSeconds
        }));
    }
    assignRandomArcadeOrder() {
        if (this.currentMode !== "arcade" || this.courier.carriedOrderId) {
            return null;
        }
        let waitingOrders = this.orders.filter((order) => order.status === "waiting");
        if (waitingOrders.length === 0) {
            this.orders = this.prepareOrders(Math.floor(this.elapsedSeconds));
            waitingOrders = this.orders.filter((order) => order.status === "waiting");
        }
        if (waitingOrders.length === 0) {
            this.selectedOrderId = null;
            return null;
        }
        const randomOrder = waitingOrders[Math.floor(Math.random() * waitingOrders.length)] ?? null;
        if (!randomOrder) {
            this.selectedOrderId = null;
            return null;
        }
        this.selectedOrderId = randomOrder.id;
        return randomOrder;
    }
    createSnapshot() {
        return {
            orders: this.cloneOrders(this.orders),
            courier: { position: { ...this.courier.position }, speed: this.courier.speed, carriedOrderId: this.courier.carriedOrderId },
            score: this.scoreManager.getScore(),
            timeLeft: Math.ceil(this.timeLeft),
            elapsedSeconds: Math.floor(this.elapsedSeconds),
            message: this.message,
            selectedOrderId: this.selectedOrderId,
            deliveredCount: this.deliveredCount,
            expiredCount: this.expiredCount,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            isFinished: this.isFinished,
            speedKmh: this.getCurrentSpeedKmh(),
            speedMode: this.isBoosting ? "boost" : "normal",
            currentMode: this.currentMode
        };
    }
    emitSnapshot() {
        const snapshot = this.createSnapshot();
        this.snapshotListeners.forEach((listener) => listener(snapshot));
    }
    cloneOrders(orders) {
        return orders.map((order) => ({
            ...order,
            pickup: { ...order.pickup },
            destination: { ...order.destination }
        }));
    }
    handleKeyDown(event) {
        if (this.isInputElement(event.target)) {
            return;
        }
        if (event.key === "Shift") {
            event.preventDefault();
            this.isBoosting = true;
            return;
        }
        const direction = this.keyToDirection(event.key, event.code);
        if (!direction) {
            return;
        }
        event.preventDefault();
        this.keys[direction] = true;
    }
    handleKeyUp(event) {
        if (this.isInputElement(event.target)) {
            return;
        }
        if (event.key === "Shift") {
            event.preventDefault();
            this.isBoosting = false;
            return;
        }
        const direction = this.keyToDirection(event.key, event.code);
        if (!direction) {
            return;
        }
        event.preventDefault();
        this.keys[direction] = false;
    }
    isInputElement(target) {
        return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
    }
    keyToDirection(key, code) {
        const lowered = key.toLowerCase();
        if (lowered === "w" || key === "ArrowUp" || code === "KeyW") {
            return "up";
        }
        if (lowered === "s" || key === "ArrowDown" || code === "KeyS") {
            return "down";
        }
        if (lowered === "a" || key === "ArrowLeft" || code === "KeyA") {
            return "left";
        }
        if (lowered === "d" || key === "ArrowRight" || code === "KeyD") {
            return "right";
        }
        return null;
    }
    draw() {
        this.updateCamera();
        this.ctx.clearRect(0, 0, this.settings.mapWidth, this.settings.mapHeight);
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        this.drawGround();
        this.drawRoads();
        this.drawCrosswalks();
        this.drawParks();
        this.drawBuildings();
        this.drawRouteHint();
        this.drawDepot();
        this.drawOrderMarkers();
        this.drawTrafficLights();
        this.drawSpeedCameras();
        this.drawTrafficCars();
        this.drawPedestrians();
        this.drawCourier();
        this.drawWorldFrame();
        this.ctx.restore();
        this.drawHudOverlay();
        this.drawCameraFlashOverlay();
    }
    drawGround() {
        const ctx = this.ctx;
        ctx.fillStyle = "#90bf68";
        ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
        ctx.fillStyle = "rgba(255, 255, 255, 0.13)";
        for (let x = 0; x < this.worldWidth; x += 32) {
            ctx.fillRect(x, 0, 1, this.worldHeight);
        }
        for (let y = 0; y < this.worldHeight; y += 32) {
            ctx.fillRect(0, y, this.worldWidth, 1);
        }
        for (let i = 0; i < 42; i += 1) {
            const x = 25 + (i * 137) % (this.worldWidth - 50);
            const y = 34 + (i * 211) % (this.worldHeight - 70);
            if (!this.isPointOnRoad({ x, y })) {
                this.drawTree(x, y);
            }
        }
    }
    drawParks() {
        const ctx = this.ctx;
        for (const park of this.parks) {
            ctx.fillStyle = "#76aa55";
            ctx.fillRect(park.x, park.y, park.width, park.height);
            ctx.strokeStyle = "#49763b";
            ctx.lineWidth = 3;
            ctx.strokeRect(park.x, park.y, park.width, park.height);
            ctx.fillStyle = "#2c6c37";
            ctx.font = "bold 18px Courier New";
            ctx.textAlign = "center";
            ctx.fillText(park.label, park.x + park.width / 2, park.y + 34);
            for (let i = 0; i < 18; i += 1) {
                const tx = park.x + 28 + (i % 6) * 40;
                const ty = park.y + 56 + Math.floor(i / 6) * 42;
                this.drawTree(tx, ty);
            }
        }
        ctx.textAlign = "left";
    }
    drawRoads() {
        for (const road of this.roads) {
            this.drawRectRoadBase(road);
        }
        for (const road of this.roads) {
            this.drawRectRoadMarkings(road);
        }
    }
    drawRectRoadBase(road) {
        const x = road.x ?? 0;
        const y = road.y ?? 0;
        const width = road.width ?? 0;
        const height = road.height ?? 0;
        const ctx = this.ctx;
        const horizontal = width >= height;
        const roadSize = horizontal ? height : width;
        const isMajor = roadSize >= 100;
        ctx.fillStyle = "#77736c";
        ctx.fillRect(x - 6, y - 6, width + 12, height + 12);
        ctx.fillStyle = isMajor ? "#343a41" : "#3c4146";
        ctx.fillRect(x, y, width, height);
    }
    drawRectRoadMarkings(road) {
        const x = road.x ?? 0;
        const y = road.y ?? 0;
        const width = road.width ?? 0;
        const height = road.height ?? 0;
        const ctx = this.ctx;
        const horizontal = width >= height;
        const roadSize = horizontal ? height : width;
        const isMajor = roadSize >= 100;
        ctx.save();
        ctx.lineCap = "butt";
        if (horizontal) {
            this.drawHorizontalRoadMarkings(x, y, width, height, isMajor);
        }
        else {
            this.drawVerticalRoadMarkings(x, y, width, height, isMajor);
        }
        ctx.restore();
    }
    drawHorizontalRoadMarkings(x, y, width, height, isMajor) {
        const ctx = this.ctx;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.33)";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 13);
        ctx.lineTo(x + width - 8, y + 13);
        ctx.moveTo(x + 8, y + height - 13);
        ctx.lineTo(x + width - 8, y + height - 13);
        ctx.stroke();
        if (isMajor) {
            const laneOne = y + height * 0.28;
            const laneTwo = y + height * 0.5;
            const laneThree = y + height * 0.72;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.38)";
            ctx.lineWidth = 2;
            ctx.setLineDash([24, 22]);
            ctx.beginPath();
            ctx.moveTo(x + 14, laneOne);
            ctx.lineTo(x + width - 14, laneOne);
            ctx.moveTo(x + 14, laneThree);
            ctx.lineTo(x + width - 14, laneThree);
            ctx.stroke();
            ctx.strokeStyle = "#f4d34e";
            ctx.lineWidth = 4;
            ctx.setLineDash([28, 20]);
            ctx.beginPath();
            ctx.moveTo(x + 14, laneTwo);
            ctx.lineTo(x + width - 14, laneTwo);
            ctx.stroke();
        }
        else {
            ctx.strokeStyle = "#f4d34e";
            ctx.lineWidth = 3;
            ctx.setLineDash([22, 18]);
            ctx.beginPath();
            ctx.moveTo(x + 14, y + height / 2);
            ctx.lineTo(x + width - 14, y + height / 2);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }
    drawVerticalRoadMarkings(x, y, width, height, isMajor) {
        const ctx = this.ctx;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.33)";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x + 13, y + 8);
        ctx.lineTo(x + 13, y + height - 8);
        ctx.moveTo(x + width - 13, y + 8);
        ctx.lineTo(x + width - 13, y + height - 8);
        ctx.stroke();
        if (isMajor) {
            const laneOne = x + width * 0.28;
            const laneTwo = x + width * 0.5;
            const laneThree = x + width * 0.72;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.38)";
            ctx.lineWidth = 2;
            ctx.setLineDash([24, 22]);
            ctx.beginPath();
            ctx.moveTo(laneOne, y + 14);
            ctx.lineTo(laneOne, y + height - 14);
            ctx.moveTo(laneThree, y + 14);
            ctx.lineTo(laneThree, y + height - 14);
            ctx.stroke();
            ctx.strokeStyle = "#f4d34e";
            ctx.lineWidth = 4;
            ctx.setLineDash([28, 20]);
            ctx.beginPath();
            ctx.moveTo(laneTwo, y + 14);
            ctx.lineTo(laneTwo, y + height - 14);
            ctx.stroke();
        }
        else {
            ctx.strokeStyle = "#f4d34e";
            ctx.lineWidth = 3;
            ctx.setLineDash([22, 18]);
            ctx.beginPath();
            ctx.moveTo(x + width / 2, y + 14);
            ctx.lineTo(x + width / 2, y + height - 14);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }
    drawCrosswalks() {
        const ctx = this.ctx;
        for (const crosswalk of this.crosswalks) {
            ctx.save();
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
            ctx.lineWidth = 1;
            if (crosswalk.orientation === "horizontal") {
                const stripeWidth = 8;
                for (let x = crosswalk.x; x < crosswalk.x + crosswalk.width; x += 14) {
                    ctx.fillRect(x, crosswalk.y, stripeWidth, crosswalk.height);
                    ctx.strokeRect(x, crosswalk.y, stripeWidth, crosswalk.height);
                }
            }
            else {
                const stripeHeight = 8;
                for (let y = crosswalk.y; y < crosswalk.y + crosswalk.height; y += 14) {
                    ctx.fillRect(crosswalk.x, y, crosswalk.width, stripeHeight);
                    ctx.strokeRect(crosswalk.x, y, crosswalk.width, stripeHeight);
                }
            }
            ctx.restore();
        }
    }
    drawBuildings() {
        const palette = ["#d97355", "#6aa8d6", "#ddbc4d", "#b989dd", "#65bd8d", "#e39bc1", "#99a8d6", "#e09f5a"];
        this.buildings.forEach((building, index) => {
            const color = palette[index % palette.length] ?? "#d97355";
            this.drawBuilding(building, color);
        });
    }
    drawBuilding(building, color) {
        const ctx = this.ctx;
        const depth = 16;
        ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
        ctx.fillRect(building.x + 8, building.y + 9, building.width, building.height);
        ctx.fillStyle = this.shade(color, 18);
        ctx.beginPath();
        ctx.moveTo(building.x, building.y);
        ctx.lineTo(building.x + depth, building.y - depth);
        ctx.lineTo(building.x + building.width + depth, building.y - depth);
        ctx.lineTo(building.x + building.width, building.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#111";
        ctx.stroke();
        ctx.fillStyle = this.shade(color, -28);
        ctx.beginPath();
        ctx.moveTo(building.x + building.width, building.y);
        ctx.lineTo(building.x + building.width + depth, building.y - depth);
        ctx.lineTo(building.x + building.width + depth, building.y + building.height - depth);
        ctx.lineTo(building.x + building.width, building.y + building.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillRect(building.x, building.y, building.width, building.height);
        ctx.strokeRect(building.x, building.y, building.width, building.height);
        ctx.fillStyle = "#eaf9ff";
        const columns = Math.max(2, Math.floor(building.width / 36));
        const rows = Math.max(1, Math.floor(building.height / 30));
        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                const wx = building.x + 13 + column * 31;
                const wy = building.y + 14 + row * 25;
                if (wx + 14 < building.x + building.width - 5 && wy + 10 < building.y + building.height - 17) {
                    ctx.fillRect(wx, wy, 14, 10);
                    ctx.strokeRect(wx, wy, 14, 10);
                }
            }
        }
        ctx.fillStyle = "#111";
        ctx.font = "bold 12px Courier New";
        ctx.textAlign = "center";
        ctx.fillText(building.label, building.x + building.width / 2, building.y + building.height - 9);
        ctx.textAlign = "left";
    }
    drawRouteHint() {
        const target = this.getActiveTarget();
        if (!target) {
            return;
        }
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 9]);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(this.courier.position.x, this.courier.position.y);
        ctx.lineTo(target.x, this.courier.position.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.restore();
    }
    drawDepot() {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = "#3f4448";
        ctx.fillRect(14, 996, 150, 244);
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 3;
        ctx.strokeRect(14, 996, 150, 244);
        ctx.fillStyle = "#4d5256";
        ctx.fillRect(30, 1016, 118, 122);
        ctx.strokeStyle = "#d9d9d9";
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 1016, 118, 122);
        ctx.strokeStyle = "#f2f2f2";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(52, 1024);
        ctx.lineTo(52, 1128);
        ctx.moveTo(84, 1024);
        ctx.lineTo(84, 1128);
        ctx.moveTo(116, 1024);
        ctx.lineTo(116, 1128);
        ctx.moveTo(38, 1068);
        ctx.lineTo(140, 1068);
        ctx.moveTo(38, 1104);
        ctx.lineTo(140, 1104);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
        ctx.fillRect(144, 1036, 20, 74);
        ctx.fillStyle = "#d9d9d9";
        ctx.fillRect(150, 1042, 8, 62);
        ctx.fillStyle = "#1f6fd0";
        ctx.fillRect(this.depotBuilding.x, this.depotBuilding.y, this.depotBuilding.width, this.depotBuilding.height);
        ctx.fillStyle = this.shade("#1f6fd0", 24);
        ctx.beginPath();
        ctx.moveTo(this.depotBuilding.x, this.depotBuilding.y);
        ctx.lineTo(this.depotBuilding.x + 16, this.depotBuilding.y - 14);
        ctx.lineTo(this.depotBuilding.x + this.depotBuilding.width + 16, this.depotBuilding.y - 14);
        ctx.lineTo(this.depotBuilding.x + this.depotBuilding.width, this.depotBuilding.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#111";
        ctx.stroke();
        ctx.fillStyle = "#f8e45c";
        ctx.fillRect(this.depotBuilding.x + 18, this.depotBuilding.y + 18, 42, 22);
        ctx.fillRect(this.depotBuilding.x + 74, this.depotBuilding.y + 18, 40, 22);
        ctx.fillStyle = "#d8d8d8";
        ctx.fillRect(this.depotBuilding.x + 102, this.depotBuilding.y + 42, 22, 18);
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 2;
        ctx.strokeRect(this.depotBuilding.x, this.depotBuilding.y, this.depotBuilding.width, this.depotBuilding.height);
        ctx.strokeRect(this.depotBuilding.x + 18, this.depotBuilding.y + 18, 42, 22);
        ctx.strokeRect(this.depotBuilding.x + 74, this.depotBuilding.y + 18, 40, 22);
        ctx.strokeRect(this.depotBuilding.x + 102, this.depotBuilding.y + 42, 22, 18);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 13px Courier New";
        ctx.textAlign = "center";
        ctx.fillText("СКЛАД 24", this.depotBuilding.x + this.depotBuilding.width / 2, this.depotBuilding.y + 58);
        ctx.fillStyle = "#ffdf4a";
        ctx.beginPath();
        ctx.arc(this.depot.x, this.depot.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#111";
        ctx.stroke();
        ctx.fillStyle = "#111";
        ctx.font = "bold 10px Courier New";
        ctx.fillText("PICK", this.depot.x, this.depot.y + 4);
        ctx.textAlign = "left";
        ctx.restore();
    }
    drawOrderMarkers() {
        const ctx = this.ctx;
        for (const order of this.orders) {
            if (order.status === "delivered" || order.status === "expired") {
                continue;
            }
            const isSelected = order.id === this.selectedOrderId;
            const destinationColor = order.priority === "high" ? "#ff3c3c" : order.priority === "medium" ? "#f6d447" : "#44d26c";
            ctx.fillStyle = destinationColor;
            ctx.strokeStyle = "#111";
            ctx.lineWidth = isSelected ? 4 : 2;
            ctx.beginPath();
            ctx.arc(order.destination.x, order.destination.y, isSelected ? 17 : 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "#111";
            ctx.font = "bold 10px Courier New";
            ctx.textAlign = "center";
            ctx.fillText(order.id.slice(-3), order.destination.x, order.destination.y + 4);
            if (isSelected) {
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(order.destination.x, order.destination.y, 24, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        ctx.textAlign = "left";
    }
    drawTrafficLights() {
        for (const light of this.trafficLights) {
            this.drawCenterTrafficSignal(light);
        }
    }
    drawCenterTrafficSignal(light) {
        const ctx = this.ctx;
        const isVerticalGreen = light.phase === "vertical" && !this.isYellowPhase(light);
        const isVerticalYellow = this.isYellowPhase(light);
        ctx.save();
        ctx.translate(light.x, light.y);
        ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
        ctx.fillRect(-12, -24, 28, 52);
        ctx.fillStyle = "#111";
        ctx.fillRect(-10, -28, 20, 42);
        ctx.strokeStyle = "#f0f0f0";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-10, -28, 20, 42);
        ctx.fillStyle = !isVerticalGreen && !isVerticalYellow ? "#ff3333" : "#4f1212";
        ctx.beginPath();
        ctx.arc(0, -20, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isVerticalYellow ? "#ffd84d" : "#4f4214";
        ctx.beginPath();
        ctx.arc(0, -8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isVerticalGreen ? "#32ff66" : "#133b1d";
        ctx.beginPath();
        ctx.arc(0, 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    drawSpeedCameras() {
        const ctx = this.ctx;
        for (const camera of this.speedCameras) {
            const signX = camera.x;
            const signY = camera.y;
            ctx.save();
            ctx.strokeStyle = "#111";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(signX, signY + 18);
            ctx.lineTo(signX, signY + 46);
            ctx.stroke();
            ctx.fillStyle = "#f6e04d";
            ctx.fillRect(signX - 24, signY - 22, 48, 38);
            ctx.strokeStyle = "#111";
            ctx.lineWidth = 2;
            ctx.strokeRect(signX - 24, signY - 22, 48, 38);
            ctx.fillStyle = "#111";
            ctx.font = "bold 10px Courier New";
            ctx.textAlign = "center";
            ctx.fillText("RADAR", signX, signY - 8);
            ctx.font = "bold 15px Courier New";
            ctx.fillText(String(camera.speedLimitKmh), signX, signY + 10);
            ctx.fillStyle = "#111";
            ctx.fillRect(signX + 22, signY - 14, 18, 16);
            ctx.fillStyle = "#bfe9ff";
            ctx.beginPath();
            ctx.arc(signX + 31, signY - 6, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.38)";
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            if (camera.axis === "horizontal") {
                ctx.moveTo(signX, signY + 18);
                ctx.lineTo(signX, signY + 78);
            }
            else {
                ctx.moveTo(signX + 24, signY);
                ctx.lineTo(signX + 84, signY);
            }
            ctx.stroke();
            ctx.restore();
        }
    }
    drawTrafficCars() {
        for (const car of this.trafficCars) {
            this.drawCar(car.position, car.direction, car.color, "");
        }
    }
    drawPedestrians() {
        for (const pedestrian of this.pedestrians) {
            this.drawPedestrian(pedestrian);
        }
    }
    drawPedestrian(pedestrian) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(pedestrian.position.x, pedestrian.position.y);
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(0, -8, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = pedestrian.direction === 1 ? "#1a5ed8" : "#d13b3b";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(0, 6);
        ctx.moveTo(0, -1);
        ctx.lineTo(-5, 3);
        ctx.moveTo(0, -1);
        ctx.lineTo(5, 3);
        ctx.moveTo(0, 6);
        ctx.lineTo(-4, 13);
        ctx.moveTo(0, 6);
        ctx.lineTo(4, 13);
        ctx.stroke();
        ctx.restore();
    }
    drawCourier() {
        this.drawCar(this.courier.position, this.courierDirection, "#ff3333", "CR");
    }
    drawCar(position, direction, color, label) {
        const ctx = this.ctx;
        const angle = direction === "right" ? 0 : direction === "left" ? Math.PI : direction === "up" ? -Math.PI / 2 : Math.PI / 2;
        ctx.save();
        ctx.translate(position.x, position.y);
        ctx.rotate(angle);
        ctx.fillStyle = "rgba(0, 0, 0, 0.30)";
        ctx.fillRect(-18, -8, 36, 18);
        ctx.fillStyle = color;
        ctx.fillRect(-20, -10, 40, 20);
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 2;
        ctx.strokeRect(-20, -10, 40, 20);
        ctx.fillStyle = "#bfe9ff";
        ctx.fillRect(-5, -8, 15, 16);
        ctx.fillStyle = this.shade(color, -25);
        ctx.fillRect(10, -7, 7, 14);
        ctx.fillStyle = "#111";
        ctx.fillRect(-16, -14, 8, 5);
        ctx.fillRect(-16, 9, 8, 5);
        ctx.fillRect(8, -14, 8, 5);
        ctx.fillRect(8, 9, 8, 5);
        ctx.fillStyle = "#fff";
        ctx.fillRect(18, -3, 3, 6);
        if (label) {
            ctx.fillStyle = "#fff";
            ctx.font = "bold 10px Courier New";
            ctx.textAlign = "center";
            ctx.fillText(label, -4, 4);
        }
        ctx.restore();
    }
    drawWorldFrame() {
        const ctx = this.ctx;
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 8;
        ctx.strokeRect(0, 0, this.worldWidth, this.worldHeight);
    }
    drawHudOverlay() {
        if (this.isFinished) {
            const ctx = this.ctx;
            ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
            ctx.fillRect(0, 0, this.settings.mapWidth, this.settings.mapHeight);
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.font = "bold 42px Courier New";
            ctx.fillText("SHIFT COMPLETE", this.settings.mapWidth / 2, this.settings.mapHeight / 2 - 20);
            ctx.font = "bold 22px Courier New";
            ctx.fillText(`${this.scoreManager.getScore()} POINTS`, this.settings.mapWidth / 2, this.settings.mapHeight / 2 + 22);
            ctx.textAlign = "left";
        }
    }
    drawCameraFlashOverlay() {
        if (this.flashUntil <= 0 || this.elapsedSeconds > this.flashUntil) {
            return;
        }
        const age = this.elapsedSeconds - this.flashStartedAt;
        const blinkIndex = Math.floor(age * 10);
        if (blinkIndex % 2 !== 0) {
            return;
        }
        const opacity = Math.max(0, 0.82 - age * 0.38);
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fillRect(0, 0, this.settings.mapWidth, this.settings.mapHeight);
        ctx.fillStyle = "#111";
        ctx.textAlign = "center";
        ctx.font = "bold 34px Courier New";
        ctx.fillText("RADAR PHOTO!", this.settings.mapWidth / 2, this.settings.mapHeight / 2 - 16);
        ctx.font = "bold 20px Courier New";
        ctx.fillText(this.flashText, this.settings.mapWidth / 2, this.settings.mapHeight / 2 + 20);
        ctx.restore();
    }
    getActiveTarget() {
        const carried = this.getCarriedOrder();
        if (carried) {
            return carried.destination;
        }
        const selected = this.getSelectedOrder();
        if (selected && selected.status === "waiting") {
            return selected.pickup;
        }
        return null;
    }
    createRoads() {
        return [
            { kind: "rect", x: 0, y: 132, width: 1800, height: 72, label: "Північна вулиця" },
            { kind: "rect", x: 0, y: 330, width: 1800, height: 116, label: "Центральний проспект" },
            { kind: "rect", x: 0, y: 600, width: 1800, height: 72, label: "Паркова вулиця" },
            { kind: "rect", x: 0, y: 870, width: 1800, height: 116, label: "Південний проспект" },
            { kind: "rect", x: 0, y: 1095, width: 1800, height: 72, label: "Складська вулиця" },
            { kind: "rect", x: 170, y: 0, width: 72, height: 1260, label: "Західний бульвар" },
            { kind: "rect", x: 445, y: 0, width: 72, height: 1260, label: "Вулиця Ринку" },
            { kind: "rect", x: 780, y: 0, width: 124, height: 1260, label: "Центральна магістраль" },
            { kind: "rect", x: 1110, y: 0, width: 72, height: 1260, label: "Проспект КНУ" },
            { kind: "rect", x: 1435, y: 0, width: 72, height: 1260, label: "Східна окружна" },
            { kind: "rect", x: 14, y: 996, width: 150, height: 244, label: "Службова парковка складу" },
            { kind: "rect", x: 144, y: 1036, width: 52, height: 74, label: "Службовий заїзд" }
        ];
    }
    createCrosswalks() {
        return [
            { id: "cw-1", x: 170, y: 252, width: 72, height: 24, orientation: "horizontal" },
            { id: "cw-2", x: 780, y: 742, width: 124, height: 24, orientation: "horizontal" },
            { id: "cw-3", x: 1435, y: 1042, width: 72, height: 24, orientation: "horizontal" },
            { id: "cw-4", x: 620, y: 330, width: 28, height: 116, orientation: "vertical" },
            { id: "cw-5", x: 1320, y: 870, width: 28, height: 116, orientation: "vertical" }
        ];
    }
    createBuildings() {
        return [
            { x: 35, y: 32, width: 105, height: 72, label: "Банк" },
            { x: 280, y: 30, width: 138, height: 74, label: "Школа" },
            { x: 560, y: 35, width: 160, height: 70, label: "Кав'ярня" },
            { x: 965, y: 30, width: 120, height: 78, label: "Офіс" },
            { x: 1225, y: 35, width: 165, height: 72, label: "Готель" },
            { x: 1550, y: 34, width: 180, height: 78, label: "Бізнес" },
            { x: 45, y: 240, width: 105, height: 70, label: "Аптека" },
            { x: 280, y: 235, width: 135, height: 76, label: "Кіно" },
            { x: 560, y: 232, width: 156, height: 80, label: "ТРЦ" },
            { x: 965, y: 235, width: 118, height: 74, label: "Пошта" },
            { x: 1225, y: 232, width: 165, height: 78, label: "Коледж" },
            { x: 1555, y: 235, width: 170, height: 74, label: "ЖК Схід" },
            { x: 52, y: 506, width: 118, height: 60, label: "Маркет" },
            { x: 278, y: 485, width: 140, height: 80, label: "Сервіс" },
            { x: 560, y: 485, width: 160, height: 80, label: "Ліцей" },
            { x: 965, y: 485, width: 120, height: 80, label: "АЗС" },
            { x: 1225, y: 485, width: 162, height: 82, label: "Спорт" },
            { x: 1555, y: 486, width: 174, height: 80, label: "Автоцентр" },
            { x: 36, y: 720, width: 112, height: 92, label: "ЖК Захід" },
            { x: 280, y: 720, width: 136, height: 90, label: "Клуб" },
            { x: 560, y: 725, width: 160, height: 86, label: "Супер" },
            { x: 965, y: 720, width: 120, height: 92, label: "Бібліот." },
            { x: 1225, y: 720, width: 162, height: 92, label: "Лікарня" },
            { x: 1555, y: 720, width: 174, height: 92, label: "Термінал" },
            { x: 280, y: 1020, width: 136, height: 58, label: "Гаражі" },
            { x: 560, y: 1020, width: 160, height: 58, label: "Склад B" },
            { x: 965, y: 1020, width: 120, height: 58, label: "СТО" },
            { x: 1225, y: 1020, width: 162, height: 58, label: "Ринок" },
            { x: 1555, y: 1020, width: 174, height: 58, label: "Меблі" }
        ];
    }
    createParks() {
        return [
            { x: 1222, y: 1182, width: 170, height: 58, label: "ПАРК" },
            { x: 560, y: 1182, width: 160, height: 58, label: "СКВЕР" }
        ];
    }
    createSpeedCameras() {
        return [
            { id: "radar-1", x: 675, y: 318, axis: "horizontal", speedLimitKmh: 70, detectionRadius: 78, label: "CAM-70-A" },
            { id: "radar-2", x: 1288, y: 462, axis: "horizontal", speedLimitKmh: 70, detectionRadius: 78, label: "CAM-70-B" },
            { id: "radar-3", x: 764, y: 780, axis: "vertical", speedLimitKmh: 70, detectionRadius: 78, label: "CAM-70-C" },
            { id: "radar-4", x: 1538, y: 858, axis: "horizontal", speedLimitKmh: 70, detectionRadius: 78, label: "CAM-70-D" }
        ];
    }
    createTrafficLights() {
        return [
            { id: "tl-1", x: 206, y: 168, phase: "horizontal", timeInPhase: 0, cycleSeconds: 4.6, yellowSeconds: 0.75 },
            { id: "tl-2", x: 481, y: 388, phase: "vertical", timeInPhase: 1.2, cycleSeconds: 4.8, yellowSeconds: 0.75 },
            { id: "tl-3", x: 842, y: 388, phase: "horizontal", timeInPhase: 2.1, cycleSeconds: 5.1, yellowSeconds: 0.75 },
            { id: "tl-4", x: 1146, y: 636, phase: "vertical", timeInPhase: 3.1, cycleSeconds: 4.9, yellowSeconds: 0.75 },
            { id: "tl-5", x: 1471, y: 388, phase: "horizontal", timeInPhase: 1.9, cycleSeconds: 5.2, yellowSeconds: 0.75 },
            { id: "tl-6", x: 206, y: 928, phase: "vertical", timeInPhase: 2.7, cycleSeconds: 5.0, yellowSeconds: 0.75 },
            { id: "tl-7", x: 842, y: 928, phase: "horizontal", timeInPhase: 1.1, cycleSeconds: 5.3, yellowSeconds: 0.75 },
            { id: "tl-8", x: 1471, y: 1128, phase: "vertical", timeInPhase: 1.6, cycleSeconds: 4.7, yellowSeconds: 0.75 }
        ];
    }
    createTrafficCars() {
        return [
            { id: "car-1", position: { x: 110, y: 185 }, direction: "right", speed: 90, color: "#2e8de6", route: [{ x: 1700, y: 185 }, { x: 110, y: 185 }], routeIndex: 0 },
            { id: "car-2", position: { x: 1680, y: 151 }, direction: "left", speed: 84, color: "#f0c744", route: [{ x: 110, y: 151 }, { x: 1680, y: 151 }], routeIndex: 0 },
            { id: "car-3", position: { x: 90, y: 401 }, direction: "right", speed: 96, color: "#ef7e38", route: [{ x: 1720, y: 401 }, { x: 90, y: 401 }], routeIndex: 0 },
            { id: "car-4", position: { x: 240, y: 430 }, direction: "right", speed: 88, color: "#5fd2ff", route: [{ x: 1720, y: 430 }, { x: 240, y: 430 }], routeIndex: 0 },
            { id: "car-5", position: { x: 1700, y: 346 }, direction: "left", speed: 94, color: "#fffbf0", route: [{ x: 100, y: 346 }, { x: 1700, y: 346 }], routeIndex: 0 },
            { id: "car-6", position: { x: 1560, y: 375 }, direction: "left", speed: 86, color: "#d963d4", route: [{ x: 100, y: 375 }, { x: 1560, y: 375 }], routeIndex: 0 },
            { id: "car-7", position: { x: 100, y: 653 }, direction: "right", speed: 82, color: "#b6ee45", route: [{ x: 1710, y: 653 }, { x: 100, y: 653 }], routeIndex: 0 },
            { id: "car-8", position: { x: 1690, y: 619 }, direction: "left", speed: 80, color: "#ffffff", route: [{ x: 100, y: 619 }, { x: 1690, y: 619 }], routeIndex: 0 },
            { id: "car-9", position: { x: 130, y: 941 }, direction: "right", speed: 92, color: "#23a65a", route: [{ x: 1720, y: 941 }, { x: 130, y: 941 }], routeIndex: 0 },
            { id: "car-10", position: { x: 300, y: 970 }, direction: "right", speed: 86, color: "#5c7cff", route: [{ x: 1720, y: 970 }, { x: 300, y: 970 }], routeIndex: 0 },
            { id: "car-11", position: { x: 1710, y: 886 }, direction: "left", speed: 90, color: "#f97ca0", route: [{ x: 120, y: 886 }, { x: 1710, y: 886 }], routeIndex: 0 },
            { id: "car-12", position: { x: 1500, y: 915 }, direction: "left", speed: 84, color: "#ffd45a", route: [{ x: 120, y: 915 }, { x: 1500, y: 915 }], routeIndex: 0 },
            { id: "car-13", position: { x: 223, y: 1200 }, direction: "up", speed: 76, color: "#67c0d7", route: [{ x: 223, y: 80 }, { x: 223, y: 1200 }], routeIndex: 0 },
            { id: "car-14", position: { x: 189, y: 80 }, direction: "down", speed: 72, color: "#e65aa0", route: [{ x: 189, y: 1200 }, { x: 189, y: 80 }], routeIndex: 0 },
            { id: "car-15", position: { x: 464, y: 60 }, direction: "down", speed: 74, color: "#fffbf0", route: [{ x: 464, y: 1200 }, { x: 464, y: 60 }], routeIndex: 0 },
            { id: "car-16", position: { x: 498, y: 1200 }, direction: "up", speed: 78, color: "#d6d6d6", route: [{ x: 498, y: 80 }, { x: 498, y: 1200 }], routeIndex: 0 },
            { id: "car-17", position: { x: 810, y: 80 }, direction: "down", speed: 84, color: "#8e5de6", route: [{ x: 810, y: 1180 }, { x: 810, y: 80 }], routeIndex: 0 },
            { id: "car-18", position: { x: 874, y: 1180 }, direction: "up", speed: 82, color: "#ffffff", route: [{ x: 874, y: 80 }, { x: 874, y: 1180 }], routeIndex: 0 },
            { id: "car-19", position: { x: 1129, y: 70 }, direction: "down", speed: 79, color: "#ff9a4f", route: [{ x: 1129, y: 1180 }, { x: 1129, y: 70 }], routeIndex: 0 },
            { id: "car-20", position: { x: 1163, y: 1180 }, direction: "up", speed: 77, color: "#c6ff7c", route: [{ x: 1163, y: 80 }, { x: 1163, y: 1180 }], routeIndex: 0 },
            { id: "car-21", position: { x: 1454, y: 70 }, direction: "down", speed: 81, color: "#9ed7ff", route: [{ x: 1454, y: 1180 }, { x: 1454, y: 70 }], routeIndex: 0 },
            { id: "car-22", position: { x: 1488, y: 1180 }, direction: "up", speed: 79, color: "#ffc6f2", route: [{ x: 1488, y: 80 }, { x: 1488, y: 1180 }], routeIndex: 0 }
        ];
    }
    createPedestrians() {
        return [
            { id: "ped-1", position: { x: 176, y: 264 }, start: { x: 176, y: 264 }, end: { x: 236, y: 264 }, speed: 22, direction: 1, pauseUntilSeconds: 2.5 },
            { id: "ped-2", position: { x: 786, y: 754 }, start: { x: 786, y: 754 }, end: { x: 898, y: 754 }, speed: 24, direction: 1, pauseUntilSeconds: 5.0 },
            { id: "ped-3", position: { x: 1499, y: 1054 }, start: { x: 1499, y: 1054 }, end: { x: 1443, y: 1054 }, speed: 21, direction: -1, pauseUntilSeconds: 7.5 },
            { id: "ped-4", position: { x: 634, y: 336 }, start: { x: 634, y: 336 }, end: { x: 634, y: 440 }, speed: 20, direction: 1, pauseUntilSeconds: 4.0 },
            { id: "ped-5", position: { x: 1334, y: 876 }, start: { x: 1334, y: 876 }, end: { x: 1334, y: 980 }, speed: 19, direction: 1, pauseUntilSeconds: 9.0 }
        ];
    }
    getCurrentSpeedKmh() {
        return Math.round(Math.hypot(this.currentVelocity.x, this.currentVelocity.y) * this.speedConfig.kmhMultiplier);
    }
    moveToward(current, target, maxDelta) {
        if (Math.abs(target - current) <= maxDelta) {
            return target;
        }
        return current + Math.sign(target - current) * maxDelta;
    }
    applyFriction(value, amount) {
        if (Math.abs(value) <= amount) {
            return 0;
        }
        return value - Math.sign(value) * amount;
    }
    vectorToDirection(vector) {
        if (Math.abs(vector.x) >= Math.abs(vector.y)) {
            return vector.x >= 0 ? "right" : "left";
        }
        return vector.y >= 0 ? "down" : "up";
    }
    directionSignX(direction) {
        if (direction === "right") {
            return 1;
        }
        if (direction === "left") {
            return -1;
        }
        return 0;
    }
    directionSignY(direction) {
        if (direction === "down") {
            return 1;
        }
        if (direction === "up") {
            return -1;
        }
        return 0;
    }
    distance(left, right) {
        return Math.hypot(left.x - right.x, left.y - right.y);
    }
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    shade(hex, amount) {
        const value = hex.replace("#", "");
        const red = this.clamp(parseInt(value.slice(0, 2), 16) + amount, 0, 255);
        const green = this.clamp(parseInt(value.slice(2, 4), 16) + amount, 0, 255);
        const blue = this.clamp(parseInt(value.slice(4, 6), 16) + amount, 0, 255);
        return `rgb(${red}, ${green}, ${blue})`;
    }
    drawTree(x, y) {
        const ctx = this.ctx;
        ctx.fillStyle = "#6b412a";
        ctx.fillRect(x - 2, y + 6, 4, 10);
        ctx.fillStyle = "#2b7a34";
        ctx.beginPath();
        ctx.arc(x, y + 4, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#17471f";
        ctx.stroke();
    }
}
