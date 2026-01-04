import { createHash, createHmac } from "crypto";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { existsSync } from "fs";
import type {
  LLMRequest,
  LLMResponse,
  Cassette,
  VCRConfig,
  VCRMode,
} from "@traceforge/shared";

/**
 * Default signature secret (should be overridden via config)
 */
const DEFAULT_SIGNATURE_SECRET = "traceforge-vcr-default-secret";

/**
 * Generate HMAC signature for cassette data
 */
function signCassette(
  cassette: Omit<Cassette, "signature">,
  secret: string
): string {
  const data = JSON.stringify({
    cassette_version: cassette.cassette_version,
    provider: cassette.provider,
    request: cassette.request,
    response: cassette.response,
    recorded_at: cassette.recorded_at,
  });
  return createHmac("sha256", secret).update(data).digest("hex");
}

/**
 * Verify cassette signature
 */
function verifyCassetteSignature(cassette: Cassette, secret: string): boolean {
  if (!cassette.signature) {
    // No signature present - cassette created before integrity feature
    return true; // Allow for backward compatibility
  }

  const { signature, ...data } = cassette;
  const expectedSignature = signCassette(data, secret);
  return signature === expectedSignature;
}

/**
 * Build a stable signature for request matching
 */
export function buildRequestSignature(
  provider: string,
  request: LLMRequest,
  matchMode: "exact" | "fuzzy" = "fuzzy"
): string {
  const parts: any[] = [provider, request.model];

  // Always include messages or prompt
  if (request.messages) {
    parts.push(JSON.stringify(request.messages));
  } else if (request.prompt) {
    parts.push(JSON.stringify(request.prompt));
  }

  // Include tools if present
  if ((request as any).tools) {
    parts.push(JSON.stringify((request as any).tools));
  }

  // In exact mode, include all optional parameters
  if (matchMode === "exact") {
    if (request.temperature !== undefined) parts.push(request.temperature);
    if (request.max_tokens !== undefined) parts.push(request.max_tokens);
    if (request.top_p !== undefined) parts.push(request.top_p);
    if (request.frequency_penalty !== undefined)
      parts.push(request.frequency_penalty);
    if (request.presence_penalty !== undefined)
      parts.push(request.presence_penalty);
    if (request.stop !== undefined) parts.push(JSON.stringify(request.stop));
  }

  const signature = parts.join("|");
  return createHash("sha256").update(signature).digest("hex");
}

/**
 * Get cassette file path for a signature
 */
export function getCassettePath(
  cassettesDir: string,
  provider: string,
  signature: string
): string {
  return join(cassettesDir, provider, `${signature}.json`);
}

/**
 * Find and load a cassette by signature with integrity verification
 */
export async function findCassette(
  cassettesDir: string,
  provider: string,
  signature: string,
  signatureSecret?: string
): Promise<Cassette | null> {
  const cassettePath = getCassettePath(cassettesDir, provider, signature);

  if (!existsSync(cassettePath)) {
    return null;
  }

  try {
    const content = await readFile(cassettePath, "utf-8");
    const cassette: Cassette = JSON.parse(content);

    // Validate cassette version
    if (!cassette.cassette_version) {
      throw new Error("Invalid cassette: missing version");
    }

    // Verify cassette integrity if signature exists
    const secret = signatureSecret || DEFAULT_SIGNATURE_SECRET;
    if (!verifyCassetteSignature(cassette, secret)) {
      throw new Error(
        "Cassette integrity verification failed: signature mismatch"
      );
    }

    return cassette;
  } catch (error: any) {
    throw new Error(`Failed to load cassette: ${error.message}`);
  }
}

/**
 * Save a cassette to disk with integrity signature
 */
export async function saveCassette(
  cassettesDir: string,
  provider: string,
  signature: string,
  request: LLMRequest,
  responseStatus: number,
  responseHeaders: Record<string, string>,
  responseBody: LLMResponse | { error: any },
  signatureSecret?: string
): Promise<void> {
  const cassetteData: Omit<Cassette, "signature"> = {
    cassette_version: "1.0",
    provider,
    request,
    response: {
      status: responseStatus,
      headers: responseHeaders,
      body: responseBody,
    },
    recorded_at: new Date().toISOString(),
  };

  // Generate HMAC signature for integrity
  const secret = signatureSecret || DEFAULT_SIGNATURE_SECRET;
  const cassetteSignature = signCassette(cassetteData, secret);

  const cassette: Cassette = {
    ...cassetteData,
    signature: cassetteSignature,
  };

  const cassettePath = getCassettePath(cassettesDir, provider, signature);
  const cassetteDir = dirname(cassettePath);

  // Ensure directory exists
  if (!existsSync(cassetteDir)) {
    await mkdir(cassetteDir, { recursive: true });
  }

  await writeFile(cassettePath, JSON.stringify(cassette, null, 2), "utf-8");
}

/**
 * VCR Layer - handles record/replay logic
 */
export class VCRLayer {
  private config: VCRConfig;

  constructor(config: VCRConfig) {
    this.config = config;
  }

  /**
   * Check if a cassette exists and should be replayed
   */
  async shouldReplay(
    provider: string,
    request: LLMRequest
  ): Promise<Cassette | null> {
    const mode = this.config.mode;

    // Off mode - never replay
    if (mode === "off") {
      return null;
    }

    // Replay, auto, or strict mode - try to find cassette
    if (mode === "replay" || mode === "auto" || mode === "strict") {
      const signature = buildRequestSignature(
        provider,
        request,
        this.config.match_mode
      );
      const cassette = await findCassette(
        this.config.cassettes_dir,
        provider,
        signature,
        this.config.signature_secret
      );

      if (cassette) {
        return cassette;
      }

      // In replay or strict mode, missing cassette is an error
      if (mode === "replay" || mode === "strict") {
        const errorMessage =
          mode === "strict"
            ? `STRICT CI MODE: Missing execution snapshot for ${provider} request. ` +
              `Build failed. Signature: ${signature}. ` +
              `Record snapshots locally with TRACEFORGE_VCR_MODE=record before committing.`
            : `VCR replay miss: no cassette found for ${provider} request. ` +
              `Signature: ${signature}. ` +
              `Run with VCR_MODE=record to create cassettes.`;

        throw new Error(errorMessage);
      }
    }

    return null;
  }

  /**
   * Record a response as a cassette
   */
  async record(
    provider: string,
    request: LLMRequest,
    responseStatus: number,
    responseHeaders: Record<string, string>,
    responseBody: LLMResponse | { error: any }
  ): Promise<void> {
    const mode = this.config.mode;

    // Strict mode forbids recording - CI should never create new snapshots
    if (mode === "strict") {
      throw new Error(
        "STRICT CI MODE: Recording is forbidden. " +
          "Execution snapshots must be created locally and committed to version control. " +
          "Set TRACEFORGE_VCR_MODE=record locally to create snapshots."
      );
    }

    // Only record in record or auto mode
    if (mode === "record" || mode === "auto") {
      const signature = buildRequestSignature(
        provider,
        request,
        this.config.match_mode
      );

      await saveCassette(
        this.config.cassettes_dir,
        provider,
        signature,
        request,
        responseStatus,
        responseHeaders,
        responseBody,
        this.config.signature_secret
      );
    }
  }

  /**
   * Get VCR statistics
   */
  async getStats(): Promise<{ provider: string; count: number }[]> {
    const stats: { provider: string; count: number }[] = [];

    try {
      const providers = await readdir(this.config.cassettes_dir);

      for (const provider of providers) {
        const providerDir = join(this.config.cassettes_dir, provider);
        const files = await readdir(providerDir);
        const cassetteCount = files.filter((f) => f.endsWith(".json")).length;

        if (cassetteCount > 0) {
          stats.push({ provider, count: cassetteCount });
        }
      }
    } catch {
      // Directory might not exist yet
    }

    return stats;
  }
}

/**
 * Get default VCR configuration
 */
export function getDefaultVCRConfig(): VCRConfig {
  const mode = (process.env.TRACEFORGE_VCR_MODE || "off") as VCRMode;
  const matchMode = (process.env.TRACEFORGE_VCR_MATCH || "fuzzy") as
    | "exact"
    | "fuzzy";
  const cassettesDir = process.env.TRACEFORGE_VCR_DIR || ".ai-tests/cassettes";
  const signatureSecret = process.env.TRACEFORGE_VCR_SECRET;

  return {
    mode,
    match_mode: matchMode,
    cassettes_dir: cassettesDir,
    signature_secret: signatureSecret,
  };
}
