import { Command } from 'commander';
import type { CliContext } from '../../context.js';
import { initMemory } from '../../services/memory/service.js';
import { operation, scoped, target, type TargetOptions } from './utils/command.js';
export function addMemoryInitCommand(memory: Command, ctx: CliContext): void {
    scoped(memory.command('init').description('Initialize the memory module only: system entry and selected memory types. Does not read --super.'))
        .option('--root-dir <directory>', 'Boundary for the memory tree')
        .option('--description <text>', 'Description in the parent scope index')
        .option('--memory-types <types...>', 'Select memory types: project feedback reference user')
        .action((options: TargetOptions & {
        rootDir?: string;
        description?: string;
        memoryTypes?: string[];
    }) => operation(ctx, async () => await initMemory({ ...options, targetDir: target(options, ctx) })));
}
