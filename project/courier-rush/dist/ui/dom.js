export function getRequiredElement(selector, root = document) {
    const element = root.querySelector(selector);
    if (!element) {
        throw new Error(`Елемент ${selector} не знайдено.`);
    }
    return element;
}
export function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}
export function createElement(tagName, className, textContent) {
    const element = document.createElement(tagName);
    if (className) {
        element.className = className;
    }
    if (textContent !== undefined) {
        element.textContent = textContent;
    }
    return element;
}
export function formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
    const seconds = (safeSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
}
export function priorityLabel(priority) {
    if (priority === "high") {
        return "високий";
    }
    if (priority === "medium") {
        return "середній";
    }
    return "низький";
}
export function statusLabel(status) {
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
