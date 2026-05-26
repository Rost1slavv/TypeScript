import { Router } from "./ui/Router.js";
import { getRequiredElement } from "./ui/dom.js";
import { HomePage } from "./ui/pages/HomePage.js";
import { GamePage } from "./ui/pages/GamePage.js";
import { RulesPage } from "./ui/pages/RulesPage.js";
import { LeaderboardPage } from "./ui/pages/LeaderboardPage.js";
import { ProfilePage } from "./ui/pages/ProfilePage.js";
import { RetroMusicPlayer } from "./services/RetroMusicPlayer.js";

const app = getRequiredElement<HTMLElement>("#app");
const nav = getRequiredElement<HTMLElement>(".main-nav");
const musicPlayer = new RetroMusicPlayer();
musicPlayer.mount(nav);

const router = new Router(app, {
  home: HomePage,
  game: GamePage,
  rules: RulesPage,
  leaderboard: LeaderboardPage,
  profile: ProfilePage
});

router.init();
