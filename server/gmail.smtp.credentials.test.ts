import { describe, expect, it } from "vitest";
import nodemailer from "nodemailer";

describe("Gmail SMTP credentials", () => {
  it("authenticates with the configured Gmail App Password without sending mail", async () => {
    const user = process.env.GMAIL_SMTP_USER;
    const pass = process.env.GMAIL_SMTP_APP_PASSWORD;
    expect(user, "GMAIL_SMTP_USER must be configured").toBeTruthy();
    expect(pass, "GMAIL_SMTP_APP_PASSWORD must be configured").toBeTruthy();

    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: user!, pass: pass! },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });

    await expect(transport.verify()).resolves.toBe(true);
    transport.close();
  }, 20_000);
});

export {};

// This test validates SMTP authentication only. It never sends an email.
// Do not commit the credential values; they are injected through project secrets.
