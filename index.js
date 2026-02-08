/**
 * Airport Proximity Finder
 * Uses Nominatim (OpenStreetMap) for geocoding and AviationStack API for airport data
 */

// State
let selectedLocation = null;
let geocodingTimeout = null;
let distanceMode = 'straight'; // 'straight' or 'driving'

// DOM Elements
const locationInput = document.getElementById('location');
const clearLocationBtn = document.getElementById('clearLocation');
const suggestionsEl = document.getElementById('suggestions');
const rangeInput = document.getElementById('range');
const rangeValueEl = document.getElementById('rangeValue');
const searchBtn = document.getElementById('searchBtn');
const errorEl = document.getElementById('error');
const resultsEl = document.getElementById('results');
const resultsCountEl = document.getElementById('resultsCount');
const airportListEl = document.getElementById('airportList');
const distanceModeEl = document.getElementById('distanceMode');
const toggleBtns = document.querySelectorAll('.toggle-btn');

// Clear button visibility
locationInput.addEventListener('input', (e) => {
	if (e.target.value.trim()) {
		clearLocationBtn.classList.add('active');
	} else {
		clearLocationBtn.classList.remove('active');
	}
	
	const query = e.target.value.trim();
	if (query.length < 3) {
		suggestionsEl.classList.remove('active');
		return;
	}

	clearTimeout(geocodingTimeout);
	geocodingTimeout = setTimeout(() => geocodeLocation(query), 300);
});

// Clear button handler
clearLocationBtn.addEventListener('click', () => {
	locationInput.value = '';
	selectedLocation = null;
	clearLocationBtn.classList.remove('active');
	suggestionsEl.classList.remove('active');
	errorEl.innerHTML = '';
});

// Distance mode toggle
toggleBtns.forEach(btn => {
	btn.addEventListener('click', () => {
		toggleBtns.forEach(b => b.classList.remove('active'));
		btn.classList.add('active');
		distanceMode = btn.dataset.mode;
		
		if (distanceMode === 'straight') {
			distanceModeEl.textContent = 'Straight-line (Haversine formula)';
		} else {
			distanceModeEl.textContent = 'Driving distance (OSRM routing)';
		}
	});
});

// Update range display
rangeInput.addEventListener('input', (e) => {
	rangeValueEl.textContent = e.target.value;
});

// Click outside to close suggestions
document.addEventListener('click', (e) => {
	if (!e.target.closest('.input-group')) {
		suggestionsEl.classList.remove('active');
	}
});

/**
 * Geocode location using Nominatim API
 */
async function geocodeLocation(query) {
	try {
		const response = await fetch(
			`https://nominatim.openstreetmap.org/search?` +
			`q=${encodeURIComponent(query)}` +
			`&format=json` +
			`&limit=5` +
			`&addressdetails=1`,
			{
				headers: {
					'User-Agent': 'AirportProximityFinder/1.0'
				}
			}
		);

		if (!response.ok) throw new Error('Geocoding failed');

		const locations = await response.json();
		displayLocationSuggestions(locations);
	} catch (error) {
		console.error('Geocoding error:', error);
		showError('Failed to search locations. Please try again.');
	}
}

/**
 * Display location suggestions
 */
function displayLocationSuggestions(locations) {
	if (locations.length === 0) {
		suggestionsEl.classList.remove('active');
		return;
	}

	suggestionsEl.innerHTML = locations.map((loc) => {
		const name = loc.display_name.split(',')[0];
		const details = loc.display_name.split(',').slice(1, 3).join(',');
		
		return `
			<div class="suggestion-item" data-location='${JSON.stringify({
				name: loc.display_name,
				lat: parseFloat(loc.lat),
				lon: parseFloat(loc.lon)
			})}'>
				<div class="suggestion-name">${name}</div>
				<div class="suggestion-details">${details}</div>
			</div>
		`;
	}).join('');

	suggestionsEl.classList.add('active');

	// Add click handlers
	suggestionsEl.querySelectorAll('.suggestion-item').forEach(item => {
		item.addEventListener('click', () => {
			const location = JSON.parse(item.dataset.location);
			selectLocation(location);
		});
	});
}

/**
 * Select a location from suggestions
 */
function selectLocation(location) {
	selectedLocation = location;
	locationInput.value = location.name;
	suggestionsEl.classList.remove('active');
	errorEl.innerHTML = '';
}

/**
 * Search for airports
 */
searchBtn.addEventListener('click', async () => {
	if (!selectedLocation) {
		showError('Please select a location from the suggestions.');
		return;
	}

	const range = parseInt(rangeInput.value);
	
	searchBtn.disabled = true;
	searchBtn.textContent = 'Searching...';
	errorEl.innerHTML = '';
	resultsEl.classList.remove('active');
	
	try {
		await searchAirports(selectedLocation.lat, selectedLocation.lon, range);
	} catch (error) {
		showError(error.message);
	} finally {
		searchBtn.disabled = false;
		searchBtn.textContent = 'Search Airports';
	}
});

/**
 * Search airports using OurAirports CSV data
 */
async function searchAirports(lat, lon, rangeKm) {
	try {
		// Fetch airports CSV from OurAirports
		const response = await fetch('https://davidmegginson.github.io/ourairports-data/airports.csv');
		
		if (!response.ok) throw new Error('Failed to fetch airport data');
		
		const csvText = await response.text();
		const allAirports = parseAirportCSV(csvText);
		
		// Filter for commercial airports with IATA codes
		const commercialAirports = allAirports.filter(airport => 
			airport.iata_code && 
			airport.iata_code.length === 3 &&
			(airport.type === 'large_airport' || airport.type === 'medium_airport') &&
			airport.latitude_deg &&
			airport.longitude_deg
		);

		// Calculate distances
		let airportsWithDistance;
		
		if (distanceMode === 'straight') {
			// Straight-line distance
			airportsWithDistance = commercialAirports
				.map(airport => ({
					...airport,
					distance: calculateDistance(
						lat, 
						lon, 
						parseFloat(airport.latitude_deg), 
						parseFloat(airport.longitude_deg)
					)
				}))
				.filter(airport => airport.distance <= rangeKm)
				.sort((a, b) => a.distance - b.distance);
		} else {
			// Driving distance using OSRM
			// First filter by straight-line to reduce API calls
			const nearbyAirports = commercialAirports
				.map(airport => ({
					...airport,
					straightDistance: calculateDistance(
						lat, 
						lon, 
						parseFloat(airport.latitude_deg), 
						parseFloat(airport.longitude_deg)
					)
				}))
				.filter(airport => airport.straightDistance <= rangeKm * 1.5) // 1.5x buffer
				.sort((a, b) => a.straightDistance - b.straightDistance)
				.slice(0, 20); // Limit to 20 closest to avoid too many API calls
			
			// Calculate driving distances
			airportsWithDistance = await calculateDrivingDistances(lat, lon, nearbyAirports, rangeKm);
		}

		displayResults(airportsWithDistance);
	} catch (error) {
		console.error('Airport search error:', error);
		throw new Error('Failed to search airports. Please try again.');
	}
}

/**
 * Calculate driving distances using OSRM API
 */
async function calculateDrivingDistances(lat, lon, airports, maxRange) {
	const results = [];
	
	for (const airport of airports) {
		try {
			const response = await fetch(
				`https://router.project-osrm.org/route/v1/driving/` +
				`${lon},${lat};${airport.longitude_deg},${airport.latitude_deg}?overview=false`
			);
			
			if (response.ok) {
				const data = await response.json();
				if (data.routes && data.routes[0]) {
					const distanceKm = Math.round(data.routes[0].distance / 1000 * 10) / 10;
					if (distanceKm <= maxRange) {
						results.push({
							...airport,
							distance: distanceKm
						});
					}
				}
			}
			
			// Small delay to avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, 100));
		} catch (error) {
			console.warn(`Failed to calculate driving distance for ${airport.name}:`, error);
		}
	}
	
	return results.sort((a, b) => a.distance - b.distance);
}

/**
 * Parse OurAirports CSV data
 */
function parseAirportCSV(csvText) {
	const lines = csvText.split('\n');
	const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
	
	return lines.slice(1).map(line => {
		// Simple CSV parser (handles quoted fields)
		const values = [];
		let current = '';
		let inQuotes = false;
		
		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (char === '"') {
				inQuotes = !inQuotes;
			} else if (char === ',' && !inQuotes) {
				values.push(current.trim());
				current = '';
			} else {
				current += char;
			}
		}
		values.push(current.trim());
		
		const airport = {};
		headers.forEach((header, index) => {
			airport[header] = values[index] || '';
		});
		
		return airport;
	}).filter(airport => airport.id); // Remove empty rows
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371; // Earth's radius in km
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	
	const a = 
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);
	
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = R * c;
	
	return Math.round(distance * 10) / 10; // Round to 1 decimal
}

function toRad(degrees) {
	return degrees * (Math.PI / 180);
}

/**
 * Display search results
 */
function displayResults(airports) {
	if (airports.length === 0) {
		airportListEl.innerHTML = `
			<div class="empty-state">
				<svg fill="currentColor" viewBox="0 0 24 24">
					<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
				</svg>
				<h3>No airports found</h3>
				<p>Try increasing the search radius or selecting a different location.</p>
			</div>
		`;
	} else {
		airportListEl.innerHTML = airports.map((airport, index) => `
			<div class="airport-card" style="animation-delay: ${index * 0.05}s">
				<div class="airport-header">
					<div>
						<div class="airport-name">${airport.name}</div>
						<div class="airport-location">
							${airport.municipality || ''}${airport.municipality && airport.iso_country ? ', ' : ''}${airport.iso_country || ''}
						</div>
					</div>
					<div class="airport-code">${airport.iata_code}</div>
				</div>
				<div class="airport-distance">${airport.distance} km away</div>
			</div>
		`).join('');
	}

	resultsCountEl.textContent = `${airports.length} found`;
	resultsEl.classList.add('active');
}

/**
 * Show error message
 */
function showError(message) {
	errorEl.innerHTML = `<div class="error">${message}</div>`;
}
