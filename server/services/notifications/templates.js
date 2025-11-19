/**
 * Email Templates
 */

const BASE_URL = process.env.FRONTEND_URL || 'https://victorious-gentleness-production.up.railway.app';

/**
 * Welcome Email Template
 */
export function welcomeEmail({ name, email, verificationToken, locale = 'fr' }) {
	const isFrench = locale === 'fr';
	const verifyUrl = `${BASE_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
	
	return {
		subject: isFrench 
			? 'Bienvenue sur Parc Ton Gosse ! Vérifiez votre email'
			: 'Welcome to Parc Ton Gosse! Verify your email',
		html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
		.content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
		.button { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
		.footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>${isFrench ? 'Bienvenue sur Parc Ton Gosse !' : 'Welcome to Parc Ton Gosse!'}</h1>
		</div>
		<div class="content">
			<p>${isFrench ? `Bonjour ${name || 'cher utilisateur'},` : `Hello ${name || 'there'},`}</p>
			<p>${isFrench 
				? 'Merci de vous être inscrit sur Parc Ton Gosse ! Nous sommes ravis de vous accueillir.'
				: 'Thank you for signing up for Parc Ton Gosse! We\'re excited to have you.'}</p>
			<p>${isFrench 
				? 'Pour commencer, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :'
				: 'To get started, please verify your email address by clicking the button below:'}</p>
			<div style="text-align: center;">
				<a href="${verifyUrl}" class="button">${isFrench ? 'Vérifier mon email' : 'Verify Email'}</a>
			</div>
			<p style="font-size: 12px; color: #666; margin-top: 20px;">
				${isFrench 
					? 'Ou copiez ce lien dans votre navigateur :'
					: 'Or copy this link into your browser:'}<br>
				<a href="${verifyUrl}" style="color: #007bff; word-break: break-all;">${verifyUrl}</a>
			</p>
			<p>${isFrench 
				? 'Ce lien expire dans 24 heures. Si vous n\'avez pas créé de compte, vous pouvez ignorer cet email.'
				: 'This link expires in 24 hours. If you didn\'t create an account, you can ignore this email.'}</p>
		</div>
		<div class="footer">
			<p>${isFrench ? 'Parc Ton Gosse - Activités pour enfants à Paris' : 'Parc Ton Gosse - Children\'s Activities in Paris'}</p>
		</div>
	</div>
</body>
</html>
		`
	};
}

/**
 * Password Reset Email Template
 */
export function passwordResetEmail({ name, email, resetToken, locale = 'fr' }) {
	const isFrench = locale === 'fr';
	const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
	
	return {
		subject: isFrench 
			? 'Réinitialisation de votre mot de passe - Parc Ton Gosse'
			: 'Reset Your Password - Parc Ton Gosse',
		html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
		.content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
		.button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
		.footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
		.warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>${isFrench ? 'Réinitialisation du mot de passe' : 'Password Reset'}</h1>
		</div>
		<div class="content">
			<p>${isFrench ? `Bonjour ${name || 'cher utilisateur'},` : `Hello ${name || 'there'},`}</p>
			<p>${isFrench 
				? 'Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.'
				: 'We received a request to reset the password for your account.'}</p>
			<div style="text-align: center;">
				<a href="${resetUrl}" class="button">${isFrench ? 'Réinitialiser mon mot de passe' : 'Reset Password'}</a>
			</div>
			<p style="font-size: 12px; color: #666; margin-top: 20px;">
				${isFrench 
					? 'Ou copiez ce lien dans votre navigateur :'
					: 'Or copy this link into your browser:'}<br>
				<a href="${resetUrl}" style="color: #007bff; word-break: break-all;">${resetUrl}</a>
			</p>
			<div class="warning">
				<p style="margin: 0;"><strong>${isFrench ? '⚠️ Important :' : '⚠️ Important:'}</strong></p>
				<p style="margin: 8px 0 0 0;">
					${isFrench 
						? 'Ce lien expire dans 1 heure. Si vous n\'avez pas demandé de réinitialisation, ignorez cet email.'
						: 'This link expires in 1 hour. If you didn\'t request a password reset, please ignore this email.'}
				</p>
			</div>
		</div>
		<div class="footer">
			<p>${isFrench ? 'Parc Ton Gosse - Activités pour enfants à Paris' : 'Parc Ton Gosse - Children\'s Activities in Paris'}</p>
		</div>
	</div>
</body>
</html>
		`
	};
}

/**
 * Trial Expiration Reminder Email
 */
export function trialExpirationEmail({ name, email, hoursRemaining, locale = 'fr' }) {
	const isFrench = locale === 'fr';
	const preorderUrl = `${BASE_URL}/preorder`;
	
	return {
		subject: isFrench 
			? `Votre essai gratuit se termine bientôt - ${hoursRemaining}h restantes`
			: `Your free trial is ending soon - ${hoursRemaining}h remaining`,
		html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: #ffc107; color: #333; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
		.content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
		.button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
		.footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>${isFrench ? '⏰ Votre essai se termine bientôt' : '⏰ Your Trial is Ending Soon'}</h1>
		</div>
		<div class="content">
			<p>${isFrench ? `Bonjour ${name || 'cher utilisateur'},` : `Hello ${name || 'there'},`}</p>
			<p>${isFrench 
				? `Votre essai gratuit de 24 heures se termine dans ${hoursRemaining} heure${hoursRemaining > 1 ? 's' : ''}.`
				: `Your 24-hour free trial is ending in ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}.`}</p>
			<p>${isFrench 
				? 'Ne manquez pas l\'accès à toutes les activités pour enfants à Paris ! Passez votre précommande maintenant pour seulement 4,99€.'
				: 'Don\'t miss out on access to all children\'s activities in Paris! Place your preorder now for just €4.99.'}</p>
			<div style="text-align: center;">
				<a href="${preorderUrl}" class="button">${isFrench ? 'Passer ma précommande' : 'Place Preorder'}</a>
			</div>
			<p>${isFrench 
				? 'Utilisez le code promo LAUNCH20 pour 20% de réduction !'
				: 'Use promo code LAUNCH20 for 20% off!'}</p>
		</div>
		<div class="footer">
			<p>${isFrench ? 'Parc Ton Gosse - Activités pour enfants à Paris' : 'Parc Ton Gosse - Children\'s Activities in Paris'}</p>
		</div>
	</div>
</body>
</html>
		`
	};
}

/**
 * Activity Recommendation Email
 */
export function activityRecommendationEmail({ name, email, activities, locale = 'fr' }) {
	const isFrench = locale === 'fr';
	const browseUrl = `${BASE_URL}/`;
	
	return {
		subject: isFrench 
			? 'Nouvelles activités recommandées pour vous'
			: 'New Activities Recommended for You',
		html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
		.content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
		.activity { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; border-left: 4px solid #28a745; }
		.button { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
		.footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>${isFrench ? '🎯 Activités recommandées' : '🎯 Recommended Activities'}</h1>
		</div>
		<div class="content">
			<p>${isFrench ? `Bonjour ${name || 'cher utilisateur'},` : `Hello ${name || 'there'},`}</p>
			<p>${isFrench 
				? 'Nous avons sélectionné quelques activités qui pourraient vous intéresser :'
				: 'We\'ve selected some activities that might interest you:'}</p>
			${activities.slice(0, 3).map(activity => `
				<div class="activity">
					<h3 style="margin-top: 0;">${activity.title?.[locale] || activity.title || 'Activity'}</h3>
					<p style="margin: 8px 0;">${activity.description?.[locale] || activity.description || ''}</p>
					<p style="margin: 8px 0; color: #666; font-size: 14px;">
						${activity.price ? `💰 ${activity.price}€` : ''}
						${activity.neighborhood ? ` | 📍 ${activity.neighborhood}` : ''}
					</p>
				</div>
			`).join('')}
			<div style="text-align: center;">
				<a href="${browseUrl}" class="button">${isFrench ? 'Voir toutes les activités' : 'View All Activities'}</a>
			</div>
		</div>
		<div class="footer">
			<p>${isFrench ? 'Parc Ton Gosse - Activités pour enfants à Paris' : 'Parc Ton Gosse - Children\'s Activities in Paris'}</p>
		</div>
	</div>
</body>
</html>
		`
	};
}

