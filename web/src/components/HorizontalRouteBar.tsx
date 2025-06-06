import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ClockIcon, MapPinIcon, ArrowsRightLeftIcon, ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Route, Delivery } from '../hooks/useRoutes';

interface HorizontalRouteBarProps {
  routes: Route[];
  selectedRouteId?: string | null;
  onRouteSelect?: (routeId: string) => void;
  onNodeClick?: (deliveryId: string) => void;
  onDragEnd: (result: any) => void;
  onExport: () => void;
  onDeleteDriver?: (driverId: string, driverName: string) => void;
}

const HorizontalRouteBar: React.FC<HorizontalRouteBarProps> = ({ 
  routes, 
  selectedRouteId, 
  onRouteSelect, 
  onNodeClick, 
  onDragEnd, 
  onExport,
  onDeleteDriver
}) => {
  const leftPanelWidth = "w-96"; // Kept from previous change: 24rem / 384px
  const statsFixedWidth = "w-56"; // Increased from w-36 to w-56 (14rem / 224px)

  const handleDeleteDriverClick = (e: React.MouseEvent, driverId: string | null, driverName: string) => {
    e.stopPropagation(); // Prevent onRouteSelect from firing
    if (driverId && onDeleteDriver) {
      onDeleteDriver(driverId, driverName);
    }
  };

  return (
    <div className="w-full h-full bg-transparent p-2 flex flex-col overflow-auto select-none">
      {/* Header for Timeline Labels */}
      <div className={`flex items-stretch text-xs text-gray-500 mb-2 px-2 pt-1 pb-1.5 border-b border-gray-200 dark:border-slate-700 min-w-[700px]`}>
        <div className={`${leftPanelWidth} font-medium text-gray-700 dark:text-slate-200 flex items-center justify-between pr-1`}>
          Routes
          <button 
            onClick={onExport} 
            className="btn btn-xs btn-secondary flex items-center ml-2 p-1"
            title="Export Routes"
          >
            <ArrowDownTrayIcon className="h-3.5 w-3.5 mr-0.5" /> Export
          </button>
        </div>
        <div className="w-px bg-gray-200 dark:bg-slate-600 mx-2"></div>
        <div className="flex-1 flex justify-around items-center dark:text-slate-400">
          <span>10:00</span>
          <span>12:00</span>
          <span>14:00</span>
          <span>16:00</span>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="space-y-1.5 min-w-[700px] pb-2 flex-grow">
          {routes.map((route) => (
            <Droppable droppableId={route.id} direction="horizontal" key={route.id}>
              {(providedDrop) => (
                <div
                  ref={providedDrop.innerRef}
                  {...providedDrop.droppableProps}
                  className={`flex flex-row items-stretch p-1.5 rounded-lg transition-all shadow-sm hover:shadow-md dark:hover:shadow-slate-600 ${selectedRouteId === route.id ? 'bg-primary-50/80 dark:bg-primary-500/30 ring-1 ring-primary-400 dark:ring-primary-600' : 'bg-white/80 dark:bg-slate-700/70 hover:bg-gray-50/80 dark:hover:bg-slate-600/70'}`}
                  style={{ minHeight: 52 }}
                  onClick={() => onRouteSelect?.(route.id)}
                >
                  {/* Left Panel: Driver Info + Stats */}
                  <div className={`${leftPanelWidth} flex items-center flex-shrink-0 pr-2`}>
                    <div 
                      className={`relative flex items-center justify-center font-semibold text-xs text-white mr-2 h-7 px-2.5 rounded-md shadow-sm flex-shrink-0`}
                      style={{ backgroundColor: route.color }}
                      title={route.driverId ? `Driver: ${route.driverName}` : 'Unassigned Deliveries'}
                    >
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap pr-1">{route.driverName}</span> 
                      {route.driverId && onDeleteDriver && (
                        <button 
                          onClick={(e) => handleDeleteDriverClick(e, route.driverId, route.driverName)}
                          className="absolute -top-1 -right-1 p-0.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md opacity-80 hover:opacity-100 transition-opacity duration-150"
                          title={`Delete driver ${route.driverName}`}
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    
                    <div className={`flex items-center text-xs text-gray-600 dark:text-slate-300 ${statsFixedWidth} gap-x-1.5 justify-start ml-auto`}>
                      <div className="flex items-center flex-shrink min-w-0" title="Number of stops">
                        <MapPinIcon className="h-3.5 w-3.5 mr-0.5 text-gray-400 dark:text-slate-500"/> 
                        <span className="">{route.totalStops !== undefined ? route.totalStops : '-'}</span>
                      </div>
                      {route.totalDistance && (
                        <div className="flex items-center flex-shrink min-w-0" title="Total distance">
                          <ArrowsRightLeftIcon className="h-3.5 w-3.5 mr-0.5 text-gray-400 dark:text-slate-500"/>
                          <span className="">{route.totalDistance || '-'}</span>
                        </div>
                      )}
                      <div className="flex items-center flex-shrink min-w-0" title="Total duration">
                        <ClockIcon className="h-3.5 w-3.5 mr-0.5 text-gray-400 dark:text-slate-500"/>
                        <span className="">{route.totalDuration || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vertical Separator in Route Row */}
                  <div className="w-px bg-gray-200 dark:bg-slate-600 mx-2 self-stretch"></div>

                  {/* Right Panel: Delivery Nodes */}
                  <div className="flex-1 flex items-center space-x-1.5 py-1 pr-1 overflow-x-auto">
                    {route.deliveries.map((delivery, idx) => (
                      <Draggable draggableId={delivery.id} index={idx} key={delivery.id}>
                        {(providedDrag, snapshot) => (
                          <div
                            ref={providedDrag.innerRef}
                            {...providedDrag.draggableProps}
                            {...providedDrag.dragHandleProps}
                            className={`w-4 h-4 rounded-full cursor-grab flex-shrink-0 border ${snapshot.isDragging ? 'ring-2 ring-offset-1' : ''} dark:border-slate-500`}
                            onClick={(e) => {
                              e.stopPropagation(); 
                              onNodeClick?.(delivery.id);
                            }}
                            style={{
                              backgroundColor: route.color,
                              borderColor: snapshot.isDragging ? route.color : (route.color_dimmed || route.color)
                            }}
                            title={`${delivery.name} - ${delivery.address}${delivery.eta ? ' (ETA: ' + delivery.eta + ')' : ''}`}
                          />
                        )}
                      </Draggable>
                    ))}
                    {providedDrop.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
          {routes.length === 0 && (
             <div className="text-center text-gray-500 dark:text-slate-400 py-10 h-full flex items-center justify-center">No routes to display. Add drivers and upload deliveries first.</div>
          )}
        </div>
      </DragDropContext>
    </div>
  );
};

export default HorizontalRouteBar; 