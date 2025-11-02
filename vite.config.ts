import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import Icons from "unplugin-icons/vite";
import type { UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import "vitest/config";

export default {
    plugins: [
        tsconfigPaths(),
        tailwindcss(),
        svelte(),
        Icons({
            compiler: "svelte",
        }),
    ],
    test: {
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
        },
    },
} satisfies UserConfig;
