// Test account bootstrap
function checkTestAccount() {
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('test') === 'true') {
    localStorage.setItem('healthAideTestUser', JSON.stringify({
      email: 'test@example.com',
      name: 'Test User',
      isTestAccount: true
    }))
  }
}

// Initialize test account flag early
checkTestAccount()

// Supabase configuration
const supabaseUrl = 'https://gqivebwnxivqzzdsyrlm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaXZlYndueGl2cXp6ZHN5cmxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODk3NDAsImV4cCI6MjA2MDY2NTc0MH0.hxvSDFeETYrcroul1FalpDQRQrRJ3yVk0en20IXgUI4'
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey)

// Check authentication status
async function checkAuth() {
  const testUser = JSON.parse(localStorage.getItem('healthAideTestUser'))
  if (testUser?.isTestAccount) return true

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    window.location.href = 'login.html'
    return false
  }

  const userInfo = document.getElementById('userInfo')
  if (userInfo) {
    if (!document.getElementById('testBadge').style.display || document.getElementById('testBadge').style.display === 'none')
      document.getElementById('userName').textContent = `Welcome, ${user.user_metadata?.full_name || user.email}`
  }

  return true
}

// Logout helper
async function logout() {
  await supabase.auth.signOut()
  window.location.href = 'login.html'
}

document.addEventListener('DOMContentLoaded', async function () {
  // Test account UI
  const testUser = JSON.parse(localStorage.getItem('healthAideTestUser'))
  if (testUser) {
    document.getElementById('userName').textContent = `Welcome, ${testUser.name}!`
    document.getElementById('testBadge').style.display = 'inline-block'
  }

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('healthAideTestUser')
    window.location.href = 'login.html'
  })

  // Auth gate
  const isAuthenticated = await checkAuth()
  if (!isAuthenticated) return

  // Tabs
  const tabs = document.querySelectorAll('.tab')
  const tabContents = document.querySelectorAll('.tab-content')
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'))
      tabContents.forEach(c => c.classList.remove('active'))
      tab.classList.add('active')
      const tabId = tab.getAttribute('data-tab')
      document.getElementById(tabId).classList.add('active')
    })
  })

  // Tasks
  const tasks = document.querySelectorAll('.task')

  function loadTaskStatuses() {
    tasks.forEach(task => {
      const taskId = task.getAttribute('data-task-id')
      const savedStatusJson = localStorage.getItem(`task-${taskId}`)
      const taskCheckbox = task.querySelector('.task-checkbox')

      if (savedStatusJson) {
        try {
          const statusData = JSON.parse(savedStatusJson)
          const radioButton = task.querySelector(`input[value="${statusData.status}"]`)
          if (radioButton) radioButton.checked = true
          if (taskCheckbox) taskCheckbox.checked = statusData.status === 'done'
        } catch (e) {
          const radioButton = task.querySelector(`input[value="${savedStatusJson}"]`)
          if (radioButton) {
            radioButton.checked = true
            const statusData = { status: savedStatusJson, timestamp: new Date().toLocaleString(), updated: Date.now() }
            localStorage.setItem(`task-${taskId}`, JSON.stringify(statusData))
          }
          if (taskCheckbox) taskCheckbox.checked = savedStatusJson === 'done'
        }
      }

      const savedNotesContainer = task.querySelector('.saved-notes')
      if (savedNotesContainer) loadNotes(taskId, savedNotesContainer)
    })

    updateDashboard()
  }

  tasks.forEach(task => {
    const taskId = task.getAttribute('data-task-id')
    const radioButtons = task.querySelectorAll('input[type="radio"]')
    const taskCheckbox = task.querySelector('.task-checkbox')

    radioButtons.forEach(radio => {
      radio.addEventListener('change', () => {
        if (!radio.checked) return
        const statusData = { status: radio.value, timestamp: new Date().toLocaleString(), updated: Date.now() }
        localStorage.setItem(`task-${taskId}`, JSON.stringify(statusData))
        if (taskCheckbox) taskCheckbox.checked = radio.value === 'done'
        updateDashboard()
      })
    })

    if (taskCheckbox) {
      taskCheckbox.addEventListener('change', () => {
        const statusData = { status: taskCheckbox.checked ? 'done' : 'not-started', timestamp: new Date().toLocaleString(), updated: Date.now() }
        localStorage.setItem(`task-${taskId}`, JSON.stringify(statusData))
        const targetRadio = task.querySelector(`input[value="${statusData.status}"]`)
        if (targetRadio) targetRadio.checked = true
        updateDashboard()
      })
    }
  })

  function updateDashboard() {
    let notStartedCount = 0
    let inProgressCount = 0
    let completedCount = 0

    tasks.forEach(task => {
      const taskId = task.getAttribute('data-task-id')
      const savedStatusJson = localStorage.getItem(`task-${taskId}`)
      let currentStatus = 'not-started'
      if (savedStatusJson) {
        try { currentStatus = JSON.parse(savedStatusJson).status } catch { currentStatus = savedStatusJson }
      }
      if (currentStatus === 'not-started') notStartedCount++
      else if (currentStatus === 'done') completedCount++
      else inProgressCount++
    })

    document.getElementById('not-started-count').textContent = notStartedCount
    document.getElementById('in-progress-count').textContent = inProgressCount
    document.getElementById('completed-count').textContent = completedCount
  }

  // Notes
  const notesToggleButtons = document.querySelectorAll('.notes-toggle')
  const addNoteButtons = document.querySelectorAll('.add-note-btn')
  notesToggleButtons.forEach(button => {
    button.addEventListener('click', () => {
      const notesContent = button.closest('.notes-section').querySelector('.notes-content')
      notesContent.classList.toggle('active')
      button.textContent = notesContent.classList.contains('active') ? 'Hide Notes' : 'Show Notes'
    })
  })

  addNoteButtons.forEach(button => {
    button.addEventListener('click', () => {
      const notesContent = button.closest('.notes-section').querySelector('.notes-content')
      const toggleButton = button.closest('.notes-section').querySelector('.notes-toggle')
      if (!notesContent.classList.contains('active')) { notesContent.classList.add('active'); toggleButton.textContent = 'Hide Notes' }
      notesContent.querySelector('.add-note-area').focus()
    })
  })

  const saveNoteButtons = document.querySelectorAll('.save-note-btn')
  saveNoteButtons.forEach(button => {
    button.addEventListener('click', () => {
      const notesSection = button.closest('.notes-section')
      const task = button.closest('.task')
      const taskId = task.getAttribute('data-task-id')
      const noteTextarea = notesSection.querySelector('.add-note-area')
      const noteText = noteTextarea.value.trim()
      if (!noteText) return
      const note = { id: Date.now(), text: noteText, timestamp: new Date().toLocaleString() }
      const savedNotes = JSON.parse(localStorage.getItem(`notes-${taskId}`) || '[]')
      savedNotes.push(note)
      localStorage.setItem(`notes-${taskId}`, JSON.stringify(savedNotes))
      noteTextarea.value = ''
      const savedNotesContainer = notesSection.querySelector('.saved-notes')
      loadNotes(taskId, savedNotesContainer)
    })
  })

  const clearNoteButtons = document.querySelectorAll('.clear-note-btn')
  clearNoteButtons.forEach(button => {
    button.addEventListener('click', () => {
      const noteTextarea = button.closest('.notes-section').querySelector('.add-note-area')
      noteTextarea.value = ''
    })
  })

  function loadNotes(taskId, container) {
    const savedNotes = JSON.parse(localStorage.getItem(`notes-${taskId}`) || '[]')
    container.innerHTML = ''
    if (savedNotes.length === 0) { container.innerHTML = '<p>No notes yet.</p>'; return }
    savedNotes.sort((a, b) => b.id - a.id)
    savedNotes.forEach(note => {
      const noteElement = document.createElement('div')
      noteElement.className = 'note-item'
      noteElement.innerHTML = `
        <div class="note-timestamp">${note.timestamp}</div>
        <div class="note-text">${note.text}</div>
        <div class="note-actions">
          <button class="note-delete" data-note-id="${note.id}">Delete</button>
        </div>
      `
      container.appendChild(noteElement)
      const deleteButton = noteElement.querySelector('.note-delete')
      deleteButton.addEventListener('click', () => deleteNote(taskId, note.id, container))
    })
  }

  function deleteNote(taskId, noteId, container) {
    if (!confirm('Are you sure you want to delete this note?')) return
    const savedNotes = JSON.parse(localStorage.getItem(`notes-${taskId}`) || '[]')
    const updatedNotes = savedNotes.filter(note => note.id !== noteId)
    localStorage.setItem(`notes-${taskId}`, JSON.stringify(updatedNotes))
    loadNotes(taskId, container)
  }

  // Initialize
  loadTaskStatuses()

  // Tooltip behavior (mobile)
  const tooltips = document.querySelectorAll('.tooltip')
  tooltips.forEach(tooltip => {
    const infoIcon = tooltip.querySelector('.info-icon')
    infoIcon.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      tooltips.forEach(otherTooltip => { if (otherTooltip !== tooltip) otherTooltip.classList.remove('active') })
      tooltip.classList.toggle('active')
    })
    document.addEventListener('click', (e) => { if (!tooltip.contains(e.target)) tooltip.classList.remove('active') })
  })

  // Reset buttons
  const clearButton = document.createElement('button')
  clearButton.textContent = 'Reset All Progress'
  clearButton.style.marginTop = '20px'
  clearButton.style.padding = '8px 16px'
  clearButton.style.backgroundColor = '#B71C1C'
  clearButton.style.color = 'white'
  clearButton.style.border = 'none'
  clearButton.style.borderRadius = '4px'
  clearButton.style.cursor = 'pointer'
  clearButton.addEventListener('click', () => {
    if (!confirm('Are you sure you want to reset all progress? This cannot be undone.')) return
    tasks.forEach(task => {
      const taskId = task.getAttribute('data-task-id')
      localStorage.removeItem(`task-${taskId}`)
      const notStartedRadio = task.querySelector('input[value="not-started"]')
      if (notStartedRadio) notStartedRadio.checked = true
    })
    updateDashboard()
  })
  document.body.appendChild(clearButton)

  const clearNotesButton = document.createElement('button')
  clearNotesButton.textContent = 'Clear All Notes'
  clearNotesButton.style.marginTop = '10px'
  clearNotesButton.style.marginLeft = '10px'
  clearNotesButton.style.padding = '8px 16px'
  clearNotesButton.style.backgroundColor = '#424242'
  clearNotesButton.style.color = 'white'
  clearNotesButton.style.border = 'none'
  clearNotesButton.style.borderRadius = '4px'
  clearNotesButton.style.cursor = 'pointer'
  clearNotesButton.addEventListener('click', () => {
    if (!confirm('Are you sure you want to delete all notes? This cannot be undone.')) return
    tasks.forEach(task => {
      const taskId = task.getAttribute('data-task-id')
      localStorage.removeItem(`notes-${taskId}`)
      const savedNotesContainer = task.querySelector('.saved-notes')
      loadNotes(taskId, savedNotesContainer)
    })
  })
  document.body.appendChild(clearNotesButton)

  // Task Filter Modal
  const modal = document.getElementById('task-filter-modal')
  const modalClose = document.querySelector('.modal-close')
  const statusItems = document.querySelectorAll('.status-item')
  const filteredTasksList = document.getElementById('filtered-tasks-list')
  const modalStatusType = document.getElementById('modal-status-type')

  modalClose.addEventListener('click', () => modal.classList.remove('active'))
  window.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active') })
  statusItems.forEach(item => { item.addEventListener('click', () => showFilteredTasks(item.getAttribute('data-status'))) })

  function showFilteredTasks(statusType) {
    filteredTasksList.innerHTML = ''
    let statusTitle = ''
    if (statusType === 'not-started') statusTitle = 'Not Started'
    else if (statusType === 'in-progress') statusTitle = 'In Progress'
    else if (statusType === 'completed') statusTitle = 'Completed'
    modalStatusType.textContent = statusTitle

    const filteredTasks = []
    tasks.forEach(task => {
      const taskId = task.getAttribute('data-task-id')
      const taskTitle = task.querySelector('.task-title-text').textContent
      const tabContent = task.closest('.tab-content')
      const tabId = tabContent.id
      let categoryName = ''
      document.querySelectorAll('.tab').forEach(tab => { if (tab.getAttribute('data-tab') === tabId) categoryName = tab.textContent })
      const savedStatusJson = localStorage.getItem(`task-${taskId}`)
      if (savedStatusJson) {
        try {
          const statusData = JSON.parse(savedStatusJson)
          const currentStatus = statusData.status
          if ((statusType === 'not-started' && currentStatus === 'not-started') || (statusType === 'completed' && currentStatus === 'done') || (statusType === 'in-progress' && currentStatus !== 'not-started' && currentStatus !== 'done'))
            filteredTasks.push({ id: taskId, title: taskTitle, category: categoryName, timestamp: statusData.timestamp, status: currentStatus, updated: statusData.updated || Date.now() })
        } catch (e) {
          const currentStatus = savedStatusJson
          if ((statusType === 'not-started' && currentStatus === 'not-started') || (statusType === 'completed' && currentStatus === 'done') || (statusType === 'in-progress' && currentStatus !== 'not-started' && currentStatus !== 'done'))
            filteredTasks.push({ id: taskId, title: taskTitle, category: categoryName, timestamp: 'Unknown date', status: currentStatus, updated: Date.now() })
        }
      } else if (statusType === 'not-started') {
        filteredTasks.push({ id: taskId, title: taskTitle, category: categoryName, timestamp: 'Not started yet', status: 'not-started', updated: Date.now() })
      }
    })

    filteredTasks.sort((a, b) => b.updated - a.updated)
    if (filteredTasks.length === 0) filteredTasksList.innerHTML = '<p>No tasks with this status.</p>'
    else filteredTasks.forEach(task => {
      const taskElement = document.createElement('div')
      taskElement.className = 'task-list-item'
      taskElement.innerHTML = `
        <div class="task-category">${task.category}</div>
        <div class="task-title">${task.title}</div>
        <div class="task-date">Last updated: ${task.timestamp}</div>
      `
      filteredTasksList.appendChild(taskElement)
    })

    modal.classList.add('active')
  }

  // Find Agency link
  const findAgencyLink = document.getElementById('find-agency-link')
  findAgencyLink.addEventListener('click', () => { document.getElementById('map-modal').classList.add('active') })

  // View toggle
  const viewToggleBtn = document.getElementById('view-toggle')
  const mainContainer = document.body
  const viewToggleText = viewToggleBtn.querySelector('.view-toggle-text')
  const currentView = localStorage.getItem('view-preference') || 'tabbed'
  if (currentView === 'list') { mainContainer.classList.add('list-view'); viewToggleText.textContent = 'Tabbed View' }
  viewToggleBtn.addEventListener('click', () => {
    mainContainer.classList.toggle('list-view')
    if (mainContainer.classList.contains('list-view')) {
      viewToggleText.textContent = 'Tabbed View'
      localStorage.setItem('view-preference', 'list')
    } else {
      viewToggleText.textContent = 'Simple List'
      localStorage.setItem('view-preference', 'tabbed')
      tabs.forEach(t => t.classList.remove('active'))
      tabContents.forEach(c => c.classList.remove('active'))
      tabs[0].classList.add('active')
      tabContents[0].classList.add('active')
    }
  })

  // Map modal
  const mapModal = document.getElementById('map-modal')
  const mapModalClose = document.querySelector('.map-modal-close')
  const zipcodeInput = document.getElementById('zipcode-input')
  const searchMapBtn = document.getElementById('search-map-btn')
  const googleMap = document.getElementById('google-map')
  mapModalClose.addEventListener('click', () => { mapModal.classList.remove('active') })
  window.addEventListener('click', (e) => { if (e.target === mapModal) mapModal.classList.remove('active') })
  searchMapBtn.addEventListener('click', () => {
    const location = zipcodeInput.value.trim()
    if (!location) return
    const mapSrc = `https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=home+health+agencies+near+${encodeURIComponent(location)}&zoom=12`
    googleMap.src = mapSrc
  })
  zipcodeInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') searchMapBtn.click() })
})

