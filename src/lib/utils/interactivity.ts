// import { VITE_GEOAPIFY } from '$env/static/private';
const VITE_GEOAPIFY = import.meta.env.VITE_GEOAPIFY;

function toRadians(degrees: number) {
    return degrees * Math.PI / 180;
}

function toDegrees(radians: number) {
    return radians * 180 / Math.PI;
}

function calculateDestinations(lat1: number, lon1: number) {
    const R = 6371; 
    const bearings = [45, 90, 135, 180, 225, 270, 315]
    const latRad1 = toRadians(lat1);
    const lonRad1 = toRadians(lon1);
    const distance = 100000000;

    const destinations = bearings.map(bearing => {
        const bearingRad = toRadians(bearing);

        const latRad2 = Math.asin(
            Math.sin(latRad1) * Math.cos(distance / R) +
            Math.cos(latRad1) * Math.sin(distance / R) * Math.cos(bearingRad)
        );

        const lonRad2 = lonRad1 + Math.atan2(
            Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(latRad1),
            Math.cos(distance / R) - Math.sin(latRad1) * Math.sin(latRad2)
        );

        return {
            latitude: toDegrees(latRad2),
            longitude: toDegrees(lonRad2)
        };
    })
    return destinations
}
export async function findAirport(lat:number, lon:number) {
    const destinations = calculateDestinations(lat, lon);
    for (const d of destinations) {
        const placesURL = `https://api.geoapify.com/v2/places?categories=airport.international&filter=circle:${d.longitude},${d.latitude},10000000000&limit=1&apiKey=${VITE_GEOAPIFY}`;
        console.log("Fetching Places URL:", placesURL);
        const result = await fetch(placesURL);
        const data = await result.json();
        if (data.features.length > 0) {
            return data.features[0]
        }      
    }
}
export function haversineDistance(lat1:number, lon1:number, lat2:number, lon2:number) {
  const R = 6371; // Radius of Earth in kilometers

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in kilometers
  return distance;
}
