import nodemailer from "nodemailer";
import { buildCalendarInvite } from "./calendarInvite";
import { getReviewRequestEmailTemplate, type ReviewRequestEmailTemplateInput, type WeeklyBookingSummary } from "./db";
import { ENV } from "./_core/env";

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
  clientInstagram?: string | null;
  comment?: string | null;
  manualDepositAmountAmd?: number | null;
  receipt?: { fileName: string; mimeType: string; content: Buffer } | null;
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

function bookingDetailsHtml(details: BookingEmailDetails, makeLocationLink = false) {
  const rows = [
    ["Service", details.serviceName],
    ...(details.totalDurationMinutes ? [["Duration", `${details.totalDurationMinutes} min`]] : []),
    ...(details.totalPriceSummary ? [["Price", details.totalPriceSummary]] : []),
    ["Date", details.bookingDate],
    ["Time", details.bookingTime],
    ["Reference", details.referenceNumber],
    ["Location", makeLocationLink ? `<a href="https://maps.google.com/?q=${encodeURIComponent(ENV.studioAddress)}" target="_blank" style="color:#A17A2C;text-decoration:underline;">${escapeHtml(ENV.studioAddress)}</a>` : ENV.studioAddress],
  ];

  return rows.map(([label, value]) => (
    `<tr><td style="padding:8px 14px 8px 0;color:#6B7280;font-size:13px;">${label}</td><td style="padding:8px 0;color:#17191E;font-size:14px;font-weight:600;">${value.startsWith('<a ') ? value : escapeHtml(value)}</td></tr>`
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
    `Location: ${ENV.studioAddress}`,
  ].join("\n");
}

export function buildOwnerBookingEmail(details: BookingEmailDetails): EmailMessage {
  const optionalRows = [
    ["Client", details.clientName],
    ["Phone", details.clientPhone],
    details.clientEmail ? ["Email", details.clientEmail] : null,
    details.clientInstagram ? ["Instagram", `@${details.clientInstagram.replace(/^@/, '')}`] : null,
    details.manualDepositAmountAmd ? ["Manual deposit", `${details.manualDepositAmountAmd.toLocaleString()} ֏${details.receipt ? " · receipt attached" : ""}`] : null,
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
      details.clientInstagram ? `Instagram: @${details.clientInstagram.replace(/^@/, '')}` : null,
      details.manualDepositAmountAmd ? `Manual deposit: ${details.manualDepositAmountAmd.toLocaleString()} ֏${details.receipt ? " · receipt attached" : ""}` : null,
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
    html: `<!doctype html><html><body style="margin:0;background:#F7F5F1;font-family:Arial,sans-serif;color:#17191E;"><div style="max-width:600px;margin:0 auto;padding:36px 24px;"><p style="margin:0 0 8px;color:#A17A2C;font-size:11px;font-weight:700;letter-spacing:2px;">HAIRSTYLE LABORATORY</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:32px;line-height:1.1;">Your booking is confirmed</h1><p style="margin:0 0 8px;font-size:15px;line-height:1.6;">Hello, ${safeName}. Your booking is confirmed. Add the attached invitation to your calendar to keep the visit at hand.</p><p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Ваша запись подтверждена. Добавьте прикреплённое приглашение в календарь, чтобы не забыть о визите.</p><div style="background:#FFFFFF;border:1px solid #E4DED5;padding:24px;"><table style="border-collapse:collapse;width:100%;">${bookingDetailsHtml(details, true)}</table></div><p style="margin:20px 0 0;font-size:14px;"><a href="https://maps.google.com/?q=${encodeURIComponent(ENV.studioAddress)}" target="_blank" style="color:#A17A2C;font-weight:600;text-decoration:underline;">Open studio location in Google Maps →</a></p></div></body></html>`,
  };
}

export function buildBookingRescheduledEmail(details: BookingEmailDetails, previousDate: string, previousTime: string): EmailMessage {
  const safeName = escapeHtml(details.clientName);
  return {
    subject: "Your appointment time has changed — Isaac",
    text: [
      `Hello, ${details.clientName}.`,
      "Your appointment time has been updated.",
      `Previous time: ${previousDate} at ${previousTime}`,
      `New time: ${details.bookingDate} at ${details.bookingTime}`,
      "",
      `Здравствуйте, ${details.clientName}.`,
      "Время вашей записи изменилось.",
      `Прежнее время: ${previousDate} в ${previousTime}`,
      `Новое время: ${details.bookingDate} в ${details.bookingTime}`,
      "",
      bookingDetailsText(details),
      "Isaac",
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#F7F5F1;font-family:Arial,sans-serif;color:#17191E;"><div style="max-width:600px;margin:0 auto;padding:36px 24px;"><p style="margin:0 0 8px;color:#A17A2C;font-size:11px;font-weight:700;letter-spacing:2px;">ISAAC HAKOBIAN</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:32px;line-height:1.1;">Your appointment time has changed</h1><p style="margin:0 0 8px;font-size:15px;line-height:1.6;">Hello, ${safeName}. Your appointment time has been updated.</p><p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Здравствуйте, ${safeName}. Время вашей записи изменилось.</p><div style="background:#FFFFFF;border:1px solid #E4DED5;padding:24px;"><p style="margin:0 0 8px;font-size:13px;color:#6B7280;">Previous / Прежнее</p><p style="margin:0 0 18px;font-size:15px;font-weight:700;">${escapeHtml(previousDate)} · ${escapeHtml(previousTime)}</p><p style="margin:0 0 8px;font-size:13px;color:#6B7280;">New / Новое</p><p style="margin:0 0 18px;font-size:15px;font-weight:700;">${escapeHtml(details.bookingDate)} · ${escapeHtml(details.bookingTime)}</p><table style="border-collapse:collapse;width:100%;">${bookingDetailsHtml(details)}</table></div><p style="margin:26px 0 0;font-size:15px;line-height:1.6;">Isaac</p></div></body></html>`,
  };
}

export function buildBookingCancelledEmail(details: BookingEmailDetails, reason: string, bookingUrl = "https://isaacbarber-axczkyb2.manus.space/booking"): EmailMessage {
  const safeName = escapeHtml(details.clientName);
  const safeReason = escapeHtml(reason);
  const safeBookingUrl = escapeHtml(bookingUrl);
  return {
    subject: "Your appointment has been cancelled — Isaac",
    text: [
      `Hello, ${details.clientName}.`,
      "Your appointment has been cancelled. This time is now available again.",
      `Cancellation reason: ${reason}`,
      "",
      `Здравствуйте, ${details.clientName}.`,
      "Ваша запись отменена. Это время снова стало доступно для записи.",
      `Причина отмены: ${reason}`,
      `Choose a new time / Выбрать новое время: ${bookingUrl}`,
      "",
      bookingDetailsText(details),
      "Isaac",
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#F7F5F1;font-family:Arial,sans-serif;color:#17191E;"><div style="max-width:600px;margin:0 auto;padding:36px 24px;"><p style="margin:0 0 8px;color:#A17A2C;font-size:11px;font-weight:700;letter-spacing:2px;">ISAAC HAKOBIAN</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:32px;line-height:1.1;">Your appointment has been cancelled</h1><p style="margin:0 0 8px;font-size:15px;line-height:1.6;">Hello, ${safeName}. Your appointment has been cancelled. This time is now available again.</p><p style="margin:0 0 20px;font-size:15px;line-height:1.6;">Здравствуйте, ${safeName}. Ваша запись отменена. Это время снова стало доступно для записи.</p><div style="background:#FFFFFF;border:1px solid #E4DED5;padding:24px;"><p style="margin:0 0 8px;font-size:13px;color:#6B7280;">Cancellation reason / Причина отмены</p><p style="margin:0 0 18px;font-size:15px;font-weight:700;">${safeReason}</p><table style="border-collapse:collapse;width:100%;">${bookingDetailsHtml(details)}</table></div><a href="${safeBookingUrl}" style="display:inline-block;margin-top:24px;background:#17191E;color:#FFFFFF;text-decoration:none;padding:14px 20px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Choose a new time / Выбрать новое время</a><p style="margin:26px 0 0;font-size:15px;line-height:1.6;">Isaac</p></div></body></html>`,
  };
}

export function buildBookingStatusRecoveryEmail(recoveryUrl: string): EmailMessage {
  const safeUrl = escapeHtml(recoveryUrl);
  return {
    subject: "Your booking status link — Isaac",
    text: [
      "You requested access to your booking status.",
      `Open your booking status: ${recoveryUrl}`,
      "This private link can be used once and expires in 15 minutes.",
      "",
      "Вы запросили доступ к статусу вашей записи.",
      `Открыть статус записи: ${recoveryUrl}`,
      "Эта приватная ссылка работает один раз и действует 15 минут.",
      "",
      "If you did not request this link, you can ignore this email.",
      "Если вы не запрашивали ссылку, просто проигнорируйте это письмо.",
      "",
      "Isaac",
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#F7F5F1;font-family:Arial,sans-serif;color:#17191E;"><div style="max-width:600px;margin:0 auto;padding:36px 24px;"><p style="margin:0 0 8px;color:#A17A2C;font-size:11px;font-weight:700;letter-spacing:2px;">ISAAC HAKOBIAN</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:32px;line-height:1.1;">Your booking status</h1><p style="margin:0 0 8px;font-size:15px;line-height:1.6;">You requested access to your booking status. Use the private link below.</p><p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Вы запросили доступ к статусу вашей записи. Откройте её по приватной ссылке ниже.</p><a href="${safeUrl}" style="display:inline-block;background:#17191E;color:#FFFFFF;text-decoration:none;padding:14px 20px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Open booking status / Открыть статус</a><p style="margin:24px 0 0;color:#6B7280;font-size:12px;line-height:1.6;">This link works once and expires in 15 minutes. If you did not request it, you can ignore this email.<br>Ссылка работает один раз и действует 15 минут. Если вы её не запрашивали, просто проигнорируйте письмо.</p><p style="margin:20px 0 0;font-size:15px;line-height:1.6;">Isaac</p></div></body></html>`,
  };
}

export function buildBookingDeclinedEmail(details: BookingEmailDetails): EmailMessage {
  const safeName = escapeHtml(details.clientName);
  return {
    subject: "Your booking request could not be confirmed — Isaac",
    text: [`Hello, ${details.clientName}.`, "Unfortunately, I could not confirm this booking request. Please choose another available time.", "", `Здравствуйте, ${details.clientName}.`, "К сожалению, я не смог подтвердить эту заявку. Пожалуйста, выберите другое свободное время.", "", bookingDetailsText(details), "Isaac"].join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#F7F5F1;font-family:Arial,sans-serif;color:#17191E;"><div style="max-width:600px;margin:0 auto;padding:36px 24px;"><p style="margin:0 0 8px;color:#A17A2C;font-size:11px;font-weight:700;letter-spacing:2px;">ISAAC HAKOBIAN</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:32px;line-height:1.1;">Your booking could not be confirmed</h1><p style="margin:0 0 8px;font-size:15px;line-height:1.6;">Hello, ${safeName}. Unfortunately, I could not confirm this booking request. Please choose another available time.</p><p style="margin:0 0 20px;font-size:15px;line-height:1.6;">Здравствуйте, ${safeName}. К сожалению, я не смог подтвердить эту заявку. Пожалуйста, выберите другое свободное время.</p><div style="background:#FFFFFF;border:1px solid #E4DED5;padding:24px;"><table style="border-collapse:collapse;width:100%;">${bookingDetailsHtml(details)}</table></div></div></body></html>`,
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

function renderReviewTemplate(value: string, details: BookingEmailDetails, reviewUrl: string) {
  return value
    .replaceAll("{{clientName}}", details.clientName)
    .replaceAll("{{serviceName}}", details.serviceName)
    .replaceAll("{{bookingDate}}", details.bookingDate)
    .replaceAll("{{bookingTime}}", details.bookingTime)
    .replaceAll("{{reviewUrl}}", reviewUrl);
}

function reviewTemplateHtml(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

export function buildConfiguredReviewRequestEmail(
  details: BookingEmailDetails,
  reviewUrl: string,
  template: ReviewRequestEmailTemplateInput,
): EmailMessage {
  const subjectEn = renderReviewTemplate(template.subjectEn, details, reviewUrl).trim();
  const subjectRu = renderReviewTemplate(template.subjectRu, details, reviewUrl).trim();
  const bodyEn = renderReviewTemplate(template.bodyEn, details, reviewUrl);
  const bodyRu = renderReviewTemplate(template.bodyRu, details, reviewUrl);
  const safeUrl = escapeHtml(reviewUrl);

  return {
    subject: subjectEn || subjectRu || "Thank you for your visit — Isaac",
    text: [bodyEn, bodyRu].filter(Boolean).join("\n\n— — —\n\n"),
    html: `<!doctype html><html><body style="margin:0;background:#F7F5F1;font-family:Arial,sans-serif;color:#17191E;"><div style="max-width:600px;margin:0 auto;padding:36px 24px;"><p style="margin:0 0 8px;color:#A17A2C;font-size:11px;font-weight:700;letter-spacing:2px;">ISAAC HAKOBIAN</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:28px;line-height:1.15;">${escapeHtml(subjectEn || subjectRu)}</h1><p style="margin:0 0 16px;font-size:15px;line-height:1.7;">${reviewTemplateHtml(bodyEn)}</p><p style="margin:0 0 24px;font-size:15px;line-height:1.7;">${reviewTemplateHtml(bodyRu)}</p><a href="${safeUrl}" style="display:inline-block;background:#17191E;color:#FFFFFF;text-decoration:none;padding:14px 20px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Leave feedback / Оставить отзыв</a></div></body></html>`,
  };
}

export function buildRepeatFollowUpEmail(details: BookingEmailDetails, bookingUrl: string): EmailMessage {
  const safeName = escapeHtml(details.clientName);
  const safeUrl = escapeHtml(bookingUrl);
  return {
    subject: "Ready for your next visit? — Isaac",
    text: [
      `Hi, ${details.clientName}.`,
      "It has been a little while since your last visit. If you are ready for another haircut or grooming appointment, I would love to see you again.",
      `Book your next visit: ${bookingUrl}`,
      "",
      "See you soon,",
      "Isaac",
      "",
      `Привет, ${details.clientName}.`,
      "Прошло уже немного времени после вашего последнего визита. Если вы готовы к новой стрижке или уходу, буду рад снова вас видеть.",
      `Записаться на следующий визит: ${bookingUrl}`,
      "",
      "До встречи,",
      "Isaac",
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#F7F5F1;font-family:Arial,sans-serif;color:#17191E;"><div style="max-width:600px;margin:0 auto;padding:36px 24px;"><p style="margin:0 0 8px;color:#A17A2C;font-size:11px;font-weight:700;letter-spacing:2px;">ISAAC HAKOBIAN</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:32px;line-height:1.1;">Ready for your next visit?</h1><p style="margin:0 0 8px;font-size:15px;line-height:1.6;">Hi, ${safeName}.</p><p style="margin:0 0 8px;font-size:15px;line-height:1.6;">It has been a little while since your last visit. If you are ready for another haircut or grooming appointment, I would love to see you again.</p><p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Прошло уже немного времени после вашего последнего визита. Если вы готовы к новой стрижке или уходу, буду рад снова вас видеть.</p><a href="${safeUrl}" style="display:inline-block;background:#17191E;color:#FFFFFF;text-decoration:none;padding:14px 20px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Book your next visit / Записаться</a><p style="margin:26px 0 0;font-size:15px;line-height:1.6;">See you soon,<br><strong>Isaac</strong></p></div></body></html>`,
  };
}

export function buildAppointmentReminderEmail(details: BookingEmailDetails, statusUrl: string, minutesBefore = 1440): EmailMessage {
  const safeName = escapeHtml(details.clientName);
  const safeUrl = escapeHtml(statusUrl);
  const hoursBefore = Math.max(1, Math.round(minutesBefore / 60));
  const englishLead = minutesBefore >= 24 * 60 ? "tomorrow" : `in ${hoursBefore} ${hoursBefore === 1 ? "hour" : "hours"}`;
  const russianLead = minutesBefore >= 24 * 60 ? "завтра" : `примерно через ${hoursBefore} ч.`;
  return {
    subject: `Reminder: your visit is ${englishLead} — Isaac`,
    text: [
      `Hi, ${details.clientName}.`,
      `A friendly reminder that your appointment with me is ${englishLead}.`,
      bookingDetailsText(details),
      `Booking status: ${statusUrl}`,
      "See you soon,",
      "Isaac",
      "",
      `Здравствуйте, ${details.clientName}.`,
      `Напоминаю, что ваша запись ко мне ${russianLead}.`,
      bookingDetailsText(details),
      `Статус записи: ${statusUrl}`,
      "До встречи,",
      "Isaac",
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#F7F5F1;font-family:Arial,sans-serif;color:#17191E;"><div style="max-width:600px;margin:0 auto;padding:36px 24px;"><p style="margin:0 0 8px;color:#A17A2C;font-size:11px;font-weight:700;letter-spacing:2px;">ISAAC HAKOBIAN</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:32px;line-height:1.1;">Your visit is ${englishLead}</h1><p style="margin:0 0 8px;font-size:15px;line-height:1.6;">Hi, ${safeName}. A friendly reminder that your appointment with me is ${englishLead}.</p><p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Напоминаю, что ваша запись ко мне ${russianLead}.</p><div style="background:#FFFFFF;border:1px solid #E4DED5;padding:24px;"><table style="border-collapse:collapse;width:100%;">${bookingDetailsHtml(details)}</table></div><a href="${safeUrl}" style="display:inline-block;margin-top:24px;background:#17191E;color:#FFFFFF;text-decoration:none;padding:14px 20px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Booking status / Статус записи</a><p style="margin:26px 0 0;font-size:15px;line-height:1.6;">See you soon,<br><strong>Isaac</strong></p></div></body></html>`,
  };
}

export function buildWeeklyBookingSummaryEmail(summary: WeeklyBookingSummary): EmailMessage {
  const period = `${summary.start.toLocaleDateString("en-GB", { timeZone: "Asia/Yerevan" })}–${new Date(summary.end.getTime() - 1).toLocaleDateString("en-GB", { timeZone: "Asia/Yerevan" })}`;
  const rows: Array<[string, number]> = [
    ["New requests / Новые заявки", summary.newBookings],
    ["Cancelled / Отменено", summary.cancelledBookings],
    ["Pending now / Ожидают решения", summary.pendingBookings],
    ["Confirmed now / Подтверждено", summary.confirmedBookings],
    ["Completed last week / Завершено за неделю", summary.completedBookings],
  ];
  const textRows = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  const htmlRows = rows.map(([label, value]) => `<tr><td style="padding:9px 14px 9px 0;color:#6B7280;font-size:13px;">${label}</td><td style="padding:9px 0;color:#17191E;font-size:16px;font-weight:700;text-align:right;">${value}</td></tr>`).join("");
  return {
    subject: `Weekly booking summary — ${period}`,
    text: ["Hairstyle Laboratory weekly summary", `Period: ${period}`, "", textRows, "", "Isaac"].join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#F7F5F1;font-family:Arial,sans-serif;color:#17191E;"><div style="max-width:600px;margin:0 auto;padding:36px 24px;"><p style="margin:0 0 8px;color:#A17A2C;font-size:11px;font-weight:700;letter-spacing:2px;">HAIRSTYLE LABORATORY</p><h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:32px;line-height:1.1;">Weekly booking summary</h1><p style="margin:0 0 24px;color:#6B7280;font-size:14px;">${period}</p><div style="background:#FFFFFF;border:1px solid #E4DED5;padding:24px;"><table style="border-collapse:collapse;width:100%;">${htmlRows}</table></div><p style="margin:22px 0 0;color:#6B7280;font-size:12px;">Automatic weekly overview for Isaac.</p></div></body></html>`,
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
      ...(details.receipt ? { attachments: [{ filename: details.receipt.fileName, content: details.receipt.content, contentType: details.receipt.mimeType }] } : {}),
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

export async function sendClientBookingRequestEmail(details: BookingEmailDetails) {
  if (process.env.NODE_ENV === "test" || !details.clientEmail) return { skipped: true } as const;
  const config = getMailTransport();
  if (!config) return { skipped: true } as const;
  const email = buildClientBookingEmail(details);
  return config.transport.sendMail({ from: `Hairstyle Laboratory <${config.user}>`, to: details.clientEmail, replyTo: config.user, subject: email.subject, text: email.text, html: email.html, headers: { "X-Booking-Reference": details.referenceNumber, "X-Booking-Email-Type": "booking-request" } });
}

export async function sendBookingDeclinedEmail(details: BookingEmailDetails) {
  if (process.env.NODE_ENV === "test" || !details.clientEmail) return { skipped: true } as const;
  const config = getMailTransport();
  if (!config) return { skipped: true } as const;
  const email = buildBookingDeclinedEmail(details);
  return config.transport.sendMail({ from: `Hairstyle Laboratory <${config.user}>`, to: details.clientEmail, replyTo: config.user, subject: email.subject, text: email.text, html: email.html, headers: { "X-Booking-Reference": details.referenceNumber, "X-Booking-Email-Type": "booking-declined" } });
}

export async function sendBookingRescheduledEmail(details: BookingEmailDetails, previousDate: string, previousTime: string) {
  if (process.env.NODE_ENV === "test" || !details.clientEmail) return { skipped: true } as const;
  const config = getMailTransport();
  if (!config) return { skipped: true } as const;
  const email = buildBookingRescheduledEmail(details, previousDate, previousTime);
  return config.transport.sendMail({
    from: `Hairstyle Laboratory <${config.user}>`,
    to: details.clientEmail,
    replyTo: config.user,
    subject: email.subject,
    text: email.text,
    html: email.html,
    headers: { "X-Booking-Reference": details.referenceNumber, "X-Booking-Email-Type": "booking-rescheduled" },
  });
}

export async function sendBookingCancelledEmail(details: BookingEmailDetails, reason: string, bookingUrl = "https://isaacbarber-axczkyb2.manus.space/booking") {
  if (process.env.NODE_ENV === "test" || !details.clientEmail) return { skipped: true } as const;
  const config = getMailTransport();
  if (!config) return { skipped: true } as const;
  const email = buildBookingCancelledEmail(details, reason, bookingUrl);
  return config.transport.sendMail({
    from: `Hairstyle Laboratory <${config.user}>`,
    to: details.clientEmail,
    replyTo: config.user,
    subject: email.subject,
    text: email.text,
    html: email.html,
    headers: { "X-Booking-Reference": details.referenceNumber, "X-Booking-Email-Type": "booking-cancelled" },
  });
}

export async function sendBookingStatusRecoveryEmail(clientEmail: string, recoveryUrl: string) {
  if (process.env.NODE_ENV === "test") return { skipped: true } as const;
  const config = getMailTransport();
  if (!config) return { skipped: true } as const;
  const email = buildBookingStatusRecoveryEmail(recoveryUrl);
  return config.transport.sendMail({
    from: `Isaac Hakobian <${config.user}>`,
    to: clientEmail,
    replyTo: config.user,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
}

export async function sendReviewRequestEmail(details: BookingEmailDetails, reviewUrl: string) {
  if (process.env.NODE_ENV === "test" || !details.clientEmail) return { skipped: true } as const;
  const config = getMailTransport();
  if (!config) return { skipped: true } as const;

  const template = await getReviewRequestEmailTemplate();
  const email = buildConfiguredReviewRequestEmail(details, reviewUrl, template);
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

export async function sendAppointmentReminderEmail(details: BookingEmailDetails, statusUrl: string, minutesBefore = 1440) {
  if (process.env.NODE_ENV === "test" || !details.clientEmail) return { skipped: true } as const;
  const config = getMailTransport();
  if (!config) return { skipped: true } as const;
  const email = buildAppointmentReminderEmail(details, statusUrl, minutesBefore);
  return config.transport.sendMail({
    from: `Hairstyle Laboratory <${config.user}>`,
    to: details.clientEmail,
    replyTo: config.user,
    subject: email.subject,
    text: email.text,
    html: email.html,
    headers: { "X-Booking-Reference": details.referenceNumber, "X-Booking-Email-Type": "appointment-reminder", "X-Booking-Reminder-Minutes": String(minutesBefore) },
  });
}

export async function sendWeeklyBookingSummaryEmail(summary: WeeklyBookingSummary) {
  if (process.env.NODE_ENV === "test") return { skipped: true } as const;
  const config = getMailTransport();
  if (!config) return { skipped: true } as const;
  const email = buildWeeklyBookingSummaryEmail(summary);
  return config.transport.sendMail({
    from: `Hairstyle Laboratory <${config.user}>`,
    to: config.user,
    replyTo: config.user,
    subject: email.subject,
    text: email.text,
    html: email.html,
    headers: { "X-Booking-Email-Type": "weekly-summary" },
  });
}

export async function sendRepeatFollowUpEmail(details: BookingEmailDetails, bookingUrl: string) {
  if (process.env.NODE_ENV === "test" || !details.clientEmail) return { skipped: true } as const;
  const config = getMailTransport();
  if (!config) return { skipped: true } as const;

  const email = buildRepeatFollowUpEmail(details, bookingUrl);
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

export type CrmBroadcastContent = {
  clientName: string;
  subjectRu: string;
  subjectEn: string;
  bodyRu: string;
  bodyEn: string;
  imageUrl?: string | null;
  actionUrl?: string | null;
  actionLabelRu?: string | null;
  actionLabelEn?: string | null;
};

function renderCrmVariables(value: string, content: CrmBroadcastContent) {
  return value
    .replaceAll("{{clientName}}", content.clientName)
    .replaceAll("{{bookingUrl}}", content.actionUrl || "");
}

export function buildCrmBroadcastEmail(content: CrmBroadcastContent): EmailMessage {
  const bodyEn = renderCrmVariables(content.bodyEn, content);
  const bodyRu = renderCrmVariables(content.bodyRu, content);
  const subjectEn = renderCrmVariables(content.subjectEn, content);
  const subjectRu = renderCrmVariables(content.subjectRu, content);
  const safeName = escapeHtml(content.clientName);
  const subject = subjectEn.trim() || subjectRu.trim() || "A note from Isaac";
  const actionUrl = content.actionUrl ? escapeHtml(content.actionUrl) : null;
  const campaignImageUrl = content.imageUrl?.startsWith("/manus-storage/") ? `https://isaacbarber-axczkyb2.manus.space${content.imageUrl}` : null;
  const banner = campaignImageUrl ? `<img src="${escapeHtml(campaignImageUrl)}" alt="" style="display:block;width:100%;max-width:552px;height:auto;margin:0 0 24px;border:0;" />` : "";
  const action = actionUrl ? `<a href="${actionUrl}" style="display:inline-block;margin-top:8px;background:#17191E;color:#FFFFFF;text-decoration:none;padding:14px 20px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(content.actionLabelEn || content.actionLabelRu || "Open / Открыть")}</a>` : "";
  return {
    subject,
    text: [`Hi, ${content.clientName}.`, bodyEn, campaignImageUrl ? `Campaign image: ${campaignImageUrl}` : "", content.actionUrl ? `${content.actionLabelEn || "Open"}: ${content.actionUrl}` : "", "", `Здравствуйте, ${content.clientName}.`, bodyRu, content.actionUrl ? `${content.actionLabelRu || "Открыть"}: ${content.actionUrl}` : "", "", "Isaac"].filter(Boolean).join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#F7F5F1;font-family:Arial,sans-serif;color:#17191E;"><div style="max-width:600px;margin:0 auto;padding:36px 24px;"><p style="margin:0 0 8px;color:#A17A2C;font-size:11px;font-weight:700;letter-spacing:2px;">ISAAC HAKOBIAN</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:32px;line-height:1.1;">${escapeHtml(subject)}</h1>${banner}<p style="margin:0 0 8px;font-size:15px;line-height:1.7;">Hi, ${safeName}.</p><p style="margin:0 0 16px;font-size:15px;line-height:1.7;">${reviewTemplateHtml(bodyEn)}</p><p style="margin:0 0 24px;font-size:15px;line-height:1.7;">${reviewTemplateHtml(bodyRu)}</p>${action}<p style="margin:26px 0 0;font-size:15px;line-height:1.6;">See you soon,<br><strong>Isaac</strong></p></div></body></html>`,
  };
}

export type CrmTemplateInput = {
  subjectRu: string;
  subjectEn: string;
  bodyRu: string;
  bodyEn: string;
};

export function buildConfiguredPostVisitEmail(clientName: string, bookingUrl: string, template: CrmTemplateInput): EmailMessage {
  const subjectEn = template.subjectEn.replaceAll("{{clientName}}", clientName).replaceAll("{{bookingUrl}}", bookingUrl).trim();
  const subjectRu = template.subjectRu.replaceAll("{{clientName}}", clientName).replaceAll("{{bookingUrl}}", bookingUrl).trim();
  const bodyEn = template.bodyEn.replaceAll("{{clientName}}", clientName).replaceAll("{{bookingUrl}}", bookingUrl);
  const bodyRu = template.bodyRu.replaceAll("{{clientName}}", clientName).replaceAll("{{bookingUrl}}", bookingUrl);
  return buildCrmBroadcastEmail({
    clientName,
    subjectRu: subjectRu || subjectEn || "Как вам результат? — Isaac",
    subjectEn: subjectEn || subjectRu || "How are you liking the result? — Isaac",
    bodyRu,
    bodyEn,
    actionUrl: bookingUrl,
    actionLabelRu: "Выбрать новое время",
    actionLabelEn: "Choose a new time",
  });
}

export function buildConfiguredBirthdayEmail(clientName: string, bookingUrl: string, template: CrmTemplateInput): EmailMessage {
  const subjectEn = template.subjectEn.replaceAll("{{clientName}}", clientName).replaceAll("{{bookingUrl}}", bookingUrl).trim();
  const subjectRu = template.subjectRu.replaceAll("{{clientName}}", clientName).replaceAll("{{bookingUrl}}", bookingUrl).trim();
  const bodyEn = template.bodyEn.replaceAll("{{clientName}}", clientName).replaceAll("{{bookingUrl}}", bookingUrl);
  const bodyRu = template.bodyRu.replaceAll("{{clientName}}", clientName).replaceAll("{{bookingUrl}}", bookingUrl);
  return buildCrmBroadcastEmail({
    clientName,
    subjectRu: subjectRu || subjectEn || "С днём рождения — Isaac",
    subjectEn: subjectEn || subjectRu || "Happy birthday — Isaac",
    bodyRu,
    bodyEn,
    actionUrl: bookingUrl,
    actionLabelRu: "Записаться",
    actionLabelEn: "Book a visit",
  });
}

export function buildPostVisitCheckInEmail(clientName: string, bookingUrl: string): EmailMessage {
  return buildCrmBroadcastEmail({
    clientName,
    subjectRu: "Как вам результат? — Isaac",
    subjectEn: "How are you liking the result? — Isaac",
    bodyRu: "Прошло две недели после вашего визита. Надеюсь, вам нравится форма и результат. Если захотите обновить стрижку или бороду, я буду рад снова вас видеть.",
    bodyEn: "It has been two weeks since your visit. I hope you are enjoying the shape and the result. If you feel ready for a refresh, I would be happy to see you again.",
    actionUrl: bookingUrl,
    actionLabelRu: "Выбрать новое время",
    actionLabelEn: "Choose a new time",
  });
}

export function buildBirthdayGreetingEmail(clientName: string, bookingUrl: string): EmailMessage {
  return buildCrmBroadcastEmail({
    clientName,
    subjectRu: "С днём рождения — Isaac",
    subjectEn: "Happy birthday — Isaac",
    bodyRu: "Поздравляю вас с днём рождения! Желаю хорошего года, уверенности и людей, рядом с которыми легко быть собой. Если захотите обновить образ, буду рад видеть вас.",
    bodyEn: "Happy birthday. I wish you a strong year, confidence, and people around you who make it easy to be yourself. If you feel like refreshing your look, I would be happy to see you.",
    actionUrl: bookingUrl,
    actionLabelRu: "Записаться",
    actionLabelEn: "Book a visit",
  });
}

export async function sendCrmEmail(recipientEmail: string, email: EmailMessage, notificationType: string) {
  if (process.env.NODE_ENV === "test") return { skipped: true } as const;
  const config = getMailTransport();
  if (!config) return { skipped: true } as const;
  return config.transport.sendMail({
    from: `Isaac Hakobian <${config.user}>`,
    to: recipientEmail,
    replyTo: config.user,
    subject: email.subject,
    text: email.text,
    html: email.html,
    headers: { "X-CRM-Email-Type": notificationType },
  });
}
