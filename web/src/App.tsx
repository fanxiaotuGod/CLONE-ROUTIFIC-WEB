// This is a test comment to see if any edits can be applied.
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { withAuthenticator, WithAuthenticatorProps } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import MapView from './components/MapView'
import Layout from './components/Layout'
import HorizontalRouteBar from './components/HorizontalRouteBar'
import TopBar from './components/TopBar'
import DeliveryDetailsPanel from './components/DeliveryDetailsPanel'
import FinalizeModal from './components/FinalizeModal'
import AddDriverForm from './components/AddDriverForm'
import ConfirmationModal from './components/ConfirmationModal'
import { Toaster } from 'sonner'
import { useRoutes, type Route, type Delivery, type Driver } from './hooks/useRoutes';
import SpinnerOverlay from './components/SpinnerOverlay';
import LeftSidebar, { ViewType } from './components/LeftSidebar'
import DriversPage from './components/DriversPage';
import DeliveriesPage from './components/DeliveriesPage';
import SettingsPage from './components/SettingsPage';

function App({ signOut, user }: WithAuthenticatorProps) {
  const {
    isLoading,
    initialDataLoaded,
    routes,
    drivers,
    depotLocation,
    routesGenerated,
    isTimelineVisible,
    selectedRouteId,
    selectedDeliveryObj,
    setSelectedDeliveryId,
    highlightedDeliveryId,
    allDeliveries,
    setDepotLocation,
    handleGenerateRoutes,
    handleAddDriver,
    handleUploadDeliveries,
    handleDragEndStops,
    handleRouteSelect,
    handleMarkerClick,
    handleNodeClick,
    handleDeleteDelivery,
    handleDeleteDriver,
    handleDeleteAllDeliveries,
    handleDeleteAllDrivers,
    handleExportRoutes,
    handleFinalizeAndSend,
  } = useRoutes();

  // UI-only state
  const [activeView, setActiveView] = useState<ViewType>('map');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [darkMode, setDarkMode] = useState(false);
  const [isAddDriverFormOpen, setIsAddDriverFormOpen] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [confirmationModalState, setConfirmationModalState] = useState<ConfirmationModalStateProps | null>(null);

  // State and logic for resizable HorizontalRouteBar
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

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  const handleAddDriverSubmit = (driverData: { name: string; email: string; }) => {
    handleAddDriver(driverData);
    setIsAddDriverFormOpen(false); // Close modal after submission
  };

  const filteredRoutes = useMemo(() => {
    // This logic filters out the "Unassigned" route from the timeline if it's empty
    return routes.filter(route => {
      if (route.id === 'unassigned-deliveries-route' && route.deliveries.length === 0) {
        return false;
      }
      return true;
    });
  }, [routes]);
  
  const deliveryColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    routes.forEach(route => {
      route.deliveries.forEach(delivery => {
        if(route.color) map[delivery.id] = route.color;
      });
    });
    return map;
  }, [routes]);

  const handleDeleteDeliveryClick = (deliveryId: string) => {
    setConfirmationModalState({
      title: 'Delete Delivery',
      message: 'Are you sure you want to delete this delivery? This action cannot be undone.',
      onConfirm: () => {
        handleDeleteDelivery(deliveryId);
        setSelectedDeliveryId(null); // Close the popup
        setConfirmationModalState(null);
      },
      confirmButtonText: 'Delete',
      isDestructive: true,
    });
  };

  const handleDeleteDriverClick = (driverId: string, driverName: string) => {
    setConfirmationModalState({
      title: `Delete Driver ${driverName}?`,
      message: (
        <span>
          Are you sure you want to delete this driver? All assigned deliveries will be moved to the "Unassigned" pool. 
          <br />
          This action cannot be undone.
        </span>
      ),
      onConfirm: () => {
        handleDeleteDriver(driverId);
        setConfirmationModalState(null);
      },
      confirmButtonText: 'Delete Driver',
      isDestructive: true,
    });
  };

  const handleDeleteAllDeliveriesClick = () => {
    setConfirmationModalState({
      title: 'Delete All Deliveries?',
      message: 'Are you sure you want to delete all deliveries from all routes? This action cannot be undone.',
      onConfirm: () => {
        handleDeleteAllDeliveries();
        setConfirmationModalState(null);
      },
      confirmButtonText: 'Delete All',
      isDestructive: true,
    });
  };

  const handleDeleteAllDriversClick = () => {
    setConfirmationModalState({
      title: 'Delete All Drivers?',
      message: 'Are you sure you want to delete all drivers? All deliveries will become unassigned. This action cannot be undone.',
      onConfirm: () => {
        handleDeleteAllDrivers();
        setConfirmationModalState(null);
      },
      confirmButtonText: 'Delete All',
      isDestructive: true,
    });
  };

  interface ConfirmationModalStateProps {
    title: string;
    message: string | React.ReactNode;
    onConfirm: () => void;
    confirmButtonText?: string;
    isDestructive?: boolean;
  }

  const topBarProps = {
    selectedDate,
    onDateChange: setSelectedDate,
    onFinalize: () => setShowFinalizeModal(true),
    onGenerateRoutes: handleGenerateRoutes,
    routesGenerated,
    onAddDriver: () => setIsAddDriverFormOpen(true),
    onUploadDeliveries: handleUploadDeliveries,
    darkMode,
    onToggleDarkMode: () => setDarkMode(!darkMode),
    onDeleteAllDeliveries: handleDeleteAllDeliveriesClick,
    onDeleteAllDrivers: handleDeleteAllDriversClick,
    signOut,
    user,
  };

  if (!initialDataLoaded && isLoading) {
    return <div className="flex items-center justify-center h-screen text-xl">Loading application data...</div>;
  }
  
  return (
    <Layout topBarProps={topBarProps}>
      <LeftSidebar activeView={activeView} setActiveView={setActiveView} />
      <Toaster position="top-right" richColors closeButton theme={darkMode ? 'dark' : 'light'} />
      
      {activeView === 'map' && (
        <>
          <div className="flex-1 w-full h-full relative">
            <MapView 
              routes={filteredRoutes} 
              onMarkerClick={handleMarkerClick}
              deliveryColorMap={deliveryColorMap}
              highlightedDeliveryId={highlightedDeliveryId}
              depotLocation={depotLocation}
            />
            {isLoading && <SpinnerOverlay />}
          </div>

          {isTimelineVisible && (
            <div 
              className="fixed bottom-0 left-20 right-0 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-xl overflow-hidden pointer-events-auto"
              style={{ height: `${horizontalBarHeight}px` }}
            >
              {/* Draggable resizer handle */}
              <div 
                onMouseDown={startResizing}
                className="absolute top-0 left-0 w-full h-1.5 cursor-row-resize flex items-center justify-center group"
              >
                <div className="w-10 h-1 bg-gray-300 dark:bg-slate-600 rounded-full group-hover:bg-primary-500 transition-colors"></div>
              </div>
              <div className="pt-2.5 h-full">
                <HorizontalRouteBar 
                  routes={filteredRoutes} 
                  selectedRouteId={selectedRouteId}
                  onRouteSelect={handleRouteSelect}
                  onNodeClick={handleNodeClick}
                  onDragEnd={handleDragEndStops}
                  onExport={handleExportRoutes}
                  onDeleteDriver={handleDeleteDriverClick}
                />
              </div>
            </div>
          )}

          {selectedDeliveryObj && (
            <DeliveryDetailsPanel
              delivery={selectedDeliveryObj}
              onClose={() => setSelectedDeliveryId(null)}
              onDeleteDelivery={handleDeleteDeliveryClick}
            />
          )}
        </>
      )}

      {activeView === 'drivers' && <DriversPage drivers={drivers} onDeleteDriver={handleDeleteDriverClick} />}
      {activeView === 'deliveries' && <DeliveriesPage deliveries={allDeliveries} onDeleteDelivery={handleDeleteDeliveryClick} />}
      {activeView === 'settings' && <SettingsPage depotLocation={depotLocation} setDepotLocation={setDepotLocation} />}

      {isAddDriverFormOpen && (
        <AddDriverForm
          isOpen={isAddDriverFormOpen}
          onClose={() => setIsAddDriverFormOpen(false)}
          onSubmit={handleAddDriverSubmit}
        />
      )}

      {showFinalizeModal && (
        <FinalizeModal
          open={showFinalizeModal}
          onClose={() => setShowFinalizeModal(false)}
          onFinalize={() => {
            handleFinalizeAndSend(routes);
            setShowFinalizeModal(false);
          }}
          error={undefined}
          summary={`${routes.filter(r => r.driverId).flatMap(r => r.deliveries).length} deliveries across ${routes.filter(r => r.driverId).length} routes.`}
        />
      )}

      {confirmationModalState && (
        <ConfirmationModal
          isOpen={!!confirmationModalState}
          onClose={() => setConfirmationModalState(null)}
          {...confirmationModalState}
        />
      )}
    </Layout>
  );
}

export default withAuthenticator(App); 