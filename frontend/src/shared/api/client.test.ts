import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiClient, buildCriticalErrorMessage } from './client';

describe('api client support errors', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('captures backend request ids on failed json responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ detail: 'request is not pending' }), {
            status: 409,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': 'req-123',
            },
          }),
        ),
      ),
    );

    await expect(apiClient.login({ email: 'admin@test.com', password: 'bad-password' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      detail: 'request is not pending',
      requestId: 'req-123',
    });
  });

  it('builds support-facing error text only when an api request id exists', () => {
    const withRequestId = buildCriticalErrorMessage(
      'No se pudo guardar.',
      new ApiError({ status: 409, message: 'request is not pending', detail: 'request is not pending', requestId: 'req-123' }),
    );
    const withoutRequestId = buildCriticalErrorMessage('No se pudo guardar.', new Error('boom'));

    expect(withRequestId).toContain('req-123');
    expect(withRequestId).toContain('request is not pending');
    expect(withoutRequestId).toBe('No se pudo guardar.');
  });
});
