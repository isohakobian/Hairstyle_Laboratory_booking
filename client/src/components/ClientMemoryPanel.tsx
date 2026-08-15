import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

type Language = 'ru' | 'en';

type Props = {
  clientId: number;
  language: Language;
  onClose: () => void;
};

const REPEAT_BOOKING_DRAFT_KEY = 'hairstyle-laboratory.repeat-booking-draft';

const labelStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '0.625rem',
  fontWeight: 600,
  letterSpacing: '0.13em',
  textTransform: 'uppercase',
  color: 'hsl(var(--muted-foreground))',
};

function formatAmd(amount: number) {
  return `${amount.toLocaleString()} ֏`;
}

function PrivateVisitImage({ storageKey, alt }: { storageKey: string; alt: string }) {
  const { data: url } = trpc.admin.visitMediaUrl.useQuery({ storageKey });
  if (!url) return <div style={{ aspectRatio: '1', background: 'hsl(var(--secondary))' }} />;
  return <img src={url} alt={alt} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', border: '1px solid hsl(var(--border))' }} />;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const payload = result.split(',')[1];
      if (!payload) reject(new Error('Image could not be read'));
      else resolve(payload);
    };
    reader.onerror = () => reject(new Error('Image could not be read'));
    reader.readAsDataURL(file);
  });
}

export default function ClientMemoryPanel({ clientId, language, onClose }: Props) {
  const ru = language === 'ru';
  const [, setLocation] = useLocation();
  const { data: memory, isLoading, refetch } = trpc.admin.clientMemory.useQuery({ clientId });
  const [values, setValues] = useState({
    birthday: '', instagram: '', preferredHairLength: '', preferredBeardShape: '', preferredStyling: '', dislikes: '', skinSensitivity: '', stylistNotes: '',
  });

  useEffect(() => {
    if (!memory?.profile) return;
    setValues({
      birthday: memory.profile.birthday ?? '',
      instagram: memory.profile.instagram ?? '',
      preferredHairLength: memory.profile.preferredHairLength ?? '',
      preferredBeardShape: memory.profile.preferredBeardShape ?? '',
      preferredStyling: memory.profile.preferredStyling ?? '',
      dislikes: memory.profile.dislikes ?? '',
      skinSensitivity: memory.profile.skinSensitivity ?? '',
      stylistNotes: memory.profile.stylistNotes ?? '',
    });
  }, [memory?.profile]);

  const updateMutation = trpc.admin.updateClientMemory.useMutation({
    onSuccess: () => { toast.success(ru ? 'Карточка клиента сохранена' : 'Client profile saved'); refetch(); },
    onError: error => toast.error(error.message),
  });
  const uploadMutation = trpc.admin.uploadVisitMedia.useMutation({
    onSuccess: () => { toast.success(ru ? 'Фото добавлено' : 'Photo added'); refetch(); },
    onError: error => toast.error(error.message),
  });

  const save = () => updateMutation.mutate({
    clientId,
    birthday: values.birthday || null,
    instagram: values.instagram.trim().replace(/^@/, '') || null,
    preferredHairLength: values.preferredHairLength.trim() || null,
    preferredBeardShape: values.preferredBeardShape.trim() || null,
    preferredStyling: values.preferredStyling.trim() || null,
    dislikes: values.dislikes.trim() || null,
    skinSensitivity: values.skinSensitivity.trim() || null,
    stylistNotes: values.stylistNotes.trim() || null,
  });
  const change = (key: keyof typeof values, value: string) => setValues(current => ({ ...current, [key]: value }));
  const upload = async (event: React.ChangeEvent<HTMLInputElement>, bookingId: number, mediaType: 'before' | 'after') => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error(ru ? 'Поддерживаются JPEG, PNG и WebP' : 'JPEG, PNG, and WebP are supported'); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error(ru ? 'Фото должно быть меньше 8 МБ' : 'Image must be smaller than 8 MB'); return; }
    try {
      uploadMutation.mutate({ bookingId, mediaType, fileName: file.name, mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp', base64Data: await readFileAsBase64(file) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (ru ? 'Не удалось прочитать фото' : 'Image could not be read'));
    } finally {
      event.target.value = '';
    }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.65rem 0', background: 'transparent', border: 'none', borderBottom: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', outline: 'none', fontFamily: "'Inter', sans-serif", fontSize: '0.875rem' };
  if (isLoading || !memory) return <div style={{ padding: '2rem 0' }}><p style={labelStyle}>{ru ? 'Загружаем память о клиенте...' : 'Loading client memory...'}</p></div>;

  const { profile, metrics } = memory;
  const repeatBooking = (visit: typeof memory.visits[number]) => {
    if (visit.serviceIds.length === 0) {
      toast.error(ru ? 'Не удалось определить услуги прошлого визита' : 'The previous visit services could not be identified');
      return;
    }
    try {
      window.sessionStorage.setItem(REPEAT_BOOKING_DRAFT_KEY, JSON.stringify({
        serviceIds: visit.serviceIds,
        clientName: profile.name,
        clientPhone: profile.phone,
        clientEmail: profile.email ?? '',
        clientBirthday: profile.birthday ?? '',
        clientInstagram: profile.instagram ?? '',
      }));
      setLocation('/booking');
    } catch {
      toast.error(ru ? 'Не удалось подготовить повторную запись' : 'Could not prepare the repeat booking');
    }
  };
  return (
    <section style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid var(--gold-mid)', background: 'hsl(var(--card))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ ...labelStyle, color: 'var(--gold-mid)', margin: '0 0 0.5rem' }}>{ru ? 'Память о клиенте · private' : 'Client memory · private'}</p>
          <h3 style={{ margin: 0, fontStyle: 'italic' }}>{profile.name}</h3>
          <p style={{ margin: '0.4rem 0 0', color: 'hsl(var(--muted-foreground))', fontSize: '0.8125rem' }}>{profile.phone}{profile.email ? ` · ${profile.email}` : ''}{profile.instagram ? ` · @${profile.instagram}` : ''}</p>
        </div>
        <button type="button" className="btn-ghost" onClick={onClose} style={{ fontSize: '0.625rem', padding: 0 }}>{ru ? 'Закрыть' : 'Close'}</button>
      </div>

      <p style={{ margin: '0 0 1.25rem', padding: '0.8rem 1rem', borderLeft: '2px solid var(--gold-mid)', background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '0.8125rem', lineHeight: 1.5 }}>
        {ru ? 'Перед визитом: проверь предпочтения, последнюю услугу, заметки и историю. Это приватная рабочая карточка Isaac.' : 'Before the visit: review preferences, last service, notes, and visit history. This is Isaac’s private working card.'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(8rem, 1fr))', gap: '0.75rem', marginBottom: '1.75rem' }}>
        {[
          { label: ru ? 'Визитов' : 'Visits', value: String(metrics.completedVisitCount) },
          { label: ru ? 'Потрачено' : 'Total spent', value: formatAmd(metrics.totalSpentAmd) },
          { label: ru ? 'Средний чек' : 'Average check', value: formatAmd(metrics.averageCheckAmd) },
          { label: ru ? 'Последний визит' : 'Last visit', value: metrics.lastVisit ? `${metrics.lastVisit.bookingDate} · ${metrics.daysSinceLastVisit} ${ru ? 'дн. назад' : 'days ago'}` : (ru ? 'Пока нет' : 'None yet') },
        ].map(item => <div key={item.label} style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '0.65rem' }}><p style={{ ...labelStyle, margin: 0 }}>{item.label}</p><p style={{ margin: '0.35rem 0 0', fontFamily: "'Playfair Display', serif", color: 'hsl(var(--foreground))', fontWeight: 700 }}>{item.value}</p></div>)}
      </div>
      {metrics.popularServices.length > 0 && <p style={{ margin: '-0.9rem 0 1.5rem', fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))' }}>{ru ? 'Чаще всего: ' : 'Most frequent: '}{metrics.popularServices.join(' · ')}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {([
          ['birthday', ru ? 'День рождения' : 'Birthday', 'date'],
          ['instagram', 'Instagram', 'text'],
          ['preferredHairLength', ru ? 'Длина / форма' : 'Length / shape', 'text'],
          ['preferredBeardShape', ru ? 'Форма бороды' : 'Beard shape', 'text'],
          ['preferredStyling', ru ? 'Стайлинг' : 'Styling', 'text'],
          ['skinSensitivity', ru ? 'Чувствительность кожи' : 'Skin sensitivity', 'text'],
          ['dislikes', ru ? 'Что не нравится' : 'Dislikes', 'text'],
        ] as Array<[keyof typeof values, string, string]>).map(([key, label, type]) => (
          <label key={key} style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>{label}</span><input type={type} value={values[key]} onChange={event => change(key, event.target.value)} style={inputStyle} /></label>
        ))}
      </div>
      <label style={{ display: 'grid', gap: '0.4rem', marginBottom: '1.25rem' }}><span style={labelStyle}>{ru ? 'Заметки Isaac' : 'Isaac’s notes'}</span><textarea value={values.stylistNotes} onChange={event => change('stylistNotes', event.target.value)} placeholder={ru ? 'Например: в следующий раз короче по бокам; отращивает длину.' : 'For example: shorter on the sides next time; growing length.'} rows={4} style={{ ...inputStyle, border: '1px solid hsl(var(--border))', padding: '0.75rem', resize: 'vertical' }} /></label>
      <button type="button" className="btn-primary" onClick={save} disabled={updateMutation.isPending}>{updateMutation.isPending ? '...' : (ru ? 'Сохранить карточку' : 'Save profile')}</button>

      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid hsl(var(--border))' }}>
        <p style={{ ...labelStyle, margin: '0 0 1rem', color: 'var(--gold-mid)' }}>{ru ? 'История визитов и фото' : 'Visit history and photos'}</p>
        {memory.visits.length === 0 ? <p style={labelStyle}>{ru ? 'Истории пока нет' : 'No history yet'}</p> : <div style={{ display: 'grid', gap: '1rem' }}>
          {memory.visits.map(visit => {
            const media = memory.media.filter(item => item.bookingId === visit.id);
            const reviewRequests = memory.reviewRequests.filter(item => item.bookingId === visit.id);
            const visitNotes = memory.events.filter(item => item.bookingId === visit.id && item.note);
            const repeatStatus = visit.repeatFollowUpSentAt
              ? (ru ? `Письмо на повторную запись отправлено: ${new Date(visit.repeatFollowUpSentAt).toLocaleDateString()}` : `Repeat-booking email sent: ${new Date(visit.repeatFollowUpSentAt).toLocaleDateString()}`)
              : visit.completedAt
                ? (ru ? 'Повторная запись: письмо будет автоматически проверено через 14 недель после визита' : 'Repeat booking: automatic email will be checked 14 weeks after the visit')
                : (ru ? 'Повторная запись: будет доступна после завершения визита' : 'Repeat booking: available after the visit is completed');
            return <article key={visit.id} style={{ padding: '1rem', border: '1px solid hsl(var(--border))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div><p style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{visit.bookingDate} · {visit.bookingTime}</p><p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))' }}>{visit.serviceSummary || visit.serviceName} · {visit.totalDurationMinutes} {ru ? 'мин' : 'min'} · {visit.finalPriceAmd ? formatAmd(visit.finalPriceAmd) : visit.totalPriceSummary}</p></div>
                <span style={{ ...labelStyle, color: visit.completedAt ? 'hsl(142 50% 40%)' : 'hsl(var(--muted-foreground))' }}>{visit.completedAt ? (ru ? 'Завершён' : 'Completed') : (ru ? 'В процессе' : 'In progress')}</span>
              </div>
              {visit.completedAt && visit.serviceIds.length > 0 && <button type="button" className="btn-outline" onClick={() => repeatBooking(visit)} style={{ marginTop: '0.85rem', padding: '0.55rem 0.8rem', fontSize: '0.625rem' }}>{ru ? 'Запланировать повтор' : 'Plan a repeat visit'}</button>}
              <p style={{ margin: '0.85rem 0 0', padding: '0.65rem 0.75rem', background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem', lineHeight: 1.45 }}>{repeatStatus}</p>
              {visitNotes.length > 0 && <div style={{ marginTop: '0.85rem' }}><p style={{ ...labelStyle, margin: '0 0 0.35rem' }}>{ru ? 'Заметки визита' : 'Visit notes'}</p>{visitNotes.map(note => <p key={note.id} style={{ margin: '0.35rem 0', fontSize: '0.8125rem', color: 'hsl(var(--foreground))' }}>{note.note}</p>)}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(7rem, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                {(['before', 'after'] as const).map(type => <label key={type} style={{ display: 'grid', gap: '0.45rem' }}><span style={labelStyle}>{type === 'before' ? (ru ? 'До' : 'Before') : (ru ? 'После' : 'After')}</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadMutation.isPending} onChange={event => upload(event, visit.id, type)} style={{ fontSize: '0.72rem', maxWidth: '100%' }} /></label>)}
              </div>
              {media.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(6rem, 1fr))', gap: '0.6rem', marginTop: '1rem' }}>{media.map(item => <PrivateVisitImage key={item.id} storageKey={item.storageKey} alt={`${item.mediaType} · ${visit.bookingDate}`} />)}</div>}
              <div style={{ marginTop: '1rem' }}>
                <p style={{ ...labelStyle, margin: 0 }}>{ru ? 'Запросы на отзыв' : 'Review requests'}</p>
                {reviewRequests.length === 0
                  ? <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{ru ? 'Пока не отправлялись' : 'Not sent yet'}</p>
                  : reviewRequests.map(request => <p key={request.id} style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{new Date(request.sentAt).toLocaleString()} · {request.recipientEmail}</p>)}
              </div>
            </article>;
          })}
        </div>}
      </div>
    </section>
  );
}
