const profileKey = "courier-rush.profile";
const leaderboardKey = "courier-rush.localLeaderboard";
const defaultProfile = {
    name: "Courier",
    gamesPlayed: 0,
    deliveries: 0,
    bestScore: 0,
    totalScore: 0
};
export class StorageService {
    getProfile() {
        const parsed = this.readJson(profileKey);
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
    saveProfile(profile) {
        localStorage.setItem(profileKey, JSON.stringify(profile));
    }
    updateName(name) {
        const profile = this.getProfile();
        profile.name = name.trim().length > 0 ? name.trim() : defaultProfile.name;
        this.saveProfile(profile);
        return profile;
    }
    saveGameResult(result, mode) {
        const profile = this.getProfile();
        profile.gamesPlayed += 1;
        profile.deliveries += result.delivered;
        profile.bestScore = Math.max(profile.bestScore, result.score);
        profile.totalScore += result.score;
        this.saveProfile(profile);
        const record = {
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
    getLocalLeaderboard() {
        const parsed = this.readJson(leaderboardKey);
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
    getMergedLeaderboard(seed, mode) {
        return [...seed, ...this.getLocalLeaderboard()]
            .filter((record) => record.mode === mode)
            .sort((left, right) => right.score - left.score)
            .slice(0, 50);
    }
    getAverageScore() {
        const profile = this.getProfile();
        if (profile.gamesPlayed === 0) {
            return 0;
        }
        return Math.round(profile.totalScore / profile.gamesPlayed);
    }
    clearProgress() {
        localStorage.removeItem(profileKey);
        localStorage.removeItem(leaderboardKey);
    }
    safeNumber(value) {
        return Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
    }
    readJson(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) {
                return null;
            }
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
}
