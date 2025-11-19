import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';
import { trackEvent } from '../utils/analytics.js';

export default function Onboarding() {
	const navigate = useNavigate();
	const { locale, t } = useI18n();
	const [step, setStep] = useState(1);
	const [formData, setFormData] = useState({
		childAge: '',
		interests: [],
		location: '',
		newsletter: true
	});
	const [loading, setLoading] = useState(false);

	const isFrench = locale === 'fr';

	const interests = isFrench 
		? ['Sport', 'Musique', 'Arts', 'Danse', 'Théâtre', 'Sciences', 'Nature', 'Lecture']
		: ['Sports', 'Music', 'Arts', 'Dance', 'Theater', 'Science', 'Nature', 'Reading'];

	const handleInterestToggle = (interest) => {
		setFormData(prev => ({
			...prev,
			interests: prev.interests.includes(interest)
				? prev.interests.filter(i => i !== interest)
				: [...prev.interests, interest]
		}));
	};

	const handleNext = () => {
		if (step < 4) {
			setStep(step + 1);
			trackEvent('Onboarding', 'Step Completed', `Step ${step}`);
		}
	};

	const handleSkip = () => {
		trackEvent('Onboarding', 'Skipped', `Step ${step}`);
		if (step < 4) {
			setStep(step + 1);
		} else {
			handleComplete();
		}
	};

	const handleComplete = async () => {
		setLoading(true);
		try {
			// Save onboarding data to user profile
			await api('/users/onboarding', {
				method: 'POST',
				body: {
					childAge: formData.childAge,
					interests: formData.interests,
					location: formData.location,
					newsletter: formData.newsletter,
					onboardingCompleted: true
				}
			});
			
			trackEvent('Onboarding', 'Completed', 'Full Flow');
			navigate('/');
		} catch (err) {
			console.error('Failed to save onboarding:', err);
			// Continue anyway
			navigate('/');
		} finally {
			setLoading(false);
		}
	};

	// Step 1: Welcome
	if (step === 1) {
		return (
			<div style={{ 
				display: 'flex', 
				flexDirection: 'column', 
				alignItems: 'center', 
				justifyContent: 'center', 
				minHeight: '80vh',
				padding: 20,
				maxWidth: 600,
				margin: '0 auto',
				textAlign: 'center'
			}}>
				<div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
				<h1 style={{ marginBottom: 16 }}>
					{isFrench ? 'Bienvenue sur Parc Ton Gosse !' : 'Welcome to Parc Ton Gosse!'}
				</h1>
				<p style={{ fontSize: 18, color: '#666', marginBottom: 30, lineHeight: 1.6 }}>
					{isFrench 
						? 'Découvrez les meilleures activités pour enfants à Paris. Personnalisez votre expérience en quelques clics.'
						: 'Discover the best children\'s activities in Paris. Personalize your experience in just a few clicks.'}
				</p>
				<div style={{ display: 'flex', gap: 12, marginTop: 30 }}>
					<button
						onClick={handleSkip}
						style={{
							padding: '12px 24px',
							background: 'transparent',
							color: '#666',
							border: '1px solid #ddd',
							borderRadius: 4,
							cursor: 'pointer'
						}}
					>
						{isFrench ? 'Passer' : 'Skip'}
					</button>
					<button
						onClick={handleNext}
						style={{
							padding: '12px 24px',
							background: '#007bff',
							color: 'white',
							border: 'none',
							borderRadius: 4,
							cursor: 'pointer'
						}}
					>
						{isFrench ? 'Commencer' : 'Get Started'}
					</button>
				</div>
				<div style={{ marginTop: 40, fontSize: 12, color: '#999' }}>
					{step} / 4
				</div>
			</div>
		);
	}

	// Step 2: Child Age
	if (step === 2) {
		return (
			<div style={{ 
				display: 'flex', 
				flexDirection: 'column', 
				alignItems: 'center', 
				justifyContent: 'center', 
				minHeight: '80vh',
				padding: 20,
				maxWidth: 500,
				margin: '0 auto'
			}}>
				<h2 style={{ marginBottom: 8 }}>
					{isFrench ? 'Quel est l\'âge de votre enfant ?' : 'What is your child\'s age?'}
				</h2>
				<p style={{ color: '#666', marginBottom: 30, textAlign: 'center' }}>
					{isFrench 
						? 'Cela nous aidera à vous recommander les meilleures activités.'
						: 'This will help us recommend the best activities for you.'}
				</p>
				<div style={{ display: 'grid', gap: 12, width: '100%', marginBottom: 30 }}>
					{['0-2', '3-5', '6-8', '9-12', '13+'].map(age => (
						<button
							key={age}
							onClick={() => {
								setFormData(prev => ({ ...prev, childAge: age }));
								setTimeout(handleNext, 300);
							}}
							style={{
								padding: '16px',
								background: formData.childAge === age ? '#007bff' : 'white',
								color: formData.childAge === age ? 'white' : '#333',
								border: `2px solid ${formData.childAge === age ? '#007bff' : '#ddd'}`,
								borderRadius: 8,
								cursor: 'pointer',
								fontSize: 16,
								fontWeight: formData.childAge === age ? 'bold' : 'normal'
							}}
						>
							{age} {isFrench ? 'ans' : 'years'}
						</button>
					))}
				</div>
				<button
					onClick={handleSkip}
					style={{
						padding: '8px 16px',
						background: 'transparent',
						color: '#666',
						border: 'none',
						cursor: 'pointer',
						fontSize: 14
					}}
				>
					{isFrench ? 'Passer' : 'Skip'}
				</button>
				<div style={{ marginTop: 20, fontSize: 12, color: '#999' }}>
					{step} / 4
				</div>
			</div>
		);
	}

	// Step 3: Interests
	if (step === 3) {
		return (
			<div style={{ 
				display: 'flex', 
				flexDirection: 'column', 
				alignItems: 'center', 
				justifyContent: 'center', 
				minHeight: '80vh',
				padding: 20,
				maxWidth: 600,
				margin: '0 auto'
			}}>
				<h2 style={{ marginBottom: 8 }}>
					{isFrench ? 'Quels sont les centres d\'intérêt ?' : 'What are their interests?'}
				</h2>
				<p style={{ color: '#666', marginBottom: 30, textAlign: 'center' }}>
					{isFrench 
						? 'Sélectionnez tout ce qui les intéresse (vous pouvez en choisir plusieurs).'
						: 'Select everything that interests them (you can choose multiple).'}
				</p>
				<div style={{ 
					display: 'grid', 
					gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
					gap: 12, 
					width: '100%',
					marginBottom: 30
				}}>
					{interests.map(interest => (
						<button
							key={interest}
							onClick={() => handleInterestToggle(interest)}
							style={{
								padding: '12px 16px',
								background: formData.interests.includes(interest) ? '#28a745' : 'white',
								color: formData.interests.includes(interest) ? 'white' : '#333',
								border: `2px solid ${formData.interests.includes(interest) ? '#28a745' : '#ddd'}`,
								borderRadius: 8,
								cursor: 'pointer',
								fontSize: 14
							}}
						>
							{interest}
						</button>
					))}
				</div>
				<div style={{ display: 'flex', gap: 12 }}>
					<button
						onClick={handleSkip}
						style={{
							padding: '12px 24px',
							background: 'transparent',
							color: '#666',
							border: '1px solid #ddd',
							borderRadius: 4,
							cursor: 'pointer'
						}}
					>
						{isFrench ? 'Passer' : 'Skip'}
					</button>
					<button
						onClick={handleNext}
						disabled={formData.interests.length === 0}
						style={{
							padding: '12px 24px',
							background: formData.interests.length === 0 ? '#ccc' : '#007bff',
							color: 'white',
							border: 'none',
							borderRadius: 4,
							cursor: formData.interests.length === 0 ? 'not-allowed' : 'pointer'
						}}
					>
						{isFrench ? 'Continuer' : 'Continue'}
					</button>
				</div>
				<div style={{ marginTop: 20, fontSize: 12, color: '#999' }}>
					{step} / 4
				</div>
			</div>
		);
	}

	// Step 4: Location & Newsletter
	if (step === 4) {
		return (
			<div style={{ 
				display: 'flex', 
				flexDirection: 'column', 
				alignItems: 'center', 
				justifyContent: 'center', 
				minHeight: '80vh',
				padding: 20,
				maxWidth: 500,
				margin: '0 auto'
			}}>
				<h2 style={{ marginBottom: 8 }}>
					{isFrench ? 'Presque terminé !' : 'Almost Done!'}
				</h2>
				<p style={{ color: '#666', marginBottom: 30, textAlign: 'center' }}>
					{isFrench 
						? 'Quelques dernières informations pour personnaliser votre expérience.'
						: 'A few final details to personalize your experience.'}
				</p>
				<div style={{ display: 'grid', gap: 20, width: '100%', marginBottom: 30 }}>
					<div>
						<label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
							{isFrench ? 'Quartier (optionnel)' : 'Neighborhood (optional)'}
						</label>
						<input
							type="text"
							placeholder={isFrench ? 'Ex: 11ème arrondissement' : 'Ex: 11th arrondissement'}
							value={formData.location}
							onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
							style={{
								width: '100%',
								padding: 12,
								border: '1px solid #ddd',
								borderRadius: 4,
								fontSize: 16
							}}
						/>
					</div>
					<div>
						<label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
							<input
								type="checkbox"
								checked={formData.newsletter}
								onChange={(e) => setFormData(prev => ({ ...prev, newsletter: e.target.checked }))}
								style={{ width: 20, height: 20 }}
							/>
							<span>
								{isFrench 
									? 'Recevoir des recommandations d\'activités par email'
									: 'Receive activity recommendations by email'}
							</span>
						</label>
					</div>
				</div>
				<div style={{ display: 'flex', gap: 12 }}>
					<button
						onClick={handleSkip}
						style={{
							padding: '12px 24px',
							background: 'transparent',
							color: '#666',
							border: '1px solid #ddd',
							borderRadius: 4,
							cursor: 'pointer'
						}}
					>
						{isFrench ? 'Passer' : 'Skip'}
					</button>
					<button
						onClick={handleComplete}
						disabled={loading}
						style={{
							padding: '12px 24px',
							background: loading ? '#ccc' : '#28a745',
							color: 'white',
							border: 'none',
							borderRadius: 4,
							cursor: loading ? 'not-allowed' : 'pointer'
						}}
					>
						{loading 
							? (isFrench ? 'Enregistrement...' : 'Saving...')
							: (isFrench ? 'Terminer' : 'Complete')
						}
					</button>
				</div>
				<div style={{ marginTop: 20, fontSize: 12, color: '#999' }}>
					{step} / 4
				</div>
			</div>
		);
	}

	return null;
}

