import React, { useRef } from 'react';
import { Bold, List, ListOrdered, Palette } from 'lucide-react';

type Language = 'ru' | 'en';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  minHeight?: string;
};

const COLORS = [
  { value: '#17191E', labelRu: 'Графитовый', labelEn: 'Graphite' },
  { value: '#A17A2C', labelRu: 'Золотой акцент', labelEn: 'Gold accent' },
  { value: '#6B7280', labelRu: 'Мягкий серый', labelEn: 'Soft grey' },
];

function normalizeMarkup(value: string) {
  return value.replace(/<div>/gi, '<p>').replace(/<\/div>/gi, '</p>');
}

export default function RichTextEditor({ value, onChange, language, minHeight = '9rem' }: RichTextEditorProps) {
  const ru = language === 'ru';
  const editorRef = useRef<HTMLDivElement>(null);

  const sync = () => {
    if (!editorRef.current) return;
    onChange(normalizeMarkup(editorRef.current.innerHTML));
  };

  const run = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    sync();
  };

  const colorLabel = ru ? 'Цвет текста' : 'Text color';

  return (
    <div style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
      <div role="toolbar" aria-label={ru ? 'Форматирование текста' : 'Text formatting'} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.3rem', padding: '0.45rem', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--secondary))' }}>
        <button type="button" className="btn-ghost" onMouseDown={event => event.preventDefault()} onClick={() => run('bold')} aria-label={ru ? 'Жирный' : 'Bold'} title={ru ? 'Жирный' : 'Bold'} style={{ display: 'inline-grid', placeItems: 'center', width: '2rem', height: '2rem', padding: 0 }}><Bold size={14} /></button>
        <span aria-hidden="true" style={{ width: 1, height: '1.3rem', background: 'hsl(var(--border))', margin: '0 0.15rem' }} />
        <button type="button" className="btn-ghost" onMouseDown={event => event.preventDefault()} onClick={() => run('insertUnorderedList')} aria-label={ru ? 'Маркированный список' : 'Bulleted list'} title={ru ? 'Маркированный список' : 'Bulleted list'} style={{ display: 'inline-grid', placeItems: 'center', width: '2rem', height: '2rem', padding: 0 }}><List size={14} /></button>
        <button type="button" className="btn-ghost" onMouseDown={event => event.preventDefault()} onClick={() => run('insertOrderedList')} aria-label={ru ? 'Нумерованный список' : 'Numbered list'} title={ru ? 'Нумерованный список' : 'Numbered list'} style={{ display: 'inline-grid', placeItems: 'center', width: '2rem', height: '2rem', padding: 0 }}><ListOrdered size={14} /></button>
        <label title={colorLabel} style={{ position: 'relative', display: 'inline-grid', placeItems: 'center', width: '2rem', height: '2rem', cursor: 'pointer', color: 'hsl(var(--foreground))' }}>
          <Palette size={14} />
          <input type="color" aria-label={colorLabel} defaultValue="#A17A2C" onChange={event => run('foreColor', event.target.value)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
        </label>
        <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.1rem' }}>
          {COLORS.map(color => <button key={color.value} type="button" className="btn-ghost" onMouseDown={event => event.preventDefault()} onClick={() => run('foreColor', color.value)} aria-label={ru ? color.labelRu : color.labelEn} title={ru ? color.labelRu : color.labelEn} style={{ width: '1rem', height: '1rem', padding: 0, minWidth: '1rem', background: color.value, border: '1px solid hsl(var(--border))' }} />)}
        </div>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ru ? 'Текст шаблона' : 'Template text'}
        onInput={sync}
        onBlur={sync}
        dangerouslySetInnerHTML={{ __html: value }}
        style={{ minHeight, padding: '0.75rem', color: 'hsl(var(--foreground))', outline: 'none', fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem', lineHeight: 1.6, whiteSpace: 'normal' }}
      />
      <p style={{ margin: 0, padding: '0.45rem 0.75rem', borderTop: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))', fontSize: '0.68rem' }}>
        {ru ? 'Выдели текст и выбери форматирование. Переменные {{clientName}} и {{bookingUrl}} можно вводить обычным текстом.' : 'Select text and choose a format. You can type {{clientName}} and {{bookingUrl}} as plain text.'}
      </p>
    </div>
  );
}
