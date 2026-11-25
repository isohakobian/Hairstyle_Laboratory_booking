import { describe, expect, it } from "vitest";
import nodemailer from "nodemailer";

describe("Gmail SMTP credentials", () => {
  it("authenticates without sending an email", async () => {
    const user = process.env.GMAIL_SMTP_USER?.trim();
    const pass = process.env.GMAIL_SMTP_APP_PASSWORD?.replace(/\s/g, "");

    if (!user || !pass) {
      return;
    }

    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 15_000,
    });

    await expect(transport.verify()).resolves.toBe(true);
    transport.close();
  }, 20_000);
});
