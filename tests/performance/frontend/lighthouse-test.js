const fs = require('fs');
const path = require('path');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const { execSync } = require('child_process');

/**
 * Runs Lighthouse performance tests against the application's frontend
 */
async function runLighthouseTests(url = 'http://localhost:5173') {
	console.log(`Running Lighthouse performance tests on ${url}`);

	// Launch Chrome
	const chrome = await chromeLauncher.launch({
		chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
	});

	// Configure Lighthouse
	const options = {
		logLevel: 'info',
		output: 'json',
		port: chrome.port,
		onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
	};

	// Run Lighthouse tests
	try {
		console.log('Starting Lighthouse audit...');
		const results = await lighthouse(url, options);

		// Create output directory if it doesn't exist
		const outputDir = path.join(__dirname, 'results');
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		// Generate timestamped filename
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const outputPath = path.join(
			outputDir,
			`lighthouse-report-${timestamp}.json`
		);

		// Save report
		fs.writeFileSync(outputPath, JSON.stringify(results.lhr, null, 2));

		// Generate HTML report
		const htmlReport = path.join(
			outputDir,
			`lighthouse-report-${timestamp}.html`
		);
		fs.writeFileSync(htmlReport, results.report);

		console.log(`\n🔍 Performance audit complete!`);
		console.log(`\n📊 Performance Metrics:`);
		console.log(
			`First Contentful Paint: ${results.lhr.audits['first-contentful-paint'].displayValue}`
		);
		console.log(
			`Speed Index: ${results.lhr.audits['speed-index'].displayValue}`
		);
		console.log(
			`Largest Contentful Paint: ${results.lhr.audits['largest-contentful-paint'].displayValue}`
		);
		console.log(
			`Time to Interactive: ${results.lhr.audits['interactive'].displayValue}`
		);
		console.log(
			`Total Blocking Time: ${results.lhr.audits['total-blocking-time'].displayValue}`
		);
		console.log(
			`Cumulative Layout Shift: ${results.lhr.audits['cumulative-layout-shift'].displayValue}`
		);

		console.log(`\n🏆 Scores:`);
		console.log(
			`Performance: ${Math.round(
				results.lhr.categories.performance.score * 100
			)}`
		);
		console.log(
			`Accessibility: ${Math.round(
				results.lhr.categories.accessibility.score * 100
			)}`
		);
		console.log(
			`Best Practices: ${Math.round(
				results.lhr.categories['best-practices'].score * 100
			)}`
		);
		console.log(`SEO: ${Math.round(results.lhr.categories.seo.score * 100)}`);

		console.log(`\n📄 Full report saved to: ${outputPath}`);
		console.log(`📄 HTML report saved to: ${htmlReport}`);

		return {
			scores: {
				performance: results.lhr.categories.performance.score * 100,
				accessibility: results.lhr.categories.accessibility.score * 100,
				bestPractices: results.lhr.categories['best-practices'].score * 100,
				seo: results.lhr.categories.seo.score * 100,
			},
			metrics: {
				fcp: results.lhr.audits['first-contentful-paint'].numericValue,
				si: results.lhr.audits['speed-index'].numericValue,
				lcp: results.lhr.audits['largest-contentful-paint'].numericValue,
				tti: results.lhr.audits['interactive'].numericValue,
				tbt: results.lhr.audits['total-blocking-time'].numericValue,
				cls: results.lhr.audits['cumulative-layout-shift'].numericValue,
			},
			reportPath: outputPath,
		};
	} catch (error) {
		console.error('Error running Lighthouse:', error);
		throw error;
	} finally {
		await chrome.kill();
	}
}

/**
 * Compare current results with previous benchmark to track regression
 */
function compareWithBaseline(currentResults, baselinePath) {
	try {
		if (!fs.existsSync(baselinePath)) {
			console.log('\n⚠️ No baseline report found for comparison');
			return null;
		}

		const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

		console.log('\n📊 Performance comparison with baseline:');

		const compareScore = (name, current, baseline) => {
			const diff = current - baseline;
			const indicator = diff >= 0 ? '✅' : '❌';
			console.log(
				`${name}: ${Math.round(current)} (${diff >= 0 ? '+' : ''}${diff.toFixed(
					1
				)}) ${indicator}`
			);
		};

		compareScore(
			'Performance',
			currentResults.scores.performance,
			baseline.scores.performance
		);
		compareScore(
			'Accessibility',
			currentResults.scores.accessibility,
			baseline.scores.accessibility
		);
		compareScore(
			'Best Practices',
			currentResults.scores.bestPractices,
			baseline.scores.bestPractices
		);
		compareScore('SEO', currentResults.scores.seo, baseline.scores.seo);

		return {
			performanceDiff:
				currentResults.scores.performance - baseline.scores.performance,
			accessibilityDiff:
				currentResults.scores.accessibility - baseline.scores.accessibility,
			bestPracticesDiff:
				currentResults.scores.bestPractices - baseline.scores.bestPractices,
			seoDiff: currentResults.scores.seo - baseline.scores.seo,
		};
	} catch (error) {
		console.error('Error comparing with baseline:', error);
		return null;
	}
}

/**
 * Main execution function
 */
async function main() {
	const args = process.argv.slice(2);
	const url = args[0] || 'http://localhost:5173';
	const baselinePath = path.join(__dirname, 'results', 'baseline.json');
	let setAsBaseline = false;

	// Check if we should set this run as the baseline
	if (args.includes('--set-baseline')) {
		setAsBaseline = true;
	}

	console.log('Starting frontend performance testing...');

	try {
		// Run Lighthouse tests
		const results = await runLighthouseTests(url);

		// Compare with baseline if not setting as baseline
		if (!setAsBaseline) {
			compareWithBaseline(results, baselinePath);
		}

		// Set as baseline if requested
		if (setAsBaseline) {
			fs.writeFileSync(baselinePath, JSON.stringify(results, null, 2));
			console.log('\n✅ Set as new performance baseline!');
		}

		// Exit with success
		process.exit(0);
	} catch (error) {
		console.error('\nFrontend performance testing failed:', error);
		process.exit(1);
	}
}

// Run the script
if (require.main === module) {
	main();
}

module.exports = {
	runLighthouseTests,
	compareWithBaseline,
};
