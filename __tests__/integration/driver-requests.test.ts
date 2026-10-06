describe('driver/requests API route', () => {
  let consoleErrorSpy: jest.SpyInstance;

  const setupSupabase = (mockImpl: any) => {
    jest.doMock('../../lib/supabase-server', () => ({
      getSupabaseServerClient: jest.fn().mockResolvedValue(mockImpl),
    }));
  };

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('INT-DR-01: returns 400 when clerkId query param is missing', async () => {
    setupSupabase({ from: jest.fn() });
    const { GET } = require('../../app/(api)/driver/requests+api');
    const request = new Request('https://example.com/api/driver/requests', {
      method: 'GET',
    });
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it('INT-DR-02: returns empty list when driver has no row yet', async () => {
    const from = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }));

    setupSupabase({ from });

    const { GET } = require('../../app/(api)/driver/requests+api');
    const request = new Request(
      'https://example.com/api/driver/requests?clerkId=clerk_new',
      { method: 'GET' },
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual([]);
  });

  it('INT-DR-03: returns ride list for a driver with bookings', async () => {
    const from = jest.fn((table: string) => {
      if (table === 'drivers') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 1 },
            error: null,
          }),
        };
      }
      if (table === 'rides') {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.order = jest.fn().mockReturnValueOnce(chain).mockResolvedValueOnce({
          data: [
            {
              ride_id: 101,
              origin_address: 'Stanley Ave',
              destination_address: 'UJ APK',
              status: 'booked',
              seats_booked: 1,
              user_id: 'clerk_passenger',
              scheduled_for: '2026-10-01T08:00:00.000Z',
            },
          ],
          error: null,
        });
        return chain;
      }
      if (table === 'users') {
        const usersChain: any = {};
        usersChain.select = jest.fn().mockReturnValue(usersChain);
        usersChain.in = jest.fn().mockResolvedValue({
          data: [
            {
              clerk_id: 'clerk_passenger',
              name: 'Sipho Dlamini',
              phone_number: '0821234567',
              profile_image_url: null,
              rating: 4.8,
              verification_status: 'verified',
            },
          ],
          error: null,
        });
        return usersChain;
      }
        if (table === 'passenger_ratings') {
         const chain: any = {};
         chain.select = jest.fn().mockReturnValue(chain);
         chain.in = jest.fn().mockResolvedValue({ data: [], error: null });
         return chain;
       }
      return { select: jest.fn().mockReturnThis() };
    });

    setupSupabase({ from });

    const { GET } = require('../../app/(api)/driver/requests+api');
    const request = new Request(
      'https://example.com/api/driver/requests?clerkId=clerk_driver',
      { method: 'GET' },
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].passenger.first_name).toBe('Sipho');
  });

  it('INT-DR-04: returns empty data on database timeout', async () => {
    const from = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockRejectedValue({ code: 'ETIMEDOUT' }),
    }));

    setupSupabase({ from });

    const { GET } = require('../../app/(api)/driver/requests+api');
    const request = new Request(
      'https://example.com/api/driver/requests?clerkId=clerk_test',
      { method: 'GET' },
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual([]);
  });
});