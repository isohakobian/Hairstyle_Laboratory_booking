import { useState } from 'react';
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
    pending: 'Ожидание', confirmed: 'Подтверждено', declined: 'Отклонено', bookAnother: 'Записаться снова',
  },
  en: {
    title: 'Booking Status', sub: 'Enter your reference number', label: 'Reference number',
    placeholder: 'e.g. AB12CD', search: 'Check', back: '← Back',
    notFound: 'Booking not found. Check your reference number.', statusLabel: 'Status',
    service: 'Service', date: 'Date', time: 'Time', name: 'Name',
    pending: 'Pending', confirmed: 'Confirmed', declined: 'Declined',     bookAnother: 'Book again',
  },
};

const statusColors: Record<string, string> = {
  pending: 'hsl(35, 60%, 50%)',
  confirmed: 'hsl(142, 50%, 40%)',
  declined: 'hsl(0, 60%, 50%)',
};

export default function BookingStatus() {
  const { language } = useLanguage() as { language: Language };
  const [, setLocation] = useLocation();
  const c = copy[language] ?? copy.ru;
  const [referenceInput, setReferenceInput] = useState('');
  const [searchRef, setSearchRef] = useState('');
  const [searched, setSearched] = useState(false);

  const { data: booking, isLoading } = trpc.bookings.getByReference.useQuery(
    { referenceNumber: searchRef.toUpperCase() },
    { enabled: !!searchRef }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceInput.trim()) return;
    setSearchRef(referenceInput.trim());
    setSearched(true);
  };

  const statusLabel = (s: string) => ({ pending: c.pending, confirmed: c.confirmed, declined: c.declined }[s] ?? s);

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
