import { logger } from "../../utils/logger"
import type { EmailMessage, EmailProvider } from "./email-provider"

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    logger.info("Email message generated", {
      to: message.to,
      from: message.from,
      subject: message.subject,
      text: message.text,
    })
  }
}
