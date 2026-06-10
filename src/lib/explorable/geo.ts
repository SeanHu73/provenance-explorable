/**
 * Geographic primitives for the explorable.
 *
 * Stanford campus core bounds, haversine distance, and shared LatLng
 * types. Keep this file free of React/browser APIs so it can be used
 * from anywhere (server, client, admin, future Cloud Functions).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlayerPosition extends LatLng {
  accuracy: number;       // meters
  source: 'gps' | 'dev';  // real device GPS or dev override
  timestamp: number;      // ms since epoch
}

/**
 * Bounding box for the playable area. `restriction.strictBounds = true`
 * makes Google Maps refuse to pan beyond this. Sized to cover Roth Way
 * (north) through south of Memorial Church, and the Anderson Collection
 * (west) through east of the Quad complex.
 *
 * Tune these once we walk the perimeter — for now they're estimated from
 * the Google Maps reference screenshots.
 */
export const STANFORD_BOUNDS = {
  north: 37.4310,
  south: 37.4255,
  east:  -122.1640,
  west:  -122.1755,
};

/** Initial map center — Memorial Church (the experience's focal point). */
export const STANFORD_CENTER: LatLng = { lat: 37.4275, lng: -122.1697 };

/** Haversine distance in meters between two lat/lng points. */
export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLng = (b.lng - a.lng) * (Math.PI / 180);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * (Math.PI / 180)) *
    Math.cos(b.lat * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Initial-bearing in degrees from `a` to `b`, measured clockwise from
 * true north (0 = north, 90 = east, 180 = south, 270 = west).
 *
 * The campus map is rendered north-up with no heading rotation, so this
 * bearing maps directly to a screen direction: 0 points up, 90 right.
 */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const φ1 = a.lat * (Math.PI / 180);
  const φ2 = b.lat * (Math.PI / 180);
  const Δλ = (b.lng - a.lng) * (Math.PI / 180);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}
