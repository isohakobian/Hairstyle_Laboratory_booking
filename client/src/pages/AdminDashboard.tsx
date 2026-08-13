import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import ScheduleCalendar from '@/components/ScheduleCalendar';
import BookingCalendar from '@/components/BookingCalendar';

type Tab = 'bookings' | 'calendar' | 'schedule' | 'reviews';
type BookingStatusFilter = 'all' | 'pending' | 'confirmed' | 'declined';
type BookingSort = 'appointmentAsc' | 'appointmentDesc' | 'newest' | 'statusAsc';

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

export default function AdminDashboard() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('bookings');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<BookingStatusFilter>('all');
  const [bookingSort, setBookingSort] = useState<BookingSort>('appointmentAsc');
  const { data: bookings, isLoading: bookingsLoading, isError: bookingsError, refetch: refetchBookings } = trpc.admin.bookings.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });
  const { data: allReviews, refetch: refetchReviews } = trpc.admin.reviews.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const confirmMutation = trpc.admin.confirmBooking.useMutation({
    onSuccess: () => { toast.success(language === 'ru' ? 'Подтверждено' : 'Confirmed'); refetchBookings(); },
    onError: (e) => toast.error(e.message),
  });
  const declineMutation = trpc.admin.declineBooking.useMutation({
    onSuccess: () => { toast.success(language === 'ru' ? 'Отклонено' : 'Declined'); refetchBookings(); },
    onError: (e) => toast.error(e.message),
  });
  const publishReviewMutation = trpc.admin.publishReview.useMutation({
    onSuccess: () => { toast.success(language === 'ru' ? 'Обновлено' : 'Updated'); refetchReviews(); },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'admin')) setLocation('/');
  }, [isAuthenticated, user, loading, setLocation]);

  const visibleBookings = useMemo(() => {
    const filtered = (bookings ?? []).filter(booking => (
      bookingStatusFilter === 'all' || booking.status === bookingStatusFilter
    ));

    return [...filtered].sort((a, b) => {
      if (bookingSort === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (bookingSort === 'statusAsc') {
        const statusOrder = { pending: 0, confirmed: 1, declined: 2 } as const;
        const statusComparison = statusOrder[a.status] - statusOrder[b.status];
        if (statusComparison !== 0) return statusComparison;
      }

      const comparison = `${a.bookingDate}T${a.bookingTime}`.localeCompare(`${b.bookingDate}T${b.bookingTime}`);
      return bookingSort === 'appointmentAsc' ? comparison : -comparison;
    });
  }, [bookings, bookingSort, bookingStatusFilter]);

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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'bookings', label: language === 'ru' ? `Заявки (${bookings?.length ?? 0})` : `Bookings (${bookings?.length ?? 0})` },
    { id: 'calendar', label: language === 'ru' ? 'Календарь заявок' : 'Booking calendar' },
    { id: 'schedule', label: language === 'ru' ? 'Расписание' : 'Schedule' },
    { id: 'reviews', label: language === 'ru' ? `Отзывы (${allReviews?.length ?? 0})` : `Reviews (${allReviews?.length ?? 0})` },
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
          <p style={{ ...labelStyle, marginBottom: '0.75rem', color: 'var(--gold-mid)' }}>Admin</p>
          <h2 style={{ fontStyle: 'italic', marginBottom: 0 }}>{language === 'ru' ? 'Панель управления' : 'Dashboard'}</h2>
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

        <div style={{ display: 'flex', borderBottom: '1px solid hsl(var(--border))', marginBottom: '2rem' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ ...labelStyle, background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--gold-mid)' : '2px solid transparent', cursor: 'pointer', padding: '0.875rem 1.25rem', color: activeTab === tab.id ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', transition: 'all 200ms ease', marginBottom: '-1px' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'bookings' && (
          <div>
            {bookingsLoading ? <p style={labelStyle}>{language === 'ru' ? 'Загрузка...' : 'Loading...'}</p>
            : !bookings?.length ? <p style={labelStyle}>{language === 'ru' ? 'Нет заявок' : 'No bookings yet'}</p>
            : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem 2rem', marginBottom: '1rem' }}>
                        {[
                          { label: language === 'ru' ? 'Услуга' : 'Service', value: booking.serviceName },
                          { label: language === 'ru' ? 'Дата' : 'Date', value: booking.bookingDate },
                          { label: language === 'ru' ? 'Время' : 'Time', value: booking.bookingTime },
                          { label: language === 'ru' ? 'Телефон' : 'Phone', value: booking.clientPhone },
                        ].map(row => (
                          <div key={row.label}>
                            <p style={{ ...labelStyle, margin: '0 0 0.25rem', fontSize: '0.5625rem' }}>{row.label}</p>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'hsl(var(--foreground))', margin: 0 }}>{row.value}</p>
                          </div>
                        ))}
                      </div>
                      {booking.comment && <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem', fontStyle: 'italic' }}>"{booking.comment}"</p>}
                      {booking.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button className="btn-primary" style={{ flex: 1, fontSize: '0.625rem', padding: '0.625rem 1rem' }} onClick={() => confirmMutation.mutate({ id: booking.id })} disabled={confirmMutation.isPending || declineMutation.isPending}>
                            {language === 'ru' ? 'Подтвердить' : 'Confirm'}
                          </button>
                          <button className="btn-outline" style={{ flex: 1, fontSize: '0.625rem', padding: '0.625rem 1rem' }} onClick={() => declineMutation.mutate({ id: booking.id })} disabled={confirmMutation.isPending || declineMutation.isPending}>
                            {language === 'ru' ? 'Отклонить' : 'Decline'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div>
            <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '2rem', fontSize: '0.875rem' }}>
              {language === 'ru'
                ? 'Нажми на день чтобы закрыть или открыть его для записи.'
                : 'Click a day to block or unblock it for bookings.'}
            </p>
            <ScheduleCalendar language={language as 'ru' | 'en'} />
          </div>
        )}

        {activeTab === 'calendar' && (
          <div>
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

        {activeTab === 'reviews' && (
          <div>
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
        )}
      </div>
    </div>
  );
}
