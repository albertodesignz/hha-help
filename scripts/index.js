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

// Case storage helpers
function getCurrentCaseId() { return localStorage.getItem('current-case-id') }
function setCurrentCaseId(caseId) { if (caseId) localStorage.setItem('current-case-id', caseId); else localStorage.removeItem('current-case-id') }
function makeCaseKey(baseKey) {
  const caseId = getCurrentCaseId()
  if (!caseId) return baseKey
  return `case-${caseId}::${baseKey}`
}
function storageGet(baseKey) { return localStorage.getItem(makeCaseKey(baseKey)) }
function storageSet(baseKey, value) { localStorage.setItem(makeCaseKey(baseKey), value) }
function storageRemove(baseKey) { localStorage.removeItem(makeCaseKey(baseKey)) }
function listAllCaseKeys(caseId) {
  const prefix = `case-${caseId}::`
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(prefix)) keys.push(k)
  }
  return keys
}

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
    const testBadge = document.getElementById('testBadge')
    if (!testBadge || !testBadge.style.display || testBadge.style.display === 'none')
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
    const testBadge = document.getElementById('testBadge')
    if (testBadge) {
      testBadge.style.display = 'inline-block'
    }
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

  // Cases UI elements
  const casesContainer = document.getElementById('cases-container')
  const casesList = document.getElementById('cases-list')
  const casesEmpty = document.getElementById('cases-empty')
  const newCaseBtn = document.getElementById('new-case-btn')
  const newCaseInlineBtn = document.getElementById('new-case-inline-btn')
  const switchCaseBtn = document.getElementById('switch-case-btn')
  const shareCurrentCaseBtn = document.getElementById('share-current-case-btn')
  const currentCaseBar = document.getElementById('current-case-bar')
  const currentCaseNameEl = document.getElementById('current-case-name')
  const checklistContainer = document.getElementById('checklist-container')
  const addTaskModalEl = document.getElementById('add-task-modal')
  const addTaskModal = window.bootstrap ? new bootstrap.Modal(addTaskModalEl) : null
  const addTaskTitleInput = document.getElementById('new-task-title')
  const addTaskSaveBtn = document.getElementById('add-task-save-btn')
  const addTaskCancelBtn = document.getElementById('add-task-cancel-btn')
  let pendingAddCategory = null

  const caseModalEl = document.getElementById('case-modal')
  const caseModal = window.bootstrap ? new bootstrap.Modal(caseModalEl) : null
  const caseNameInput = document.getElementById('case-name')
  const patientNameInput = document.getElementById('patient-name')
  const caseSaveBtn = document.getElementById('case-save-btn')
  const caseCancelBtn = document.getElementById('case-cancel-btn')

  function readCases() {
    try { return JSON.parse(localStorage.getItem('cases') || '[]') } catch { return [] }
  }
  function writeCases(cases) {
    localStorage.setItem('cases', JSON.stringify(cases))
  }
  function getCaseById(caseId) { return readCases().find(c => c.id === caseId) }
  function showCases() {
    if (casesContainer) casesContainer.style.display = 'block'
    if (checklistContainer) checklistContainer.style.display = 'none'
    if (currentCaseBar) currentCaseBar.style.display = 'none'
  }
  function showChecklist() {
    if (casesContainer) casesContainer.style.display = 'none'
    if (checklistContainer) checklistContainer.style.display = 'block'
    if (currentCaseBar) currentCaseBar.style.display = 'flex'
  }
  function renderCases() {
    if (!casesList || !casesEmpty) return
    const allCases = readCases().sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
    casesList.innerHTML = ''
    if (allCases.length === 0) { casesEmpty.style.display = 'block' }
    else {
      casesEmpty.style.display = 'none'
      allCases.forEach(cs => {
        const card = document.createElement('div')
        card.className = 'case-card'
        card.innerHTML = `
          <div class="case-title">${cs.name || 'Untitled Case'}</div>
          <div class="case-sub">Patient: ${cs.patientName || '—'}</div>
          <div class="case-sub">Created: ${new Date(cs.createdAt).toLocaleString()}</div>
          <div class="case-actions">
            <button class="case-open-btn" data-id="${cs.id}">Open</button>
            <button class="case-share-btn" data-id="${cs.id}">Share</button>
            <button class="case-delete-btn" data-id="${cs.id}"><i class="ph ph-trash"></i> Delete</button>
          </div>
        `
        casesList.appendChild(card)
      })
      casesList.querySelectorAll('.case-open-btn').forEach(btn => btn.addEventListener('click', () => openCase(btn.getAttribute('data-id'))))
      casesList.querySelectorAll('.case-share-btn').forEach(btn => btn.addEventListener('click', () => shareCase(btn.getAttribute('data-id'))))
      casesList.querySelectorAll('.case-delete-btn').forEach(btn => btn.addEventListener('click', () => deleteCase(btn.getAttribute('data-id'))))
    }
  }
  async function shareCase(caseId) {
    const shareUrl = `${window.location.origin}${window.location.pathname}?case=${encodeURIComponent(caseId)}`
    try { await navigator.clipboard.writeText(shareUrl); alert('Case link copied to clipboard') }
    catch { window.prompt('Copy case link:', shareUrl) }
  }
  function openCase(caseId) {
    const cs = getCaseById(caseId)
    if (!cs) { alert('Case not found'); return }
    setCurrentCaseId(caseId)
    if (currentCaseNameEl) currentCaseNameEl.textContent = cs.name || 'Untitled Case'
    showChecklist()
    renderAllCustomTasks()
    loadTaskStatuses()
    updateDashboard()
  }
  function deleteCase(caseId) {
    const cs = getCaseById(caseId)
    if (!cs) return
    if (!confirm(`Delete case "${cs.name}" and all its progress/notes?`)) return
    const keys = listAllCaseKeys(caseId)
    keys.forEach(k => localStorage.removeItem(k))
    const remaining = readCases().filter(c => c.id !== caseId)
    writeCases(remaining)
    if (getCurrentCaseId() === caseId) setCurrentCaseId(null)
    renderCases()
    showCases()
  }
  function openCaseModal() {
    if (!caseModal) return
    caseNameInput.value = ''
    patientNameInput.value = ''
    caseModal.show()
  }
  function closeCaseModal() { if (caseModal) caseModal.hide() }
  function createCase() {
    const name = (caseNameInput?.value || '').trim()
    const patientName = (patientNameInput?.value || '').trim()
    if (!name) { alert('Please enter a case name') ; return }
    const id = String(Date.now())
    const now = Date.now()
    const allCases = readCases()
    allCases.push({ id, name, patientName, createdAt: now, updatedAt: now })
    writeCases(allCases)
    closeCaseModal()
    renderCases()
    openCase(id)
  }

  newCaseBtn?.addEventListener('click', openCaseModal)
  newCaseInlineBtn?.addEventListener('click', openCaseModal)
  switchCaseBtn?.addEventListener('click', () => { showCases(); renderCases() })
  caseCancelBtn?.addEventListener('click', closeCaseModal)
  caseSaveBtn?.addEventListener('click', createCase)
  shareCurrentCaseBtn?.addEventListener('click', async () => {
    const cid = getCurrentCaseId()
    if (!cid) { alert('Open a case first') ; return }
    const shareUrl = `${window.location.origin}${window.location.pathname}?case=${encodeURIComponent(cid)}`
    try { await navigator.clipboard.writeText(shareUrl); alert('Case link copied to clipboard') }
    catch { window.prompt('Copy case link:', shareUrl) }
  })

  // Add task per category
  function openAddTaskModal(categoryId) {
    pendingAddCategory = categoryId
    if (!addTaskModal) return
    addTaskTitleInput.value = ''
    addTaskModal.show()
    setTimeout(() => addTaskTitleInput?.focus(), 0)
  }
  function closeAddTaskModal() { if (addTaskModal) addTaskModal.hide(); pendingAddCategory = null }
  document.querySelectorAll('.add-task-title-btn, .add-task-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const target = btn.getAttribute('data-target')
      openAddTaskModal(target)
    })
  })
  addTaskCancelBtn?.addEventListener('click', closeAddTaskModal)
  addTaskSaveBtn?.addEventListener('click', () => {
    const title = (addTaskTitleInput?.value || '').trim()
    if (!pendingAddCategory || !title) { closeAddTaskModal(); return }
    const cid = getCurrentCaseId()
    if (!cid) { alert('Open a case first'); closeAddTaskModal(); return }
    const key = `custom-tasks-${pendingAddCategory}`
    const list = JSON.parse(storageGet(key) || '[]')
    const newTaskId = `custom-${pendingAddCategory}-${Date.now()}`
    list.push({ id: newTaskId, title, createdAt: Date.now() })
    storageSet(key, JSON.stringify(list))
    closeAddTaskModal()
    renderCustomTasks(pendingAddCategory)
  })

  function renderAllCustomTasks() {
    ['immediate','short-term','long-term'].forEach(renderCustomTasks)
  }
  function renderCustomTasks(categoryId) {
    const container = document.querySelector(`#${categoryId}`)
    if (!container) return
    let anchor = container.querySelector('.custom-tasks-anchor')
    if (!anchor) {
      anchor = document.createElement('div')
      anchor.className = 'custom-tasks-anchor'
      container.appendChild(anchor)
    }
    const key = `custom-tasks-${categoryId}`
    const list = JSON.parse(storageGet(key) || '[]')
    // Clear current custom tasks
    anchor.querySelectorAll('[data-custom-task="true"]').forEach(n => n.remove())
    list.forEach(item => {
      const task = document.createElement('div')
      task.className = 'task'
      task.setAttribute('data-task-id', item.id)
      task.setAttribute('data-custom-task', 'true')
      task.innerHTML = `
        <label>
          <input type="checkbox" class="task-checkbox" data-task-id="${item.id}">
          <span class="task-title-text">${item.title}</span>
        </label>
        <div class="checkbox-group">
          <label><input type="radio" name="${item.id}" value="not-started" checked> Not Started</label>
          <label><input type="radio" name="${item.id}" value="contacted"> In Progress</label>
          <label><input type="radio" name="${item.id}" value="done"> Done</label>
        </div>
        <div class="notes-section">
          <div class="notes-heading">
            <button class="add-note-btn">Add Note</button>
            <button class="notes-toggle">Show Notes</button>
          </div>
          <div class="notes-content">
            <div class="saved-notes"><p>No notes yet.</p></div>
            <textarea class="add-note-area" placeholder="Add a note about this task..."></textarea>
            <div class="note-actions-bar">
              <button class="save-note-btn">Save Note</button>
              <button class="clear-note-btn">Clear</button>
            </div>
          </div>
        </div>
      `
      anchor.appendChild(task)
    })
    // Re-initialize behaviors for new tasks
    initializeNewTasks(anchor.querySelectorAll('.task'))
  }

  function initializeNewTasks(newTasks) {
    // mimic setup from above for tasks
    newTasks.forEach(task => {
      if (task.querySelector('.task-body')) return
      const firstLabel = task.querySelector('label'); if (!firstLabel) return
      const header = document.createElement('div'); header.className = 'task-header'
      task.insertBefore(header, firstLabel); header.appendChild(firstLabel)
      const toggleBtn = document.createElement('button'); toggleBtn.type = 'button'; toggleBtn.className = 'task-toggle'; toggleBtn.setAttribute('aria-label','Toggle task details'); toggleBtn.setAttribute('aria-expanded','false'); toggleBtn.innerHTML = '▸'; header.appendChild(toggleBtn)
      const body = document.createElement('div'); body.className = 'task-body'; while (header.nextSibling) body.appendChild(header.nextSibling); task.appendChild(body)
      toggleBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); const isExpanded = task.classList.toggle('expanded'); toggleBtn.setAttribute('aria-expanded', String(isExpanded)); toggleBtn.innerHTML = isExpanded ? '▾' : '▸' })
    })
    // status persistence
    newTasks.forEach(task => {
      const taskId = task.getAttribute('data-task-id')
      const radios = task.querySelectorAll('input[type="radio"]')
      const checkbox = task.querySelector('.task-checkbox')
      radios.forEach(r => r.addEventListener('change', () => {
        if (!r.checked) return
        const statusData = { status: r.value, timestamp: new Date().toLocaleString(), updated: Date.now() }
        storageSet(`task-${taskId}`, JSON.stringify(statusData))
        if (checkbox) checkbox.checked = r.value === 'done'
        updateDashboard()
      }))
      if (checkbox) checkbox.addEventListener('change', () => {
        const statusData = { status: checkbox.checked ? 'done' : 'not-started', timestamp: new Date().toLocaleString(), updated: Date.now() }
        storageSet(`task-${taskId}`, JSON.stringify(statusData))
        const targetRadio = task.querySelector(`input[value="${statusData.status}"]`); if (targetRadio) targetRadio.checked = true
        updateDashboard()
      })
      // notes wiring
      const notesToggle = task.querySelector('.notes-toggle')
      const addNoteBtn = task.querySelector('.add-note-btn')
      const saveNoteBtn = task.querySelector('.save-note-btn')
      const clearBtn = task.querySelector('.clear-note-btn')
      notesToggle?.addEventListener('click', () => {
        const notesContent = notesToggle.closest('.notes-section').querySelector('.notes-content')
        notesContent.classList.toggle('active')
        notesToggle.textContent = notesContent.classList.contains('active') ? 'Hide Notes' : 'Show Notes'
      })
      addNoteBtn?.addEventListener('click', () => {
        const notesContent = addNoteBtn.closest('.notes-section').querySelector('.notes-content')
        const toggleButton = addNoteBtn.closest('.notes-section').querySelector('.notes-toggle')
        if (!notesContent.classList.contains('active')) { notesContent.classList.add('active'); toggleButton.textContent = 'Hide Notes' }
        notesContent.querySelector('.add-note-area').focus()
      })
      saveNoteBtn?.addEventListener('click', () => {
        const notesSection = saveNoteBtn.closest('.notes-section')
        const t = saveNoteBtn.closest('.task')
        const id = t.getAttribute('data-task-id')
        const noteTextarea = notesSection.querySelector('.add-note-area')
        const noteText = noteTextarea.value.trim(); if (!noteText) return
        const note = { id: Date.now(), text: noteText, timestamp: new Date().toLocaleString() }
        const savedNotes = JSON.parse(storageGet(`notes-${id}`) || '[]'); savedNotes.push(note)
        storageSet(`notes-${id}`, JSON.stringify(savedNotes))
        noteTextarea.value = ''
        const savedNotesContainer = notesSection.querySelector('.saved-notes')
        // reuse loadNotes
        loadNotes(id, savedNotesContainer)
      })
      clearBtn?.addEventListener('click', () => {
        const noteTextarea = clearBtn.closest('.notes-section').querySelector('.add-note-area')
        noteTextarea.value = ''
      })
      // load saved notes
      const savedNotesContainer = task.querySelector('.saved-notes')
      loadNotes(task.getAttribute('data-task-id'), savedNotesContainer)
      // restore saved status
      const saved = storageGet(`task-${task.getAttribute('data-task-id')}`)
      if (saved) {
        try {
          const sd = JSON.parse(saved)
          const rb = task.querySelector(`input[value="${sd.status}"]`)
          if (rb) rb.checked = true
          if (checkbox) checkbox.checked = sd.status === 'done'
        } catch {}
      }
    })
  }

  // Collapsible tasks: wrap task details and add toggle; collapsed by default
  tasks.forEach(task => {
    // Avoid re-initializing if already structured
    if (task.querySelector('.task-body')) return

    const firstLabel = task.querySelector('label')
    if (!firstLabel) return

    const header = document.createElement('div')
    header.className = 'task-header'
    task.insertBefore(header, firstLabel)
    header.appendChild(firstLabel)

    const toggleBtn = document.createElement('button')
    toggleBtn.type = 'button'
    toggleBtn.className = 'task-toggle'
    toggleBtn.setAttribute('aria-label', 'Toggle task details')
    toggleBtn.setAttribute('aria-expanded', 'false')
    toggleBtn.innerHTML = '▸'
    header.appendChild(toggleBtn)

    const body = document.createElement('div')
    body.className = 'task-body'
    // Move all siblings after header into body
    while (header.nextSibling) body.appendChild(header.nextSibling)
    task.appendChild(body)

    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const isExpanded = task.classList.toggle('expanded')
      toggleBtn.setAttribute('aria-expanded', String(isExpanded))
      toggleBtn.innerHTML = isExpanded ? '▾' : '▸'
    })
  })

  function loadTaskStatuses() {
    tasks.forEach(task => {
      const taskId = task.getAttribute('data-task-id')
      const savedStatusJson = storageGet(`task-${taskId}`)
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
            storageSet(`task-${taskId}`, JSON.stringify(statusData))
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
        storageSet(`task-${taskId}`, JSON.stringify(statusData))
        if (taskCheckbox) taskCheckbox.checked = radio.value === 'done'
        updateDashboard()
      })
    })

    if (taskCheckbox) {
      taskCheckbox.addEventListener('change', () => {
        const statusData = { status: taskCheckbox.checked ? 'done' : 'not-started', timestamp: new Date().toLocaleString(), updated: Date.now() }
        storageSet(`task-${taskId}`, JSON.stringify(statusData))
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
      const savedStatusJson = storageGet(`task-${taskId}`)
      let currentStatus = 'not-started'
      if (savedStatusJson) {
        try { currentStatus = JSON.parse(savedStatusJson).status } catch { currentStatus = savedStatusJson }
      }
      if (currentStatus === 'not-started') notStartedCount++
      else if (currentStatus === 'done') completedCount++
      else inProgressCount++
    })

    const notStartedEl = document.getElementById('not-started-count')
    const inProgressEl = document.getElementById('in-progress-count')
    const completedEl = document.getElementById('completed-count')
    if (!notStartedEl || !inProgressEl || !completedEl) return

    notStartedEl.textContent = notStartedCount
    inProgressEl.textContent = inProgressCount
    completedEl.textContent = completedCount
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
      const savedNotes = JSON.parse(storageGet(`notes-${taskId}`) || '[]')
      savedNotes.push(note)
      storageSet(`notes-${taskId}`, JSON.stringify(savedNotes))
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
    const savedNotes = JSON.parse(storageGet(`notes-${taskId}`) || '[]')
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
    const savedNotes = JSON.parse(storageGet(`notes-${taskId}`) || '[]')
    const updatedNotes = savedNotes.filter(note => note.id !== noteId)
    storageSet(`notes-${taskId}`, JSON.stringify(updatedNotes))
    loadNotes(taskId, container)
  }

  // Initialize
  loadTaskStatuses()
  renderAllCustomTasks()

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
      storageRemove(`task-${taskId}`)
      const notStartedRadio = task.querySelector('input[value="not-started"]')
      if (notStartedRadio) notStartedRadio.checked = true
    })
    updateDashboard()
  })
  if (checklistContainer) checklistContainer.appendChild(clearButton)

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
      storageRemove(`notes-${taskId}`)
      const savedNotesContainer = task.querySelector('.saved-notes')
      loadNotes(taskId, savedNotesContainer)
    })
  })
  if (checklistContainer) checklistContainer.appendChild(clearNotesButton)

  // Task Filter Modal
  const modalEl = document.getElementById('task-filter-modal')
  const bootstrapFilterModal = window.bootstrap ? new bootstrap.Modal(modalEl) : null
  const statusItems = document.querySelectorAll('.status-item')
  const filteredTasksList = document.getElementById('filtered-tasks-list')
  const modalStatusType = document.getElementById('modal-status-type')

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

    bootstrapFilterModal?.show()
  }

  // Find Agency link
  const findAgencyLink = document.getElementById('find-agency-link')
  findAgencyLink.addEventListener('click', () => { const el = document.getElementById('map-modal'); const m = el && window.bootstrap ? new bootstrap.Modal(el) : null; m?.show() })

  // View toggle
  const viewToggleBtn = document.getElementById('view-toggle')
  const mainContainer = document.body
  const viewToggleText = viewToggleBtn.querySelector('.view-toggle-text')
  const viewToggleIcon = viewToggleBtn.querySelector('.view-toggle-icon i')
  const currentView = localStorage.getItem('view-preference') || 'tabbed'
  if (currentView === 'list') { 
    mainContainer.classList.add('list-view'); 
    viewToggleText.textContent = 'Tabbed View'
    viewToggleIcon.className = 'ph ph-columns'
  }
  viewToggleBtn.addEventListener('click', () => {
    mainContainer.classList.toggle('list-view')
    if (mainContainer.classList.contains('list-view')) {
      viewToggleText.textContent = 'Tabbed View'
      viewToggleIcon.className = 'ph ph-columns'
      localStorage.setItem('view-preference', 'list')
    } else {
      viewToggleText.textContent = 'Simple List'
      viewToggleIcon.className = 'ph ph-rows'
      localStorage.setItem('view-preference', 'tabbed')
      tabs.forEach(t => t.classList.remove('active'))
      tabContents.forEach(c => c.classList.remove('active'))
      tabs[0].classList.add('active')
      tabContents[0].classList.add('active')
    }
  })

  // Map modal
  const mapModalEl = document.getElementById('map-modal')
  const mapModal = mapModalEl && window.bootstrap ? new bootstrap.Modal(mapModalEl) : null
  const zipcodeInput = document.getElementById('zipcode-input')
  const searchMapBtn = document.getElementById('search-map-btn')
  const googleMap = document.getElementById('google-map')
  // bootstrap handles close via data attributes
  searchMapBtn.addEventListener('click', () => {
    const location = zipcodeInput.value.trim()
    if (!location) return
    const mapSrc = `https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=home+health+agencies+near+${encodeURIComponent(location)}&zoom=12`
    googleMap.src = mapSrc
  })
  zipcodeInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') searchMapBtn.click() })

  // Initial view: show cases or active case
  renderCases()
  const initialParams = new URLSearchParams(window.location.search)
  const paramCaseId = initialParams.get('case')
  if (paramCaseId && getCaseById(paramCaseId)) {
    setCurrentCaseId(paramCaseId)
    const cs = getCaseById(paramCaseId)
    if (currentCaseNameEl) currentCaseNameEl.textContent = cs?.name || 'Untitled Case'
    showChecklist()
    renderAllCustomTasks()
    loadTaskStatuses()
    updateDashboard()
  } else {
    const activeCaseId = getCurrentCaseId()
    const activeCase = activeCaseId ? getCaseById(activeCaseId) : null
    if (activeCase) { if (currentCaseNameEl) currentCaseNameEl.textContent = activeCase.name || 'Untitled Case'; showChecklist() }
    else { showCases() }
  }
})

