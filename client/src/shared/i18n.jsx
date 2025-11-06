import React, { createContext, useContext, useMemo, useState } from 'react';

const defaultLocale = 'fr';

const baseDict = {
	fr: {
		appName: 'Parc Ton Gosse',
		searchPlaceholder: 'Rechercher activités ou prestataires',
		filters: 'Filtres',
		language: 'Langue',
		french: 'Français',
		english: 'Anglais',
		categories: 'Catégories',
		age: 'Âge',
		price: 'Prix',
		neighborhood: 'Quartier',
		apply: 'Appliquer',
		reset: 'Réinitialiser',
		book: 'Réserver',
		reviews: 'Avis',
		provider: 'Prestataire',
		title: 'Titre',
		description: 'Description',
		ageMin: 'Âge Min',
		ageMax: 'Âge Max',
		created: 'Créé le',
		previous: 'Précédent',
		next: 'Suivant',
		na: 'N/A',
		addresses: 'Adresses',
		map: 'Carte',
		cards: 'Cartes',
		table: 'Tableau',
		noAddresses: 'Aucune activité avec adresse trouvée',
		mapLegend: 'Légende de la carte',
		activities: 'Activités',
		total: 'Total',
		activityTypes: 'Types d\'activités',
		withAddresses: 'Avec adresses',
		withoutAddresses: 'Sans adresses',
		totalLocations: 'Emplacements totaux',
		nomEn: 'Nom (EN)',
		nomFr: 'Nom (FR)',
		nom: 'Nom',
		typeActivite: 'Type d\'activité',
		adultes: 'Adultes',
		disponibiliteJours: 'Disponibilité (jours)',
		disponibiliteDates: 'Disponibilité (dates)',
		lienSite: 'Lien du site',
		lienEnregistrement: 'Lien pour s\'enregistrer',
		contactEmail: 'Email Contact',
		contactPhone: 'Téléphone',
		additionalNotes: 'Notes Additionnelles'
	},
	en: {
		appName: 'Parc Ton Gosse',
		searchPlaceholder: 'Search activities or providers',
		filters: 'Filters',
		language: 'Language',
		french: 'French',
		english: 'English',
		categories: 'Categories',
		age: 'Age',
		price: 'Price',
		neighborhood: 'Neighborhood',
		apply: 'Apply',
		reset: 'Reset',
		book: 'Book',
		reviews: 'Reviews',
		provider: 'Provider',
		title: 'Title',
		description: 'Description',
		ageMin: 'Min Age',
		ageMax: 'Max Age',
		created: 'Created',
		previous: 'Previous',
		next: 'Next',
		na: 'N/A',
		addresses: 'Addresses',
		map: 'Map',
		cards: 'Cards',
		table: 'Table',
		noAddresses: 'No activities with addresses found',
		mapLegend: 'Map Legend',
		activities: 'Activities',
		total: 'Total',
		activityTypes: 'Activity Types',
		withAddresses: 'With addresses',
		withoutAddresses: 'Without addresses',
		totalLocations: 'Total locations',
		nomEn: 'Name (EN)',
		nomFr: 'Name (FR)',
		nom: 'Name',
		typeActivite: 'Activity Type',
		adultes: 'Adults',
		disponibiliteJours: 'Availability (days)',
		disponibiliteDates: 'Availability (dates)',
		lienSite: 'Website Link',
		lienEnregistrement: 'Registration Link',
		contactEmail: 'Contact Email',
		contactPhone: 'Phone',
		additionalNotes: 'Additional Notes'
	}
};

const I18nContext = createContext();

export function I18nProvider({ children }) {
	const [locale, setLocale] = useState(localStorage.getItem('locale') || defaultLocale);
	const [remoteDict, setRemoteDict] = useState({ fr: {}, en: {} });
	const t = useMemo(() => ({ ...baseDict[locale], ...remoteDict[locale] }), [locale, remoteDict]);
	const value = useMemo(() => ({ locale, setLocale: (l) => { localStorage.setItem('locale', l); setLocale(l); }, t, setRemoteDict }), [locale, t]);
	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
	return useContext(I18nContext);
}



