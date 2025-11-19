import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../shared/i18n.jsx';

export default function DataTable({ activities, locale }) {
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [sortColumn, setSortColumn] = useState('');
	const [sortDirection, setSortDirection] = useState('asc');
	const navigate = useNavigate();
	const { t } = useI18n();

	// Removed debug log for production

	// Calculate pagination
	const totalPages = Math.ceil(activities.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;

	// Sort activities
	const sortedActivities = useMemo(() => {
		if (!sortColumn) return activities;

		const sorted = [...activities].sort((a, b) => {
			let aVal = a[sortColumn];
			let bVal = b[sortColumn];

			// Handle nested objects (title, description)
			if (sortColumn === 'title' || sortColumn === 'description') {
				aVal = aVal?.[locale] || aVal?.en || aVal?.fr || '';
				bVal = bVal?.[locale] || bVal?.en || bVal?.fr || '';
			}

			// Handle numbers
			if (typeof aVal === 'number' && typeof bVal === 'number') {
				return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
			}

			// Handle strings
			aVal = String(aVal || '').toLowerCase();
			bVal = String(bVal || '').toLowerCase();

			if (sortDirection === 'asc') {
				return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
			} else {
				return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
			}
		});

		return sorted;
	}, [activities, sortColumn, sortDirection, locale]);

	// Get paginated data
	const paginatedActivities = sortedActivities.slice(startIndex, endIndex);

	// Handle column header click
	const handleSort = (column) => {
		if (sortColumn === column) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
		} else {
			setSortColumn(column);
			setSortDirection('asc');
		}
	};

	// Render sort arrow
	const renderSortArrow = (column) => {
		if (sortColumn !== column) return '↕️';
		return sortDirection === 'asc' ? '↑' : '↓';
	};

	// Handle page change
	const goToPage = (page) => {
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page);
		}
	};

	// Get column headers dynamically from first activity
	const columns = useMemo(() => {
		if (activities.length === 0) return [];
		const sample = activities[0];
		
		// Use _columnOrder if available (from Google Sheets), otherwise fall back to Object.keys
		let cols;
		if (sample._columnOrder && Array.isArray(sample._columnOrder)) {
			cols = sample._columnOrder.filter(key => key !== 'id' && !key.startsWith('_'));
		} else {
			cols = Object.keys(sample).filter(key => key !== 'id' && !key.startsWith('_'));
		}
		
		// Hide internal/confidential columns
		const hiddenColumns = ['locationDetails', 'providerId', 'currency', 'schedule', 'images', 'createdAt', 'updatedAt'];
		cols = cols.filter(key => !hiddenColumns.includes(key));
		
		// If 'addresse' exists but we also have 'addresses', hide addresse
		// Otherwise, keep addresse but rename it to 'addresses' for display
		if (sample.addresse && sample.addresses) {
			cols = cols.filter(key => key !== 'addresse');
		} else if (sample.addresse) {
			const idx = cols.indexOf('addresse');
			if (idx >= 0) cols[idx] = 'addresses'; // Rename for display
		}
		
		// Reorder columns to put addresses before websiteLink
		const websiteLinkIndex = cols.indexOf('websiteLink');
		const addressIndex = cols.indexOf('addresses');
		if (websiteLinkIndex >= 0 && addressIndex >= 0 && addressIndex > websiteLinkIndex) {
			cols.splice(addressIndex, 1);
			cols.splice(websiteLinkIndex, 0, 'addresses');
		}
		
		return cols;
	}, [activities]);

	// Column labels (bilingual)
	const columnLabels = {
		title: t.title || 'Title',
		description: t.description || 'Description',
		categories: t.categories || 'Categories',
		ageMin: t.ageMin || 'Min Age',
		ageMax: t.ageMax || 'Max Age',
		price: t.price || 'Price',
		addresses: t.addresses || 'Addresses',
		neighborhood: t.neighborhood || 'Neighborhood',
		activityType: t.typeActivite || 'Activity Type',
		adults: t.adultes || 'Adults',
		websiteLink: t.lienSite || 'Website Link',
		registrationLink: t.lienEnregistrement || 'Registration Link',
		disponibiliteJours: t.disponibiliteJours || 'Availability (days)',
		disponibiliteDates: t.disponibiliteDates || 'Availability (dates)',
		contactEmail: t.contactEmail || 'Contact Email',
		contactPhone: t.contactPhone || 'Phone',
		additionalNotes: t.additionalNotes || 'Additional Notes',
		providerId: t.provider || 'Provider',
		createdAt: t.created || 'Created',
	};

	if (activities.length === 0) {
		return (
			<div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
				<h3>No activities found</h3>
				<p>Try adjusting your filters or add some activities to your database.</p>
			</div>
		);
	}

	return (
		<div style={{ width: '100%' }}>
			{/* Controls - Crunchbase style */}
			<div style={{ 
				display: 'flex', 
				justifyContent: 'space-between', 
				alignItems: 'center', 
				marginBottom: 16,
				flexWrap: 'wrap',
				gap: 12,
				padding: '12px 16px',
				background: '#f8fafc',
				borderRadius: '8px',
				border: '1px solid #e0e7f0'
			}}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					<label style={{ color: '#475569', fontSize: '14px', fontWeight: 500 }}>Items per page:</label>
					<select 
						value={itemsPerPage} 
						onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
						style={{ 
							padding: '6px 12px',
							border: '1px solid #cbd5e1',
							borderRadius: '6px',
							background: 'white',
							color: '#334155',
							fontSize: '14px',
							cursor: 'pointer',
							outline: 'none'
						}}
					>
						<option value={5}>5</option>
						<option value={10}>10</option>
						<option value={25}>25</option>
						<option value={50}>50</option>
						<option value={100}>100</option>
					</select>
				</div>
				<div style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
					Showing {startIndex + 1}-{Math.min(endIndex, activities.length)} of {activities.length}
				</div>
			</div>

			{/* Table with responsive layout - Modern design */}
			<div style={{ 
				border: '1px solid #e2e8f0', 
				borderRadius: '12px', 
				overflowX: 'auto',
				overflowY: 'visible',
				width: '100%',
				maxWidth: '100%',
				WebkitOverflowScrolling: 'touch',
				background: 'white',
				boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)'
			}}>
				<table style={{ 
					width: '100%', 
					borderCollapse: 'separate', 
					borderSpacing: 0, 
					fontSize: 14, 
					tableLayout: 'auto'
				}}>
					<thead>
						<tr style={{ 
							background: 'linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 100%)',
							borderBottom: '2px solid #e2e8f0'
						}}>
							{columns.map(col => {
								// Define column widths based on content type
								const getColumnWidth = (columnName) => {
									// Use flexible widths that fit content but prevent excessive expansion
									if (columnName === 'title') return { minWidth: '120px', maxWidth: '180px' };
									if (columnName === 'description') return { minWidth: '150px', maxWidth: '250px' };
									if (columnName === 'categories') return { minWidth: '100px', maxWidth: '150px' };
									if (columnName === 'activityType') return { minWidth: '100px', maxWidth: '150px' };
									if (columnName === 'addresses') return { minWidth: '150px', maxWidth: '200px' };
									if (columnName === 'price') return { minWidth: '80px', maxWidth: '100px' };
									if (columnName === 'ageMin' || columnName === 'ageMax') return { minWidth: '60px', maxWidth: '80px' };
									if (columnName === 'websiteLink' || columnName === 'registrationLink') return { minWidth: '120px', maxWidth: '150px' };
									if (columnName === 'contactEmail' || columnName === 'contactPhone') return { minWidth: '120px', maxWidth: '150px' };
									return { minWidth: '100px', maxWidth: '120px' }; // Default width
								};
								
								const colWidth = getColumnWidth(col);
								
								// Determine text alignment based on column type
								const getTextAlign = (columnName) => {
									if (columnName === 'price' || columnName === 'ageMin' || columnName === 'ageMax') return 'right';
									if (columnName === 'adults') return 'center';
									return 'left';
								};
								
								return (
									<th
										key={col}
										onClick={() => handleSort(col)}
										style={{
											padding: '14px 18px',
											textAlign: getTextAlign(col),
											cursor: 'pointer',
											userSelect: 'none',
											position: 'relative',
											fontWeight: 600,
											fontSize: '11px',
											color: '#475569',
											textTransform: 'uppercase',
											letterSpacing: '0.8px',
											transition: 'all 0.2s ease',
											minWidth: colWidth.minWidth,
											maxWidth: colWidth.maxWidth,
											whiteSpace: 'nowrap',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											borderRight: '1px solid #e2e8f0'
										}}
										onMouseEnter={(e) => {
											e.currentTarget.style.background = '#e0e7ff';
											e.currentTarget.style.color = '#1e40af';
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.background = '';
											e.currentTarget.style.color = '#475569';
										}}
									>
										{columnLabels[col] || col}
										<span style={{ marginLeft: 8, fontSize: 10, color: '#3b82f6', opacity: sortColumn === col ? 1 : 0.5 }}>
											{renderSortArrow(col)}
										</span>
									</th>
								);
								})}
								<th style={{ 
									padding: '14px 18px', 
									fontWeight: 600,
									fontSize: '11px',
									color: '#475569',
									textTransform: 'uppercase',
									letterSpacing: '0.8px',
									textAlign: 'center',
									background: 'linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 100%)'
								}}>Actions</th>
						</tr>
					</thead>
					<tbody>
						{paginatedActivities.map((activity, idx) => {
							// Alternating row colors for better readability
							const isEven = idx % 2 === 0;
							const rowBg = isEven ? '#ffffff' : '#fafbfc';
							
							return (
								<tr 
									key={activity.id || idx}
									style={{ 
										borderBottom: '1px solid #f1f5f9',
										background: rowBg,
										transition: 'all 0.15s ease',
										height: '56px' // Consistent row height
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.background = '#f0f4ff';
										e.currentTarget.style.boxShadow = 'inset 0 0 0 1px #dbeafe';
										e.currentTarget.style.transform = 'scale(1.001)';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.background = rowBg;
										e.currentTarget.style.boxShadow = 'none';
										e.currentTarget.style.transform = 'scale(1)';
									}}
								>
								{columns.map(col => {
									let value = activity[col];
									
									// Handle address field (col might be 'addresses' but data has 'addresse')
									if (col === 'addresses' && !value && activity.addresse) {
										value = activity.addresse;
									}
									
									// Handle nested objects (title, description)
									if ((col === 'title' || col === 'description') && typeof value === 'object') {
										value = value?.[locale] || value?.en || value?.fr || '';
									}
									
									// Handle arrays (categories, images)
									if (Array.isArray(value)) {
										value = value.length > 0 ? value.join(', ') : '';
									}
									
									// Handle objects (price)
									if (col === 'price' && typeof value === 'object') {
										value = value?.amount ? `${value.amount} ${value?.currency || 'eur'}` : '';
									}
									
									// Handle addresses as bulleted list (new format: "Location: Address - Location: Address")
									let isAddressList = false;
									let parsedAddresses = [];
									if (col === 'addresses' && typeof value === 'string') {
										// Parse new format: split by " - " to get multiple locations
										const parts = value.split(' - ').map(p => p.trim().replace(/^\s*-\s*|\s*-\s*$/g, '')).filter(p => p);
										if (parts.length > 1 || value.includes(':')) {
											isAddressList = true;
											parsedAddresses = parts.map(part => {
												// Split by ":" to separate location name from address
												const colonIndex = part.indexOf(':');
												if (colonIndex > 0) {
													const locationName = part.substring(0, colonIndex).trim();
													const address = part.substring(colonIndex + 1).trim().replace(/^\s*-\s*|\s*-\s*$/g, '');
													return { location: locationName, address: address };
												}
												return { location: '', address: part.replace(/^\s*-\s*|\s*-\s*$/g, '') };
											});
										} else if (value.includes(',') || value.includes('\n')) {
											// Old format fallback
											isAddressList = true;
											parsedAddresses = (value.includes('\n') ? value.split('\n') : value.split(',')).map(a => ({
												location: '',
												address: a.trim().replace(/^\s*-\s*|\s*-\s*$/g, '')
											})).filter(a => a.address);
										}
									}
									
									// Handle availability days as bulleted list
									let isBulletList = false;
									if (col === 'disponibiliteJours' && typeof value === 'string' && value.includes(',') && !isAddressList) {
										isBulletList = true;
									}
									
									// Handle URL links
									let isLink = false;
									let linkUrl = '';
									if ((col === 'websiteLink' || col === 'registrationLink') && typeof value === 'string' && value) {
										// Check if it's a valid URL
										if (value.startsWith('http://') || value.startsWith('https://')) {
											linkUrl = value;
											isLink = true;
										} else if (value.includes('.') && !value.includes(' ')) {
											// Probably a URL without protocol
											linkUrl = 'https://' + value;
											isLink = true;
										}
									}
									
									// Handle email links
									let isEmail = false;
									let emailUrl = '';
									if (col === 'contactEmail' && typeof value === 'string' && value) {
										if (value.includes('@') && value.includes('.')) {
											emailUrl = 'mailto:' + value;
											isEmail = true;
										}
									}
									
									// Handle phone links
									let isPhone = false;
									let phoneUrl = '';
									if (col === 'contactPhone' && typeof value === 'string' && value) {
										// Remove common formatting, keep digits and +
										const phoneDigits = value.replace(/[^\d+]/g, '');
										if (phoneDigits.length >= 8) {
											phoneUrl = 'tel:' + phoneDigits;
											isPhone = true;
										}
									}
									
									// Handle yes/no values - convert to icons (language-agnostic)
									let isYesNo = false;
									let yesNoIcon = null;
									if (typeof value === 'string') {
										const normalizedValue = value.trim().toLowerCase();
										if (normalizedValue === 'yes' || normalizedValue === 'oui' || normalizedValue === 'true' || normalizedValue === '1' || normalizedValue === 'y') {
											isYesNo = true;
											yesNoIcon = '✓'; // Checkmark
										} else if (normalizedValue === 'no' || normalizedValue === 'non' || normalizedValue === 'false' || normalizedValue === '0' || normalizedValue === 'n') {
											isYesNo = true;
											yesNoIcon = '✗'; // X mark
										}
									} else if (typeof value === 'boolean') {
										isYesNo = true;
										yesNoIcon = value ? '✓' : '✗';
									} else if (typeof value === 'number') {
										if (value === 1 || value === 0) {
											isYesNo = true;
											yesNoIcon = value === 1 ? '✓' : '✗';
										}
									}
									
									// Truncate long text (but not for addresses, bullet lists, or yes/no)
									if (typeof value === 'string' && !isBulletList && !isAddressList && !isYesNo) {
										let maxLen = 50;
										if (col === 'description') maxLen = 80;
										else if (col === 'categories' || col === 'activityType') maxLen = 40;
										else if (col === 'title') maxLen = 30;
										else if (col === 'websiteLink' || col === 'registrationLink') maxLen = 25;
										else if (col === 'contactEmail' || col === 'contactPhone') maxLen = 25;
										
										if (value.length > maxLen) {
											value = value.substring(0, maxLen - 3) + '...';
										}
									}
									
									// Display N/A for empty/missing values with better styling
									const isEmpty = value === '' || value === null || value === undefined || (value === false && !isYesNo);
									const displayValue = isEmpty ? (t.na || 'N/A') : value;
									const isEmptyValue = isEmpty && !isYesNo && !isLink && !isEmail && !isPhone;
									
									// Define cell styles based on column (matching header widths)
									const getCellStyle = (columnName) => {
										const getTextAlign = (col) => {
											if (col === 'price' || col === 'ageMin' || col === 'ageMax') return 'right';
											if (col === 'adults') return 'center';
											return 'left';
										};
										
										const baseStyle = {
											padding: '14px 18px',
											borderRight: '1px solid #f1f5f9',
											color: '#1e293b',
											fontSize: '13px',
											lineHeight: '1.6',
											verticalAlign: 'middle',
											textAlign: getTextAlign(columnName),
											fontWeight: columnName === 'title' ? 500 : 400
										};
										
										if (columnName === 'title') {
											return { ...baseStyle, minWidth: '120px', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1e40af', fontWeight: 600 };
										}
										if (columnName === 'description') {
											return { ...baseStyle, minWidth: '150px', maxWidth: '250px', whiteSpace: 'normal', wordWrap: 'break-word', color: '#475569', fontSize: '12px' };
										}
										if (columnName === 'categories') {
											return { ...baseStyle, minWidth: '100px', maxWidth: '150px', whiteSpace: 'normal', wordWrap: 'break-word', fontSize: '12px', color: '#64748b' };
										}
										if (columnName === 'activityType') {
											return { ...baseStyle, minWidth: '100px', maxWidth: '150px', whiteSpace: 'normal', wordWrap: 'break-word', fontSize: '12px', color: '#64748b' };
										}
										if (columnName === 'addresses') {
											return { ...baseStyle, minWidth: '150px', maxWidth: '200px', whiteSpace: 'normal', wordWrap: 'break-word', fontSize: '12px', color: '#475569' };
										}
										if (columnName === 'price') {
											return { ...baseStyle, minWidth: '80px', maxWidth: '100px', whiteSpace: 'nowrap', textAlign: 'right', color: '#059669', fontWeight: 600 };
										}
										if (columnName === 'ageMin' || columnName === 'ageMax') {
											return { ...baseStyle, minWidth: '60px', maxWidth: '80px', whiteSpace: 'nowrap', textAlign: 'center', color: '#7c3aed', fontWeight: 500 };
										}
										if (columnName === 'websiteLink' || columnName === 'registrationLink') {
											return { ...baseStyle, minWidth: '120px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px' };
										}
										if (columnName === 'contactEmail' || columnName === 'contactPhone') {
											return { ...baseStyle, minWidth: '120px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px' };
										}
										return { ...baseStyle, minWidth: '100px', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px' };
									};
									
									return (
										<td key={col} style={getCellStyle(col)}>
											{isLink ? (
												<a href={linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}
												onMouseEnter={(e) => e.currentTarget.style.color = '#2563eb'}
												onMouseLeave={(e) => e.currentTarget.style.color = '#3b82f6'}>
													🔗 {displayValue}
												</a>
											) : isEmail ? (
												<a href={emailUrl} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}
												onMouseEnter={(e) => e.currentTarget.style.color = '#2563eb'}
												onMouseLeave={(e) => e.currentTarget.style.color = '#3b82f6'}>
													📧 {displayValue}
												</a>
											) : isPhone ? (
												<a href={phoneUrl} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}
												onMouseEnter={(e) => e.currentTarget.style.color = '#2563eb'}
												onMouseLeave={(e) => e.currentTarget.style.color = '#3b82f6'}>
													📞 {displayValue}
												</a>
											) : isAddressList ? (
												<ul style={{ margin: 0, paddingLeft: 20, listStyle: 'disc', wordWrap: 'break-word' }}>
													{parsedAddresses.map((item, idx) => (
														<li key={idx} style={{ marginBottom: 4, wordWrap: 'break-word' }}>
															{item.location ? <strong>{item.location}:</strong> : ''} {item.address}
														</li>
													))}
												</ul>
											) : isBulletList ? (
												<ul style={{ margin: 0, paddingLeft: 20, listStyle: 'disc' }}>
													{value.split(',').map((item, idx) => (
														<li key={idx} style={{ marginBottom: 4 }}>{item.trim()}</li>
													))}
												</ul>
											) : isYesNo ? (
												<span style={{
													fontSize: '18px',
													color: yesNoIcon === '✓' ? '#10b981' : '#ef4444',
													fontWeight: 'bold',
													display: 'inline-block',
													width: '24px',
													textAlign: 'center'
												}}>
													{yesNoIcon}
												</span>
											) : (
												<span style={{ 
													color: isEmptyValue ? '#94a3b8' : 'inherit',
													fontStyle: isEmptyValue ? 'italic' : 'normal',
													fontSize: isEmptyValue ? '12px' : 'inherit'
												}}>
													{displayValue}
												</span>
											)}
										</td>
									);
								})}
								<td style={{ 
									padding: '14px 18px', 
									borderRight: 'none',
									textAlign: 'center',
									verticalAlign: 'middle'
								}}>
									<div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
										<button
											onClick={() => navigate(`/activity/${activity.id}`)}
											style={{
												padding: '6px 12px',
												background: '#3b82f6',
												color: 'white',
												border: 'none',
												borderRadius: '6px',
												cursor: 'pointer',
												fontSize: '12px',
												fontWeight: 500,
												transition: 'all 0.15s ease',
												boxShadow: '0 1px 2px rgba(59, 130, 246, 0.2)',
												whiteSpace: 'nowrap'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = '#2563eb';
												e.currentTarget.style.transform = 'translateY(-1px)';
												e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = '#3b82f6';
												e.currentTarget.style.transform = 'translateY(0)';
												e.currentTarget.style.boxShadow = '0 1px 2px rgba(59, 130, 246, 0.2)';
											}}
										>
											View
										</button>
										<button
											onClick={() => navigate(`/register/${activity.id}`)}
											style={{
												padding: '6px 12px',
												background: '#10b981',
												color: 'white',
												border: 'none',
												borderRadius: '6px',
												cursor: 'pointer',
												fontSize: '12px',
												fontWeight: 500,
												transition: 'all 0.15s ease',
												boxShadow: '0 1px 2px rgba(16, 185, 129, 0.2)',
												whiteSpace: 'nowrap'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = '#059669';
												e.currentTarget.style.transform = 'translateY(-1px)';
												e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.3)';
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = '#10b981';
												e.currentTarget.style.transform = 'translateY(0)';
												e.currentTarget.style.boxShadow = '0 1px 2px rgba(16, 185, 129, 0.2)';
											}}
										>
											{t.book || 'Book'}
										</button>
									</div>
								</td>
							</tr>
						);
						})}
					</tbody>
				</table>
			</div>

			{/* Pagination - Crunchbase style */}
			{totalPages > 1 && (
				<div style={{ 
					display: 'flex', 
					justifyContent: 'center', 
					alignItems: 'center', 
					gap: 8, 
					marginTop: 24,
					padding: '16px',
					background: '#f8fafc',
					borderRadius: '8px',
					border: '1px solid #e0e7f0'
				}}>
					<button
						onClick={() => goToPage(currentPage - 1)}
						disabled={currentPage === 1}
						style={{
							padding: '8px 16px',
							border: '1px solid #cbd5e1',
							borderRadius: '6px',
							background: currentPage === 1 ? '#f1f5f9' : 'white',
							color: currentPage === 1 ? '#94a3b8' : '#334155',
							cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
							fontSize: '14px',
							fontWeight: 500,
							transition: 'all 0.2s ease'
						}}
						onMouseEnter={(e) => {
							if (currentPage !== 1) {
								e.currentTarget.style.background = '#eff6ff';
								e.currentTarget.style.borderColor = '#3b82f6';
							}
						}}
						onMouseLeave={(e) => {
							if (currentPage !== 1) {
								e.currentTarget.style.background = 'white';
								e.currentTarget.style.borderColor = '#cbd5e1';
							}
						}}
					>
						{t.previous || 'Previous'}
					</button>
					
					{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
						let pageNum;
						if (totalPages <= 5) {
							pageNum = i + 1;
						} else if (currentPage <= 3) {
							pageNum = i + 1;
						} else if (currentPage >= totalPages - 2) {
							pageNum = totalPages - 4 + i;
						} else {
							pageNum = currentPage - 2 + i;
						}
						
						const isActive = currentPage === pageNum;
						return (
							<button
								key={pageNum}
								onClick={() => goToPage(pageNum)}
								style={{
									padding: '8px 14px',
									border: isActive ? 'none' : '1px solid #cbd5e1',
									borderRadius: '6px',
									background: isActive ? '#3b82f6' : 'white',
									color: isActive ? 'white' : '#334155',
									cursor: 'pointer',
									fontSize: '14px',
									fontWeight: isActive ? 600 : 500,
									transition: 'all 0.2s ease',
									minWidth: '40px'
								}}
								onMouseEnter={(e) => {
									if (!isActive) {
										e.currentTarget.style.background = '#eff6ff';
										e.currentTarget.style.borderColor = '#3b82f6';
									}
								}}
								onMouseLeave={(e) => {
									if (!isActive) {
										e.currentTarget.style.background = 'white';
										e.currentTarget.style.borderColor = '#cbd5e1';
									}
								}}
							>
								{pageNum}
							</button>
						);
					})}
					
					<button
						onClick={() => goToPage(currentPage + 1)}
						disabled={currentPage === totalPages}
						style={{
							padding: '8px 16px',
							border: '1px solid #cbd5e1',
							borderRadius: '6px',
							background: currentPage === totalPages ? '#f1f5f9' : 'white',
							color: currentPage === totalPages ? '#94a3b8' : '#334155',
							cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
							fontSize: '14px',
							fontWeight: 500,
							transition: 'all 0.2s ease'
						}}
						onMouseEnter={(e) => {
							if (currentPage !== totalPages) {
								e.currentTarget.style.background = '#eff6ff';
								e.currentTarget.style.borderColor = '#3b82f6';
							}
						}}
						onMouseLeave={(e) => {
							if (currentPage !== totalPages) {
								e.currentTarget.style.background = 'white';
								e.currentTarget.style.borderColor = '#cbd5e1';
							}
						}}
					>
						{t.next || 'Next'}
					</button>
				</div>
			)}
		</div>
	);
}

