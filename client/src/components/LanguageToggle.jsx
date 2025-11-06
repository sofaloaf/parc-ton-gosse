import React from 'react';
import { useI18n } from '../shared/i18n.jsx';

export default function LanguageToggle() {
	const { locale, setLocale, t } = useI18n();
	return (
		<div>
			<label style={{ marginRight: 8 }}>{t.language}:</label>
			<select value={locale} onChange={(e) => setLocale(e.target.value)}>
				<option value="fr">{t.french}</option>
				<option value="en">{t.english}</option>
			</select>
		</div>
	);
}
