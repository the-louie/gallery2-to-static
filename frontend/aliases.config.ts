import path from "path";

/**
 * Shared Vite/Vitest path alias definitions.
 *
 * IMPORTANT: When adding a new alias here, also add the corresponding
 * entry to tsconfig.json "paths" (using glob syntax: "@/foo/*": ["./src/foo/*"]).
 */
export function resolveAliases(baseDir: string): Record<string, string> {
  return {
    "@": path.resolve(baseDir, "./src"),
    "@/components": path.resolve(baseDir, "./src/components"),
    "@/utils": path.resolve(baseDir, "./src/utils"),
    "@/types": path.resolve(baseDir, "./src/types"),
    "@/hooks": path.resolve(baseDir, "./src/hooks"),
    "@/pages": path.resolve(baseDir, "./src/pages"),
    "@/styles": path.resolve(baseDir, "./src/styles"),
    "@/contexts": path.resolve(baseDir, "./src/contexts"),
  };
}
