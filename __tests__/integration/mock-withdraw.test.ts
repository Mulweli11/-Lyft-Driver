describe('driver/mock-withdraw API route', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('records a clearly marked simulation against the authenticated driver balance', async () => {
    const insert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 1, amount: 50, status: 'paid', is_mock: true },
          error: null,
        }),
      }),
    });

    const from = jest.fn((table: string) => {
      const chain: any = {};
      chain.select = jest.fn().mockReturnValue(chain);
      chain.eq = jest.fn().mockReturnValue(chain);
      if (table === 'drivers') {
        chain.maybeSingle = jest.fn().mockResolvedValue({
          data: { id: 5 },
          error: null,
        });
      } else if (table === 'rides') {
        chain.lte = jest.fn().mockResolvedValue({
          data: [{ fare_price: 10000 }],
          error: null,
        });
      } else if (table === 'payouts') {
        chain.then = (onFulfilled: (value: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(onFulfilled);
        chain.insert = insert;
      }
      return chain;
    });

    jest.doMock('../../lib/server-auth', () => ({
      requireClerkUser: jest.fn().mockResolvedValue('clerk_driver'),
    }));
    jest.doMock('../../lib/supabase-server', () => ({
      getSupabaseServerClient: jest.fn().mockResolvedValue({ from }),
    }));

    const { POST } = require('../../app/(api)/driver/mock-withdraw+api');
    const request = new Request('https://example.com/api/driver/mock-withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clerkId: 'untrusted_id', amount: 50 }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith({
      driver_id: 5,
      amount: 50,
      status: 'paid',
      bank_last4: null,
      is_mock: true,
    });
    expect(body.data.is_mock).toBe(true);
  });
});
