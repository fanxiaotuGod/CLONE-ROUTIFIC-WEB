import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { getOptimizedRoutes } from '../services/routificApi';
import type { RoutificInput, RoutificSolution, Stop } from '../services/routificApi';
import { exportRoutesToCsv } from '../utils/exportCsv';

// Re-defining interfaces here to make the hook self-contained.
// In a larger app, these might live in a central types file.
export interface Delivery {
  id: string;
  name: string;
  address: string;
  email: string;
  location: {
    lat: number;
    lng: number;
  };
  status: string;
  eta: string;
  photoUrl?: string;
  notes?: string;
  duration?: number;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone_number?: string | null;
  cognito_sub?: string | null;
  created_at: string;
  updated_at: string;
  start_location?: {
    lat: number;
    lng: number;
    name: string;
  };
}

export interface Route {
  id: string;
  driverId: string | null;
  driverName: string;
  deliveries: Delivery[];
  color: string;
  color_dimmed?: string;
  totalStops?: number;
  totalDistance?: string;
  totalDuration?: string;
}

// Helper to calculate duration from HH:MM time strings
const timeToMinutes = (timeStr: string): number => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to create summaries for routes
const enrichAndSummarizeRoutes = (
  routesToEnrich: Omit<Route, 'totalStops' | 'totalDistance' | 'totalDuration'>[],
  apiSolution: RoutificSolution | null
): Route[] => {
  return routesToEnrich.map(route => {
    let totalDuration = 0;
    const vehicleSolution = apiSolution && route.driverId ? (apiSolution.solution as any)[route.driverId] : undefined;

    if (vehicleSolution && vehicleSolution.length > 1) {
      const startTime = timeToMinutes(vehicleSolution[0].arrival_time);
      const lastStop = vehicleSolution[vehicleSolution.length - 1];
      const endTime = timeToMinutes(lastStop.finish_time || lastStop.arrival_time);
      totalDuration = endTime - startTime;
    }

    const formatDuration = (minutes: number): string => {
      if (minutes === 0) return '0m';
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      let durationStr = '';
      if (h > 0) durationStr += `${h}h `;
      if (m > 0) durationStr += `${m}m`;
      return durationStr.trim();
    };

    return {
      ...route,
      totalStops: route.deliveries.length,
      totalDistance: undefined, // Real distance is not available per-route from API
      totalDuration: apiSolution ? formatDuration(totalDuration) : '-',
    };
  });
};


export const useRoutes = () => {
  const [baseRoutes, setBaseRoutes] = useState<Omit<Route, 'totalStops' | 'totalDistance' | 'totalDuration'>[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [routesGenerated, setRoutesGenerated] = useState(false);
  const [isTimelineVisible, setIsTimelineVisible] = useState(false);
  const [apiSolution, setApiSolution] = useState<RoutificSolution | null>(null);
  const [depotLocation, setDepotLocation] = useState({ lat: 49.2827, lng: -123.1207, name: "Main Depot" });

  const MOCK_DRIVERS: Driver[] = [
    { id: 'driver-1', name: 'John Doe', email: 'john.doe@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), start_location: { name: "Depot", lat: 49.2827, lng: -123.1207 } },
    { id: 'driver-2', name: 'Jane Smith', email: 'jane.smith@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), start_location: { name: "Depot", lat: 49.2827, lng: -123.1207 } },
  ];

  const MOCK_DELIVERIES: Delivery[] = [
      { id: 'del-1', name: 'Customer A', address: '100 Main St, Vancouver, BC', email: 'a@test.com', location: { lat: 49.2820, lng: -123.1200 }, status: 'Pending', eta: 'N/A', duration: 10 },
      { id: 'del-2', name: 'Customer B', address: '200 Granville St, Vancouver, BC', email: 'b@test.com', location: { lat: 49.2850, lng: -123.1110 }, status: 'Pending', eta: 'N/A', duration: 10 },
      { id: 'del-3', name: 'Customer C', address: '300 Robson St, Vancouver, BC', email: 'c@test.com', location: { lat: 49.2795, lng: -123.1254 }, status: 'Pending', eta: 'N/A', duration: 10 },
  ];

  const fetchAndSetInitialData = useCallback(() => {
    setIsLoading(true);
    const fetchedDrivers = MOCK_DRIVERS;
    const transformedDeliveries = MOCK_DELIVERIES;

    setDrivers(fetchedDrivers);

    const initialRoutes: Omit<Route, 'totalStops' | 'totalDistance' | 'totalDuration'>[] = [];
    initialRoutes.push({
      id: 'unassigned-deliveries-route',
      driverId: null,
      driverName: 'Unassigned Deliveries',
      color: '#808080',
      color_dimmed: '#C0C0C0',
      deliveries: transformedDeliveries,
    });

    fetchedDrivers.forEach(driver => {
      const randomColor = () => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
      initialRoutes.push({
          id: `route-for-driver-${driver.id}`,
          driverId: driver.id,
          driverName: driver.name,
          color: randomColor(),
          deliveries: [],
      });
    });

    setBaseRoutes(initialRoutes);
    setIsLoading(false);
    setInitialDataLoaded(true);
  }, []);

  useEffect(() => {
    if (!initialDataLoaded) {
      fetchAndSetInitialData();
    }
  }, [initialDataLoaded, fetchAndSetInitialData]);

  const handleAddDriver = useCallback((driverFormData: { name: string; email: string; }) => {
    const newDriver: Driver = {
      ...driverFormData,
      id: `driver-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      start_location: { name: depotLocation.name, lat: depotLocation.lat, lng: depotLocation.lng },
    };

    setDrivers(prev => [...prev, newDriver]);

    const randomColor = () => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    const newRoute: Omit<Route, 'totalStops' | 'totalDistance' | 'totalDuration'> = {
      id: `route-for-driver-${newDriver.id}`,
      driverId: newDriver.id,
      driverName: newDriver.name,
      color: randomColor(),
      deliveries: [],
    };

    setBaseRoutes(prev => [...prev, newRoute]);
    toast.success(`Driver "${newDriver.name}" added successfully!`);
    setRoutesGenerated(false);
  }, [depotLocation]);

  const handleUploadDeliveries = useCallback((file: File) => {
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const parsedData = results.data as { Name?: string; Address?: string; Email?: string, lat?:string, lng?:string }[];
            const newDeliveries: Delivery[] = [];
            let parseErrors = 0;

            parsedData.forEach((item, index) => {
                const name = item.Name?.trim();
                const address = item.Address?.trim();
                const email = item.Email?.trim();
                const lat = parseFloat(item.lat || '');
                const lng = parseFloat(item.lng || '');

                if (name && address && email && !isNaN(lat) && !isNaN(lng)) {
                    newDeliveries.push({
                        id: `csv-del-${Date.now()}-${index}`,
                        name,
                        address,
                        email,
                        location: { lat, lng },
                        status: 'Pending',
                        eta: 'N/A',
                        duration: 10
                    });
                } else {
                    parseErrors++;
                }
            });

            if (newDeliveries.length > 0) {
                setBaseRoutes(prevRoutes => {
                    const unassignedRouteIndex = prevRoutes.findIndex(r => r.id === 'unassigned-deliveries-route');
                    const updatedRoutes = [...prevRoutes];
                    if (unassignedRouteIndex !== -1) {
                        const unassignedRoute = updatedRoutes[unassignedRouteIndex];
                        unassignedRoute.deliveries = [...unassignedRoute.deliveries, ...newDeliveries];
                    }
                    return updatedRoutes;
                });
                toast.success(`${newDeliveries.length} deliveries imported successfully!`);
                setRoutesGenerated(false);
            }
            
            if (parseErrors > 0) {
                toast.error(`${parseErrors} rows in the CSV had missing or invalid data and were skipped.`);
            }
        },
        error: (error: any) => {
            toast.error('Error parsing CSV file. Please check its format.');
        }
    });
  }, []);

  const handleDragEndStops = useCallback((result: any) => {
    const { source, destination, draggableId } = result;
    // Do nothing if dropped outside a list, or if it's not a reorder in the same list
    if (!destination || source.droppableId !== destination.droppableId) return;

    const routeId = destination.droppableId;
    setBaseRoutes(prevRoutes => {
      const routeIndex = prevRoutes.findIndex(r => r.id === routeId);
      if (routeIndex === -1) return prevRoutes;

      const newRoutes = [...prevRoutes];
      const routeToUpdate = { ...newRoutes[routeIndex] };
      const newDeliveries = [...routeToUpdate.deliveries];
      
      const movedDelivery = newDeliveries.find(d => d.id === draggableId);
      if (!movedDelivery) return prevRoutes; // Should not happen

      // Reorder the array
      newDeliveries.splice(source.index, 1);
      newDeliveries.splice(destination.index, 0, movedDelivery);
      
      routeToUpdate.deliveries = newDeliveries;
      newRoutes[routeIndex] = routeToUpdate;
      return newRoutes;
    });
    setRoutesGenerated(false);
  }, []);

  const resetOptimizationState = useCallback(() => {
    setRoutesGenerated(false);
    setApiSolution(null);
  }, []);

  const handleGenerateRoutes = async () => {
    toast.info('Generating optimized routes...');
    setIsLoading(true);

    const allDeliveries = baseRoutes.flatMap(r => r.deliveries);

    if (allDeliveries.length === 0) {
      toast.warning('No deliveries to route.');
      setIsLoading(false);
      return;
    }

    if (drivers.length === 0) {
      toast.warning('No drivers available to assign routes.');
      setIsLoading(false);
      return;
    }

    const routificInput: RoutificInput = {
      visits: {},
      fleet: {},
      options: {
        traffic: 'normal'
      }
    };

    allDeliveries.forEach(delivery => {
      routificInput.visits[delivery.id] = {
        location: {
          name: delivery.address,
          lat: delivery.location.lat,
          lng: delivery.location.lng,
        },
        duration: delivery.duration || 5,
      };
    });

    drivers.forEach(driver => {
      const start_location = driver.start_location || depotLocation;
      routificInput.fleet[driver.id] = {
        start_location: {
          name: start_location.name,
          lat: start_location.lat,
          lng: start_location.lng,
        },
        shift_start: '08:00',
        shift_end: '17:00'
      };
    });

    try {
      const solutionData: RoutificSolution = await getOptimizedRoutes(routificInput);
      
      if (!solutionData || !solutionData.solution) {
        toast.error("Failed to generate routes: Invalid response from API.");
        throw new Error("API response did not contain a valid solution.");
      }
      
      const solution = solutionData.solution;
      const deliveryMap = new Map(allDeliveries.map((d: Delivery) => [d.id, d]));

      // Create a fresh map of drivers to their colors to persist them across re-generations
      const driverColorMap = new Map(baseRoutes.map(r => [r.driverId, r.color]));

      const newRoutes: Omit<Route, 'totalStops' | 'totalDistance' | 'totalDuration'>[] = drivers.map(driver => {
        const vehicleSolution = (solution as any)[driver.id];
        const newDeliveries = vehicleSolution ? vehicleSolution
          .filter((stop: Stop) => !stop.location_id.endsWith('_start'))
          .map((stop: Stop): Delivery | null => {
            const originalDelivery = deliveryMap.get(stop.location_id);
            if (!originalDelivery) return null;
            return { ...originalDelivery, eta: stop.arrival_time, status: 'Scheduled' };
          })
          .filter((d: Delivery | null): d is Delivery => d !== null) : [];
        
        return {
          id: `route-for-driver-${driver.id}`,
          driverId: driver.id,
          driverName: driver.name,
          color: driverColorMap.get(driver.id) || '#CCCCCC',
          deliveries: newDeliveries
        };
      });

      // Find any unassigned deliveries from the solution and add them to the unassigned route
      const assignedDeliveryIds = new Set(Object.values(solution).flatMap(vehicleRoute => (vehicleRoute as Stop[]).map((stop: Stop) => stop.location_id)));
      const unassignedDeliveries = allDeliveries.filter(d => !assignedDeliveryIds.has(d.id));

      const unassignedRoute = baseRoutes.find(r => r.id === 'unassigned-deliveries-route');
      if (unassignedRoute) {
        newRoutes.push({
          ...unassignedRoute,
          deliveries: unassignedDeliveries,
        });
      }
      
      setBaseRoutes(newRoutes);
      setRoutesGenerated(true);
      setApiSolution(solutionData);
      setIsTimelineVisible(true);
      toast.success('Routes generated successfully!');

    } catch (error) {
      console.error("Failed to generate routes:", error);
      toast.error("Failed to generate routes.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const routesWithSummaries = useMemo(() => {
    if (!initialDataLoaded) return [];
    return enrichAndSummarizeRoutes(baseRoutes, apiSolution);
  }, [baseRoutes, initialDataLoaded, apiSolution]);
  
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [highlightedDeliveryId, setHighlightedDeliveryId] = useState<string | null>(null);

  const handleRouteSelect = useCallback((routeId: string) => {
    setSelectedRouteId(currentId => (currentId === routeId ? null : routeId));
  }, []);

  const handleNodeClick = useCallback((deliveryId: string) => {
    setSelectedDeliveryId(deliveryId);
    setHighlightedDeliveryId(deliveryId);
    setTimeout(() => {
      setHighlightedDeliveryId(null);
    }, 1500); // Highlight for 1.5 seconds
  }, []);

  const handleMarkerClick = useCallback((deliveryId: string) => {
    setSelectedDeliveryId(deliveryId);
  }, []);

  const handleDeleteDelivery = useCallback((deliveryId: string) => {
    setBaseRoutes(prevRoutes => {
      const newRoutes = prevRoutes.map(route => {
        const newDeliveries = route.deliveries.filter(d => d.id !== deliveryId);
        return { ...route, deliveries: newDeliveries };
      });
      return newRoutes;
    });
    setRoutesGenerated(false); // An optimization is now needed
    toast.success("Delivery removed. You can now re-generate the routes.");
  }, []);

  const handleDeleteDriver = useCallback((driverId: string) => {
    let deliveriesToReassign: Delivery[] = [];
    
    setBaseRoutes(prevRoutes => {
      const driverRoute = prevRoutes.find(r => r.driverId === driverId);
      if (driverRoute) {
        deliveriesToReassign = driverRoute.deliveries;
      }

      // Filter out the driver's route
      const routesWithoutDriver = prevRoutes.filter(r => r.driverId !== driverId);

      // Add deliveries to the unassigned route
      const unassignedRouteIndex = routesWithoutDriver.findIndex(r => r.id === 'unassigned-deliveries-route');
      if (unassignedRouteIndex !== -1 && deliveriesToReassign.length > 0) {
        routesWithoutDriver[unassignedRouteIndex].deliveries.push(...deliveriesToReassign);
      }
      
      return routesWithoutDriver;
    });

    setDrivers(prevDrivers => prevDrivers.filter(d => d.id !== driverId));
    
    setRoutesGenerated(false); // An optimization is now needed
    toast.success("Driver removed. Deliveries are now unassigned.");
  }, []);

  const handleDeleteAllDeliveries = useCallback(() => {
    setBaseRoutes(prev => prev.map(r => ({ ...r, deliveries: [] })));
    setRoutesGenerated(false);
    toast.success("All deliveries have been removed.");
  }, []);

  const handleDeleteAllDrivers = useCallback(() => {
    let allDeliveries: Delivery[] = [];
    setBaseRoutes(prev => {
      allDeliveries = prev.flatMap(r => r.deliveries);
      const unassignedRoute = prev.find(r => r.id === 'unassigned-deliveries-route');
      if (unassignedRoute) {
        unassignedRoute.deliveries = allDeliveries;
        return [unassignedRoute];
      }
      return [];
    });
    setDrivers([]);
    setRoutesGenerated(false);
    toast.success("All drivers have been removed and deliveries are now unassigned.");
  }, []);

  const handleExportRoutes = useCallback(() => {
    if (!routesGenerated) {
      toast.warning("Please generate routes before exporting.");
      return;
    }
    exportRoutesToCsv(routesWithSummaries);
    toast.success("Routes exported successfully!");
  }, [routesWithSummaries, routesGenerated]);

  const selectedDeliveryObj = useMemo(() => {
    return routesWithSummaries.flatMap(r => r.deliveries).find(d => d.id === selectedDeliveryId) || null;
  }, [routesWithSummaries, selectedDeliveryId]);

  const allDeliveries = useMemo(() => {
    return routesWithSummaries.flatMap(r => r.deliveries);
  }, [routesWithSummaries]);

  return {
    isLoading,
    initialDataLoaded,
    routes: routesWithSummaries,
    drivers,
    depotLocation,
    routesGenerated,
    isTimelineVisible,
    selectedRouteId,
    selectedDeliveryId,
    highlightedDeliveryId,
    selectedDeliveryObj,
    allDeliveries,
    handleGenerateRoutes,
    handleAddDriver,
    handleUploadDeliveries,
    handleDragEndStops,
    handleRouteSelect,
    handleMarkerClick,
    handleNodeClick,
    setSelectedDeliveryId,
    handleDeleteDelivery,
    handleDeleteDriver,
    handleDeleteAllDeliveries,
    handleDeleteAllDrivers,
    handleExportRoutes,
    resetOptimizationState,
    setDepotLocation,
  };
}; 