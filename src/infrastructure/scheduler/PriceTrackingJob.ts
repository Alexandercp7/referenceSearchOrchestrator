import { AlertEvaluation } from '../../domain/usecases/AlertEvaluation';
import { PriceRefresh } from '../../domain/usecases/PriceRefresh';

export class PriceTrackingJob {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly priceRefresh: PriceRefresh,
    private readonly alertEvaluation: AlertEvaluation,
    private readonly intervalMs: number,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    try {
      await this.priceRefresh.refresh();
      await this.alertEvaluation.evaluate();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[scheduler] tick failed:', err);
    }
  }
}
