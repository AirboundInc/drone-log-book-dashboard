import { ref, computed } from 'vue'

// Global authentication state
const user = ref(null)
const token = ref(localStorage.getItem('dlb_token'))
const isAuthenticated = computed(() => !!user.value || !!token.value)

// Authentication actions
export const useAuth = () => {
  const login = async (email, password) => {
    try {
      console.log('🔐 Logging in via proxy...')
      
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        user.value = {
          email: email,
          name: email.split('@')[0] || 'User'
        }
        token.value = 'proxy-session-' + Date.now()
        localStorage.setItem('dlb_token', token.value)
        
        console.log('✅ Login successful, user:', user.value)
        console.log('✅ Login successful, token:', token.value)
        console.log('✅ Login successful, isAuthenticated:', !!user.value || !!token.value)
        
        return { 
          access_token: token.value, 
          user: user.value 
        }
      } else {
        throw new Error(result.error || 'Login failed')
      }
    } catch (error) {
      console.error('❌ Login failed:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.warn('Logout API call failed:', error)
    } finally {
      user.value = null
      token.value = null
      localStorage.removeItem('dlb_token')
      console.log('👋 User logged out')
    }
  }

  const checkAuthStatus = async () => {
    if (!token.value) {
      return false
    }

    try {
      // Try to fetch user profile to validate session
      const response = await fetch('/api/profile', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const profileData = await response.json()
        user.value = profileData
        return true
      } else {
        throw new Error('Session validation failed')
      }
    } catch (error) {
      console.warn('Session validation failed:', error)
      await logout()
      return false
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    checkAuthStatus
  }
}