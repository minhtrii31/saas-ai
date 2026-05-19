export type EmailMessage = {
  to: string
  from: string
  subject: string
  text: string
}

export type EmailProvider = {
  send(message: EmailMessage): Promise<void>
}

export class EmailDeliveryError extends Error {
  constructor(message = "Email delivery failed") {
    super(message)
    this.name = "EmailDeliveryError"
  }
}
