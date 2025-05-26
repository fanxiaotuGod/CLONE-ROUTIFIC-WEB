import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import MapView from './components/MapView'
import DeliveryForm, { type DeliveryFormData } from './components/DeliveryForm'
import Layout from './components/Layout'
import HorizontalRouteBar from './components/HorizontalRouteBar'
import TopBar from './components/TopBar'
import DeliveryDetailsPopup from './components/DeliveryDetailsPopup'
import FinalizeModal from './components/FinalizeModal'
import AddDriverForm from './components/AddDriverForm'
import ConfirmationModal from './components/ConfirmationModal'
import { exportRoutesToCsv } from './utils/exportCsv'
import Papa from 'papaparse'
import { Toaster, toast } from 'sonner'
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

// Add Driver interface
interface Driver {
  id: string;
  name: string;
  email: string;
  phone_number?: string | null;
  cognito_sub?: string | null;
  created_at: string;
  updated_at: string;
}

interface Route {
  id: string
  driverId: string | null; // Can be null for unassigned. Use driverId instead of name for consistency.
  driverName: string;    // Keep driverName for display purposes.
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

interface ConfirmationModalStateProps {
  title: string;
  message: string | React.ReactNode;
  onConfirm: () => void;
  confirmButtonText?: string;
  isDestructive?: boolean;
}

function App() {
  const [baseRoutes, setBaseRoutes] = useState<Omit<Route, 'totalStops' | 'totalDistance' | 'totalDuration'>[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]); // New state for drivers
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // For loading indicator
  const [errorLoading, setErrorLoading] = useState<string | null>(null); // For error message
  const [isDeliveryFormOpen, setIsDeliveryFormOpen] = useState(false); // State for DeliveryForm visibility

  // New state for ConfirmationModal
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationModalProps, setConfirmationModalProps] = useState<ConfirmationModalStateProps | null>(null);

  const fetchAndSetInitialData = useCallback(async (isInitialLoad = false) => {
    if (!isInitialLoad) setIsLoading(true);
    setErrorLoading(null);
    try {
      console.log("[App] Fetching initial data (deliveries and drivers)...");
      const [deliveriesResponse, driversResponse] = await Promise.all([
        fetch('http://localhost:3001/api/deliveries'),
        fetch('http://localhost:3001/api/drivers')
      ]);

      if (!deliveriesResponse.ok) throw new Error(`HTTP error fetching deliveries! status: ${deliveriesResponse.status}`);
      if (!driversResponse.ok) throw new Error(`HTTP error fetching drivers! status: ${driversResponse.status}`);

      const backendDeliveries = await deliveriesResponse.json() as BackendDelivery[];
      const fetchedDrivers = await driversResponse.json() as Driver[];
      
      console.log("[App] Fetched Deliveries:", JSON.stringify(backendDeliveries, null, 2));
      console.log("[App] Fetched Drivers:", JSON.stringify(fetchedDrivers, null, 2));
      setDrivers(fetchedDrivers);

      const transformedDeliveries: Delivery[] = backendDeliveries.map(bd => ({
        ...bd,
        location: { lat: parseFloat(bd.lat), lng: parseFloat(bd.lng) },
        photoUrl: bd.photoUrl || undefined,
        notes: bd.notes || undefined,
      }));

      const initialRoutes: Omit<Route, 'totalStops' | 'totalDistance' | 'totalDuration'>[] = [];
      
      // Always create the Unassigned Deliveries route
      // It will hold all deliveries that are not yet assigned to a specific driver's route.
      // Initially, this means ALL fetched deliveries.
      initialRoutes.push({
        id: 'unassigned-deliveries-route',
        driverId: null,
        driverName: 'Unassigned Deliveries',
        color: '#808080', // Grey for unassigned
        color_dimmed: '#C0C0C0',
        deliveries: transformedDeliveries.sort((a,b) => (a.name > b.name ? 1 : -1)), 
      });

      // Create empty routes for each fetched driver
      fetchedDrivers.forEach(driver => {
        const randomColor = () => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
        const driverColor = randomColor();
        initialRoutes.push({
            id: `route-for-driver-${driver.id}`,
            driverId: driver.id,
            driverName: driver.name,
            color: driverColor,
            color_dimmed: `${driverColor}AA`,
            deliveries: [], // Driver routes start empty
        });
      });

      setBaseRoutes(initialRoutes);
      console.log("[App] baseRoutes and drivers set. Unassigned contains all initial deliveries. Driver routes are empty.");
      // toast.success('Initial data loaded successfully!'); // Optional: if you want a toast on initial load

    } catch (error) {
      console.error("[App] Error fetching initial data:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setErrorLoading("Failed to load initial application data. Please try again later.");
      toast.error(`Failed to load initial data: ${errorMessage}`);
      setBaseRoutes([{
        id: 'unassigned-deliveries-route',
        driverId: null,
        driverName: 'Unassigned Deliveries',
        color: '#808080',
        color_dimmed: '#C0C0C0',
        deliveries: [],
      }]);
      setDrivers([]);
    } finally {
      setIsLoading(false);
      if (isInitialLoad) setInitialDataLoaded(true);
      console.log("[App] Initial data loading attempt complete.");
    }
  }, []);

  useEffect(() => {
    if (!initialDataLoaded) {
      fetchAndSetInitialData(true);
    }
  }, [initialDataLoaded, fetchAndSetInitialData]);

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
          driverId: null,
          driverName: 'Unassigned Deliveries',
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
    console.log("[App] Creating new delivery with simplified form data:", formData);
    try {
      // The payload for the backend now only contains name, address, and email.
      // The backend will handle geocoding and setting default status.
      const response = await fetch('http://localhost:3001/api/deliveries/with-geocode', { // New endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData), // Send { name, address, email }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create delivery or geocode address' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const createdBackendDelivery = await response.json() as BackendDelivery; // Expect full BackendDelivery object
      
      // Transform backend delivery (which includes lat/lng as strings) to frontend Delivery format
      const newDelivery: Delivery = {
        ...createdBackendDelivery,
        location: { 
          lat: parseFloat(createdBackendDelivery.lat), 
          lng: parseFloat(createdBackendDelivery.lng) 
        },
        photoUrl: createdBackendDelivery.photoUrl || undefined,
        notes: createdBackendDelivery.notes || undefined,
        status: createdBackendDelivery.status || 'Pending', // Ensure status is set
      };

      addDeliveriesToRoutes([newDelivery]);
      setIsDeliveryFormOpen(false);
      setRoutesGenerated(false); 
      setIsTimelineVisible(false);
      toast.success(`Delivery "${newDelivery.name}" created successfully!`);
      window.location.reload(); // Refresh after creating delivery
    } catch (error) {
      console.error("[App] Error creating delivery:", error);
      toast.error(`Failed to create delivery: ${(error as Error).message}`);
    }
  };

  const openConfirmationModal = (props: ConfirmationModalStateProps) => {
    setConfirmationModalProps(props);
    setIsConfirmationModalOpen(true);
  };

  const handleDeleteAllDeliveries = async () => {
    openConfirmationModal({
      title: 'Delete All Deliveries',
      message: 'Are you sure you want to delete ALL deliveries? This action cannot be undone.',
      isDestructive: true,
      confirmButtonText: 'Delete All',
      onConfirm: async () => {
        console.log("[App] Confirmed: Deleting all deliveries...");
        try {
          const response = await fetch('http://localhost:3001/api/deliveries', { method: 'DELETE' });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to delete deliveries' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
          }
          setBaseRoutes(prevRoutes => prevRoutes.map(route => ({ ...route, deliveries: [] })) );
          setSelectedDeliveryId(null);
          setRoutesGenerated(false);
          setIsTimelineVisible(false);
          toast.success('All deliveries have been deleted successfully.');
          window.location.reload(); // Refresh after deleting all deliveries
        } catch (error) {
          console.error("[App] Error deleting all deliveries:", error);
          toast.error(`Failed to delete all deliveries: ${(error as Error).message}`);
        }
      }
    });
  };

  const handleDeleteAllDrivers = async () => {
    openConfirmationModal({
      title: 'Delete All Drivers',
      message: 'Are you sure you want to delete ALL drivers? Their deliveries will be unassigned. This action cannot be undone.',
      isDestructive: true,
      confirmButtonText: 'Delete All',
      onConfirm: async () => {
        console.log("[App] Confirmed: Deleting all drivers...");
        try {
          const response = await fetch('http://localhost:3001/api/drivers', { method: 'DELETE' });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to delete drivers' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
          }

          let allDeliveriesFromDrivers: Delivery[] = [];
          baseRoutes.forEach(route => {
            if (route.driverId !== null) { allDeliveriesFromDrivers = [...allDeliveriesFromDrivers, ...route.deliveries]; }
          });
          setDrivers([]);
          setBaseRoutes(prevRoutes => {
            const unassigned = prevRoutes.find(r => r.id === 'unassigned-deliveries-route') || { id: 'unassigned-deliveries-route', driverId: null, driverName: 'Unassigned Deliveries', color: '#808080', color_dimmed: '#C0C0C0', deliveries: [] };
            unassigned.deliveries = [...unassigned.deliveries, ...allDeliveriesFromDrivers].sort((a,b) => (a.name > b.name ? 1 : -1));
            return [unassigned]; 
          });
          setSelectedRouteId('unassigned-deliveries-route'); 
          setRoutesGenerated(false);
          setIsTimelineVisible(false);
          toast.success('All drivers have been deleted. Deliveries moved to unassigned.');
          window.location.reload(); // Refresh after deleting all drivers
        } catch (error) {
          console.error("[App] Error deleting all drivers:", error);
          toast.error(`Failed to delete all drivers: ${(error as Error).message}`);
        }
      }
    });
  };

  const handleDeleteSingleDelivery = async (deliveryIdToDelete: string, deliveryName?: string) => {
    if (!deliveryIdToDelete) return;
    openConfirmationModal({
      title: 'Delete Delivery',
      message: `Are you sure you want to delete delivery "${deliveryName || deliveryIdToDelete}"? This action cannot be undone.`,
      isDestructive: true,
      confirmButtonText: 'Delete',
      onConfirm: async () => {
        console.log(`[App] Confirmed: Deleting single delivery: ${deliveryIdToDelete}`);
        try {
          const response = await fetch(`http://localhost:3001/api/deliveries/${deliveryIdToDelete}`, { method: 'DELETE' });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to delete delivery' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
          }
          setBaseRoutes(prevRoutes => prevRoutes.map(route => ({ ...route, deliveries: route.deliveries.filter(d => d.id !== deliveryIdToDelete) })) );
          if (selectedDeliveryId === deliveryIdToDelete) setSelectedDeliveryId(null);
          toast.success(`Delivery "${deliveryName || deliveryIdToDelete}" has been deleted successfully.`);
          window.location.reload(); // Refresh after deleting a single delivery
        } catch (error) {
          console.error("[App] Error deleting single delivery:", error);
          toast.error(`Failed to delete delivery "${deliveryName || deliveryIdToDelete}": ${(error as Error).message}`);
        }
      }
    });
  };

  const handleDeleteSingleDriver = async (driverIdToDelete: string, driverName?: string) => {
    if (!driverIdToDelete) return;
    openConfirmationModal({
      title: 'Delete Driver',
      message: `Are you sure you want to delete driver "${driverName || driverIdToDelete}"? Their deliveries will be moved to Unassigned. This action cannot be undone.`,
      isDestructive: true,
      confirmButtonText: 'Delete',
      onConfirm: async () => {
        console.log(`[App] Confirmed: Deleting single driver: ${driverIdToDelete}`);
        try {
          const response = await fetch(`http://localhost:3001/api/drivers/${driverIdToDelete}`, { method: 'DELETE' });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to delete driver' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
          }

          const driverRoute = baseRoutes.find(r => r.driverId === driverIdToDelete);
          const deliveriesToReassign = driverRoute ? driverRoute.deliveries : [];
          setDrivers(prevDrivers => prevDrivers.filter(d => d.id !== driverIdToDelete));
          setBaseRoutes(prevRoutes => {
            const remainingRoutes = prevRoutes.filter(r => r.driverId !== driverIdToDelete);
            let unassignedRoute = remainingRoutes.find(r => r.id === 'unassigned-deliveries-route');
            if (unassignedRoute) {
              unassignedRoute.deliveries = [...unassignedRoute.deliveries, ...deliveriesToReassign].sort((a,b) => (a.name > b.name ? 1 : -1));
            } else {
              // This case should ideally not happen if unassigned-deliveries-route is always present
              // or re-created if it was somehow removed. But as a fallback:
              remainingRoutes.push({ id: 'unassigned-deliveries-route', driverId: null, driverName: 'Unassigned Deliveries', color: '#808080', color_dimmed: '#C0C0C0', deliveries: deliveriesToReassign.sort((a,b) => (a.name > b.name ? 1 : -1))});
            }
            return remainingRoutes;
          });
          if (selectedRouteId === `route-for-driver-${driverIdToDelete}`) setSelectedRouteId(null); 
          setRoutesGenerated(false); 
          setIsTimelineVisible(false); 
          toast.success(`Driver "${driverName || driverIdToDelete}" deleted. Deliveries moved to unassigned.`);
          window.location.reload(); // Refresh after deleting a single driver
        } catch (error) {
          console.error("[App] Error deleting single driver:", error);
          toast.error(`Failed to delete driver "${driverName || driverIdToDelete}": ${(error as Error).message}`);
        }
      }
    });
  };

  const handleShowAllPoints = async () => {
    console.log("[App.tsx] handleShowAllPoints called. Re-fetching initial data...");
    await fetchAndSetInitialData(); // Re-fetch all initial data (deliveries and drivers)
    setSelectedRouteId(null);
    console.log("[App.tsx] selectedRouteId set to null after re-fetch.");
  };

  const handleAddDriver = async (driverFormData: { name: string; email: string; phone_number?: string }) => {
    console.log('Adding driver with data:', driverFormData);
    try {
      // Make actual API call to backend
      const response = await fetch('http://localhost:3001/api/drivers', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(driverFormData) 
      });

      if (!response.ok) { 
        const errorData = await response.json().catch(() => ({ message: 'Failed to add driver or parse error response' })); 
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`); 
      }
      
      const newDriver = await response.json() as Driver; // Get the driver object from backend response
      
      setDrivers(prevDrivers => [...prevDrivers, newDriver]);
      const randomColor = () => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
      const newDriverColor = randomColor();
      const newDriverRoute: Omit<Route, 'totalStops' | 'totalDistance' | 'totalDuration'> = { id: `route-for-driver-${newDriver.id}`, driverId: newDriver.id, driverName: newDriver.name, color: newDriverColor, color_dimmed: `${newDriverColor}AA`, deliveries: [] };
      setBaseRoutes(prev => [...prev, newDriverRoute]);
      setIsAddDriverFormOpen(false);
      setRoutesGenerated(false);
      setIsTimelineVisible(false);
      toast.success(`Driver "${newDriver.name}" added successfully!`);
      window.location.reload(); // Refresh after adding a new driver
    } catch (error) {
      console.error('Error adding driver:', error);
      toast.error(`Failed to add driver: ${(error as Error).message}`);
    }
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
      toast.info("Please generate routes first.");
      return;
    }
    setShowFinalizeModal(true);
    const missing = routesWithSummaries.flatMap(r => r.deliveries).find(d => !d.email || !d.address);
    if (missing) {
        setFinalizeError('All deliveries must have an email and address.');
        toast.info('Cannot finalize: All deliveries must have an email and address.', { duration: 5000 });
    } else {
        setFinalizeError(null);
    }
  };

  const handleConfirmFinalize = () => {
    setShowFinalizeModal(false);
    // TODO: Actual backend call for finalization
    toast.success('Routes finalized and notifications sent! (Simulation)');
  };

  const handleExport = () => {
    exportRoutesToCsv(filteredRoutes)
  }
  
  const effectiveRoutes: Route[] = useMemo(() => {
    return routesWithSummaries;
  }, [routesWithSummaries]);

  const filteredRoutes = useMemo(() => {
    console.log("[App Memo] Recalculating filteredRoutes. effectiveRoutes:", effectiveRoutes);
    return effectiveRoutes.filter(route => {
      if (route.id === 'unassigned-deliveries-route') {
        console.log("[App Memo] Checking 'unassigned-deliveries-route':", route, "Deliveries count:", route.deliveries?.length);
      }
      if (route.id === 'unassigned-deliveries-route' && (!route.deliveries || route.deliveries.length === 0)) {
        console.log("[App Memo] Filtering out empty 'unassigned-deliveries-route'");
        return false;
      }
      return true;
    });
  }, [effectiveRoutes]);

  const deliveryColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    filteredRoutes.forEach(route => {
      route.deliveries.forEach(delivery => {
        map[delivery.id] = route.color;
      });
    });
    return map;
  }, [filteredRoutes]);

  const deliveriesToDisplay = useMemo(() => {
    return filteredRoutes.flatMap(route => route.deliveries);
  }, [filteredRoutes]);

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
      complete: async (results) => {
        console.log("PapaParse raw results:", results); 
        const parsedData = results.data as { Name?: string; Address?: string; Email?: string }[]; // Adjusted type for case-sensitivity
        const itemsToProcess: { name: string; address: string; email: string; tempId: string }[] = [];
        let parseErrors = 0;

        parsedData.forEach((item, index) => {
          // Use correct casing for property access based on CSV headers
          const name = item.Name?.trim();
          const address = item.Address?.trim();
          const email = item.Email?.trim();

          if (name && address && email) {
            // When pushing to itemsToProcess, use lowercase keys as expected by the backend BulkDeliveryItem interface
            itemsToProcess.push({ name, address, email, tempId: `csv-temp-${index}` });
          } else { 
            console.warn(`Skipping CSV row ${index + 1} due to missing Name, Address, or Email (check casing):`, item);
            parseErrors++; 
          }
        });

        if (itemsToProcess.length === 0) {
          if (parseErrors > 0) {
            toast.error(`No valid deliveries to process from CSV. ${parseErrors} rows had missing data.`);
          } else {
            toast.info('CSV file was empty or contained no processable rows.');
          }
          return;
        }

        toast.loading(`Processing ${itemsToProcess.length} deliveries from CSV... This may take a moment.`, { id: 'csv-processing' });

        try {
          const response = await fetch('http://localhost:3001/api/deliveries/bulk-geocode-and-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemsToProcess),
          });

          const responseData = await response.json(); // responseData will contain { message, success, errors }

          // Log the full response data from backend for better debugging regardless of status code
          console.log("[App] Backend response from /bulk-geocode-and-create:", responseData);

          if (!response.ok && response.status !== 207) { // 207 is Multi-Status (partial success)
             // Even if all items failed (status 400), log detailed errors if available
            if (responseData.errors && responseData.errors.length > 0) {
              const errorMessages = responseData.errors.map((err: { item: any, error: string }) => `Failed for item "${err.item.name || JSON.stringify(err.item)}": ${err.error}`).join('\n');
              console.error("CSV Processing Errors from Backend (all items failed scenario):\n", errorMessages);
            }
            throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
          }
          
          const { success: createdBackendDeliveries, errors: backendErrors } = responseData as { success: BackendDelivery[], errors: { item: any, error: string }[] };

          const newDeliveries: Delivery[] = [];
          if (createdBackendDeliveries && createdBackendDeliveries.length > 0) {
            createdBackendDeliveries.forEach(bd => {
              newDeliveries.push({
                ...bd,
                location: { lat: parseFloat(bd.lat), lng: parseFloat(bd.lng) },
                photoUrl: bd.photoUrl || undefined,
                notes: bd.notes || undefined,
                status: bd.status || 'Pending',
              });
            });
            addDeliveriesToRoutes(newDeliveries);
            setRoutesGenerated(false); 
            setIsTimelineVisible(false);
          }

          if (backendErrors && backendErrors.length > 0) {
            const errorMessages = backendErrors.map(err => `Failed for "${err.item.name || 'Unknown'}": ${err.error}`).join('\n');
            console.error("CSV Processing Errors from Backend (partial failure scenario):\n", errorMessages);
            toast.error(
              <div>
                <p>{`Some deliveries failed processing (${backendErrors.length} of ${itemsToProcess.length + parseErrors}).`}</p>
                {parseErrors > 0 && <p>{`${parseErrors} rows skipped due to missing data pre-upload.`}</p>}
                <p className="mt-2 text-xs">Details in console.</p>
              </div>,
              { id: 'csv-processing', duration: 10000 }
            );
          } else if (newDeliveries.length > 0) {
            toast.success(`${newDeliveries.length} deliveries imported and geocoded successfully!` + (parseErrors > 0 ? ` ${parseErrors} CSV rows skipped pre-upload.` : ''), { id: 'csv-processing' });
          } else if (parseErrors > 0 && newDeliveries.length === 0 && (!backendErrors || backendErrors.length === 0)){
            toast.info(`${parseErrors} CSV rows skipped due to missing data. No deliveries were processed.`, { id: 'csv-processing' });
          } else if (itemsToProcess.length > 0 && newDeliveries.length === 0 && backendErrors && backendErrors.length === itemsToProcess.length) {
            // This case is covered by the initial throw for 400 if all items failed, but good to have as a distinct toast if we didn't throw
            toast.error('All deliveries failed processing. Check console for details.', { id: 'csv-processing' });
          } else if (itemsToProcess.length > 0 && newDeliveries.length === 0 && (!backendErrors || backendErrors.length === 0)){
            // This can happen if backend returns 200/201 with empty success and empty errors (should not happen with current backend logic)
            toast.error('No deliveries were successfully imported, and no specific errors were reported by the backend. Check backend logs.', { id: 'csv-processing' });
          }
          window.location.reload(); // Refresh after CSV upload processing is complete
        } catch (error) {
          console.error('Error uploading/processing CSV deliveries:', error); // This is the line you saw: App.tsx:706
          // The toast here will now show the message from the `throw new Error(...)` above if it was a backend-originated message
          toast.error(`Error processing CSV: ${(error as Error).message}`, { id: 'csv-processing' });
          window.location.reload(); // Also refresh on error during CSV processing
        }
      },
      error: (error: any) => { 
        console.error('CSV Parsing Error:', error);
        toast.error('Error parsing CSV file. Please check its format.'); 
        window.location.reload(); // Refresh on CSV parsing error
      }
    });
  };

  const handleGenerateRoutes = () => {
    const allUnassignedDeliveries = baseRoutes.find(r => r.id === 'unassigned-deliveries-route')?.deliveries || [];
    const actualDriverRoutes = baseRoutes.filter(r => r.driverId !== null);
    if (actualDriverRoutes.length === 0 && allUnassignedDeliveries.length > 0) {
        toast.info("Please add at least one driver before generating routes.");
        return;
    }
    if (allUnassignedDeliveries.length === 0){
        toast.info("No unassigned deliveries to distribute. Please upload or add deliveries."); return;
    }
    const numDrivers = actualDriverRoutes.length;
    const updatedRoutes = baseRoutes.map(route => {
        if (route.driverId === null) { return { ...route, deliveries: [] }; }
        const driverIndex = actualDriverRoutes.findIndex(dr => dr.id === route.id);
        if (driverIndex === -1) return route;
        const assignedDeliveries = allUnassignedDeliveries.filter((_, deliveryIndex) => deliveryIndex % numDrivers === driverIndex);
        return { ...route, deliveries: assignedDeliveries };
    });
    setBaseRoutes(updatedRoutes);
    setRoutesGenerated(true);
    setIsTimelineVisible(true);
    toast.success('Routes generated successfully!');
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
    onDeleteAllDeliveries: handleDeleteAllDeliveries,
    onDeleteAllDrivers: handleDeleteAllDrivers,
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
      <Toaster position="top-right" richColors closeButton theme={darkMode ? 'dark' : 'light'} />
      <div className="absolute inset-0 w-full h-full z-0">
        <MapView
          // deliveries={deliveriesToDisplay} // Removed: MapView fetches its own data
          // selectedDeliveryId={selectedDeliveryId} // Removed: MapView manages its own selection or doesn't need it
          onMarkerClick={handleMarkerClick} // Keep if MapView still uses this for callback
          deliveryColorMap={deliveryColorMap} // Keep if MapView still uses this for colors
        />
      </div>

      {selectedDeliveryObj && (
        <DeliveryDetailsPopup
          delivery={selectedDeliveryObj}
          onClose={() => setSelectedDeliveryId(null)}
          onDeleteDelivery={() => handleDeleteSingleDelivery(selectedDeliveryObj.id, selectedDeliveryObj.name)}
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
              onDeleteDriver={handleDeleteSingleDriver}
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

      {isConfirmationModalOpen && confirmationModalProps && (
        <ConfirmationModal
          isOpen={isConfirmationModalOpen}
          onClose={() => setIsConfirmationModalOpen(false)}
          title={confirmationModalProps.title}
          message={confirmationModalProps.message}
          onConfirm={confirmationModalProps.onConfirm}
          confirmButtonText={confirmationModalProps.confirmButtonText}
          isDestructive={confirmationModalProps.isDestructive}
        />
      )}
    </Layout>
  )
}

export default App 