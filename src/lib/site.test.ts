import { afterEach, describe, expect, it, vi } from "vitest";
import { siteUrl } from "./site";

describe("siteUrl", () => {
  afterEach(() => vi.unstubAllEnvs());
  const env = (e: Record<string, string>) => {
    for (const k of ["NEXT_PUBLIC_SITE_URL", "VERCEL_ENV", "VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"]) vi.stubEnv(k, e[k] ?? "");
  };

  it("prefers NEXT_PUBLIC_SITE_URL and strips the trailing slash", () => {
    env({ NEXT_PUBLIC_SITE_URL: "https://crazyivanarmy.com/", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" });
    expect(siteUrl()).toBe("https://crazyivanarmy.com");
  });
  it("uses the preview's own URL on preview deployments", () => {
    env({ VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "cia-git-step-8.vercel.app", VERCEL_URL: "cia-abc123.vercel.app", VERCEL_PROJECT_PRODUCTION_URL: "crazyivanarmy.com" });
    expect(siteUrl()).toBe("https://cia-git-step-8.vercel.app");
  });
  it("falls back to the production domain on production", () => {
    env({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "crazyivanarmy.com" });
    expect(siteUrl()).toBe("https://crazyivanarmy.com");
  });
  it("defaults to localhost", () => {
    env({});
    expect(siteUrl()).toBe("http://localhost:3000");
  });
});
