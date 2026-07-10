// --- State Management ---
let events = JSON.parse(localStorage.getItem('tradingEvents')) || [];
let appConfig = { eventCategories: [], tradingTypes: [] }; // Stores the dynamic data
const modal = new bootstrap.Modal(document.getElementById('eventModal'));

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadConfig(); // Fetches the JSON file first
});

async function loadConfig() {
    try {
        const response = await fetch('config.json');
        if (!response.ok) throw new Error('Config file not found');
        appConfig = await response.json();
    } catch (error) {
        console.error("Failed to load config.json. Using fallbacks.", error);
        // Fallback data just in case the JSON file is missing
        appConfig = {
            eventCategories: ["General"],
            tradingTypes: ["Spot", "Future"]
        };
    }
    
    populateDynamicDropdowns();
    renderEvents();
    startCountdown();
}

function populateDynamicDropdowns() {
    // Populate Dashboard Filters
    const typeFilter = document.getElementById('filterType');
    const categoryFilter = document.getElementById('filterCategory');
    const categoryInput = document.getElementById('eventCategory');

    appConfig.tradingTypes.forEach(type => {
        typeFilter.add(new Option(type, type));
    });

    appConfig.eventCategories.forEach(cat => {
        categoryFilter.add(new Option(cat, cat));
        categoryInput.add(new Option(cat, cat));
    });
}



// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderEvents();
    startCountdown();
});

// --- Helpers ---
function getLocalIsoString() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16); 
}

// --- Theme Management ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-bs-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-bs-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggle');
    btn.innerHTML = theme === 'light' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
    btn.className = theme === 'light' ? 'btn btn-dark btn-sm' : 'btn btn-light btn-sm';
}

// --- Data Operations (CRUD) ---
function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('eventId').value || Date.now().toString();
    const isNew = !document.getElementById('eventId').value;

    const tradingTypes = [];
    document.querySelectorAll('.trading-row').forEach(row => {
        tradingTypes.push({
            type: row.querySelector('.type-select').value,
            volume: parseFloat(row.querySelector('.vol-input').value) || 0
        });
    });

    const eventObj = {
        id: id,
        name: document.getElementById('eventName').value,
		category: document.getElementById('eventCategory').value, // NEW
        url: document.getElementById('eventUrl').value,
        start: document.getElementById('eventStart').value,
        expiry: document.getElementById('eventExpiry').value,
        checkType: document.getElementById('eventCheckType').value,
        checkedIn: parseInt(document.getElementById('eventCheckedIn').value) || 0,
        manualStatus: document.getElementById('eventStatus').value, 
        notes: document.getElementById('eventNotes').value,
        tradingTypes: tradingTypes,
        createdAt: isNew ? new Date().toISOString() : events.find(ev => ev.id === id).createdAt
    };

    if (isNew) {
        events.push(eventObj);
    } else {
        const index = events.findIndex(ev => ev.id === id);
        events[index] = eventObj;
    }

    saveData();
    modal.hide();
    renderEvents();
}

function deleteEvent(id) {
    if (confirm('Are you sure you want to delete this event?')) {
        events = events.filter(ev => ev.id !== id);
        saveData();
        renderEvents();
    }
}

function saveData() {
    localStorage.setItem('tradingEvents', JSON.stringify(events));
    updateDashboardStats();
}

// --- File I/O ---
function exportData() {
    const dataStr = JSON.stringify(events, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading_events_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedEvents = JSON.parse(e.target.result);
            if (Array.isArray(importedEvents)) {
                events = importedEvents;
                saveData();
                renderEvents();
                alert('Data imported successfully!');
            } else {
                alert('Invalid JSON format. Array expected.');
            }
        } catch (err) {
            alert('Error parsing file.');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
}

// --- Modal & UI Logic ---
function openEventModal(id = null) {
    document.getElementById('eventForm').reset();
    document.getElementById('tradingTypesContainer').innerHTML = '';
    
    if (id) {
        document.getElementById('modalTitle').innerText = 'Edit Event';
        const ev = events.find(e => e.id === id);
        document.getElementById('eventId').value = ev.id;
        document.getElementById('eventName').value = ev.name;
		document.getElementById('eventCategory').value = ev.category || ''; // NEW
        document.getElementById('eventUrl').value = ev.url;
        document.getElementById('eventStart').value = ev.start || ''; 
        document.getElementById('eventExpiry').value = ev.expiry;
        document.getElementById('eventCheckType').value = ev.checkType;
        document.getElementById('eventCheckedIn').value = ev.checkedIn;
        document.getElementById('eventStatus').value = ev.manualStatus || 'Auto';
        document.getElementById('eventNotes').value = ev.notes;

        ev.tradingTypes.forEach(t => addTradingTypeRow(t.type, t.volume));
    } else {
        document.getElementById('modalTitle').innerText = 'Add Trading Event';
        document.getElementById('eventId').value = '';
        document.getElementById('eventStart').value = getLocalIsoString();
        addTradingTypeRow(); 
    }
    
    modal.show();
}


function addTradingTypeRow(selectedType = '', volume = '') {
    const container = document.getElementById('tradingTypesContainer');
    const row = document.createElement('div');
    row.className = 'trading-row d-flex gap-2 align-items-center';
    
    // Generate the <option> tags dynamically from config
    const optionsHtml = appConfig.tradingTypes.map(type => 
        `<option value="${type}" ${type === selectedType ? 'selected' : ''}>${type}</option>`
    ).join('');

    row.innerHTML = `
        <select class="form-select type-select" style="max-width: 150px;">
            ${optionsHtml}
        </select>
        <input type="number" class="form-control vol-input" placeholder="Volume (USDT)" value="${volume}" min="0">
        <button type="button" class="btn btn-outline-danger" onclick="this.parentElement.remove()">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;
    container.appendChild(row);
}



















// --- Status & Real-time Calculation ---
function determineStatus(startStr, expiryStr, manualStatus) {
    if (manualStatus === 'Completed') return 'Completed';
    
    const now = new Date().getTime();
    const expiry = new Date(expiryStr).getTime();
    
    if (now >= expiry) return 'Expired';
    
    if (startStr) {
        const start = new Date(startStr).getTime();
        if (now < start) return 'Upcoming';
        return 'Active'; 
    }
    
    return 'Active'; 
}

function formatCountdown(distance) {
    if (distance < 0) return "00d 00h 00m 00s";
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
}

function getStatusBadge(status) {
    const mapping = {
        'Upcoming': 'bg-info',
        'Active': 'bg-success',
        'Completed': 'bg-primary',
        'Expired': 'bg-danger'
    };
    return `<span class="badge ${mapping[status] || 'bg-secondary'}">${status}</span>`;
}

function startCountdown() {
    setInterval(() => {
        document.querySelectorAll('.countdown-timer').forEach(el => {
            const expiryStr = el.getAttribute('data-expiry');
            const now = new Date().getTime();
            const distance = new Date(expiryStr).getTime() - now;
            el.innerText = formatCountdown(distance);
        });
        
        if (new Date().getSeconds() === 0) {
            renderEvents(false); 
        }
    }, 1000);
}

// --- Rendering & Filtering ---
function filterEvents() {
    renderEvents();
}

function renderEvents(forceUpdateStats = true) {
    const container = document.getElementById('eventContainer');
    const search = document.getElementById('searchName').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;
    const typeFilter = document.getElementById('filterType').value;
	const categoryFilter = document.getElementById('filterCategory').value; // NEW
	
	const checkTypeFilter = document.getElementById('filterCheckType') ? document.getElementById('filterCheckType').value : '';

    container.innerHTML = '';
    let filteredEvents = events;

    // Apply Filters
    filteredEvents = filteredEvents.filter(ev => {
        const evStatus = determineStatus(ev.start, ev.expiry, ev.manualStatus);
        const matchesSearch = ev.name.toLowerCase().includes(search);
        const matchesStatus = statusFilter === '' || evStatus === statusFilter;
        const matchesType = typeFilter === '' || ev.tradingTypes.some(t => t.type === typeFilter);
		const matchesCategory = categoryFilter === '' || ev.category === categoryFilter; // NEW
		const matchesCheckType = checkTypeFilter === '' || ev.checkType === checkTypeFilter;
		
        return matchesSearch && matchesStatus && matchesType && matchesCategory && matchesCheckType;;
    });

    // Sort by Expiry Date
    filteredEvents.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

    if (filteredEvents.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-5">No events found matching your criteria.</div>';
    }

    filteredEvents.forEach(ev => {
        const status = determineStatus(ev.start, ev.expiry, ev.manualStatus);
        const totalVol = ev.tradingTypes.reduce((sum, t) => sum + t.volume, 0);
        
        const typeBadges = ev.tradingTypes.map(t => 
            `<span class="badge bg-secondary me-1 vol-badge">${t.type}: ${t.volume.toLocaleString()} USDT</span>`
        ).join('');

        const card = document.createElement('div');
        card.className = 'col-lg-4 col-md-6 mb-4';
        card.innerHTML = `
            <div class="card event-card h-100 shadow-sm">
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title fw-bold mb-0 text-truncate" title="${ev.name}">
                            ${ev.url ? `<a href="${ev.url}" target="_blank" class="text-decoration-none">${ev.name} <i class="fa-solid fa-arrow-up-right-from-square fa-xs"></i></a>` : ev.name}
                        </h5>
                        ${getStatusBadge(status)}
                    </div>
                    
                    <div class="text-muted small mb-3">
                        <div><i class="fa-regular fa-calendar-plus me-1"></i> Start: ${ev.start ? new Date(ev.start).toLocaleString() : 'N/A'}</div>
                        <div><i class="fa-regular fa-clock me-1"></i> Ends: ${new Date(ev.expiry).toLocaleString()}</div>
                    </div>
                    
                    <div class="countdown-box mb-3 text-primary countdown-timer" data-expiry="${ev.expiry}">
                        ${formatCountdown(new Date(ev.expiry).getTime() - new Date().getTime())}
                    </div>

                    <div class="mb-3">
                        <div class="small fw-bold mb-1 text-uppercase text-muted">Requirements</div>
                        ${typeBadges || '<span class="text-muted small">None</span>'}
                    </div>

                    <div class="mt-auto">
                        <div class="d-flex justify-content-between text-muted small mb-3">
                            <span><i class="fa-solid fa-clipboard-check me-1"></i> ${ev.checkType}</span>
                            <span><i class="fa-solid fa-calendar-check me-1"></i> ${ev.checkedIn} Days</span>
                            <span class="fw-bold text-success">Total: ${totalVol.toLocaleString()}</span>
                        </div>
                        <div class="d-flex justify-content-end gap-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="openEventModal('${ev.id}')"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteEvent('${ev.id}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    if (forceUpdateStats) updateDashboardStats();
}

function updateDashboardStats() {
    let active = 0, expired = 0, totalVol = 0;
    
    events.forEach(ev => {
        const status = determineStatus(ev.start, ev.expiry, ev.manualStatus);
        if (status === 'Active' || status === 'Upcoming') active++;
        if (status === 'Expired') expired++;
        
        totalVol += ev.tradingTypes.reduce((sum, t) => sum + t.volume, 0);
    });

    document.getElementById('statTotal').innerText = events.length;
    document.getElementById('statActive').innerText = active;
    document.getElementById('statExpired').innerText = expired;
    document.getElementById('statVolume').innerText = totalVol.toLocaleString();
}