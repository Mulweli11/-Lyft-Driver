import { requireClerkUser } from '../../lib/server-auth';
import { PATCH } from '../../app/(api)/ride/[id]+api';

jest.mock('../../lib/server-auth', () => ({
  requireClerkUser: jest.fn(),
}));
jest.mock('../../lib/supabase-server', () => ({
  getSupabaseServerClient: jest.fn(),
}));

describe('driver passenger rating API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when the rating is outside the one-to-five range', async () => {
    jest.mocked(requireClerkUser).mockResolvedValue('clerk_driver');
    const request = new Request('https://example.com/api/ride/ride_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rate', rating: 6 }),
    });

    const response = await PATCH(request, { id: 'ride_1' });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: 'Rating must be a whole number from 1 to 5',
    });
  });
});
