import { playwright } from "@vitest/browser-playwright";
import type { UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import "vitest/config";

export default {
    plugins: [tsconfigPaths()],
    test: {
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
        },
    },
} satisfies UserConfig;
