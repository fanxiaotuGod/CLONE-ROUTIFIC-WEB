interface Delivery {
  id: string
  name: string
  address: string
  email: string
  location: {
    lat: number
    lng: number
  }
}

interface Route {
  id: string
  driver: string
  deliveries: Delivery[]
  color: string
}

interface OptimizationResult {
  routes: Route[]
  totalDistance: number
  totalDuration: number
}

const COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEEAD',
  '#D4A5A5',
  '#9B59B6',
  '#3498DB',
  '#E67E22',
  '#2ECC71'
]

export const optimizeRoutes = async (
  deliveries: Delivery[],
  numDrivers: number
): Promise<OptimizationResult> => {
  try {
    const response = await fetch('http://localhost:5000/optimize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deliveries,
        numDrivers,
      }),
    })

    if (!response.ok) {
      throw new Error('Optimization request failed')
    }

    const result = await response.json()

    // Transform the result into our route format
    const routes: Route[] = result.routes.map((route: any, index: number) => ({
      id: `route-${index + 1}`,
      driver: `Driver ${index + 1}`,
      deliveries: route.deliveries,
      color: COLORS[index % COLORS.length],
    }))

    return {
      routes,
      totalDistance: result.totalDistance,
      totalDuration: result.totalDuration,
    }
  } catch (error) {
    console.error('Route optimization failed:', error)
    throw error
  }
}

export const recalculateRoute = async (
  route: Route,
  deliveries: Delivery[]
): Promise<Route> => {
  try {
    const response = await fetch('http://localhost:5000/recalculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route,
        deliveries,
      }),
    })

    if (!response.ok) {
      throw new Error('Route recalculation failed')
    }

    const result = await response.json()
    return {
      ...route,
      deliveries: result.deliveries,
    }
  } catch (error) {
    console.error('Route recalculation failed:', error)
    throw error
  }
} 