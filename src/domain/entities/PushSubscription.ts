export class PushSubscription {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly endpoint: string,
    readonly p256dh: string,
    readonly auth: string,
  ) {}
}
