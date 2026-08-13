import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

type Language = 'ru' | 'en';
type PricingMode = 'fixed' | 'range' | 'request';

type ServiceForm = {
  nameRu: string;
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
  durationMinutes: string;
  pricingMode: PricingMode;
  priceAmd: string;
  priceMinAmd: string;
  priceMaxAmd: string;
  depositAmd: string;
  noteRu: string;
  noteEn: string;
  isActive: 'yes' | 'no';
  displayOrder: string;
};

const emptyForm = (order = 0): ServiceForm => ({
  nameRu: '', nameEn: '', descriptionRu: '', descriptionEn: '', durationMinutes: '45', pricingMode: 'fixed',
  priceAmd: '', priceMinAmd: '', priceMaxAmd: '', depositAmd: '', noteRu: '', noteEn: '', isActive: 'yes', displayOrder: String(order),
});

function toOptionalAmd(value: string) {
  const parsed = Number(value);
  return value.trim() === '' || !Number.isFinite(parsed) ? null : Math.round(parsed);
}

export default function ServiceManager({ language }: { language: Language }) {
  const ru = language === 'ru';
  const { data: services, refetch, isLoading, isError } = trpc.admin.services.useQuery();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm());
  const nextOrder = useMemo(() => Math.max(0, ...(services ?? []).map(item => item.displayOrder)) + 1, [services]);
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.7rem 0', border: 'none', borderBottom: '1px solid hsl(var(--border))', background: 'transparent', color: 'hsl(var(--foreground))', outline: 'none', fontFamily: "'Inter', sans-serif", fontSize: '0.875rem' };
  const labelStyle: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' };

  const saveMutation = trpc.admin.saveService.useMutation({
    onSuccess: () => {
      toast.success(ru ? 'Услуга сохранена' : 'Service saved');
      setEditingId(null); setForm(emptyForm(nextOrder)); refetch();
    },
    onError: error => toast.error(error.message),
  });
  const activeMutation = trpc.admin.setServiceActive.useMutation({
    onSuccess: () => { toast.success(ru ? 'Каталог обновлён' : 'Catalog updated'); refetch(); },
    onError: error => toast.error(error.message),
  });

  const update = <K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) => setForm(current => ({ ...current, [key]: value }));
  const beginNew = () => { setEditingId(null); setForm(emptyForm(nextOrder)); };
  const beginEdit = (service: NonNullable<typeof services>[number]) => {
    const pricingMode: PricingMode = service.priceAmd !== null ? 'fixed' : service.priceMinAmd !== null ? 'range' : 'request';
    setEditingId(service.id);
    setForm({
      nameRu: service.nameRu, nameEn: service.nameEn, descriptionRu: service.descriptionRu ?? '', descriptionEn: service.descriptionEn ?? '', durationMinutes: String(service.durationMinutes),
      pricingMode, priceAmd: service.priceAmd?.toString() ?? '', priceMinAmd: service.priceMinAmd?.toString() ?? '', priceMaxAmd: service.priceMaxAmd?.toString() ?? '',
      depositAmd: service.depositAmd?.toString() ?? '', noteRu: service.noteRu ?? '', noteEn: service.noteEn ?? '', isActive: service.isActive, displayOrder: String(service.displayOrder),
    });
  };
  const submit = () => {
    const priceAmd = form.pricingMode === 'fixed' ? toOptionalAmd(form.priceAmd) : null;
    const priceMinAmd = form.pricingMode === 'range' ? toOptionalAmd(form.priceMinAmd) : null;
    const priceMaxAmd = form.pricingMode === 'range' ? toOptionalAmd(form.priceMaxAmd) : null;
    if (form.pricingMode === 'fixed' && priceAmd === null) return toast.error(ru ? 'Укажите фиксированную цену в AMD' : 'Enter a fixed AMD price');
    if (form.pricingMode === 'range' && (priceMinAmd === null || priceMaxAmd === null)) return toast.error(ru ? 'Укажите обе границы диапазона в AMD' : 'Enter both AMD range values');
    if (form.pricingMode === 'range' && priceMinAmd! > priceMaxAmd!) return toast.error(ru ? 'Максимальная цена не может быть меньше минимальной' : 'Maximum price cannot be below minimum price');
    saveMutation.mutate({
      ...(editingId ? { id: editingId } : {}),
      nameRu: form.nameRu, nameEn: form.nameEn, descriptionRu: form.descriptionRu || null, descriptionEn: form.descriptionEn || null,
      durationMinutes: Math.round(Number(form.durationMinutes)), priceAmd, priceMinAmd, priceMaxAmd,
      depositAmd: toOptionalAmd(form.depositAmd), noteRu: form.noteRu || null, noteEn: form.noteEn || null,
      isActive: form.isActive, displayOrder: Math.max(0, Math.round(Number(form.displayOrder))),
    });
  };
  const formatPrice = (service: NonNullable<typeof services>[number]) => service.priceAmd !== null
    ? `${service.priceAmd.toLocaleString()} ֏`
    : service.priceMinAmd !== null && service.priceMaxAmd !== null
      ? `${service.priceMinAmd.toLocaleString()} – ${service.priceMaxAmd.toLocaleString()} ֏`
      : (ru ? 'По запросу' : 'On request');

  return <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
      <p style={{ margin: 0, color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>{ru ? 'Не удаляйте старые услуги: архив сохранит историю прошлых записей.' : 'Archive old services instead of deleting them to preserve booking history.'}</p>
      {editingId !== null && <button type="button" className="btn-outline" onClick={beginNew}>{ru ? 'Новая услуга' : 'New service'}</button>}
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
      <label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>RU · {ru ? 'Название' : 'Name'}</span><input value={form.nameRu} onChange={event => update('nameRu', event.target.value)} style={inputStyle} placeholder="Стрижка" /></label>
      <label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>EN · Name</span><input value={form.nameEn} onChange={event => update('nameEn', event.target.value)} style={inputStyle} placeholder="Haircut" /></label>
      <label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>RU · {ru ? 'Описание' : 'Description'}</span><textarea value={form.descriptionRu} onChange={event => update('descriptionRu', event.target.value)} rows={3} style={{ ...inputStyle, border: '1px solid hsl(var(--border))', padding: '0.75rem', resize: 'vertical' }} /></label>
      <label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>EN · Description</span><textarea value={form.descriptionEn} onChange={event => update('descriptionEn', event.target.value)} rows={3} style={{ ...inputStyle, border: '1px solid hsl(var(--border))', padding: '0.75rem', resize: 'vertical' }} /></label>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
      <label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>{ru ? 'Длительность, мин.' : 'Duration, min'}</span><input type="number" min="5" step="5" value={form.durationMinutes} onChange={event => update('durationMinutes', event.target.value)} style={inputStyle} /></label>
      <label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>{ru ? 'Тип цены' : 'Price type'}</span><select value={form.pricingMode} onChange={event => update('pricingMode', event.target.value as PricingMode)} style={{ ...inputStyle, background: 'hsl(var(--card))' }}><option value="fixed">{ru ? 'Фиксированная' : 'Fixed'}</option><option value="range">{ru ? 'Диапазон' : 'Range'}</option><option value="request">{ru ? 'По запросу' : 'On request'}</option></select></label>
      {form.pricingMode === 'fixed' && <label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>{ru ? 'Цена, AMD' : 'Price, AMD'}</span><input type="number" min="0" step="1000" value={form.priceAmd} onChange={event => update('priceAmd', event.target.value)} style={inputStyle} /></label>}
      {form.pricingMode === 'range' && <><label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>{ru ? 'От, AMD' : 'From, AMD'}</span><input type="number" min="0" step="1000" value={form.priceMinAmd} onChange={event => update('priceMinAmd', event.target.value)} style={inputStyle} /></label><label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>{ru ? 'До, AMD' : 'To, AMD'}</span><input type="number" min="0" step="1000" value={form.priceMaxAmd} onChange={event => update('priceMaxAmd', event.target.value)} style={inputStyle} /></label></>}
      <label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>{ru ? 'Предоплата, AMD' : 'Deposit, AMD'}</span><input type="number" min="0" step="1000" value={form.depositAmd} onChange={event => update('depositAmd', event.target.value)} style={inputStyle} /></label>
      <label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>{ru ? 'Порядок' : 'Order'}</span><input type="number" min="0" value={form.displayOrder} onChange={event => update('displayOrder', event.target.value)} style={inputStyle} /></label>
      <label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>{ru ? 'В каталоге' : 'Catalog status'}</span><select value={form.isActive} onChange={event => update('isActive', event.target.value as 'yes' | 'no')} style={{ ...inputStyle, background: 'hsl(var(--card))' }}><option value="yes">{ru ? 'Активна' : 'Active'}</option><option value="no">{ru ? 'Архив' : 'Archived'}</option></select></label>
    </div>
    {form.pricingMode === 'request' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: '1rem', marginBottom: '1rem' }}><label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>RU · {ru ? 'Примечание о цене' : 'Price note'}</span><input value={form.noteRu} onChange={event => update('noteRu', event.target.value)} style={inputStyle} placeholder={ru ? 'Цена после консультации' : 'Price after consultation'} /></label><label style={{ display: 'grid', gap: '0.35rem' }}><span style={labelStyle}>EN · Price note</span><input value={form.noteEn} onChange={event => update('noteEn', event.target.value)} style={inputStyle} placeholder="Price after consultation" /></label></div>}
    <button type="button" className="btn-primary" disabled={saveMutation.isPending} onClick={submit}>{saveMutation.isPending ? '...' : editingId ? (ru ? 'Сохранить изменения' : 'Save changes') : (ru ? 'Добавить услугу' : 'Add service')}</button>

    <div style={{ display: 'grid', gap: '0.75rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid hsl(var(--border))' }}>
      {isLoading && <p style={labelStyle}>{ru ? 'Загрузка каталога...' : 'Loading catalog...'}</p>}
      {isError && <p style={{ ...labelStyle, color: 'hsl(var(--destructive))' }}>{ru ? 'Не удалось загрузить каталог. Обновите страницу.' : 'Could not load the catalog. Refresh the page.'}</p>}
      {!isLoading && !isError && (services ?? []).length === 0 && <p style={labelStyle}>{ru ? 'В каталоге пока нет услуг. Добавьте первую выше.' : 'The catalog is empty. Add the first service above.'}</p>}
      {(services ?? []).map(service => <article key={service.id} style={{ padding: '1rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', opacity: service.isActive === 'yes' ? 1 : 0.62 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}><div><p style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontWeight: 700, color: 'hsl(var(--foreground))' }}>{service.nameRu} <span style={{ color: 'hsl(var(--muted-foreground))' }}>/ {service.nameEn}</span></p><p style={{ margin: '0.3rem 0 0', fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))' }}>{formatPrice(service)} · {service.durationMinutes} {ru ? 'мин.' : 'min'}{service.depositAmd ? ` · ${ru ? 'предоплата' : 'deposit'} ${service.depositAmd.toLocaleString()} ֏` : ''}</p></div><span style={{ ...labelStyle, color: service.isActive === 'yes' ? 'hsl(142 50% 40%)' : 'hsl(var(--muted-foreground))' }}>{service.isActive === 'yes' ? (ru ? 'Активна' : 'Active') : (ru ? 'Архив' : 'Archived')}</span></div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}><button type="button" className="btn-ghost" style={{ padding: 0, fontSize: '0.625rem' }} onClick={() => beginEdit(service)}>{ru ? 'Изменить' : 'Edit'}</button><button type="button" className="btn-ghost" style={{ padding: 0, fontSize: '0.625rem' }} disabled={activeMutation.isPending} onClick={() => activeMutation.mutate({ id: service.id, isActive: service.isActive === 'yes' ? 'no' : 'yes' })}>{service.isActive === 'yes' ? (ru ? 'В архив' : 'Archive') : (ru ? 'Вернуть в каталог' : 'Restore')}</button></div>
      </article>)}
    </div>
  </div>;
}
