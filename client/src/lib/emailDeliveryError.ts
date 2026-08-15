export type SupportedLanguage = 'ru' | 'en';

export type DeliveryErrorCategory = 'invalid-address' | 'mailbox-full' | 'sending-limit' | 'authentication' | 'connection' | 'other';

export type DeliveryErrorDetails = {
  category: DeliveryErrorCategory;
  title: string;
  description: string;
};

const GMAIL_DAILY_LIMIT_PATTERN = /(?:550[- ]?5\.4\.5|daily user sending limit exceeded|sending limit exceeded)/i;
const INVALID_ADDRESS_PATTERN = /(?:5\.1\.1|user unknown|mailbox unavailable|recipient address rejected|invalid recipient|address not found|no such user)/i;
const MAILBOX_FULL_PATTERN = /(?:5\.2\.2|mailbox full|mailbox is full|quota exceeded|over quota)/i;
const AUTHENTICATION_PATTERN = /(?:535|authentication failed|invalid login|username and password not accepted)/i;
const CONNECTION_PATTERN = /(?:econnreset|etimedout|enotfound|connection (?:reset|timeout|refused)|network error)/i;

export function getDeliveryErrorDetails(errorMessage: string | null | undefined, language: SupportedLanguage): DeliveryErrorDetails {
  const message = errorMessage ?? '';
  if (INVALID_ADDRESS_PATTERN.test(message)) return language === 'ru'
    ? { category: 'invalid-address', title: 'Неверный или недоступный адрес', description: 'Почтовый сервер не нашёл этот адрес или отклонил получателя. Проверьте email клиента.' }
    : { category: 'invalid-address', title: 'Invalid or unavailable address', description: 'The mail server could not find this address or rejected the recipient. Check the client’s email.' };
  if (MAILBOX_FULL_PATTERN.test(message)) return language === 'ru'
    ? { category: 'mailbox-full', title: 'Ящик клиента переполнен', description: 'У получателя недостаточно места для нового письма. Попросите освободить место или указать другой адрес.' }
    : { category: 'mailbox-full', title: 'Client mailbox is full', description: 'The recipient has no space for a new email. Ask them to free space or provide another address.' };
  if (GMAIL_DAILY_LIMIT_PATTERN.test(message)) return language === 'ru'
    ? { category: 'sending-limit', title: 'Временный лимит Gmail', description: 'Gmail временно ограничил исходящие письма. Повторите отправку позже.' }
    : { category: 'sending-limit', title: 'Temporary Gmail limit', description: 'Gmail has temporarily limited outgoing email. Try resending later.' };
  if (AUTHENTICATION_PATTERN.test(message)) return language === 'ru'
    ? { category: 'authentication', title: 'Ошибка доступа к Gmail', description: 'Сервис не смог войти в почтовый аккаунт. Проверьте настройки Gmail App Password.' }
    : { category: 'authentication', title: 'Gmail authentication error', description: 'The service could not sign in to the mailbox. Check the Gmail App Password settings.' };
  if (CONNECTION_PATTERN.test(message)) return language === 'ru'
    ? { category: 'connection', title: 'Временная ошибка соединения', description: 'Соединение с почтовым сервером было прервано. Можно безопасно повторить отправку.' }
    : { category: 'connection', title: 'Temporary connection error', description: 'The connection to the mail server was interrupted. It is safe to retry delivery.' };
  return language === 'ru'
    ? { category: 'other', title: 'Письмо не доставлено', description: 'Почтовый сервер отклонил отправку по другой причине. Откройте технические сведения ниже для диагностики.' }
    : { category: 'other', title: 'Email was not delivered', description: 'The mail server rejected delivery for another reason. Open the technical details below for diagnosis.' };
}

export function getReviewRequestErrorMessage(errorMessage: string, language: SupportedLanguage): string {
  if (GMAIL_DAILY_LIMIT_PATTERN.test(errorMessage)) {
    return language === 'ru'
      ? 'Gmail временно ограничил отправку писем. Попробуйте позже — запрос не был отправлен.'
      : 'Gmail has temporarily limited outgoing email. Please try again later — the request was not sent.';
  }

  return language === 'ru'
    ? 'Не удалось отправить запрос на отзыв. Попробуйте ещё раз позже.'
    : 'The review request could not be sent. Please try again later.';
}
