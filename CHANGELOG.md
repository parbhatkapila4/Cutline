# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- `useCopyToClipboard` hook for consistent copy-to-clipboard UX
- `CopyLinkButton` component for video link sharing
- Skeleton loaders for dashboard (usage, recent activity, tokens, plan, overview stats, videos grid)
- JSDoc for pipeline orchestrator stages and key functions

### Changed

- **GenerateFlow**: Refactored `submitRenderFinal` to async/await; extracted `STAGE_INTERVAL_MS` constant; replaced duplicated copy logic with `CopyLinkButton`
- **Dashboard**: `DashboardVideoItem.videoUrl` is now optional (only present for completed); added `timestamp` for sorting; sort videos by numeric timestamp instead of formatted date string
- **Layout**: Root `html` uses `className="dark"` for dark theme
- **Dashboard video detail**: Fixed `bg-linear-to-br` → `bg-gradient-to-br`; removed redundant "Regenerating" sticky bar (kept inline chat bubble)
- **Orchestrator**: Added logging for chunk unlink failures instead of silent catch
