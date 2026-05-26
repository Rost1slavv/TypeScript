export class ApiService {
    async getOrders() {
        const orderDtos = await this.fetchJson("./data/orders.json");
        return orderDtos.map((orderDto) => ({
            ...orderDto,
            priority: this.normalizePriority(orderDto.priority),
            status: "waiting",
            pickedAtSeconds: null,
            deliveredAtSeconds: null
        }));
    }
    async getLeaderboardSeed() {
        return this.fetchJson("./data/leaderboard.json");
    }
    async fetchJson(url) {
        const response = await fetch(url, {
            headers: { Accept: "application/json" },
            cache: "no-store"
        });
        if (!response.ok) {
            throw new Error(`Не вдалося завантажити ${url}. HTTP ${response.status}`);
        }
        return response.json();
    }
    normalizePriority(priority) {
        if (priority === "low" || priority === "medium" || priority === "high") {
            return priority;
        }
        return "low";
    }
}
