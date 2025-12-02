import React, { useState, useEffect } from 'react';

/**
 * Star Rating Component
 * @param {number} rating - Current rating (0-5)
 * @param {function} onRate - Callback when user rates (rating: number) => void
 * @param {boolean} interactive - Whether user can interact with stars
 * @param {string} size - Size of stars ('small', 'medium', 'large')
 */
export default function StarRating({ rating = 0, onRate, interactive = false, size = 'medium' }) {
	const [hoveredRating, setHoveredRating] = useState(0);
	
	const sizeMap = {
		small: '16px',
		medium: '20px',
		large: '24px'
	};
	
	const starSize = sizeMap[size] || sizeMap.medium;
	
	const handleClick = (value) => {
		if (interactive && onRate) {
			onRate(value);
		}
	};
	
	const handleMouseEnter = (value) => {
		if (interactive) {
			setHoveredRating(value);
		}
	};
	
	const handleMouseLeave = () => {
		if (interactive) {
			setHoveredRating(0);
		}
	};
	
	const displayRating = hoveredRating || rating;
	
	return (
		<div style={{ 
			display: 'inline-flex', 
			alignItems: 'center',
			gap: '2px',
			cursor: interactive ? 'pointer' : 'default'
		}}>
			{[1, 2, 3, 4, 5].map((star) => {
				const isFilled = star <= displayRating;
				return (
					<span
						key={star}
						onClick={() => handleClick(star)}
						onMouseEnter={() => handleMouseEnter(star)}
						onMouseLeave={handleMouseLeave}
						style={{
							fontSize: starSize,
							color: isFilled ? '#fbbf24' : '#d1d5db',
							transition: 'color 0.2s ease',
							userSelect: 'none'
						}}
					>
						★
					</span>
				);
			})}
		</div>
	);
}

