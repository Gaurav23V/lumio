import { defineConfig } from "vitest/config";
export default defineConfig({
    test: {
        include: ["src/**/*.test.ts", "src/**/*.integration.test.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            reportsDirectory: "coverage"
        },
        projects: [
            {
                extends: true,
                test: {
                    name: "unit",
                    include: ["src/**/*.test.ts"],
                    exclude: ["src/**/*.integration.test.ts"]
                }
            },
            {
                extends: true,
                test: {
                    name: "integration",
                    include: ["src/**/*.integration.test.ts"]
                }
            }
        ]
    }
});
//# sourceMappingURL=vitest.config.js.map