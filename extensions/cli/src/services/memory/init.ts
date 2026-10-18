export interface InitMemoryOptions {
  targetDir: string;
  rootDir?: string;
  description?: string;
  memoryTypes?: readonly string[];
  skillTypes?: readonly string[];
}

/** Thin wrapper so existing imports keep this function. The body lives in the init service. */
export async function initMemory(options: InitMemoryOptions) {
  const mod = await import("../init/service.js");
  return mod.initMemory(options);
}
