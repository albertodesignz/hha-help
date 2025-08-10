// Supabase configuration
const supabaseUrl = 'https://gqivebwnxivqzzdsyrlm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaXZlYndueGl2cXp6ZHN5cmxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODk3NDAsImV4cCI6MjA2MDY2NTc0MH0.hxvSDFeETYrcroul1FalpDQRQrRJ3yVk0en20IXgUI4'
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey)

// DOM elements
const authTabs = document.querySelectorAll('.auth-tab')
const authForms = document.querySelectorAll('.auth-form')
const loginForm = document.getElementById('loginForm')
const registerForm = document.getElementById('registerForm')
const googleAuth = document.getElementById('googleAuth')
const facebookAuth = document.getElementById('facebookAuth')
const errorMessage = document.getElementById('errorMessage')
const successMessage = document.getElementById('successMessage')

// Tabs
authTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab
    authTabs.forEach(t => t.classList.remove('active'))
    authForms.forEach(f => f.classList.remove('active'))
    tab.classList.add('active')
    document.getElementById(tabName + 'Form').classList.add('active')
    hideMessages()
  })
})

function showError(message) {
  errorMessage.textContent = message
  errorMessage.style.display = 'block'
  successMessage.style.display = 'none'
}

function showSuccess(message) {
  successMessage.textContent = message
  successMessage.style.display = 'block'
  errorMessage.style.display = 'none'
}

function hideMessages() {
  errorMessage.style.display = 'none'
  successMessage.style.display = 'none'
}

function setLoading(button, isLoading) {
  if (isLoading) { button.disabled = true; button.style.opacity = '0.6' }
  else { button.disabled = false; button.style.opacity = '1' }
}

// Check if already logged in
async function checkAuth() {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) window.location.href = 'index.html'
}

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  hideMessages()
  const email = document.getElementById('loginEmail').value
  const password = document.getElementById('loginPassword').value
  const submitBtn = e.target.querySelector('button[type="submit"]')
  setLoading(submitBtn, true)
  try {
    if (email === 'test@example.com' && password === 'password123') {
      showSuccess('Test account login successful! Redirecting...')
      localStorage.setItem('healthAideTestUser', JSON.stringify({ email: 'test@example.com', name: 'Test User', isTestAccount: true }))
      setTimeout(() => { window.location.href = 'index.html' }, 1500)
      return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    showSuccess('Login successful! Redirecting...')
    setTimeout(() => { window.location.href = 'index.html' }, 1500)
  } catch (error) {
    showError(error.message)
  } finally {
    setLoading(submitBtn, false)
  }
})

// Register
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  hideMessages()
  const name = document.getElementById('registerName').value
  const email = document.getElementById('registerEmail').value
  const password = document.getElementById('registerPassword').value
  const confirmPassword = document.getElementById('confirmPassword').value
  const submitBtn = e.target.querySelector('button[type="submit"]')
  if (password !== confirmPassword) { showError('Passwords do not match'); return }
  setLoading(submitBtn, true)
  try {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    if (error) throw error
    showSuccess('Account created successfully! Please check your email to verify your account.')
  } catch (error) {
    showError(error.message)
  } finally {
    setLoading(submitBtn, false)
  }
})

// OAuth
googleAuth.addEventListener('click', async () => {
  setLoading(googleAuth, true)
  try {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/index.html' } })
    if (error) throw error
  } catch (error) {
    showError('Google authentication failed: ' + error.message)
    setLoading(googleAuth, false)
  }
})

facebookAuth.addEventListener('click', async () => {
  setLoading(facebookAuth, true)
  try {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'facebook', options: { redirectTo: window.location.origin + '/index.html' } })
    if (error) throw error
  } catch (error) {
    showError('Facebook authentication failed: ' + error.message)
    setLoading(facebookAuth, false)
  }
})

// Reset password
document.querySelector('.forgot-link').addEventListener('click', async (e) => {
  e.preventDefault()
  const email = document.getElementById('loginEmail').value
  if (!email) { showError('Please enter your email address first'); return }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login.html' })
    if (error) throw error
    showSuccess('Password reset email sent! Check your inbox.')
  } catch (error) {
    showError('Password reset failed: ' + error.message)
  }
})

// Initialize
checkAuth()

