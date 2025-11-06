import React, { useState } from 'react';
import { api } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';

export default function ProviderDashboard() {
	const { locale, t } = useI18n();
	const [submitting, setSubmitting] = useState(false);
	const [message, setMessage] = useState('');
	const [newOrg, setNewOrg] = useState({
		organizationName: '',
		organizationEmail: '',
		organizationPhone: '',
		organizationAddress: '',
		activityName: '',
		activityDescription: '',
		activityType: '',
		categories: '',
		ageMin: '',
		ageMax: '',
		price: '',
		websiteLink: '',
		additionalInfo: ''
	});

	const handleAddOrgSubmit = async (e) => {
		e.preventDefault();
		setSubmitting(true);
		setMessage('');

		try {
			await api('/feedback/add-organization', {
				method: 'POST',
				body: newOrg
			});
			setMessage(locale === 'fr' ? 'Merci! Votre suggestion sera examinée.' : 'Thank you! Your suggestion will be reviewed.');
			setNewOrg({
				organizationName: '', organizationEmail: '', organizationPhone: '', organizationAddress: '',
				activityName: '', activityDescription: '', activityType: '', categories: '',
				ageMin: '', ageMax: '', price: '', websiteLink: '', additionalInfo: ''
			});
		} catch (err) {
			setMessage(locale === 'fr' ? 'Erreur lors de l\'envoi' : 'Error submitting');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div style={{ display: 'grid', gap: 20, maxWidth: 600 }}>
			<h2>{locale === 'fr' ? 'Ajouter une Organisation' : 'Add Organization'}</h2>
			<form onSubmit={handleAddOrgSubmit} style={{ display: 'grid', gap: 16 }}>
				<div>
					<label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
						{locale === 'fr' ? 'Nom de l\'organisation*' : 'Organization Name*'}
					</label>
					<input
						type="text"
						value={newOrg.organizationName}
						onChange={(e) => setNewOrg({ ...newOrg, organizationName: e.target.value })}
						required
						style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4 }}
					/>
				</div>

				<div>
					<label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
						{locale === 'fr' ? 'Email*' : 'Email*'}
					</label>
					<input
						type="email"
						value={newOrg.organizationEmail}
						onChange={(e) => setNewOrg({ ...newOrg, organizationEmail: e.target.value })}
						required
						style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4 }}
					/>
				</div>

				<div>
					<label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
						{locale === 'fr' ? 'Téléphone' : 'Phone'}
					</label>
					<input
						type="tel"
						value={newOrg.organizationPhone}
						onChange={(e) => setNewOrg({ ...newOrg, organizationPhone: e.target.value })}
						style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4 }}
					/>
				</div>

				<div>
					<label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
						{locale === 'fr' ? 'Adresse' : 'Address'}
					</label>
					<textarea
						value={newOrg.organizationAddress}
						onChange={(e) => setNewOrg({ ...newOrg, organizationAddress: e.target.value })}
						rows={2}
						style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4 }}
					/>
				</div>

				<div>
					<label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
						{locale === 'fr' ? 'Nom de l\'activité*' : 'Activity Name*'}
					</label>
					<input
						type="text"
						value={newOrg.activityName}
						onChange={(e) => setNewOrg({ ...newOrg, activityName: e.target.value })}
						required
						style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4 }}
					/>
				</div>

				<div>
					<label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
						{locale === 'fr' ? 'Description*' : 'Description*'}
					</label>
					<textarea
						value={newOrg.activityDescription}
						onChange={(e) => setNewOrg({ ...newOrg, activityDescription: e.target.value })}
						required
						rows={3}
						style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4, resize: 'vertical' }}
					/>
				</div>

				<div>
					<label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
						{locale === 'fr' ? 'Type d\'activité' : 'Activity Type'}
					</label>
					<input
						type="text"
						value={newOrg.activityType}
						onChange={(e) => setNewOrg({ ...newOrg, activityType: e.target.value })}
						style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4 }}
					/>
				</div>

				<div>
					<label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
						{locale === 'fr' ? 'Catégories (séparées par virgule)' : 'Categories (comma-separated)'}
					</label>
					<input
						type="text"
						value={newOrg.categories}
						onChange={(e) => setNewOrg({ ...newOrg, categories: e.target.value })}
						placeholder={locale === 'fr' ? 'Ex: Sports, Arts' : 'e.g. Sports, Arts'}
						style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4 }}
					/>
				</div>

				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
					<div>
						<label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
							{locale === 'fr' ? 'Âge min' : 'Min Age'}
						</label>
						<input
							type="number"
							value={newOrg.ageMin}
							onChange={(e) => setNewOrg({ ...newOrg, ageMin: e.target.value })}
							style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4 }}
						/>
					</div>
					<div>
						<label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
							{locale === 'fr' ? 'Âge max' : 'Max Age'}
						</label>
						<input
							type="number"
							value={newOrg.ageMax}
							onChange={(e) => setNewOrg({ ...newOrg, ageMax: e.target.value })}
							style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4 }}
						/>
					</div>
				</div>

				<div>
					<label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
						{locale === 'fr' ? 'Prix' : 'Price'}
					</label>
					<input
						type="text"
						value={newOrg.price}
						onChange={(e) => setNewOrg({ ...newOrg, price: e.target.value })}
						placeholder={locale === 'fr' ? 'Ex: 250€ ou Gratuit' : 'e.g. 250€ or Free'}
						style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4 }}
					/>
				</div>

				<div>
					<label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
						{locale === 'fr' ? 'Lien du site web' : 'Website Link'}
					</label>
					<input
						type="url"
						value={newOrg.websiteLink}
						onChange={(e) => setNewOrg({ ...newOrg, websiteLink: e.target.value })}
						placeholder="https://..."
						style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4 }}
					/>
				</div>

				<div>
					<label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
						{locale === 'fr' ? 'Informations additionnelles' : 'Additional Information'}
					</label>
					<textarea
						value={newOrg.additionalInfo}
						onChange={(e) => setNewOrg({ ...newOrg, additionalInfo: e.target.value })}
						rows={2}
						style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4, resize: 'vertical' }}
					/>
				</div>

				{message && (
					<div style={{ padding: 12, borderRadius: 4, background: message.includes('Erreur') ? '#f8d7da' : '#d4edda', color: message.includes('Erreur') ? '#721c24' : '#155724' }}>
						{message}
					</div>
				)}

				<button
					type="submit"
					disabled={submitting}
					style={{
						padding: '12px 24px',
						background: '#17a2b8',
						color: 'white',
						border: 'none',
						borderRadius: 6,
						cursor: submitting ? 'not-allowed' : 'pointer',
						fontSize: 16,
						fontWeight: 500
					}}
				>
					{locale === 'fr' ? 'Soumettre' : 'Submit'}
				</button>
			</form>
		</div>
	);
}


