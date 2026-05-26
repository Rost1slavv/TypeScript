export function getRequiredElement<T extends HTMLElement>(selector: string, root: Document | HTMLElement = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Елемент ${selector} не знайдено.`);
  }
  return element;
}

export function clearElement(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  textContent?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (textContent !== undefined) {
    element.textContent = textContent;
  }
  return element;
}

export function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function priorityLabel(priority: string): string {
  if (priority === "high") {
    return "високий";
  }
  if (priority === "medium") {
    return "середній";
  }
  return "низький";
}

export function statusLabel(status: string): string {
  if (status === "waiting") {
    return "очікує";
  }
  if (status === "picked") {
    return "в дорозі";
  }
  if (status === "delivered") {
    return "доставлено";
  }
  return "прострочено";
}
