import { describe, expect, it } from 'vitest';
import { getDeliveryErrorDetails, getReviewRequestErrorMessage } from './emailDeliveryError';

describe('getReviewRequestErrorMessage', () => {
  it('explains the Gmail daily sending limit without exposing technical SMTP text', () => {
    const message = getReviewRequestErrorMessage('550-5.4.5 Daily user sending limit exceeded', 'ru');

    expect(message).toContain('Gmail временно ограничил отправку писем');
    expect(message).not.toContain('550');
    expect(message).not.toContain('SMTP');
  });

  it('uses a clear generic fallback when the delivery error is unrelated to Gmail quota', () => {
    expect(getReviewRequestErrorMessage('connection reset', 'en'))
      .toBe('The review request could not be sent. Please try again later.');
  });

  it('classifies an unavailable recipient and a full mailbox with practical explanations', () => {
    expect(getDeliveryErrorDetails('550 5.1.1 User unknown', 'ru')).toMatchObject({ category: 'invalid-address', title: 'Неверный или недоступный адрес' });
    expect(getDeliveryErrorDetails('552 5.2.2 Mailbox full', 'en')).toMatchObject({ category: 'mailbox-full', title: 'Client mailbox is full' });
  });
});
