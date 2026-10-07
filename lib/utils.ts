import { Ride } from "@/types/type";

export const sortRides = (rides: Ride[]): Ride[] => {
  const result = [...rides].sort((a, b) => {
    const dateA = new Date(a.scheduled_for ?? a.created_at ?? 0).getTime();
    const dateB = new Date(b.scheduled_for ?? b.created_at ?? 0).getTime();
    return dateA - dateB;
  });

  return result;
};

export function formatTime(minutes?: number | null): string {
  const numericMinutes = typeof minutes === "number" ? minutes : Number(minutes);
  const formattedMinutes = Number.isFinite(numericMinutes) ? Math.round(numericMinutes) : 0;

  if (formattedMinutes < 60) {
    return `${formattedMinutes} min`;
  }

  const hours = Math.floor(formattedMinutes / 60);
  const remainingMinutes = formattedMinutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function estimateRideDurationMinutes({
  durationMinutes,
  originLatitude,
  originLongitude,
  destinationLatitude,
  destinationLongitude,
}: {
  durationMinutes?: number | null;
  originLatitude?: number | null;
  originLongitude?: number | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
}): number | null {
  if (
    typeof durationMinutes === "number" &&
    Number.isFinite(durationMinutes) &&
    durationMinutes > 0
  ) {
    return Math.ceil(durationMinutes);
  }

  const coordinates = [
    originLatitude,
    originLongitude,
    destinationLatitude,
    destinationLongitude,
  ];
  if (
    coordinates.some(
      (coordinate) => typeof coordinate !== "number" || !Number.isFinite(coordinate),
    ) ||
    Math.abs(originLatitude!) > 90 ||
    Math.abs(destinationLatitude!) > 90 ||
    Math.abs(originLongitude!) > 180 ||
    Math.abs(destinationLongitude!) > 180
  ) {
    return null;
  }

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(destinationLatitude! - originLatitude!);
  const longitudeDelta = toRadians(destinationLongitude! - originLongitude!);
  const originLatitudeRadians = toRadians(originLatitude!);
  const destinationLatitudeRadians = toRadians(destinationLatitude!);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitudeRadians) *
      Math.cos(destinationLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;
  const directDistanceKm =
    6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  if (directDistanceKm === 0) return 5;

  // Add a road-distance allowance and use an urban average speed for an estimate.
  return Math.max(5, Math.ceil(((directDistanceKm * 1.3) / 40) * 60));
}

export function estimateArrivalTime(
  pickupTime: string | number | null | undefined,
  durationMinutes: number | null,
): Date | null {
  if (durationMinutes == null || durationMinutes <= 0 || pickupTime == null) {
    return null;
  }

  const departure = new Date(pickupTime);
  if (Number.isNaN(departure.getTime())) return null;

  return new Date(departure.getTime() + durationMinutes * 60_000);
}

export function formatClockTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${day < 10 ? "0" + day : day} ${month} ${year}`;
}
