#!/usr/bin/env node

/**
 * QR Code Generator for Parc Ton Gosse
 * 
 * Usage:
 *   node generate-qr-code.js https://your-site-url.com
 * 
 * Or edit the URL below and run: node generate-qr-code.js
 */

import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get URL from command line argument or use default
const siteUrl = process.argv[2] || 'https://parctongosse.com';

// Options for QR code
const options = {
	errorCorrectionLevel: 'H', // High error correction (30% can be damaged)
	type: 'png',
	quality: 0.92,
	margin: 2,
	color: {
		dark: '#1e293b', // Dark blue-gray
		light: '#FFFFFF' // White
	},
	width: 500
};

async function generateQRCode() {
	try {
		console.log(`📱 Generating QR code for: ${siteUrl}`);
		
		// Generate QR code as PNG
		const qrCodePath = path.join(__dirname, 'qr-code.png');
		await qrcode.toFile(qrCodePath, siteUrl, options);
		
		console.log(`✅ QR code generated: ${qrCodePath}`);
		
		// Also generate as SVG for better scalability
		const qrCodeSvgPath = path.join(__dirname, 'qr-code.svg');
		const svgString = await qrcode.toString(siteUrl, { 
			type: 'svg',
			errorCorrectionLevel: 'H',
			margin: 2,
			color: {
				dark: '#1e293b',
				light: '#FFFFFF'
			}
		});
		fs.writeFileSync(qrCodeSvgPath, svgString);
		
		console.log(`✅ QR code SVG generated: ${qrCodeSvgPath}`);
		
		// Generate HTML page with QR code
		const htmlPath = path.join(__dirname, 'qr-code.html');
		const html = `<!DOCTYPE html>
<html lang="fr">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>QR Code - Parc Ton Gosse</title>
	<style>
		body {
			font-family: system-ui, sans-serif;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			min-height: 100vh;
			margin: 0;
			padding: 20px;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		}
		.container {
			background: white;
			padding: 40px;
			border-radius: 20px;
			box-shadow: 0 20px 60px rgba(0,0,0,0.3);
			text-align: center;
			max-width: 500px;
		}
		h1 {
			color: #1e293b;
			margin-bottom: 10px;
		}
		p {
			color: #64748b;
			margin-bottom: 30px;
		}
		.qr-code {
			margin: 20px 0;
		}
		.qr-code img {
			width: 100%;
			max-width: 400px;
			height: auto;
			border: 4px solid #f1f5f9;
			border-radius: 12px;
		}
		.url {
			background: #f8fafc;
			padding: 15px;
			border-radius: 8px;
			margin: 20px 0;
			word-break: break-all;
			font-family: monospace;
			color: #3b82f6;
			font-weight: 600;
		}
		.instructions {
			background: #eff6ff;
			padding: 20px;
			border-radius: 8px;
			margin-top: 20px;
			text-align: left;
		}
		.instructions h3 {
			margin-top: 0;
			color: #1e40af;
		}
		.instructions ol {
			color: #475569;
			line-height: 1.8;
		}
		.download-buttons {
			display: flex;
			gap: 10px;
			justify-content: center;
			margin-top: 20px;
			flex-wrap: wrap;
		}
		.download-buttons a {
			padding: 10px 20px;
			background: #3b82f6;
			color: white;
			text-decoration: none;
			border-radius: 8px;
			font-weight: 500;
		}
		.download-buttons a:hover {
			background: #2563eb;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>📱 Parc Ton Gosse</h1>
		<p>Scannez ce code QR pour accéder à la plateforme</p>
		
		<div class="qr-code">
			<img src="qr-code.png" alt="QR Code pour Parc Ton Gosse">
		</div>
		
		<div class="url">
			${siteUrl}
		</div>
		
		<div class="download-buttons">
			<a href="qr-code.png" download>📥 Télécharger PNG</a>
			<a href="qr-code.svg" download>📥 Télécharger SVG</a>
		</div>
		
		<div class="instructions">
			<h3>Comment utiliser ce QR code:</h3>
			<ol>
				<li>Scannez le code avec l'appareil photo de votre téléphone</li>
				<li>Ou utilisez une application de scan QR code</li>
				<li>Le lien s'ouvrira automatiquement dans votre navigateur</li>
			</ol>
			<h3>Où utiliser ce QR code:</h3>
			<ul>
				<li>📄 Flyers et brochures</li>
				<li>📧 Emails et newsletters</li>
				<li>📱 Réseaux sociaux</li>
				<li>🏢 Affichage public (affiches, panneaux)</li>
				<li>📰 Publicités imprimées</li>
			</ul>
		</div>
	</div>
</body>
</html>`;
		
		fs.writeFileSync(htmlPath, html);
		console.log(`✅ HTML page generated: ${htmlPath}`);
		
		console.log('\n📋 Next steps:');
		console.log(`1. Open ${htmlPath} in your browser to view the QR code`);
		console.log(`2. Download qr-code.png or qr-code.svg for printing`);
		console.log(`3. Share the QR code image wherever you need it!`);
		console.log(`\n💡 Tip: Update the URL in this script if your site URL changes`);
		
	} catch (error) {
		console.error('❌ Error generating QR code:', error);
		process.exit(1);
	}
}

generateQRCode();

