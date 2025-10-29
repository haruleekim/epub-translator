import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import type { UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import "vitest/config";

export default {
    plugins: [tsconfigPaths(), tailwindcss(), react()],
    build: {
        rollupOptions: {
            input: {
                viewer: fileURLToPath(new URL("./viewer.html", import.meta.url)),
            },
        },
    },
    test: {
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
        },
    },
} satisfies UserConfig;
