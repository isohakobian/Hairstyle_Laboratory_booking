import React, { useEffect, useState } from 'react';
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
  const { data: crmPreference, refetch: refetchCrmPreference } = trpc.admin.clientCrmPreference.useQuery({ clientId });
  const { data: manualVisits, refetch: refetchManualVisits } = trpc.admin.manualVisits.useQuery({ clientId });
  const { data: managedServices } = trpc.admin.services.useQuery(undefined);
  const [newsletterConsented, setNewsletterConsented] = useState(false);
  const [historicalVisit, setHistoricalVisit] = useState({ visitDate: new Date().toISOString().slice(0, 10), serviceName: '', priceAmd: '', paidAmd: '', note: '' });
  const [editingManualVisitId, setEditingManualVisitId] = useState<number | null>(null);
  const [editingVisit, setEditingVisit] = useState({ visitDate: '', serviceName: '', priceAmd: '', paidAmd: '', note: '' });
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

  useEffect(() => {
    setNewsletterConsented(crmPreference?.newsletterConsented === 'yes');
  }, [crmPreference?.newsletterConsented]);

  const updateMutation = trpc.admin.updateClientMemory.useMutation({
    onSuccess: () => { toast.success(ru ? 'Карточка клиента сохранена' : 'Client profile saved'); refetch(); },
    onError: error => toast.error(error.message),
  });
  const crmPreferenceMutation = trpc.admin.saveClientCrmPreference.useMutation({
    onSuccess: () => { toast.success(ru ? 'Согласие на новости обновлено' : 'News consent updated'); void refetchCrmPreference(); },
    onError: error => toast.error(error.message),
  });
  const uploadMutation = trpc.admin.uploadVisitMedia.useMutation({
    onSuccess: () => { toast.success(ru ? 'Фото добавлено' : 'Photo added'); refetch(); },
    onError: error => toast.error(error.message),
  });
  const updateManualVisitMutation = trpc.admin.updateManualVisit.useMutation({
    onSuccess: () => { setEditingManualVisitId(null); void refetchManualVisits(); toast.success(ru ? 'Исторический визит обновлён' : 'Historical visit updated'); },
    onError: error => toast.error(error.message),
  });
  const manualVisitMutation = trpc.admin.createManualVisit.useMutation({
    onSuccess: () => {
      setHistoricalVisit({ visitDate: new Date().toISOString().slice(0, 10), serviceName: '', priceAmd: '', paidAmd: '', note: '' });
      void refetchManualVisits();
      toast.success(ru ? 'Исторический визит добавлен' : 'Historical visit added');
    },
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
          <div style={{ display: 'grid', gap: '0.3rem', marginTop: '0.55rem', maxWidth: '100%' }}>
            <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.8125rem', overflowWrap: 'anywhere' }}>{profile.phone}</span>
            {profile.email && <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.8125rem', overflowWrap: 'anywhere' }}><span style={{ ...labelStyle, fontSize: '0.5rem', marginRight: '0.4rem' }}>Email</span>{profile.email}</span>}
            {profile.instagram && <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.8125rem', overflowWrap: 'anywhere' }}><span style={{ ...labelStyle, fontSize: '0.5rem', marginRight: '0.4rem' }}>Instagram</span>@{profile.instagram.replace(/^@/, '')}</span>}
          </div>
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

      <div style={{ marginTop: '1.25rem', padding: '0.9rem 1rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--secondary))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.75rem', lineHeight: 1.45, cursor: 'pointer' }}>
            <input type="checkbox" checked={newsletterConsented} onChange={event => setNewsletterConsented(event.target.checked)} style={{ marginTop: '0.15rem' }} />
            <span>{ru ? 'Разрешены новости, отпуск и персональные CRM-письма' : 'News, vacation notices, and personal CRM emails are allowed'}</span>
          </label>
          <button type="button" className="btn-outline" onClick={() => crmPreferenceMutation.mutate({ clientId, newsletterConsented: newsletterConsented ? 'yes' : 'no' })} disabled={crmPreferenceMutation.isPending} style={{ fontSize: '0.5625rem', padding: '0.5rem 0.7rem' }}>{ru ? 'Сохранить согласие' : 'Save consent'}</button>
        </div>
      </div>

      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid hsl(var(--border))' }}>
        <p style={{ ...labelStyle, margin: '0 0 1rem', color: 'var(--gold-mid)' }}>{ru ? 'Восстановить прошлый визит' : 'Add past visit'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '0.9rem 1.2rem', padding: '1rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--secondary))' }}>
          <label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>{ru ? 'Дата' : 'Date'}</span><input type="date" value={historicalVisit.visitDate} onChange={event => setHistoricalVisit(current => ({ ...current, visitDate: event.target.value }))} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>{ru ? 'Услуга' : 'Service'}</span><select value={historicalVisit.serviceName} onChange={event => { const service = managedServices?.find(item => String(item.id) === event.target.value); setHistoricalVisit(current => ({ ...current, serviceName: service ? (ru ? service.nameRu : service.nameEn) : '', priceAmd: service ? String(service.priceAmd ?? service.priceMinAmd ?? '') : current.priceAmd })); }} style={{ ...inputStyle, appearance: 'auto' }}><option value="">{ru ? 'Выберите услугу' : 'Choose service'}</option>{managedServices?.map(service => <option key={service.id} value={service.id}>{ru ? service.nameRu : service.nameEn}</option>)}</select></label>
          <label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>{ru ? 'Цена услуги ֏' : 'Service price ֏'}</span><input type="number" min="0" value={historicalVisit.priceAmd} onChange={event => setHistoricalVisit(current => ({ ...current, priceAmd: event.target.value }))} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>{ru ? 'Оплатил ֏' : 'Paid ֏'}</span><input type="number" min="0" value={historicalVisit.paidAmd} onChange={event => setHistoricalVisit(current => ({ ...current, paidAmd: event.target.value }))} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: '0.35rem', gridColumn: '1 / -1' }}><span style={labelStyle}>{ru ? 'Что делали / заметка' : 'What was done / note'}</span><textarea rows={2} value={historicalVisit.note} onChange={event => setHistoricalVisit(current => ({ ...current, note: event.target.value }))} placeholder={ru ? 'Например: стрижка + оформление бороды' : 'For example: haircut + beard modeling'} style={{ ...inputStyle, border: '1px solid hsl(var(--border))', padding: '0.65rem', resize: 'vertical' }} /></label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}><span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}>{ru ? 'Визит считается завершённым и попадёт в общую статистику.' : 'This visit is treated as completed and included in overall statistics.'}</span><button type="button" className="btn-primary" disabled={manualVisitMutation.isPending || !historicalVisit.visitDate || !historicalVisit.serviceName || !historicalVisit.priceAmd || !historicalVisit.paidAmd} onClick={() => manualVisitMutation.mutate({ clientId, visitDate: historicalVisit.visitDate, serviceName: historicalVisit.serviceName, priceAmd: Number(historicalVisit.priceAmd), paidAmd: Number(historicalVisit.paidAmd), note: historicalVisit.note.trim() || undefined })}>{manualVisitMutation.isPending ? '...' : (ru ? 'Добавить визит' : 'Add visit')}</button></div>
        </div>
        {manualVisits && manualVisits.length > 0 && <div style={{ display: 'grid', gap: '0.6rem', marginTop: '1rem' }}>{manualVisits.map(visit => editingManualVisitId === visit.id ? <article key={visit.id} style={{ padding: '1rem', border: '1px solid var(--gold-mid)', background: 'hsl(var(--secondary))' }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', gap: '0.75rem' }}><label style={{ display: 'grid', gap: '0.3rem' }}><span style={labelStyle}>{ru ? 'Дата' : 'Date'}</span><input type="date" value={editingVisit.visitDate} onChange={event => setEditingVisit(current => ({ ...current, visitDate: event.target.value }))} style={inputStyle} /></label><label style={{ display: 'grid', gap: '0.3rem' }}><span style={labelStyle}>{ru ? 'Услуга' : 'Service'}</span><input value={editingVisit.serviceName} onChange={event => setEditingVisit(current => ({ ...current, serviceName: event.target.value }))} style={inputStyle} /></label><label style={{ display: 'grid', gap: '0.3rem' }}><span style={labelStyle}>{ru ? 'Цена ֏' : 'Price ֏'}</span><input type="number" min="0" value={editingVisit.priceAmd} onChange={event => setEditingVisit(current => ({ ...current, priceAmd: event.target.value }))} style={inputStyle} /></label><label style={{ display: 'grid', gap: '0.3rem' }}><span style={labelStyle}>{ru ? 'Оплата ֏' : 'Paid ֏'}</span><input type="number" min="0" value={editingVisit.paidAmd} onChange={event => setEditingVisit(current => ({ ...current, paidAmd: event.target.value }))} style={inputStyle} /></label><label style={{ display: 'grid', gap: '0.3rem', gridColumn: '1 / -1' }}><span style={labelStyle}>{ru ? 'Заметка' : 'Note'}</span><textarea rows={2} value={editingVisit.note} onChange={event => setEditingVisit(current => ({ ...current, note: event.target.value }))} style={{ ...inputStyle, border: '1px solid hsl(var(--border))', padding: '0.6rem' }} /></label></div><div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.8rem', flexWrap: 'wrap' }}><button type="button" className="btn-primary" disabled={updateManualVisitMutation.isPending || !editingVisit.visitDate || !editingVisit.serviceName || !editingVisit.priceAmd || !editingVisit.paidAmd} onClick={() => updateManualVisitMutation.mutate({ id: visit.id, visitDate: editingVisit.visitDate, serviceName: editingVisit.serviceName, priceAmd: Number(editingVisit.priceAmd), paidAmd: Number(editingVisit.paidAmd), note: editingVisit.note.trim() || undefined })}>{updateManualVisitMutation.isPending ? '...' : (ru ? 'Сохранить' : 'Save')}</button><button type="button" className="btn-outline" onClick={() => setEditingManualVisitId(null)}>{ru ? 'Отмена' : 'Cancel'}</button></div></article> : <article key={visit.id} style={{ padding: '0.8rem 1rem', border: '1px solid hsl(var(--border))' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}><strong style={{ fontFamily: "'Playfair Display', serif" }}>{visit.visitDate} · {visit.serviceName}</strong><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}><span style={{ color: 'hsl(142 50% 40%)', fontSize: '0.8125rem' }}>{formatAmd(visit.paidAmd)} {ru ? 'оплачено' : 'paid'}</span><button type="button" className="btn-ghost" style={{ fontSize: '0.6rem', padding: 0 }} onClick={() => { setEditingManualVisitId(visit.id); setEditingVisit({ visitDate: visit.visitDate, serviceName: visit.serviceName, priceAmd: String(visit.priceAmd), paidAmd: String(visit.paidAmd), note: visit.note ?? '' }); }}>{ru ? 'Редактировать' : 'Edit'}</button></div></div><p style={{ margin: '0.3rem 0 0', color: 'hsl(var(--muted-foreground))', fontSize: '0.8125rem' }}>{ru ? 'Цена' : 'Price'}: {formatAmd(visit.priceAmd)}{visit.note ? ` · ${visit.note}` : ''}</p></article>)}</div>}
      </div>

      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid hsl(var(--border))' }}>
        <p style={{ ...labelStyle, margin: '0 0 1rem', color: 'var(--gold-mid)' }}>{ru ? 'История визитов и фото' : 'Visit history and photos'}</p>
        {memory.visits.length === 0 ? <p style={labelStyle}>{ru ? 'Истории пока нет' : 'No history yet'}</p> : <div style={{ display: 'grid', gap: '1rem' }}>
          {memory.visits.map(visit => {
            const media = memory.media.filter(item => item.bookingId === visit.id);
            const reviewRequests = memory.reviewRequests.filter(item => item.bookingId === visit.id);
            const cancellationEvents = memory.events.filter(item => item.bookingId === visit.id && item.eventType === 'cancelled');
            const visitNotes = memory.events.filter(item => item.bookingId === visit.id && item.note && item.eventType !== 'cancelled');
            const repeatStatus = visit.repeatFollowUpSentAt
              ? (ru ? `Письмо на повторную запись отправлено: ${new Date(visit.repeatFollowUpSentAt).toLocaleDateString()}` : `Repeat-booking email sent: ${new Date(visit.repeatFollowUpSentAt).toLocaleDateString()}`)
              : visit.completedAt
                ? (ru ? 'Повторная запись: письмо будет автоматически проверено через 14 недель после визита' : 'Repeat booking: automatic email will be checked 14 weeks after the visit')
                : (ru ? 'Повторная запись: будет доступна после завершения визита' : 'Repeat booking: available after the visit is completed');
            return <article key={visit.id} style={{ padding: '1rem', border: '1px solid hsl(var(--border))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div><p style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{visit.bookingDate} · {visit.bookingTime}</p><p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))' }}>{visit.serviceSummary || visit.serviceName} · {visit.totalDurationMinutes} {ru ? 'мин' : 'min'} · {visit.finalPriceAmd ? formatAmd(visit.finalPriceAmd) : visit.totalPriceSummary}</p></div>
                <span style={{ ...labelStyle, color: visit.completedAt ? 'hsl(142 50% 40%)' : visit.status === 'cancelled' ? 'hsl(0 0% 48%)' : 'hsl(var(--muted-foreground))' }}>{visit.completedAt ? (ru ? 'Завершён' : 'Completed') : visit.status === 'cancelled' ? (ru ? 'Отменён клиентом' : 'Cancelled by client') : (ru ? 'В процессе' : 'In progress')}</span>
              </div>
              {cancellationEvents.length > 0 && <div style={{ marginTop: '0.85rem', padding: '0.7rem 0.75rem', borderLeft: '2px solid hsl(0 0% 48%)', background: 'hsl(var(--secondary))' }}><p style={{ ...labelStyle, margin: 0, color: 'hsl(0 0% 48%)' }}>{ru ? 'Отмена клиентом' : 'Client cancellation'}</p>{cancellationEvents.map(event => <p key={event.id} style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', lineHeight: 1.45, color: 'hsl(var(--foreground))' }}>{event.note || (ru ? 'Причина не указана' : 'No reason provided')}</p>)}</div>}
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
