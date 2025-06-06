import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import type { Route, Delivery } from '../hooks/useRoutes';

interface MapViewProps {
  routes: Route[];
  onMarkerClick: (deliveryId: string) => void;
  deliveryColorMap: Record<string, string>;
  highlightedDeliveryId: string | null;
  depotLocation: { lat: number; lng: number; name: string; };
}

interface DirectionWithMetadata extends google.maps.DirectionsResult {
  routeColor: string;
  routeId: string;
  driverName: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Important: Define libraries outside component to prevent reloading
const libraries: ("geometry" | "drawing" | "places" | "visualization")[] = [];

const MapView: React.FC<MapViewProps> = ({ routes, onMarkerClick, deliveryColorMap, highlightedDeliveryId, depotLocation }) => {
  const [directionsResults, setDirectionsResults] = useState<DirectionWithMetadata[]>([]);
  const [isGeneratingDirections, setIsGeneratingDirections] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries, // Start with empty, we'll use DirectionsService directly
  });

  // Automatically fit map to routes whenever they change
  useEffect(() => {
    fitMapToRoutes();
  }, [routes, mapInstance]);

  // Function to fit map to show all routes and deliveries
  const fitMapToRoutes = () => {
    if (!mapInstance || !routes || routes.length === 0) return;

    const allDeliveries = routes.flatMap(r => r.deliveries);
    if (allDeliveries.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    
    // Include depot in bounds
    bounds.extend(new google.maps.LatLng(depotLocation.lat, depotLocation.lng));
    
    // Include all delivery locations
    routes.forEach(route => {
      route.deliveries.forEach(delivery => {
        bounds.extend(new google.maps.LatLng(delivery.location.lat, delivery.location.lng));
      });
    });

    // Fit map to bounds with some padding
    mapInstance.fitBounds(bounds, {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
    });
  };

  // Generate real Google Directions when routes change
  useEffect(() => {
    if (!isLoaded || !routes || routes.length === 0) {
      console.log('Not ready for directions:', { isLoaded, routesLength: routes?.length || 0 });
      return;
    }

    const generateRealDirections = async () => {
      console.log('🗺️ Starting to generate real Google Directions...');
      setIsGeneratingDirections(true);
      
      try {
        const directionsService = new google.maps.DirectionsService();
        const newDirectionsResults: DirectionWithMetadata[] = [];

        for (const route of routes) {
          // Skip routes with no deliveries or unassigned routes
          if (route.deliveries.length === 0 || route.id === 'unassigned-deliveries-route') {
            console.log(`⏭️ Skipping ${route.driverName} - no deliveries or unassigned`);
            continue;
          }

          try {
            console.log(`🚛 Processing ${route.driverName} with ${route.deliveries.length} deliveries`);

            // Create waypoints (all deliveries except first and last)
            const waypoints = route.deliveries.slice(0, -1).map(delivery => ({
              location: new google.maps.LatLng(delivery.location.lat, delivery.location.lng),
              stopover: true,
            }));

            // Origin: depot, Destination: last delivery
            const origin = new google.maps.LatLng(depotLocation.lat, depotLocation.lng);
            const lastDelivery = route.deliveries[route.deliveries.length - 1];
            const destination = new google.maps.LatLng(lastDelivery.location.lat, lastDelivery.location.lng);

            console.log(`📍 Route for ${route.driverName}:`, {
              origin: 'Depot',
              waypoints: waypoints.length,
              destination: lastDelivery.name
            });

            const request: google.maps.DirectionsRequest = {
              origin,
              destination,
              waypoints,
              travelMode: google.maps.TravelMode.DRIVING,
              optimizeWaypoints: false, // Keep Routific's optimized order
              avoidHighways: false,
              avoidTolls: false,
            };

            // Make the directions request
            const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
              directionsService.route(request, (result, status) => {
                if (status === 'OK' && result) {
                  resolve(result);
                } else {
                  reject(new Error(`Directions request failed: ${status}`));
                }
              });
            });

            // Add metadata to the result
            const resultWithMetadata: DirectionWithMetadata = {
              ...result,
              routeColor: route.color,
              routeId: route.id,
              driverName: route.driverName,
            };

            newDirectionsResults.push(resultWithMetadata);
            console.log(`✅ Generated directions for ${route.driverName}`);

            // Small delay to avoid hitting API rate limits
            await new Promise(resolve => setTimeout(resolve, 200));

          } catch (error) {
            console.error(`❌ Error generating directions for ${route.driverName}:`, error);
          }
        }

        console.log(`🎉 Generated ${newDirectionsResults.length} real direction routes`);
        setDirectionsResults(newDirectionsResults);

        // Automatically fit map to show all routes after directions are generated
        setTimeout(() => {
          fitMapToRoutes();
        }, 500); // Small delay to ensure directions are rendered

      } catch (error) {
        console.error('❌ Error in generateRealDirections:', error);
      } finally {
        setIsGeneratingDirections(false);
      }
    };

    generateRealDirections();
  }, [isLoaded, routes]);

  if (loadError) {
    console.error('Google Maps load error:', loadError);
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-red-500">
        <div className="text-center">
          <p>Error loading Google Maps</p>
          <p className="text-sm">Check your VITE_GOOGLE_MAPS_API_KEY in .env file</p>
          <p className="text-xs mt-2">Make sure Directions API is enabled</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading Google Maps...</div>;
  }

  // Flatten all deliveries from all routes for marker rendering
  const allDeliveries = routes.flatMap(route => route.deliveries);

  console.log('🗺️ MapView rendering:', {
    routes: routes.length,
    totalDeliveries: allDeliveries.length,
    directionsResults: directionsResults.length,
    isGeneratingDirections
  });

  return (
    <div className="relative w-full h-full">
      {/* Loading indicator for directions */}
      {isGeneratingDirections && (
        <div className="absolute top-4 left-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          🗺️ Generating real road directions...
        </div>
      )}

      {/* Fit to Routes Button */}
      {directionsResults.length > 0 && (
        <div className="absolute top-20 right-4 z-50">
          <button
            onClick={fitMapToRoutes}
            className="bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded-lg shadow-lg border border-gray-300 text-sm font-medium transition-colors"
            title="Zoom to fit all routes"
          >
            📍 Fit to Routes
          </button>
        </div>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={depotLocation}
        zoom={11}
        onLoad={(map) => setMapInstance(map)} // Store map instance
        options={{
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {/* Render Google Directions (real road routes) */}
        {directionsResults.map((result, index) => (
          <DirectionsRenderer
            key={`directions-${result.routeId}`}
            directions={result}
            options={{
              suppressMarkers: true, // We'll use our custom markers
              polylineOptions: {
                strokeColor: result.routeColor,
                strokeWeight: 5,
                strokeOpacity: 0.8,
              },
              preserveViewport: true, // Always preserve current viewport - no auto-zoom
            }}
          />
        ))}

        {/* Render delivery markers */}
        {allDeliveries.map((delivery) => {
          const color = deliveryColorMap[delivery.id] || '#808080';
          
          return (
            <Marker
              key={delivery.id}
              position={delivery.location}
              title={`${delivery.name} - ${delivery.address}`}
              onClick={() => onMarkerClick(delivery.id)}
              options={{
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: color,
                  fillOpacity: 0.9,
                  strokeColor: 'white',
                  strokeWeight: 2,
                },
              }}
            />
          );
        })}

        {/* Add numbered sequence markers for each route */}
        {routes.map(route => 
          route.deliveries.map((delivery, index) => (
            <Marker
              key={`sequence-${route.id}-${delivery.id}`}
              position={delivery.location}
              onClick={() => onMarkerClick(delivery.id)}
              options={{
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: highlightedDeliveryId === delivery.id ? 20 : 14,
                  fillColor: 'white',
                  fillOpacity: 1,
                  strokeColor: route.color,
                  strokeWeight: 2,
                },
                label: {
                  text: (index + 1).toString(),
                  color: route.color,
                  fontWeight: 'bold',
                  fontSize: '12px',
                },
                zIndex: highlightedDeliveryId === delivery.id ? 1001 : 1000,
              }}
            />
          ))
        )}

        {/* Add depot marker */}
        <Marker
          position={depotLocation}
          title={depotLocation.name}
          options={{
            icon: {
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 12,
              fillColor: '#000000',
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 2,
            },
            zIndex: 2000,
          }}
        />
      </GoogleMap>
    </div>
  );
};

export default MapView;