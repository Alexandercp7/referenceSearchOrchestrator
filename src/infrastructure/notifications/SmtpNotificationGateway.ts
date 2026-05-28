import nodemailer, { Transporter } from 'nodemailer';
import { User } from '../../domain/entities/User';
import { NotificationGateway, TriggeredAlert } from '../../domain/interfaces/gateways/NotificationGateway';
import { conditionText } from '../../domain/valueObjects/AlertCondition';

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

  async notify(user: User, items: TriggeredAlert[]): Promise<void> {
    const subject =
      items.length === 1
        ? `Alerta de precio: ${items[0]!.snapshot.title || items[0]!.alert.productUrl}`
        : `Reference — ${items.length} alertas de precio disparadas`;

    const body = items
      .map(({ alert, snapshot }, i) => {
        const lines: string[] = [];
        if (items.length > 1) lines.push(`${i + 1}.`);
        if (snapshot.title) lines.push(`Producto:  ${snapshot.title}`);
        lines.push(`Precio:    ${snapshot.price.toString()}`);
        lines.push(`Condición: ${conditionText(alert.condition)}`);
        lines.push(`Link:      ${alert.productUrl}`);
        return lines.join('\n');
      })
      .join('\n\n---\n\n');

    await this.transporter.sendMail({
      from: this.config.from,
      to: user.email.value,
      subject,
      text: `Hola,\n\nTus alertas de precio han sido disparadas:\n\n${body}`,
    });
  }
}
