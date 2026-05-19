import {
  EmailDeliveryError,
  type EmailMessage,
  type EmailProvider,
} from "./email-provider"

type ResendErrorResponse = {
  message?: string
}

export class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey: string) {}

  async send(message: EmailMessage): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      }),
    })

    if (response.ok) {
      return
    }

    let errorMessage = "Email provider rejected the message"

    try {
      const body = (await response.json()) as ResendErrorResponse
      if (body.message) {
        errorMessage = body.message
      }
    } catch {
      // Keep a generic provider error when the response body is not JSON.
    }

    throw new EmailDeliveryError(errorMessage)
  }
}
