import type { GameMode, LeaderboardRecord, PlayerProfile, ResultSummary } from "../types.js";

const profileKey = "courier-rush.profile";
const leaderboardKey = "courier-rush.localLeaderboard";

const defaultProfile: PlayerProfile = {
  name: "Courier",
  gamesPlayed: 0,
  deliveries: 0,
  bestScore: 0,
  totalScore: 0
};

export class StorageService {
  getProfile(): PlayerProfile {
    const parsed = this.readJson<PlayerProfile>(profileKey);
    if (!parsed) {
      return { ...defaultProfile };
    }
    return {
      name: typeof parsed.name === "string" && parsed.name.trim().length > 0 ? parsed.name : defaultProfile.name,
      gamesPlayed: this.safeNumber(parsed.gamesPlayed),
      deliveries: this.safeNumber(parsed.deliveries),
      bestScore: this.safeNumber(parsed.bestScore),
      totalScore: this.safeNumber(parsed.totalScore)
    };
  }

  saveProfile(profile: PlayerProfile): void {
    localStorage.setItem(profileKey, JSON.stringify(profile));
  }

  updateName(name: string): PlayerProfile {
    const profile = this.getProfile();
    profile.name = name.trim().length > 0 ? name.trim() : defaultProfile.name;
    this.saveProfile(profile);
    return profile;
  }

  saveGameResult(result: ResultSummary, mode: GameMode): LeaderboardRecord {
    const profile = this.getProfile();
    profile.gamesPlayed += 1;
    profile.deliveries += result.delivered;
    profile.bestScore = Math.max(profile.bestScore, result.score);
    profile.totalScore += result.score;
    this.saveProfile(profile);

    const record: LeaderboardRecord = {
      id: `local-${Date.now()}-${Math.round(Math.random() * 100000)}`,
      playerName: profile.name,
      score: result.score,
      delivered: result.delivered,
      date: new Date().toISOString().slice(0, 10),
      mode
    };
    const leaderboard = this.getLocalLeaderboard();
    leaderboard.push(record);
    const sorted = leaderboard.sort((left, right) => right.score - left.score).slice(0, 25);
    localStorage.setItem(leaderboardKey, JSON.stringify(sorted));
    return record;
  }

  getLocalLeaderboard(): LeaderboardRecord[] {
    const parsed = this.readJson<LeaderboardRecord[]>(leaderboardKey);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((record) => typeof record.id === "string" && typeof record.playerName === "string")
      .map((record) => ({
        id: record.id,
        playerName: record.playerName,
        score: this.safeNumber(record.score),
        delivered: this.safeNumber(record.delivered),
        date: typeof record.date === "string" ? record.date : new Date().toISOString().slice(0, 10),
        mode: record.mode === "arcade" ? "arcade" : "classic"
      }));
  }

  getMergedLeaderboard(seed: LeaderboardRecord[], mode: GameMode): LeaderboardRecord[] {
    return [...seed, ...this.getLocalLeaderboard()]
      .filter((record) => record.mode === mode)
      .sort((left, right) => right.score - left.score)
      .slice(0, 50);
  }

  getAverageScore(): number {
    const profile = this.getProfile();
    if (profile.gamesPlayed === 0) {
      return 0;
    }
    return Math.round(profile.totalScore / profile.gamesPlayed);
  }

  clearProgress(): void {
    localStorage.removeItem(profileKey);
    localStorage.removeItem(leaderboardKey);
  }

  private safeNumber(value: number): number {
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
  }

  private readJson<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}
