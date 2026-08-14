export type SupportedLanguage = 'ru' | 'en';

const GMAIL_DAILY_LIMIT_PATTERN = /(?:550[- ]?5\.4\.5|daily user sending limit exceeded|sending limit exceeded)/i;

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
