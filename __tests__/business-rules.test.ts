import {
    canDriverCreateTrip,
    normalizeDriverName,
    resolveDriverVerificationStatus,
    validateDateOfBirth,
    validatePhoneNumber,
} from '../lib/business-rules';

describe('driver business rules', () => {
  it('normalizes a combined full name into first and last name', () => {
    expect(normalizeDriverName({ name: 'Sipho Dlamini' })).toEqual({
      first_name: 'Sipho',
      last_name: 'Dlamini',
      full_name: 'Sipho Dlamini',
    });
  });

  it('prefers explicit first and last name over a combined name', () => {
    expect(
      normalizeDriverName({
        name: 'Sipho Dlamini',
        first_name: 'John',
        last_name: 'Smith',
      }),
    ).toEqual({
      first_name: 'John',
      last_name: 'Smith',
      full_name: 'Sipho Dlamini',
    });
  });

  it('accepts a valid South African phone number', () => {
    expect(validatePhoneNumber('0821234567')).toBe(true);
  });

  it('rejects a short phone number', () => {
    expect(validatePhoneNumber('12345')).toBe(false);
  });

  it('accepts a driver who is exactly 18 years old', () => {
    const now = new Date();
    const date = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
    expect(validateDateOfBirth(date.toISOString().slice(0, 10))).toBe(true);
  });

  it('rejects a driver younger than 18', () => {
    const now = new Date();
    const date = new Date(now.getFullYear() - 17, now.getMonth(), now.getDate());
    expect(validateDateOfBirth(date.toISOString().slice(0, 10))).toBe(false);
  });

  it('resolves approved status when verified is true', () => {
    expect(resolveDriverVerificationStatus({ verified: true })).toBe('approved');
  });

  it('does not let a stale pending status hide a verified driver', () => {
    expect(
      resolveDriverVerificationStatus({
        verified: true,
        driver_verification_status: 'pending',
        status: 'pending',
      }),
    ).toBe('approved');
  });

  it('resolves pending status when status is pending', () => {
    expect(resolveDriverVerificationStatus({ status: 'pending' })).toBe('pending');
  });

  it('blocks trip creation for unapproved drivers', () => {
    const outcome = canDriverCreateTrip({ verified: false, status: 'pending', hasActiveTrip: false });
    expect(outcome.allowed).toBe(false);
    expect(outcome.error).toContain('verification');
  });

  it('allows trip creation for approved drivers', () => {
    const outcome = canDriverCreateTrip({ verified: true, status: 'approved', hasActiveTrip: false });
    expect(outcome.allowed).toBe(true);
    expect(outcome.error).toBeNull();
  });

  it('blocks a second active trip for the same driver', () => {
    const outcome = canDriverCreateTrip({ verified: true, status: 'approved', hasActiveTrip: true });
    expect(outcome.allowed).toBe(false);
    expect(outcome.error).toContain('already have an active trip');
  });

  it('handles a missing or empty trip request cleanly', () => {
    expect(
      canDriverCreateTrip({ verified: false, status: 'not_submitted', hasActiveTrip: false, missingRequiredFields: true }),
    ).toMatchObject({
      allowed: false,
      error: 'Missing required fields',
    });
  });
});
