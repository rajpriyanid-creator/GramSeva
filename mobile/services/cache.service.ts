import * as SQLite from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DB_NAME = "gramseva.db";

let db: SQLite.SQLiteDatabase | null = null;

async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS schemes (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        cached_at INTEGER NOT NULL
      );
    `);
  }
  return db;
}

export const CacheService = {
  /**
   * Cache all schemes in SQLite for offline browsing.
   */
  async cacheSchemes(schemes: any[]): Promise<void> {
    const database = await getDB();
    const now = Date.now();
    await database.withTransactionAsync(async () => {
      for (const scheme of schemes) {
        await database.runAsync(
          `INSERT OR REPLACE INTO schemes (id, data, cached_at) VALUES (?, ?, ?)`,
          [scheme.id, JSON.stringify(scheme), now]
        );
      }
    });
  },

  /**
   * Load cached schemes from SQLite.
   */
  async getCachedSchemes(): Promise<any[]> {
    try {
      const database = await getDB();
      const rows = await database.getAllAsync<{
        id: string;
        data: string;
        cached_at: number;
      }>("SELECT * FROM schemes ORDER BY id");
      return rows.map((r) => JSON.parse(r.data));
    } catch {
      return [];
    }
  },

  /**
   * Save user language preference.
   */
  async saveLanguage(langCode: string): Promise<void> {
    await AsyncStorage.setItem("@gramseva_lang", langCode);
  },

  /**
   * Get saved language preference.
   */
  async getSavedLanguage(): Promise<string | null> {
    return AsyncStorage.getItem("@gramseva_lang");
  },

  /**
   * Check if cache is fresh (less than 24 hours old).
   */
  async isCacheFresh(): Promise<boolean> {
    try {
      const database = await getDB();
      const row = await database.getFirstAsync<{ cached_at: number }>(
        "SELECT cached_at FROM schemes LIMIT 1"
      );
      if (!row) return false;
      const age = Date.now() - row.cached_at;
      return age < 24 * 60 * 60 * 1000; // 24 hours
    } catch {
      return false;
    }
  },

  /**
   * Clear all cached data.
   */
  async clearCache(): Promise<void> {
    const database = await getDB();
    await database.runAsync("DELETE FROM schemes");
    await AsyncStorage.removeItem("@gramseva_lang");
  },
};
