export type DriverProfileInput = {
  name?: string;
  first_name?: string;
  last_name?: string;
  verified?: boolean;
  status?: string;
};

export type DriverTripCheck = {
  verified?: boolean;
  status?: string;
  hasActiveTrip?: boolean;
  missingRequiredFields?: boolean;
};

export function normalizeDriverName(input: DriverProfileInput) {
  const explicitFirst = typeof input.first_name === 'string' ? input.first_name.trim() : '';
  const explicitLast = typeof input.last_name === 'string' ? input.last_name.trim() : '';
  const fallbackName = typeof input.name === 'string' ? input.name.trim() : '';

  if (explicitFirst || explicitLast) {
    return {
      first_name: explicitFirst || null,
      last_name: explicitLast || null,
      full_name: fallbackName || [explicitFirst, explicitLast].filter(Boolean).join(' ') || null,
    };
  }

  const parts = fallbackName.split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] ?? null,
    last_name: parts.slice(1).join(' ') || null,
    full_name: fallbackName || null,
  };
}

export function validatePhoneNumber(value: string): boolean {
  if (typeof value !== 'string') return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 9;
}

export function validateDateOfBirth(value: string): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return age >= 18 && age <= 120;
}

export function resolveDriverVerificationStatus(driver: { verified?: boolean; status?: string; driver_verification_status?: string } | null | undefined): string {
  if (
    driver?.verified === true ||
    driver?.driver_verification_status === 'approved' ||
    driver?.status === 'approved'
  ) {
    return 'approved';
  }

  if (driver?.driver_verification_status) return driver.driver_verification_status;
  if (driver?.status === 'pending') return 'pending';
  if (driver?.status === 'rejected') return 'rejected';
  return 'not_submitted';
}

export function canDriverCreateTrip(input: DriverTripCheck) {
  if (input.missingRequiredFields) {
    return { allowed: false, error: 'Missing required fields' };
  }

  const verificationStatus =
    input.verified === true ? 'approved' : input.status ?? 'not_submitted';

  if (verificationStatus !== 'approved' && input.verified !== true && input.status !== 'approved') {
    return { allowed: false, error: 'Finish driver verification before publishing trips' };
  }

  if (input.hasActiveTrip) {
    return {
      allowed: false,
      error: 'You already have an active trip. Edit your current trip instead of creating another one.',
    };
  }

  return { allowed: true, error: null };
}
