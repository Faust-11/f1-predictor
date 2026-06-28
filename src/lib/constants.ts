/** Active F1 season for MVP */
export const ACTIVE_SEASON_ID = 2026;

/** Minutes before session start when predictions lock */
export const PREDICTION_LOCK_MINUTES = 5;

/** httpOnly cookie name for anonymous user id */
export const USER_ID_COOKIE = "f1_predictor_user_id";

/** Cookie max age: 1 year in seconds */
export const USER_ID_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Cookie name for theme preference (light | dark), client-readable */
export const THEME_COOKIE = "f1_predictor_theme";

/** Number of position slots per prediction mode */
export const PODIUM_SLOTS = 3;
export const TOP10_SLOTS = 10;

/** Admin auth cookie (httpOnly) holding the configured admin password */
export const ADMIN_COOKIE = "f1_admin_auth";
