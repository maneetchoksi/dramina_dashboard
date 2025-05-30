# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.3.3 dashboard application called "dramina_dashboard" built with:
- React 19
- TypeScript with strict mode
- Tailwind CSS v4
- App Router architecture (src/app directory)
- Geist font family optimization
- Turbopack for development

## Development Commands

- `npm run dev` - Start development server with Turbopack (default port 3000)
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint with Next.js configuration

## Architecture

The application uses Next.js App Router with TypeScript:
- Entry point: `src/app/page.tsx` 
- Root layout: `src/app/layout.tsx` (includes Geist font setup and metadata)
- Global styles: `src/app/globals.css`
- TypeScript path alias: `@/*` maps to `./src/*`
- ESLint configuration extends Next.js recommended rules

## Key Configuration

- TypeScript target: ES2017 with strict mode enabled
- Next.js plugin integration for enhanced TypeScript support
- Tailwind CSS with PostCSS configuration
- Font optimization using `next/font/google` for Geist Sans and Geist Mono