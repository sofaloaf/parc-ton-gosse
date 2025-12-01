import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../shared/api.js';
import { useI18n } from '../shared/i18n.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

/**
 * AccessGate - Simple access gate (no time limits, card view counter handles paywall)
 * Best practices:
 * - Allow anonymous browsing
 * - Card view counter handles paywall after 10 cards
 */
export default function AccessGate({ children }) {
	return <>{children}</>;
}

