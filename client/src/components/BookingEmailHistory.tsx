import React from 'react';
import { Loader2, Mail, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

type Language = 'ru' | 'en';

const typeLabel: Record<string, Record<Language, string>> = {
  'booking-request': { ru: 'Заявка получена', en: 'Request received' },
  'booking-confirmed': { ru: 'Запись подтверждена', en: 'Booking confirmed' },
  'booking-rescheduled': { ru: 'Время перенесено', en: 'Time rescheduled' },
  'booking-cancelled': { ru: 'Запись отменена', en: 'Booking cancelled' },
  'booking-declined': { ru: 'Заявка отклонена', en: 'Booking declined' },
};

export default function BookingEmailHistory({ bookingId, clientEmail, language }: { bookingId: number; clientEmail?: string | null; language: Language }) {
  const ru = language === 'ru';
  const [showAll, setShowAll] = React.useState(false);
  const { data: history, isLoading, refetch } = trpc.admin.clientEmailHistory.useQuery({ bookingId });
  const resendMutation = trpc.admin.resendBookingNotification.useMutation({
    onSuccess: data => {
      toast.success(data.skipped ? (ru ? 'Письмо не отправлено: Gmail пока не настроен' : 'Email was skipped because Gmail is not configured') : (ru ? 'Актуальное уведомление отправлено повторно' : 'The current notification was resent'));
      refetch();
    },
    onError: error => toast.error(error.message),
  });
  const labelStyle: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' };
  if (!clientEmail) return null;
  return <section style={{ margin: '0 0 1rem', padding: '0.85rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--secondary))' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div><p style={{ ...labelStyle, margin: 0, color: 'var(--gold-mid)' }}>{ru ? 'Клиентские email' : 'Client emails'}</p><p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{clientEmail}</p></div>
      <button type="button" className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.5625rem', padding: '0.5rem 0.65rem' }} onClick={() => resendMutation.mutate({ bookingId })} disabled={resendMutation.isPending}>
        {resendMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}{ru ? 'Повторить email' : 'Resend email'}
      </button>
    </div>
    {isLoading ? <p style={{ ...labelStyle, margin: '0.75rem 0 0', fontSize: '0.5rem' }}>{ru ? 'Загружаю историю...' : 'Loading history...'}</p>
      : (history ?? []).length === 0 ? <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{ru ? 'Пока нет записей об отправке.' : 'No delivery attempts yet.'}</p>
      : <div style={{ display: 'grid', gap: '0.45rem', marginTop: '0.75rem' }}>{history!.slice(0, showAll ? undefined : 5).map(item => <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0.5rem', alignItems: 'center', fontSize: '0.72rem' }}><Mail size={12} color={item.deliveryStatus === 'sent' ? 'hsl(142 50% 40%)' : item.deliveryStatus === 'failed' ? 'hsl(0 60% 50%)' : 'hsl(var(--muted-foreground))'} /><span>{typeLabel[item.notificationType]?.[language] ?? item.notificationType}{item.isManualResend === 'yes' ? (ru ? ' · повторно' : ' · resent') : ''}{item.errorMessage ? ` · ${item.errorMessage}` : ''}</span><span style={{ color: item.deliveryStatus === 'sent' ? 'hsl(142 50% 40%)' : item.deliveryStatus === 'failed' ? 'hsl(0 60% 50%)' : 'hsl(var(--muted-foreground))' }}>{item.deliveryStatus === 'sent' ? (ru ? 'отправлено' : 'sent') : item.deliveryStatus === 'failed' ? (ru ? 'ошибка' : 'failed') : (ru ? 'пропущено' : 'skipped')}</span></div>)}{history!.length > 5 && <button type="button" className="btn-ghost" onClick={() => setShowAll(value => !value)} style={{ justifySelf: 'start', padding: '0.35rem 0', fontSize: '0.5625rem', color: 'var(--gold-mid)' }}>{showAll ? (ru ? 'Свернуть историю' : 'Show less') : (ru ? `Показать все (${history!.length})` : `Show all (${history!.length})`)}</button>}</div>}
  </section>;
}
