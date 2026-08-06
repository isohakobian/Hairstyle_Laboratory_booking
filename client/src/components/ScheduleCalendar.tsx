import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface Props {
  language: 'ru' | 'en';
}

const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function toYMD(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// Monday-first: 0=Mon, 6=Sun
function getMondayOffset(date: Date): number {
  const day = date.getDay(); // 0=Sun, 1=Mon...6=Sat
  return day === 0 ? 6 : day - 1;
}

export default function ScheduleCalendar({ language }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);

  const { data: blockedDates, refetch } = trpc.admin.blockedDates.useQuery();

  const blockMutation = trpc.admin.blockDate.useMutation({
    onSuccess: () => {
      toast.success(language === 'ru' ? 'День закрыт' : 'Day blocked');
      refetch();
      setPendingDate(null);
      setBlockReason('');
      setShowReasonInput(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const unblockMutation = trpc.admin.unblockDate.useMutation({
    onSuccess: () => {
      toast.success(language === 'ru' ? 'День открыт' : 'Day unblocked');
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const blockedSet = useMemo(() => {
    return new Set((blockedDates ?? []).map(b => b.date));
  }, [blockedDates]);

  const blockedMap = useMemo(() => {
    const m: Record<string, string | null | undefined> = {};
    (blockedDates ?? []).forEach(b => { m[b.date] = b.reason; });
    return m;
  }, [blockedDates]);

  const days = getDaysInMonth(viewYear, viewMonth);
  const firstDayOffset = getMondayOffset(days[0]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDayClick = (date: Date) => {
    const ymd = toYMD(date);
    if (date < today) return; // can't block past dates

    if (blockedSet.has(ymd)) {
      // Unblock immediately
      unblockMutation.mutate({ date: ymd });
    } else {
      // Show reason input before blocking
      setPendingDate(ymd);
      setShowReasonInput(true);
    }
  };

  const confirmBlock = () => {
    if (!pendingDate) return;
    blockMutation.mutate({ date: pendingDate, reason: blockReason || undefined });
  };

  const cancelBlock = () => {
    setPendingDate(null);
    setBlockReason('');
    setShowReasonInput(false);
  };

  const dayNames = language === 'ru' ? DAYS_RU : DAYS_EN;
  const monthName = (language === 'ru' ? MONTHS_RU : MONTHS_EN)[viewMonth];

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.6875rem',
    fontWeight: 500,
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    color: 'hsl(var(--muted-foreground))',
  };

  return (
    <div>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button
          onClick={prevMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', fontSize: '1.25rem', padding: '0.25rem 0.5rem', transition: 'color 150ms ease' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'hsl(var(--foreground))')}
          onMouseLeave={e => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}
        >
          ←
        </button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', fontWeight: 700, color: 'hsl(var(--foreground))', margin: 0, fontStyle: 'italic' }}>
            {monthName}
          </p>
          <p style={{ ...labelStyle, margin: '0.125rem 0 0', fontSize: '0.5625rem' }}>{viewYear}</p>
        </div>
        <button
          onClick={nextMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', fontSize: '1.25rem', padding: '0.25rem 0.5rem', transition: 'color 150ms ease' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'hsl(var(--foreground))')}
          onMouseLeave={e => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}
        >
          →
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
        {dayNames.map(d => (
          <div key={d} style={{ ...labelStyle, textAlign: 'center', padding: '0.5rem 0', fontSize: '0.5625rem' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {/* Empty cells for offset */}
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map(date => {
          const ymd = toYMD(date);
          const isPast = date < today;
          const isToday = toYMD(date) === toYMD(today);
          const isBlocked = blockedSet.has(ymd);
          const isPending = pendingDate === ymd;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          let bg = 'transparent';
          let color = 'hsl(var(--foreground))';
          let border = '1px solid transparent';
          let cursor = 'pointer';

          if (isPast) {
            color = 'hsl(var(--muted-foreground))';
            cursor = 'default';
            bg = 'transparent';
          } else if (isBlocked) {
            bg = 'hsl(0 60% 50% / 0.12)';
            color = 'hsl(0, 60%, 50%)';
            border = '1px solid hsl(0 60% 50% / 0.3)';
          } else if (isPending) {
            bg = 'hsl(var(--accent) / 0.15)';
            border = '1px solid var(--gold-mid)';
            color = 'var(--gold-mid)';
          } else if (isToday) {
            border = '1px solid var(--gold-mid)';
            color = 'var(--gold-mid)';
          } else if (isWeekend) {
            color = 'hsl(var(--muted-foreground))';
          }

          return (
            <button
              key={ymd}
              onClick={() => !isPast && handleDayClick(date)}
              disabled={isPast || blockMutation.isPending || unblockMutation.isPending}
              title={isBlocked ? (blockedMap[ymd] ?? (language === 'ru' ? 'Закрыт' : 'Blocked')) : undefined}
              style={{
                background: bg,
                border,
                borderRadius: '2px',
                color,
                cursor,
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.8125rem',
                fontWeight: isToday ? 600 : 400,
                padding: '0.625rem 0',
                textAlign: 'center',
                transition: 'all 150ms ease',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!isPast && !isBlocked && !isPending) {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--muted) / 0.5)';
                }
              }}
              onMouseLeave={e => {
                if (!isPast && !isBlocked && !isPending) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {date.getDate()}
              {isBlocked && (
                <span style={{
                  position: 'absolute',
                  bottom: '2px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: 'hsl(0, 60%, 50%)',
                  display: 'block',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { color: 'var(--gold-mid)', label: language === 'ru' ? 'Сегодня' : 'Today' },
          { color: 'hsl(0, 60%, 50%)', label: language === 'ru' ? 'Закрыт' : 'Blocked' },
          { color: 'hsl(var(--muted-foreground))', label: language === 'ru' ? 'Открыт' : 'Open' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
            <span style={{ ...labelStyle, fontSize: '0.5625rem' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Reason input popup */}
      {showReasonInput && pendingDate && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1.5rem',
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid var(--gold-mid)',
        }}>
          <p style={{ ...labelStyle, marginBottom: '0.5rem', color: 'var(--gold-mid)' }}>
            {language === 'ru' ? `Закрыть ${pendingDate}` : `Block ${pendingDate}`}
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>
            {language === 'ru' ? 'Укажи причину (необязательно)' : 'Add a reason (optional)'}
          </p>
          <input
            type="text"
            value={blockReason}
            onChange={e => setBlockReason(e.target.value)}
            placeholder={language === 'ru' ? 'Выходной, отпуск, праздник...' : 'Day off, vacation, holiday...'}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') confirmBlock(); if (e.key === 'Escape') cancelBlock(); }}
            style={{
              width: '100%',
              padding: '0.75rem 0',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: '1px solid hsl(var(--border))',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.9375rem',
              color: 'hsl(var(--foreground))',
              outline: 'none',
              marginBottom: '1.25rem',
            }}
          />
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn-primary"
              style={{ flex: 1, fontSize: '0.625rem', padding: '0.625rem 1rem' }}
              onClick={confirmBlock}
              disabled={blockMutation.isPending}
            >
              {language === 'ru' ? 'Закрыть день' : 'Block day'}
            </button>
            <button
              className="btn-outline"
              style={{ flex: 1, fontSize: '0.625rem', padding: '0.625rem 1rem' }}
              onClick={cancelBlock}
            >
              {language === 'ru' ? 'Отмена' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Blocked dates list */}
      {(blockedDates?.length ?? 0) > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <p style={{ ...labelStyle, marginBottom: '1rem' }}>
            {language === 'ru' ? 'Закрытые дни' : 'Blocked days'}
          </p>
          <div>
            {blockedDates?.map(bd => (
              <div key={bd.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.875rem 0',
                borderBottom: '1px solid hsl(var(--border))',
              }}>
                <div>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: 'hsl(var(--foreground))', margin: '0 0 0.125rem' }}>
                    {bd.date}
                  </p>
                  {bd.reason && (
                    <p style={{ ...labelStyle, margin: 0, fontSize: '0.5625rem' }}>{bd.reason}</p>
                  )}
                </div>
                <button
                  className="btn-ghost"
                  style={{ fontSize: '0.5625rem', color: 'hsl(0, 60%, 50%)' }}
                  onClick={() => unblockMutation.mutate({ date: bd.date })}
                  disabled={unblockMutation.isPending}
                >
                  {language === 'ru' ? 'Открыть' : 'Unblock'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
