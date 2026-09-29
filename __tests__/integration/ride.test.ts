describe('ride API route', () => {
  const setupSupabase = (mockImpl: any) => {
    jest.doMock('../../lib/supabase-server', () => ({
      getSupabaseServerClient: jest.fn().mockResolvedValue(mockImpl),
    }));
  };

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('INT-RIDE-01: GET returns 400 when clerkId is missing', async () => {
    setupSupabase({ from: jest.fn() });
    const { GET } = require('../../app/(api)/ride+api');
    const request = new Request('https://example.com/api/ride', { method: 'GET' });
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it('INT-RIDE-02: GET returns zero-value summary when no rides exist', async () => {
    const from = jest.fn((table: string) => {
      if (table === 'rides') {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.order = jest.fn().mockReturnValue(chain);
        chain.limit = jest.fn().mockResolvedValue({ data: [], error: null });
        return chain;
      }
      return { select: jest.fn().mockReturnThis() };
    });
    setupSupabase({ from });

    const { GET } = require('../../app/(api)/ride+api');
    const request = new Request(
      'https://example.com/api/ride?clerkId=clerk_empty',
      { method: 'GET' },
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.completed_trips).toBe(0);
    expect(body.data.cancelled_trips).toBe(0);
    expect(body.data.money_spent).toBe(0);
    expect(body.data.last_ride).toBe('No rides yet');
  });

  it('INT-RIDE-03: POST returns 400 when required booking fields are missing', async () => {
    setupSupabase({ from: jest.fn() });
    const { POST } = require('../../app/(api)/ride+api');
    const request = new Request('https://example.com/api/ride', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clerkId: 'clerk_test' }), // missing most fields
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('INT-RIDE-04: POST returns 404 when driver does not exist', async () => {
    const from = jest.fn((table: string) => {
      if (table === 'drivers') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis() };
    });
    setupSupabase({ from });

    const { POST } = require('../../app/(api)/ride+api');
    const request = new Request('https://example.com/api/ride', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clerkId: 'clerk_passenger',
        driver_id: 999,
        origin_address: 'Stanley Ave',
        origin_latitude: -26.19,
        origin_longitude: 28.03,
        destination_address: 'UJ APK',
        destination_latitude: -26.18,
        destination_longitude: 28.04,
        fare_price: 3313,
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(404);
  });
});
