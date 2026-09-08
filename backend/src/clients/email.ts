import SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import Mail from "nodemailer/lib/mailer/index.js";
import { EMAIL_CONFIG } from "@/configs/env.js";
import { IS_PRODUCTION } from "@/lib/index.js";
import nodemailer from "nodemailer";

interface SendEmailPayload extends Mail.Options {
  bcc?: string[];
}

interface SendEmailResponse extends SMTPTransport.SentMessageInfo {}

class EmailClient {
  private readonly transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_CONFIG.USER!,
      pass: EMAIL_CONFIG.APP_PASSWORD!
    }
  });

  constructor() {}

  protected async sendEmail(
    payload: SendEmailPayload,
    signal?: AbortSignal
  ): Promise<SendEmailResponse> {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    if (!IS_PRODUCTION) {
      return {} as SendEmailResponse;
    }
    const bcc = payload.bcc || [];
    const info = await this.transporter.sendMail({
      ...payload,
      bcc: [EMAIL_CONFIG.USER, ...bcc]
    });

    return info;
  }

  protected abortEmail(controller: AbortController): void {
    controller.abort();
  }

  public init() {
    const controller = new AbortController();

    return {
      sendEmail: (payload: SendEmailPayload) =>
        this.sendEmail(payload, controller.signal),

      abortEmail: () => this.abortEmail(controller)
    };
  }
}

export const emailClient = new EmailClient();
