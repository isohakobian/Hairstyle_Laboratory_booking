import nodemailer from "nodemailer";

export type BookingEmailDetails = {
  referenceNumber: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  comment?: string | null;
};

type EmailMessage = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function bookingDetailsHtml(details: BookingEmailDetails) {
  const rows = [
    ["Service", details.serviceName],
    ["Date", details.bookingDate],
    ["Time", details.bookingTime],
    ["Reference", details.referenceNumber],
  ];

  return rows.map(([label, value]) => (
    `<tr><td style="padding:8px 14px 8px 0;color:#6B7280;font-size:13px;">${label}</td><td style="padding:8px 0;color:#17191E;font-size:14px;font-weight:600;">${escapeHtml(value)}</td></tr>`
  )).join("");
}

function bookingDetailsText(details: BookingEmailDetails) {
  return [
    `Service: ${details.serviceName}`,
    `Date: ${details.bookingDate}`,
    `Time: ${details.bookingTime}`,
    `Reference: ${details.referenceNumber}`,
  ].join("\n");
}

export function buildOwnerBookingEmail(details: BookingEmailDetails): EmailMessage {
  const optionalRows = [
    ["Client", details.clientName],
    ["Phone", details.clientPhone],
    details.clientEmail ? ["Email", details.clientEmail] : null,
    details.comment ? ["Comment", details.comment] : null,
  ].filter((row): row is [string, string] => Boolean(row));

  const extraHtml = optionalRows.map(([label, value]) => (
    `<tr><td style="padding:8px 14px 8px 0;color:#6B7280;font-size:13px;">${label}</td><td style="padding:8px 0;color:#17191E;font-size:14px;font-weight:600;">${escapeHtml(value)}</td></tr>`
  )).join("");

  return {
    subject: `New booking request — ${details.serviceName}`,
    text: [
      "New booking request",
      `Client: ${details.clientName}`,
      `Phone: ${details.clientPhone}`,
      details.clientEmail ? `Email: ${details.clientEmail}` : null,
      bookingDetailsText(details),
      details.comment ? `Comment: ${details.comment}` : null,
    ].filter(Boolean).join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#F7F5F1;font-family:Arial,sans-serif;color:#17191E;"><div style="max-width:600px;margin:0 auto;padding:36px 24px;"><p style="margin:0 0 8px;color:#A17A2C;font-size:11px;font-weight:700;letter-spacing:2px;">HAIRSTYLE LABORATORY</p><h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:32px;line-height:1.1;">New booking request</h1><div style="background:#FFFFFF;border:1px solid #E4DED5;padding:24px;"><table style="border-collapse:collapse;width:100%;">${extraHtml}${bookingDetailsHtml(details)}</table></div><p style="margin:22px 0 0;color:#6B7280;font-size:12px;">Manage this request in the admin panel.</p></div></body></html>`,
  };
}

export function buildClientBookingEmail(details: BookingEmailDetails): EmailMessage {
  const safeName = escapeHtml(details.clientName);
  return {
    subject: "Your booking request — Hairstyle Laboratory",
    text: [
      `Hello, ${details.clientName}.`,
      "Thank you for your booking request. We will review it and confirm your appointment shortly.",
      "",
      "Спасибо за вашу запись. Мы проверим заявку и скоро подтвердим время визита.",
      "",
      bookingDetailsText(details),
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#F7F5F1;font-family:Arial,sans-serif;color:#17191E;"><div style="max-width:600px;margin:0 auto;padding:36px 24px;"><p style="margin:0 0 8px;color:#A17A2C;font-size:11px;font-weight:700;letter-spacing:2px;">HAIRSTYLE LABORATORY</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:32px;line-height:1.1;">Thank you for your booking</h1><p style="margin:0 0 8px;font-size:15px;line-height:1.6;">Hello, ${safeName}. Your request has been received. We will review it and confirm your appointment shortly.</p><p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Спасибо за вашу запись. Мы проверим заявку и скоро подтвердим время визита.</p><div style="background:#FFFFFF;border:1px solid #E4DED5;padding:24px;"><table style="border-collapse:collapse;width:100%;">${bookingDetailsHtml(details)}</table></div><p style="margin:22px 0 0;color:#6B7280;font-size:12px;">Keep your reference number for booking status: ${escapeHtml(details.referenceNumber)}</p></div></body></html>`,
  };
}

function getMailTransport() {
  const user = process.env.GMAIL_SMTP_USER;
  const pass = process.env.GMAIL_SMTP_APP_PASSWORD;

  if (!user || !pass) return null;

  return {
    user,
    transport: nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    }),
  };
}

export async function sendBookingEmails(details: BookingEmailDetails) {
  if (process.env.NODE_ENV === "test") return { skipped: true } as const;

  const config = getMailTransport();
  if (!config) {
    console.warn("[Booking email] Gmail SMTP is not configured; skipping email delivery.");
    return { skipped: true } as const;
  }

  const from = `Hairstyle Laboratory <${config.user}>`;
  const ownerEmail = buildOwnerBookingEmail(details);
  const clientEmail = details.clientEmail ? buildClientBookingEmail(details) : null;

  const deliveries = [
    config.transport.sendMail({
      from,
      to: config.user,
      replyTo: details.clientEmail || config.user,
      subject: ownerEmail.subject,
      text: ownerEmail.text,
      html: ownerEmail.html,
      headers: { "X-Booking-Reference": details.referenceNumber },
    }),
    ...(clientEmail && details.clientEmail ? [
      config.transport.sendMail({
        from,
        to: details.clientEmail,
        replyTo: config.user,
        subject: clientEmail.subject,
        text: clientEmail.text,
        html: clientEmail.html,
        headers: { "X-Booking-Reference": details.referenceNumber },
      }),
    ] : []),
  ];

  const results = await Promise.allSettled(deliveries);
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`[Booking email] ${index === 0 ? "Owner" : "Client"} delivery failed:`, result.reason);
    }
  });

  return results;
}
