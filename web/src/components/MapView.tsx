import React, { useState, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'

// Delivery interface matching your backend schema
interface Delivery {
  id: string
  name: string
  address: string
  email?: string
  lat: number
  lng: number
  status: string
  eta?: string
  photo_url?: string
  notes?: string
}

const mapContainerStyle = {
  width: '100%',
  height: '100%'
}

// Vancouver coordinates
const defaultCenter = {
  lat: 49.2827,
  lng: -123.1207
}

const MapView: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  
  // Debug: Log whenever deliveries state changes
  useEffect(() => {
    console.log('Deliveries state updated:', deliveries)
    console.log('Number of deliveries in state:', deliveries.length)
  }, [deliveries])

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  })

  // Fetch deliveries from backend
  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        console.log('Fetching deliveries from backend...')
        const response = await fetch('http://localhost:3001/api/deliveries')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Raw data from backend:', data)
        
        // Convert lat/lng to numbers and filter out invalid coordinates
        const validDeliveries = data.filter((delivery: any) => {
          const lat = parseFloat(delivery.lat)
          const lng = parseFloat(delivery.lng)
          console.log(`Checking delivery ${delivery.id}: lat=${lat}, lng=${lng}`)
          return !isNaN(lat) && !isNaN(lng)
        }).map((delivery: any) => ({
          ...delivery,
          lat: parseFloat(delivery.lat),
          lng: parseFloat(delivery.lng)
        }))
        
        console.log('Valid deliveries:', validDeliveries)
        console.log('Number of valid deliveries:', validDeliveries.length)
        
        // Add a small delay to ensure map is fully initialized
        setTimeout(() => {
          setDeliveries(validDeliveries)
        }, 100)
      } catch (err) {
        console.error('Error fetching deliveries:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDeliveries()
  }, [])

  if (loadError) {
    return <div className="w-full h-full bg-gray-100 flex items-center justify-center text-red-500">Error loading map.</div>
  }

  if (!isLoaded) {
    return <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading map...</div>
  }

  if (loading) {
    return <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading deliveries...</div>
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={defaultCenter}
      zoom={11}
      options={{
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      }}
    >
      {/* Render basic markers */}
      {deliveries.map((delivery) => {
        console.log(`Rendering marker for ${delivery.id} at:`, delivery.lat, delivery.lng)
        return (
          <Marker
            key={delivery.id}
            position={{ lat: delivery.lat, lng: delivery.lng }}
            title={delivery.name}
          />
        )
      })}
    </GoogleMap>
  )
}

export default MapView