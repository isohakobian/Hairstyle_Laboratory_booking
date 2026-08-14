import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

type Language = 'ru' | 'en';
type AnnouncementForm = { titleRu: string; titleEn: string; bodyRu: string; bodyEn: string; imageUrl: string; startDate: string; endDate: string; isPublished: 'yes' | 'no' };

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

function todayYmd() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const emptyForm = (): AnnouncementForm => ({ titleRu: '', titleEn: '', bodyRu: '', bodyEn: '', imageUrl: '', startDate: todayYmd(), endDate: todayYmd(), isPublished: 'no' });

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
  const uploadMutation = trpc.admin.uploadAnnouncementImage.useMutation({
    onSuccess: (asset) => {
      setForm(current => ({ ...current, imageUrl: asset.url }));
      toast.success(ru ? 'Изображение добавлено. Сохраните новость.' : 'Image added. Save the notice.');
    },
    onError: error => toast.error(error.message),
  });
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const edit = (item: NonNullable<typeof announcements>[number]) => {
    setEditingId(item.id);
    setForm({ titleRu: item.titleRu, titleEn: item.titleEn, bodyRu: item.bodyRu, bodyEn: item.bodyEn, imageUrl: item.imageUrl ?? '', startDate: item.startDate, endDate: item.endDate, isPublished: item.isPublished });
  };
  const submit = () => saveMutation.mutate({ ...form, imageUrl: form.imageUrl || null, ...(editingId ? { id: editingId } : {}) });
  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(ru ? 'Поддерживаются JPEG, PNG и WebP' : 'JPEG, PNG, and WebP are supported');
      event.target.value = '';
      return;
    }
    if (file.size > 1_200_000) {
      toast.error(ru ? 'Изображение должно быть не больше 1,2 МБ' : 'Image must be 1.2 MB or smaller');
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
    <div style={{ marginBottom: '1rem', padding: '0.9rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
      <p style={{ ...labelStyle, margin: '0 0 0.55rem' }}>{ru ? 'Изображение или иконка (необязательно)' : 'Image or icon (optional)'}</p>
      <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {form.imageUrl ? <img src={form.imageUrl} alt={ru ? 'Предпросмотр новости' : 'Notice preview'} style={{ width: '3.5rem', height: '3.5rem', objectFit: 'cover', border: '1px solid hsl(var(--border))' }} /> : <div aria-hidden="true" style={{ width: '3.5rem', height: '3.5rem', display: 'grid', placeItems: 'center', border: '1px dashed hsl(var(--border))', color: 'hsl(var(--muted-foreground))', fontSize: '0.7rem' }}>—</div>}
        <label style={{ display: 'grid', gap: '0.35rem', minWidth: 'min(100%, 17rem)' }}>
          <span style={{ ...labelStyle, fontSize: '0.5625rem' }}>{ru ? 'JPEG, PNG или WebP · до 1,2 МБ' : 'JPEG, PNG, or WebP · up to 1.2 MB'}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadMutation.isPending} onChange={uploadImage} style={{ fontSize: '0.75rem', maxWidth: '100%' }} />
        </label>
        {form.imageUrl && <button type="button" className="btn-ghost" onClick={() => update('imageUrl', '')} style={{ fontSize: '0.625rem', padding: 0 }}>{ru ? 'Убрать изображение' : 'Remove image'}</button>}
      </div>
      {uploadMutation.isPending && <p aria-live="polite" style={{ ...labelStyle, margin: '0.6rem 0 0', fontSize: '0.5625rem' }}>{ru ? 'Загружаю изображение…' : 'Uploading image…'}</p>}
    </div>
    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
      <button type="button" className="btn-primary" onClick={submit} disabled={saveMutation.isPending}>{editingId ? (ru ? 'Сохранить изменения' : 'Save changes') : (ru ? 'Создать афишу' : 'Create notice')}</button>
      {editingId && <button type="button" className="btn-outline" onClick={() => { setEditingId(null); setForm(emptyForm()); }}>{ru ? 'Отмена' : 'Cancel'}</button>}
    </div>
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {(announcements ?? []).length === 0 ? <p style={labelStyle}>{ru ? 'Афиш пока нет' : 'No notices yet'}</p> : announcements?.map(item => <article key={item.id} style={{ padding: '1rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', flexWrap: 'wrap' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>{item.imageUrl && <img src={item.imageUrl} alt="" style={{ width: '2.5rem', height: '2.5rem', objectFit: 'cover', border: '1px solid hsl(var(--border))' }} />}<div><p style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{item.titleRu} <span style={{ color: 'hsl(var(--muted-foreground))' }}>/ {item.titleEn}</span></p><p style={{ margin: '0.25rem 0 0', color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}>{item.startDate} — {item.endDate}</p></div></div><span style={{ ...labelStyle, color: item.isPublished === 'yes' ? 'hsl(142 50% 40%)' : 'hsl(var(--muted-foreground))' }}>{item.isPublished === 'yes' ? (ru ? 'Опубликовано' : 'Published') : (ru ? 'Черновик' : 'Draft')}</span></div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}><button type="button" className="btn-ghost" style={{ fontSize: '0.625rem', padding: 0 }} onClick={() => edit(item)}>{ru ? 'Редактировать' : 'Edit'}</button><button type="button" className="btn-ghost" style={{ fontSize: '0.625rem', padding: 0 }} disabled={publicationMutation.isPending} onClick={() => publicationMutation.mutate({ id: item.id, isPublished: item.isPublished === 'yes' ? 'no' : 'yes' })}>{item.isPublished === 'yes' ? (ru ? 'Скрыть' : 'Hide') : (ru ? 'Опубликовать' : 'Publish')}</button></div>
      </article>)}
    </div>
  </div>;
}
