import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

type Language = 'ru' | 'en';
type AnnouncementForm = { titleRu: string; titleEn: string; bodyRu: string; bodyEn: string; startDate: string; endDate: string; isPublished: 'yes' | 'no' };

function todayYmd() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const emptyForm = (): AnnouncementForm => ({ titleRu: '', titleEn: '', bodyRu: '', bodyEn: '', startDate: todayYmd(), endDate: todayYmd(), isPublished: 'no' });

export default function AnnouncementManager({ language }: { language: Language }) {
  const ru = language === 'ru';
  const { data: announcements, refetch } = trpc.admin.announcements.useQuery();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const saveMutation = trpc.admin.saveAnnouncement.useMutation({
    onSuccess: () => { toast.success(ru ? 'Афиша сохранена' : 'Notice saved'); setEditingId(null); setForm(emptyForm()); refetch(); },
    onError: error => toast.error(error.message),
  });
  const publicationMutation = trpc.admin.setAnnouncementPublished.useMutation({
    onSuccess: () => { toast.success(ru ? 'Статус публикации обновлён' : 'Publication status updated'); refetch(); },
    onError: error => toast.error(error.message),
  });
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const edit = (item: NonNullable<typeof announcements>[number]) => {
    setEditingId(item.id);
    setForm({ titleRu: item.titleRu, titleEn: item.titleEn, bodyRu: item.bodyRu, bodyEn: item.bodyEn, startDate: item.startDate, endDate: item.endDate, isPublished: item.isPublished });
  };
  const submit = () => saveMutation.mutate({ ...form, ...(editingId ? { id: editingId } : {}) });
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.65rem 0', background: 'transparent', border: 'none', borderBottom: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', outline: 'none', fontFamily: "'Inter', sans-serif", fontSize: '0.875rem' };
  const labelStyle: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' };

  return <div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
      <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>RU · {ru ? 'Заголовок' : 'Title'}</span><input value={form.titleRu} onChange={event => update('titleRu', event.target.value)} style={inputStyle} /></label>
      <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>EN · Title</span><input value={form.titleEn} onChange={event => update('titleEn', event.target.value)} style={inputStyle} /></label>
      <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>RU · {ru ? 'Текст' : 'Body'}</span><textarea value={form.bodyRu} onChange={event => update('bodyRu', event.target.value)} rows={4} style={{ ...inputStyle, border: '1px solid hsl(var(--border))', padding: '0.75rem', resize: 'vertical' }} /></label>
      <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>EN · Body</span><textarea value={form.bodyEn} onChange={event => update('bodyEn', event.target.value)} rows={4} style={{ ...inputStyle, border: '1px solid hsl(var(--border))', padding: '0.75rem', resize: 'vertical' }} /></label>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
      <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>{ru ? 'С даты' : 'From'}</span><input type="date" value={form.startDate} onChange={event => update('startDate', event.target.value)} style={inputStyle} /></label>
      <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>{ru ? 'По дату' : 'To'}</span><input type="date" value={form.endDate} onChange={event => update('endDate', event.target.value)} style={inputStyle} /></label>
      <label style={{ display: 'grid', gap: '0.4rem' }}><span style={labelStyle}>{ru ? 'Показать на сайте' : 'Show on site'}</span><select value={form.isPublished} onChange={event => update('isPublished', event.target.value)} style={{ ...inputStyle, background: 'hsl(var(--card))' }}><option value="no">{ru ? 'Нет' : 'No'}</option><option value="yes">{ru ? 'Да' : 'Yes'}</option></select></label>
    </div>
    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
      <button type="button" className="btn-primary" onClick={submit} disabled={saveMutation.isPending}>{editingId ? (ru ? 'Сохранить изменения' : 'Save changes') : (ru ? 'Создать афишу' : 'Create notice')}</button>
      {editingId && <button type="button" className="btn-outline" onClick={() => { setEditingId(null); setForm(emptyForm()); }}>{ru ? 'Отмена' : 'Cancel'}</button>}
    </div>
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {(announcements ?? []).length === 0 ? <p style={labelStyle}>{ru ? 'Афиш пока нет' : 'No notices yet'}</p> : announcements?.map(item => <article key={item.id} style={{ padding: '1rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', flexWrap: 'wrap' }}><div><p style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{item.titleRu} <span style={{ color: 'hsl(var(--muted-foreground))' }}>/ {item.titleEn}</span></p><p style={{ margin: '0.25rem 0 0', color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}>{item.startDate} — {item.endDate}</p></div><span style={{ ...labelStyle, color: item.isPublished === 'yes' ? 'hsl(142 50% 40%)' : 'hsl(var(--muted-foreground))' }}>{item.isPublished === 'yes' ? (ru ? 'Опубликовано' : 'Published') : (ru ? 'Черновик' : 'Draft')}</span></div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}><button type="button" className="btn-ghost" style={{ fontSize: '0.625rem', padding: 0 }} onClick={() => edit(item)}>{ru ? 'Редактировать' : 'Edit'}</button><button type="button" className="btn-ghost" style={{ fontSize: '0.625rem', padding: 0 }} disabled={publicationMutation.isPending} onClick={() => publicationMutation.mutate({ id: item.id, isPublished: item.isPublished === 'yes' ? 'no' : 'yes' })}>{item.isPublished === 'yes' ? (ru ? 'Скрыть' : 'Hide') : (ru ? 'Опубликовать' : 'Publish')}</button></div>
      </article>)}
    </div>
  </div>;
}
