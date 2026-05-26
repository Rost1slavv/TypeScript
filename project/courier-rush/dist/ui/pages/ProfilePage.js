import { StorageService } from "../../services/StorageService.js";
import { createElement } from "../dom.js";
export function ProfilePage() {
    const storageService = new StorageService();
    const page = createElement("section", "page-grid");
    const header = createElement("div", "retro-window");
    header.append(createElement("h1", "hero-title", "Profile"), createElement("span", "hero-subtitle", "LOCAL PLAYER CARD"), createElement("p", "hero-text", "Профіль гравця зберігається у localStorage. Тут можна змінити ім’я, переглянути кількість зіграних змін, успішні доставки, найкращий результат і середній рахунок."));
    const grid = createElement("div", "profile-grid");
    const editCard = createElement("div", "profile-card");
    editCard.appendChild(createElement("h2", "", "Ім’я гравця"));
    const formRow = createElement("div", "form-row");
    const input = createElement("input", "profile-input");
    input.type = "text";
    input.maxLength = 32;
    input.placeholder = "Введи ім'я";
    const saveButton = createElement("button", "retro-button", "Зберегти");
    saveButton.type = "button";
    formRow.append(input, saveButton);
    const saveNote = createElement("div", "note-strip", "Ім’я буде використане у локальному рейтингу після завершення гри.");
    const clearButton = createElement("button", "retro-button danger-button", "Очистити прогрес");
    clearButton.type = "button";
    editCard.append(formRow, saveNote, createElement("div", "pixel-divider"), clearButton);
    const statsCard = createElement("div", "profile-card");
    statsCard.appendChild(createElement("h2", "", "Статистика"));
    const stats = createElement("div", "profile-stats");
    const nameNode = createStat(stats, "Гравець", "Courier");
    const gamesNode = createStat(stats, "Зіграно ігор", "0");
    const deliveriesNode = createStat(stats, "Успішні доставки", "0");
    const bestNode = createStat(stats, "Найкращий результат", "0");
    const averageNode = createStat(stats, "Середній результат", "0");
    statsCard.appendChild(stats);
    grid.append(editCard, statsCard);
    page.append(header, grid);
    renderProfile();
    saveButton.addEventListener("click", () => {
        storageService.updateName(input.value);
        saveNote.textContent = "Ім’я збережено у localStorage.";
        renderProfile();
    });
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            storageService.updateName(input.value);
            saveNote.textContent = "Ім’я збережено у localStorage.";
            renderProfile();
        }
    });
    clearButton.addEventListener("click", () => {
        const confirmed = window.confirm("Очистити профіль і локальний рейтинг Courier Rush?");
        if (!confirmed) {
            return;
        }
        storageService.clearProgress();
        saveNote.textContent = "Прогрес очищено. Створено стандартний профіль Courier.";
        renderProfile();
    });
    return page;
    function renderProfile() {
        const profile = storageService.getProfile();
        input.value = profile.name;
        nameNode.textContent = profile.name;
        gamesNode.textContent = String(profile.gamesPlayed);
        deliveriesNode.textContent = String(profile.deliveries);
        bestNode.textContent = String(profile.bestScore);
        averageNode.textContent = String(storageService.getAverageScore());
    }
}
function createStat(container, label, value) {
    const box = createElement("div", "stat-box");
    const labelElement = createElement("span", "stat-label", label);
    const valueElement = createElement("span", "stat-value", value);
    box.append(labelElement, valueElement);
    container.appendChild(box);
    return valueElement;
}
