import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { downloadCalendarInvite, type CalendarInviteDetails } from '@/lib/calendarInvite';

type Lang = 'ru' | 'en';

const REPEAT_BOOKING_DRAFT_KEY = 'hairstyle-laboratory.repeat-booking-draft';

type RepeatBookingDraft = {
  serviceIds: number[];
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientBirthday: string;
  clientInstagram: string;
  sourceBookingId: number;
};

type PaymentReceiptDraft = {
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  base64Data: string;
};

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const payload = String(reader.result || '').split(',')[1];
      if (payload) resolve(payload);
      else reject(new Error('Receipt could not be read'));
    };
    reader.onerror = () => reject(new Error('Receipt could not be read'));
    reader.readAsDataURL(file);
  });
}

const copy: Record<Lang, {
  title: string;
  sub: string;
  selectService: string;
  selectServiceHint: string;
  selectionSummary: string;
  totalDuration: string;
  totalPrice: string;
  loadingServices: string;
  servicesUnavailable: string;
  noServicesAvailable: string;
  selectDate: string;
  selectTime: string;
  name: string;
  phone: string;
  email: string;
  birthday: string;
  instagram: string;
  comment: string;
  noOpenDates: string;
  noOpenSlots: string;
  chooseServicesFirst: string;
  submit: string;
  back: string;
  sentTitle: string;
  sentSub: string;
  statusLabel: string;
  refLabel: string;
  checkStatus: string;
  backHome: string;
  addToCalendar: string;
  copyReference: string;
  copyStatusLink: string;
  saved: string;
  copyFailed: string;
  repeatReady: string;
  manualDepositTitle: string;
  manualDepositInstructions: string;
  manualDepositRecipient: string;
  manualDepositCard: string;
  receiptLabel: string;
  receiptHint: string;
  policyAccepted: string;
  receiptReady: string;
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
    selectService: 'Услуги',
    selectServiceHint: 'Можно выбрать несколько услуг. Одну и ту же услугу — только один раз.',
    selectionSummary: 'Ваш визит',
    totalDuration: 'Общая длительность',
    totalPrice: 'Ориентир по стоимости',
    loadingServices: 'Загружаем услуги…',
    servicesUnavailable: 'Услуги временно недоступны. Обновите страницу и попробуйте снова.',
    noServicesAvailable: 'Сейчас нет доступных услуг для онлайн-записи. Свяжитесь с Isaac напрямую.',
    selectDate: 'Дата',
    selectTime: 'Время',
    name: 'Ваше имя',
    phone: 'Телефон / WhatsApp',
    email: 'Email для подтверждения',
    birthday: 'Дата рождения (необязательно)',
    instagram: 'Instagram (необязательно)',
    comment: 'Комментарий (необязательно)',
    noOpenDates: 'Сейчас нет открытых дат для онлайн-записи. Свяжитесь с Isaac напрямую.',
    noOpenSlots: 'На эту дату нет свободных слотов для выбранных услуг.',
    chooseServicesFirst: 'Сначала выберите услугу, чтобы увидеть доступное время.',
    submit: 'Отправить заявку',
    back: '← Назад',
    sentTitle: 'Заявка отправлена',
    sentSub: 'Ожидает подтверждения мастером.',
    statusLabel: 'Статус: ожидает подтверждения мастером',
    refLabel: 'Номер заявки',
    checkStatus: 'Проверить статус',
    backHome: 'На главную',
    addToCalendar: 'Добавить в календарь',
    copyReference: 'Скопировать номер заявки',
    copyStatusLink: 'Скопировать ссылку на статус',
    saved: 'Сохранено',
    copyFailed: 'Не удалось скопировать. Сохраните номер заявки вручную.',
    repeatReady: 'Повторная запись: данные клиента и прошлые услуги подставлены. Проверьте их и выберите дату и время.',
    manualDepositTitle: 'Предоплата и чек',
    manualDepositInstructions: 'Для этой услуги нужна предоплата. Переведите сумму по реквизитам ниже и прикрепите фото чека к заявке. Isaac проверит оплату перед подтверждением визита.',
    manualDepositRecipient: 'Получатель',
    manualDepositCard: 'Карта / реквизиты',
    receiptLabel: 'Фото чека об оплате',
    receiptHint: 'JPEG, PNG или WebP · до 5 МБ',
    policyAccepted: 'Я прочитал(а) и принимаю условия отмены и неявки.',
    receiptReady: 'Чек прикреплён',
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
    selectService: 'Services',
    selectServiceHint: 'Select one or more services. Each service can be selected only once.',
    selectionSummary: 'Your visit',
    totalDuration: 'Total duration',
    totalPrice: 'Estimated price',
    loadingServices: 'Loading services…',
    servicesUnavailable: 'Services are temporarily unavailable. Refresh the page and try again.',
    noServicesAvailable: 'There are no services available for online booking right now. Please contact Isaac directly.',
    selectDate: 'Date',
    selectTime: 'Time',
    name: 'Your name',
    phone: 'Phone / WhatsApp',
    email: 'Confirmation email',
    birthday: 'Birthday (optional)',
    instagram: 'Instagram (optional)',
    comment: 'Comment (optional)',
    noOpenDates: 'There are no open dates for online booking right now. Please contact Isaac directly.',
    noOpenSlots: 'There are no open slots for the selected services on this date.',
    chooseServicesFirst: 'Select a service first to see available times.',
    submit: 'Submit booking',
    back: '← Back',
    sentTitle: 'Request sent',
    sentSub: 'Awaiting stylist confirmation.',
    statusLabel: 'Status: awaiting stylist confirmation',
    refLabel: 'Reference number',
    checkStatus: 'Check status',
    backHome: 'Back to home',
    addToCalendar: 'Add to calendar',
    copyReference: 'Copy reference number',
    copyStatusLink: 'Copy status link',
    saved: 'Saved',
    copyFailed: 'Could not copy. Please save the reference number manually.',
    repeatReady: 'Repeat visit: client details and previous services are filled in. Review them, then choose a date and time.',
    manualDepositTitle: 'Deposit and receipt',
    manualDepositInstructions: 'This service requires a deposit. Transfer the amount using the details below and attach a photo of the receipt to your request. Isaac will verify the payment before confirming the visit.',
    manualDepositRecipient: 'Recipient',
    manualDepositCard: 'Card / payment details',
    receiptLabel: 'Payment receipt photo',
    receiptHint: 'JPEG, PNG, or WebP · up to 5 MB',
    policyAccepted: 'I have read and accept the cancellation and no-show policy.',
    receiptReady: 'Receipt attached',
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

  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientBirthday, setClientBirthday] = useState('');
  const [clientInstagram, setClientInstagram] = useState('');
  const [comment, setComment] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [calendarInvite, setCalendarInvite] = useState<CalendarInviteDetails | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [repeatDraftApplied, setRepeatDraftApplied] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<PaymentReceiptDraft | null>(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);

  const createBookingMutation = trpc.bookings.create.useMutation();
  const { data: databaseServices, isLoading: servicesLoading, isError: servicesError } = trpc.services.list.useQuery();
  const { data: manualDepositSettings } = trpc.manualDeposit.settings.useQuery();
  const servicesList = databaseServices ?? [];
  const servicesReady = !servicesLoading && !servicesError && servicesList.length > 0;

  useEffect(() => {
    try {
      const rawDraft = window.sessionStorage.getItem(REPEAT_BOOKING_DRAFT_KEY);
      if (!rawDraft) return;
      window.sessionStorage.removeItem(REPEAT_BOOKING_DRAFT_KEY);
      const draft = JSON.parse(rawDraft) as RepeatBookingDraft;
      if (!Array.isArray(draft.serviceIds) || draft.serviceIds.length === 0 || !draft.clientName || !draft.clientPhone) return;
      setSelectedServiceIds(Array.from(new Set(draft.serviceIds)));
      setClientName(draft.clientName);
      setClientPhone(draft.clientPhone);
      setClientEmail(draft.clientEmail ?? '');
      setClientBirthday(draft.clientBirthday ?? '');
      setClientInstagram(draft.clientInstagram ?? '');
      setRepeatDraftApplied(true);
    } catch {
      window.sessionStorage.removeItem(REPEAT_BOOKING_DRAFT_KEY);
    }
  }, []);

  const selectedServices = servicesList.filter((service) => selectedServiceIds.includes(service.id));
  const totalDuration = selectedServices.reduce((total, service) => total + service.durationMinutes, 0);
  const depositTotal = selectedServices.reduce((total, service) => total + (service.depositAmd ?? 0), 0);
  const manualDepositRequired = manualDepositSettings?.isEnabled === 'yes' && depositTotal > 0;
  const availabilityInput = useMemo(() => ({
    date: bookingDate || '1970-01-01',
    durationMinutes: Math.max(totalDuration, 1),
  }), [bookingDate, totalDuration]);
  const { data: openDates, isLoading: openDatesLoading } = trpc.availability.dates.useQuery();
  const { data: availableSlots, isLoading: slotsLoading } = trpc.availability.slots.useQuery(availabilityInput, {
    enabled: Boolean(bookingDate && totalDuration > 0),
  });

  const toggleService = (serviceId: number) => {
    setBookingTime('');
    setSelectedServiceIds((current) => (
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    ));
  };

  const formatPrice = (svc: typeof servicesList[number]) => {
    if (svc.priceMinAmd !== null && svc.priceMaxAmd !== null) return `${svc.priceMinAmd.toLocaleString()} – ${svc.priceMaxAmd.toLocaleString()} ֏`;
    if (svc.priceAmd !== null) return `${svc.priceAmd.toLocaleString()} ֏`;
    return language === 'ru' ? (svc.noteRu || 'По запросу') : (svc.noteEn || 'On request');
  };
  const serviceName = (service: typeof servicesList[number]) => language === 'ru' ? service.nameRu : service.nameEn;

  const formatTotalPrice = () => {
    const fixedTotal = selectedServices.reduce((total, service) => total + (service.priceAmd ?? 0), 0);
    const rangedServices = selectedServices.filter((service) => service.priceMinAmd !== null && service.priceMaxAmd !== null);
    const depositTotal = selectedServices.reduce((total, service) => total + (service.depositAmd ?? 0), 0);

    if (rangedServices.length > 0) {
      const min = fixedTotal + rangedServices.reduce((total, service) => total + (service.priceMinAmd ?? 0), 0);
      const max = fixedTotal + rangedServices.reduce((total, service) => total + (service.priceMaxAmd ?? 0), 0);
      const deposit = depositTotal > 0 ? ` · ${language === 'ru' ? 'предоплата' : 'deposit'} ${depositTotal.toLocaleString()} ֏` : '';
      return `${min.toLocaleString()} – ${max.toLocaleString()} ֏${deposit}`;
    }

    return fixedTotal > 0 ? `${fixedTotal.toLocaleString()} ֏` : '—';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicesReady) { toast.error(c.servicesUnavailable); return; }
    if (selectedServiceIds.length === 0) { toast.error(c.errors.service); return; }
    if (!bookingDate) { toast.error(c.errors.date); return; }
    if (!bookingTime) { toast.error(c.errors.time); return; }
    if (!clientName.trim()) { toast.error(c.errors.name); return; }
    if (!clientPhone.trim()) { toast.error(c.errors.phone); return; }
    const normalizedEmail = clientEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { toast.error(c.errors.email); return; }
    if (!policyAccepted) { toast.error(language === 'ru' ? 'Подтвердите условия отмены и неявки' : 'Please accept the cancellation and no-show policy'); return; }
    if (manualDepositRequired && !paymentReceipt) { toast.error(language === 'ru' ? 'Прикрепите фото чека об оплате' : 'Please attach your payment receipt'); return; }

    try {
      const result = await createBookingMutation.mutateAsync({
        serviceIds: selectedServiceIds,
        bookingDate,
        bookingTime,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: normalizedEmail,
        birthday: clientBirthday || undefined,
        instagram: clientInstagram.trim() || undefined,
        comment: comment.trim() || undefined,
        policyAccepted,
        receipt: manualDepositRequired && paymentReceipt ? paymentReceipt : undefined,
      });
      if (result) {
        setReferenceNumber(result.referenceNumber);
        setCalendarInvite({
          referenceNumber: result.referenceNumber,
          serviceName: selectedServices.map(serviceName).join(' + '),
          bookingDate,
          bookingTime,
          durationMinutes: totalDuration,
          totalPriceSummary: formatTotalPrice(),
        });
        setSubmitted(true);
      }
    } catch (error: any) {
      const errorText = String(error?.message ?? '').toLowerCase();
      const msg = /already booked|not available|overlap|conflict/.test(errorText) ? c.errors.conflict : c.errors.generic;
      toast.error(msg);
    }
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(c.saved);
    } catch {
      toast.error(c.copyFailed);
    }
  };

  const selectReceipt = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(language === 'ru' ? 'Поддерживаются JPEG, PNG и WebP' : 'JPEG, PNG, and WebP are supported');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(language === 'ru' ? 'Чек должен быть меньше 5 МБ' : 'Receipt must be smaller than 5 MB');
      return;
    }
    try {
      setPaymentReceipt({ fileName: file.name, mimeType: file.type as PaymentReceiptDraft['mimeType'], base64Data: await readFileAsBase64(file) });
    } catch {
      toast.error(language === 'ru' ? 'Не удалось прочитать чек' : 'Receipt could not be read');
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
            <p style={{ marginBottom: '0.5rem' }}>{manualDepositRequired && paymentReceipt ? (language === 'ru' ? 'Чек загружен вместе с заявкой. Isaac проверит оплату и подтвердит визит.' : 'Your receipt was uploaded with the request. Isaac will verify the payment and confirm the visit.') : c.sentSub}</p>
            <p className="label-caps" style={{ marginBottom: '3rem' }}>{c.statusLabel}</p>

            <div style={{ borderTop: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))', padding: '1.5rem 0', marginBottom: '3rem' }}>
              <p className="label-caps" style={{ marginBottom: '0.5rem' }}>{c.refLabel}</p>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem', fontWeight: 400, color: 'hsl(var(--foreground))', letterSpacing: '0.1em', margin: 0 }}>
                {referenceNumber}
              </p>
              <p style={{ margin: '0.875rem 0 0', color: 'hsl(var(--muted-foreground))', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                {language === 'ru' ? 'Сохраните номер или ссылку — по ним можно в любой момент проверить статус записи.' : 'Save the number or link to check your booking status at any time.'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginTop: '1rem' }}>
                <button className="btn-outline" onClick={() => copyToClipboard(referenceNumber)} style={{ padding: '0.7rem 0.5rem', fontSize: '0.625rem' }}>{c.copyReference}</button>
                <button className="btn-outline" onClick={() => copyToClipboard(`${window.location.origin}/status?ref=${encodeURIComponent(referenceNumber)}`)} style={{ padding: '0.7rem 0.5rem', fontSize: '0.625rem' }}>{c.copyStatusLink}</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {calendarInvite && (
                <button className="btn-outline" onClick={() => downloadCalendarInvite(calendarInvite)}>
                  {c.addToCalendar}
                </button>
              )}
              <button className="btn-primary" onClick={() => setLocation(`/status?ref=${encodeURIComponent(referenceNumber)}`)}>
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
          <p style={{ margin: 0 }}>{repeatDraftApplied ? c.repeatReady : c.sub}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Service selection */}
          <div style={{ marginBottom: '2.5rem' }}>
            <p className="label-caps" style={{ marginBottom: '1rem' }}>{c.selectService}</p>
            <p style={{ margin: '0 0 1rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.8125rem', lineHeight: 1.5 }}>{c.selectServiceHint}</p>
            {servicesLoading ? (
              <div aria-live="polite" style={{ padding: '1.5rem 0', borderTop: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                {c.loadingServices}
              </div>
            ) : servicesError ? (
              <div role="alert" style={{ padding: '1.5rem 0', borderTop: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))', color: 'hsl(var(--destructive))' }}>
                {c.servicesUnavailable}
              </div>
            ) : servicesList.length === 0 ? (
              <div role="status" style={{ padding: '1.5rem 0', borderTop: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                {c.noServicesAvailable}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {servicesList.map((svc, i) => (
                <button
                  key={svc.id}
                  type="button"
                  aria-pressed={selectedServiceIds.includes(svc.id)}
                  onClick={() => toggleService(svc.id)}
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
                    opacity: selectedServiceIds.length > 0 && !selectedServiceIds.includes(svc.id) ? 0.58 : 1,
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontWeight: 400, color: 'hsl(var(--foreground))', margin: 0 }}>
                      {serviceName(svc)}
                    </p>
                    <p className="label-caps" style={{ marginTop: '0.25rem', fontSize: '0.625rem' }}>
                      {svc.durationMinutes} {language === 'ru' ? 'мин' : 'min'}
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
                      backgroundColor: selectedServiceIds.includes(svc.id) ? 'hsl(var(--foreground))' : 'transparent',
                      transition: 'background-color 200ms ease',
                      flexShrink: 0,
                    }} />
                  </div>
                </button>
                ))}
              </div>
            )}
            {selectedServices.length > 0 && (
              <div style={{ marginTop: '1.25rem', padding: '1.1rem 1.25rem', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                <p className="label-caps" style={{ margin: '0 0 0.65rem' }}>{c.selectionSummary}</p>
                <p style={{ margin: '0 0 0.8rem', color: 'hsl(var(--foreground))', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem' }}>
                  {selectedServices.map(serviceName).join(' + ')}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid hsl(var(--border))', paddingTop: '0.8rem' }}>
                  <div>
                    <p className="label-caps" style={{ margin: 0, fontSize: '0.625rem' }}>{c.totalDuration}</p>
                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.875rem' }}>{totalDuration} {language === 'ru' ? 'мин' : 'min'}</p>
                  </div>
                  <div>
                    <p className="label-caps" style={{ margin: 0, fontSize: '0.625rem' }}>{c.totalPrice}</p>
                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.875rem' }}>{formatTotalPrice()}</p>
                  </div>
                </div>
              </div>
            )}
            {manualDepositRequired && (
              <section style={{ marginTop: '1.25rem', padding: '1.25rem', border: '1px solid var(--gold-mid)', background: 'hsl(var(--secondary))' }}>
                <p className="label-caps" style={{ margin: '0 0 0.65rem', color: 'var(--gold-mid)' }}>{c.manualDepositTitle}</p>
                <p style={{ margin: '0 0 1rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.8125rem', lineHeight: 1.55 }}>{c.manualDepositInstructions}</p>
                <div style={{ display: 'grid', gap: '0.6rem', padding: '0.9rem 0', borderTop: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }}>
                  <p style={{ margin: 0, fontSize: '0.8125rem' }}><span className="label-caps" style={{ fontSize: '0.5625rem' }}>{c.manualDepositRecipient}: </span>{manualDepositSettings?.recipientName}</p>
                  <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', fontWeight: 600 }}><span className="label-caps" style={{ fontSize: '0.5625rem' }}>{c.manualDepositCard}: </span>{manualDepositSettings?.cardDetails}</p>
                  <p style={{ margin: 0, fontSize: '0.8125rem' }}><span className="label-caps" style={{ fontSize: '0.5625rem' }}>{c.deposit}: </span>{depositTotal.toLocaleString()} ֏</p>
                </div>
                <label style={{ display: 'grid', gap: '0.45rem', marginTop: '1rem', cursor: 'pointer' }}>
                  <span className="label-caps" style={{ fontSize: '0.5625rem' }}>{c.receiptLabel}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectReceipt} style={{ fontSize: '0.75rem', maxWidth: '100%' }} />
                  <span style={{ fontSize: '0.75rem', color: paymentReceipt ? 'hsl(142 50% 40%)' : 'hsl(var(--muted-foreground))' }}>{paymentReceipt ? `${c.receiptReady}: ${paymentReceipt.fileName}` : c.receiptHint}</span>
                </label>
              </section>
            )}
            {selectedServices.length > 0 && (
              <section style={{ marginTop: '1.25rem', padding: '1rem 1.1rem', borderLeft: '2px solid var(--gold-mid)', background: 'hsl(var(--secondary))' }}>
                <p className="label-caps" style={{ margin: '0 0 0.55rem', color: 'var(--gold-mid)' }}>{language === 'ru' ? 'Отмена и неявка' : 'Cancellation and no-show'}</p>
                <p style={{ margin: 0, color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem', lineHeight: 1.55 }}>{language === 'ru' ? manualDepositSettings?.policyRu : manualDepositSettings?.policyEn}</p>
                <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginTop: '0.85rem', fontSize: '0.75rem', lineHeight: 1.45, cursor: 'pointer' }}>
                  <input type="checkbox" checked={policyAccepted} onChange={event => setPolicyAccepted(event.target.checked)} style={{ marginTop: '0.15rem' }} />
                  <span>{c.policyAccepted}</span>
                </label>
              </section>
            )}
          </div>

          {/* Date + Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div>
              <p className="label-caps" style={{ marginBottom: '0.75rem' }}>{c.selectDate}</p>
              <select
                value={bookingDate}
                onChange={e => { setBookingDate(e.target.value); setBookingTime(''); }}
                onFocus={() => setFocusedField('date')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...inputStyle,
                  borderBottomColor: focusedField === 'date' ? 'hsl(var(--foreground))' : 'hsl(var(--border))',
                  cursor: 'pointer',
                }}
              >
                <option value="">—</option>
                {(openDates ?? []).map(date => <option key={date} value={date}>{date}</option>)}
              </select>
              {!openDatesLoading && (openDates?.length ?? 0) === 0 && <p style={{ margin: '0.55rem 0 0', fontSize: '0.75rem', lineHeight: 1.4, color: 'hsl(var(--muted-foreground))' }}>{c.noOpenDates}</p>}
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
                {(availableSlots ?? []).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {bookingDate && totalDuration === 0 && <p style={{ margin: '0.55rem 0 0', fontSize: '0.75rem', lineHeight: 1.4, color: 'hsl(var(--muted-foreground))' }}>{c.chooseServicesFirst}</p>}
              {bookingDate && totalDuration > 0 && !slotsLoading && (availableSlots?.length ?? 0) === 0 && <p style={{ margin: '0.55rem 0 0', fontSize: '0.75rem', lineHeight: 1.4, color: 'hsl(var(--muted-foreground))' }}>{c.noOpenSlots}</p>}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <p className="label-caps" style={{ marginBottom: '0.75rem' }}>{c.birthday}</p>
                <input
                  type="date"
                  value={clientBirthday}
                  onChange={e => setClientBirthday(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <p className="label-caps" style={{ marginBottom: '0.75rem' }}>{c.instagram}</p>
                <input
                  type="text"
                  value={clientInstagram}
                  onChange={e => setClientInstagram(e.target.value)}
                  placeholder="@username"
                  autoComplete="off"
                  style={inputStyle}
                />
              </div>
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
