import React, { useState, useEffect } from 'react';
import { useI18n } from '../shared/i18n.jsx';

export default function SearchBar({ onSearch, onSelect, initialValue = '' }) {
	const { locale, t } = useI18n();
	const [q, setQ] = useState(initialValue);
	const [searching, setSearching] = useState(false);

	// Sync with external value changes
	useEffect(() => {
		if (initialValue !== undefined) {
			setQ(initialValue);
		}
	}, [initialValue]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (onSearch) {
			setSearching(true);
			try {
				await onSearch(q.trim());
			} finally {
				setTimeout(() => setSearching(false), 300);
			}
		}
	};

	const handleKeyDown = (e) => {
		if (e.key === 'Enter') {
			handleSubmit(e);
		}
	};

	const handleClear = () => {
		setQ('');
		if (onSearch) {
			onSearch('');
		}
	};

	return (
		<form onSubmit={handleSubmit} style={{ position: 'relative', width: '100%', zIndex: 1 }}>
			<div style={{ display: 'flex', gap: 8, alignItems: 'stretch', width: '100%' }}>
				<div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
					<input
						type="text"
						style={{
							width: '100%',
							padding: '10px 40px 10px 16px',
							border: '1px solid #cbd5e1',
							borderRadius: 8,
							fontSize: 14,
							boxSizing: 'border-box'
						}}
						placeholder={t.searchPlaceholder || (locale === 'fr' ? 'Rechercher activités ou prestataires' : 'Search activities or providers')}
						value={q}
						onChange={(e) => setQ(e.target.value)}
						onKeyDown={handleKeyDown}
						aria-label={locale === 'fr' ? 'Rechercher activités' : 'Search activities'}
						role="searchbox"
					/>
					{q && (
						<button
							type="button"
							onClick={handleClear}
							style={{
								position: 'absolute',
								right: 8,
								top: '50%',
								transform: 'translateY(-50%)',
								background: 'transparent',
								border: 'none',
								cursor: 'pointer',
								padding: 4,
								fontSize: 18,
								color: '#64748b',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								zIndex: 2
							}}
							title={locale === 'fr' ? 'Effacer' : 'Clear'}
						>
							×
						</button>
					)}
				</div>
				<button
					type="submit"
					disabled={searching}
					aria-label={locale === 'fr' ? 'Rechercher' : 'Search'}
					style={{
						padding: '10px 20px',
						background: searching ? '#94a3b8' : '#3b82f6',
						color: 'white',
						border: 'none',
						borderRadius: 8,
						cursor: searching ? 'not-allowed' : 'pointer',
						fontSize: 14,
						fontWeight: 500,
						whiteSpace: 'nowrap',
						opacity: searching ? 0.7 : 1,
						transition: 'all 0.2s ease',
						flexShrink: 0,
						zIndex: 1
					}}
				>
					{searching ? (locale === 'fr' ? 'Recherche...' : 'Searching...') : (locale === 'fr' ? 'Rechercher' : 'Search')}
				</button>
			</div>
		</form>
	);
}
