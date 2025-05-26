import React, { useState, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'

// Delivery interface with nested location, matching App.tsx's expectation for details popup
interface Delivery {
  id: string
  name: string
  address: string
  email?: string
  location: { // Nested location object
    lat: number
    lng: number
  }
  status: string
  eta?: string
  photo_url?: string
  notes?: string
}

// Backend delivery structure (flat lat/lng from DB)
interface BackendDeliveryDTO {
  id: string
  name: string
  address: string
  email?: string
  lat: string // Comes as string from DB
  lng: string // Comes as string from DB
  status: string
  eta?: string
  photo_url?: string
  notes?: string
}

interface MapViewProps {
  onMarkerClick: (deliveryId: string) => void
  deliveryColorMap?: Record<string, string>; // Optional, as it might not be available initially
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

const MapView: React.FC<MapViewProps> = ({ onMarkerClick, deliveryColorMap }) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    console.log('[MapView] deliveryColorMap prop updated:', deliveryColorMap);
  }, [deliveryColorMap]);

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
        
        const data = await response.json() as BackendDeliveryDTO[] // Use DTO type
        console.log('Raw data from backend:', data)
        
        const validDeliveries = data
          .map((deliveryDTO: BackendDeliveryDTO) => { // Explicitly type deliveryDTO
            const lat = parseFloat(deliveryDTO.lat)
            const lng = parseFloat(deliveryDTO.lng)
            // console.log(`Processing delivery ${deliveryDTO.id}: lat=${lat}, lng=${lng}`);
            if (!isNaN(lat) && !isNaN(lng)) {
              return {
                ...deliveryDTO,
                location: { lat, lng }, // Transform to nested location object
                // Remove original flat lat/lng if they exist on deliveryDTO after spread
                // No, keep them on the DTO, just create the nested one for Delivery type
              } as Delivery; // Cast to Delivery type
            }
            return null; // Invalid coordinates
          })
          .filter((delivery): delivery is Delivery => delivery !== null) // Type guard to filter out nulls and satisfy TS
        
        console.log('Valid deliveries (transformed for frontend):', validDeliveries)
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
        const color = deliveryColorMap?.[delivery.id] || '#808080'; // Use color from map, or unassigned grey as default
        // console.log(`Rendering marker for ${delivery.id} with color: ${color}`)
        return (
          <Marker
            key={delivery.id}
            position={delivery.location}
            title={delivery.name}
            onClick={() => onMarkerClick(delivery.id)}
            options={{
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: color, // Use the determined color
                fillOpacity: 0.9,
                strokeColor: 'white',
                strokeWeight: 1.5,
              }
            }}
          />
        )
      })}
    </GoogleMap>
  )
}

export default MapView