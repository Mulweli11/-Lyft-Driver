describe('hubs API route', () => {
  const setupSupabase = (mockImpl: any) => {
    jest.doMock('../../lib/supabase-server', () => ({
      getSupabaseServerClient: jest.fn().mockResolvedValue(mockImpl),
    }));
  };

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('INT-HUB-01: GET returns active hubs list', async () => {
    const chain: any = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.order = jest.fn().mockResolvedValue({
      data: [
        { id: 1, name: 'UJ APK', address: 'Kingsway', latitude: -26.18, longitude: 28.0, radius: 200 },
        { id: 2, name: 'UJ Doornfontein', address: 'Bunting Rd', latitude: -26.19, longitude: 28.05, radius: 150 },
      ],
      error: null,
    });

    setupSupabase({ from: jest.fn(() => chain) });

    const { GET } = require('../../app/(api)/hubs+api');
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(2);
    expect(body.data[0].name).toBe('UJ APK');
  });

  it('INT-HUB-02: GET returns 500 when the database fails', async () => {
    const chain: any = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.order = jest.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } });

    setupSupabase({ from: jest.fn(() => chain) });

    // Suppress console.error for this test only
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { GET } = require('../../app/(api)/hubs+api');
    const response = await GET();
    expect(response.status).toBe(500);

    errorSpy.mockRestore();
  });
});