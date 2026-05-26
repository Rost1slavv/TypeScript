export class ScoreManager {
    constructor() {
        this.currentScore = 0;
    }
    reset() {
        this.currentScore = 0;
    }
    getScore() {
        return this.currentScore;
    }
    addDelivery(order, secondsRemaining) {
        const priorityMultiplier = this.getPriorityMultiplier(order.priority);
        const basePoints = Math.round(order.reward * priorityMultiplier);
        const speedBonus = Math.max(0, Math.round(secondsRemaining * 1.5));
        const weightBonus = Math.round(order.weightKg * 5);
        const total = basePoints + speedBonus + weightBonus;
        this.currentScore += total;
        return total;
    }
    applyLatePenalty() {
        return this.applyPenalty(25);
    }
    applyRedLightPenalty() {
        return this.applyPenalty(15);
    }
    applyCollisionPenalty() {
        return this.applyPenalty(10);
    }
    applySpeedCameraPenalty() {
        return this.applyPenalty(20);
    }
    applyPenalty(value) {
        const before = this.currentScore;
        this.currentScore = Math.max(0, this.currentScore - value);
        return before - this.currentScore;
    }
    getPriorityMultiplier(priority) {
        const multipliers = {
            low: 1,
            medium: 1.2,
            high: 1.45
        };
        return multipliers[priority];
    }
}
