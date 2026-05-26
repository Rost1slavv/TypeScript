import type { RouteName } from "../types.js";
import { clearElement } from "./dom.js";

type PageResult = HTMLElement | { element: HTMLElement; destroy: () => void };
type PageFactory = () => PageResult;

export class Router {
  private readonly outlet: HTMLElement;
  private readonly routes: Record<RouteName, PageFactory>;
  private currentDestroy: (() => void) | null = null;

  constructor(outlet: HTMLElement, routes: Record<RouteName, PageFactory>) {
    this.outlet = outlet;
    this.routes = routes;
  }

  init(): void {
    window.addEventListener("hashchange", () => this.render());
    if (!window.location.hash) {
      window.location.hash = "#/home";
      return;
    }
    this.render();
  }

  navigate(route: RouteName): void {
    window.location.hash = `#/${route}`;
  }

  private render(): void {
    if (this.currentDestroy) {
      this.currentDestroy();
      this.currentDestroy = null;
    }

    const route = this.getCurrentRoute();
    const pageResult = this.routes[route]();
    const element = pageResult instanceof HTMLElement ? pageResult : pageResult.element;
    this.currentDestroy = pageResult instanceof HTMLElement ? null : pageResult.destroy;
    clearElement(this.outlet);
    this.outlet.appendChild(element);
    this.markActiveNavigation(route);
  }

  private getCurrentRoute(): RouteName {
    const rawRoute = window.location.hash.replace("#/", "") as RouteName;
    if (rawRoute === "home" || rawRoute === "rules" || rawRoute === "game" || rawRoute === "leaderboard" || rawRoute === "profile") {
      return rawRoute;
    }
    return "home";
  }

  private markActiveNavigation(route: RouteName): void {
    document.querySelectorAll<HTMLAnchorElement>(".main-nav a[data-route]").forEach((link) => {
      link.classList.toggle("active", link.dataset.route === route);
    });
  }
}
