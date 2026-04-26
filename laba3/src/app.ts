interface Category {
  id: number;
  name: string;
  shortname: string;
  notes: string;
}

interface CatalogItem {
  id: number;
  name: string;
  shortname: string;
  description: string;
  price: number;
  image: string;
}

interface CategoryDetails extends Category {
  items: CatalogItem[];
}

const CATEGORIES_URL = "./data/categories.json";
const contentElement = document.querySelector<HTMLElement>("#content")!;
const catalogLink = document.querySelector<HTMLAnchorElement>("#catalog-link")!;

async function loadJson<TData>(url: string): Promise<TData> {
  const response: Response = await fetch(url, { cache: "no-cache" });

  if (!response.ok) {
    throw new Error(`Не вдалося завантажити ${url}`);
  }

  return (await response.json()) as TData;
}

function clearContent(): void {
  contentElement.replaceChildren();
}

function showLoading(): void {
  clearContent();

  const section: HTMLElement = document.createElement("section");
  section.className = "state-card loading";
  section.textContent = "Завантаження...";
  contentElement.append(section);
}

function showError(error: unknown): void {
  clearContent();

  const section: HTMLElement = document.createElement("section");
  section.className = "state-card";

  const title: HTMLHeadingElement = document.createElement("h1");
  title.textContent = "Помилка";

  const message: HTMLParagraphElement = document.createElement("p");
  message.className = "error";
  message.textContent = error instanceof Error ? error.message : "Невідома помилка";

  section.append(title, message);
  contentElement.append(section);
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 0
  }).format(price);
}

function createCategoryCard(category: Category): HTMLElement {
  const article: HTMLElement = document.createElement("article");
  article.className = "category-card";

  const title: HTMLHeadingElement = document.createElement("h3");
  title.textContent = category.name;

  const link: HTMLAnchorElement = document.createElement("a");
  link.href = `#category-${category.shortname}`;
  link.className = "button-link";
  link.textContent = "Переглянути";
  link.addEventListener("click", (event: MouseEvent): void => {
    event.preventDefault();
    void loadCategory(category.shortname);
  });

  article.append(title, link);
  return article;
}

function createSpecialCard(categories: Category[]): HTMLElement {
  const article: HTMLElement = document.createElement("article");
  article.className = "category-card special-card";

  const title: HTMLHeadingElement = document.createElement("h3");
  title.textContent = "Specials";

  const link: HTMLAnchorElement = document.createElement("a");
  link.href = "#specials";
  link.className = "button-link";
  link.textContent = "Переглянути";
  link.addEventListener("click", (event: MouseEvent): void => {
    event.preventDefault();
    const randomIndex: number = Math.floor(Math.random() * categories.length);
    const randomCategory: Category = categories[randomIndex]!;
    void loadCategory(randomCategory.shortname, true);
  });

  article.append(title, link);
  return article;
}

function renderCatalog(categories: Category[]): void {
  clearContent();

  const panel: HTMLElement = document.createElement("section");
  panel.className = "catalog-panel";

  const title: HTMLHeadingElement = document.createElement("h1");
  title.className = "section-title";
  title.textContent = "Каталог";

  const grid: HTMLDivElement = document.createElement("div");
  grid.className = "catalog-grid";

  categories.forEach((category: Category): void => {
    grid.append(createCategoryCard(category));
  });

  grid.append(createSpecialCard(categories));
  panel.append(title, grid);
  contentElement.append(panel);
  contentElement.focus();
}

function renderCategoryDetails(category: CategoryDetails, isSpecial: boolean): void {
  clearContent();

  const header: HTMLElement = document.createElement("section");
  header.className = "category-header";

  const title: HTMLHeadingElement = document.createElement("h1");
  title.textContent = isSpecial ? `Specials: ${category.name}` : category.name;

  const backLink: HTMLAnchorElement = document.createElement("a");
  backLink.href = "#catalog";
  backLink.className = "button-link";
  backLink.textContent = "Назад";
  backLink.addEventListener("click", (event: MouseEvent): void => {
    event.preventDefault();
    void loadCatalog();
  });

  header.append(title, backLink);

  const grid: HTMLDivElement = document.createElement("div");
  grid.className = "product-grid";

  category.items.forEach((item: CatalogItem): void => {
    const article: HTMLElement = document.createElement("article");
    article.className = "product-card";

    const image: HTMLImageElement = document.createElement("img");
    image.src = item.image;
    image.alt = item.name;
    image.width = 200;
    image.height = 200;
    image.loading = "lazy";

    const body: HTMLDivElement = document.createElement("div");
    body.className = "product-card-body";

    const itemTitle: HTMLHeadingElement = document.createElement("h3");
    itemTitle.textContent = item.name;

    const description: HTMLParagraphElement = document.createElement("p");
    description.textContent = item.description;

    const price: HTMLParagraphElement = document.createElement("p");
    price.className = "price";
    price.textContent = formatPrice(item.price);

    body.append(itemTitle, description, price);
    article.append(image, body);
    grid.append(article);
  });

  contentElement.append(header, grid);
  contentElement.focus();
}

async function loadCatalog(): Promise<void> {
  try {
    showLoading();
    const categories: Category[] = await loadJson<Category[]>(CATEGORIES_URL);
    renderCatalog(categories);
  } catch (error: unknown) {
    showError(error);
  }
}

async function loadCategory(shortname: string, isSpecial: boolean = false): Promise<void> {
  try {
    showLoading();
    const category: CategoryDetails = await loadJson<CategoryDetails>(`./data/${shortname}.json`);
    renderCategoryDetails(category, isSpecial);
  } catch (error: unknown) {
    showError(error);
  }
}

catalogLink.addEventListener("click", (event: MouseEvent): void => {
  event.preventDefault();
  void loadCatalog();
});

void loadCatalog();
