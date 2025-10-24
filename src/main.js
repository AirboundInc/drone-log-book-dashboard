import { createApp } from 'vue'
import router from './router'
import App from './App.vue'

// Import Bootstrap CSS and JS
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

console.log('🚀 Starting Drone Log Book Dashboard...')

try {
  const app = createApp(App)
  app.use(router)
  
  console.log('📱 App configured, mounting to #app...')
  app.mount('#app')
  
  console.log('✅ App mounted successfully!')
} catch (error) {
  console.error('❌ Failed to start app:', error)
}