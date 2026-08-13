import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface Props {
  language: 'ru' | 'en';
}

const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function toYMD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysInMonth(year: number, month: number) {
  const days: Date[] = [];
  const cursor = new Date(year, month, 1);
  while (cursor.getMonth() === month) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function getMondayOffset(date: Date) {
  return date.getDay() === 0 ? 6 : date.getDay() - 1;
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '0.625rem',
  fontWeight: 600,
  letterSpacing: '0.13em',
  textTransform: 'uppercase',
  color: 'hsl(var(--muted-foreground))',
};

export default function ScheduleCalendar({ language }: Props) {
  const initialToday = new Date();
  initialToday.setHours(0, 0, 0, 0);
  const [viewYear, setViewYear] = useState(initialToday.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialToday.getMonth());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('19:00');
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState(30);
  const [blockReason, setBlockReason] = useState('');

  const { data: blockedDates, refetch: refetchBlocked } = trpc.admin.blockedDates.useQuery();
  const { data: windows, refetch: refetchWindows } = trpc.admin.availabilityWindows.useQuery();
  const refresh = () => { refetchBlocked(); refetchWindows(); };

  const openMutation = trpc.admin.setAvailability.useMutation({
    onSuccess: () => {
      toast.success(language === 'ru' ? 'Дни и слоты открыты' : 'Days and time slots opened');
      setSelectedDates([]);
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const closeMutation = trpc.admin.blockDates.useMutation({
    onSuccess: () => {
      toast.success(language === 'ru' ? 'Дни закрыты' : 'Days closed');
      setSelectedDates([]);
      setBlockReason('');
      refresh();
    },
    onError: error => toast.error(error.message),
  });

  const blockedSet = useMemo(() => new Set((blockedDates ?? []).map(entry => entry.date)), [blockedDates]);
  const windowMap = useMemo(() => {
    const result: Record<string, { startTime: string; endTime: string }[]> = {};
    (windows ?? []).forEach((window) => {
      result[window.date] = [...(result[window.date] ?? []), { startTime: window.startTime, endTime: window.endTime }];
    });
    return result;
  }, [windows]);
  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);
  const days = getDaysInMonth(viewYear, viewMonth);
  const firstDayOffset = getMondayOffset(days[0]);
  const isPending = openMutation.isPending || closeMutation.isPending;
  const datesReady = selectedDates.length > 0;

  const toggleDate = (ymd: string) => {
    setSelectedDates(current => current.includes(ymd) ? current.filter(date => date !== ymd) : [...current, ymd].sort());
  };
  const changeMonth = (direction: -1 | 1) => {
    const next = new Date(viewYear, viewMonth + direction, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };
  const openSelected = () => openMutation.mutate({ dates: selectedDates, startTime, endTime, slotIntervalMinutes });
  const closeSelected = () => closeMutation.mutate({ dates: selectedDates, reason: blockReason.trim() || undefined });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button type="button" className="btn-ghost" onClick={() => changeMonth(-1)} style={{ fontSize: '1.25rem', padding: '0.25rem 0.5rem' }}>←</button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', fontWeight: 700, color: 'hsl(var(--foreground))', margin: 0, fontStyle: 'italic' }}>
            {(language === 'ru' ? MONTHS_RU : MONTHS_EN)[viewMonth]}
          </p>
          <p style={{ ...labelStyle, margin: '0.125rem 0 0' }}>{viewYear}</p>
        </div>
        <button type="button" className="btn-ghost" onClick={() => changeMonth(1)} style={{ fontSize: '1.25rem', padding: '0.25rem 0.5rem' }}>→</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '4px' }}>
        {(language === 'ru' ? DAYS_RU : DAYS_EN).map(day => <div key={day} style={{ ...labelStyle, textAlign: 'center', padding: '0.5rem 0' }}>{day}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
        {Array.from({ length: firstDayOffset }).map((_, index) => <div key={`blank-${index}`} />)}
        {days.map(date => {
          const ymd = toYMD(date);
          const isPast = date < initialToday;
          const isSelected = selectedSet.has(ymd);
          const isBlocked = blockedSet.has(ymd);
          const isOpen = Boolean(windowMap[ymd]?.length) && !isBlocked;
          const title = isBlocked
            ? (language === 'ru' ? 'Закрыт' : 'Closed')
            : isOpen ? windowMap[ymd].map(window => `${window.startTime}–${window.endTime}`).join(', ') : (language === 'ru' ? 'Не открыт' : 'Not opened');
          return (
            <button
              key={ymd}
              type="button"
              aria-pressed={isSelected}
              disabled={isPast || isPending}
              title={title}
              onClick={() => toggleDate(ymd)}
              style={{
                minHeight: '3rem', position: 'relative', borderRadius: '2px', cursor: isPast ? 'default' : 'pointer',
                border: isSelected ? '1px solid var(--gold-mid)' : isBlocked ? '1px solid hsl(0 60% 50% / 0.35)' : isOpen ? '1px solid hsl(142 50% 40% / 0.35)' : '1px solid transparent',
                background: isSelected ? 'hsl(var(--accent) / 0.16)' : isBlocked ? 'hsl(0 60% 50% / 0.10)' : isOpen ? 'hsl(142 50% 40% / 0.10)' : 'transparent',
                color: isPast ? 'hsl(var(--muted-foreground))' : isBlocked ? 'hsl(0 60% 50%)' : isOpen ? 'hsl(142 50% 40%)' : 'hsl(var(--foreground))',
                fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem',
              }}
            >
              {date.getDate()}
              {(isOpen || isBlocked) && <span style={{ position: 'absolute', bottom: '0.28rem', left: '50%', width: '4px', height: '4px', borderRadius: '50%', transform: 'translateX(-50%)', background: isBlocked ? 'hsl(0 60% 50%)' : 'hsl(142 50% 40%)' }} />}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: '1.5rem', padding: '1.25rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <p style={{ ...labelStyle, margin: 0, color: 'var(--gold-mid)' }}>{language === 'ru' ? `Выбрано дней: ${selectedDates.length}` : `Selected days: ${selectedDates.length}`}</p>
          {datesReady && <button type="button" className="btn-ghost" onClick={() => setSelectedDates([])} style={{ fontSize: '0.625rem', padding: 0 }}>{language === 'ru' ? 'Очистить выбор' : 'Clear selection'}</button>}
        </div>
        <p style={{ margin: '0 0 1rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.8125rem', lineHeight: 1.5 }}>
          {language === 'ru' ? 'Выдели несколько дат. Открытие добавит точные рабочие часы; закрытие уберёт слоты и скроет дни от клиентов.' : 'Select multiple dates. Opening adds exact working hours; closing removes slots and hides the days from clients.'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(8rem, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>{language === 'ru' ? 'Начало' : 'Start'}</span><input type="time" value={startTime} onChange={event => setStartTime(event.target.value)} style={{ padding: '0.6rem', background: 'transparent', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} /></label>
          <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>{language === 'ru' ? 'Конец' : 'End'}</span><input type="time" value={endTime} onChange={event => setEndTime(event.target.value)} style={{ padding: '0.6rem', background: 'transparent', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} /></label>
          <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>{language === 'ru' ? 'Шаг слота' : 'Slot interval'}</span><select value={slotIntervalMinutes} onChange={event => setSlotIntervalMinutes(Number(event.target.value))} style={{ padding: '0.6rem', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}><option value={30}>30 {language === 'ru' ? 'мин' : 'min'}</option><option value={15}>15 {language === 'ru' ? 'мин' : 'min'}</option><option value={60}>60 {language === 'ru' ? 'мин' : 'min'}</option></select></label>
        </div>
        <input value={blockReason} onChange={event => setBlockReason(event.target.value)} placeholder={language === 'ru' ? 'Причина закрытия: отпуск, выходной…' : 'Closing reason: vacation, day off…'} style={{ width: '100%', marginBottom: '1rem', padding: '0.65rem 0', background: 'transparent', border: 'none', borderBottom: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', outline: 'none' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button type="button" className="btn-primary" onClick={openSelected} disabled={!datesReady || isPending}>{language === 'ru' ? 'Открыть выбранные дни' : 'Open selected days'}</button>
          <button type="button" className="btn-outline" onClick={closeSelected} disabled={!datesReady || isPending}>{language === 'ru' ? 'Закрыть выбранные дни' : 'Close selected days'}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
        {[{ color: 'hsl(142 50% 40%)', label: language === 'ru' ? 'Открыт со слотами' : 'Open with slots' }, { color: 'hsl(0 60% 50%)', label: language === 'ru' ? 'Закрыт' : 'Closed' }, { color: 'var(--gold-mid)', label: language === 'ru' ? 'Выбран' : 'Selected' }].map(item => <div key={item.label} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: item.color }} /><span style={labelStyle}>{item.label}</span></div>)}
      </div>
    </div>
  );
}
