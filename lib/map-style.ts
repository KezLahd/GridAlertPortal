// Wattle's map styles, drawn to look like Apple Maps: clear blue water, fresh green parks, white streets with soft
// grey edges, pale-yellow motorways, and no business pins, so the gold sites are the strongest colour on top.
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
  { elementType: "geometry", stylers: [{ color: "#F4F2EE" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4A4844" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }, { weight: 3 }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#B8B1C4" }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#A79FB6" }, { weight: 1.2 }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#1F1E1C" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#EDF0E2" }] },
  { featureType: "landscape.natural.terrain", elementType: "geometry", stylers: [{ color: "#E6EDD8" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#F1EFEA" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#C9E6B3" }] },
  { featureType: "poi.medical", elementType: "geometry", stylers: [{ color: "#F7DDE1" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#DAD6CE" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6E6B66" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#FDE3A1" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#EBC56F" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry.fill", stylers: [{ color: "#FBD889" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#A3D1F4" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4D7FA8" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#C8E3F8" }] },
]

export const WATTLE_MAP_STYLE_DARK: Style = [
  ...common,
  { elementType: "geometry", stylers: [{ color: "#24252A" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#B9B7B2" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1A1B1F" }, { weight: 3 }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#4E4A5C" }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#5D5870" }, { weight: 1.2 }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#ECEAE5" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#24292A" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#2A2B30" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#213A2A" }] },
  { featureType: "poi.medical", elementType: "geometry", stylers: [{ color: "#3A2A30" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#3D3E44" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#2C2D32" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9A9893" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#6B5A33" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#4A3F26" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#1B3550" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#6E97BD" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#152A40" }] },
]
