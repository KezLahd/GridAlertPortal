// Wattle's map styles in Apple Maps' own colours, sampled from maps.apple.com (light and dark, Nov 2026): its sky-blue
// water, green countryside and parks, off-white towns, white streets with grey edges and grey motorways, and no business
// pins, so the gold sites are the strongest colour on top.
// One for light mode and one for dark; the map page picks the one that matches the page.

type Style = google.maps.MapTypeStyle[]

const common: Style = [
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", stylers: [{ visibility: "on" }] },
  { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", elementType: "geometry", stylers: [{ visibility: "on" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
]

export const WATTLE_MAP_STYLE: Style = [
  ...common,
  { elementType: "geometry", stylers: [{ color: "#F3F2EA" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#55524C" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }, { weight: 3 }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#C9C3CF" }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#B9B1C2" }, { weight: 1 }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#8A3D6E" }] },
  { featureType: "administrative.province", elementType: "labels.text.fill", stylers: [{ color: "#8A3D6E" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#1F1F1F" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#CCEDB4" }] },
  { featureType: "landscape.natural.terrain", elementType: "geometry", stylers: [{ color: "#CCEDB4" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#F3F2EA" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#C3E4AB" }] },
  { featureType: "poi.medical", elementType: "geometry", stylers: [{ color: "#F6DEE2" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#D3D1CC" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6E6B66" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#E2E0DB" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#C6C3BD" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#8DDAF7" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3F86B8" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#B8E8FB" }] },
]

export const WATTLE_MAP_STYLE_DARK: Style = [
  ...common,
  { elementType: "geometry", stylers: [{ color: "#334457" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#C9D3DE" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1C2633" }, { weight: 3 }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#56647A" }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#66748A" }, { weight: 1 }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#F1F4F8" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#2F4A4C" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#334457" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#155C56" }] },
  { featureType: "poi.medical", elementType: "geometry", stylers: [{ color: "#4A3E50" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#4B5B6E" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#2A3848" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#A9B6C4" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#A9B8C7" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#3A4A5C" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#1E347B" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#7C93D6" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#16285E" }] },
]
