import nodemailer, { Transporter } from 'nodemailer';
import { Alert } from '../../domain/entities/Alert';
import { PriceSnapshot } from '../../domain/entities/PriceSnapshot';
import { User } from '../../domain/entities/User';
import { NotificationGateway } from '../../domain/interfaces/gateways/NotificationGateway';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export class SmtpNotificationGateway implements NotificationGateway {
  private readonly transporter: Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
  }

  async notify(user: User, alert: Alert, snapshot: PriceSnapshot): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to: user.email.value,
      subject: `Alerta de precio: ${alert.productUrl}`,
      text: [
        `Tu alerta fue activada.`,
        ``,
        `Producto: ${alert.productUrl}`,
        `Precio actual: ${snapshot.price.toString()}`,
        `Condición: ${JSON.stringify(alert.condition)}`,
      ].join('\n'),
    });
  }
}
