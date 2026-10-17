import { supabase } from '@/integrations/supabase/client';
import {
  getSignedMaterialUrl,
  materialFileName,
  materialPath,
} from '../materialsService';

const LEGACY =
  'https://lnhtlbatcufmsyoujuqh.supabase.co/storage/v1/object/public/materials/c1/abc%20notes.pdf';

describe('material references', () => {
  it('reads the storage path from old public links', () => {
    expect(materialPath(LEGACY)).toBe('c1/abc notes.pdf');
    expect(materialPath(`${LEGACY}?t=1`)).toBe('c1/abc notes.pdf');
  });

  it('passes new-style paths through unchanged', () => {
    expect(materialPath('c1/f.pdf')).toBe('c1/f.pdf');
  });

  it('shows the file name', () => {
    expect(materialFileName(LEGACY)).toBe('abc notes.pdf');
    expect(materialFileName('c1/f.pdf')).toBe('f.pdf');
  });
});

describe('getSignedMaterialUrl', () => {
  const createSignedUrl = jest.fn();
  beforeEach(() => {
    createSignedUrl.mockReset();
    (supabase as unknown as { storage: unknown }).storage = {
      from: () => ({ createSignedUrl }),
    };
  });

  it('signs the path for an hour', async () => {
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed' },
      error: null,
    });
    await expect(getSignedMaterialUrl(LEGACY)).resolves.toBe('https://signed');
    expect(createSignedUrl).toHaveBeenCalledWith('c1/abc notes.pdf', 3600);
  });

  it('fails when access is refused', async () => {
    createSignedUrl.mockResolvedValue({
      data: null,
      error: new Error('Object not found'),
    });
    await expect(getSignedMaterialUrl('c1/f.pdf')).rejects.toThrow();
  });
});
