export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
};

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 5,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
  shouldRetry: () => true
};

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function backoffDelay(attempt: number, baseMs: number, maxMs: number): number {
  return Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let currentAttempt = 0;
  let lastError: unknown;

  while (currentAttempt < config.maxAttempts) {
    currentAttempt += 1;
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!config.shouldRetry(error) || currentAttempt >= config.maxAttempts) {
        break;
      }
      const delay = backoffDelay(currentAttempt, config.baseDelayMs, config.maxDelayMs);
      await sleep(delay);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Retry operation failed");
}
