import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

type Language = 'ru' | 'en';
type Draft = { recipientName: string; cardDetails: string; policyRu: string; policyEn: string; isEnabled: 'yes' | 'no' };

const emptyDraft: Draft = { recipientName: '', cardDetails: '', policyRu: '', policyEn: '', isEnabled: 'no' };

export default function ManualDepositSettingsEditor({ language }: { language: Language }) {
  const ru = language === 'ru';
  const { data: settings, isLoading, refetch } = trpc.admin.manualDepositSettings.useQuery();
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  useEffect(() => {
    if (!settings) return;
    setDraft({
      recipientName: settings.recipientName,
      cardDetails: settings.cardDetails,
      policyRu: settings.policyRu,
      policyEn: settings.policyEn,
      isEnabled: settings.isEnabled,
    });
  }, [settings]);

  const saveMutation = trpc.admin.saveManualDepositSettings.useMutation({
    onSuccess: () => {
      toast.success(ru ? 'Инструкции предоплаты сохранены' : 'Deposit instructions saved');
      refetch();
    },
    onError: error => toast.error(error.message),
  });
  const update = (key: keyof Draft, value: string) => setDraft(current => ({ ...current, [key]: value as Draft[typeof key] }));
  const inputStyle: React.CSSProperties = { width: '100%', color: 'hsl(var(--foreground))', background: 'transparent', border: '1px solid hsl(var(--border))', padding: '0.75rem', fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', outline: 'none' };
  const labelStyle: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' };
  const canEnable = Boolean(draft.recipientName.trim() && draft.cardDetails.trim() && draft.policyRu.trim() && draft.policyEn.trim());

  if (isLoading) return <p style={labelStyle}>{ru ? 'Загружаю инструкции предоплаты...' : 'Loading deposit instructions...'}</p>;

  return (
    <section style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid hsl(var(--border))' }}>
      <p style={{ ...labelStyle, margin: '0 0 0.4rem', color: 'var(--gold-mid)' }}>{ru ? 'Предоплата' : 'Deposit'}</p>
      <h4 style={{ margin: '0 0 0.6rem', fontStyle: 'italic' }}>{ru ? 'Реквизиты и чек оплаты' : 'Payment details and receipt'}</h4>
      <p style={{ maxWidth: '46rem', margin: '0 0 1.25rem', fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.55 }}>
        {ru ? 'Эти реквизиты показываются только для услуг с указанной предоплатой. Клиент прикладывает фото чека к заявке; данные карты на сайте не вводятся.' : 'These details are shown only for services with a configured deposit. The client attaches a receipt image to the booking; no card data is entered on the website.'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))', gap: '1rem' }}>
        <label style={{ display: 'grid', gap: '0.45rem' }}><span style={labelStyle}>{ru ? 'Имя получателя' : 'Recipient name'}</span><input value={draft.recipientName} onChange={event => update('recipientName', event.target.value)} placeholder={ru ? 'Имя и фамилия владельца карты' : 'Cardholder full name'} style={inputStyle} /></label>
        <label style={{ display: 'grid', gap: '0.45rem' }}><span style={labelStyle}>{ru ? 'Карта / реквизиты' : 'Card / payment details'}</span><input value={draft.cardDetails} onChange={event => update('cardDetails', event.target.value)} placeholder="0000 0000 0000 0000" style={inputStyle} /></label>
        <label style={{ display: 'grid', gap: '0.45rem' }}><span style={labelStyle}>RU · {ru ? 'Политика' : 'Policy'}</span><textarea rows={5} value={draft.policyRu} onChange={event => update('policyRu', event.target.value)} style={{ ...inputStyle, resize: 'vertical' }} /></label>
        <label style={{ display: 'grid', gap: '0.45rem' }}><span style={labelStyle}>EN · Policy</span><textarea rows={5} value={draft.policyEn} onChange={event => update('policyEn', event.target.value)} style={{ ...inputStyle, resize: 'vertical' }} /></label>
      </div>
      <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '1rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
        <input type="checkbox" checked={draft.isEnabled === 'yes'} onChange={event => update('isEnabled', event.target.checked ? 'yes' : 'no')} disabled={!canEnable && draft.isEnabled === 'no'} />
        <span>{ru ? 'Показывать реквизиты и требовать чек для услуг с предоплатой' : 'Show payment details and require a receipt for services with a deposit'}</span>
      </label>
      {!canEnable && <p style={{ ...labelStyle, margin: '0.6rem 0 0', fontSize: '0.5625rem', color: 'hsl(35 60% 50%)' }}>{ru ? 'Чтобы включить этот сценарий, заполните имя получателя, реквизиты и обе версии политики.' : 'To enable this flow, complete the recipient, payment details, and both policy versions.'}</p>}
      <button type="button" className="btn-primary" onClick={() => saveMutation.mutate(draft)} disabled={saveMutation.isPending || (draft.isEnabled === 'yes' && !canEnable)} style={{ marginTop: '1rem', fontSize: '0.625rem' }}>
        {saveMutation.isPending ? <><Loader2 size={13} className="animate-spin" style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '0.35rem' }} />{ru ? 'Сохранение...' : 'Saving...'}</> : (ru ? 'Сохранить инструкции' : 'Save instructions')}
      </button>
    </section>
  );
}
