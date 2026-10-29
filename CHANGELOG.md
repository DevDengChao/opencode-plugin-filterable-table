# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Published package as `@devdengchao/opencode-plugin-filterable-table`
- Added the `release.yml` GitHub Actions workflow for npm Trusted Publishing with OIDC
- Added npm installation instructions and npm badges to both READMEs

### Changed

- Updated Vitest to 4.1.12 and pinned the transitive glob 10.x dependency to 10.5.0 to address development dependency security alerts
- Normalized `package-lock.json` resolved URLs to `https://registry.npmjs.org` for public CI and contributors

## [0.1.0] - 2026-10-29

### Added

- Filter buttons in Markdown table headers inside OpenCode Desktop sessions
- Multi-select value filtering with per-value row counts
- Search for long value lists
- Select all, select none, and reset for each column
- Combined filtering across columns (AND across columns, OR within a column)
- Visible/total row footer with a one-click clear action
- Command palette action to clear every table filter
- Filter state retention across table re-renders by session message part
- Chinese and English copy driven by the OpenCode locale
- Light and dark theme support through OpenCode theme variables
- Standalone browser demo page
- jsdom tests covering filtering, selection controls, search, empty values, keyboard close, and DOM replacement

### Notes

- Developed and verified with OpenCode Desktop 2.2.1.
- The Desktop GUI plugin API is experimental and may change.
- The implementation relies on OpenCode's Markdown table DOM structure.

[Unreleased]: https://github.com/DevDengChao/opencode-plugin-filterable-table/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/DevDengChao/opencode-plugin-filterable-table/releases/tag/v0.1.0
