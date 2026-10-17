import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MaterialLink from '../MaterialLink';
import { getSignedMaterialUrl } from '@/services/materialsService';

jest.mock('@/services/materialsService', () => ({
  getSignedMaterialUrl: jest.fn(),
}));

const renderLink = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MaterialLink reference="c1/f.pdf" className="x">
        Open
      </MaterialLink>
    </QueryClientProvider>
  );

describe('MaterialLink', () => {
  it('links to a signed URL once it is ready', async () => {
    (getSignedMaterialUrl as jest.Mock).mockResolvedValue('https://signed/f');
    renderLink();
    const link = screen.getByText('Open').closest('a')!;
    expect(link).not.toHaveAttribute('href');
    await waitFor(() =>
      expect(link).toHaveAttribute('href', 'https://signed/f')
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(getSignedMaterialUrl).toHaveBeenCalledWith('c1/f.pdf');
  });

  it('explains when the file is unavailable', async () => {
    (getSignedMaterialUrl as jest.Mock).mockRejectedValue(new Error('nope'));
    renderLink();
    const link = screen.getByText('Open').closest('a')!;
    // The link retries once before giving up.
    await waitFor(
      () =>
        expect(link).toHaveAttribute(
          'title',
          'This file is no longer available'
        ),
      { timeout: 4000 }
    );
    expect(link).not.toHaveAttribute('href');
  });
});
