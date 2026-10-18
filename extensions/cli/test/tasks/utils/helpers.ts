import {
  mkdir,
  readdir,
  readFile,
  rename,
  rmdir as fsRmdir,
  unlink,
  writeFile,
  access,
} from "node:fs/promises";
import type { BoardFs } from "../../../src/services/tasks/board.js";
import { taskBoardLocation, type TaskBoardLocation } from "../../../src/services/tasks/paths.js";

/** Fixtures under `<scope>/tasks` are the virtual board. A string scope is the maintenance board. */
export function domainBoard(scopeDir: string): TaskBoardLocation {
  return taskBoardLocation(scopeDir, { super: true });
}

export type BoardWriter = BoardFs & {
  writeFile(abs: string, contents: string): Promise<void>;
  mkdirp(abs: string): Promise<void>;
  rename?(from: string, to: string): Promise<void>;
  unlink?(abs: string): Promise<void>;
  rmdir(abs: string): Promise<void>;
};

export function nodeBoardFs(): BoardFs {
  return {
    async readFile(abs: string): Promise<string> {
      return readFile(abs, "utf8");
    },
    async readdir(abs: string): Promise<string[]> {
      return readdir(abs);
    },
    async exists(abs: string): Promise<boolean> {
      try {
        await access(abs);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function nodeBoardWriter(): BoardWriter {
  const fs = nodeBoardFs();
  return {
    ...fs,
    async writeFile(abs: string, contents: string): Promise<void> {
      await writeFile(abs, contents, "utf8");
    },
    async mkdirp(abs: string): Promise<void> {
      await mkdir(abs, { recursive: true });
    },
    async rename(from: string, to: string): Promise<void> {
      await rename(from, to);
    },
    async unlink(abs: string): Promise<void> {
      await unlink(abs);
    },
    async rmdir(abs: string): Promise<void> {
      await fsRmdir(abs);
    },
  };
}

/** Seed current README org lists for task fixtures; production never performs this scan. */
export async function indexTaskFixtureBoard(board: string): Promise<void> {
  const { ReadmeNode } = await import("../../../src/domain/models/readme/readme-node.js");
  const { TASK_STATUSES } = await import('../../../src/domain/models/tasks/types.js');
  const { isUserProjectSlug } = await import('../../../src/domain/models/tasks/project.js');
  const { renderProjectReadme, seedTitleFor, seedDescriptionFor } = await import('../../../src/services/tasks/project-meta.js');
  const path = await import('node:path');
  const { realpath } = await import('node:fs/promises');
  board = await realpath(board);
  const loadIndex = async (file: string, fallback: string) => {
    let source = fallback;
    try { source = await readFile(file,'utf8'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    return new ReadmeNode(file).parse(source);
  };
  const root = await loadIndex(path.join(board,'README.md'),'# Tasks\n');
  for (const name of await readdir(board)) {
    if (name !== '_default' && !isUserProjectSlug(name)) continue;
    const project = name === '_default' ? 'default' : name;
    const dir = path.join(board,name);
    try { await readdir(dir); } catch { continue; }
    const node = await loadIndex(path.join(dir,'README.md'),renderProjectReadme({title:seedTitleFor(project),description:seedDescriptionFor(project)}));
    for (const status of TASK_STATUSES) {
      let names: string[];
      try { names = await readdir(path.join(dir,status)); } catch { continue; }
      for (const stem of names) {
        let entry = '';
        for (const leaf of ['INDEX.md','index.md']) {
          try { entry = await realpath(path.join(dir,status,stem,leaf)); break; } catch { /* try legacy spelling */ }
        }
        if (!entry) continue;
        if (!node.children.some(ref=>ref.id===entry)) node.addChild('local',{id:entry});
      }
    }
    await writeFile(node.path,node.serialize());
    if (!root.children.some(ref=>ref.id===node.path)) root.addChild('local',{id:node.path});
  }
  await writeFile(root.path,root.serialize());
}

export async function writeIndexedTaskFixture(...args: Parameters<typeof writeFile>): Promise<void> {
  const path = await import('node:path');
  const file = String(args[0]);
  await mkdir(path.dirname(file),{recursive:true});
  await writeFile(...args);
  const match = file.match(/^(.*\/tasks)\/[^/]+\/(?:backlog|todo|in_progress|in_review|done|blocked|cancelled)\/[^/]+\/(?:INDEX|index)\.md$/);
  if (match) await indexTaskFixtureBoard(match[1]!);
  else if (path.basename(file)==='AGENTS.md' && path.basename(path.dirname(file))==='tasks') await indexTaskFixtureBoard(path.dirname(file));
}

export async function writeFixtureIndex(file: string, children: string[], descendants: string[] = []): Promise<void> {
  const { AgentsNode } = await import("../../../src/domain/models/agents/agents-node.js");
  const path = await import('node:path');
  const { realpath } = await import('node:fs/promises');
  await mkdir(path.dirname(file),{recursive:true});
  file=path.join(await realpath(path.dirname(file)),path.basename(file));
  const references = (paths: string[]) => paths.map(id=>({id:path.resolve(path.dirname(file),id)}));
  await writeFile(file,new AgentsNode(file).create({localChildren:references(children),descendantChildren:references(descendants)},{operation:'create'}).serialize());
}
