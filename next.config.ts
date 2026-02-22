import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SENTRY_DSN: process.env.SENTRY_DSN,
  },
};

const sentryBuildOptions = {
  project: "rakuraku-keiyaku-kun",
  tunnelRoute: "/monitoring",
  disableLogger: true,
  ...(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG
    ? {
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
      }
    : {}),
};

export default withSentryConfig(nextConfig, sentryBuildOptions);
