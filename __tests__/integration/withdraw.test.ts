describe('driver/withdraw API route', () => {
  const setupSupabase = (mockImpl: any) => {
    jest.doMock('../../lib/supabase-server', () => ({
      getSupabaseServerClient: jest.fn().mockResolvedValue(mockImpl),
    }));
  };

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('INT-WD-01: POST returns 400 when fields are missing', async () => {
    setupSupabase({ from: jest.fn() });
    const { POST } = require('../../app/(api)/driver/withdraw+api');
    const request = new Request('https://example.com/api/driver/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clerkId: 'clerk_test' }), // no amount
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('INT-WD-02: POST returns 400 when amount is below the minimum', async () => {
    setupSupabase({ from: jest.fn() });
    const { POST } = require('../../app/(api)/driver/withdraw+api');
    const request = new Request('https://example.com/api/driver/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clerkId: 'clerk_test', amount: 10 }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/minimum/i);
  });

  it('INT-WD-03: POST returns 400 when no bank account is registered', async () => {
    const from = jest.fn((table: string) => {
      if (table === 'users') {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
        return chain;
      }
      return { select: jest.fn().mockReturnThis() };
    });
    setupSupabase({ from });

    const { POST } = require('../../app/(api)/driver/withdraw+api');
    const request = new Request('https://example.com/api/driver/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clerkId: 'clerk_test', amount: 100 }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/bank account/i);
  });

  it('INT-WD-04: POST returns 409 when requested amount exceeds available balance', async () => {
    const from = jest.fn((table: string) => {
      if (table === 'users') {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.maybeSingle = jest.fn().mockResolvedValue({
          data: { profile_data: { bank_account: { last4: '4242' } } },
          error: null,
        });
        return chain;
      }
      if (table === 'drivers') {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.maybeSingle = jest.fn().mockResolvedValue({
          data: { id: 5 },
          error: null,
        });
        return chain;
      }
      if (table === 'rides') {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.lte = jest.fn().mockResolvedValue({ data: [], error: null });
        return chain;
      }
      if (table === 'payouts') {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockResolvedValue({ data: [], error: null });
        return chain;
      }
      return { select: jest.fn().mockReturnThis() };
    });
    setupSupabase({ from });

    const { POST } = require('../../app/(api)/driver/withdraw+api');
    const request = new Request('https://example.com/api/driver/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clerkId: 'clerk_driver', amount: 9999 }),
    });
    const response = await POST(request);
    expect(response.status).toBe(409);
  });
});