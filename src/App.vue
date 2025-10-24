<template>
  <div id="app" class="h-100">
    <!-- Show login form if not authenticated -->
    <LoginForm 
      v-if="!isAuthenticated && !isLoading" 
      @login-success="handleLoginSuccess"
    />
    
    <!-- Show loading screen -->
    <div v-else-if="isLoading" class="d-flex justify-content-center align-items-center h-100">
      <div class="text-center">
        <i class="fas fa-spinner fa-spin fa-3x text-primary mb-3"></i>
        <h4>Loading Drone Log Book...</h4>
        <p class="text-muted">Connecting to your flight data...</p>
      </div>
    </div>
    
    <!-- Show main dashboard if authenticated -->
    <div v-else class="h-100">
      <!-- Navigation Bar -->
      <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container-fluid">
          <span class="navbar-brand">
            <i class="fas fa-helicopter me-2"></i>
            Drone Log Book
          </span>
          
          <div class="navbar-nav ms-auto">
            <div class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown">
                <i class="fas fa-user-circle me-1"></i>
                {{ user?.name || user?.email || 'User' }}
              </a>
              <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="#" @click="handleLogout">
                  <i class="fas fa-sign-out-alt me-2"></i>Logout
                </a></li>
              </ul>
            </div>
          </div>
        </div>
      </nav>
      
      <!-- Main Content -->
      <div class="main-content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import LoginForm from './components/LoginForm.vue'
import { useAuth } from './stores/auth'

export default {
  name: 'App',
  components: {
    LoginForm
  },
  setup() {
    const { user, isAuthenticated, logout, checkAuthStatus, token } = useAuth()
    const isLoading = ref(true)

    const handleLoginSuccess = (response) => {
      console.log('🎉 Login successful in App:', response)
      console.log('🔍 Current auth state - user:', user.value)
      console.log('🔍 Current auth state - isAuthenticated:', isAuthenticated.value)
      console.log('🔍 Current auth state - token:', token?.value)
      
      // The auth store is already updated by the login function
      isLoading.value = false
      
      // Force a re-check after a small delay to ensure reactivity
      setTimeout(() => {
        console.log('🔍 After timeout - isAuthenticated:', isAuthenticated.value)
        console.log('🔍 After timeout - user:', user.value)
      }, 100)
    }

    const handleLogout = async () => {
      await logout()
    }

    onMounted(async () => {
      console.log('📱 App mounted, checking auth status...')
      try {
        await checkAuthStatus()
      } catch (error) {
        console.warn('Auth check failed:', error)
      } finally {
        isLoading.value = false
      }
    })

    return {
      user,
      isAuthenticated,
      isLoading,
      handleLoginSuccess,
      handleLogout
    }
  }
}
</script>

<style>
#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f8f9fa;
}

.btn-primary {
  background-color: #007bff;
  border-color: #007bff;
}

.card {
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}
</style>