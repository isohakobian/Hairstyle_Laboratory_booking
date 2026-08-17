import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import RichTextEditor from './RichTextEditor';

type Language = 'ru' | 'en';
type Draft = { subjectRu: string; subjectEn: string; bodyRu: string; bodyEn: string };

const emptyDraft: Draft = { subjectRu: '', subjectEn: '', bodyRu: '', bodyEn: '' };

export default function CrmTemplateEditor({ language, templateType }: { language: Language; templateType: 'postVisit' | 'birthday' }) {
  const ru = language === 'ru';
  const query = templateType === 'postVisit' ? trpc.admin.postVisitTemplate.useQuery() : trpc.admin.birthdayTemplate.useQuery();
  const saveMutation = templateType === 'postVisit' ? trpc.admin.savePostVisitTemplate.useMutation() : trpc.admin.saveBirthdayTemplate.useMutation();

  const { data: template, isLoading, refetch } = query;
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
  }, [template]);

  const save = () => {
    saveMutation.mutate(draft, {
      onSuccess: () => {
        toast.success(ru ? 'Шаблон сохранён' : 'Template saved');
        void refetch();
      },
      onError: error => toast.error(error.message),
    });
  };

  const update = (key: keyof Draft, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const inputStyle: React.CSSProperties = { width: '100%', color: 'hsl(var(--foreground))', background: 'transparent', border: '1px solid hsl(var(--border))', padding: '0.75rem', fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', outline: 'none' };
  const labelStyle: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' };

  if (isLoading) return <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '1rem 0' }}><Loader2 size={16} className="animate-spin" /><span style={labelStyle}>{ru ? 'Загружаю шаблон...' : 'Loading template...'}</span></div>;

  const title = templateType === 'postVisit'
    ? (ru ? 'Шаблон письма через 14 дней после визита' : '14-day post-visit email template')
    : (ru ? 'Шаблон поздравления с днём рождения' : 'Birthday greeting email template');

  return (
    <section style={{ paddingTop: '1.5rem', marginTop: '2rem', borderTop: '1px solid hsl(var(--border))' }}>
      <p style={{ ...labelStyle, margin: '0 0 0.4rem', color: 'var(--gold-mid)' }}>{ru ? 'Автоматические письма' : 'Automated emails'}</p>
      <h4 style={{ margin: '0 0 0.6rem', fontStyle: 'italic' }}>{title}</h4>
      <p style={{ maxWidth: '45rem', margin: '0 0 1.25rem', fontSize: '0.8125rem', lineHeight: 1.55 }}>
        {ru ? 'Доступные переменные: {{clientName}}, {{bookingUrl}}.' : 'Available variables: {{clientName}}, {{bookingUrl}}.'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(17rem, 1fr))', gap: '1rem' }}>
        <label style={{ display: 'grid', gap: '0.45rem' }}><span style={labelStyle}>RU · {ru ? 'Тема' : 'Subject'}</span><input value={draft.subjectRu} onChange={event => update('subjectRu', event.target.value)} style={inputStyle} /></label>
        <label style={{ display: 'grid', gap: '0.45rem' }}><span style={labelStyle}>EN · Subject</span><input value={draft.subjectEn} onChange={event => update('subjectEn', event.target.value)} style={inputStyle} /></label>
        <label style={{ display: 'grid', gap: '0.45rem' }}><span style={labelStyle}>RU · {ru ? 'Текст' : 'Body'}</span><RichTextEditor value={draft.bodyRu} onChange={value => update('bodyRu', value)} language={language} /></label>
        <label style={{ display: 'grid', gap: '0.45rem' }}><span style={labelStyle}>EN · Body</span><RichTextEditor value={draft.bodyEn} onChange={value => update('bodyEn', value)} language={language} /></label>
      </div>
      <button type="button" className="btn-primary" onClick={save} disabled={saveMutation.isPending || !draft.subjectRu.trim() || !draft.subjectEn.trim() || !draft.bodyRu.trim() || !draft.bodyEn.trim()} style={{ marginTop: '1rem', fontSize: '0.625rem' }}>
        {saveMutation.isPending ? <><Loader2 size={13} className="animate-spin" style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '0.35rem' }} />{ru ? 'Сохранение...' : 'Saving...'}</> : (ru ? 'Сохранить шаблон' : 'Save template')}
      </button>
    </section>
  );
}
