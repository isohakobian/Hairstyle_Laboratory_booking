import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { downloadCalendarInvite, type CalendarInviteDetails } from '@/lib/calendarInvite';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

type ReferencePhotoDraft = {
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
  referencePhotoLabel: string;
  referencePhotoHint: string;
  referencePhotoReady: string;
  reviewsTitle: string;
    thankYouModalTitle: string;
    thankYouModalText: string;
    instagramBtn: string;
    faqTitle: string;
    faqs: Array<{ q: string; a: string }>;
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
    birthday: 'Дата рождения',
    instagram: 'Instagram (@username)',
    comment: 'Комментарий к записи',
    noOpenDates: 'К сожалению, пока нет открытых для записи дней. Проверьте позже или напишите в Instagram.',
    noOpenSlots: 'На выбранный день нет свободных окон. Пожалуйста, выберите другую дату.',
    chooseServicesFirst: 'Сначала выберите хотя бы одну услугу.',
    submit: 'Отправить заявку на запись',
    back: 'На главную',
    sentTitle: 'Заявка отправлена',
    sentSub: 'Спасибо за доверие. Мы получили вашу заявку и подтвердим время на указанный email.',
    statusLabel: 'Проверить статус',
    refLabel: 'Код вашей записи',
    checkStatus: 'Посмотреть статус и адрес',
    backHome: 'На главную',
    addToCalendar: 'Добавить в календарь',
    copyReference: 'Копировать код',
    copyStatusLink: 'Копировать ссылку статуса',
    saved: 'Скопировано в буфер обмена',
    copyFailed: 'Не удалось скопировать',
    repeatReady: 'Данные визита и услуги заполнены из вашей истории.',
    manualDepositTitle: 'Предоплата за бронирование',
    manualDepositInstructions: 'Для подтверждения этой услуги необходима предоплата. Переведите сумму на карту, загрузите скриншот чека, и Isaac подтвердит запись.',
    manualDepositRecipient: 'Получатель',
    manualDepositCard: 'Номер карты / Счет',
    receiptLabel: 'Фото чека об оплате (JPEG, PNG, WebP)',
    receiptHint: 'Нажмите, чтобы выбрать файл чека (до 5 МБ)',
    policyAccepted: 'Я ознакомлен(а) и согласен(а) с правилами отмены и неявки',
    receiptReady: 'Чек прикреплен',
    referencePhotoLabel: 'Фото-референс желаемого результата (необязательно)',
    referencePhotoHint: 'Загрузите фото примера стрижки или бороды (до 8 МБ)',
    referencePhotoReady: 'Референс прикреплен',
    reviewsTitle: 'Отзывы клиентов',
    thankYouModalTitle: 'Спасибо за запись!',
    thankYouModalText: 'Ваша заявка успешно принята. Скоро я проверю время и отправлю подтверждение с точным адресом на ваш email.',
    instagramBtn: 'Перейти в Instagram @isaac_hakobian',
    faqTitle: 'Частые вопросы',
    faqs: [
      {
        q: 'Где находится студия?',
        a: 'Студия Hairstyle Laboratory расположена по адресу: Armenia, Yerevan, Pushkin 44. Точный адрес и ссылка на карту приходят на ваш email сразу после подтверждения записи.',
      },
      {
        q: 'Как подтверждается запись?',
        a: 'После отправки заявки я проверяю расписание и подтверждаю визит. На ваш email приходит письмо с деталями, ссылкой на календарь и адресом.',
      },
      {
        q: 'Как отменить или перенести визит?',
        a: 'Вы можете в любой момент открыть страницу «Статус» по коду вашей записи, проверить текущее состояние или отменить бронирование с указанием причины.',
      },
      {
        q: 'Нужна ли предоплата?',
        a: 'Предоплата требуется только для сложных процедур (например, биохимической завивки). Реквизиты и возможность прикрепить чек появятся прямо в форме.',
      },
    ],
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
    selectServiceHint: 'You can select multiple services. Each service can only be selected once.',
    selectionSummary: 'Your Visit',
    totalDuration: 'Total Duration',
    totalPrice: 'Estimated Price',
    loadingServices: 'Loading services…',
    servicesUnavailable: 'Services are temporarily unavailable. Please refresh and try again.',
    noServicesAvailable: 'No services available for online booking right now. Please contact Isaac directly.',
    selectDate: 'Date',
    selectTime: 'Time',
    name: 'Your Name',
    phone: 'Phone / WhatsApp',
    email: 'Confirmation Email',
    birthday: 'Birthday',
    instagram: 'Instagram (@username)',
    comment: 'Appointment Note',
    noOpenDates: 'No booking dates are currently open. Please check back later or reach out on Instagram.',
    noOpenSlots: 'No available time slots on this date. Please select another day.',
    chooseServicesFirst: 'Please select at least one service first.',
    submit: 'Submit Booking Request',
    back: 'Home',
    sentTitle: 'Request Sent',
    sentSub: 'Thank you for your trust. We have received your request and will confirm your time via email.',
    statusLabel: 'Check Status',
    refLabel: 'Your Reference Code',
    checkStatus: 'View Status & Address',
    backHome: 'Home',
    addToCalendar: 'Add to Calendar',
    copyReference: 'Copy Code',
    copyStatusLink: 'Copy Status Link',
    saved: 'Copied to clipboard',
    copyFailed: 'Could not copy',
    repeatReady: 'Visit details and services loaded from your history.',
    manualDepositTitle: 'Booking Deposit',
    manualDepositInstructions: 'A deposit is required to secure this service. Transfer the amount, upload your receipt screenshot, and Isaac will confirm.',
    manualDepositRecipient: 'Recipient',
    manualDepositCard: 'Card / Account',
    receiptLabel: 'Payment Receipt Photo (JPEG, PNG, WebP)',
    receiptHint: 'Click to select receipt file (up to 5 MB)',
    policyAccepted: 'I have read and agree to the cancellation and no-show policy',
    receiptReady: 'Receipt attached',
    referencePhotoLabel: 'Reference Photo of Desired Result (Optional)',
    referencePhotoHint: 'Upload an example photo of your desired cut or style (up to 8 MB)',
    referencePhotoReady: 'Reference photo attached',
    reviewsTitle: 'Client Reviews',
    thankYouModalTitle: 'Thank You for Booking!',
    thankYouModalText: 'Your request has been received. I will review the time and send confirmation with the precise address to your email soon.',
    instagramBtn: 'Visit Instagram @isaac_hakobian',
    faqTitle: 'Frequently Asked Questions',
    faqs: [
      {
        q: 'Where is the studio located?',
        a: 'Hairstyle Laboratory is located at: Armenia, Yerevan, Pushkin 44. The exact address and map link are sent to your email immediately upon booking confirmation.',
      },
      {
        q: 'How is my appointment confirmed?',
        a: 'After you submit a request, I verify the schedule and confirm your visit. You will receive an email confirmation with calendar details and the studio address.',
      },
      {
        q: 'How can I cancel or reschedule?',
        a: 'You can open the Status page using your booking reference code at any time to check your appointment or cancel it with a reason.',
      },
      {
        q: 'Is a deposit required?',
        a: 'A deposit is only required for complex services (such as bio perms). Bank details and receipt upload will appear directly in the booking form when applicable.',
      },
    ],
    haircut: 'Haircut',
    beard: 'Beard Modeling',
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
  const [referencePhoto, setReferencePhoto] = useState<ReferencePhotoDraft | null>(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);

  const { data: publishedReviews } = trpc.reviews.published.useQuery();

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
        referencePhoto: referencePhoto ? referencePhoto : undefined,
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

  const selectReferencePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(language === 'ru' ? 'Поддерживаются JPEG, PNG и WebP' : 'JPEG, PNG, and WebP are supported');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error(language === 'ru' ? 'Фото должно быть меньше 8 МБ' : 'Photo must be smaller than 8 MB');
      return;
    }
    try {
      setReferencePhoto({ fileName: file.name, mimeType: file.type as ReferencePhotoDraft['mimeType'], base64Data: await readFileAsBase64(file) });
    } catch {
      toast.error(language === 'ru' ? 'Не удалось прочитать референс' : 'Reference photo could not be read');
    }
  };

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '1.5rem',
        }}>
          <div className="fade-up" style={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            maxWidth: '34rem',
            width: '100%',
            padding: '3rem 2.5rem',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          }}>
            <div style={{ width: '3.5rem', height: '3.5rem', border: '1px solid var(--gold-mid)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', color: 'var(--gold-mid)' }}>
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <polyline points="3,8 7,12 13,4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <p className="label-caps" style={{ marginBottom: '0.5rem', color: 'var(--gold-mid)' }}>Hairstyle Laboratory</p>
            <h2 style={{ marginBottom: '1rem', fontStyle: 'italic', fontSize: '2.25rem' }}>{c.thankYouModalTitle}</h2>
            <p style={{ marginBottom: '1.75rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.9375rem', lineHeight: 1.6 }}>{c.thankYouModalText}</p>

            <div style={{ borderTop: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))', padding: '1.25rem 0', marginBottom: '2rem' }}>
              <p className="label-caps" style={{ marginBottom: '0.35rem' }}>{c.refLabel}</p>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem', fontWeight: 400, color: 'hsl(var(--foreground))', letterSpacing: '0.1em', margin: 0 }}>
                {referenceNumber}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginTop: '1rem' }}>
                <button className="btn-outline" onClick={() => copyToClipboard(referenceNumber)} style={{ padding: '0.7rem 0.5rem', fontSize: '0.625rem' }}>{c.copyReference}</button>
                <button className="btn-outline" onClick={() => copyToClipboard(`${window.location.origin}/status?ref=${encodeURIComponent(referenceNumber)}`)} style={{ padding: '0.7rem 0.5rem', fontSize: '0.625rem' }}>{c.copyStatusLink}</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {calendarInvite && (
                <button className="btn-outline" onClick={() => downloadCalendarInvite(calendarInvite)}>
                  {c.addToCalendar}
                </button>
              )}
              <button className="btn-primary" onClick={() => setLocation(`/status?ref=${encodeURIComponent(referenceNumber)}`)}>
                {c.checkStatus}
              </button>
              <a href="https://instagram.com/isaac_hakobian" target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                {c.instagramBtn}
              </a>
            </div>

            <button className="btn-ghost" onClick={() => setLocation('/')} style={{ fontSize: '0.75rem' }}>
              {c.backHome}
            </button>
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
              <p style={{ margin: '0.55rem 0 0', color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem', lineHeight: 1.45 }}>
                {language === 'ru'
                  ? 'После подтверждения записи на этот email придут все детали визита и адрес: Armenia, Yerevan, Pushkin 44. Проверьте также папку «Спам».'
                  : 'After confirmation, all appointment details and the address — Armenia, Yerevan, Pushkin 44 — will be sent to this email. Please check your spam folder too.'}
              </p>
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
            style={{ width: '100%', position: 'relative', overflow: 'hidden' }}
            disabled={createBookingMutation.isPending}
          >
            {createBookingMutation.isPending ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  width: '0.875rem',
                  height: '0.875rem',
                  border: '2px solid currentColor',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.8s linear infinite',
                }} />
                {language === 'ru' ? 'Отправка заявки...' : 'Sending request...'}
              </span>
            ) : c.submit}
          </button>
        </form>

        {/* FAQ section */}
        <div style={{ marginTop: '4rem', borderTop: '1px solid hsl(var(--border))', paddingTop: '3rem' }}>
          <p className="label-caps" style={{ marginBottom: '1.25rem' }}>{c.faqTitle}</p>
          <Accordion type="single" collapsible className="w-full">
            {c.faqs.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger style={{ fontSize: '0.9375rem', textAlign: 'left', fontWeight: 500 }}>
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
