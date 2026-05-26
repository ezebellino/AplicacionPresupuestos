# Tenant Module Integration Block 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add direct cross-module navigation between `Clientes`, `Presupuestos`, and `Tesoreria` so each destination opens on the correct record and subsection automatically.

**Architecture:** Keep this block frontend-only in `DashboardPage.tsx`, using request-style local state for cross-module navigation. Reuse existing selected client and selected quote state, then add small bridging props to `ClientsView` and `QuotesView`.

**Tech Stack:** React, TypeScript, Vite, Vitest

---
