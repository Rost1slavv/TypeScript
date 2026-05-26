import type { Order, OrderPriority } from "../types.js";

export class ScoreManager {
  private currentScore = 0;

  reset(): void {
    this.currentScore = 0;
  }

  getScore(): number {
    return this.currentScore;
  }

  addDelivery(order: Order, secondsRemaining: number): number {
    const priorityMultiplier = this.getPriorityMultiplier(order.priority);
    const basePoints = Math.round(order.reward * priorityMultiplier);
    const speedBonus = Math.max(0, Math.round(secondsRemaining * 1.5));
    const weightBonus = Math.round(order.weightKg * 5);
    const total = basePoints + speedBonus + weightBonus;
    this.currentScore += total;
    return total;
  }

  applyLatePenalty(): number {
    return this.applyPenalty(25);
  }

  applyRedLightPenalty(): number {
    return this.applyPenalty(15);
  }

  applyCollisionPenalty(): number {
    return this.applyPenalty(10);
  }

  applySpeedCameraPenalty(): number {
    return this.applyPenalty(20);
  }

  applyPenalty(value: number): number {
    const before = this.currentScore;
    this.currentScore = Math.max(0, this.currentScore - value);
    return before - this.currentScore;
  }

  getPriorityMultiplier(priority: OrderPriority): number {
    const multipliers: Record<OrderPriority, number> = {
      low: 1,
      medium: 1.2,
      high: 1.45
    };
    return multipliers[priority];
  }
}
