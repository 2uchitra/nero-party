import dotenv from "dotenv";
import path from "path";

// Try both the monorepo root and one level up, so this works regardless of cwd
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Use getters so values are read from process.env at call time, not module load time.
// Guards against any edge case where this module is evaluated before dotenv runs.
export const env = {
  get PORT() { return process.env.PORT || "3000"; },
  get SPOTIFY_CLIENT_ID() { return process.env.SPOTIFY_CLIENT_ID ?? ""; },
  get SPOTIFY_CLIENT_SECRET() { return process.env.SPOTIFY_CLIENT_SECRET ?? ""; },
};
