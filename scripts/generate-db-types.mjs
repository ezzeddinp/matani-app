import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const isWindows = process.platform === "win32";
const result = spawnSync(
  isWindows ? "npx.cmd" : "supabase",
  isWindows
    ? ["--yes", "supabase@latest", "gen", "types", "typescript", "--local"]
    : ["gen", "types", "typescript", "--local"],
  { encoding: "utf8", shell: isWindows }
);

if (result.status !== 0) {
  process.stderr.write(
    result.stderr ||
      result.error?.message ||
      "Supabase type generation failed.\n"
  );
  process.exit(result.status ?? 1);
}

writeFileSync("supabase/types/database.types.ts", result.stdout, "utf8");
console.log("Generated supabase/types/database.types.ts");
