import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';

export default function RegistrationFlow() {
	const { activityId } = useParams();
	const { locale, t } = useI18n();
	const [form, setForm] = useState({ childName: '', parentName: '', email: '', age: '', specialRequests: '' });
	const [status, setStatus] = useState('');
	const [activity, setActivity] = useState(null);
	
	useEffect(() => {
		api(`/activities/${activityId}`).then(setActivity).catch(err => {
			if (process.env.NODE_ENV === 'development') {
				console.error('Failed to load activity:', err);
			}
		});
	}, [activityId]);
	
	async function onSubmit(e) {
		e.preventDefault();
		setStatus('Submitting...');
		try {
			// Submit to public registration endpoint
			const reg = await api('/registrations/public', { 
				method: 'POST', 
				body: { 
					activityId, 
					organizationName: activity?.providerId || activity?.organizationName || '',
					childName: form.childName,
					parentName: form.parentName,
					email: form.email,
					age: form.age,
					specialRequests: form.specialRequests
				} 
			});
			setStatus(locale === 'fr' ? 'Inscription réussie! Vos informations ont été enregistrées.' : 'Registration successful! Your information has been saved.');
		} catch (e) {
			setStatus(`Error: ${e.message}`);
		}
	}
	return (
		<form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
			<h2>{locale === 'fr' ? 'Formulaire d\'inscription' : 'Registration Form'}</h2>
			<input 
				placeholder={locale === 'fr' ? 'Nom du parent' : 'Parent name'} 
				value={form.parentName} 
				onChange={(e) => setForm({ ...form, parentName: e.target.value })} 
				required
			/>
			<input 
				type="email"
				placeholder={locale === 'fr' ? 'Adresse e-mail' : 'Email address'} 
				value={form.email} 
				onChange={(e) => setForm({ ...form, email: e.target.value })} 
				required
			/>
			<input 
				placeholder={locale === 'fr' ? 'Nom de l\'enfant' : 'Child name'} 
				value={form.childName} 
				onChange={(e) => setForm({ ...form, childName: e.target.value })} 
				required
			/>
			<input 
				type="number"
				placeholder={locale === 'fr' ? 'Âge' : 'Age'} 
				value={form.age} 
				onChange={(e) => setForm({ ...form, age: e.target.value })} 
				required
			/>
			<textarea 
				placeholder={locale === 'fr' ? 'Demandes spéciales' : 'Special requests'} 
				value={form.specialRequests} 
				onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} 
				rows={4}
			/>
			<button type="submit" style={{
				padding: '12px 24px',
				background: '#007bff',
				color: 'white',
				border: 'none',
				borderRadius: 4,
				cursor: 'pointer',
				fontSize: 16
			}}>
				{locale === 'fr' ? 'Réserver' : 'Book'}
			</button>
			{status && <div style={{ padding: 12, background: status.includes('saved') ? '#d4edda' : '#f8d7da', borderRadius: 4 }}>{status}</div>}
		</form>
	);
}
