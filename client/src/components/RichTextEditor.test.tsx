import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RichTextEditor from './RichTextEditor';

afterEach(cleanup);

describe('RichTextEditor', () => {
  it('exposes bold, color, and list formatting controls', () => {
    const execCommand = vi.fn();
    Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true });
    render(<RichTextEditor value="Select me" onChange={vi.fn()} language="ru" />);

    fireEvent.click(screen.getByRole('button', { name: 'Жирный' }));
    fireEvent.click(screen.getByRole('button', { name: 'Маркированный список' }));
    fireEvent.click(screen.getByRole('button', { name: 'Нумерованный список' }));
    fireEvent.click(screen.getByRole('button', { name: 'Золотой акцент' }));

    expect(execCommand).toHaveBeenCalledWith('bold', false, undefined);
    expect(execCommand).toHaveBeenCalledWith('insertUnorderedList', false, undefined);
    expect(execCommand).toHaveBeenCalledWith('insertOrderedList', false, undefined);
    expect(execCommand).toHaveBeenCalledWith('foreColor', false, '#A17A2C');
  });

  it('returns edited HTML markup through onChange', () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="" onChange={onChange} language="en" />);
    const editor = screen.getByRole('textbox', { name: 'Template text' });
    editor.innerHTML = '<strong>Updated</strong><ul><li>One</li></ul>';
    fireEvent.input(editor);

    expect(onChange).toHaveBeenCalledWith('<strong>Updated</strong><ul><li>One</li></ul>');
  });
});
