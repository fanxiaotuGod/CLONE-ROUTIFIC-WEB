from flask import Flask, request, jsonify
from flask_cors import CORS
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
import numpy as np
import pandas as pd
from typing import List, Dict, Any
import json

app = Flask(__name__)
CORS(app)

def create_distance_matrix(locations: List[Dict[str, float]]) -> List[List[int]]:
    """Create a distance matrix for the given locations."""
    size = len(locations)
    matrix = [[0] * size for _ in range(size)]
    
    for i in range(size):
        for j in range(size):
            if i != j:
                # Calculate Euclidean distance (you might want to use actual road distances)
                lat1, lng1 = locations[i]['lat'], locations[i]['lng']
                lat2, lng2 = locations[j]['lat'], locations[j]['lng']
                distance = int(np.sqrt((lat2 - lat1)**2 + (lng2 - lng1)**2) * 100000)
                matrix[i][j] = distance
    
    return matrix

def solve_vrp(
    distance_matrix: List[List[int]],
    num_vehicles: int,
    depot: int = 0
) -> Dict[str, Any]:
    """Solve the Vehicle Routing Problem."""
    manager = pywrapcp.RoutingIndexManager(
        len(distance_matrix), num_vehicles, depot
    )
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Add Distance constraint
    dimension_name = 'Distance'
    routing.AddDimension(
        transit_callback_index,
        0,  # no slack
        300000,  # vehicle maximum travel distance
        True,  # start cumul to zero
        dimension_name
    )
    distance_dimension = routing.GetDimensionOrDie(dimension_name)
    distance_dimension.SetGlobalSpanCostCoefficient(100)

    # Setting first solution heuristic
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.FromSeconds(30)

    # Solve the problem
    solution = routing.SolveWithParameters(search_parameters)

    if not solution:
        return None

    # Process the solution
    routes = []
    total_distance = 0

    for vehicle_id in range(num_vehicles):
        index = routing.Start(vehicle_id)
        route = []
        route_distance = 0

        while not routing.IsEnd(index):
            node_index = manager.IndexToNode(index)
            route.append(node_index)
            previous_index = index
            index = solution.Value(routing.NextVar(index))
            route_distance += routing.GetArcCostForVehicle(
                previous_index, index, vehicle_id
            )

        if route:
            routes.append({
                'vehicle_id': vehicle_id,
                'route': route,
                'distance': route_distance
            })
            total_distance += route_distance

    return {
        'routes': routes,
        'total_distance': total_distance
    }

@app.route('/optimize', methods=['POST'])
def optimize():
    data = request.json
    deliveries = data['deliveries']
    num_drivers = data['numDrivers']

    # Create distance matrix
    locations = [{'lat': d['location']['lat'], 'lng': d['location']['lng']} for d in deliveries]
    distance_matrix = create_distance_matrix(locations)

    # Solve VRP
    solution = solve_vrp(distance_matrix, num_drivers)
    if not solution:
        return jsonify({'error': 'No solution found'}), 400

    # Format response
    routes = []
    for route in solution['routes']:
        route_deliveries = [deliveries[i] for i in route['route']]
        routes.append({
            'deliveries': route_deliveries,
            'distance': route['distance']
        })

    return jsonify({
        'routes': routes,
        'totalDistance': solution['total_distance']
    })

@app.route('/recalculate', methods=['POST'])
def recalculate():
    data = request.json
    route = data['route']
    deliveries = data['deliveries']

    # Create distance matrix for the route
    locations = [{'lat': d['location']['lat'], 'lng': d['location']['lng']} for d in deliveries]
    distance_matrix = create_distance_matrix(locations)

    # Solve TSP (single vehicle)
    solution = solve_vrp(distance_matrix, 1)
    if not solution:
        return jsonify({'error': 'No solution found'}), 400

    # Format response
    route_deliveries = [deliveries[i] for i in solution['routes'][0]['route']]
    return jsonify({
        'deliveries': route_deliveries,
        'distance': solution['routes'][0]['distance']
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 