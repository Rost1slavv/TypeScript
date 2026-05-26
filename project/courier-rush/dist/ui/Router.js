import { clearElement } from "./dom.js";
export class Router {
    constructor(outlet, routes) {
        this.currentDestroy = null;
        this.outlet = outlet;
        this.routes = routes;
    }
    init() {
        window.addEventListener("hashchange", () => this.render());
        if (!window.location.hash) {
            window.location.hash = "#/home";
            return;
        }
        this.render();
    }
    navigate(route) {
        window.location.hash = `#/${route}`;
    }
    render() {
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
    getCurrentRoute() {
        const rawRoute = window.location.hash.replace("#/", "");
        if (rawRoute === "home" || rawRoute === "rules" || rawRoute === "game" || rawRoute === "leaderboard" || rawRoute === "profile") {
            return rawRoute;
        }
        return "home";
    }
    markActiveNavigation(route) {
        document.querySelectorAll(".main-nav a[data-route]").forEach((link) => {
            link.classList.toggle("active", link.dataset.route === route);
        });
    }
}
