import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

type Lang = 'ru' | 'en';

const copy: Record<Lang, {
  title: string;
  sub: string;
  selectService: string;
  selectDate: string;
  selectTime: string;
  name: string;
  phone: string;
  email: string;
  comment: string;
  submit: string;
  back: string;
  sentTitle: string;
  sentSub: string;
  statusLabel: string;
  refLabel: string;
  checkStatus: string;
  backHome: string;
  haircut: string;
  beard: string;
  bioPerm: string;
  deposit: string;
  errors: {
    service: string;
    date: string;
    time: string;
    name: string;
    phone: string;
    email: string;
    conflict: string;
    generic: string;
  };
}> = {
  ru: {
    title: 'Запись',
    sub: 'Выберите услугу, дату и время',
    selectService: 'Услуга',
    selectDate: 'Дата',
    selectTime: 'Время',
    name: 'Ваше имя',
    phone: 'Телефон / WhatsApp',
    email: 'Email для подтверждения',
    comment: 'Комментарий (необязательно)',
    submit: 'Отправить заявку',
    back: '← Назад',
    sentTitle: 'Заявка отправлена',
    sentSub: 'Ожидает подтверждения Isaac.',
    statusLabel: 'Статус: ожидание',
    refLabel: 'Номер заявки',
    checkStatus: 'Проверить статус',
    backHome: 'На главную',
    haircut: 'Стрижка',
    beard: 'Моделирование бороды',
    bioPerm: 'Биохимическая завивка',
    deposit: 'Предоплата',
    errors: {
      service: 'Выберите услугу',
      date: 'Выберите дату',
      time: 'Выберите время',
      name: 'Введите ваше имя',
      phone: 'Введите номер телефона',
      email: 'Введите корректный email',
      conflict: 'Это время уже занято',
      generic: 'Ошибка. Попробуйте ещё раз.',
    },
  },
  en: {
    title: 'Booking',
    sub: 'Select service, date and time',
    selectService: 'Service',
    selectDate: 'Date',
    selectTime: 'Time',
    name: 'Your name',
    phone: 'Phone / WhatsApp',
    email: 'Confirmation email',
    comment: 'Comment (optional)',
    submit: 'Submit booking',
    back: '← Back',
    sentTitle: 'Request sent',
    sentSub: 'Waiting for Isaac\'s confirmation.',
    statusLabel: 'Status: pending',
    refLabel: 'Reference number',
    checkStatus: 'Check status',
    backHome: 'Back to home',
    haircut: 'Haircut',
    beard: 'Beard modeling',
    bioPerm: 'Bio Perm',
    deposit: 'Deposit',
    errors: {
      service: 'Select a service',
      date: 'Select a date',
      time: 'Select a time',
      name: 'Enter your name',
      phone: 'Enter your phone number',
      email: 'Enter a valid email address',
      conflict: 'This time slot is already taken',
      generic: 'Error. Please try again.',
    },
  },
};

const servicesList = [
  { id: 1, nameKey: 'haircut' as const, priceAmd: 15000, priceMinAmd: null as number | null, priceMaxAmd: null as number | null, duration: 45, deposit: null as number | null },
  { id: 2, nameKey: 'beard' as const, priceAmd: 12000, priceMinAmd: null as number | null, priceMaxAmd: null as number | null, duration: 30, deposit: null as number | null },
  { id: 3, nameKey: 'bioPerm' as const, priceAmd: null as number | null, priceMinAmd: 70000, priceMaxAmd: 110000, duration: 180, deposit: 35000 },
];

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00',
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.875rem 0',
  backgroundColor: 'transparent',
  border: 'none',
  borderBottom: '1px solid hsl(var(--border))',
  fontFamily: "'Inter', sans-serif",
  fontSize: '0.9375rem',
  color: 'hsl(var(--foreground))',
  outline: 'none',
  transition: 'border-color 200ms ease',
};

export default function Booking() {
  const { language } = useLanguage() as { language: Lang };
  const [, setLocation] = useLocation();

  const c = copy[language] ?? copy.ru;

  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [comment, setComment] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const createBookingMutation = trpc.bookings.create.useMutation();

  const selectedSvc = servicesList.find(s => s.id === selectedService);

  const formatPrice = (svc: typeof servicesList[number]) => {
    if (svc.priceMinAmd) return `${svc.priceMinAmd.toLocaleString()} – ${svc.priceMaxAmd!.toLocaleString()} ֏`;
    if (svc.priceAmd) return `${svc.priceAmd.toLocaleString()} ֏`;
    return '—';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) { toast.error(c.errors.service); return; }
    if (!bookingDate) { toast.error(c.errors.date); return; }
    if (!bookingTime) { toast.error(c.errors.time); return; }
    if (!clientName.trim()) { toast.error(c.errors.name); return; }
    if (!clientPhone.trim()) { toast.error(c.errors.phone); return; }
    const normalizedEmail = clientEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { toast.error(c.errors.email); return; }

    try {
      const result = await createBookingMutation.mutateAsync({
        serviceId: selectedService,
        serviceName: c[selectedSvc!.nameKey],
        bookingDate,
        bookingTime,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: normalizedEmail,
        comment: comment.trim() || undefined,
      });
      if (result) {
        setReferenceNumber(result.referenceNumber);
        setSubmitted(true);
      }
    } catch (error: any) {
      const msg = error?.message?.includes('already booked') ? c.errors.conflict : c.errors.generic;
      toast.error(msg);
    }
  };

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', display: 'flex', alignItems: 'center' }}>
        <div className="container" style={{ maxWidth: '32rem', margin: '0 auto', textAlign: 'center', padding: '4rem 1.5rem' }}>
          <div className="fade-up">
            {/* Check icon */}
            <div style={{ width: '3rem', height: '3rem', border: '1px solid hsl(var(--foreground))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <polyline points="3,8 7,12 13,4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h2 style={{ marginBottom: '1rem', fontStyle: 'italic' }}>{c.sentTitle}</h2>
            <p style={{ marginBottom: '0.5rem' }}>{c.sentSub}</p>
            <p className="label-caps" style={{ marginBottom: '3rem' }}>{c.statusLabel}</p>

            <div style={{ borderTop: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))', padding: '1.5rem 0', marginBottom: '3rem' }}>
              <p className="label-caps" style={{ marginBottom: '0.5rem' }}>{c.refLabel}</p>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem', fontWeight: 400, color: 'hsl(var(--foreground))', letterSpacing: '0.1em', margin: 0 }}>
                {referenceNumber}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="btn-primary" onClick={() => setLocation('/status')}>
                {c.checkStatus}
              </button>
              <button className="btn-ghost" onClick={() => setLocation('/')}>
                {c.backHome}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))' }}>
      <div className="container" style={{ maxWidth: '40rem', margin: '0 auto', paddingTop: '6rem', paddingBottom: '6rem' }}>

        {/* Back */}
        <button
          className="btn-ghost"
          onClick={() => setLocation('/')}
          style={{ marginBottom: '3rem', padding: '0' }}
        >
          {c.back}
        </button>

        {/* Title */}
        <div style={{ marginBottom: '3rem' }}>
          <p className="label-caps" style={{ marginBottom: '1rem' }}>Hairstyle Laboratory</p>
          <h2 style={{ fontStyle: 'italic', marginBottom: '0.5rem' }}>{c.title}</h2>
          <p style={{ margin: 0 }}>{c.sub}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Service selection */}
          <div style={{ marginBottom: '2.5rem' }}>
            <p className="label-caps" style={{ marginBottom: '1rem' }}>{c.selectService}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {servicesList.map((svc, i) => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setSelectedService(svc.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    borderTop: i === 0 ? '1px solid hsl(var(--border))' : 'none',
                    borderBottom: '1px solid hsl(var(--border))',
                    background: 'none',
                    cursor: 'pointer',
                    transition: 'opacity 200ms ease',
                    opacity: selectedService && selectedService !== svc.id ? 0.4 : 1,
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontWeight: 400, color: 'hsl(var(--foreground))', margin: 0 }}>
                      {c[svc.nameKey]}
                    </p>
                    <p className="label-caps" style={{ marginTop: '0.25rem', fontSize: '0.625rem' }}>
                      {svc.duration} {language === 'ru' ? 'мин' : 'min'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', color: 'hsl(var(--foreground))', margin: 0 }}>
                      {formatPrice(svc)}
                    </p>
                    <div style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      borderRadius: '50%',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: selectedService === svc.id ? 'hsl(var(--foreground))' : 'transparent',
                      transition: 'background-color 200ms ease',
                      flexShrink: 0,
                    }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date + Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div>
              <p className="label-caps" style={{ marginBottom: '0.75rem' }}>{c.selectDate}</p>
              <input
                type="date"
                value={bookingDate}
                min={minDate}
                max={maxDate}
                onChange={e => setBookingDate(e.target.value)}
                onFocus={() => setFocusedField('date')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...inputStyle,
                  borderBottomColor: focusedField === 'date' ? 'hsl(var(--foreground))' : 'hsl(var(--border))',
                }}
              />
            </div>
            <div>
              <p className="label-caps" style={{ marginBottom: '0.75rem' }}>{c.selectTime}</p>
              <select
                value={bookingTime}
                onChange={e => setBookingTime(e.target.value)}
                onFocus={() => setFocusedField('time')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...inputStyle,
                  borderBottomColor: focusedField === 'time' ? 'hsl(var(--foreground))' : 'hsl(var(--border))',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                }}
              >
                <option value="">—</option>
                {timeSlots.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="label-caps" style={{ marginBottom: '0.75rem' }}>{c.name}</p>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder={c.name}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...inputStyle,
                  borderBottomColor: focusedField === 'name' ? 'hsl(var(--foreground))' : 'hsl(var(--border))',
                }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="label-caps" style={{ marginBottom: '0.75rem' }}>{c.phone}</p>
              <input
                type="tel"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="+7 / +374"
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...inputStyle,
                  borderBottomColor: focusedField === 'phone' ? 'hsl(var(--foreground))' : 'hsl(var(--border))',
                }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="label-caps" style={{ marginBottom: '0.75rem' }}>{c.email}</p>
              <input
                type="email"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
                placeholder="name@email.com"
                autoComplete="email"
                required
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...inputStyle,
                  borderBottomColor: focusedField === 'email' ? 'hsl(var(--foreground))' : 'hsl(var(--border))',
                }}
              />
            </div>
            <div style={{ marginBottom: '3rem' }}>
              <p className="label-caps" style={{ marginBottom: '0.75rem' }}>{c.comment}</p>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="..."
                rows={2}
                onFocus={() => setFocusedField('comment')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...inputStyle,
                  resize: 'none',
                  borderBottomColor: focusedField === 'comment' ? 'hsl(var(--foreground))' : 'hsl(var(--border))',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%' }}
            disabled={createBookingMutation.isPending}
          >
            {createBookingMutation.isPending ? '...' : c.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
