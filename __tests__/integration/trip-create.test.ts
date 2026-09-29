describe('trip/create API route', () => {
  const setupSupabase = (mockImpl: any) => {
    jest.doMock('../../lib/supabase-server', () => ({
      getSupabaseServerClient: jest.fn().mockResolvedValue(mockImpl),
    }));
  };

  const setupAuth = (clerkId: string | null) => {
    jest.doMock('../../lib/server-auth', () => ({
      requireClerkUser: jest.fn().mockResolvedValue(clerkId),
    }));
  };

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('INT-TRIP-01: returns 400 when required fields are missing', async () => {
    setupSupabase({ from: jest.fn() });
    setupAuth('clerk_test');

    const { POST } = require('../../app/(api)/trip/create+api');
    const request = new Request('https://example.com/api/trip/create', {
      method: 'POST',
      body: JSON.stringify({ origin_address: 'A' }), // missing most fields
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('INT-TRIP-02: blocks trip creation for unverified drivers', async () => {
    const from = jest.fn((table: string) => {
      if (table === 'drivers') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 1, verified: false, status: 'pending' },
            error: null,
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    setupSupabase({ from });
    setupAuth('clerk_unverified');

    const { POST } = require('../../app/(api)/trip/create+api');
    const request = new Request('https://example.com/api/trip/create', {
      method: 'POST',
      body: JSON.stringify({
        origin_address: 'Stanley Ave',
        origin_latitude: -26.19,
        origin_longitude: 28.03,
        destination_address: 'UJ APK',
        destination_latitude: -26.18,
        destination_longitude: 28.04,
        departure_at: '2026-10-01T08:00:00.000Z',
        seats_total: 3,
        price_per_seat: 40,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('INT-TRIP-03: returns 409 when driver already has an active trip', async () => {
    let driverCallCount = 0;
    const from = jest.fn((table: string) => {
      if (table === 'drivers') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 1, verified: true, status: 'approved' },
            error: null,
          }),
        };
      }
      if (table === 'offer_trip') {
        // First call is the "active trip" check → return an existing one
        driverCallCount++;
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 99 },
            error: null,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis() };
    });

    setupSupabase({ from });
    setupAuth('clerk_verified');

    const { POST } = require('../../app/(api)/trip/create+api');
    const request = new Request('https://example.com/api/trip/create', {
      method: 'POST',
      body: JSON.stringify({
        origin_address: 'Stanley Ave',
        origin_latitude: -26.19,
        origin_longitude: 28.03,
        destination_address: 'UJ APK',
        destination_latitude: -26.18,
        destination_longitude: 28.04,
        departure_at: '2026-10-01T08:00:00.000Z',
        seats_total: 3,
        price_per_seat: 40,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
  });
});
