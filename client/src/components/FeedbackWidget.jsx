import React, { useState } from 'react';
import { useI18n } from '../shared/i18n.jsx';
import { api } from '../shared/api.js';

export default function FeedbackWidget() {
	const { locale, t } = useI18n();
	const [isOpen, setIsOpen] = useState(false);
	const [showFeedback, setShowFeedback] = useState(false);
	const [showAddOrg, setShowAddOrg] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [message, setMessage] = useState('');

	// Feedback form state
	const [feedback, setFeedback] = useState({
		feedback: '',
		rating: '',
		category: '',
		suggestion: ''
	});

	// Add organization form state
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

	const handleFeedbackSubmit = async (e) => {
		e.preventDefault();
		setSubmitting(true);
		setMessage('');

		try {
			await api('/feedback/submit', {
				method: 'POST',
				body: feedback
			});
			setMessage(locale === 'fr' ? 'Merci pour votre feedback!' : 'Thank you for your feedback!');
			setFeedback({ feedback: '', rating: '', category: '', suggestion: '' });
			setTimeout(() => {
				setShowFeedback(false);
				setMessage('');
			}, 2000);
		} catch (err) {
			setMessage(locale === 'fr' ? 'Erreur lors de l\'envoi' : 'Error submitting feedback');
		} finally {
			setSubmitting(false);
		}
	};

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
			setTimeout(() => {
				setShowAddOrg(false);
				setMessage('');
			}, 2000);
		} catch (err) {
			setMessage(locale === 'fr' ? 'Erreur lors de l\'envoi' : 'Error submitting');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<>
			{/* Floating Button */}
			<div
				onClick={() => setIsOpen(!isOpen)}
				style={{
					position: 'fixed',
					bottom: 20,
					right: 20,
					width: 60,
					height: 60,
					borderRadius: '50%',
					background: '#007bff',
					color: 'white',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					cursor: 'pointer',
					boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
					zIndex: 1000,
					fontSize: 24,
					transition: 'transform 0.2s'
				}}
				onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
				onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
			>
				💬
			</div>

			{/* Overlay */}
			{isOpen && (
				<div
					onClick={() => { setIsOpen(false); setShowFeedback(false); setShowAddOrg(false); }}
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'rgba(0,0,0,0.5)',
						zIndex: 999
					}}
				/>
			)}

			{/* Menu */}
			{isOpen && !showFeedback && !showAddOrg && (
				<div style={{
					position: 'fixed',
					bottom: 90,
					right: 20,
					background: 'white',
					borderRadius: 12,
					padding: 16,
					boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
					zIndex: 1000,
					minWidth: 200
				}}>
					<button
						onClick={() => { setShowFeedback(true); setShowAddOrg(false); }}
						style={{
							width: '100%',
							padding: '12px 16px',
							marginBottom: 8,
							background: '#28a745',
							color: 'white',
							border: 'none',
							borderRadius: 6,
							cursor: 'pointer',
							fontSize: 14
						}}
					>
						💬 {locale === 'fr' ? 'Donner des commentaires' : 'Give Feedback'}
					</button>
					<button
						onClick={() => { setShowAddOrg(true); setShowFeedback(false); }}
						style={{
							width: '100%',
							padding: '12px 16px',
							background: '#17a2b8',
							color: 'white',
							border: 'none',
							borderRadius: 6,
							cursor: 'pointer',
							fontSize: 14
						}}
					>
						➕ {locale === 'fr' ? 'Ajouter une organisation' : 'Add Organization'}
					</button>
				</div>
			)}

			{/* Feedback Form */}
			{showFeedback && (
				<div style={{
					position: 'fixed',
					bottom: 90,
					right: 20,
					background: 'white',
					borderRadius: 12,
					padding: 20,
					boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
					zIndex: 1000,
					maxWidth: 400,
					maxHeight: '80vh',
					overflowY: 'auto'
				}}>
					<h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>
						{locale === 'fr' ? 'Vos Commentaires' : 'Your Feedback'}
					</h3>
					<form onSubmit={handleFeedbackSubmit}>
						<label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
							{locale === 'fr' ? 'Évaluation*' : 'Rating*'}
						</label>
						<select
							value={feedback.rating}
							onChange={(e) => setFeedback({ ...feedback, rating: e.target.value })}
							required
							style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4 }}
						>
							<option value="">{locale === 'fr' ? '-- Choisir --' : '-- Select --'}</option>
							<option value="excellent">{locale === 'fr' ? '⭐ Excellent' : '⭐ Excellent'}</option>
							<option value="good">{locale === 'fr' ? '👍 Bien' : '👍 Good'}</option>
							<option value="average">{locale === 'fr' ? '😐 Moyen' : '😐 Average'}</option>
							<option value="poor">{locale === 'fr' ? '👎 Faible' : '👎 Poor'}</option>
						</select>

						<label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
							{locale === 'fr' ? 'Commentaires*' : 'Feedback*'}
						</label>
						<textarea
							value={feedback.feedback}
							onChange={(e) => setFeedback({ ...feedback, feedback: e.target.value })}
							required
							rows={4}
							placeholder={locale === 'fr' ? 'Partagez vos impressions...' : 'Share your thoughts...'}
							style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4, resize: 'vertical' }}
						/>

						<label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
							{locale === 'fr' ? 'Catégorie' : 'Category'}
						</label>
						<select
							value={feedback.category}
							onChange={(e) => setFeedback({ ...feedback, category: e.target.value })}
							style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4 }}
						>
							<option value="">{locale === 'fr' ? '-- Choisir --' : '-- Select --'}</option>
							<option value="bug">{locale === 'fr' ? '🐛 Problème technique' : '🐛 Bug'}</option>
							<option value="feature">{locale === 'fr' ? '💡 Suggestion' : '💡 Feature Request'}</option>
							<option value="design">{locale === 'fr' ? '🎨 Design' : '🎨 Design'}</option>
							<option value="content">{locale === 'fr' ? '📝 Contenu' : '📝 Content'}</option>
							<option value="other">{locale === 'fr' ? '⚙️ Autre' : '⚙️ Other'}</option>
						</select>

						<label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
							{locale === 'fr' ? 'Idée/Suggestion' : 'Idea/Suggestion'}
						</label>
						<textarea
							value={feedback.suggestion}
							onChange={(e) => setFeedback({ ...feedback, suggestion: e.target.value })}
							rows={2}
							placeholder={locale === 'fr' ? 'Avez-vous des idées à partager?' : 'Do you have ideas to share?'}
							style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4, resize: 'vertical' }}
						/>

						{message && (
							<div style={{ padding: 8, marginBottom: 12, borderRadius: 4, background: message.includes('Erreur') ? '#f8d7da' : '#d4edda', color: message.includes('Erreur') ? '#721c24' : '#155724' }}>
								{message}
							</div>
						)}

						<div style={{ display: 'flex', gap: 8 }}>
							<button
								type="submit"
								disabled={submitting}
								style={{
									flex: 1,
									padding: '10px 16px',
									background: '#28a745',
									color: 'white',
									border: 'none',
									borderRadius: 6,
									cursor: submitting ? 'not-allowed' : 'pointer',
									fontSize: 14
								}}
							>
								{locale === 'fr' ? 'Envoyer' : 'Submit'}
							</button>
							<button
								type="button"
								onClick={() => { setShowFeedback(false); setMessage(''); }}
								style={{
									padding: '10px 16px',
									background: '#6c757d',
									color: 'white',
									border: 'none',
									borderRadius: 6,
									cursor: 'pointer',
									fontSize: 14
								}}
							>
								{locale === 'fr' ? 'Annuler' : 'Cancel'}
							</button>
						</div>
					</form>
				</div>
			)}

			{/* Add Organization Form */}
			{showAddOrg && (
				<div style={{
					position: 'fixed',
					bottom: 90,
					right: 20,
					background: 'white',
					borderRadius: 12,
					padding: 20,
					boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
					zIndex: 1000,
					maxWidth: 450,
					maxHeight: '80vh',
					overflowY: 'auto'
				}}>
					<h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>
						{locale === 'fr' ? 'Suggérer une Organisation' : 'Suggest Organization'}
					</h3>
					<form onSubmit={handleAddOrgSubmit}>
						<label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
							{locale === 'fr' ? 'Nom de l\'organisation*' : 'Organization Name*'}
						</label>
						<input
							type="text"
							value={newOrg.organizationName}
							onChange={(e) => setNewOrg({ ...newOrg, organizationName: e.target.value })}
							required
							style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4 }}
						/>

						<label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
							{locale === 'fr' ? 'Email*' : 'Email*'}
						</label>
						<input
							type="email"
							value={newOrg.organizationEmail}
							onChange={(e) => setNewOrg({ ...newOrg, organizationEmail: e.target.value })}
							required
							style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4 }}
						/>

						<label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
							{locale === 'fr' ? 'Téléphone' : 'Phone'}
						</label>
						<input
							type="tel"
							value={newOrg.organizationPhone}
							onChange={(e) => setNewOrg({ ...newOrg, organizationPhone: e.target.value })}
							style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4 }}
						/>

						<label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
							{locale === 'fr' ? 'Adresse' : 'Address'}
						</label>
						<textarea
							value={newOrg.organizationAddress}
							onChange={(e) => setNewOrg({ ...newOrg, organizationAddress: e.target.value })}
							rows={2}
							style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4 }}
						/>

						<label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
							{locale === 'fr' ? 'Nom de l\'activité*' : 'Activity Name*'}
						</label>
						<input
							type="text"
							value={newOrg.activityName}
							onChange={(e) => setNewOrg({ ...newOrg, activityName: e.target.value })}
							required
							style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4 }}
						/>

						<label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
							{locale === 'fr' ? 'Description*' : 'Description*'}
						</label>
						<textarea
							value={newOrg.activityDescription}
							onChange={(e) => setNewOrg({ ...newOrg, activityDescription: e.target.value })}
							required
							rows={3}
							style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4, resize: 'vertical' }}
						/>

						<label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
							{locale === 'fr' ? 'Type d\'activité' : 'Activity Type'}
						</label>
						<input
							type="text"
							value={newOrg.activityType}
							onChange={(e) => setNewOrg({ ...newOrg, activityType: e.target.value })}
							style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4 }}
						/>

						<label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
							{locale === 'fr' ? 'Catégories (séparées par virgule)' : 'Categories (comma-separated)'}
						</label>
						<input
							type="text"
							value={newOrg.categories}
							onChange={(e) => setNewOrg({ ...newOrg, categories: e.target.value })}
							placeholder={locale === 'fr' ? 'Ex: Sports, Arts' : 'e.g. Sports, Arts'}
							style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4 }}
						/>

						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
							<div>
								<label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
									{locale === 'fr' ? 'Âge min' : 'Min Age'}
								</label>
								<input
									type="number"
									value={newOrg.ageMin}
									onChange={(e) => setNewOrg({ ...newOrg, ageMin: e.target.value })}
									style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
								/>
							</div>
							<div>
								<label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
									{locale === 'fr' ? 'Âge max' : 'Max Age'}
								</label>
								<input
									type="number"
									value={newOrg.ageMax}
									onChange={(e) => setNewOrg({ ...newOrg, ageMax: e.target.value })}
									style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
								/>
							</div>
						</div>

						<label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
							{locale === 'fr' ? 'Prix' : 'Price'}
						</label>
						<input
							type="text"
							value={newOrg.price}
							onChange={(e) => setNewOrg({ ...newOrg, price: e.target.value })}
							placeholder={locale === 'fr' ? 'Ex: 250€ ou Gratuit' : 'e.g. 250€ or Free'}
							style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4 }}
						/>

						<label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
							{locale === 'fr' ? 'Lien du site web' : 'Website Link'}
						</label>
						<input
							type="url"
							value={newOrg.websiteLink}
							onChange={(e) => setNewOrg({ ...newOrg, websiteLink: e.target.value })}
							placeholder="https://..."
							style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4 }}
						/>

						<label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
							{locale === 'fr' ? 'Informations additionnelles' : 'Additional Information'}
						</label>
						<textarea
							value={newOrg.additionalInfo}
							onChange={(e) => setNewOrg({ ...newOrg, additionalInfo: e.target.value })}
							rows={2}
							style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4, resize: 'vertical' }}
						/>

						{message && (
							<div style={{ padding: 8, marginBottom: 12, borderRadius: 4, background: message.includes('Erreur') ? '#f8d7da' : '#d4edda', color: message.includes('Erreur') ? '#721c24' : '#155724' }}>
								{message}
							</div>
						)}

						<div style={{ display: 'flex', gap: 8 }}>
							<button
								type="submit"
								disabled={submitting}
								style={{
									flex: 1,
									padding: '10px 16px',
									background: '#17a2b8',
									color: 'white',
									border: 'none',
									borderRadius: 6,
									cursor: submitting ? 'not-allowed' : 'pointer',
									fontSize: 14
								}}
							>
								{locale === 'fr' ? 'Soumettre' : 'Submit'}
							</button>
							<button
								type="button"
								onClick={() => { setShowAddOrg(false); setMessage(''); }}
								style={{
									padding: '10px 16px',
									background: '#6c757d',
									color: 'white',
									border: 'none',
									borderRadius: 6,
									cursor: 'pointer',
									fontSize: 14
								}}
							>
								{locale === 'fr' ? 'Annuler' : 'Cancel'}
							</button>
						</div>
					</form>
				</div>
			)}
		</>
	);
}

