import nodemailer from "nodemailer";
import { buildCalendarInvite } from "./calendarInvite";

export type BookingEmailDetails = {
  referenceNumber: string;
  serviceName: string;
  totalDurationMinutes?: number;
  totalPriceSummary?: string;
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
    ...(details.totalDurationMinutes ? [["Duration", `${details.totalDurationMinutes} min`]] : []),
    ...(details.totalPriceSummary ? [["Price", details.totalPriceSummary]] : []),
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
    ...(details.totalDurationMinutes ? [`Duration: ${details.totalDurationMinutes} min`] : []),
    ...(details.totalPriceSummary ? [`Price: ${details.totalPriceSummary}`] : []),
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

export function buildClientConfirmationEmail(details: BookingEmailDetails): EmailMessage {
  const safeName = escapeHtml(details.clientName);
  return {
    subject: "Booking confirmed — Hairstyle Laboratory",
    text: [
      `Hello, ${details.clientName}. Your booking is confirmed.`,
      "Your calendar invitation is attached to this email.",
      "",
      `Здравствуйте, ${details.clientName}. Ваша запись подтверждена.`,
      "Приглашение в календарь прикреплено к этому письму.",
      "",
      bookingDetailsText(details),
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#F7F5F1;font-family:Arial,sans-serif;color:#17191E;"><div style="max-width:600px;margin:0 auto;padding:36px 24px;"><p style="margin:0 0 8px;color:#A17A2C;font-size:11px;font-weight:700;letter-spacing:2px;">HAIRSTYLE LABORATORY</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:32px;line-height:1.1;">Your booking is confirmed</h1><p style="margin:0 0 8px;font-size:15px;line-height:1.6;">Hello, ${safeName}. Your booking is confirmed. Add the attached invitation to your calendar to keep the visit at hand.</p><p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Ваша запись подтверждена. Добавьте прикреплённое приглашение в календарь, чтобы не забыть о визите.</p><div style="background:#FFFFFF;border:1px solid #E4DED5;padding:24px;"><table style="border-collapse:collapse;width:100%;">${bookingDetailsHtml(details)}</table></div></div></body></html>`,
  };
}

export function buildReviewRequestEmail(details: BookingEmailDetails, reviewUrl: string): EmailMessage {
  const safeName = escapeHtml(details.clientName);
  const safeUrl = escapeHtml(reviewUrl);
  return {
    subject: "Thank you for your visit — Isaac",
    text: [
      `Hi, ${details.clientName}.`,
      "Thank you for trusting me with your appointment.",
      "If you have a minute, I'd love your honest feedback. It really helps me.",
      `Leave your feedback: ${reviewUrl}`,
      "",
      "Thank you again,",
      "Isaac",
      "",
      `Привет, ${details.clientName}.`,
      "Спасибо за доверие и за ваш визит.",
      "Если у вас найдётся минута, буду рад честному отзыву. Это правда помогает мне.",
      `Оставить отзыв: ${reviewUrl}`,
      "",
      "Ещё раз спасибо,",
      "Isaac",
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#F7F5F1;font-family:Arial,sans-serif;color:#17191E;"><div style="max-width:600px;margin:0 auto;padding:36px 24px;"><p style="margin:0 0 8px;color:#A17A2C;font-size:11px;font-weight:700;letter-spacing:2px;">ISAAC HAKOBIAN</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:32px;line-height:1.1;">Thank you for your visit</h1><p style="margin:0 0 8px;font-size:15px;line-height:1.6;">Hi, ${safeName}.</p><p style="margin:0 0 8px;font-size:15px;line-height:1.6;">Thank you for trusting me with your appointment. If you have a minute, I’d love your honest feedback. It really helps me.</p><p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Спасибо за доверие и за ваш визит. Если у вас найдётся минута, буду рад честному отзыву. Это правда помогает мне.</p><a href="${safeUrl}" style="display:inline-block;background:#17191E;color:#FFFFFF;text-decoration:none;padding:14px 20px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Leave feedback / Оставить отзыв</a><p style="margin:26px 0 0;font-size:15px;line-height:1.6;">Thank you again,<br><strong>Isaac</strong></p></div></body></html>`,
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

export async function sendConfirmedBookingEmail(details: BookingEmailDetails) {
  if (process.env.NODE_ENV === "test" || !details.clientEmail) return { skipped: true } as const;
  const config = getMailTransport();
  if (!config) return { skipped: true } as const;

  const email = buildClientConfirmationEmail(details);
  return config.transport.sendMail({
    from: `Hairstyle Laboratory <${config.user}>`,
    to: details.clientEmail,
    replyTo: config.user,
    subject: email.subject,
    text: email.text,
    html: email.html,
    headers: { "X-Booking-Reference": details.referenceNumber },
    attachments: [{
      filename: "hairstyle-laboratory-booking.ics",
      content: buildCalendarInvite(details),
      contentType: "text/calendar; charset=utf-8; method=PUBLISH",
    }],
  });
}

export async function sendReviewRequestEmail(details: BookingEmailDetails, reviewUrl: string) {
  if (process.env.NODE_ENV === "test" || !details.clientEmail) return { skipped: true } as const;
  const config = getMailTransport();
  if (!config) return { skipped: true } as const;

  const email = buildReviewRequestEmail(details, reviewUrl);
  return config.transport.sendMail({
    from: `Hairstyle Laboratory <${config.user}>`,
    to: details.clientEmail,
    replyTo: config.user,
    subject: email.subject,
    text: email.text,
    html: email.html,
    headers: { "X-Booking-Reference": details.referenceNumber },
  });
}
