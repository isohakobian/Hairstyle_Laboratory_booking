import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

type Language = 'ru' | 'en';
type Draft = { subjectRu: string; subjectEn: string; bodyRu: string; bodyEn: string };

const emptyDraft: Draft = { subjectRu: '', subjectEn: '', bodyRu: '', bodyEn: '' };

export default function ReviewRequestTemplateEditor({ language }: { language: Language }) {
  const ru = language === 'ru';
  const { data: template, isLoading, refetch } = trpc.admin.reviewRequestTemplate.useQuery();
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  useEffect(() => {
    if (!template) return;
    setDraft(current => (
      current.subjectRu === template.subjectRu
      && current.subjectEn === template.subjectEn
      && current.bodyRu === template.bodyRu
      && current.bodyEn === template.bodyEn
        ? current
        : template
    ));
  }, [template?.bodyEn, template?.bodyRu, template?.subjectEn, template?.subjectRu]);

  const saveMutation = trpc.admin.saveReviewRequestTemplate.useMutation({
    onSuccess: () => {
      toast.success(ru ? 'Шаблон письма сохранён' : 'Email template saved');
      refetch();
    },
    onError: error => toast.error(error.message),
  });

  const update = (key: keyof Draft, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const inputStyle: React.CSSProperties = { width: '100%', color: 'hsl(var(--foreground))', background: 'transparent', border: '1px solid hsl(var(--border))', padding: '0.75rem', fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', outline: 'none' };
  const labelStyle: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' };

  if (isLoading) return <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Loader2 size={16} className="animate-spin" /><span style={labelStyle}>{ru ? 'Загружаю шаблон...' : 'Loading template...'}</span></div>;

  return (
    <section style={{ paddingTop: '1.5rem', marginTop: '2.5rem', borderTop: '1px solid hsl(var(--border))' }}>
      <p style={{ ...labelStyle, margin: '0 0 0.4rem', color: 'var(--gold-mid)' }}>{ru ? 'Коммуникация' : 'Communication'}</p>
      <h4 style={{ margin: '0 0 0.6rem', fontStyle: 'italic' }}>{ru ? 'Шаблон письма с запросом на отзыв' : 'Review-request email template'}</h4>
      <p style={{ maxWidth: '45rem', margin: '0 0 1.25rem', fontSize: '0.8125rem', lineHeight: 1.55 }}>
        {ru ? 'Переменные: {{clientName}}, {{serviceName}}, {{bookingDate}}, {{bookingTime}}, {{reviewUrl}}.' : 'Variables: {{clientName}}, {{serviceName}}, {{bookingDate}}, {{bookingTime}}, {{reviewUrl}}.'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(17rem, 1fr))', gap: '1rem' }}>
        <label style={{ display: 'grid', gap: '0.45rem' }}><span style={labelStyle}>RU · {ru ? 'Тема' : 'Subject'}</span><input value={draft.subjectRu} onChange={event => update('subjectRu', event.target.value)} style={inputStyle} /></label>
        <label style={{ display: 'grid', gap: '0.45rem' }}><span style={labelStyle}>EN · Subject</span><input value={draft.subjectEn} onChange={event => update('subjectEn', event.target.value)} style={inputStyle} /></label>
        <label style={{ display: 'grid', gap: '0.45rem' }}><span style={labelStyle}>RU · {ru ? 'Текст' : 'Body'}</span><textarea rows={8} value={draft.bodyRu} onChange={event => update('bodyRu', event.target.value)} style={{ ...inputStyle, resize: 'vertical' }} /></label>
        <label style={{ display: 'grid', gap: '0.45rem' }}><span style={labelStyle}>EN · Body</span><textarea rows={8} value={draft.bodyEn} onChange={event => update('bodyEn', event.target.value)} style={{ ...inputStyle, resize: 'vertical' }} /></label>
      </div>
      <button type="button" className="btn-primary" onClick={() => saveMutation.mutate(draft)} disabled={saveMutation.isPending || !draft.subjectRu.trim() || !draft.subjectEn.trim() || !draft.bodyRu.trim() || !draft.bodyEn.trim()} style={{ marginTop: '1rem', fontSize: '0.625rem' }}>
        {saveMutation.isPending ? <><Loader2 size={13} className="animate-spin" style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '0.35rem' }} />{ru ? 'Сохранение...' : 'Saving...'}</> : (ru ? 'Сохранить шаблон' : 'Save template')}
      </button>
    </section>
  );
}
