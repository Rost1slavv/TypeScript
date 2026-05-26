import { ApiService } from "../../services/ApiService.js";
import { StorageService } from "../../services/StorageService.js";
import { clearElement, createElement } from "../dom.js";
export function LeaderboardPage() {
    const apiService = new ApiService();
    const storageService = new StorageService();
    const page = createElement("section", "page-grid");
    let activeMode = "classic";
    let seedRecords = [];
    const header = createElement("div", "retro-window");
    header.append(createElement("h1", "hero-title", "Leaderboard"), createElement("span", "hero-subtitle", "РЕЙТИНГ ЗА РЕЖИМАМИ"));
    const modeTabs = createElement("div", "leaderboard-mode-tabs");
    const classicTab = createElement("button", "retro-button leaderboard-mode-button active-mode", "Класика");
    const arcadeTab = createElement("button", "retro-button leaderboard-mode-button", "Аркада 90с");
    [classicTab, arcadeTab].forEach((button) => button.setAttribute("type", "button"));
    modeTabs.append(classicTab, arcadeTab);
    const statsCard = createElement("div", "retro-window leaderboard-stats-card");
    const statsGrid = createElement("div", "leaderboard-stats-grid");
    const totalRecordsNode = createStatBox("Записів", "0");
    const bestScoreNode = createStatBox("Кращий бал", "0");
    const avgDeliveredNode = createStatBox("Сер. доставки", "0");
    statsGrid.append(totalRecordsNode.box, bestScoreNode.box, avgDeliveredNode.box);
    statsCard.appendChild(statsGrid);
    const tableCard = createElement("div", "retro-window");
    const tableWrap = createElement("div", "leaderboard-table-wrap");
    const table = createElement("table", "leaderboard-table");
    table.innerHTML = `
    <thead>
      <tr>
        <th>Місце</th>
        <th>Гравець</th>
        <th>Бали</th>
        <th>Доставки</th>
        <th>Дата</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
    tableWrap.appendChild(table);
    tableCard.appendChild(tableWrap);
    page.append(header, modeTabs, statsCard, tableCard);
    classicTab.addEventListener("click", () => setMode("classic"));
    arcadeTab.addEventListener("click", () => setMode("arcade"));
    renderLoading();
    loadLeaderboard();
    return page;
    function setMode(mode) {
        activeMode = mode;
        classicTab.classList.toggle("active-mode", mode === "classic");
        arcadeTab.classList.toggle("active-mode", mode === "arcade");
        renderRows(storageService.getMergedLeaderboard(seedRecords, activeMode));
    }
    function renderLoading() {
        const body = table.querySelector("tbody");
        if (!body) {
            return;
        }
        body.innerHTML = `<tr><td colspan="5">Завантаження рейтингу...</td></tr>`;
    }
    async function loadLeaderboard() {
        try {
            seedRecords = await apiService.getLeaderboardSeed();
            renderRows(storageService.getMergedLeaderboard(seedRecords, activeMode));
        }
        catch (error) {
            const body = table.querySelector("tbody");
            if (!body) {
                return;
            }
            const message = error instanceof Error ? error.message : "Невідома помилка.";
            body.innerHTML = `<tr><td colspan="5">${escapeHtml(message)}</td></tr>`;
        }
    }
    function renderRows(records) {
        updateStats(records);
        const body = table.querySelector("tbody");
        if (!body) {
            return;
        }
        clearElement(body);
        if (records.length === 0) {
            const row = createElement("tr");
            const cell = createElement("td", "", activeMode === "arcade"
                ? "У режимі аркади поки немає результатів. Зіграйте першу 90-секундну сесію."
                : "У класичному режимі поки немає результатів. Завершіть гру, щоб додати перший запис.");
            cell.colSpan = 5;
            row.appendChild(cell);
            body.appendChild(row);
            return;
        }
        records.forEach((record, index) => {
            const row = createElement("tr");
            row.append(createElement("td", "", String(index + 1)), createElement("td", "", record.playerName), createElement("td", "", String(record.score)), createElement("td", "", String(record.delivered)), createElement("td", "", record.date));
            body.appendChild(row);
        });
    }
    function updateStats(records) {
        totalRecordsNode.value.textContent = String(records.length);
        bestScoreNode.value.textContent = String(records[0]?.score ?? 0);
        const avg = records.length === 0 ? 0 : Math.round(records.reduce((sum, record) => sum + record.delivered, 0) / records.length);
        avgDeliveredNode.value.textContent = String(avg);
    }
}
function createStatBox(label, value) {
    const box = createElement("div", "stat-box");
    box.append(createElement("span", "stat-label", label), createElement("strong", "stat-value", value));
    const valueNode = box.querySelector("strong");
    return { box, value: valueNode };
}
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
