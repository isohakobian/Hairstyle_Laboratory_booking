import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2, Eye, X } from 'lucide-react';
import CrmTemplateEditor from './CrmTemplateEditor';

type Language = 'ru' | 'en';
type AudienceFilter = 'newsletter_consented' | 'upcoming_booking' | 'recent_6m' | 'specific_service';

type CampaignForm = {
  title: string;
  subjectRu: string;
  subjectEn: string;
  bodyRu: string;
  bodyEn: string;
  imageUrl: string;
  audienceFilter: AudienceFilter;
  targetServiceId: string;
};

const emptyForm = (): CampaignForm => ({
  title: '',
  subjectRu: '',
  subjectEn: '',
  bodyRu: '',
  bodyEn: '',
  imageUrl: '',
  audienceFilter: 'upcoming_booking',
  targetServiceId: '',
});

const PREVIEW_CLIENT_NAME = 'Alex';
const PREVIEW_BOOKING_URL = 'https://isaacbarber-axczkyb2.manus.space/booking';
function renderCampaignPreview(value: string) {
  return value.replaceAll('{{clientName}}', PREVIEW_CLIENT_NAME).replaceAll('{{bookingUrl}}', PREVIEW_BOOKING_URL);
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const payload = String(reader.result || '').split(',')[1];
      if (payload) resolve(payload);
      else reject(new Error('Image could not be read'));
    };
    reader.onerror = () => reject(new Error('Image could not be read'));
    reader.readAsDataURL(file);
  });
}

export default function CrmManager({ language }: { language: Language }) {
  const ru = language === 'ru';
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const { data: campaigns, isLoading: campaignsLoading, refetch: refetchCampaigns } = trpc.admin.crmCampaigns.useQuery();
  const { data: services } = trpc.admin.services.useQuery();

  const previewInput = useMemo(() => ({
    audienceFilter: form.audienceFilter,
    targetServiceId: form.audienceFilter === 'specific_service' && form.targetServiceId ? Number(form.targetServiceId) : null,
  }), [form.audienceFilter, form.targetServiceId]);

  const { data: previewRecipients, isLoading: previewLoading } = trpc.admin.crmAudiencePreview.useQuery(previewInput);
  const { data: deliveries } = trpc.admin.crmCampaignDeliveries.useQuery(
    { campaignId: selectedCampaignId ?? 0 },
    { enabled: Boolean(selectedCampaignId) },
  );
  const { data: campaignStats } = trpc.admin.crmCampaignStats.useQuery(
    { campaignId: selectedCampaignId ?? 0 },
    { enabled: Boolean(selectedCampaignId) },
  );

  const saveMutation = trpc.admin.saveCrmCampaign.useMutation({
    onSuccess: () => {
      toast.success(ru ? 'Кампания сохранена' : 'Campaign saved');
      setForm(emptyForm());
      setEditingId(null);
      void refetchCampaigns();
    },
    onError: error => toast.error(error.message),
  });

  const sendMutation = trpc.admin.sendCrmCampaign.useMutation({
    onSuccess: result => {
      toast.success(ru ? `Отправлено: ${result.sentCount}. Ошибки: ${result.errorCount}.` : `Sent: ${result.sentCount}. Errors: ${result.errorCount}.`);
      void refetchCampaigns();
    },
    onError: error => toast.error(error.message),
  });

  const testSendMutation = trpc.admin.sendTestCrmCampaign.useMutation({
    onSuccess: result => toast.success(ru ? `Тестовое письмо отправлено на ${result.recipientEmail}` : `Test email sent to ${result.recipientEmail}`),
    onError: error => toast.error(error.message),
  });

  const uploadMutation = trpc.admin.uploadCrmCampaignImage.useMutation({
    onSuccess: asset => {
      setForm(current => ({ ...current, imageUrl: asset.url }));
      toast.success(ru ? 'Баннер добавлен. Сохраните кампанию.' : 'Banner added. Save the campaign.');
    },
    onError: error => toast.error(error.message),
  });

  const update = (key: keyof CampaignForm, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = () => saveMutation.mutate({
    ...(editingId ? { id: editingId } : {}),
    ...form,
    imageUrl: form.imageUrl || null,
    targetServiceId: form.audienceFilter === 'specific_service' && form.targetServiceId ? Number(form.targetServiceId) : null,
  });

  const editCampaign = (campaign: NonNullable<typeof campaigns>[number]) => {
    setEditingId(campaign.id);
    setSelectedCampaignId(campaign.id);
    setForm({
      title: campaign.title,
      subjectRu: campaign.subjectRu,
      subjectEn: campaign.subjectEn,
      bodyRu: campaign.bodyRu,
      bodyEn: campaign.bodyEn,
      imageUrl: campaign.imageUrl ?? '',
      audienceFilter: campaign.audienceFilter as AudienceFilter,
      targetServiceId: campaign.targetServiceId ? String(campaign.targetServiceId) : '',
    });
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(ru ? 'Поддерживаются JPEG, PNG и WebP' : 'JPEG, PNG, and WebP are supported');
      event.target.value = '';
      return;
    }
    if (file.size > 1_200_000) {
      toast.error(ru ? 'Баннер должен быть не больше 1,2 МБ' : 'Banner must be 1.2 MB or smaller');
      event.target.value = '';
      return;
    }
    try {
      uploadMutation.mutate({ fileName: file.name, mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp', base64Data: await readFileAsBase64(file) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (ru ? 'Не удалось прочитать изображение' : 'Image could not be read'));
    } finally {
      event.target.value = '';
    }
  };

  const sendTest = () => {
    if (!form.subjectRu.trim() || !form.subjectEn.trim() || !form.bodyRu.trim() || !form.bodyEn.trim()) {
      toast.error(ru ? 'Заполни обе темы и оба текста перед тестовой отправкой.' : 'Complete both subjects and both message bodies before sending a test.');
      return;
    }
    if (!window.confirm(ru ? 'Отправить тестовое письмо только на твой admin email?' : 'Send this test email only to your admin email?')) return;
    testSendMutation.mutate({ subjectRu: form.subjectRu, subjectEn: form.subjectEn, bodyRu: form.bodyRu, bodyEn: form.bodyEn, imageUrl: form.imageUrl || null });
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.7rem 0', background: 'transparent', border: 'none', borderBottom: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', outline: 'none', fontFamily: "'Inter', sans-serif", fontSize: '0.875rem' };
  const labelStyle: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' };
  const audienceLabel = (value: AudienceFilter) => ({
    newsletter_consented: ru ? 'Только согласившиеся на новости' : 'Newsletter consented',
    upcoming_booking: ru ? 'Клиенты с ближайшей записью' : 'Clients with an upcoming booking',
    recent_6m: ru ? 'Были у меня за последние 6 месяцев' : 'Visited in the last 6 months',
    specific_service: ru ? 'Пользователи конкретной услуги' : 'Clients of a specific service',
  }[value]);

  return <div style={{ display: 'grid', gap: '2rem' }}>
    <section style={{ padding: '1.25rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
        <div>
          <p style={{ ...labelStyle, margin: '0 0 0.35rem', color: 'var(--gold-mid)' }}>{ru ? 'Email CRM' : 'Email CRM'}</p>
          <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>{ru ? 'Новое сообщение клиентам' : 'New client message'}</h3>
          <p style={{ margin: '0.55rem 0 0', maxWidth: '38rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.8rem', lineHeight: 1.55 }}>{ru ? 'Создай черновик, проверь текст в превью и отправь рассылку выбранной аудитории.' : 'Draft a campaign, inspect the live preview, and broadcast to the selected audience.'}</p>
        </div>
        {previewLoading ? <span style={{ ...labelStyle, display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}><Loader2 size={12} className="animate-spin" />{ru ? 'Считаю аудиторию…' : 'Counting audience…'}</span> : <span style={{ ...labelStyle, color: 'var(--gold-mid)' }}>{ru ? `${previewRecipients?.length ?? 0} получателей` : `${previewRecipients?.length ?? 0} recipients`}</span>}
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>{ru ? 'Название кампании' : 'Campaign name'}</span><input value={form.title} onChange={event => update('title', event.target.value)} placeholder={ru ? 'Например: Отпуск в ноябре' : 'For example: November vacation'} style={inputStyle} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>RU · {ru ? 'Тема' : 'Subject'}</span><input value={form.subjectRu} onChange={event => update('subjectRu', event.target.value)} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>EN · Subject</span><input value={form.subjectEn} onChange={event => update('subjectEn', event.target.value)} style={inputStyle} /></label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>RU · {ru ? 'Текст' : 'Body'}</span><textarea value={form.bodyRu} onChange={event => update('bodyRu', event.target.value)} rows={6} style={{ ...inputStyle, border: '1px solid hsl(var(--border))', padding: '0.75rem', resize: 'vertical' }} /></label>
          <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>EN · Body</span><textarea value={form.bodyEn} onChange={event => update('bodyEn', event.target.value)} rows={6} style={{ ...inputStyle, border: '1px solid hsl(var(--border))', padding: '0.75rem', resize: 'vertical' }} /></label>
        </div>
        <p style={{ margin: '-0.25rem 0 0', color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem', lineHeight: 1.5 }}>{ru ? 'Персонализация: вставь {{clientName}} для имени клиента. Также доступна ссылка {{bookingUrl}}.' : 'Personalization: use {{clientName}} for the client name. You can also use {{bookingUrl}} for the booking link.'}</p>
        <div style={{ padding: '0.9rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--secondary))' }}>
          <p style={{ ...labelStyle, margin: '0 0 0.55rem' }}>{ru ? 'Баннер или изображение (необязательно)' : 'Banner or image (optional)'}</p>
          <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {form.imageUrl ? <img src={form.imageUrl} alt={ru ? 'Предпросмотр CRM-баннера' : 'CRM banner preview'} style={{ width: '7rem', height: '4.5rem', objectFit: 'cover', border: '1px solid hsl(var(--border))' }} /> : <div aria-hidden="true" style={{ width: '7rem', height: '4.5rem', display: 'grid', placeItems: 'center', border: '1px dashed hsl(var(--border))', color: 'hsl(var(--muted-foreground))', fontSize: '0.7rem' }}>{ru ? 'Баннер' : 'Banner'}</div>}
            <label style={{ display: 'grid', gap: '0.35rem', minWidth: 'min(100%, 17rem)' }}>
              <span style={{ ...labelStyle, fontSize: '0.5625rem' }}>{ru ? 'JPEG, PNG или WebP · до 1,2 МБ' : 'JPEG, PNG, or WebP · up to 1.2 MB'}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadMutation.isPending} onChange={uploadImage} style={{ fontSize: '0.75rem', maxWidth: '100%' }} />
              <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.7rem', lineHeight: 1.45 }}>{ru ? 'Рекомендуемый размер: 1200 × 600 px. Универсальный вариант для desktop и mobile: 1200 × 800 px. Сохраняй файл до 1,2 МБ.' : 'Recommended: 1200 × 600 px. Universal desktop/mobile option: 1200 × 800 px. Keep the file under 1.2 MB.'}</span>
            </label>
            {form.imageUrl && <button type="button" className="btn-ghost" onClick={() => update('imageUrl', '')} style={{ fontSize: '0.625rem', padding: 0 }}>{ru ? 'Убрать баннер' : 'Remove banner'}</button>}
          </div>
          {uploadMutation.isPending && <p aria-live="polite" style={{ ...labelStyle, margin: '0.6rem 0 0', fontSize: '0.5625rem' }}>{ru ? 'Загружаю баннер…' : 'Uploading banner…'}</p>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>{ru ? 'Аудитория' : 'Audience'}</span><select value={form.audienceFilter} onChange={event => update('audienceFilter', event.target.value)} style={{ ...inputStyle, background: 'hsl(var(--card))' }}>{(['upcoming_booking', 'newsletter_consented', 'recent_6m', 'specific_service'] as AudienceFilter[]).map(value => <option key={value} value={value}>{audienceLabel(value)}</option>)}</select></label>
          {form.audienceFilter === 'specific_service' && <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>{ru ? 'Услуга' : 'Service'}</span><select value={form.targetServiceId} onChange={event => update('targetServiceId', event.target.value)} style={{ ...inputStyle, background: 'hsl(var(--card))' }}><option value="">—</option>{(services ?? []).map(service => <option key={service.id} value={service.id}>{service.nameRu} / {service.nameEn}</option>)}</select></label>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.2rem', alignItems: 'center' }}>
        <button type="button" className="btn-primary" onClick={submit} disabled={saveMutation.isPending}>{saveMutation.isPending ? (ru ? 'Сохраняю…' : 'Saving…') : (editingId ? (ru ? 'Сохранить изменения' : 'Save changes') : (ru ? 'Сохранить черновик' : 'Save draft'))}</button>
        <button type="button" className="btn-outline" onClick={() => setShowPreviewModal(true)} style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.625rem' }}><Eye size={13} />{ru ? 'Предпросмотр письма' : 'Preview email'}</button>
        <button type="button" className="btn-outline" onClick={sendTest} disabled={testSendMutation.isPending || uploadMutation.isPending} style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.625rem', borderColor: 'var(--gold-mid)', color: 'var(--gold-mid)' }}>{testSendMutation.isPending && <Loader2 size={13} className="animate-spin" />}{testSendMutation.isPending ? (ru ? 'Отправляю тест…' : 'Sending test…') : (ru ? 'Отправить тест мне' : 'Send test to me')}</button>
      </div>
    </section>

    {/* Template Editors for Automated Birthday & Post-Visit Emails */}
    <div style={{ padding: '1.25rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
      <CrmTemplateEditor language={language} templateType="postVisit" />
      <CrmTemplateEditor language={language} templateType="birthday" />
    </div>

    <section>
      <div style={{ marginBottom: '0.9rem' }}><p style={{ ...labelStyle, margin: '0 0 0.35rem', color: 'var(--gold-mid)' }}>{ru ? 'История' : 'History'}</p><h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>{ru ? 'Кампании и доставки' : 'Campaigns and deliveries'}</h3></div>
      {campaignsLoading ? <p style={labelStyle}>{ru ? 'Загрузка…' : 'Loading…'}</p> : (campaigns ?? []).length === 0 ? <p style={labelStyle}>{ru ? 'Кампаний пока нет.' : 'No campaigns yet.'}</p> : <div style={{ display: 'grid', gap: '0.75rem' }}>{campaigns?.map(campaign => <article key={campaign.id} style={{ padding: '1rem', border: selectedCampaignId === campaign.id ? '1px solid var(--gold-mid)' : '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', flexWrap: 'wrap' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>{campaign.imageUrl && <img src={campaign.imageUrl} alt="" style={{ width: '3.25rem', height: '2.25rem', objectFit: 'cover', border: '1px solid hsl(var(--border))' }} />}<div><p style={{ margin: 0, fontWeight: 700 }}>{campaign.title}</p><p style={{ margin: '0.25rem 0 0', color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}>{campaign.subjectEn} · {audienceLabel(campaign.audienceFilter as AudienceFilter)}</p></div></div><span style={{ ...labelStyle, color: campaign.status === 'completed' ? 'hsl(142 50% 40%)' : campaign.status === 'failed' ? 'hsl(0 60% 50%)' : 'hsl(var(--muted-foreground))' }}>{campaign.status}</span></div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}><button type="button" className="btn-ghost" style={{ fontSize: '0.625rem', padding: 0 }} onClick={() => editCampaign(campaign)}>{ru ? 'Открыть' : 'Open'}</button><button type="button" className="btn-primary" style={{ fontSize: '0.625rem', padding: '0.45rem 0.65rem' }} disabled={sendMutation.isPending || campaign.status === 'sending'} onClick={() => { if (window.confirm(ru ? 'Отправить это письмо выбранной аудитории?' : 'Send this email to the selected audience?')) { setSelectedCampaignId(campaign.id); sendMutation.mutate({ id: campaign.id }); } }}>{sendMutation.isPending ? (ru ? 'Отправляю…' : 'Sending…') : (ru ? 'Отправить' : 'Send')}</button><button type="button" className="btn-outline" style={{ fontSize: '0.625rem', padding: '0.45rem 0.65rem' }} onClick={() => setSelectedCampaignId(campaign.id)}>{ru ? 'История доставок' : 'Delivery history'}</button></div>
        {selectedCampaignId === campaign.id && <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border))' }}><p style={{ ...labelStyle, margin: '0 0 0.6rem' }}>{ru ? `Отправлено ${campaignStats?.sent ?? campaign.sentCount}, ошибок ${campaignStats?.failed ?? campaign.errorCount}` : `Sent ${campaignStats?.sent ?? campaign.sentCount}, errors ${campaignStats?.failed ?? campaign.errorCount}`}</p>{(deliveries ?? []).length === 0 ? <p style={{ margin: 0, color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}>{ru ? 'История пока пуста.' : 'No delivery history yet.'}</p> : <div style={{ display: 'grid', gap: '0.4rem' }}>{deliveries?.slice(0, 20).map(delivery => <div key={delivery.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.75rem' }}><span>{delivery.recipientEmail}</span><span style={{ color: delivery.deliveryStatus === 'failed' ? 'hsl(0 60% 50%)' : delivery.deliveryStatus === 'sent' ? 'hsl(142 50% 40%)' : 'hsl(var(--muted-foreground))' }}>{delivery.deliveryStatus}{delivery.errorMessage ? ` · ${delivery.errorMessage}` : ''}</span></div>)}</div>}</div>}
      </article>)}</div>}
    </section>

    {/* Live Preview Modal */}
    {showPreviewModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
        <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', maxWidth: '36rem', width: '100%', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
          <button type="button" className="btn-ghost" onClick={() => setShowPreviewModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', padding: 0 }}><X size={18} /></button>
          <p style={{ ...labelStyle, margin: '0 0 0.4rem', color: 'var(--gold-mid)' }}>{ru ? 'Предпросмотр рассылки' : 'Broadcast preview'}</p>
          <h3 style={{ margin: '0 0 1rem', fontFamily: "'Playfair Display', serif" }}>{form.title || (ru ? 'Без названия' : 'Untitled')}</h3>
          {form.imageUrl && <img src={form.imageUrl} alt={ru ? 'Баннер кампании' : 'Campaign banner'} style={{ display: 'block', width: '100%', maxHeight: '15rem', objectFit: 'cover', margin: '0 0 1rem', border: '1px solid hsl(var(--border))' }} />}
          
          <div style={{ display: 'grid', gap: '1rem', background: 'hsl(var(--secondary))', padding: '1.25rem', border: '1px solid hsl(var(--border))', fontSize: '0.85rem' }}>
            <div>
              <p style={{ ...labelStyle, margin: '0 0 0.2rem' }}>RU · {ru ? 'Тема' : 'Subject'}</p>
              <p style={{ margin: 0, fontWeight: 700 }}>{form.subjectRu ? renderCampaignPreview(form.subjectRu) : '—'}</p>
            </div>
            <div>
              <p style={{ ...labelStyle, margin: '0 0 0.2rem' }}>RU · {ru ? 'Текст' : 'Body'}</p>
              <div style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{form.bodyRu ? renderCampaignPreview(form.bodyRu) : '—'}</div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid hsl(var(--border))', margin: '0.5rem 0' }} />
            <div>
              <p style={{ ...labelStyle, margin: '0 0 0.2rem' }}>EN · Subject</p>
              <p style={{ margin: 0, fontWeight: 700 }}>{form.subjectEn ? renderCampaignPreview(form.subjectEn) : '—'}</p>
            </div>
            <div>
              <p style={{ ...labelStyle, margin: '0 0 0.2rem' }}>EN · Body</p>
              <div style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{form.bodyEn ? renderCampaignPreview(form.bodyEn) : '—'}</div>
            </div>
            <div>
              <p style={{ ...labelStyle, margin: '0 0 0.2rem' }}>{ru ? 'Аудитория' : 'Audience'}</p>
              <p style={{ margin: 0 }}>{audienceLabel(form.audienceFilter)} ({previewRecipients?.length ?? 0} {ru ? 'получателей' : 'recipients'})</p>
            </div>
          </div>

          <p style={{ margin: '1rem 0 0', color: 'hsl(var(--muted-foreground))', fontSize: '0.72rem' }}>{ru ? `Пример показан для клиента «${PREVIEW_CLIENT_NAME}». При отправке имя подставится отдельно для каждого получателя.` : `Preview uses “${PREVIEW_CLIENT_NAME}”. During sending, each recipient receives their own name.`}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn-outline" onClick={() => setShowPreviewModal(false)} style={{ fontSize: '0.625rem' }}>{ru ? 'Закрыть' : 'Close'}</button>
          </div>
        </div>
      </div>
    )}
  </div>;
}
