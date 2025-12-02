import React, { useState, useEffect } from 'react';
import { useI18n } from '../shared/i18n.jsx';
import { api } from '../shared/api.js';
import { translateCategory } from '../utils/categoryTranslations.js';

const neighborhoods = ['1er','2e','3e','4e','5e','6e','7e','8e','9e','10e','11e','12e','13e','14e','15e','16e','17e','18e','19e','20e'];

export default function Filters({ onApply, params = {} }) {
	const { locale, t } = useI18n();
	const [state, setState] = useState({ 
		category: params.category || '', 
		minAge: params.minAge || '', 
		maxAge: params.maxAge || '', 
		minPrice: params.minPrice || '', 
		maxPrice: params.maxPrice || '', 
		neighborhood: params.neighborhood || '' 
	});
	const [categories, setCategories] = useState([]);
	
	// Sync state with params
	useEffect(() => {
		setState({
			category: params.category || '',
			minAge: params.minAge || '',
			maxAge: params.maxAge || '',
			minPrice: params.minPrice || '',
			maxPrice: params.maxPrice || '',
			neighborhood: params.neighborhood || ''
		});
	}, [params]);

	// Fetch categories from actual data
	useEffect(() => {
		api('/activities').then(data => {
			const cats = new Set();
			data.forEach(activity => {
				if (activity.categories && Array.isArray(activity.categories)) {
					activity.categories.forEach(cat => cats.add(cat));
				}
			});
			setCategories(Array.from(cats).sort());
		}).catch(err => {
			if (process.env.NODE_ENV === 'development') {
				console.error('Failed to fetch categories:', err);
			}
			// Fallback to empty array or default categories
		});
	}, [locale]); // Re-fetch when locale changes to ensure categories are updated
	// Count active filters
	const activeFilterCount = Object.values(state).filter(v => v && v !== '').length;
	const hasActiveFilters = activeFilterCount > 0;
	
	return (
		<div style={{ 
			display: 'grid', 
			gap: 12, 
			gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', 
			alignItems: 'end' 
		}}>
			<div>
				<label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500, color: '#334155' }}>
					{t.categories}
					{state.category && <span style={{ marginLeft: 4, color: '#3b82f6' }}>●</span>}
				</label>
				<select 
					value={state.category} 
					onChange={(e) => {
						const newState = { ...state, category: e.target.value };
						setState(newState);
						onApply(newState);
					}} 
					style={{ 
						width: '100%', 
						padding: '8px 12px',
						border: state.category ? '2px solid #3b82f6' : '1px solid #cbd5e1',
						borderRadius: 8,
						fontSize: 14,
						background: state.category ? '#eff6ff' : 'white'
					}}
					aria-label={t.categories}
				>
					<option value="">—</option>
					{categories.map(c => (
						<option key={c} value={c}>
							{translateCategory(c, locale)}
						</option>
					))}
				</select>
			</div>
			<div>
				<label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500, color: '#334155' }}>
					{t.age}
					{(state.minAge || state.maxAge) && <span style={{ marginLeft: 4, color: '#3b82f6' }}>●</span>}
				</label>
				<div style={{ display: 'flex', gap: 8 }}>
					<input 
						placeholder={locale === 'fr' ? 'min' : 'min'} 
						value={state.minAge} 
						onChange={(e) => setState({ ...state, minAge: e.target.value })} 
						type="number"
						style={{ 
							width: '100%', 
							padding: '8px 12px',
							border: (state.minAge || state.maxAge) ? '2px solid #3b82f6' : '1px solid #cbd5e1',
							borderRadius: 8,
							fontSize: 14,
							background: (state.minAge || state.maxAge) ? '#eff6ff' : 'white'
						}}
						aria-label={locale === 'fr' ? 'Âge minimum' : 'Minimum age'}
					/>
					<input 
						placeholder={locale === 'fr' ? 'max' : 'max'} 
						value={state.maxAge} 
						onChange={(e) => setState({ ...state, maxAge: e.target.value })} 
						type="number"
						style={{ 
							width: '100%', 
							padding: '8px 12px',
							border: (state.minAge || state.maxAge) ? '2px solid #3b82f6' : '1px solid #cbd5e1',
							borderRadius: 8,
							fontSize: 14,
							background: (state.minAge || state.maxAge) ? '#eff6ff' : 'white'
						}}
						aria-label={locale === 'fr' ? 'Âge maximum' : 'Maximum age'}
					/>
				</div>
			</div>
			<div>
				<label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500, color: '#334155' }}>
					{t.price}
					{(state.minPrice || state.maxPrice) && <span style={{ marginLeft: 4, color: '#3b82f6' }}>●</span>}
				</label>
				<div style={{ display: 'flex', gap: 8 }}>
					<input 
						placeholder={locale === 'fr' ? 'min' : 'min'} 
						value={state.minPrice} 
						onChange={(e) => setState({ ...state, minPrice: e.target.value })} 
						type="number"
						style={{ 
							width: '100%', 
							padding: '8px 12px',
							border: (state.minPrice || state.maxPrice) ? '2px solid #3b82f6' : '1px solid #cbd5e1',
							borderRadius: 8,
							fontSize: 14,
							background: (state.minPrice || state.maxPrice) ? '#eff6ff' : 'white'
						}}
						aria-label={locale === 'fr' ? 'Prix minimum' : 'Minimum price'}
					/>
					<input 
						placeholder={locale === 'fr' ? 'max' : 'max'} 
						value={state.maxPrice} 
						onChange={(e) => setState({ ...state, maxPrice: e.target.value })} 
						type="number"
						style={{ 
							width: '100%', 
							padding: '8px 12px',
							border: (state.minPrice || state.maxPrice) ? '2px solid #3b82f6' : '1px solid #cbd5e1',
							borderRadius: 8,
							fontSize: 14,
							background: (state.minPrice || state.maxPrice) ? '#eff6ff' : 'white'
						}}
						aria-label={locale === 'fr' ? 'Prix maximum' : 'Maximum price'}
					/>
				</div>
			</div>
			<div>
				<label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500, color: '#334155' }}>
					{t.neighborhood}
					{state.neighborhood && <span style={{ marginLeft: 4, color: '#3b82f6' }}>●</span>}
				</label>
				<select 
					value={state.neighborhood} 
					onChange={(e) => {
						const newState = { ...state, neighborhood: e.target.value };
						setState(newState);
						onApply(newState);
					}} 
					style={{ 
						width: '100%', 
						padding: '8px 12px',
						border: state.neighborhood ? '2px solid #3b82f6' : '1px solid #cbd5e1',
						borderRadius: 8,
						fontSize: 14,
						background: state.neighborhood ? '#eff6ff' : 'white'
					}}
					aria-label={t.neighborhood}
				>
					<option value="">—</option>
					{neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
				</select>
			</div>
			<button 
				onClick={() => onApply(state)} 
				style={{ 
					padding: '10px 16px', 
					background: '#3b82f6', 
					color: 'white', 
					border: 'none', 
					borderRadius: 8, 
					cursor: 'pointer',
					fontSize: 14,
					fontWeight: 500,
					transition: 'all 0.2s ease'
				}}
				onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
				onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
			>
				{t.apply}
			</button>
			<button 
				onClick={() => { 
					setState({ category: '', minAge: '', maxAge: '', minPrice: '', maxPrice: '', neighborhood: '' }); 
					onApply({}); 
				}} 
				disabled={!hasActiveFilters}
				style={{ 
					padding: '10px 16px', 
					background: hasActiveFilters ? '#6c757d' : '#cbd5e1',
					color: 'white', 
					border: 'none', 
					borderRadius: 8, 
					cursor: hasActiveFilters ? 'pointer' : 'not-allowed',
					fontSize: 14,
					fontWeight: 500,
					transition: 'all 0.2s ease'
				}}
				onMouseEnter={(e) => {
					if (hasActiveFilters) e.currentTarget.style.background = '#575757';
				}}
				onMouseLeave={(e) => {
					if (hasActiveFilters) e.currentTarget.style.background = '#6c757d';
				}}
			>
				{t.reset} {hasActiveFilters && `(${activeFilterCount})`}
			</button>
		</div>
	);
}
