describe('profile API route', () => {
  const setupSupabase = (mockImpl: any) => {
    jest.doMock('../../lib/supabase-server', () => ({
      getSupabaseServerClient: jest.fn().mockResolvedValue(mockImpl),
    }));
  };

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('INT-PROFILE-01: GET returns 400 when clerkId is missing', async () => {
    setupSupabase({ from: jest.fn() });
    const { GET } = require('../../app/(api)/profile+api');
    const request = new Request('https://example.com/api/profile', { method: 'GET' });
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it('INT-PROFILE-02: GET returns null data when driver does not exist', async () => {
    const chain: any = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });

    setupSupabase({ from: jest.fn(() => chain) });

    const { GET } = require('../../app/(api)/profile+api');
    const request = new Request(
      'https://example.com/api/profile?clerkId=clerk_new',
      { method: 'GET' },
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBeNull();
  });

  it('INT-PROFILE-03: POST returns 400 when clerkId is missing from body', async () => {
    setupSupabase({ from: jest.fn() });

    const { POST } = require('../../app/(api)/profile+api');
    const request = new Request('https://example.com/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: 'Sipho Dlamini' }), // no clerkId
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});