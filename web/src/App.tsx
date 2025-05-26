import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import MapView from './components/MapView'
import DeliveryForm from './components/DeliveryForm'
import Layout from './components/Layout'
import HorizontalRouteBar from './components/HorizontalRouteBar'
import TopBar from './components/TopBar'
import DeliveryDetailsPopup from './components/DeliveryDetailsPopup'
import { exportRoutesToCsv } from './utils/exportCsv'
import FinalizeModal from './components/FinalizeModal'
import AddDriverForm from './components/AddDriverForm'
import Papa from 'papaparse'
// import { OnDragEndResponder } from 'react-beautiful-dnd'; // Temporarily remove to use any

interface Delivery {
  id: string
  name: string
  address: string
  email: string
  location: {
    lat: number
    lng: number
  }
  status: string
  eta: string
  photoUrl?: string
  notes?: string
}

// Backend Delivery type - database returns lat/lng as strings
interface BackendDelivery extends Omit<Delivery, 'location'> {
  lat: string; // From database DECIMAL
  lng: string; // From database DECIMAL
}

interface Route {
  id: string
  driver: string
  deliveries: Delivery[]
  color: string
  color_dimmed?: string
  totalStops?: number
  totalDistance?: string
  totalDuration?: string
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  let durationStr = '';
  if (h > 0) durationStr += `${h}h `;
  if (m > 0 || h === 0) durationStr += `${m}m`; // Show 0m if no hours
  return durationStr.trim();
}

const enrichRoutesWithSummaries = (routesToEnrich: Omit<Route, 'totalStops' | 'totalDistance' | 'totalDuration'>[]): Route[] => {
  return routesToEnrich.map(route => {
    const totalStops = route.deliveries.length;
    
    const baseDistanceKm = 5; 
    const distancePerStopKm = 3.5;
    const totalDistance = baseDistanceKm + totalStops * distancePerStopKm;

    const baseDurationMinutes = 20; 
    const serviceTimePerStopMinutes = 10;
    const travelTimeBetweenStopsMinutes = 5;
    const totalDurationMinutes = baseDurationMinutes + 
                                 (totalStops * serviceTimePerStopMinutes) + 
                                 (totalStops > 0 ? (totalStops -1) * travelTimeBetweenStopsMinutes : 0);

    return {
      ...route,
      totalStops,
      totalDistance: `${totalDistance.toFixed(1)}km`,
      totalDuration: formatDuration(totalDurationMinutes),
    };
  });
};

// Data structure expected from DeliveryForm
export interface DeliveryFormData {
  name: string;
  address: string;
  email: string;
  location: { // Assuming form provides location object
    lat: number;
    lng: number;
  };
  status?: string; // Optional, backend defaults to Pending
  eta?: string;    // Optional
  notes?: string;  // Optional
  photoUrl?: string; // Optional
}

function App() {
  const [baseRoutes, setBaseRoutes] = useState<Omit<Route, 'totalStops' | 'totalDistance' | 'totalDuration'>[]>([]);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // For loading indicator
  const [errorLoading, setErrorLoading] = useState<string | null>(null); // For error message
  const [isDeliveryFormOpen, setIsDeliveryFormOpen] = useState(false); // State for DeliveryForm visibility

  const fetchAndSetDeliveries = useCallback(async (isInitialLoad = false) => {
    if (!isInitialLoad) setIsLoading(true); // Show loading indicator for explicit re-fetches
    setErrorLoading(null);
    try {
      console.log("[App Effect] Attempting to load deliveries from backend...");
      const response = await fetch('http://localhost:3001/api/deliveries');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const backendDeliveries = await response.json() as BackendDelivery[];
      console.log("[App Effect] Fetched deliveries from backend:", JSON.stringify(backendDeliveries, null, 2)); // Log the fetched data

      const transformedDeliveries: Delivery[] = backendDeliveries.map(bd => ({
        ...bd,
        location: {
          lat: parseFloat(bd.lat),
          lng: parseFloat(bd.lng),
        },
        photoUrl: bd.photoUrl || undefined,
        notes: bd.notes || undefined,
      })); 

      if (transformedDeliveries.length > 0) {
        setBaseRoutes([
          {
            id: 'unassigned-deliveries-route',
            driver: 'Unassigned Deliveries',
            color: '#808080',
            color_dimmed: '#C0C0C0',
            deliveries: transformedDeliveries.sort((a, b) => (a.name > b.name ? 1 : -1)),
          },
          // Add other routes here if needed, or they can be added by handleAddDriver
        ]);
      } else {
         setBaseRoutes([
          {
            id: 'unassigned-deliveries-route',
            driver: 'Unassigned Deliveries',
            color: '#808080',
            color_dimmed: '#C0C0C0',
            deliveries: [],
          },
        ]);
      }
      console.log("[App Effect] baseRoutes set from backend data.");
    } catch (error) {
      console.error("[App Effect] Error fetching deliveries:", error);
      setErrorLoading("Failed to load delivery data. Please try again later.");
      setBaseRoutes([
          {
            id: 'unassigned-deliveries-route',
            driver: 'Unassigned Deliveries',
            color: '#808080',
            color_dimmed: '#C0C0C0',
            deliveries: [],
          },
        ]);
    } finally {
      setIsLoading(false);
      if (isInitialLoad) setInitialDataLoaded(true);
      console.log("[App Effect] Data loading attempt (backend) complete.");
    }
  }, []); // Empty dependency array for useCallback, as it defines the function but doesn't run it directly.

  useEffect(() => {
    if (!initialDataLoaded) {
      fetchAndSetDeliveries(true); // Pass true for initial load
    }
  }, [initialDataLoaded, fetchAndSetDeliveries]);

  const routesWithSummaries = useMemo(() => {
    if (!initialDataLoaded) return [];
    console.log("[App Memo] Calculating routesWithSummaries. baseRoutes:", baseRoutes);
    return enrichRoutesWithSummaries(baseRoutes);
  }, [baseRoutes, initialDataLoaded]);
  
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [darkMode, setDarkMode] = useState(false)
  const [showFinalizeModal, setShowFinalizeModal] = useState(false)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)

  const [isAddDriverFormOpen, setIsAddDriverFormOpen] = useState(false)

  // State for resizable HorizontalRouteBar
  const [horizontalBarHeight, setHorizontalBarHeight] = useState(320);
  const isResizingRef = useRef(false);
  const minBarHeight = 120;
  const maxBarHeight = typeof window !== 'undefined' ? window.innerHeight * 0.75 : 600;

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
  }, []);

  const stopResizing = useCallback(() => {
    isResizingRef.current = false;
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizingRef.current) {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= minBarHeight && newHeight <= maxBarHeight) {
        setHorizontalBarHeight(newHeight);
      }
    }
  }, [minBarHeight, maxBarHeight]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const [routesGenerated, setRoutesGenerated] = useState(false);
  const [isTimelineVisible, setIsTimelineVisible] = useState(false);

  useEffect(() => {
    setFinalizeError(null);
    // Do not reset routesGenerated or isTimelineVisible solely based on baseRoutes or selectedDate changing
    // as baseRoutes will change on load from localStorage. These should be reset by specific actions.
    // setRoutesGenerated(false); 
    // setIsTimelineVisible(false);
  }, [selectedDate]); // Only depends on selectedDate for this reset now, or could be more specific

  // Reset generation state if routes are fundamentally altered (e.g. by CSV import or new driver)
  // This is a more targeted reset than the previous broad one.
  // useEffect(() => {
  //   setRoutesGenerated(false);
  //   setIsTimelineVisible(false);
  // }, [baseRoutes.length]); // REMOVE THIS EFFECT

  const addDeliveriesToRoutes = (newDeliveries: Delivery[]) => {
    if (newDeliveries.length === 0) return;
    setBaseRoutes(prevRoutes => {
      // Ensure there is always at least an unassigned route to add to
      let routesToUpdate = [...prevRoutes];
      if (routesToUpdate.length === 0) {
        routesToUpdate.push({
          id: 'unassigned-deliveries-route',
          driver: 'Unassigned Deliveries',
          color: '#808080',
          color_dimmed: '#C0C0C0',
          deliveries: [],
        });
      }

      const targetRouteId = selectedRouteId && routesToUpdate.find(r => r.id === selectedRouteId) 
                            ? selectedRouteId 
                            : routesToUpdate[0].id; // Default to first route (usually unassigned)

      const routeIndex = routesToUpdate.findIndex(r => r.id === targetRouteId);
      
      if (routeIndex !== -1) {
        routesToUpdate[routeIndex] = {
          ...routesToUpdate[routeIndex],
          deliveries: [...routesToUpdate[routeIndex].deliveries, ...newDeliveries].sort((a,b) => (a.name > b.name ? 1 : -1)),
        };
        return routesToUpdate;
      } else {
        // This case should ideally not be hit if we ensure a default route exists
        console.warn("Could not find route to add deliveries to, adding to first existing or new unassigned route");
        routesToUpdate[0] = {
            ...routesToUpdate[0],
            deliveries: [...routesToUpdate[0].deliveries, ...newDeliveries].sort((a,b) => (a.name > b.name ? 1 : -1)),
          };
        return routesToUpdate;
      }
    });
  };

  const handleCreateDelivery = async (formData: DeliveryFormData) => {
    console.log("[App] Creating new delivery with form data:", formData);
    try {
      const payload = {
        ...formData,
        lat: formData.location.lat,
        lng: formData.location.lng,
        status: formData.status || 'Pending' // Default status if not provided
      };
      // Remove nested location object from payload sent to backend
      delete (payload as any).location; 

      const response = await fetch('http://localhost:3001/api/deliveries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const createdBackendDelivery = await response.json() as BackendDelivery;
      console.log("[App] Successfully created delivery via backend:", createdBackendDelivery);

      // Transform backend delivery to frontend Delivery format
      const newDelivery: Delivery = {
        ...createdBackendDelivery,
        location: {
          lat: parseFloat(createdBackendDelivery.lat),
          lng: parseFloat(createdBackendDelivery.lng),
        },
        photoUrl: createdBackendDelivery.photoUrl || undefined,
        notes: createdBackendDelivery.notes || undefined,
      };

      addDeliveriesToRoutes([newDelivery]);
      setIsDeliveryFormOpen(false); // Close the form on successful creation
      setRoutesGenerated(false); // New delivery might require re-generation of routes
      setIsTimelineVisible(false);
      // Consider re-fetching all deliveries after creating one to ensure data consistency
      // await fetchAndSetDeliveries(); // Or just rely on local state update if backend returns the full new object correctly

    } catch (error) {
      console.error("[App] Error creating delivery:", error);
      alert(`Failed to create delivery: ${(error as Error).message}`); // Show error to user
      // Optionally, do not close the form or handle error state in the form itself
    }
  };

  const handleShowAllPoints = async () => {
    console.log("[App.tsx] handleShowAllPoints called. Re-fetching deliveries...");
    await fetchAndSetDeliveries(); // Re-fetch data
    setSelectedRouteId(null);
    console.log("[App.tsx] selectedRouteId set to null after re-fetch.");
  };

  const handleAddDriver = (driverData: { name: string; email: string }) => {
    console.log('Adding driver:', driverData);
    const newRouteId = `route-driver-${Date.now()}`;
    const randomColor = () => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    const newDriverColor = randomColor();
    const newDriverRoute: Omit<Route, 'totalStops' | 'totalDistance' | 'totalDuration'> = {
      id: newRouteId,
      driver: driverData.name,
      color: newDriverColor,
      color_dimmed: `${newDriverColor}AA`,
      deliveries: [],
    };
    setBaseRoutes(prev => [...prev, newDriverRoute]);
    setIsAddDriverFormOpen(false);
    setRoutesGenerated(false);
    setIsTimelineVisible(false);
  };

  const handleRouteSelect = (routeId: string) => {
    setSelectedRouteId(routeId === selectedRouteId ? null : routeId)
  }

  const handleMarkerClick = (deliveryId: string) => {
    setSelectedDeliveryId(deliveryId)
  }

  const handleDragEndStops = (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId !== destination.droppableId) return; 

    const routeId = destination.droppableId;
    setBaseRoutes(prevRoutes => {
      const routeIndex = prevRoutes.findIndex(r => r.id === routeId);
      if (routeIndex === -1) return prevRoutes;

      const newRoutes = [...prevRoutes];
      const routeToUpdate = { ...newRoutes[routeIndex] };
      const newDeliveries = [...routeToUpdate.deliveries];
      
      const movedDelivery = newDeliveries.find(d => d.id === draggableId);
      if (!movedDelivery) return prevRoutes;

      newDeliveries.splice(source.index, 1);
      newDeliveries.splice(destination.index, 0, movedDelivery);
      
      routeToUpdate.deliveries = newDeliveries;
      newRoutes[routeIndex] = routeToUpdate;
      return newRoutes;
    });
  };

  const handleFinalizeClick = () => {
    if (!routesGenerated) {
      alert("Please generate routes first.");
      return;
    }
    setShowFinalizeModal(true)
    const missing = routesWithSummaries.flatMap(r => r.deliveries).find(d => !d.email || !d.address)
    if (missing) setFinalizeError('All deliveries must have an email and address.');
    else setFinalizeError(null);
  }
  const handleConfirmFinalize = () => {
    setShowFinalizeModal(false)
    alert('Routes finalized and emails sent!')
  }
  const handleExport = () => {
    exportRoutesToCsv(filteredRoutes)
  }
  
  const effectiveRoutes: Route[] = useMemo(() => {
    return routesWithSummaries;
  }, [routesWithSummaries]);

  const filteredRoutes = useMemo(() => {
    return effectiveRoutes;
  }, [effectiveRoutes]);

  const selectedDeliveryObj = useMemo(() => {
    return filteredRoutes.flatMap(r => r.deliveries).find(d => d.id === selectedDeliveryId) || null;
  }, [filteredRoutes, selectedDeliveryId]);

  useEffect(() => {
    if (!selectedDeliveryId) return;
    const handler = (e: MouseEvent) => {
      const popup = document.getElementById('delivery-details-popup');
      if (popup && !popup.contains(e.target as Node)) {
        setSelectedDeliveryId(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectedDeliveryId]);

  const handleUploadDeliveries = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = results.data as { name?: string; address?: string; email?: string }[];
        const newDeliveries: Delivery[] = [];
        let importErrors = 0;

        parsedData.forEach((item, index) => {
          const name = item.name?.trim();
          const address = item.address?.trim();
          const email = item.email?.trim();

          if (name && address && email) {
            newDeliveries.push({
              id: `csv-d${Date.now()}-${index}`,
              name,
              address,
              email,
              location: { lat: 49.2827 + (Math.random() - 0.5) * 0.05, lng: -123.1207 + (Math.random() - 0.5) * 0.05 },
              status: 'Pending',
              eta: 'TBD',
            });
          } else {
            console.warn(`Skipping CSV row ${index + 1} due to missing data:`, item);
            importErrors++;
          }
        });

        console.log('[CSV Load] newDeliveries created:', newDeliveries);

        if (newDeliveries.length > 0) {
          addDeliveriesToRoutes(newDeliveries);
          setRoutesGenerated(false);
          setIsTimelineVisible(false);
          alert(`${newDeliveries.length} deliveries imported.` + (importErrors > 0 ? ` ${importErrors} rows skipped.` : ''));
        } else if (importErrors > 0) {
          alert(`No deliveries imported. ${importErrors} rows had errors.`);
        } else {
          alert('No valid deliveries in CSV or CSV empty.');
        }
      },
      error: (error) => {
        console.error('CSV Error:', error);
        alert('Error parsing CSV. See console.');
      }
    });
  };

  const handleGenerateRoutes = () => {
    let allDeliveries: Delivery[] = [];
    baseRoutes.forEach(route => {
        allDeliveries = [...allDeliveries, ...route.deliveries];
    });
    const routesWithoutDeliveries: Omit<Route, 'totalStops' | 'totalDistance' | 'totalDuration'>[] = baseRoutes.map(r => ({ 
        id: r.id,
        driver: r.driver,
        color: r.color,
        color_dimmed: r.color_dimmed,
        deliveries: [] 
    }));

    if (routesWithoutDeliveries.length === 0 && allDeliveries.length > 0) {
        alert("Please add at least one driver before generating routes.");
        return;
    }
    if (allDeliveries.length === 0){
        alert("No deliveries to assign. Please upload deliveries via CSV.");
        return;
    }

    const numDrivers = routesWithoutDeliveries.length;
    const finalUpdatedRoutes = routesWithoutDeliveries.map((route, driverIndex) => {
        const assignedDeliveries = allDeliveries.filter((_, deliveryIndex) => deliveryIndex % numDrivers === driverIndex);
        return { ...route, deliveries: assignedDeliveries };
    });

    setBaseRoutes(finalUpdatedRoutes);
    setRoutesGenerated(true);
    setIsTimelineVisible(true);
    alert('Routes generated!');
  };

  const topBarProps = {
    selectedDate,
    onDateChange: setSelectedDate,
    onFinalize: handleFinalizeClick,
    onGenerateRoutes: handleGenerateRoutes,
    routesGenerated,
    onAddDriver: () => setIsAddDriverFormOpen(true),
    onAddDeliveryClick: () => setIsDeliveryFormOpen(true), // For TopBar to open DeliveryForm
    onUploadDeliveries: handleUploadDeliveries,
    darkMode,
    onToggleDarkMode: () => setDarkMode(!darkMode),
    onShowAllPointsClick: handleShowAllPoints, // Pass the new handler
  }

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const finalizeModalSummary = useMemo(() => {
    const totalDeliveries = routesWithSummaries.reduce((sum, r) => sum + (r.totalStops || 0), 0);
    return `${routesWithSummaries.length} routes, ${totalDeliveries} deliveries`;
  }, [routesWithSummaries]);

  // This useEffect handles resetting for date changes correctly.
  useEffect(() => {
    if (initialDataLoaded) { 
        console.log('[Effect] selectedDate changed or initial data loaded after date change. Resetting state for date:', selectedDate);
        setFinalizeError(null);
        setRoutesGenerated(false);
        setIsTimelineVisible(false);
    }
  }, [selectedDate, initialDataLoaded]);

  console.log("-----------------------------------------");
  console.log("[App Render] Current state before render:");
  console.log("[App Render] initialDataLoaded:", initialDataLoaded);
  console.log("[App Render] isLoading:", isLoading);
  console.log("[App Render] errorLoading:", errorLoading);
  console.log("[App Render] baseRoutes:", JSON.parse(JSON.stringify(baseRoutes)));
  console.log("[App Render] routesWithSummaries:", JSON.parse(JSON.stringify(routesWithSummaries))); 
  console.log("[App Render] filteredRoutes (passed to MapView):", JSON.parse(JSON.stringify(filteredRoutes)));
  console.log("[App Render] selectedDeliveryId:", selectedDeliveryId);
  console.log("[App Render] selectedDeliveryObj:", selectedDeliveryObj ? JSON.parse(JSON.stringify(selectedDeliveryObj)) : null);
  console.log("-----------------------------------------");

  if (!initialDataLoaded || isLoading) { // Keep showing loading until initialDataLoaded is true AND isLoading is false
    return <div className="flex items-center justify-center h-screen text-xl">Loading delivery data...</div>;
  }

  if (errorLoading) { // Display error message if loading failed
    return <div className="flex items-center justify-center h-screen text-xl text-red-500">{errorLoading}</div>;
  }

  console.log("[App.tsx] Rendering. selectedRouteId:", selectedRouteId);
  console.log("[App Render] initialDataLoaded:", initialDataLoaded);

  return (
    <Layout topBarProps={topBarProps}>
      <div className="absolute inset-0 w-full h-full z-0">
        <MapView
          routes={filteredRoutes}
          selectedRoute={selectedRouteId}
          onMarkerClick={handleMarkerClick}
        />
      </div>

      {selectedDeliveryObj && (
        <DeliveryDetailsPopup
          delivery={selectedDeliveryObj}
          onClose={() => setSelectedDeliveryId(null)}
        />
      )}

      {isTimelineVisible && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-xl overflow-hidden pointer-events-auto"
          style={{ height: `${horizontalBarHeight}px` }}
        >
          <div 
            className="absolute top-0 left-0 right-0 h-2.5 cursor-ns-resize bg-gray-300/50 dark:bg-slate-600/50 hover:bg-gray-400/70 dark:hover:bg-slate-500/70 transition-colors duration-150"
            onMouseDown={startResizing}
            title="Resize Timeline"
          />
          <div className="pt-2.5 h-full">
            <HorizontalRouteBar 
              routes={filteredRoutes}
              selectedRouteId={selectedRouteId}
              onRouteSelect={handleRouteSelect}
              onNodeClick={handleMarkerClick}
              onDragEnd={handleDragEndStops}
              onExport={handleExport}
            />
          </div>
        </div>
      )}

      {showFinalizeModal && (
        <FinalizeModal
          open={showFinalizeModal}
          onClose={() => setShowFinalizeModal(false)}
          onFinalize={handleConfirmFinalize}
          error={finalizeError || undefined}
          summary={finalizeModalSummary}
        />
      )}

      {isAddDriverFormOpen && (
        <AddDriverForm
          isOpen={isAddDriverFormOpen}
          onClose={() => setIsAddDriverFormOpen(false)}
          onSubmit={handleAddDriver}
        />
      )}

      {isDeliveryFormOpen && (
        <DeliveryForm
          isOpen={isDeliveryFormOpen}
          onClose={() => setIsDeliveryFormOpen(false)}
          onSubmit={handleCreateDelivery} 
          // You might need to pass other props like existing delivery data if using for editing
        />
      )}
    </Layout>
  )
}

export default App 