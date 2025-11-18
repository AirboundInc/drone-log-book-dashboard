import { createRouter, createWebHistory } from 'vue-router'
import AirboundDashboard from '@/views/AirboundDashboard.vue'
import SimpleDashboard from '@/views/SimpleDashboard.vue'
import Dashboard from '@/views/Dashboard.vue'
import FlightAnalysis from '@/views/FlightAnalysis.vue'
import FlightComparison from '@/views/FlightComparison.vue'
import DroneInventory from '@/components/DroneInventory.vue'
import DroneDetail from '@/components/DroneDetail.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: AirboundDashboard
  },
  {
    path: '/simple',
    name: 'SimpleDashboard',
    component: SimpleDashboard
  },
  {
    path: '/full',
    name: 'FullDashboard',
    component: Dashboard
  },
  {
    path: '/drones',
    name: 'DroneInventory',
    component: DroneInventory
  },
  {
    path: '/drone/:id',
    name: 'DroneDetail',
    component: DroneDetail,
    props: true
  },
  {
    path: '/flight/:id',
    name: 'FlightAnalysis',
    component: FlightAnalysis,
    props: true
  },
  {
    path: '/compare',
    name: 'FlightComparison', 
    component: FlightComparison
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router