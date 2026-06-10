# Phase 35 Kubernetes Kustomize Overlays Update Notes

**Updated:** June 10, 2026
**Project:** MiniRTOS Playground
**Phase:** Phase 35 — Kubernetes Deployment Hardening with Kustomize

---

## What Changed

Before Phase 35, Kubernetes manifests in `k8s/` directly embedded image names.
Switching between local kind images and GHCR images required manually editing
`04-backend-deployment.yml` and `05-frontend-deployment.yml`.

Phase 35 restructures the manifests using Kustomize:
