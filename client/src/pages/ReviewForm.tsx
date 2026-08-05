import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

const copy = {
  ru: {
    title: 'Оставить отзыв',
    sub: 'Введите номер заявки для подтверждения',
    refLabel: 'Номер заявки',
    refPlaceholder: 'Например: AB12CD',
    ratingLabel: 'Оценка',
    textLabel: 'Комментарий (необязательно)',
    textPlaceholder: 'Расскажите о вашем опыте...',
    submit: 'Отправить отзыв',
    back: '← Назад',
    successTitle: 'Спасибо за отзыв',
    successSub: 'Отзыв будет опубликован после проверки.',
    backHome: 'На главную',
    errors: {
      ref: 'Введите номер заявки',
      rating: 'Выберите оценку',
      notFound: 'Заявка не найдена',
      notConfirmed: 'Отзыв можно оставить только для подтверждённой записи',
      alreadySubmitted: 'Отзыв уже был отправлен',
      generic: 'Ошибка. Попробуйте ещё раз.',
    },
  },
  en: {
    title: 'Leave a review',
    sub: 'Enter your reference number to confirm',
    refLabel: 'Reference number',
    refPlaceholder: 'e.g. AB12CD',
    ratingLabel: 'Rating',
    textLabel: 'Comment (optional)',
    textPlaceholder: 'Tell us about your experience...',
    submit: 'Submit review',
    back: '← Back',
    successTitle: 'Thank you for your review',
    successSub: 'Your review will be published after moderation.',
    backHome: 'Back to home',
    errors: {
      ref: 'Enter your reference number',
      rating: 'Select a rating',
      notFound: 'Booking not found',
      notConfirmed: 'Reviews can only be submitted for confirmed bookings',
      alreadySubmitted: 'Review already submitted',
      generic: 'Error. Please try again.',
    },
  },
};

export default function ReviewForm() {
  const { language } = useLanguage() as { language: 'ru' | 'en' };
  const [, setLocation] = useLocation();
  const c = copy[language] ?? copy.ru;

  const [referenceNumber, setReferenceNumber] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.reviews.submit.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e) => {
      const msg = e.message.includes('not found') ? c.errors.notFound
        : e.message.includes('confirmed') ? c.errors.notConfirmed
        : e.message.includes('already') ? c.errors.alreadySubmitted
        : c.errors.generic;
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceNumber.trim()) { toast.error(c.errors.ref); return; }
    if (!rating) { toast.error(c.errors.rating); return; }
    submitMutation.mutate({
      referenceNumber: referenceNumber.trim().toUpperCase(),
      rating,
      text: text.trim() || undefined,
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.875rem 0', backgroundColor: 'transparent',
    border: 'none', borderBottom: '1px solid hsl(var(--border))',
    fontFamily: "'Inter', sans-serif", fontSize: '0.9375rem',
    color: 'hsl(var(--foreground))', outline: 'none',
  };

  if (submitted) return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', display: 'flex', alignItems: 'center' }}>
      <div className="container" style={{ maxWidth: '32rem', margin: '0 auto', textAlign: 'center', padding: '4rem 1.5rem' }}>
        <div style={{ width: '3rem', height: '3rem', border: '1px solid var(--gold-mid)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2.5rem' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <polyline points="3,8 7,12 13,4" stroke="var(--gold-mid)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 style={{ fontStyle: 'italic', marginBottom: '1rem' }}>{c.successTitle}</h2>
        <p style={{ marginBottom: '3rem' }}>{c.successSub}</p>
        <button className="btn-primary" onClick={() => setLocation('/')}>{c.backHome}</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))' }}>
      <div className="container" style={{ maxWidth: '36rem', margin: '0 auto', paddingTop: '6rem', paddingBottom: '6rem' }}>
        <button onClick={() => setLocation('/')} style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '3rem' }}>
          {c.back}
        </button>

        <div style={{ marginBottom: '3rem' }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold-mid)', marginBottom: '1rem' }}>
            Hairstyle Laboratory
          </p>
          <h2 style={{ fontStyle: 'italic', marginBottom: '0.5rem' }}>{c.title}</h2>
          <p style={{ margin: 0 }}>{c.sub}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>
              {c.refLabel}
            </p>
            <input
              type="text"
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value.toUpperCase())}
              placeholder={c.refPlaceholder}
              style={inputStyle}
              autoComplete="off"
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>
              {c.ratingLabel}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
                    fontSize: '2rem', lineHeight: 1,
                    color: star <= (hoverRating || rating) ? 'var(--gold-mid)' : 'hsl(var(--border))',
                    transition: 'color 150ms ease',
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '3rem' }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>
              {c.textLabel}
            </p>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={c.textPlaceholder}
              rows={3}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submitMutation.isPending}>
            {submitMutation.isPending ? '...' : c.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
