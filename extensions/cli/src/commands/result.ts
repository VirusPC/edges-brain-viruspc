import type { CliResult } from "../context.js";
import { exitCodeForErrorCode } from "./exit.js";

const USAGE_CODES = new Set([
  "commander.unknownOption",
  "commander.missingArgument",
  "commander.invalidArgument",
  "commander.excessArguments",
  "commander.missingMandatoryOptionValue",
]);

export function usageErrorCode(commandCode: string): "VALIDATION_ERROR" | null {
  return USAGE_CODES.has(commandCode) ? "VALIDATION_ERROR" : null;
}

export function fail(errorCode: string, reason: string, stderrHint: string): CliResult {
  return failWithExit(exitCodeForErrorCode(errorCode), errorCode, reason, stderrHint);
}

export function failWithExit(
  exitCode: number,
  errorCode: string,
  reason: string,
  stderrHint: string,
  fields: Record<string, unknown> = {},
): CliResult {
  return {
    exitCode,
    stdout: `${JSON.stringify({ status: "failed", errorCode, reason, ...fields })}\n`,
    stderr: stderrHint,
  };
}

export function succeed(payload: Record<string, unknown>, stderrNote = ""): CliResult {
  return {
    exitCode: 0,
    stdout: `${JSON.stringify({ status: "success", ...payload })}\n`,
    stderr: stderrNote,
  };
}
