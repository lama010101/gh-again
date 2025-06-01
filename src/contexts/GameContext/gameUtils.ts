// Calculate distance between two coordinates in kilometers using Haversine formula
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Convert degrees to radians
const toRad = (value: number): number => {
  return (value * Math.PI) / 180;
};

// Calculate accuracy based on distance (0-100%)
export const calculateAccuracy = (distanceKm: number): number => {
  const maxDistance = 20000; // Maximum possible distance in km (half the Earth's circumference)
  const accuracy = Math.max(0, 100 - (distanceKm / maxDistance) * 100);
  return Math.round(accuracy * 100) / 100; // Round to 2 decimal places
};

// Calculate score based on accuracy and time taken
export const calculateScore = (accuracy: number, timeTakenSeconds: number): number => {
  const timeFactor = Math.max(0, 1 - timeTakenSeconds / 300); // 5 minutes max time
  const score = accuracy * timeFactor;
  return Math.round(score);
};

// Calculate XP earned based on accuracy
export const calculateXPEarned = (accuracy: number): number => {
  // Base XP is accuracy percentage, with bonus for high accuracy
  let xp = accuracy;
  if (accuracy > 90) xp *= 1.5;
  else if (accuracy > 75) xp *= 1.25;
  return Math.round(xp);
};
