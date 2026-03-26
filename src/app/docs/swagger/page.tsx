'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function SwaggerPage() {
  return (
    <div className="min-h-screen swagger-wrapper">
      <style>{`
        .swagger-ui {
          background: var(--bg, #09090b) !important;
          color: var(--fg, #fafafa) !important;
        }
        .swagger-ui .topbar {
          background: var(--card, #18181b) !important;
          border-bottom: 1px solid var(--border, #27272a) !important;
        }
        .swagger-ui .information-container {
          background: var(--card, #18181b) !important;
          border: 1px solid var(--border, #27272a) !important;
          border-radius: 8px;
          padding: 16px !important;
          margin: 16px !important;
        }
        .swagger-ui .model-container {
          background: var(--card, #18181b) !important;
          border: 1px solid var(--border, #27272a) !important;
          border-radius: 8px;
        }
        .swagger-ui .opblock {
          border: 1px solid var(--border, #27272a) !important;
          border-radius: 8px;
          margin: 8px 0 !important;
          background: var(--card, #18181b) !important;
        }
        .swagger-ui .opblock-summary {
          background: var(--card-hover, #1f1f23) !important;
          border-radius: 8px 8px 0 0;
        }
        .swagger-ui .opblock.opblock-get .opblock-summary {
          background: rgba(34, 197, 94, 0.1) !important;
        }
        .swagger-ui .opblock.opblock-post .opblock-summary {
          background: rgba(59, 130, 246, 0.1) !important;
        }
        .swagger-ui .opblock.opblock-put .opblock-summary {
          background: rgba(245, 158, 11, 0.1) !important;
        }
        .swagger-ui .opblock.opblock-delete .opblock-summary {
          background: rgba(239, 68, 68, 0.1) !important;
        }
        .swagger-ui .scheme-container {
          background: var(--card, #18181b) !important;
          border: 1px solid var(--border, #27272a) !important;
          border-radius: 8px;
          padding: 16px !important;
        }
        .swagger-ui .btn {
          color: var(--fg, #fafafa) !important;
          border-color: var(--border, #27272a) !important;
        }
        .swagger-ui .btn:focus,
        .swagger-ui .btn:hover {
          background-color: var(--accent, #6d5aed) !important;
          border-color: var(--accent, #6d5aed) !important;
        }
        .swagger-ui .parameter__in {
          color: var(--muted, #a1a1aa) !important;
        }
        .swagger-ui .responses-wrapper {
          background: transparent !important;
        }
        .swagger-ui table {
          background: transparent !important;
        }
        .swagger-ui table thead tr {
          background: var(--card-hover, #1f1f23) !important;
          border-bottom: 1px solid var(--border, #27272a) !important;
        }
        .swagger-ui table tbody tr {
          border-bottom: 1px solid var(--border, #27272a) !important;
        }
        .swagger-ui table tbody tr:hover {
          background: var(--card-hover, #1f1f23) !important;
        }
        .swagger-ui .response-col_description__inner > p {
          color: var(--muted, #a1a1aa) !important;
        }
        .swagger-ui .markdown p,
        .swagger-ui .markdown li {
          color: var(--fg, #fafafa) !important;
        }
        .swagger-ui code,
        .swagger-ui .model-box {
          background: var(--code-bg, #0c0c0f) !important;
          border: 1px solid var(--border, #27272a) !important;
          color: var(--accent-light, #8b7cf6) !important;
          border-radius: 4px;
        }
        .swagger-ui .response {
          border: 1px solid var(--border, #27272a) !important;
          border-radius: 8px;
          background: var(--card, #18181b) !important;
        }
        .swagger-ui .response-content-type.controls-content-type {
          color: var(--muted, #a1a1aa) !important;
        }
      `}</style>
      <SwaggerUI url="/openapi.yaml" />
    </div>
  );
}
