describe('user API route', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const setupSupabase = (mockImpl: any) => {
    jest.doMock('../lib/supabase-server', () => ({
      getSupabaseServerClient: jest.fn().mockResolvedValue(mockImpl),
    }));
  };

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns 400 when required fields are missing', async () => {
    setupSupabase({
      from: jest.fn(),
    });

    const { POST } = require('../app/(api)/user+api');
    const request = new Request('https://example.com', {
      method: 'POST',
      body: JSON.stringify({ email: 'driver@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 200 when the driver already exists', async () => {
    const from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { clerk_id: 'abc' }, error: null }),
    });

    setupSupabase({ from });

    const { POST } = require('../app/(api)/user+api');
    const request = new Request('https://example.com', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Sipho Dlamini',
        email: 'driver@example.com',
        clerkId: 'abc',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});