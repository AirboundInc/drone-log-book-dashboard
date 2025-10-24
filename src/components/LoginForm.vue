<template>
  <div class="login-container">
    <div class="container">
      <div class="row justify-content-center align-items-center min-vh-100">
        <div class="col-12 col-sm-8 col-md-6 col-lg-4">
          <div class="card shadow-lg">
            <div class="card-body p-4">
              <div class="text-center mb-4">
                <i class="fas fa-helicopter fa-3x text-primary mb-3"></i>
                <h4 class="fw-bold">Drone Log Book</h4>
                <p class="text-muted">Sign in to access your flight data</p>
              </div>

            <form @submit.prevent="handleLogin">
              <div class="mb-3">
                <label for="email" class="form-label">Email</label>
                <input
                  type="email"
                  class="form-control"
                  id="email"
                  v-model="credentials.email"
                  :disabled="loading"
                  required
                  placeholder="your@email.com"
                >
              </div>

              <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <div class="input-group">
                  <input
                    :type="showPassword ? 'text' : 'password'"
                    class="form-control"
                    id="password"
                    v-model="credentials.password"
                    :disabled="loading"
                    required
                    placeholder="Your password"
                  >
                  <button
                    type="button"
                    class="btn btn-outline-secondary"
                    @click="togglePasswordVisibility"
                    :disabled="loading"
                  >
                    <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                  </button>
                </div>
              </div>

              <div class="mb-3" v-if="error">
                <div class="alert alert-danger">
                  <i class="fas fa-exclamation-triangle me-2"></i>
                  {{ error }}
                </div>
              </div>

              <div class="d-grid">
                <button 
                  type="submit" 
                  class="btn btn-primary"
                  :disabled="loading"
                >
                  <span v-if="loading">
                    <i class="fas fa-spinner fa-spin me-2"></i>
                    Signing in...
                  </span>
                  <span v-else>
                    <i class="fas fa-sign-in-alt me-2"></i>
                    Sign In
                  </span>
                </button>
              </div>
            </form>

            <div class="text-center mt-3">
              <small class="text-muted">
                Don't have an account? 
                <a href="https://dronelogbook.com/signup" target="_blank">Sign up here</a>
              </small>
            </div>
            
            <!-- API Connection Test -->
            <div class="text-center mt-3">
              <button 
                type="button" 
                class="btn btn-sm btn-outline-info"
                @click="testConnection"
                :disabled="loading || testingConnection"
              >
                <span v-if="testingConnection">
                  <i class="fas fa-spinner fa-spin me-1"></i>
                  Testing...
                </span>
                <span v-else>
                  <i class="fas fa-wifi me-1"></i>
                  Test API Connection
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useAuth } from '../stores/auth'

export default {
  name: 'LoginForm',
  emits: ['login-success'],
  setup(props, { emit }) {
    const { login } = useAuth()
    
    const credentials = ref({
      email: '',
      password: ''
    })
    
    const loading = ref(false)
    const error = ref('')
    const showPassword = ref(false)
    const testingConnection = ref(false)

    const togglePasswordVisibility = () => {
      showPassword.value = !showPassword.value
    }

    const testConnection = async () => {
      testingConnection.value = true
      error.value = ''
      
      try {
        console.log('🔍 Testing connection to Dronelogbook API...')
        
        // Test the actual login endpoint with a basic request
        const response = await fetch('https://api.dronelogbook.com/auth/login', {
          method: 'OPTIONS', // Use OPTIONS to check if endpoint exists and CORS is configured
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
        
        console.log('API test response:', response.status, response.statusText)
        
        if (response.status === 200 || response.status === 405) {
          // 405 Method Not Allowed is ok for OPTIONS request
          alert('✅ Dronelogbook API is reachable! You can try logging in.')
        } else {
          alert(`⚠️ API responded with: ${response.status} ${response.statusText}`)
        }
      } catch (err) {
        console.error('❌ Connection test failed:', err)
        
        if (err.name === 'TypeError' && err.message.includes('CORS')) {
          alert('❌ CORS Error: The API does not allow browser requests. This is a server configuration issue.')
        } else if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
          alert('❌ Cannot reach the API server. Please check:\n- Internet connection\n- API server status\n- Firewall settings')
        } else {
          alert(`❌ Connection failed: ${err.message}`)
        }
      } finally {
        testingConnection.value = false
      }
    }

    const handleLogin = async () => {
      if (!credentials.value.email || !credentials.value.password) {
        error.value = 'Please enter both email and password'
        return
      }

      loading.value = true
      error.value = ''

      try {
        console.log('🔐 Attempting login via auth store...')
        console.log('📧 Email:', credentials.value.email)
        
        const result = await login(credentials.value.email, credentials.value.password)
        console.log('✅ Login successful:', result)
        emit('login-success', result)
      } catch (err) {
        console.error('❌ Login failed:', err)
        
        // Provide specific error messages based on the error type
        if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
          error.value = 'Cannot connect to proxy server. Make sure the proxy is running on port 3000.'
        } else if (err.message.includes('401') || err.message.includes('Invalid')) {
          error.value = 'Invalid email or password. Please check your credentials.'
        } else if (err.message.includes('429')) {
          error.value = 'Too many login attempts. Please wait a moment and try again.'
        } else if (err.message.includes('500')) {
          error.value = 'Server error. The proxy or Dronelogbook service might be temporarily unavailable.'
        } else {
          error.value = err.message || 'Login failed. Please check your credentials and try again.'
        }
      } finally {
        loading.value = false
      }
    }

    return {
      credentials,
      loading,
      error,
      showPassword,
      testingConnection,
      handleLogin,
      togglePasswordVisibility,
      testConnection
    }
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.container {
  width: 100%;
  max-width: 1200px;
}

.min-vh-100 {
  min-height: 100vh !important;
}

.card {
  border: none;
  border-radius: 15px;
  max-width: 450px;
  margin: 0 auto;
}

.shadow-lg {
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.175) !important;
}

.card-body {
  padding: 2.5rem !important;
}

h4 {
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
}

.fw-bold {
  font-weight: 700 !important;
}

.text-center {
  text-align: center !important;
}

.justify-content-center {
  justify-content: center !important;
}

.align-items-center {
  align-items: center !important;
}

.form-control {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  font-size: 1rem;
}

.form-control:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
}

.input-group {
  display: flex;
  position: relative;
}

.input-group .form-control {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.input-group .btn {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-left: 0;
}

.input-group .btn-outline-secondary {
  color: #6c757d;
  border-color: #dee2e6;
  background-color: #f8f9fa;
}

.input-group .btn-outline-secondary:hover {
  background-color: #e9ecef;
  border-color: #dee2e6;
  color: #495057;
}

.form-label {
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #495057;
}

.btn {
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  border-radius: 8px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-size: 1rem;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-outline-secondary {
  color: #6c757d;
  border-color: #6c757d;
}

.btn-outline-secondary:hover {
  background-color: #6c757d;
  border-color: #6c757d;
  color: #fff;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.alert-danger {
  color: #721c24;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}

.bg-light {
  background-color: #f8f9fa !important;
}

.rounded {
  border-radius: 8px !important;
}

.text-muted {
  color: #6c757d !important;
}

.mb-3 {
  margin-bottom: 1rem !important;
}

.mb-4 {
  margin-bottom: 1.5rem !important;
}

.me-2 {
  margin-right: 0.5rem !important;
}

.ms-2 {
  margin-left: 0.5rem !important;
}

.mt-3 {
  margin-top: 1rem !important;
}

.mt-4 {
  margin-top: 1.5rem !important;
}

.p-3 {
  padding: 1rem !important;
}

.p-4 {
  padding: 1.5rem !important;
}

.d-grid {
  display: grid !important;
}

.fa-3x {
  font-size: 3em;
}

.fa-spin {
  animation: fa-spin 2s infinite linear;
}

@keyframes fa-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Responsive adjustments */
@media (max-width: 576px) {
  .card-body {
    padding: 1.5rem !important;
  }
  
  .card {
    margin: 1rem;
  }
}
</style>