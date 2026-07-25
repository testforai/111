import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const placeholder = "00000000-0000-4000-8000-000000000000";
export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  const { cloudflare } = await import("@cloudflare/vite-plugin");
  return {
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: {
          main: "./worker/index.ts",
          compatibility_flags: ["nodejs_compat"],
          d1_databases: hostingConfig.d1 ? [{
            binding: hostingConfig.d1,
            database_name: "lingxing-openapi-console",
            database_id: placeholder
          }] : []
        }
      })
    ]
  };
});
