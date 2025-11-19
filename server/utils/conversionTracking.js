import { v4 as uuidv4 } from 'uuid';

// Helper function to track conversion events
export async function trackConversionEvent(store, event) {
	if (!store.conversionEvents) {
		// If conversion events table doesn't exist, that's okay - it will be created on first use
		return;
	}
	
	try {
		await store.conversionEvents.create({
			id: uuidv4(),
			userId: event.userId || null,
			userEmail: event.userEmail || null,
			eventType: event.eventType,
			eventData: typeof event.eventData === 'string' ? event.eventData : JSON.stringify(event.eventData || {}),
			timestamp: event.timestamp,
			createdAt: event.timestamp,
			updatedAt: event.timestamp
		});
	} catch (e) {
		// If table doesn't exist yet, that's okay - it will be created on first use
		console.error('Failed to track conversion event:', e);
	}
}

