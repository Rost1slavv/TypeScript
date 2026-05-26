import { GameEngine } from "../../core/GameEngine.js";
import { ApiService } from "../../services/ApiService.js";
import { createElement } from "../dom.js";

export function HomePage(): { element: HTMLElement; destroy: () => void } {
  const apiService = new ApiService();
  const page = createElement("section", "page-grid home-page");
  let previewEngine: GameEngine | null = null;

  const launcher = createElement("div", "retro-window home-launcher");
  const launcherContent = createElement("div", "launcher-content");

  const title = createElement("h1", "hero-title launcher-title", "Courier Rush");
  const subtitle = createElement("span", "hero-subtitle", "90s Delivery Arcade");
  const description = createElement(
    "p",
    "hero-text launcher-description",
    "Ретро-гра про швидкі доставки містом. Обирай режим, забирай посилки зі складу, доставляй їх клієнтам, уникай аварій і набирай очки для рейтингу."
  );

  const launcherButtons = createElement("div", "launcher-buttons");
  const playButton = createElement("a", "retro-button primary-play-button", "Грати");
  playButton.setAttribute("href", "#/game");
  const rulesButton = createElement("a", "retro-button", "Правила");
  rulesButton.setAttribute("href", "#/rules");
  const leaderboardButton = createElement("a", "retro-button", "Рейтинг");
  leaderboardButton.setAttribute("href", "#/leaderboard");
  const profileButton = createElement("a", "retro-button", "Профіль");
  profileButton.setAttribute("href", "#/profile");
  launcherButtons.append(playButton, rulesButton, leaderboardButton, profileButton);

  launcherContent.append(title, subtitle, description, launcherButtons);

  const previewFrame = createElement("div", "home-preview-frame");
  const preview = createElement("div", "map-preview home-map-preview real-game-preview");
  const canvas = createElement("canvas", "home-city-canvas") as HTMLCanvasElement;
  canvas.setAttribute("aria-label", "Прев’ю реальної карти Courier Rush");
  const loading = createElement("div", "preview-loading", "Завантаження карти...");
  preview.append(canvas, loading);
  previewFrame.appendChild(preview);

  launcher.append(launcherContent, previewFrame);

  const modes = createElement("div", "mode-cards");
  const classicCard = createElement("article", "retro-card game-mode-card");
  classicCard.append(
    createElement("h2", "", "Класика"),
    createElement("p", "", "Самостійно обирай замовлення, плануй маршрут, забирай посилки зі складу та доставляй їх клієнтам."),
    createElement("span", "mode-tag", "4 хвилини")
  );

  const arcadeCard = createElement("article", "retro-card game-mode-card");
  arcadeCard.append(
    createElement("h2", "", "Аркада 90с"),
    createElement("p", "", "Отримуй випадкові замовлення автоматично та змагайся за максимальну кількість балів за півтори хвилини."),
    createElement("span", "mode-tag", "на очки")
  );

  modes.append(classicCard, arcadeCard);

  const features = createElement("div", "feature-grid home-feature-grid");
  const featureItems: Array<[string, string]> = [
    ["Доставки", "Забирай посилки зі складу та вези їх до клієнтів."],
    ["Дедлайни", "Слідкуй за часом і не прострочуй замовлення."],
    ["Трафік", "Об’їжджай машини та не створюй аварій."],
    ["Світлофори", "Дотримуйся сигналів і не отримуй штрафи."],
    ["Рейтинг", "Змагайся за кращий результат у двох режимах."]
  ];

  featureItems.forEach(([heading, text]) => {
    const card = createElement("article", "feature-card");
    card.append(createElement("strong", "", heading), document.createTextNode(text));
    features.appendChild(card);
  });

  page.append(launcher, modes, features);
  loadPreview();

  return {
    element: page,
    destroy: () => {
      previewEngine?.destroy();
      previewEngine = null;
    }
  };

  async function loadPreview(): Promise<void> {
    try {
      const orders = await apiService.getOrders();
      previewEngine = new GameEngine(canvas, orders, { interactive: false });
      previewEngine.start();
      loading.remove();
    } catch {
      loading.textContent = "Не вдалося завантажити карту.";
    }
  }
}

