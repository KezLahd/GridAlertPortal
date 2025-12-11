// Type declarations for Google Maps JavaScript API
declare namespace google {
  namespace maps {
    class Geocoder {
      geocode(
        request: GeocoderRequest,
        callback: (results: GeocoderResult[] | null, status: GeocoderStatus) => void,
      ): void
    }

    interface GeocoderRequest {
      address?: string
      location?: LatLng | LatLngLiteral
      placeId?: string
      bounds?: LatLngBounds | LatLngBoundsLiteral
      componentRestrictions?: GeocoderComponentRestrictions
      region?: string
    }

    interface GeocoderResult {
      address_components: GeocoderAddressComponent[]
      formatted_address: string
      geometry: GeocoderGeometry
      partial_match?: boolean
      place_id: string
      postcode_localities?: string[]
      types: string[]
    }

    interface GeocoderAddressComponent {
      long_name: string
      short_name: string
      types: string[]
    }

    interface GeocoderGeometry {
      location: LatLng
      location_type: GeocoderLocationType
      viewport: LatLngBounds
      bounds?: LatLngBounds
    }

    enum GeocoderStatus {
      ERROR = "ERROR",
      INVALID_REQUEST = "INVALID_REQUEST",
      OK = "OK",
      OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
      REQUEST_DENIED = "REQUEST_DENIED",
      UNKNOWN_ERROR = "UNKNOWN_ERROR",
      ZERO_RESULTS = "ZERO_RESULTS",
    }

    enum GeocoderLocationType {
      APPROXIMATE = "APPROXIMATE",
      GEOMETRIC_CENTER = "GEOMETRIC_CENTER",
      RANGE_INTERPOLATED = "RANGE_INTERPOLATED",
      ROOFTOP = "ROOFTOP",
    }

    interface GeocoderComponentRestrictions {
      administrativeArea?: string
      country?: string | string[]
      locality?: string
      postalCode?: string
      route?: string
    }

    class LatLng {
      constructor(lat: number, lng: number)
      lat(): number
      lng(): number
      equals(other: LatLng): boolean
      toString(): string
      toUrlValue(precision?: number): string
      toJSON(): LatLngLiteral
    }

    interface LatLngLiteral {
      lat: number
      lng: number
    }

    class LatLngBounds {
      constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral)
      contains(latLng: LatLng | LatLngLiteral): boolean
      equals(other: LatLngBounds | LatLngBoundsLiteral): boolean
      extend(point: LatLng | LatLngLiteral): LatLngBounds
      getCenter(): LatLng
      getNorthEast(): LatLng
      getSouthWest(): LatLng
      intersects(other: LatLngBounds | LatLngBoundsLiteral): boolean
      isEmpty(): boolean
      toJSON(): LatLngBoundsLiteral
      toSpan(): LatLng
      toString(): string
      toUrlValue(precision?: number): string
      union(other: LatLngBounds | LatLngBoundsLiteral): LatLngBounds
    }

    interface LatLngBoundsLiteral {
      east: number
      north: number
      south: number
      west: number
    }
  }
}

// Extend the Window interface to include google
interface Window {
  google: typeof google
}
