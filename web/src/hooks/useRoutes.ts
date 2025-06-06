import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { getOptimizedRoutes } from '../services/routificApi';
import type { RoutificInput, RoutificSolution, Stop } from '../services/routificApi';
import { exportRoutesToCsv } from '../utils/exportCsv';
import { generateClient, type GraphQLResult } from 'aws-amplify/api';
import * as mutations from '../graphql/mutations';
import * as queries from '../graphql/queries';

// Manually define types since API.ts is not being generated reliably
interface APIDelivery {
  __typename: "Delivery";
  id: string;
  name: string;
  address: string;
  email?: string | null;
  lat: number;
  lng: number;
  status?: string | null;
  duration?: number | null;
  createdAt: string;
  updatedAt: string;
  owner?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
}

interface APIDriver {
  __typename: "Driver";
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  owner?: string | null;
}

// Manually define the shape of the query results
interface ListDeliveriesQuery {
  listDeliveries?: {
    __typename: "ModelDeliveryConnection";
    items: Array<APIDelivery | null>;
    nextToken?: string | null;
  } | null;
}

interface ListDriversQuery {
  listDrivers?: {
    __typename: "ModelDriverConnection";
    items: Array<APIDriver | null>;
    nextToken?: string | null;
  } | null;
}

interface CreateDeliveryMutation {
  createDelivery?: APIDelivery | null;
}

interface CreateDriverMutation {
  createDriver?: APIDriver | null;
}

const client = generateClient();

// Using a type assertion to match the existing Delivery interface
export type Delivery = {
  id: string;
  name: string;
  address: string;
  email?: string | null;
  lat: number;
  lng: number;
  status?: string | null;
  duration?: number | null;
  createdAt: string;
  updatedAt: string;
  owner?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  location: { lat: number; lng: number };
  eta?: string;
};

export type Driver = Omit<APIDriver, "__typename"> & {
  start_location?: { lat: number; lng: number; name: string };
};

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

const timeToMinutes = (timeStr: string): number => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

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
      totalDistance: undefined,
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

  const fetchAndSetInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [driverData, deliveryData] = await Promise.all([
        client.graphql({ query: queries.listDrivers, authMode: 'apiKey' }) as unknown as GraphQLResult<ListDriversQuery>,
        client.graphql({ query: queries.listDeliveries, authMode: 'apiKey' }) as unknown as GraphQLResult<ListDeliveriesQuery>
      ]);

      const fetchedDrivers: Driver[] = (driverData.data?.listDrivers?.items || []).map((d) => ({
        ...(d as APIDriver),
        start_location: { name: depotLocation.name, lat: depotLocation.lat, lng: depotLocation.lng }
      }));
      
      const transformedDeliveries: Delivery[] = (deliveryData.data?.listDeliveries?.items || []).map((d) => ({
        ...(d as APIDelivery),
        location: { lat: d!.lat, lng: d!.lng },
      }));

      console.log('Deliveries fetched from DB:', transformedDeliveries);
      console.log('Raw delivery data from API:', deliveryData.data?.listDeliveries?.items);

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
    } catch (error) {
      console.error('Error fetching initial data:', JSON.stringify(error, null, 2));
      toast.error('Failed to load data from the cloud.');
    } finally {
      setIsLoading(false);
      setInitialDataLoaded(true);
    }
  }, [depotLocation]);

  useEffect(() => {
    if (!initialDataLoaded) {
      fetchAndSetInitialData();
    }
  }, [initialDataLoaded, fetchAndSetInitialData]);

  const handleAddDriver = useCallback(async (driverFormData: { name: string; email: string; }) => {
    const optimisticDriver: Driver = {
      ...driverFormData,
      id: `temp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: 'local',
      start_location: { name: depotLocation.name, lat: depotLocation.lat, lng: depotLocation.lng },
    };
  
    setDrivers(prev => [...prev, optimisticDriver]);
  
    try {
      const result = await client.graphql({
        query: mutations.createDriver,
        variables: { input: driverFormData },
        authMode: 'apiKey'
      }) as unknown as GraphQLResult<CreateDriverMutation>;
      const newDriver = { ...(result.data?.createDriver as APIDriver), start_location: { name: depotLocation.name, lat: depotLocation.lat, lng: depotLocation.lng } } as Driver;

      setDrivers(prev => prev.map((d: Driver) => d.id === optimisticDriver.id ? newDriver : d));
      
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
    } catch (error) {
      console.error('Error creating driver:', error);
      toast.error('Failed to add driver.');
      setDrivers(prev => prev.filter(d => d.id !== optimisticDriver.id));
    }
  }, [depotLocation]);

  const handleUploadDeliveries = useCallback((file: File) => {
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const parsedData = results.data as { Name?: string; Address?: string; Email?: string; lat?:string, lng?:string }[];
            let parseErrors = 0;

            const newDeliveriesPromises = parsedData.map(async (item, index) => {
                console.log(`[handleUploadDeliveries] Processing CSV row ${index}:`, item);
                const name = item.Name?.trim();
                const address = item.Address?.trim();
                const email = item.Email?.trim();
                const lat = parseFloat(item.lat || '');
                const lng = parseFloat(item.lng || '');
                
                console.log(`[handleUploadDeliveries] Parsed values - name: ${name}, address: ${address}, email: ${email}, lat: ${lat}, lng: ${lng}`);

                if (name && address && email && !isNaN(lat) && !isNaN(lng)) {
                    try {
                      const deliveryInput = { name, address, email, lat, lng, duration: 10, status: 'Pending' };
                      console.log(`[handleUploadDeliveries] Sending to database:`, deliveryInput);
                      const result = await client.graphql({
                        query: mutations.createDelivery,
                        variables: { input: deliveryInput },
                        authMode: 'apiKey'
                      }) as unknown as GraphQLResult<CreateDeliveryMutation>;
                      console.log(`[handleUploadDeliveries] Database response:`, result.data?.createDelivery);
                      return { ...(result.data?.createDelivery as APIDelivery), location: { lat, lng } } as Delivery;
                    } catch (error) {
                      console.error('Error creating delivery:', JSON.stringify(error, null, 2));
                      parseErrors++;
                      return null;
                    }
                } else {
                    parseErrors++;
                    return null;
                }
            });
            
            Promise.all(newDeliveriesPromises).then(newDeliveries => {
              const successfulDeliveries = newDeliveries.filter((d: Delivery | null): d is Delivery => d !== null);

              if (successfulDeliveries.length > 0) {
                  setBaseRoutes(prevRoutes => {
                      const unassignedRouteIndex = prevRoutes.findIndex(r => r.id === 'unassigned-deliveries-route');
                      const updatedRoutes = [...prevRoutes];
                      if (unassignedRouteIndex !== -1) {
                          const unassignedRoute = updatedRoutes[unassignedRouteIndex];
                          unassignedRoute.deliveries = [...unassignedRoute.deliveries, ...successfulDeliveries];
                      }
                      return updatedRoutes;
                  });
                  toast.success(`${successfulDeliveries.length} deliveries imported successfully!`);
                  setRoutesGenerated(false);
              }
              
              if (parseErrors > 0) {
                  toast.error(`${parseErrors} rows in the CSV had missing or invalid data and were skipped.`);
              }
            });
        },
        error: (error: any) => {
            toast.error('Error parsing CSV file. Please check its format.');
        }
    });
  }, []);

  const handleDeleteDelivery = useCallback(async (deliveryId: string) => {
    const originalRoutes = [...baseRoutes];
    
    // Optimistic UI update
    const newRoutes = baseRoutes.map(route => ({
      ...route,
      deliveries: route.deliveries.filter(d => d.id !== deliveryId)
    }));
    setBaseRoutes(newRoutes);
    setRoutesGenerated(false);

    try {
      await client.graphql({
        query: mutations.deleteDelivery,
        variables: { input: { id: deliveryId } },
        authMode: 'apiKey'
      });
      toast.success("Delivery removed successfully.");
    } catch (error) {
      console.error("Error deleting delivery:", error);
      toast.error("Failed to delete delivery. Reverting changes.");
      setBaseRoutes(originalRoutes); // Revert on error
    }
  }, [baseRoutes]);

  const handleDeleteDriver = useCallback(async (driverId: string) => {
    const originalRoutes = [...baseRoutes];
    const originalDrivers = [...drivers];
    let deliveriesToReassign: Delivery[] = [];

    const driverRoute = baseRoutes.find(r => r.driverId === driverId);
    if (driverRoute) {
      deliveriesToReassign = driverRoute.deliveries;
    }

    // Optimistic UI Update
    setDrivers(prevDrivers => prevDrivers.filter(d => d.id !== driverId));
    const routesWithoutDriver = baseRoutes.filter(r => r.driverId !== driverId);
    const unassignedRouteIndex = routesWithoutDriver.findIndex(r => r.id === 'unassigned-deliveries-route');
    if (unassignedRouteIndex !== -1 && deliveriesToReassign.length > 0) {
      routesWithoutDriver[unassignedRouteIndex].deliveries.push(...deliveriesToReassign);
    }
    setBaseRoutes(routesWithoutDriver);
    setRoutesGenerated(false);

    try {
      await client.graphql({
        query: mutations.deleteDriver,
        variables: { input: { id: driverId } },
        authMode: 'apiKey'
      });
      toast.success("Driver removed successfully.");
    } catch (error) {
      console.error("Error deleting driver:", error);
      toast.error("Failed to delete driver. Reverting changes.");
      setBaseRoutes(originalRoutes);
      setDrivers(originalDrivers);
    }
  }, [baseRoutes, drivers]);
  
  // handleDeleteAll is more complex now. It needs to iterate and delete one by one.
  // This can be slow, but is the most straightforward implementation.
  const handleDeleteAllDeliveries = useCallback(async () => {
    const allDeliveries = baseRoutes.flatMap(r => r.deliveries);
    if (allDeliveries.length === 0) {
      toast.info("No deliveries to delete.");
      return;
    }
    
    const promise = toast.promise(
      Promise.all(allDeliveries.map(d => client.graphql({ 
        query: mutations.deleteDelivery, 
        variables: { input: { id: d.id } },
        authMode: 'apiKey'
      }))),
      {
        loading: `Deleting ${allDeliveries.length} deliveries...`,
        success: () => {
          setBaseRoutes(prev => prev.map(r => ({ ...r, deliveries: [] })));
          setRoutesGenerated(false);
          return "All deliveries have been removed.";
        },
        error: "Failed to delete all deliveries.",
      }
    );
  }, [baseRoutes]);

  const handleDeleteAllDrivers = useCallback(async () => {
    if (drivers.length === 0) {
      toast.info("No drivers to delete.");
      return;
    }

    const promise = toast.promise(
      Promise.all(drivers.map(d => client.graphql({
        query: mutations.deleteDriver,
        variables: { input: { id: d.id } },
        authMode: 'apiKey'
      }))),
      {
        loading: `Deleting ${drivers.length} drivers...`,
        success: () => {
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
          return "All drivers have been removed.";
        },
        error: "Failed to delete all drivers."
      }
    );
  }, [drivers]);

  const handleFinalizeAndSend = useCallback(async (routesToFinalize: Route[]) => {
    console.log('[handleFinalizeAndSend] Starting finalization process.', { routesToFinalize });
    const toastId = toast.loading('Finalizing routes and sending emails...');
    let emailsSent = 0;
    let emailsSkipped = 0;
    const emailErrors: string[] = [];

    const allDeliveriesInRoutes = routesToFinalize
      .filter(r => r.driverId) // only assigned routes
      .flatMap(r => r.deliveries);

    console.log(`[handleFinalizeAndSend] Found ${allDeliveriesInRoutes.length} deliveries in assigned routes.`);

    if (allDeliveriesInRoutes.length === 0) {
      toast.error('No deliveries in routes to finalize.', { id: toastId });
      return;
    }

    const sendEmailMutation = `
      mutation SendEmail($to: String!, $customerName: String!, $eta: String!, $summary: String!) {
        sendEmail(to: $to, customerName: $customerName, eta: $eta, summary: $summary)
      }
    `;

    for (const delivery of allDeliveriesInRoutes) {

      if (delivery.name === "Haocheng Fan") {
        try {
          const variables = {
            to: "fhc991115@gmail.com",
            customerName: delivery.name,
            eta: delivery.eta || 'Not available',
            summary: delivery.name,
          };
          console.log('[handleFinalizeAndSend] Attempting to send email with variables:', variables);
          const result = await client.graphql({
            query: sendEmailMutation,
            variables,
            authMode: 'apiKey'
          });
          console.log(`[handleFinalizeAndSend] Successfully sent email for delivery ID ${delivery.id}. Result:`, result);
          emailsSent++;
        } catch (error) {
          console.error(`[handleFinalizeAndSend] FAILED to send email for delivery ID ${delivery.id}:`, JSON.stringify(error, null, 2));
          emailErrors.push(delivery.name);
        }
      } else {
        console.log(`[handleFinalizeAndSend] Skipping email for delivery ID ${delivery.id} due to invalid/missing address.`);
        emailsSkipped++;
      }
    }

    if (emailErrors.length > 0) {
      toast.error(`Failed to send emails for: ${emailErrors.join(', ')}. Sent ${emailsSent} emails. Skipped ${emailsSkipped}.`, { id: toastId, duration: 10000 });
    } else {
      toast.success(`Finalization complete! Sent ${emailsSent} emails. Skipped ${emailsSkipped} addresses.`, { id: toastId });
    }

    // Send route data to drivers
    console.log('[handleFinalizeAndSend] Sending route data to drivers...');
    const routesWithDrivers = routesToFinalize.filter(r => r.driverId && r.deliveries.length > 0);
    
    if (routesWithDrivers.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('📱 MOBILE APP ROUTE DATA - Ready to copy/paste');
      console.log('='.repeat(80));
      
      routesWithDrivers.forEach((route, index) => {
        const routeData = {
          driverId: route.driverId,
          driverName: route.driverName,
          deliveries: route.deliveries.map(d => ({
            id: d.id,
            address: d.address,
            customerName: d.name,
            eta: d.eta || 'Not available',
            lat: d.lat,
            lng: d.lng
          }))
        };
        
        console.log(`\n📍 Driver ${index + 1}: ${route.driverName}`);
        console.log(`📦 ${route.deliveries.length} deliveries assigned`);
        console.log('📱 Copy this JSON for mobile app:');
        console.log('─'.repeat(40));
        console.log(JSON.stringify(routeData, null, 2));
        console.log('─'.repeat(40));
        
        // Also create a one-liner for easy copying
        const oneLineJson = JSON.stringify(routeData);
        console.log('📋 One-line version (easier to copy):');
        console.log(oneLineJson);
        console.log('');
      });
      
      console.log('📱 How to use in mobile app:');
      console.log('1. Copy the JSON above');
      console.log('2. Open mobile app');
      console.log('3. Tap "Receive Route from Web App"');
      console.log('4. The app will load the route data');
      console.log('5. Tap navigation to open maps!');
      console.log('='.repeat(80) + '\n');
    } else {
      console.log('❌ No routes with assigned drivers found');
    }
  }, []);

  // handleDragEndStops needs to be removed or adapted, as reordering
  // is not persisted. For now, let's disable it by passing an empty function.
  const handleDragEndStops = useCallback(() => {
    toast.info("Manual reordering is disabled when using a live database.");
  }, []);

  const resetOptimizationState = useCallback(() => {
    setRoutesGenerated(false);
    setApiSolution(null);
  }, []);

  const handleGenerateRoutes = async () => {
    console.log('[handleGenerateRoutes] Inspecting deliveries at start of function:', JSON.parse(JSON.stringify(baseRoutes.flatMap(r => r.deliveries))));
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

      const driverColorMap = new Map(baseRoutes.map(r => [r.driverId, r.color]));

      const newRoutes: Omit<Route, 'totalStops' | 'totalDistance' | 'totalDuration'>[] = drivers.map(driver => {
        const vehicleSolution = (solution as any)[driver.id];
        const newDeliveries = vehicleSolution ? vehicleSolution
          .filter((stop: Stop) => !stop.location_id.endsWith('_start'))
          .map((stop: Stop): Delivery | null => {
            const originalDelivery = deliveryMap.get(stop.location_id);
            if (!originalDelivery) return null;
            const newDelivery: Delivery = {
              id: originalDelivery.id,
              name: originalDelivery.name,
              address: originalDelivery.address,
              email: originalDelivery.email,
              lat: originalDelivery.lat,
              lng: originalDelivery.lng,
              status: 'Scheduled',
              duration: originalDelivery.duration,
              owner: originalDelivery.owner,
              photoUrl: originalDelivery.photoUrl,
              notes: originalDelivery.notes,
              createdAt: originalDelivery.createdAt,
              updatedAt: originalDelivery.updatedAt,
              location: originalDelivery.location,
              eta: stop.arrival_time,
            };
            return newDelivery;
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
    }, 1500);
  }, []);

  const handleMarkerClick = useCallback((deliveryId: string) => {
    setSelectedDeliveryId(deliveryId);
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
    handleFinalizeAndSend,
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