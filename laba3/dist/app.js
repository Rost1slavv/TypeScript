"use strict";
const CATEGORIES_URL = "./data/categories.json";
const contentElement = document.querySelector("#content");
const catalogLink = document.querySelector("#catalog-link");
async function loadJson(url) {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
        throw new Error(`Не вдалося завантажити ${url}`);
    }
    return (await response.json());
}
function clearContent() {
    contentElement.replaceChildren();
}
function showLoading() {
    clearContent();
    const section = document.createElement("section");
    section.className = "state-card loading";
    section.textContent = "Завантаження...";
    contentElement.append(section);
}
function showError(error) {
    clearContent();
    const section = document.createElement("section");
    section.className = "state-card";
    const title = document.createElement("h1");
    title.textContent = "Помилка";
    const message = document.createElement("p");
    message.className = "error";
    message.textContent = error instanceof Error ? error.message : "Невідома помилка";
    section.append(title, message);
    contentElement.append(section);
}
function formatPrice(price) {
    return new Intl.NumberFormat("uk-UA", {
        style: "currency",
        currency: "UAH",
        maximumFractionDigits: 0
    }).format(price);
}
function createCategoryCard(category) {
    const article = document.createElement("article");
    article.className = "category-card";
    const title = document.createElement("h3");
    title.textContent = category.name;
    const notes = document.createElement("p");
    notes.textContent = category.notes;
    const link = document.createElement("a");
    link.href = `#category-${category.shortname}`;
    link.className = "button-link";
    link.textContent = "Переглянути";
    link.addEventListener("click", (event) => {
        event.preventDefault();
        void loadCategory(category.shortname);
    });
    article.append(title, notes, link);
    return article;
}
function createSpecialCard(categories) {
    const article = document.createElement("article");
    article.className = "category-card special-card";
    const title = document.createElement("h3");
    title.textContent = "Specials";
    const notes = document.createElement("p");
    notes.textContent = "Випадкова автомобільна категорія каталогу.";
    const link = document.createElement("a");
    link.href = "#specials";
    link.className = "button-link";
    link.textContent = "Переглянути";
    link.addEventListener("click", (event) => {
        event.preventDefault();
        const randomIndex = Math.floor(Math.random() * categories.length);
        const randomCategory = categories[randomIndex];
        void loadCategory(randomCategory.shortname, true);
    });
    article.append(title, notes, link);
    return article;
}
function renderCatalog(categories) {
    clearContent();
    const panel = document.createElement("section");
    panel.className = "catalog-panel";
    const title = document.createElement("h1");
    title.className = "section-title";
    title.textContent = "Автомобільний каталог";
    const grid = document.createElement("div");
    grid.className = "catalog-grid";
    categories.forEach((category) => {
        grid.append(createCategoryCard(category));
    });
    grid.append(createSpecialCard(categories));
    panel.append(title, grid);
    contentElement.append(panel);
    contentElement.focus();
}
function renderCategoryDetails(category, isSpecial) {
    clearContent();
    const header = document.createElement("section");
    header.className = "category-header";
    const title = document.createElement("h1");
    title.textContent = isSpecial ? `Specials: ${category.name}` : category.name;
    const backLink = document.createElement("a");
    backLink.href = "#catalog";
    backLink.className = "button-link";
    backLink.textContent = "Назад";
    backLink.addEventListener("click", (event) => {
        event.preventDefault();
        void loadCatalog();
    });
    header.append(title, backLink);
    const grid = document.createElement("div");
    grid.className = "product-grid";
    category.items.forEach((item) => {
        const article = document.createElement("article");
        article.className = "product-card";
        const image = document.createElement("img");
        image.src = item.image;
        image.alt = item.name;
        image.width = 200;
        image.height = 200;
        image.loading = "lazy";
        const body = document.createElement("div");
        body.className = "product-card-body";
        const itemTitle = document.createElement("h3");
        itemTitle.textContent = item.name;
        const description = document.createElement("p");
        description.textContent = item.description;
        const price = document.createElement("p");
        price.className = "price";
        price.textContent = formatPrice(item.price);
        body.append(itemTitle, description, price);
        article.append(image, body);
        grid.append(article);
    });
    contentElement.append(header, grid);
    contentElement.focus();
}
async function loadCatalog() {
    try {
        showLoading();
        const categories = await loadJson(CATEGORIES_URL);
        renderCatalog(categories);
    }
    catch (error) {
        showError(error);
    }
}
async function loadCategory(shortname, isSpecial = false) {
    try {
        showLoading();
        const category = await loadJson(`./data/${shortname}.json`);
        renderCategoryDetails(category, isSpecial);
    }
    catch (error) {
        showError(error);
    }
}
catalogLink.addEventListener("click", (event) => {
    event.preventDefault();
    void loadCatalog();
});
void loadCatalog();
