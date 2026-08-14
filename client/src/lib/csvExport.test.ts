import { describe, expect, it } from 'vitest';
import { createCsv } from './csvExport';

describe('createCsv', () => {
  it('creates a UTF-8 CSV with quoted values and escaped quotes', () => {
    const csv = createCsv([{ client: 'Isaac, Jr.', note: 'He said "hello"', total: 2 }]);

    expect(csv).toContain('"client","note","total"');
    expect(csv).toContain('"Isaac, Jr.","He said ""hello""","2"');
  });
});
