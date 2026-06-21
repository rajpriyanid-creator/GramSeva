/**
 * analytics.service.ts
 * In-memory analytics tracker with hourly/daily rolling windows.
 * Data resets on process restart — wire up Neo4j persistence for production.
 */

interface SessionRecord {
  session_id: string;
  language_code: string;
  state: string;
  started_at: number;
  completed: boolean;
  schemes_matched: number;
  scheme_ids: string[];
  questions_answered: number;
}

interface HourlyBucket {
  hour: string;           // "2024-06-18T14"
  queries: number;
  completions: number;
  matches: number;
}

interface DailyBucket {
  day: string;            // "2024-06-18"
  queries: number;
  completions: number;
  total_matches: number;
  unique_sessions: number;
}

export interface AnalyticsOverview {
  total_queries_alltime: number;
  total_completions_alltime: number;
  total_matches_alltime: number;
  queries_today: number;
  queries_this_week: number;
  avg_schemes_per_session: number;
  completion_rate: number;
  active_sessions_last_hour: number;
}

class AnalyticsService {
  private sessions = new Map<string, SessionRecord>();
  private hourlyBuckets = new Map<string, HourlyBucket>();
  private dailyBuckets = new Map<string, DailyBucket>();

  // Counters
  private languageCounts = new Map<string, number>();
  private stateCounts    = new Map<string, number>();
  private schemeMatchCounts = new Map<string, number>();
  private totalQueries   = 0;
  private totalCompletions = 0;
  private totalMatches   = 0;
  private startedAt      = Date.now();

  // ── helpers ──────────────────────────────────────────────────────────────

  private hourKey(ts = Date.now()): string {
    const d = new Date(ts);
    return `${d.toISOString().slice(0, 13)}`;
  }
  private dayKey(ts = Date.now()): string {
    return new Date(ts).toISOString().slice(0, 10);
  }
  private getOrCreateHour(ts = Date.now()): HourlyBucket {
    const k = this.hourKey(ts);
    if (!this.hourlyBuckets.has(k)) {
      this.hourlyBuckets.set(k, { hour: k, queries: 0, completions: 0, matches: 0 });
    }
    return this.hourlyBuckets.get(k)!;
  }
  private getOrCreateDay(ts = Date.now()): DailyBucket {
    const k = this.dayKey(ts);
    if (!this.dailyBuckets.has(k)) {
      this.dailyBuckets.set(k, { day: k, queries: 0, completions: 0, total_matches: 0, unique_sessions: 0 });
    }
    return this.dailyBuckets.get(k)!;
  }

  // ── public tracking API ───────────────────────────────────────────────────

  /** Call when a transcribe request starts (question being answered) */
  trackQuery(sessionId: string, languageCode: string): void {
    const now = Date.now();

    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        session_id: sessionId,
        language_code: languageCode,
        state: "UNKNOWN",
        started_at: now,
        completed: false,
        schemes_matched: 0,
        scheme_ids: [],
        questions_answered: 0,
      });
      this.totalQueries++;
      this.getOrCreateHour(now).queries++;
      const day = this.getOrCreateDay(now);
      day.queries++;
      day.unique_sessions++;
      this.languageCounts.set(languageCode, (this.languageCounts.get(languageCode) || 0) + 1);
    } else {
      const sess = this.sessions.get(sessionId)!;
      sess.questions_answered++;
    }
  }

  /** Call when find-schemes completes */
  trackMatch(sessionId: string, schemes: any[], state: string): void {
    const now = Date.now();
    const sess = this.sessions.get(sessionId);
    if (sess) {
      sess.completed      = true;
      sess.schemes_matched = schemes.length;
      sess.scheme_ids     = schemes.map((s) => s.id);
      sess.state          = state;
    }

    this.totalCompletions++;
    this.totalMatches += schemes.length;
    this.getOrCreateHour(now).completions++;
    this.getOrCreateHour(now).matches += schemes.length;
    const day = this.getOrCreateDay(now);
    day.completions++;
    day.total_matches += schemes.length;

    this.stateCounts.set(state, (this.stateCounts.get(state) || 0) + 1);
    for (const s of schemes) {
      this.schemeMatchCounts.set(s.id, (this.schemeMatchCounts.get(s.id) || 0) + 1);
    }
  }

  // ── public query API ──────────────────────────────────────────────────────

  getOverview(): AnalyticsOverview {
    const now       = Date.now();
    const todayKey  = this.dayKey(now);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const hourAgo   = now - 3600 * 1000;

    const queriesThisWeek = [...this.dailyBuckets.values()]
      .filter((b) => b.day >= weekStart.toISOString().slice(0, 10))
      .reduce((a, b) => a + b.queries, 0);

    const activeLastHour = [...this.sessions.values()]
      .filter((s) => s.started_at >= hourAgo).length;

    const todayBucket = this.dailyBuckets.get(todayKey);

    return {
      total_queries_alltime:     this.totalQueries,
      total_completions_alltime: this.totalCompletions,
      total_matches_alltime:     this.totalMatches,
      queries_today:             todayBucket?.queries || 0,
      queries_this_week:         queriesThisWeek,
      avg_schemes_per_session:
        this.totalCompletions > 0
          ? parseFloat((this.totalMatches / this.totalCompletions).toFixed(2))
          : 0,
      completion_rate:
        this.totalQueries > 0
          ? parseFloat(((this.totalCompletions / this.totalQueries) * 100).toFixed(1))
          : 0,
      active_sessions_last_hour: activeLastHour,
    };
  }

  /** Returns last N days of daily stats */
  getTimeline(days = 30): DailyBucket[] {
    const result: DailyBucket[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d   = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push(
        this.dailyBuckets.get(key) || {
          day: key,
          queries: 0,
          completions: 0,
          total_matches: 0,
          unique_sessions: 0,
        }
      );
    }
    return result;
  }

  /** Returns last 24h of hourly stats */
  getHourlyTimeline(): HourlyBucket[] {
    const result: HourlyBucket[] = [];
    for (let i = 23; i >= 0; i--) {
      const d = new Date(Date.now() - i * 3600 * 1000);
      const k = `${d.toISOString().slice(0, 13)}`;
      result.push(
        this.hourlyBuckets.get(k) || { hour: k, queries: 0, completions: 0, matches: 0 }
      );
    }
    return result;
  }

  getLanguageDistribution(): { language: string; count: number; pct: number }[] {
    const total = this.totalQueries || 1;
    return [...this.languageCounts.entries()]
      .map(([language, count]) => ({ language, count, pct: parseFloat(((count / total) * 100).toFixed(1)) }))
      .sort((a, b) => b.count - a.count);
  }

  getStateDistribution(): { state: string; count: number }[] {
    return [...this.stateCounts.entries()]
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);
  }

  getTopSchemes(limit = 10): { scheme_id: string; match_count: number }[] {
    return [...this.schemeMatchCounts.entries()]
      .map(([scheme_id, match_count]) => ({ scheme_id, match_count }))
      .sort((a, b) => b.match_count - a.match_count)
      .slice(0, limit);
  }

  getRecentSessions(limit = 20): SessionRecord[] {
    return [...this.sessions.values()]
      .sort((a, b) => b.started_at - a.started_at)
      .slice(0, limit);
  }

  getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }

  /** Seed with synthetic demo data so the dashboard looks populated on first deploy */
  seedDemoData(): void {
    const langs  = ["hi-IN","ta-IN","te-IN","kn-IN","mr-IN","bn-IN","gu-IN","ml-IN"];
    const states = ["TN","UP","MH","AP","TS","KA","KL","WB","RJ","GJ"];
    const now    = Date.now();

    // 30 days of synthetic history
    for (let d = 29; d >= 0; d--) {
      const ts      = now - d * 86400000;
      const bucket  = this.getOrCreateDay(ts);
      const queries = 20 + Math.floor(Math.random() * 60);
      bucket.queries       = queries;
      bucket.completions   = Math.floor(queries * (0.65 + Math.random() * 0.2));
      bucket.total_matches = bucket.completions * (2 + Math.floor(Math.random() * 4));
      bucket.unique_sessions = bucket.queries;
      this.totalQueries    += bucket.queries;
      this.totalCompletions += bucket.completions;
      this.totalMatches    += bucket.total_matches;
    }

    // Language distribution
    const langDist: Record<string,number> = {
      "hi-IN":450,"ta-IN":280,"te-IN":200,"kn-IN":140,
      "mr-IN":120,"bn-IN":90,"gu-IN":60,"ml-IN":45,"or-IN":30,"pa-IN":25,
    };
    for (const [l, c] of Object.entries(langDist)) {
      this.languageCounts.set(l, c);
    }

    // State distribution
    const stateDist: Record<string,number> = {
      TN:280,UP:260,MH:190,AP:160,TS:140,KA:120,KL:90,WB:80,RJ:70,GJ:60,
    };
    for (const [s, c] of Object.entries(stateDist)) {
      this.stateCounts.set(s, c);
    }

    // Scheme match counts
    const schemes = [
      "PM_KISAN","MGNREGA","PMJAY","PMSBY","PMJJBY",
      "PMKVY","PMUY","PMKMY","MUDRA_SHISHU","PMAY_G",
    ];
    const matchCounts = [380,290,250,210,180,160,140,120,95,80];
    schemes.forEach((id, i) => this.schemeMatchCounts.set(id, matchCounts[i]));
  }
}

export const analyticsService = new AnalyticsService();
analyticsService.seedDemoData();
