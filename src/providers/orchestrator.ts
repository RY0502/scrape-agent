import type { VisionProvider } from "./types.js";

interface ProviderState {
  name: string;
  failureCount: number;
  lastFailureTime: number | null;
  inCooldown: boolean;
}

export class ProviderOrchestrator {
  private providers: VisionProvider[];
  private currentIndex: number = 0;
  private state: Map<string, ProviderState> = new Map();
  private readonly COOLDOWN_MS = 2 * 60 * 1000;

  constructor(providers: VisionProvider[]) {
    if (providers.length === 0) {
      throw new Error("At least one provider is required");
    }

    this.providers = providers;

    for (const provider of providers) {
      this.state.set(provider.name, {
        name: provider.name,
        failureCount: 0,
        lastFailureTime: null,
        inCooldown: false
      });
    }

    console.log(`[Orchestrator] Initialized with ${providers.length} providers: ${providers.map(p => p.name).join(", ")}`);
  }

  async extract(prompt: string, screenshotBase64: string): Promise<string> {
    const startIndex = this.currentIndex;
    let attempts = 0;

    while (attempts < this.providers.length) {
      const provider = this.providers[this.currentIndex];
      const providerState = this.state.get(provider.name)!;

      if (this.isInCooldown(provider.name)) {
        console.log(`[Orchestrator] Provider "${provider.name}" is in cooldown, skipping`);
        this.moveToNextProvider();
        attempts++;
        continue;
      }

      console.log(`[Orchestrator] Attempting extraction with provider "${provider.name}" (attempt ${attempts + 1}/${this.providers.length})`);

      try {
        const result = await provider.extract(prompt, screenshotBase64);

        this.recordSuccess(provider.name);
        console.log(`[Orchestrator] Successfully extracted data using provider "${provider.name}"`);

        return result;
      } catch (error) {
        const isRateLimit = provider.isRateLimitError(error);
        const isUnavailable = provider.isUnavailableError(error);

        if (isRateLimit || isUnavailable) {
          const errorType = isRateLimit ? "rate limit" : "unavailable";
          console.warn(`[Orchestrator] Provider "${provider.name}" failed with ${errorType} error: ${error instanceof Error ? error.message : String(error)}`);

          this.recordFailure(provider.name);
          this.moveToNextProvider();
          attempts++;
          continue;
        }

        console.error(`[Orchestrator] Provider "${provider.name}" failed with non-recoverable error:`, error);
        throw error;
      }
    }

    const errorMessage = `All ${this.providers.length} providers exhausted. Providers tried: ${this.providers.map(p => p.name).join(", ")}`;
    console.error(`[Orchestrator] ${errorMessage}`);
    throw new Error(errorMessage);
  }

  private moveToNextProvider(): void {
    const previousIndex = this.currentIndex;
    this.currentIndex = (this.currentIndex + 1) % this.providers.length;

    if (this.currentIndex !== previousIndex) {
      console.log(`[Orchestrator] Switching default provider from "${this.providers[previousIndex].name}" to "${this.providers[this.currentIndex].name}"`);
    }
  }

  private recordSuccess(name: string): void {
    const providerState = this.state.get(name)!;
    providerState.failureCount = 0;
    providerState.lastFailureTime = null;
    providerState.inCooldown = false;
  }

  private recordFailure(name: string): void {
    const providerState = this.state.get(name)!;
    providerState.failureCount += 1;
    providerState.lastFailureTime = Date.now();
    providerState.inCooldown = true;

    console.log(`[Orchestrator] Provider "${name}" failure count: ${providerState.failureCount}, entering cooldown for ${this.COOLDOWN_MS / 1000}s`);

    setTimeout(() => {
      const state = this.state.get(name);
      if (state) {
        state.inCooldown = false;
        console.log(`[Orchestrator] Provider "${name}" cooldown expired, available for retry`);
      }
    }, this.COOLDOWN_MS);
  }

  private isInCooldown(name: string): boolean {
    const providerState = this.state.get(name);
    return providerState?.inCooldown ?? false;
  }

  getStatus(): { provider: string; failureCount: number; inCooldown: boolean }[] {
    return Array.from(this.state.values()).map(state => ({
      provider: state.name,
      failureCount: state.failureCount,
      inCooldown: state.inCooldown
    }));
  }

  getCurrentProvider(): string {
    return this.providers[this.currentIndex].name;
  }
}
