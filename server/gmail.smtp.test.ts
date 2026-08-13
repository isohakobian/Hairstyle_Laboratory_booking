import { describe, expect, it } from "vitest";
import nodemailer from "nodemailer";

describe("Gmail SMTP credentials", () => {
  it("authenticates with Gmail without sending an email", async () => {
    const user = process.env.GMAIL_SMTP_USER;
    const pass = process.env.GMAIL_SMTP_APP_PASSWORD;

    expect(user).toBe("isohakobian@gmail.com");
    expect(pass).toBeTruthy();

    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });

    await expect(transport.verify()).resolves.toBe(true);
  }, 20_000);
});
