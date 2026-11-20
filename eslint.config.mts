import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { globalIgnores, defineConfig } from 'eslint/config';

export default defineConfig(
	globalIgnores([
		'node_modules',
		'dist',
		'esbuild.config.mjs',
		'version-bump.mjs',
		'versions.json',
		'main.js',
		'package.json',
		'package-lock.json',
		'tsconfig.json',
		'dev-vault',
		'coverage',
		'harness-dist',
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mts', 'manifest.json', 'scripts/link-dev-vault.mjs', 'scripts/build-harness.mjs', 'scripts/install.mjs', 'scripts/bump.mjs', 'scripts/check-version.mjs', 'vitest.config.mts'],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		// Dev-only tooling: the Obsidian plugin guidelines apply to shipped code, not generators.
		files: ['scripts/**'],
		rules: {
			'obsidianmd/rule-custom-message': 'off',
			'obsidianmd/hardcoded-config-path': 'off',
			'obsidianmd/prefer-create-el': 'off',
			'obsidianmd/no-static-styles-assignment': 'off',
		},
	},
);
