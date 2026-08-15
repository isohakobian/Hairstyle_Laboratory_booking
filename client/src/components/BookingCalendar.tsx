import { useMemo, useState } from 'react';

type Language = 'ru' | 'en';
type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled';

export type CalendarBooking = {
  id: number;
  bookingDate: string;
  bookingTime: string;
  clientName: string;
  serviceName: string;
  status: BookingStatus;
};

interface Props {
  language: Language;
  bookings: CalendarBooking[];
}

const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const statusColor: Record<BookingStatus, string> = {
  pending: 'hsl(35, 60%, 50%)',
  confirmed: 'hsl(142, 50%, 40%)',
  declined: 'hsl(0, 60%, 50%)',
  cancelled: 'hsl(0, 0%, 48%)',
};

function toYMD(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function daysInMonth(year: number, month: number) {
  const days: Date[] = [];
  const cursor = new Date(year, month, 1);
  while (cursor.getMonth() === month) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function mondayOffset(date: Date) {
  return date.getDay() === 0 ? 6 : date.getDay() - 1;
}

export default function BookingCalendar({ language, bookings }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const bookingsByDate = useMemo(() => {
    const entries = new Map<string, CalendarBooking[]>();
    bookings.forEach(booking => {
      const dayBookings = entries.get(booking.bookingDate) ?? [];
      entries.set(booking.bookingDate, [...dayBookings, booking]);
    });
    entries.forEach(dayBookings => dayBookings.sort((a, b) => a.bookingTime.localeCompare(b.bookingTime)));
    return entries;
  }, [bookings]);

  const days = daysInMonth(viewYear, viewMonth);
  const dayNames = language === 'ru' ? DAYS_RU : DAYS_EN;
  const monthName = (language === 'ru' ? MONTHS_RU : MONTHS_EN)[viewMonth];
  const selectedBookings = selectedDate ? bookingsByDate.get(selectedDate) ?? [] : [];

  const goPrevious = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(year => year - 1);
    } else setViewMonth(month => month - 1);
  };

  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(year => year + 1);
    } else setViewMonth(month => month + 1);
  };

  const statusLabel = (status: BookingStatus) => {
    if (language === 'ru') return status === 'pending' ? 'Ожидание' : status === 'confirmed' ? 'Подтверждено' : status === 'cancelled' ? 'Отменено клиентом' : 'Отклонено';
    return status === 'pending' ? 'Pending' : status === 'confirmed' ? 'Confirmed' : status === 'cancelled' ? 'Cancelled by client' : 'Declined';
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.6875rem',
    fontWeight: 500,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'hsl(var(--muted-foreground))',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button onClick={goPrevious} aria-label={language === 'ru' ? 'Предыдущий месяц' : 'Previous month'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', fontSize: '1.25rem', padding: '0.25rem 0.5rem' }}>←</button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', fontWeight: 700, color: 'hsl(var(--foreground))', margin: 0, fontStyle: 'italic' }}>{monthName}</p>
          <p style={{ ...labelStyle, margin: '0.125rem 0 0', fontSize: '0.5625rem' }}>{viewYear}</p>
        </div>
        <button onClick={goNext} aria-label={language === 'ru' ? 'Следующий месяц' : 'Next month'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', fontSize: '1.25rem', padding: '0.25rem 0.5rem' }}>→</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '2px', marginBottom: '4px' }}>
        {dayNames.map(day => <div key={day} style={{ ...labelStyle, textAlign: 'center', padding: '0.5rem 0', fontSize: '0.5625rem' }}>{day}</div>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '2px' }}>
        {Array.from({ length: mondayOffset(days[0]) }).map((_, index) => <div key={`empty-${index}`} />)}
        {days.map(date => {
          const ymd = toYMD(date);
          const dayBookings = bookingsByDate.get(ymd) ?? [];
          const isSelected = selectedDate === ymd;
          const isToday = ymd === toYMD(today);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const preview = dayBookings.length
            ? `${ymd}: ${dayBookings.map(booking => `${booking.bookingTime} ${booking.clientName}`).join(', ')}`
            : ymd;

          return (
            <button
              key={ymd}
              onClick={() => setSelectedDate(ymd)}
              aria-pressed={isSelected}
              title={preview}
              style={{
                minHeight: '3.5rem',
                padding: '0.375rem 0.125rem',
                background: isSelected ? 'hsl(var(--secondary))' : 'transparent',
                border: isSelected || isToday ? '1px solid var(--gold-mid)' : '1px solid transparent',
                borderRadius: '2px',
                color: isToday ? 'var(--gold-mid)' : isWeekend ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.8125rem',
                fontWeight: isToday ? 600 : 400,
                textAlign: 'center',
                transition: 'background 160ms cubic-bezier(0.23, 1, 0.32, 1), border-color 160ms cubic-bezier(0.23, 1, 0.32, 1)',
              }}
            >
              <span>{date.getDate()}</span>
              {dayBookings.length > 0 && (
                <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '3px', marginTop: '0.375rem', minHeight: '6px' }}>
                  {dayBookings.slice(0, 3).map(booking => <span key={booking.id} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusColor[booking.status] }} />)}
                  {dayBookings.length > 3 && <span style={{ fontSize: '0.5625rem', lineHeight: 1, color: 'hsl(var(--muted-foreground))' }}>+{dayBookings.length - 3}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
        {(['pending', 'confirmed', 'declined', 'cancelled'] as BookingStatus[]).map(status => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor[status] }} />
            <span style={{ ...labelStyle, fontSize: '0.5625rem' }}>{statusLabel(status)}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '2rem', borderTop: '1px solid hsl(var(--border))', paddingTop: '1.25rem' }}>
        <p style={{ ...labelStyle, margin: '0 0 1rem', color: selectedDate ? 'var(--gold-mid)' : 'hsl(var(--muted-foreground))' }}>
          {selectedDate ? selectedDate : (language === 'ru' ? 'Выберите день' : 'Select a day')}
        </p>
        {!selectedDate ? (
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>{language === 'ru' ? 'Нажмите на дату, чтобы увидеть заявки.' : 'Select a date to view appointments.'}</p>
        ) : selectedBookings.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>{language === 'ru' ? 'На этот день заявок нет.' : 'There are no bookings on this day.'}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {selectedBookings.map(booking => (
              <div key={booking.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.875rem 0', borderBottom: '1px solid hsl(var(--border))' }}>
                <div>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: 'hsl(var(--foreground))', margin: '0 0 0.25rem' }}>{booking.bookingTime} — {booking.clientName}</p>
                  <p style={{ ...labelStyle, margin: 0, fontSize: '0.5625rem' }}>{booking.serviceName}</p>
                </div>
                <span style={{ ...labelStyle, fontSize: '0.5625rem', color: statusColor[booking.status], border: `1px solid ${statusColor[booking.status]}`, padding: '0.25rem 0.5rem', whiteSpace: 'nowrap' }}>{statusLabel(booking.status)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
