import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { getReviewRequestErrorMessage } from '@/lib/emailDeliveryError';
import { downloadCsv } from '@/lib/csvExport';
import { Loader2, Trash2 } from 'lucide-react';
import ScheduleCalendar from '@/components/ScheduleCalendar';
import BookingCalendar from '@/components/BookingCalendar';
import ClientMemoryPanel from '@/components/ClientMemoryPanel';
import AnnouncementManager from '@/components/AnnouncementManager';
import ServiceManager from '@/components/ServiceManager';
import ReviewRequestTemplateEditor from '@/components/ReviewRequestTemplateEditor';
import ManualDepositSettingsEditor from '@/components/ManualDepositSettingsEditor';
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination';

type Tab = 'bookings' | 'calendar' | 'schedule' | 'services' | 'reviews' | 'clients' | 'news' | 'payment';
type BookingStatusFilter = 'all' | 'pending' | 'confirmed' | 'declined';
type BookingSort = 'appointmentAsc' | 'appointmentDesc' | 'newest' | 'statusAsc';
type ReviewRequestStatusFilter = 'all' | 'awaiting' | 'received';
type ReviewRequestSort = 'sentDesc' | 'sentAsc' | 'receivedDesc';

function getInitialTab(): Tab {
  if (typeof window === 'undefined') return 'bookings';
  const tab = new URLSearchParams(window.location.search).get('section');
  return tab === 'calendar' || tab === 'schedule' || tab === 'services' || tab === 'reviews' || tab === 'clients' || tab === 'news' || tab === 'payment' ? tab : 'bookings';
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '0.6875rem',
  fontWeight: 500,
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  color: 'hsl(var(--muted-foreground))',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  padding: '1.5rem',
  position: 'relative' as const,
};

const statusColors: Record<string, string> = {
  pending: 'hsl(35, 60%, 50%)',
  confirmed: 'hsl(142, 50%, 40%)',
  declined: 'hsl(0, 60%, 50%)',
};

function DepositReceiptPreview({ bookingId, language }: { bookingId: number; language: string }) {
  const { data: url } = trpc.admin.manualDepositReceiptUrl.useQuery({ bookingId });
  if (!url) return <p style={{ ...labelStyle, margin: '0.75rem 0 0', fontSize: '0.5625rem' }}>{language === 'ru' ? 'Загружаю чек...' : 'Loading receipt...'}</p>;
  return <a href={url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', marginTop: '0.75rem', color: 'var(--gold-mid)', fontSize: '0.75rem', textDecoration: 'underline', textUnderlineOffset: '0.2rem' }}>{language === 'ru' ? 'Открыть чек оплаты' : 'Open payment receipt'}</a>;
}

export default function AdminDashboard() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab);
  const [bookingStatusFilter, setBookingStatusFilter] = useState<BookingStatusFilter>('all');
  const [bookingSort, setBookingSort] = useState<BookingSort>('appointmentAsc');
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingPage, setBookingPage] = useState(1);
  const [reviewRequestStatusFilter, setReviewRequestStatusFilter] = useState<ReviewRequestStatusFilter>('all');
  const [reviewRequestSort, setReviewRequestSort] = useState<ReviewRequestSort>('sentDesc');
  const [reviewRequestPage, setReviewRequestPage] = useState(1);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [rescheduleBookingId, setRescheduleBookingId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [completeBookingId, setCompleteBookingId] = useState<number | null>(null);
  const [finalPriceAmd, setFinalPriceAmd] = useState('');
  const [completionNote, setCompletionNote] = useState('');
  const [deleteBookingId, setDeleteBookingId] = useState<number | null>(null);
  const [lastReviewRequestBookingId, setLastReviewRequestBookingId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const { data: bookings, isLoading: bookingsLoading, isError: bookingsError, refetch: refetchBookings } = trpc.admin.bookings.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });
  const { data: todaySummary } = trpc.admin.today.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });
  const { data: bookingPageData, isLoading: bookingPageLoading, isError: bookingPageError } = trpc.admin.bookingPage.useQuery({
    page: bookingPage,
    pageSize: 15,
    status: bookingStatusFilter,
    search: bookingSearch.trim() || undefined,
    sort: bookingSort,
  }, {
    enabled: isAuthenticated && user?.role === 'admin',
  });
  const { data: allReviews, refetch: refetchReviews } = trpc.admin.reviews.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });
  const { data: reviewRequestPageData, isLoading: reviewRequestsLoading, isError: reviewRequestsError } = trpc.admin.reviewRequestPage.useQuery({
    page: reviewRequestPage,
    pageSize: 15,
    status: reviewRequestStatusFilter,
    sort: reviewRequestSort,
  }, {
    enabled: isAuthenticated && user?.role === 'admin',
  });
  const { data: reviewRequestStats } = trpc.admin.reviewRequestStats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });
  const { data: clientDirectory, isLoading: clientDirectoryLoading } = trpc.admin.clientDirectory.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });
  const { data: openDates } = trpc.availability.dates.useQuery();
  const rescheduleTarget = useMemo(() => (bookings ?? []).find(booking => booking.id === rescheduleBookingId) ?? null, [bookings, rescheduleBookingId]);
  const rescheduleSlotsInput = useMemo(() => ({
    date: rescheduleDate || '1970-01-01',
    durationMinutes: Math.max(rescheduleTarget?.totalDurationMinutes || 30, 1),
  }), [rescheduleDate, rescheduleTarget?.totalDurationMinutes]);
  const { data: rescheduleSlots } = trpc.availability.slots.useQuery(rescheduleSlotsInput, {
    enabled: Boolean(rescheduleTarget && rescheduleDate),
  });
  const refreshBookingLists = () => {
    void refetchBookings();
    void utils.admin.bookingPage.invalidate();
    void utils.admin.today.invalidate();
  };
  const refreshReviewRequests = () => {
    void utils.admin.reviewRequestPage.invalidate();
    void utils.admin.reviewRequestStats.invalidate();
  };

  const confirmMutation = trpc.admin.confirmBooking.useMutation({
    onSuccess: () => { toast.success(language === 'ru' ? 'Подтверждено' : 'Confirmed'); refreshBookingLists(); },
    onError: (e) => toast.error(e.message),
  });
  const declineMutation = trpc.admin.declineBooking.useMutation({
    onSuccess: () => { toast.success(language === 'ru' ? 'Отклонено' : 'Declined'); refreshBookingLists(); },
    onError: (e) => toast.error(e.message),
  });
  const requestReviewMutation = trpc.admin.requestReview.useMutation({
    onSuccess: (_data, variables) => {
      setLastReviewRequestBookingId(variables.id);
      toast.success(language === 'ru' ? 'Письмо с просьбой оставить отзыв отправлено' : 'Review request email sent');
      refreshReviewRequests();
    },
    onError: (e) => toast.error(getReviewRequestErrorMessage(e.message, language as 'ru' | 'en')),
  });
  const publishReviewMutation = trpc.admin.publishReview.useMutation({
    onSuccess: () => { toast.success(language === 'ru' ? 'Обновлено' : 'Updated'); refetchReviews(); },
    onError: (e) => toast.error(e.message),
  });
  const rescheduleMutation = trpc.admin.rescheduleBooking.useMutation({
    onSuccess: () => {
      toast.success(language === 'ru' ? 'Визит перенесён, история сохранена' : 'Visit rescheduled and history saved');
      setRescheduleBookingId(null); setRescheduleDate(''); setRescheduleTime(''); setRescheduleNote(''); refreshBookingLists();
    },
    onError: (e) => toast.error(e.message),
  });
  const completeMutation = trpc.admin.completeBooking.useMutation({
    onSuccess: () => {
      toast.success(language === 'ru' ? 'Визит отмечен как завершённый' : 'Visit marked as complete');
      setCompleteBookingId(null); setFinalPriceAmd(''); setCompletionNote(''); refreshBookingLists();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteBookingMutation = trpc.admin.deleteBooking.useMutation({
    onSuccess: (data) => {
      setDeleteBookingId(null);
      setSelectedClientId(null);
      toast.success(language === 'ru'
        ? (data.deletedClientProfile ? 'Запись и пустой профиль клиента удалены' : 'Запись удалена')
        : (data.deletedClientProfile ? 'Booking and empty client profile deleted' : 'Booking deleted'));
      refreshBookingLists();
      refetchReviews();
      refreshReviewRequests();
    },
    onError: (e) => toast.error(e.message),
  });
  const manualDepositStatusMutation = trpc.admin.updateManualDepositStatus.useMutation({
    onSuccess: () => {
      toast.success(language === 'ru' ? 'Статус предоплаты обновлён' : 'Deposit status updated');
      refreshBookingLists();
    },
    onError: (e) => toast.error(e.message),
  });

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', tab === 'bookings' ? '/admin' : `/admin?section=${tab}`);
    }
  };

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'admin')) setLocation('/');
  }, [isAuthenticated, user, loading, setLocation]);

  useEffect(() => setBookingPage(1), [bookingStatusFilter, bookingSort, bookingSearch]);
  useEffect(() => setReviewRequestPage(1), [reviewRequestStatusFilter, reviewRequestSort]);

  const visibleBookings = bookingPageData?.items ?? [];
  const visibleReviewRequests = reviewRequestPageData?.items ?? [];
  const bookingPageCount = Math.max(1, Math.ceil((bookingPageData?.total ?? 0) / (bookingPageData?.pageSize ?? 15)));
  const reviewRequestPageCount = Math.max(1, Math.ceil((reviewRequestPageData?.total ?? 0) / (reviewRequestPageData?.pageSize ?? 15)));

  useEffect(() => {
    if (bookingPage > bookingPageCount) setBookingPage(bookingPageCount);
  }, [bookingPage, bookingPageCount]);
  useEffect(() => {
    if (reviewRequestPage > reviewRequestPageCount) setReviewRequestPage(reviewRequestPageCount);
  }, [reviewRequestPage, reviewRequestPageCount]);

  const exportBookingsCsv = () => {
    downloadCsv('hairstyle-laboratory-bookings.csv', visibleBookings.map(booking => ({
      reference: booking.referenceNumber,
      client_name: booking.clientName,
      phone: booking.clientPhone,
      email: booking.clientEmail,
      services: booking.serviceSummary || booking.serviceName,
      booking_date: booking.bookingDate,
      booking_time: booking.bookingTime,
      duration_minutes: booking.totalDurationMinutes,
      price_amd: booking.totalPriceSummary,
      status: booking.status,
      created_at: new Date(booking.createdAt).toISOString(),
    })));
    toast.success(language === 'ru' ? 'CSV-файл с заявками скачан' : 'Bookings CSV downloaded');
  };

  const exportReviewRequestsCsv = () => {
    const stats = reviewRequestStats ?? { sent: 0, received: 0, awaiting: 0 };
    downloadCsv('hairstyle-laboratory-review-requests.csv', [
      { report_type: 'summary', sent: stats.sent, received: stats.received, awaiting: stats.awaiting },
      ...visibleReviewRequests.map(request => ({
        report_type: 'review_request',
        reference: request.referenceNumber,
        client_name: request.clientName,
        email: request.recipientEmail,
        sent_at: new Date(request.sentAt).toISOString(),
        status: request.status,
        review_received_at: request.reviewCreatedAt ? new Date(request.reviewCreatedAt).toISOString() : '',
        rating: request.rating ?? '',
      })),
    ]);
    toast.success(language === 'ru' ? 'CSV-файл со статистикой скачан' : 'Review statistics CSV downloaded');
  };

  const visibleClientDirectory = useMemo(() => {
    const normalizedSearch = clientSearch.trim().toLocaleLowerCase();
    if (!normalizedSearch) return clientDirectory ?? [];
    return (clientDirectory ?? []).filter(client => [client.name, client.phone, client.email ?? '']
      .some(value => value.toLocaleLowerCase().includes(normalizedSearch)));
  }, [clientDirectory, clientSearch]);

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={labelStyle}>{language === 'ru' ? 'Загрузка...' : 'Loading...'}</p>
    </div>
  );

  if (!isAuthenticated) return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ ...labelStyle, marginBottom: '1.5rem' }}>{language === 'ru' ? 'Требуется вход' : 'Login required'}</p>
        <button className="btn-primary" onClick={() => window.location.href = getLoginUrl()}>{language === 'ru' ? 'Войти' : 'Login'}</button>
      </div>
    </div>
  );

  if (user?.role !== 'admin') return null;

  const pending = bookings?.filter(b => b.status === 'pending') ?? [];
  const confirmed = bookings?.filter(b => b.status === 'confirmed') ?? [];
  const declined = bookings?.filter(b => b.status === 'declined') ?? [];

  const tabs: { id: Tab; label: string; description: string; count?: number }[] = [
    { id: 'bookings', label: language === 'ru' ? 'Заявки' : 'Bookings', description: language === 'ru' ? 'Новые и подтверждённые визиты' : 'New and confirmed visits', count: bookings?.length ?? 0 },
    { id: 'calendar', label: language === 'ru' ? 'Календарь' : 'Calendar', description: language === 'ru' ? 'Визиты по дням' : 'Visits by date', count: confirmed.length },
    { id: 'schedule', label: language === 'ru' ? 'Доступность' : 'Availability', description: language === 'ru' ? 'Открытые дни для записи' : 'Open days for booking' },
    { id: 'services', label: language === 'ru' ? 'Услуги' : 'Services', description: language === 'ru' ? 'Прайс-лист и каталог' : 'Price list and catalog' },
    { id: 'reviews', label: language === 'ru' ? 'Отзывы' : 'Reviews', description: language === 'ru' ? 'Модерация обратной связи' : 'Feedback moderation', count: allReviews?.length ?? 0 },
    { id: 'clients', label: language === 'ru' ? 'Клиенты' : 'Clients', description: language === 'ru' ? 'Память о клиенте' : 'Client memory' },
    { id: 'news', label: language === 'ru' ? 'Новости' : 'Notices', description: language === 'ru' ? 'Новости и отпуск' : 'News and vacation' },
    { id: 'payment', label: language === 'ru' ? 'Предоплата' : 'Deposit', description: language === 'ru' ? 'Реквизиты, чеки и политика' : 'Details, receipts, and policy' },
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 0', backgroundColor: 'transparent',
    border: 'none', borderBottom: '1px solid hsl(var(--border))',
    fontFamily: "'Inter', sans-serif", fontSize: '0.875rem',
    color: 'hsl(var(--foreground))', outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: 'rgba(17,19,24,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4rem' }}>
          <button onClick={() => setLocation('/')} style={{ ...labelStyle, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Hairstyle Laboratory</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p style={{ ...labelStyle, margin: 0, fontSize: '0.5625rem' }}>{user?.name}</p>
            <button className="btn-ghost" onClick={logout} style={{ fontSize: '0.5625rem' }}>{language === 'ru' ? 'Выйти' : 'Logout'}</button>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ ...labelStyle, marginBottom: '0.75rem', color: 'var(--gold-mid)' }}>Isaac / Admin</p>
          <h2 style={{ fontStyle: 'italic', marginBottom: 0 }}>{language === 'ru' ? 'Панель управления' : 'Dashboard'}</h2>
          <p style={{ margin: '0.75rem 0 0', maxWidth: '40rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem', lineHeight: 1.6 }}>
            {language === 'ru' ? 'Управляйте заявками, расписанием и отзывами в одном понятном рабочем пространстве.' : 'Manage bookings, availability, and feedback from one clear workspace.'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
          {[
            { label: language === 'ru' ? 'Ожидают' : 'Pending', count: pending.length, color: statusColors.pending },
            { label: language === 'ru' ? 'Подтверждено' : 'Confirmed', count: confirmed.length, color: statusColors.confirmed },
            { label: language === 'ru' ? 'Отклонено' : 'Declined', count: declined.length, color: statusColors.declined },
          ].map(stat => (
            <div key={stat.label} style={{ ...cardStyle, textAlign: 'center' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', backgroundColor: stat.color, opacity: 0.6 }} />
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', fontWeight: 800, color: stat.color, margin: '0 0 0.25rem' }}>{stat.count}</p>
              <p style={{ ...labelStyle, margin: 0, fontSize: '0.5625rem' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        <section style={{ ...cardStyle, marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div><p style={{ ...labelStyle, margin: '0 0 0.35rem', color: 'var(--gold-mid)' }}>{language === 'ru' ? 'Операционный обзор' : 'Operational overview'}</p><h3 style={{ margin: 0, fontStyle: 'italic' }}>{language === 'ru' ? `Сегодня · ${todaySummary?.date ?? '…'}` : `Today · ${todaySummary?.date ?? '…'}`}</h3></div>
            <p style={{ ...labelStyle, margin: 0, fontSize: '0.5625rem' }}>{language === 'ru' ? `${todaySummary?.pendingCount ?? 0} ожидают · ${todaySummary?.confirmedCount ?? 0} подтверждено` : `${todaySummary?.pendingCount ?? 0} pending · ${todaySummary?.confirmedCount ?? 0} confirmed`}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: '1.25rem' }}>
            <div>
              <p style={{ ...labelStyle, margin: '0 0 0.55rem', fontSize: '0.5625rem' }}>{language === 'ru' ? 'Ближайшие клиенты' : 'Today’s clients'}</p>
              {(todaySummary?.bookings ?? []).length === 0 ? <p style={{ margin: 0, fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))' }}>{language === 'ru' ? 'Сегодня записей нет.' : 'No appointments today.'}</p> : <div style={{ display: 'grid', gap: '0.45rem' }}>{(todaySummary?.bookings ?? []).slice(0, 4).map(booking => <div key={booking.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.8125rem' }}><span><strong>{booking.bookingTime}</strong> · {booking.clientName}</span><span style={{ color: statusColors[booking.status] }}>{booking.status === 'pending' ? (language === 'ru' ? 'ожидание' : 'pending') : (language === 'ru' ? 'подтв.' : 'confirmed')}</span></div>)}</div>}
            </div>
            <div>
              <p style={{ ...labelStyle, margin: '0 0 0.55rem', fontSize: '0.5625rem' }}>{language === 'ru' ? 'Свободные окна' : 'Free windows'}</p>
              {(todaySummary?.freeWindows ?? []).length === 0 ? <p style={{ margin: 0, fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))' }}>{language === 'ru' ? 'Нет открытых окон или день полностью занят.' : 'No open windows or the day is full.'}</p> : <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>{(todaySummary?.freeWindows ?? []).map(window => <span key={`${window.startTime}-${window.endTime}`} style={{ padding: '0.35rem 0.5rem', border: '1px solid hsl(var(--border))', fontSize: '0.75rem' }}>{window.startTime}–{window.endTime}</span>)}</div>}
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => selectTab(tab.id)} aria-pressed={activeTab === tab.id} style={{ textAlign: 'left', background: activeTab === tab.id ? 'hsl(var(--secondary))' : 'hsl(var(--card))', border: activeTab === tab.id ? '1px solid var(--gold-mid)' : '1px solid hsl(var(--border))', cursor: 'pointer', padding: '1rem', color: 'hsl(var(--foreground))', transition: 'background-color 180ms ease, border-color 180ms ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1rem' }}>{tab.label}</span>
                {typeof tab.count === 'number' && <span style={{ ...labelStyle, color: activeTab === tab.id ? 'var(--gold-mid)' : 'hsl(var(--muted-foreground))', fontSize: '0.625rem' }}>{tab.count}</span>}
              </div>
              <span style={{ display: 'block', ...labelStyle, marginTop: '0.35rem', fontSize: '0.5625rem', lineHeight: 1.35 }}>{tab.description}</span>
            </button>
          ))}
        </div>

        {activeTab === 'bookings' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ ...labelStyle, margin: '0 0 0.4rem', color: 'var(--gold-mid)' }}>{language === 'ru' ? 'Рабочая очередь' : 'Work queue'}</p>
              <h3 style={{ margin: 0, fontStyle: 'italic' }}>{language === 'ru' ? 'Заявки клиентов' : 'Client bookings'}</h3>
            </div>
            {bookingPageLoading ? <p style={labelStyle}>{language === 'ru' ? 'Загрузка...' : 'Loading...'}</p>
            : bookingPageError ? <p style={{ ...labelStyle, color: 'hsl(0, 60%, 50%)' }}>{language === 'ru' ? 'Не удалось загрузить заявки. Обновите страницу.' : 'Bookings could not be loaded. Refresh the page.'}</p>
            : (bookingPageData?.total ?? 0) === 0 ? <p style={labelStyle}>{language === 'ru' ? 'Нет заявок' : 'No bookings yet'}</p>
            : (
              <>
                <p style={{ margin: '0 0 1.5rem', padding: '0.875rem 1rem', borderLeft: '2px solid var(--gold-mid)', backgroundColor: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                  {language === 'ru'
                    ? 'Сначала обработайте новые заявки. После визита откройте подтверждённую запись и отправьте клиенту личную просьбу оставить отзыв.'
                    : 'Handle new requests first. After a completed visit, open the confirmed booking and send the client a personal review request.'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', minWidth: 'min(100%, 16rem)', flex: '1 1 15rem' }}>
                    <span style={{ ...labelStyle, fontSize: '0.5625rem' }}>{language === 'ru' ? 'Поиск клиента или заявки' : 'Search clients or bookings'}</span>
                    <input value={bookingSearch} onChange={event => setBookingSearch(event.target.value)} placeholder={language === 'ru' ? 'Имя, телефон или email' : 'Name, phone, or email'} style={{ ...inputStyle, border: '1px solid hsl(var(--border))', padding: '0.625rem 0.75rem' }} />
                  </label>
                  <div>
                    <p style={{ ...labelStyle, margin: '0 0 0.625rem', fontSize: '0.5625rem' }}>{language === 'ru' ? 'Статус' : 'Status'}</p>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      {([
                        { id: 'all', label: language === 'ru' ? 'Все' : 'All' },
                        { id: 'pending', label: language === 'ru' ? 'Ожидают' : 'Pending' },
                        { id: 'confirmed', label: language === 'ru' ? 'Подтверждены' : 'Confirmed' },
                        { id: 'declined', label: language === 'ru' ? 'Отклонены' : 'Declined' },
                      ] as { id: BookingStatusFilter; label: string }[]).map(filter => (
                        <button
                          key={filter.id}
                          onClick={() => setBookingStatusFilter(filter.id)}
                          aria-pressed={bookingStatusFilter === filter.id}
                          style={{
                            ...labelStyle,
                            fontSize: '0.5625rem',
                            padding: '0.5rem 0.625rem',
                            color: bookingStatusFilter === filter.id ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                            background: bookingStatusFilter === filter.id ? 'hsl(var(--secondary))' : 'transparent',
                            border: '1px solid hsl(var(--border))',
                            cursor: 'pointer',
                          }}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', minWidth: '11rem' }}>
                    <span style={{ ...labelStyle, fontSize: '0.5625rem' }}>{language === 'ru' ? 'Сортировка' : 'Sort'}</span>
                    <select
                      value={bookingSort}
                      onChange={event => setBookingSort(event.target.value as BookingSort)}
                      style={{ color: 'hsl(var(--foreground))', backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 0, padding: '0.625rem 0.75rem', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem' }}
                    >
                      <option value="appointmentAsc">{language === 'ru' ? 'Ближайшие сначала' : 'Nearest first'}</option>
                      <option value="appointmentDesc">{language === 'ru' ? 'Поздние сначала' : 'Latest first'}</option>
                      <option value="newest">{language === 'ru' ? 'Новые заявки' : 'Newest requests'}</option>
                      <option value="statusAsc">{language === 'ru' ? 'По статусу' : 'By status'}</option>
                    </select>
                  </label>
                  <button type="button" className="btn-outline" onClick={exportBookingsCsv} disabled={visibleBookings.length === 0} style={{ fontSize: '0.5625rem', padding: '0.625rem 0.9rem' }}>
                    {language === 'ru' ? 'Скачать CSV' : 'Download CSV'}
                  </button>
                </div>
                {visibleBookings.length === 0 ? (
                  <p style={labelStyle}>{language === 'ru' ? 'Заявок с таким статусом нет' : 'No bookings match this status'}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {visibleBookings.map(booking => (
                  <div key={booking.id} style={{ ...cardStyle }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', backgroundColor: statusColors[booking.status] }} />
                    <div style={{ paddingLeft: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.125rem', fontWeight: 700, color: 'hsl(var(--foreground))', margin: '0 0 0.25rem' }}>{booking.clientName}</p>
                          <p style={{ ...labelStyle, margin: 0, fontSize: '0.5625rem' }}>{booking.referenceNumber}</p>
                        </div>
                        <span style={{ ...labelStyle, fontSize: '0.5625rem', color: statusColors[booking.status], border: `1px solid ${statusColors[booking.status]}`, padding: '0.25rem 0.625rem' }}>
                          {booking.status === 'pending' ? (language === 'ru' ? 'Ожидание' : 'Pending') : booking.status === 'confirmed' ? (language === 'ru' ? 'Подтверждено' : 'Confirmed') : (language === 'ru' ? 'Отклонено' : 'Declined')}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(8rem, 1fr))', gap: '0.75rem 1.25rem', marginBottom: '1rem' }}>
                        {[
                          { label: language === 'ru' ? 'Услуги' : 'Services', value: booking.serviceSummary || booking.serviceName },
                          { label: language === 'ru' ? 'Дата' : 'Date', value: booking.bookingDate },
                          { label: language === 'ru' ? 'Время' : 'Time', value: booking.bookingTime },
                          { label: language === 'ru' ? 'Длительность' : 'Duration', value: booking.totalDurationMinutes ? `${booking.totalDurationMinutes} ${language === 'ru' ? 'мин' : 'min'}` : '—' },
                          { label: language === 'ru' ? 'Стоимость' : 'Price', value: booking.totalPriceSummary || '—' },
                          { label: language === 'ru' ? 'Телефон' : 'Phone', value: booking.clientPhone },
                          ...(booking.clientEmail ? [{ label: 'Email', value: booking.clientEmail }] : []),
                        ].map(row => (
                          <div key={row.label}>
                            <p style={{ ...labelStyle, margin: '0 0 0.25rem', fontSize: '0.5625rem' }}>{row.label}</p>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'hsl(var(--foreground))', margin: 0 }}>{row.value}</p>
                          </div>
                        ))}
                      </div>
                      {booking.comment && <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem', fontStyle: 'italic' }}>"{booking.comment}"</p>}
                      {booking.manualDepositAmountAmd && (
                        <div style={{ marginBottom: '1rem', padding: '0.85rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--secondary))' }}>
                          <p style={{ ...labelStyle, margin: 0, fontSize: '0.5625rem', color: 'var(--gold-mid)' }}>{language === 'ru' ? 'Предоплата' : 'Manual deposit'}</p>
                          <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem' }}>{booking.manualDepositAmountAmd.toLocaleString()} ֏ · {booking.manualDepositStatus === 'verified' ? (language === 'ru' ? 'подтверждена' : 'verified') : booking.manualDepositStatus === 'proof_received' ? (language === 'ru' ? 'чек получен' : 'receipt received') : (language === 'ru' ? 'ожидает проверки' : 'awaiting review')}</p>
                          {booking.manualDepositReceiptKey && <DepositReceiptPreview bookingId={booking.id} language={language} />}
                          {booking.manualDepositStatus === 'proof_received' && <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.8rem' }}><button type="button" className="btn-primary" style={{ fontSize: '0.5625rem', padding: '0.55rem 0.75rem' }} disabled={manualDepositStatusMutation.isPending} onClick={() => manualDepositStatusMutation.mutate({ id: booking.id, status: 'verified' })}>{language === 'ru' ? 'Подтвердить оплату' : 'Verify payment'}</button><button type="button" className="btn-outline" style={{ fontSize: '0.5625rem', padding: '0.55rem 0.75rem' }} disabled={manualDepositStatusMutation.isPending} onClick={() => manualDepositStatusMutation.mutate({ id: booking.id, status: 'waived' })}>{language === 'ru' ? 'Не засчитывать' : 'Waive'}</button></div>}
                        </div>
                      )}
                      {booking.clientId && (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => { setSelectedClientId(booking.clientId); selectTab('clients'); }}
                          style={{ fontSize: '0.625rem', padding: '0 0 1rem', color: 'var(--gold-mid)' }}
                        >
                          {language === 'ru' ? 'Открыть память о клиенте →' : 'Open client memory →'}
                        </button>
                      )}
                      {booking.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button className="btn-primary" title={booking.manualDepositAmountAmd && booking.manualDepositStatus !== 'verified' ? (language === 'ru' ? 'Сначала подтвердите чек предоплаты' : 'Verify the deposit receipt first') : undefined} style={{ flex: 1, fontSize: '0.625rem', padding: '0.625rem 1rem' }} onClick={() => confirmMutation.mutate({ id: booking.id })} disabled={confirmMutation.isPending || declineMutation.isPending || Boolean(booking.manualDepositAmountAmd && booking.manualDepositStatus !== 'verified')}>
                            {language === 'ru' ? 'Подтвердить' : 'Confirm'}
                          </button>
                          <button className="btn-outline" style={{ flex: 1, fontSize: '0.625rem', padding: '0.625rem 1rem' }} onClick={() => declineMutation.mutate({ id: booking.id })} disabled={confirmMutation.isPending || declineMutation.isPending}>
                            {language === 'ru' ? 'Отклонить' : 'Decline'}
                          </button>
                        </div>
                      )}
                      {booking.status === 'confirmed' && booking.completedAt && booking.clientEmail && (
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', paddingTop: '0.25rem' }}>
                          <button
                            className="btn-outline"
                            style={{ fontSize: '0.625rem', padding: '0.625rem 1rem' }}
                            onClick={() => requestReviewMutation.mutate({ id: booking.id })}
                            disabled={requestReviewMutation.isPending}
                          >
                            {requestReviewMutation.isPending
                              ? <><Loader2 size={13} className="animate-spin" style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '0.35rem' }} />{language === 'ru' ? 'Отправка...' : 'Sending...'}</>
                              : (language === 'ru' ? 'Отправить запрос на отзыв' : 'Send review request')}
                          </button>
                          <span aria-live="polite" style={{ ...labelStyle, fontSize: '0.5625rem', color: lastReviewRequestBookingId === booking.id ? statusColors.confirmed : 'hsl(var(--muted-foreground))' }}>
                            {lastReviewRequestBookingId === booking.id
                              ? (language === 'ru' ? 'Письмо отправлено' : 'Email sent')
                              : (language === 'ru' ? 'Отправляй после визита' : 'Send after the visit')}
                          </span>
                        </div>
                      )}
                      {booking.status === 'confirmed' && (
                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.9rem' }}>
                          <button type="button" className="btn-outline" style={{ fontSize: '0.625rem', padding: '0.625rem 1rem' }} onClick={() => { setRescheduleBookingId(booking.id); setRescheduleDate(booking.bookingDate); setRescheduleTime(booking.bookingTime); setRescheduleNote(''); }}>
                            {language === 'ru' ? 'Перенести' : 'Reschedule'}
                          </button>
                          {!booking.completedAt && <button type="button" className="btn-primary" style={{ fontSize: '0.625rem', padding: '0.625rem 1rem' }} onClick={() => { setCompleteBookingId(booking.id); setFinalPriceAmd(''); setCompletionNote(''); }}>
                            {language === 'ru' ? 'Визит завершён' : 'Complete visit'}
                          </button>}
                        </div>
                      )}
                      {rescheduleBookingId === booking.id && (
                        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--gold-mid)', background: 'hsl(var(--secondary))' }}>
                          <p style={{ ...labelStyle, margin: '0 0 0.75rem', color: 'var(--gold-mid)' }}>{language === 'ru' ? 'Перенос визита' : 'Reschedule visit'}</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(8rem, 1fr))', gap: '0.75rem' }}>
                            <select value={rescheduleDate} onChange={event => { setRescheduleDate(event.target.value); setRescheduleTime(''); }} style={{ ...inputStyle, background: 'hsl(var(--card))' }}><option value="">—</option>{(openDates ?? []).map(date => <option key={date} value={date}>{date}</option>)}</select>
                            <select value={rescheduleTime} onChange={event => setRescheduleTime(event.target.value)} style={{ ...inputStyle, background: 'hsl(var(--card))' }}><option value="">—</option>{Array.from(new Set([...(rescheduleSlots ?? []), ...(rescheduleDate === booking.bookingDate ? [booking.bookingTime] : [])])).sort().map(time => <option key={time} value={time}>{time}</option>)}</select>
                          </div>
                          <input value={rescheduleNote} onChange={event => setRescheduleNote(event.target.value)} placeholder={language === 'ru' ? 'Причина или заметка (необязательно)' : 'Reason or note (optional)'} style={{ ...inputStyle, marginTop: '0.75rem' }} />
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                            <button type="button" className="btn-primary" style={{ flex: 1, fontSize: '0.625rem' }} disabled={!rescheduleDate || !rescheduleTime || rescheduleMutation.isPending} onClick={() => rescheduleMutation.mutate({ id: booking.id, bookingDate: rescheduleDate, bookingTime: rescheduleTime, note: rescheduleNote.trim() || undefined })}>{language === 'ru' ? 'Сохранить перенос' : 'Save move'}</button>
                            <button type="button" className="btn-outline" style={{ flex: 1, fontSize: '0.625rem' }} onClick={() => setRescheduleBookingId(null)}>{language === 'ru' ? 'Отмена' : 'Cancel'}</button>
                          </div>
                        </div>
                      )}
                      {completeBookingId === booking.id && (
                        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid hsl(142 50% 40% / 0.5)', background: 'hsl(142 50% 40% / 0.08)' }}>
                          <p style={{ ...labelStyle, margin: '0 0 0.75rem', color: 'hsl(142 50% 40%)' }}>{language === 'ru' ? 'Завершить визит и обновить память' : 'Complete visit and update memory'}</p>
                          <input type="number" min="0" value={finalPriceAmd} onChange={event => setFinalPriceAmd(event.target.value)} placeholder={language === 'ru' ? 'Фактическая стоимость в ֏ (необязательно)' : 'Final amount in ֏ (optional)'} style={inputStyle} />
                          <input value={completionNote} onChange={event => setCompletionNote(event.target.value)} placeholder={language === 'ru' ? 'Заметка к визиту (необязательно)' : 'Visit note (optional)'} style={{ ...inputStyle, marginTop: '0.75rem' }} />
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                            <button type="button" className="btn-primary" style={{ flex: 1, fontSize: '0.625rem' }} disabled={completeMutation.isPending} onClick={() => completeMutation.mutate({ id: booking.id, finalPriceAmd: finalPriceAmd ? Number(finalPriceAmd) : undefined, note: completionNote.trim() || undefined })}>{language === 'ru' ? 'Подтвердить завершение' : 'Confirm completion'}</button>
                            <button type="button" className="btn-outline" style={{ flex: 1, fontSize: '0.625rem' }} onClick={() => setCompleteBookingId(null)}>{language === 'ru' ? 'Отмена' : 'Cancel'}</button>
                          </div>
                        </div>
                      )}
                      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border))' }}>
                        {deleteBookingId === booking.id ? (
                          <div style={{ padding: '0.875rem', border: '1px solid hsl(0 60% 50% / 0.55)', background: 'hsl(0 60% 50% / 0.08)' }}>
                            <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: 'hsl(var(--foreground))', lineHeight: 1.5 }}>
                              {language === 'ru' ? 'Удалить эту запись навсегда? История визита, запросы на отзыв и связанные данные будут удалены.' : 'Delete this booking permanently? Its visit history, review requests, and related data will be removed.'}
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <button type="button" className="btn-outline" onClick={() => setDeleteBookingId(null)} disabled={deleteBookingMutation.isPending}>{language === 'ru' ? 'Отмена' : 'Cancel'}</button>
                              <button type="button" className="btn-outline" onClick={() => deleteBookingMutation.mutate({ id: booking.id })} disabled={deleteBookingMutation.isPending} style={{ color: 'hsl(0, 60%, 50%)', borderColor: 'hsl(0, 60%, 50%)' }}>
                                {deleteBookingMutation.isPending ? <><Loader2 size={13} className="animate-spin" style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '0.35rem' }} />{language === 'ru' ? 'Удаление...' : 'Deleting...'}</> : (language === 'ru' ? 'Удалить навсегда' : 'Delete permanently')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" className="btn-ghost" onClick={() => setDeleteBookingId(booking.id)} style={{ color: 'hsl(0, 60%, 50%)', fontSize: '0.625rem', padding: 0 }}>
                            <Trash2 size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '0.35rem' }} />{language === 'ru' ? 'Удалить запись' : 'Delete booking'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                    ))}
                  </div>
                )}
                {(bookingPageData?.total ?? 0) > 0 && (
                  <div style={{ marginTop: '1.25rem', display: 'grid', gap: '0.6rem', justifyItems: 'center' }}>
                    <p data-testid="booking-page-summary" aria-live="polite" style={{ ...labelStyle, margin: 0, fontSize: '0.5625rem' }}>
                      {language === 'ru'
                        ? `Страница ${bookingPage} из ${bookingPageCount} · всего ${bookingPageData?.total ?? 0}`
                        : `Page ${bookingPage} of ${bookingPageCount} · ${bookingPageData?.total ?? 0} total`}
                    </p>
                    <Pagination aria-label={language === 'ru' ? 'Страницы заявок' : 'Booking pages'}>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationLink href="#bookings" size="default" aria-label={language === 'ru' ? 'Предыдущая страница заявок' : 'Previous booking page'} aria-disabled={bookingPage === 1} className={bookingPage === 1 ? 'pointer-events-none opacity-40' : ''} onClick={(event) => { event.preventDefault(); if (bookingPage > 1) setBookingPage(bookingPage - 1); }}>
                            {language === 'ru' ? 'Назад' : 'Previous'}
                          </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#bookings" isActive size="default" onClick={(event) => event.preventDefault()}>{bookingPage}</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#bookings" size="default" aria-label={language === 'ru' ? 'Следующая страница заявок' : 'Next booking page'} aria-disabled={bookingPage >= bookingPageCount} className={bookingPage >= bookingPageCount ? 'pointer-events-none opacity-40' : ''} onClick={(event) => { event.preventDefault(); if (bookingPage < bookingPageCount) setBookingPage(bookingPage + 1); }}>
                            {language === 'ru' ? 'Вперёд' : 'Next'}
                          </PaginationLink>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ ...labelStyle, margin: '0 0 0.4rem', color: 'var(--gold-mid)' }}>{language === 'ru' ? 'Контроль расписания' : 'Schedule control'}</p>
              <h3 style={{ margin: 0, fontStyle: 'italic' }}>{language === 'ru' ? 'Доступность для записи' : 'Booking availability'}</h3>
            </div>
            <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '2rem', fontSize: '0.875rem' }}>
              {language === 'ru'
                ? 'Выделяйте несколько дней и одним действием открывайте или закрывайте точные рабочие часы для онлайн-записи.'
                : 'Select multiple days and open or close precise working hours in one action.'}
            </p>
            <ScheduleCalendar language={language as 'ru' | 'en'} />
          </div>
        )}

        {activeTab === 'services' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ ...labelStyle, margin: '0 0 0.4rem', color: 'var(--gold-mid)' }}>{language === 'ru' ? 'Каталог и цены' : 'Catalog and prices'}</p>
              <h3 style={{ margin: 0, fontStyle: 'italic' }}>{language === 'ru' ? 'Услуги и прайс-лист' : 'Services and price list'}</h3>
            </div>
            <ServiceManager language={language as 'ru' | 'en'} />
          </div>
        )}

        {activeTab === 'payment' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ ...labelStyle, margin: '0 0 0.4rem', color: 'var(--gold-mid)' }}>{language === 'ru' ? 'Оплата вручную' : 'Manual payment'}</p>
              <h3 style={{ margin: 0, fontStyle: 'italic' }}>{language === 'ru' ? 'Предоплата, чек и политика' : 'Deposit, receipt, and policy'}</h3>
            </div>
            <ManualDepositSettingsEditor language={language as 'ru' | 'en'} />
          </div>
        )}

        {activeTab === 'calendar' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ ...labelStyle, margin: '0 0 0.4rem', color: 'var(--gold-mid)' }}>{language === 'ru' ? 'План визитов' : 'Visit plan'}</p>
              <h3 style={{ margin: 0, fontStyle: 'italic' }}>{language === 'ru' ? 'Календарь клиентов' : 'Client calendar'}</h3>
            </div>
            <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '2rem', fontSize: '0.875rem' }}>
              {language === 'ru'
                ? 'Выберите дату, чтобы увидеть записи клиентов и их текущий статус.'
                : 'Select a date to see client bookings and their current status.'}
            </p>
            {bookingsLoading ? (
              <p style={labelStyle}>{language === 'ru' ? 'Загрузка заявок...' : 'Loading bookings...'}</p>
            ) : bookingsError ? (
              <p style={{ ...labelStyle, color: 'hsl(0, 60%, 50%)' }}>{language === 'ru' ? 'Не удалось загрузить заявки. Обновите страницу.' : 'Bookings could not be loaded. Refresh the page.'}</p>
            ) : (
              <BookingCalendar language={language as 'ru' | 'en'} bookings={bookings ?? []} />
            )}
          </div>
        )}

        {activeTab === 'clients' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ ...labelStyle, margin: '0 0 0.4rem', color: 'var(--gold-mid)' }}>{language === 'ru' ? 'Рабочая память' : 'Working memory'}</p>
              <h3 style={{ margin: 0, fontStyle: 'italic' }}>{language === 'ru' ? 'Клиенты' : 'Clients'}</h3>
            </div>
            <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
              <label style={{ display: 'grid', gap: '0.55rem' }}>
                <span style={{ ...labelStyle, fontSize: '0.5625rem' }}>{language === 'ru' ? 'Найти клиента' : 'Find a client'}</span>
                <input value={clientSearch} onChange={event => setClientSearch(event.target.value)} placeholder={language === 'ru' ? 'Имя, телефон или email' : 'Name, phone, or email'} style={{ ...inputStyle, border: '1px solid hsl(var(--border))', padding: '0.625rem 0.75rem' }} />
              </label>
              {clientDirectoryLoading ? <p style={{ ...labelStyle, margin: '0.85rem 0 0', fontSize: '0.5625rem' }}>{language === 'ru' ? 'Загружаю клиентов...' : 'Loading clients...'}</p> : visibleClientDirectory.length === 0 ? <p style={{ ...labelStyle, margin: '0.85rem 0 0', fontSize: '0.5625rem' }}>{language === 'ru' ? 'Клиенты не найдены' : 'No clients found'}</p> : (
                <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.85rem', maxHeight: '16rem', overflowY: 'auto' }}>
                  {visibleClientDirectory.map(client => <button key={client.id} type="button" onClick={() => setSelectedClientId(client.id)} style={{ textAlign: 'left', padding: '0.7rem 0.75rem', background: selectedClientId === client.id ? 'hsl(var(--secondary))' : 'transparent', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', cursor: 'pointer' }}>
                    <span style={{ display: 'block', fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{client.name}</span>
                    <span style={{ ...labelStyle, display: 'block', marginTop: '0.2rem', fontSize: '0.5625rem' }}>{client.phone}{client.email ? ` · ${client.email}` : ''}</span>
                  </button>)}
                </div>
              )}
            </div>
            {!selectedClientId ? <p style={{ maxWidth: '38rem', padding: '1rem', borderLeft: '2px solid var(--gold-mid)', background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem', lineHeight: 1.6 }}>
              {language === 'ru' ? 'Выберите клиента выше или откройте его из карточки заявки. Здесь будут предпочтения, заметки, история визитов, фото и статистика перед следующим визитом.' : 'Choose a client above or open one from a booking card. This workspace shows preferences, notes, visit history, photos, and useful metrics before the next visit.'}
            </p> : <ClientMemoryPanel clientId={selectedClientId} language={language as 'ru' | 'en'} onClose={() => setSelectedClientId(null)} />}
          </div>
        )}

        {activeTab === 'news' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ ...labelStyle, margin: '0 0 0.4rem', color: 'var(--gold-mid)' }}>{language === 'ru' ? 'Личные новости' : 'Personal notice'}</p>
              <h3 style={{ margin: 0, fontStyle: 'italic' }}>{language === 'ru' ? 'Новости и отпуск' : 'News and vacation'}</h3>
            </div>
            <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
              {language === 'ru'
                ? 'Создайте двуязычную афишу, задайте период и опубликуйте её. Она появится справа в первом экране сайта только в активные даты.'
                : 'Create a bilingual notice, set its dates, and publish it. It appears on the right side of the home hero only during its active period.'}
            </p>
            <AnnouncementManager language={language as 'ru' | 'en'} />
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ ...labelStyle, margin: '0 0 0.4rem', color: 'var(--gold-mid)' }}>{language === 'ru' ? 'Репутация' : 'Reputation'}</p>
              <h3 style={{ margin: 0, fontStyle: 'italic' }}>{language === 'ru' ? 'Отзывы клиентов' : 'Client reviews'}</h3>
            </div>
            {reviewRequestsLoading ? (
              <div aria-live="polite" style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Loader2 size={18} className="animate-spin" color="var(--gold-mid)" />
                <p style={{ ...labelStyle, margin: 0 }}>{language === 'ru' ? 'Загружаю историю запросов...' : 'Loading request history...'}</p>
              </div>
            ) : reviewRequestsError ? (
              <p style={{ ...labelStyle, color: 'hsl(0, 60%, 50%)' }}>{language === 'ru' ? 'Не удалось загрузить историю запросов. Обновите страницу.' : 'Could not load request history. Refresh the page.'}</p>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {[
                    { label: language === 'ru' ? 'Отправлено' : 'Sent', value: reviewRequestStats?.sent ?? 0, color: 'var(--gold-mid)' },
                    { label: language === 'ru' ? 'Получено отзывов' : 'Reviews received', value: reviewRequestStats?.received ?? 0, color: statusColors.confirmed },
                    { label: language === 'ru' ? 'Ожидают ответа' : 'Awaiting response', value: reviewRequestStats?.awaiting ?? 0, color: statusColors.pending },
                  ].map(stat => (
                    <div key={stat.label} style={{ ...cardStyle, padding: '1rem' }}>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.85rem', color: stat.color, margin: '0 0 0.2rem' }}>{stat.value}</p>
                      <p style={{ ...labelStyle, margin: 0, fontSize: '0.5625rem' }}>{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
                  <div>
                    <p style={{ ...labelStyle, margin: '0 0 0.5rem', fontSize: '0.5625rem' }}>{language === 'ru' ? 'Статус запроса' : 'Request status'}</p>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      {([
                        { id: 'all', label: language === 'ru' ? 'Все' : 'All' },
                        { id: 'awaiting', label: language === 'ru' ? 'Ожидают' : 'Awaiting' },
                        { id: 'received', label: language === 'ru' ? 'Получены' : 'Received' },
                      ] as { id: ReviewRequestStatusFilter; label: string }[]).map(filter => (
                        <button key={filter.id} onClick={() => setReviewRequestStatusFilter(filter.id)} aria-pressed={reviewRequestStatusFilter === filter.id} style={{ ...labelStyle, fontSize: '0.5625rem', padding: '0.5rem 0.625rem', color: reviewRequestStatusFilter === filter.id ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', background: reviewRequestStatusFilter === filter.id ? 'hsl(var(--secondary))' : 'transparent', border: '1px solid hsl(var(--border))', cursor: 'pointer' }}>{filter.label}</button>
                      ))}
                    </div>
                  </div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '12rem' }}>
                    <span style={{ ...labelStyle, fontSize: '0.5625rem' }}>{language === 'ru' ? 'Сортировка' : 'Sort'}</span>
                    <select value={reviewRequestSort} onChange={event => setReviewRequestSort(event.target.value as ReviewRequestSort)} style={{ color: 'hsl(var(--foreground))', backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 0, padding: '0.625rem 0.75rem', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem' }}>
                      <option value="sentDesc">{language === 'ru' ? 'Сначала новые' : 'Newest sent first'}</option>
                      <option value="sentAsc">{language === 'ru' ? 'Сначала ранние' : 'Oldest sent first'}</option>
                      <option value="receivedDesc">{language === 'ru' ? 'Сначала полученные отзывы' : 'Received reviews first'}</option>
                    </select>
                  </label>
                  <button type="button" className="btn-outline" onClick={exportReviewRequestsCsv} disabled={visibleReviewRequests.length === 0} style={{ fontSize: '0.5625rem', padding: '0.625rem 0.9rem' }}>
                    {language === 'ru' ? 'Скачать CSV' : 'Download CSV'}
                  </button>
                </div>
                {visibleReviewRequests.length === 0 ? <p style={labelStyle}>{language === 'ru' ? 'Запросов с таким статусом пока нет' : 'No requests match this status yet'}</p> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}>
                    {visibleReviewRequests.map(request => (
                      <div key={request.id} style={{ ...cardStyle, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, margin: '0 0 0.25rem', color: 'hsl(var(--foreground))' }}>{request.clientName}</p>
                          <p style={{ ...labelStyle, margin: 0, fontSize: '0.5625rem' }}>{request.referenceNumber} · {new Date(request.sentAt).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}</p>
                        </div>
                        <span style={{ ...labelStyle, fontSize: '0.5625rem', color: request.status === 'received' ? statusColors.confirmed : statusColors.pending, border: `1px solid ${request.status === 'received' ? statusColors.confirmed : statusColors.pending}`, padding: '0.25rem 0.625rem' }}>
                          {request.status === 'received' ? (language === 'ru' ? 'Отзыв получен' : 'Review received') : (language === 'ru' ? 'Ожидает ответа' : 'Awaiting response')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {(reviewRequestPageData?.total ?? 0) > 0 && (
                  <div style={{ display: 'grid', gap: '0.6rem', justifyItems: 'center', marginTop: '-1.5rem', marginBottom: '1rem' }}>
                    <p aria-live="polite" style={{ ...labelStyle, margin: 0, fontSize: '0.5625rem' }}>
                      {language === 'ru'
                        ? `Страница ${reviewRequestPage} из ${reviewRequestPageCount} · всего ${reviewRequestPageData?.total ?? 0}`
                        : `Page ${reviewRequestPage} of ${reviewRequestPageCount} · ${reviewRequestPageData?.total ?? 0} total`}
                    </p>
                    <Pagination aria-label={language === 'ru' ? 'Страницы запросов на отзыв' : 'Review request pages'}>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationLink href="#reviews" size="default" aria-label={language === 'ru' ? 'Предыдущая страница запросов на отзыв' : 'Previous review request page'} aria-disabled={reviewRequestPage === 1} className={reviewRequestPage === 1 ? 'pointer-events-none opacity-40' : ''} onClick={(event) => { event.preventDefault(); if (reviewRequestPage > 1) setReviewRequestPage(reviewRequestPage - 1); }}>
                            {language === 'ru' ? 'Назад' : 'Previous'}
                          </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#reviews" isActive size="default" onClick={(event) => event.preventDefault()}>{reviewRequestPage}</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#reviews" size="default" aria-label={language === 'ru' ? 'Следующая страница запросов на отзыв' : 'Next review request page'} aria-disabled={reviewRequestPage >= reviewRequestPageCount} className={reviewRequestPage >= reviewRequestPageCount ? 'pointer-events-none opacity-40' : ''} onClick={(event) => { event.preventDefault(); if (reviewRequestPage < reviewRequestPageCount) setReviewRequestPage(reviewRequestPage + 1); }}>
                            {language === 'ru' ? 'Вперёд' : 'Next'}
                          </PaginationLink>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid hsl(var(--border))' }}>
              <p style={{ ...labelStyle, margin: '0 0 0.4rem', color: 'var(--gold-mid)' }}>{language === 'ru' ? 'Модерация' : 'Moderation'}</p>
              <h4 style={{ margin: '0 0 1rem', fontStyle: 'italic' }}>{language === 'ru' ? 'Полученные отзывы' : 'Received reviews'}</h4>
              {!allReviews?.length ? <p style={labelStyle}>{language === 'ru' ? 'Нет отзывов' : 'No reviews yet'}</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {allReviews.map(review => (
                  <div key={review.id} style={{ ...cardStyle }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: 'hsl(var(--foreground))', margin: '0 0 0.25rem' }}>{review.clientName}</p>
                        <p style={{ ...labelStyle, margin: 0, fontSize: '0.5625rem' }}>{review.referenceNumber}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ color: 'var(--gold-mid)', fontSize: '0.875rem' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                        <span style={{ ...labelStyle, fontSize: '0.5625rem', color: review.isPublished === 'yes' ? statusColors.confirmed : statusColors.pending, border: `1px solid ${review.isPublished === 'yes' ? statusColors.confirmed : statusColors.pending}`, padding: '0.25rem 0.625rem' }}>
                          {review.isPublished === 'yes' ? (language === 'ru' ? 'Опубликован' : 'Published') : (language === 'ru' ? 'Скрыт' : 'Hidden')}
                        </span>
                      </div>
                    </div>
                    {review.text && <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', fontStyle: 'italic', marginBottom: '1rem' }}>"{review.text}"</p>}
                    <button className={review.isPublished === 'yes' ? 'btn-outline' : 'btn-primary'} style={{ fontSize: '0.5625rem', padding: '0.5rem 1rem' }} onClick={() => publishReviewMutation.mutate({ id: review.id, publish: review.isPublished !== 'yes' })} disabled={publishReviewMutation.isPending}>
                      {review.isPublished === 'yes' ? (language === 'ru' ? 'Скрыть' : 'Hide') : (language === 'ru' ? 'Опубликовать' : 'Publish')}
                    </button>
                  </div>
                ))}
              </div>
            )}
            </div>
            <ReviewRequestTemplateEditor language={language as 'ru' | 'en'} />
          </div>
        )}
      </div>
    </div>
  );
}
