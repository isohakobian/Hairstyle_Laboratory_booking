import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

type Language = 'ru' | 'en';
type Draft = { firstOffsetMinutes: number; firstEnabled: 'yes' | 'no'; secondOffsetMinutes: number; secondEnabled: 'yes' | 'no' };
const emptyDraft: Draft = { firstOffsetMinutes: 1440, firstEnabled: 'yes', secondOffsetMinutes: 120, secondEnabled: 'yes' };

function offsetLabel(minutes: number, language: Language) {
  if (minutes % 1440 === 0) return language === 'ru' ? `${minutes / 1440} дн.` : `${minutes / 1440} days`;
  if (minutes % 60 === 0) return language === 'ru' ? `${minutes / 60} ч.` : `${minutes / 60} hours`;
  return language === 'ru' ? `${minutes} мин.` : `${minutes} min`;
}

export default function BookingReminderSettingsEditor({ language }: { language: Language }) {
  const ru = language === 'ru';
  const { data: settings, isLoading, refetch } = trpc.admin.bookingReminderSettings.useQuery();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  useEffect(() => { if (settings) setDraft(settings); }, [settings]);
  const saveMutation = trpc.admin.saveBookingReminderSettings.useMutation({
    onSuccess: () => { toast.success(ru ? 'Настройки напоминаний сохранены' : 'Reminder settings saved'); refetch(); },
    onError: error => toast.error(error.message),
  });
  const inputStyle: React.CSSProperties = { width: '100%', color: 'hsl(var(--foreground))', background: 'transparent', border: '1px solid hsl(var(--border))', padding: '0.75rem', fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', outline: 'none' };
  const labelStyle: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' };
  const update = (key: keyof Draft, value: string) => setDraft(current => ({ ...current, [key]: key.endsWith('Minutes') ? Math.max(0, Number(value)) : value } as Draft));
  if (isLoading) return <p style={labelStyle}>{ru ? 'Загружаю настройки напоминаний...' : 'Loading reminder settings...'}</p>;
  return <section style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid hsl(var(--border))' }}>
    <p style={{ ...labelStyle, margin: '0 0 0.4rem', color: 'var(--gold-mid)' }}>{ru ? 'Напоминания клиентам' : 'Client reminders'}</p>
    <h4 style={{ margin: '0 0 0.6rem', fontStyle: 'italic' }}>{ru ? 'Время отправки email' : 'Email timing'}</h4>
    <p style={{ maxWidth: '46rem', margin: '0 0 1.25rem', fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.55 }}>{ru ? 'Система проверяет записи каждые 30 минут. Меняйте интервал в минутах и при необходимости отключайте каждое напоминание отдельно.' : 'The system checks bookings every 30 minutes. Change the offset in minutes and enable or disable each reminder independently.'}</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))', gap: '1rem' }}>
      {([{ offset: 'firstOffsetMinutes', enabled: 'firstEnabled', label: ru ? 'Первое напоминание' : 'First reminder', min: 30 }, { offset: 'secondOffsetMinutes', enabled: 'secondEnabled', label: ru ? 'Второе напоминание' : 'Second reminder', min: 15 }] as const).map(item => <div key={item.offset} style={{ border: '1px solid hsl(var(--border))', padding: '1rem' }}>
        <label style={{ display: 'grid', gap: '0.45rem' }}><span style={labelStyle}>{item.label}</span><input type="number" min={item.min} value={draft[item.offset]} onChange={event => update(item.offset, event.target.value)} style={inputStyle} /><span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{ru ? `Сейчас: за ${offsetLabel(draft[item.offset], language)} до визита` : `Currently: ${offsetLabel(draft[item.offset], language)} before the visit`}</span></label>
        <label style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', marginTop: '0.85rem', fontSize: '0.8125rem', cursor: 'pointer' }}><input type="checkbox" checked={draft[item.enabled] === 'yes'} onChange={event => update(item.enabled, event.target.checked ? 'yes' : 'no')} /><span>{ru ? 'Отправлять это напоминание' : 'Send this reminder'}</span></label>
      </div>)}
    </div>
    <button type="button" className="btn-primary" onClick={() => saveMutation.mutate(draft)} disabled={saveMutation.isPending || draft.firstOffsetMinutes < 30 || draft.secondOffsetMinutes < 15} style={{ marginTop: '1rem', fontSize: '0.625rem' }}>{saveMutation.isPending ? <><Loader2 size={13} className="animate-spin" style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '0.35rem' }} />{ru ? 'Сохранение...' : 'Saving...'}</> : (ru ? 'Сохранить время напоминаний' : 'Save reminder timing')}</button>
  </section>;
}
