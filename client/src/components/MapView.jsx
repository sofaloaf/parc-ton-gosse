import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../shared/i18n.jsx';

// Dynamically import Leaflet (client-side only)
let L, MarkerClusterGroup;
if (typeof window !== 'undefined') {
	L = window.L;
}

export default function MapView({ activities, locale }) {
	const mapRef = useRef(null);
	const mapInstanceRef = useRef(null);
	const navigate = useNavigate();
	const { t } = useI18n();

	// Removed debug log for production

	useEffect(() => {
		// Load Leaflet CSS and JS dynamically
		const loadLeaflet = async () => {
			if (!window.L) {
				// Load Leaflet CSS
				const link = document.createElement('link');
				link.rel = 'stylesheet';
				link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
				document.head.appendChild(link);

				// Load Leaflet JS
				await new Promise((resolve) => {
					const script = document.createElement('script');
					script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
					script.onload = () => {
						resolve();
					};
					document.body.appendChild(script);
				});

				// Load marker cluster CSS
				const clusterLink = document.createElement('link');
				clusterLink.rel = 'stylesheet';
				clusterLink.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
				document.head.appendChild(clusterLink);

				// Load marker cluster JS
				await new Promise((resolve) => {
					const script = document.createElement('script');
					script.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
					script.onload = resolve;
					document.body.appendChild(script);
				});
			}

			L = window.L;
			MarkerClusterGroup = window.L.markerClusterGroup;
			
			// Removed debug log for production

			// Initialize map
			if (!mapInstanceRef.current && mapRef.current) {
				const map = L.map(mapRef.current).setView([48.8566, 2.3522], 12); // Paris center

				// Add OpenStreetMap tiles
				L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: '© OpenStreetMap contributors',
					maxZoom: 19
				}).addTo(map);

				mapInstanceRef.current = map;
			}

			// Add markers for activities with addresses
			if (mapInstanceRef.current && activities.length > 0) {
				// Removed debug log for production
				const markers = [];

				activities.forEach(activity => {
					const addressStr = activity.addresse || activity.address || '';
					if (!addressStr) {
						// Removed debug log for production
						return;
					}
					// Removed debug log for production

					// Split multi-line addresses
					const addresses = splitAddresses(addressStr);
					if (addresses.length === 0) return;

					const title = activity.title?.[locale] || activity.title?.en || activity.title?.fr || activity.title || 'Activity';
					const description = activity.description?.[locale] || activity.description?.en || activity.description?.fr || '';

					// Create a marker for each address
					addresses.forEach((addr, index) => {
						const coords = geocodeAddress(addr, activity.neighborhood);
						if (coords) {
							const marker = L.marker(coords);
							
							// Use shorter address line in popup
							const displayAddr = addr.split('\n')[0];
							const popupContent = `
								<div style="min-width: 200px;">
									<h3 style="margin: 0 0 8px 0; font-size: 16px;">${title}${addresses.length > 1 ? ` (#${index + 1})` : ''}</h3>
									${description ? `<p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${description.substring(0, 100)}...</p>` : ''}
									<p style="margin: 0 0 8px 0; font-size: 12px; color: #888;">${displayAddr.substring(0, 80)}${displayAddr.length > 80 ? '...' : ''}</p>
									<button onclick="window.openActivity('${activity.id}')" style="padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;">View Details</button>
								</div>
							`;

							marker.bindPopup(popupContent);
							marker.activityId = activity.id;
							marker.on('click', () => navigate(`/activity/${activity.id}`));

							markers.push(marker);
						}
					});
				});

				// Fit map to show all markers
				if (markers.length > 0) {
					const group = new MarkerClusterGroup();
					markers.forEach(marker => group.addLayer(marker));
					mapInstanceRef.current.addLayer(group);
					
					const bounds = L.latLngBounds(markers.map(m => m.getLatLng()));
					mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
				}
			}

			// Expose openActivity globally for popup buttons
			window.openActivity = (id) => {
				navigate(`/activity/${id}`);
			};
		};

		loadLeaflet();

		return () => {
			if (mapInstanceRef.current) {
				mapInstanceRef.current.remove();
				mapInstanceRef.current = null;
			}
			if (window.openActivity) {
				delete window.openActivity;
			}
		};
	}, [activities, locale, navigate]);

	// Split multi-line addresses into individual addresses
	function splitAddresses(addressStr) {
		if (!addressStr) return [];
		
		// Split by newlines and filter empty lines
		return addressStr.split('\n')
			.map(line => line.trim())
			.filter(line => line.length > 0);
	}

	// Geocode address to coordinates (simplified version using neighborhoods)
	function geocodeAddress(address, neighborhood) {
		// Paris arrondissement coordinates
		const neighborhoods = {
			'1er': [48.8606, 2.3376],
			'2e': [48.8698, 2.3411],
			'3e': [48.8630, 2.3628],
			'4e': [48.8546, 2.3522],
			'5e': [48.8449, 2.3437],
			'6e': [48.8506, 2.3376],
			'7e': [48.8566, 2.3192],
			'8e': [48.8708, 2.3188],
			'9e': [48.8759, 2.3437],
			'10e': [48.8729, 2.3628],
			'11e': [48.8630, 2.3706],
			'12e': [48.8449, 2.3706],
			'13e': [48.8333, 2.3561],
			'14e': [48.8333, 2.3266],
			'15e': [48.8422, 2.2995],
			'16e': [48.8616, 2.2844],
			'17e': [48.8891, 2.3192],
			'18e': [48.8931, 2.3475],
			'19e': [48.8827, 2.3727],
			'20e': [48.8616, 2.3988]
		};

		// Try to match neighborhood
		if (neighborhood) {
			const match = neighborhood.match(/(\d+)/);
			if (match && neighborhoods[neighborhood]) {
				return neighborhoods[neighborhood];
			}
		}

		// Try to extract from address
		for (const [key, coords] of Object.entries(neighborhoods)) {
			if (address.includes(key)) {
				return coords;
			}
		}

		// Default to Paris center
		return [48.8566, 2.3522];
	}

	const activitiesWithAddresses = activities.filter(a => a.addresse || a.address);

	return (
		<div style={{ width: '100%', height: '600px', position: 'relative' }}>
			<div 
				ref={mapRef} 
				style={{ width: '100%', height: '100%', zIndex: 1 }} 
			/>
			{activitiesWithAddresses.length === 0 && (
				<div style={{ 
					position: 'absolute', 
					top: '50%', 
					left: '50%', 
					transform: 'translate(-50%, -50%)',
					background: 'white',
					padding: '20px',
					borderRadius: '8px',
					boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
					zIndex: 1000,
					textAlign: 'center'
				}}>
					<p>{t.noAddresses || 'No activities with addresses found'}</p>
				</div>
			)}
		</div>
	);
}

