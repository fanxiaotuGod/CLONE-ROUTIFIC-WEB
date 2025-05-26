interface GeocodingResult {
  lat: number
  lng: number
  formattedAddress: string
}

export const geocodeAddress = async (address: string): Promise<GeocodingResult> => {
  const geocoder = new google.maps.Geocoder()

  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location
        resolve({
          lat: location.lat(),
          lng: location.lng(),
          formattedAddress: results[0].formatted_address
        })
      } else {
        reject(new Error(`Geocoding failed: ${status}`))
      }
    })
  })
}

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  const geocoder = new google.maps.Geocoder()

  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        resolve(results[0].formatted_address)
      } else {
        reject(new Error(`Reverse geocoding failed: ${status}`))
      }
    })
  })
} 