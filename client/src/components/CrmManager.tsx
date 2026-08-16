import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type Language = 'ru' | 'en';
type AudienceFilter = 'newsletter_consented' | 'upcoming_booking' | 'recent_6m' | 'specific_service';

type CampaignForm = {
  title: string;
  subjectRu: string;
  subjectEn: string;
  bodyRu: string;
  bodyEn: string;
  audienceFilter: AudienceFilter;
  targetServiceId: string;
};

const emptyForm = (): CampaignForm => ({
  title: '',
  subjectRu: '',
  subjectEn: '',
  bodyRu: '',
  bodyEn: '',
  audienceFilter: 'upcoming_booking',
  targetServiceId: '',
});

export default function CrmManager({ language }: { language: Language }) {
  const ru = language === 'ru';
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
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

  const update = (key: keyof CampaignForm, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = () => saveMutation.mutate({
    ...(editingId ? { id: editingId } : {}),
    ...form,
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
      audienceFilter: campaign.audienceFilter as AudienceFilter,
      targetServiceId: campaign.targetServiceId ? String(campaign.targetServiceId) : '',
    });
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
          <p style={{ margin: '0.55rem 0 0', maxWidth: '38rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.8rem', lineHeight: 1.55 }}>{ru ? 'Сначала создай черновик, проверь аудиторию и текст, затем отправь письмо вручную.' : 'Create a draft, check the audience and copy, then send the email manually.'}</p>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>{ru ? 'Аудитория' : 'Audience'}</span><select value={form.audienceFilter} onChange={event => update('audienceFilter', event.target.value)} style={{ ...inputStyle, background: 'hsl(var(--card))' }}>{(['upcoming_booking', 'newsletter_consented', 'recent_6m', 'specific_service'] as AudienceFilter[]).map(value => <option key={value} value={value}>{audienceLabel(value)}</option>)}</select></label>
          {form.audienceFilter === 'specific_service' && <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>{ru ? 'Услуга' : 'Service'}</span><select value={form.targetServiceId} onChange={event => update('targetServiceId', event.target.value)} style={{ ...inputStyle, background: 'hsl(var(--card))' }}><option value="">—</option>{(services ?? []).map(service => <option key={service.id} value={service.id}>{service.nameRu} / {service.nameEn}</option>)}</select></label>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.2rem' }}>
        <button type="button" className="btn-primary" onClick={submit} disabled={saveMutation.isPending}>{saveMutation.isPending ? (ru ? 'Сохраняю…' : 'Saving…') : (editingId ? (ru ? 'Сохранить изменения' : 'Save changes') : (ru ? 'Сохранить черновик' : 'Save draft'))}</button>
        {editingId && <button type="button" className="btn-outline" onClick={() => { setEditingId(null); setForm(emptyForm()); }}>{ru ? 'Новый черновик' : 'New draft'}</button>}
      </div>
    </section>

    <section>
      <div style={{ marginBottom: '0.9rem' }}><p style={{ ...labelStyle, margin: '0 0 0.35rem', color: 'var(--gold-mid)' }}>{ru ? 'История' : 'History'}</p><h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>{ru ? 'Кампании и доставки' : 'Campaigns and deliveries'}</h3></div>
      {campaignsLoading ? <p style={labelStyle}>{ru ? 'Загрузка…' : 'Loading…'}</p> : (campaigns ?? []).length === 0 ? <p style={labelStyle}>{ru ? 'Кампаний пока нет.' : 'No campaigns yet.'}</p> : <div style={{ display: 'grid', gap: '0.75rem' }}>{campaigns?.map(campaign => <article key={campaign.id} style={{ padding: '1rem', border: selectedCampaignId === campaign.id ? '1px solid var(--gold-mid)' : '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', flexWrap: 'wrap' }}><div><p style={{ margin: 0, fontWeight: 700 }}>{campaign.title}</p><p style={{ margin: '0.25rem 0 0', color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}>{campaign.subjectEn} · {audienceLabel(campaign.audienceFilter as AudienceFilter)}</p></div><span style={{ ...labelStyle, color: campaign.status === 'completed' ? 'hsl(142 50% 40%)' : campaign.status === 'failed' ? 'hsl(0 60% 50%)' : 'hsl(var(--muted-foreground))' }}>{campaign.status}</span></div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}><button type="button" className="btn-ghost" style={{ fontSize: '0.625rem', padding: 0 }} onClick={() => editCampaign(campaign)}>{ru ? 'Открыть' : 'Open'}</button><button type="button" className="btn-primary" style={{ fontSize: '0.625rem', padding: '0.45rem 0.65rem' }} disabled={sendMutation.isPending || campaign.status === 'sending'} onClick={() => { if (window.confirm(ru ? 'Отправить это письмо выбранной аудитории?' : 'Send this email to the selected audience?')) { setSelectedCampaignId(campaign.id); sendMutation.mutate({ id: campaign.id }); } }}>{sendMutation.isPending ? (ru ? 'Отправляю…' : 'Sending…') : (ru ? 'Отправить' : 'Send')}</button><button type="button" className="btn-outline" style={{ fontSize: '0.625rem', padding: '0.45rem 0.65rem' }} onClick={() => setSelectedCampaignId(campaign.id)}>{ru ? 'История доставок' : 'Delivery history'}</button></div>
        {selectedCampaignId === campaign.id && <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border))' }}><p style={{ ...labelStyle, margin: '0 0 0.6rem' }}>{ru ? `Отправлено ${campaignStats?.sent ?? campaign.sentCount}, ошибок ${campaignStats?.failed ?? campaign.errorCount}` : `Sent ${campaignStats?.sent ?? campaign.sentCount}, errors ${campaignStats?.failed ?? campaign.errorCount}`}</p>{(deliveries ?? []).length === 0 ? <p style={{ margin: 0, color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}>{ru ? 'История пока пуста.' : 'No delivery history yet.'}</p> : <div style={{ display: 'grid', gap: '0.4rem' }}>{deliveries?.slice(0, 20).map(delivery => <div key={delivery.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.75rem' }}><span>{delivery.recipientEmail}</span><span style={{ color: delivery.deliveryStatus === 'failed' ? 'hsl(0 60% 50%)' : delivery.deliveryStatus === 'sent' ? 'hsl(142 50% 40%)' : 'hsl(var(--muted-foreground))' }}>{delivery.deliveryStatus}{delivery.errorMessage ? ` · ${delivery.errorMessage}` : ''}</span></div>)}</div>}</div>}
      </article>)}</div>}
    </section>
  </div>;
}
