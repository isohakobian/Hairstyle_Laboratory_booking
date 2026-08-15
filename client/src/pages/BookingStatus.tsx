import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import type { Language } from '@/contexts/LanguageContext';

const copy: Record<Language, any> = {
  ru: {
    title: 'Статус заявки', sub: 'Введите номер заявки', label: 'Номер заявки',
    placeholder: 'Например: AB12CD', search: 'Проверить', back: '← Назад',
    notFound: 'Заявка не найдена. Проверьте номер.', statusLabel: 'Статус',
    service: 'Услуга', date: 'Дата', time: 'Время', name: 'Имя',
    pending: 'Ожидание подтверждения мастером', confirmed: 'Подтверждено', declined: 'Отклонено', cancelled: 'Отменено клиентом', bookAnother: 'Записаться снова',
    forgot: 'Не помните номер заявки?', recoveryHint: 'Введите email, указанный при записи. На него придёт одноразовая ссылка для просмотра статуса.',
    recover: 'Отправить ссылку', phone: 'Телефон', email: 'Email', recoveryTitle: 'Ваши записи', recoveryEmpty: 'Записей с такими данными не найдено.', open: 'Открыть', recoverySent: 'Если этот email есть в записи, ссылка уже отправлена. Проверьте входящие.', recoveryInvalid: 'Ссылка недействительна, истекла или уже была использована.', cancel: 'Отменить запись', cancelTitle: 'Отмена записи', cancelHint: 'Укажите e-mail, который использовали при записи, и коротко напишите причину. Время сразу освободится.', cancelReason: 'Причина отмены', cancelReasonPlaceholder: 'Например: изменились планы', cancelSubmit: 'Подтвердить отмену', cancelSuccess: 'Запись отменена. Спасибо, что предупредили.', cancelError: 'Не удалось отменить запись. Проверьте номер заявки и e-mail.', cancelBack: 'Не отменять',
  },
  en: {
    title: 'Booking Status', sub: 'Enter your reference number', label: 'Reference number',
    placeholder: 'e.g. AB12CD', search: 'Check', back: '← Back',
    notFound: 'Booking not found. Check your reference number.', statusLabel: 'Status',
    service: 'Service', date: 'Date', time: 'Time', name: 'Name',
    pending: 'Awaiting stylist confirmation', confirmed: 'Confirmed', declined: 'Declined', cancelled: 'Cancelled by client', bookAnother: 'Book again',
    forgot: 'Forgot your reference number?', recoveryHint: 'Enter the email used for your booking. A one-time link to view your status will be sent there.',
    recover: 'Send link', phone: 'Phone', email: 'Email', recoveryTitle: 'Your bookings', recoveryEmpty: 'No bookings were found with these details.', open: 'Open', recoverySent: 'If this email is attached to a booking, a link has been sent. Check your inbox.', recoveryInvalid: 'This link is invalid, expired, or has already been used.', cancel: 'Cancel booking', cancelTitle: 'Cancel booking', cancelHint: 'Enter the email used for the booking and briefly tell me why. The time will be released immediately.', cancelReason: 'Cancellation reason', cancelReasonPlaceholder: 'For example: my plans changed', cancelSubmit: 'Confirm cancellation', cancelSuccess: 'Your booking has been cancelled. Thank you for letting me know.', cancelError: 'The booking could not be cancelled. Check the reference number and email.', cancelBack: 'Keep booking',
  },
};

const statusColors: Record<string, string> = {
  pending: 'hsl(35, 60%, 50%)',
  confirmed: 'hsl(142, 50%, 40%)',
  declined: 'hsl(0, 60%, 50%)',
  cancelled: 'hsl(0, 0%, 48%)',
};

export default function BookingStatus() {
  const { language } = useLanguage() as { language: Language };
  const [, setLocation] = useLocation();
  const c = copy[language] ?? copy.ru;
  const initialReference = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('ref')?.toUpperCase() ?? '';
  const [referenceInput, setReferenceInput] = useState(initialReference);
  const [searchRef, setSearchRef] = useState(initialReference);
  const [searched, setSearched] = useState(Boolean(initialReference));
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const initialRecoveryToken = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('recovery') ?? '';
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveredBookings, setRecoveredBookings] = useState<{ referenceNumber: string; serviceSummary: string; serviceName: string; bookingDate: string; bookingTime: string; status: string }[]>([]);
  const [recoveryError, setRecoveryError] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelEmail, setCancelEmail] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState(false);

  const { data: booking, isLoading, refetch } = trpc.bookings.getByReference.useQuery(
    { referenceNumber: searchRef.toUpperCase() },
    { enabled: !!searchRef }
  );
  const requestRecoveryMutation = trpc.bookings.requestStatusRecovery.useMutation();
  const redeemRecoveryMutation = trpc.bookings.recoverStatus.useMutation();
  const cancelBookingMutation = trpc.bookings.cancelByClient.useMutation();

  useEffect(() => {
    if (!initialRecoveryToken) return;
    redeemRecoveryMutation.mutate({ token: initialRecoveryToken }, {
      onSuccess: (data) => setRecoveredBookings(data),
      onError: () => setRecoveryError(true),
    });
  // The token comes from the initial URL and must only be redeemed once per page load.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRecoveryToken]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceInput.trim()) return;
    setSearchRef(referenceInput.trim());
    setSearched(true);
  };

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;
    requestRecoveryMutation.mutate({ clientEmail: recoveryEmail.trim().toLowerCase() }, {
      onSuccess: () => setRecoverySent(true),
    });
  };

  const openRecoveredBooking = (referenceNumber: string) => {
    setReferenceInput(referenceNumber);
    setSearchRef(referenceNumber);
    setSearched(true);
    setShowRecovery(false);
  };

  const statusLabel = (s: string) => ({ pending: c.pending, confirmed: c.confirmed, declined: c.declined, cancelled: c.cancelled }[s] ?? s);

  const handleCancel = (event: React.FormEvent) => {
    event.preventDefault();
    if (!booking || !cancelEmail.trim() || cancelReason.trim().length < 3) return;
    cancelBookingMutation.mutate({ referenceNumber: booking.referenceNumber, clientEmail: cancelEmail.trim().toLowerCase(), reason: cancelReason.trim() }, {
      onSuccess: async () => { setCancelSuccess(true); setCancelOpen(false); await refetch(); },
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.875rem 0', backgroundColor: 'transparent',
    border: 'none', borderBottom: '1px solid hsl(var(--border))',
    fontFamily: "'Inter', sans-serif", fontSize: '0.9375rem',
    color: 'hsl(var(--foreground))', outline: 'none', letterSpacing: '0.1em',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))' }}>
      <div className="container" style={{ maxWidth: '36rem', margin: '0 auto', paddingTop: '6rem', paddingBottom: '6rem' }}>
        <button onClick={() => setLocation('/')} style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '3rem', transition: 'color 200ms ease' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'hsl(var(--foreground))')}
          onMouseLeave={e => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}>
          {c.back}
        </button>
        <div style={{ marginBottom: '3rem' }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>Hairstyle Laboratory</p>
          <h2 style={{ fontStyle: 'italic', marginBottom: '0.5rem' }}>{c.title}</h2>
          <p style={{ margin: 0 }}>{c.sub}</p>
        </div>
        <form onSubmit={handleSearch} style={{ marginBottom: '3rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>{c.label}</p>
            <input type="text" value={referenceInput} onChange={e => setReferenceInput(e.target.value.toUpperCase())} placeholder={c.placeholder} style={inputStyle} autoComplete="off" />
          </div>
          <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.875rem 2.5rem', backgroundColor: 'hsl(var(--foreground))', color: 'hsl(var(--background))', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', width: '100%' }}>
            {c.search}
          </button>
        </form>
        <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1.25rem', marginBottom: '3rem' }}>
          <button type="button" onClick={() => setShowRecovery((open) => !open)} style={{ padding: 0, background: 'none', border: 'none', color: 'var(--gold-mid)', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
            {c.forgot}
          </button>
          {showRecovery && (
            <form onSubmit={handleRecovery} style={{ marginTop: '1rem', padding: '1.25rem', border: '1px solid hsl(var(--border))' }}>
              <p style={{ margin: '0 0 1rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem', lineHeight: 1.5 }}>{c.recoveryHint}</p>
              <input value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder={c.email} style={{ ...inputStyle, marginBottom: '1rem' }} autoComplete="email" />
              <button type="submit" style={{ width: '100%', padding: '0.75rem 1rem', background: 'transparent', border: '1px solid hsl(var(--foreground))', color: 'hsl(var(--foreground))', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{c.recover}</button>
              {requestRecoveryMutation.isPending && <p style={{ margin: '1rem 0 0', color: 'hsl(var(--muted-foreground))' }}>...</p>}
              {recoverySent && <p style={{ margin: '1rem 0 0', color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem', lineHeight: 1.5 }}>{c.recoverySent}</p>}
            </form>
          )}
        </div>
        {initialRecoveryToken && redeemRecoveryMutation.isPending && <p style={{ color: 'hsl(var(--muted-foreground))', textAlign: 'center' }}>...</p>}
        {recoveryError && <p style={{ color: 'hsl(var(--muted-foreground))', textAlign: 'center', marginBottom: '2rem' }}>{c.recoveryInvalid}</p>}
        {recoveredBookings.length > 0 && (
          <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1.5rem', marginBottom: '3rem' }}>
            <p className="label-caps" style={{ marginBottom: '1rem' }}>{c.recoveryTitle}</p>
            {recoveredBookings.map((item) => (
              <button key={item.referenceNumber} type="button" onClick={() => openRecoveredBooking(item.referenceNumber)} style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', padding: '0.875rem 0', background: 'none', border: 'none', borderBottom: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', cursor: 'pointer' }}>
                <span><strong style={{ display: 'block', fontSize: '0.875rem' }}>{item.serviceSummary || item.serviceName}</strong><span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{item.bookingDate} · {item.bookingTime}</span></span>
                <span className="label-caps" style={{ color: 'var(--gold-mid)' }}>{c.open}</span>
              </button>
            ))}
          </div>
        )}
        {isLoading && <p style={{ color: 'hsl(var(--muted-foreground))', textAlign: 'center' }}>...</p>}
        {searched && !isLoading && !booking && (
          <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'hsl(var(--muted-foreground))' }}>{c.notFound}</p>
          </div>
        )}
        {booking && (
          <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', margin: 0 }}>{c.statusLabel}</p>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: statusColors[booking.status] ?? 'hsl(var(--foreground))', padding: '0.25rem 0.75rem', border: `1px solid ${statusColors[booking.status] ?? 'hsl(var(--border))'}` }}>
                {statusLabel(booking.status)}
              </span>
            </div>
            {[{ label: c.service, value: booking.serviceName }, { label: c.date, value: booking.bookingDate }, { label: c.time, value: booking.bookingTime }, { label: c.name, value: booking.clientName }].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.875rem 0', borderBottom: '1px solid hsl(var(--border))' }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', margin: 0 }}>{row.label}</p>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.125rem', color: 'hsl(var(--foreground))', margin: 0 }}>{row.value}</p>
              </div>
            ))}
            {(booking.status === 'pending' || booking.status === 'confirmed') && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid hsl(var(--border))' }}>
                {!cancelOpen ? <button type="button" onClick={() => setCancelOpen(true)} style={{ padding: 0, border: 'none', background: 'transparent', color: 'hsl(0, 60%, 50%)', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>{c.cancel}</button> : (
                  <form onSubmit={handleCancel} style={{ padding: '1rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--secondary))' }}>
                    <p className="label-caps" style={{ margin: '0 0 0.6rem', color: 'hsl(0, 60%, 50%)' }}>{c.cancelTitle}</p>
                    <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.5 }}>{c.cancelHint}</p>
                    <input type="email" value={cancelEmail} onChange={event => setCancelEmail(event.target.value)} placeholder={c.email} style={{ ...inputStyle, marginBottom: '0.85rem' }} autoComplete="email" />
                    <textarea value={cancelReason} onChange={event => setCancelReason(event.target.value)} placeholder={c.cancelReasonPlaceholder} aria-label={c.cancelReason} rows={3} style={{ ...inputStyle, resize: 'vertical', marginBottom: '0.85rem' }} />
                    <div style={{ display: 'flex', gap: '0.65rem' }}><button type="submit" disabled={cancelBookingMutation.isPending || cancelReason.trim().length < 3 || !cancelEmail.trim()} style={{ flex: 1, padding: '0.7rem', border: '1px solid hsl(0, 60%, 50%)', background: 'hsl(0, 60%, 50%)', color: 'white', fontFamily: "'Inter', sans-serif", fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>{cancelBookingMutation.isPending ? '…' : c.cancelSubmit}</button><button type="button" onClick={() => setCancelOpen(false)} style={{ padding: '0.7rem', border: '1px solid hsl(var(--border))', background: 'transparent', color: 'hsl(var(--foreground))', fontFamily: "'Inter', sans-serif", fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>{c.cancelBack}</button></div>
                    {cancelBookingMutation.isError && <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', color: 'hsl(0, 60%, 50%)' }}>{c.cancelError}</p>}
                  </form>
                )}
                {cancelSuccess && <p style={{ margin: '0.85rem 0 0', fontSize: '0.8125rem', color: 'hsl(142, 50%, 40%)' }}>{c.cancelSuccess}</p>}
              </div>
            )}
            <div style={{ marginTop: '2.5rem' }}>
              <button onClick={() => setLocation('/booking')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.875rem 2.5rem', backgroundColor: 'transparent', color: 'hsl(var(--foreground))', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid hsl(var(--foreground))', cursor: 'pointer', width: '100%', transition: 'background-color 200ms ease, color 200ms ease' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'hsl(var(--foreground))'; e.currentTarget.style.color = 'hsl(var(--background))'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'hsl(var(--foreground))'; }}>
                {c.bookAnother}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
