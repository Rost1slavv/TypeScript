import type { LeaderboardRecord, Order, OrderDto, OrderPriority } from "../types.js";

export class ApiService {
  async getOrders(): Promise<Order[]> {
    const orderDtos = await this.fetchJson<OrderDto[]>("./data/orders.json");
    return orderDtos.map((orderDto) => ({
      ...orderDto,
      priority: this.normalizePriority(orderDto.priority),
      status: "waiting",
      pickedAtSeconds: null,
      deliveredAtSeconds: null
    }));
  }

  async getLeaderboardSeed(): Promise<LeaderboardRecord[]> {
    return this.fetchJson<LeaderboardRecord[]>("./data/leaderboard.json");
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Не вдалося завантажити ${url}. HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private normalizePriority(priority: OrderPriority): OrderPriority {
    if (priority === "low" || priority === "medium" || priority === "high") {
      return priority;
    }
    return "low";
  }
}
