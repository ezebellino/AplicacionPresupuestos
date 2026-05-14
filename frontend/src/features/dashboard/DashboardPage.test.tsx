import '@testing-library/jest-dom/vitest';

import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardPage } from './DashboardPage';

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'test-token');
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.endsWith('/clients')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: [
                  {
                    id: 'client-1',
                    name: 'Acme Clima',
                    document: '30-123',
                    email: 'admin@acme.test',
                    phone: null,
                    address: null,
                    notes: null,
                  },
                ],
              }),
              { status: 200 },
            ),
          );
        }

        if (url.endsWith('/cost-items')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: [
                  {
                    id: 'cost-1',
                    category: 'equipment',
                    name: 'Equipo split 3000 frigorias',
                    description: null,
                    unit: 'unidad',
                    unit_cost: '450000.00',
                    tax_rate: null,
                    effective_tax_rate: '21.00',
                    is_active: true,
                  },
                ],
              }),
              { status: 200 },
            ),
          );
        }

        return Promise.resolve(new Response(null, { status: 404 }));
      }),
    );
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('renders tenant workspace metrics from clients and cost items', async () => {
    render(<DashboardPage onLogout={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Panel operativo' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Costos activos')).toBeInTheDocument();
      expect(screen.getByText('Equipos')).toBeInTheDocument();
      expect(screen.getByText('Presupuestos recientes')).toBeInTheDocument();
    });
  });
});
