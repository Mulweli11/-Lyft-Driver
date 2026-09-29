import {
  canDriverCreateTrip,
  normalizeDriverName,
  resolveDriverVerificationStatus,
  validateDateOfBirth,
  validatePhoneNumber,
} from '../lib/business-rules';

describe('SMOKE - Critical Path Smoke Test', () => {
  test('SMK-01: Name normalization returns expected shape', () => {
    const result = normalizeDriverName({ name: 'Sipho Dlamini' });
    expect(result).toHaveProperty('first_name');
    expect(result).toHaveProperty('last_name');
    expect(result).toHaveProperty('full_name');
  });

  test('SMK-02: Valid SA phone number is accepted', () => {
    expect(validatePhoneNumber('0821234567')).toBe(true);
  });

  test('SMK-03: Short phone number is rejected', () => {
    expect(validatePhoneNumber('12345')).toBe(false);
  });

  test('SMK-04: Verification status resolves correctly', () => {
    expect(resolveDriverVerificationStatus({ verified: true })).toBe('approved');
    expect(resolveDriverVerificationStatus({ status: 'pending' })).toBe('pending');
  });

  test('SMK-05: Approved driver with no active trip can create a trip', () => {
    const outcome = canDriverCreateTrip({
      verified: true,
      status: 'approved',
      hasActiveTrip: false,
    });
    expect(outcome.allowed).toBe(true);
  });

  test('SMK-06: Unverified driver cannot create a trip', () => {
    const outcome = canDriverCreateTrip({
      verified: false,
      status: 'pending',
      hasActiveTrip: false,
    });
    expect(outcome.allowed).toBe(false);
  });

  test('SMK-07: Driver with an active trip cannot create another', () => {
    const outcome = canDriverCreateTrip({
      verified: true,
      status: 'approved',
      hasActiveTrip: true,
    });
    expect(outcome.allowed).toBe(false);
  });

  test('SMK-08: Valid date of birth is accepted for an adult', () => {
    const now = new Date();
    const adult = new Date(now.getFullYear() - 25, now.getMonth(), now.getDate());
    expect(validateDateOfBirth(adult.toISOString().slice(0, 10))).toBe(true);
  });
});