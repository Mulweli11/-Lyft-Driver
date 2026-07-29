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
