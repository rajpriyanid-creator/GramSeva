import { Request, Response, NextFunction } from "express";
import { analyticsService } from "../services/analytics.service";

/**
 * Wraps eligibility routes to capture session analytics without
 * touching the route handlers themselves.
 */
export function trackTranscribe(req: Request, res: Response, next: NextFunction): void {
  const { session_id, language_code } = req.body || {};
  if (session_id && language_code) {
    analyticsService.trackQuery(session_id, language_code);
  }
  next();
}

export function trackFindSchemes(req: Request, res: Response, next: NextFunction): void {
  const origJson = res.json.bind(res);

  // Intercept the response to capture scheme match data
  (res as any).json = function (data: any) {
    const { session_id, state } = req.body || {};
    if (session_id && data?.schemes) {
      analyticsService.trackMatch(session_id, data.schemes, state || "UNKNOWN");
    }
    return origJson(data);
  };

  next();
}

/** Records latency for any route */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    if (ms > 2000) {
      console.warn(`[SLOW] ${req.method} ${req.path} — ${ms}ms`);
    }
  });
  next();
}
