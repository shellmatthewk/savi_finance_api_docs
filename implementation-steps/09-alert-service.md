# Step 09: Alert Service Setup

## Goal
Create a unified alerting service for critical system events.

## Prerequisites
- None (independent module)

---

## Tasks

### Task 9.1: Create Alert Service
Create `src/lib/alerts.ts` with unified interface.

```typescript
// src/lib/alerts.ts

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertChannel = 'slack' | 'email' | 'pagerduty';

export interface Alert {
  title: string;
  message: string;
  severity: AlertSeverity;
  context?: Record<string, unknown>;
  timestamp?: string;
}

interface AlertConfig {
  slackWebhookUrl?: string;
  pagerdutyKey?: string;
  emailTo?: string;
  emailFrom?: string;
}

const config: AlertConfig = {
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  pagerdutyKey: process.env.PAGERDUTY_KEY,
  emailTo: process.env.ALERT_EMAIL_TO,
  emailFrom: process.env.ALERT_EMAIL_FROM
};

/**
 * Send alert to configured channels
 */
export async function sendAlert(alert: Alert): Promise<void> {
  const fullAlert = {
    ...alert,
    timestamp: alert.timestamp || new Date().toISOString()
  };

  console.log('[ALERT]', fullAlert);

  const promises: Promise<void>[] = [];

  // Route based on severity
  if (config.slackWebhookUrl) {
    promises.push(sendSlackAlert(fullAlert));
  }

  if (alert.severity === 'critical' && config.pagerdutyKey) {
    promises.push(sendPagerDutyAlert(fullAlert));
  }

  // Wait for all alerts to send (but don't fail if one fails)
  await Promise.allSettled(promises);
}

/**
 * Send to Slack
 */
async function sendSlackAlert(alert: Alert): Promise<void> {
  if (!config.slackWebhookUrl) return;

  const color = {
    info: '#36a64f',
    warning: '#ffcc00',
    critical: '#ff0000'
  }[alert.severity];

  const payload = {
    attachments: [
      {
        color,
        title: `${severityEmoji(alert.severity)} ${alert.title}`,
        text: alert.message,
        fields: Object.entries(alert.context || {}).map(([key, value]) => ({
          title: key,
          value: String(value),
          short: true
        })),
        footer: 'FinFlux API Alerts',
        ts: Math.floor(new Date(alert.timestamp!).getTime() / 1000)
      }
    ]
  };

  try {
    const response = await fetch(config.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('[SLACK] Alert failed:', response.status);
    }
  } catch (error) {
    console.error('[SLACK] Alert error:', error);
  }
}

/**
 * Send to PagerDuty
 */
async function sendPagerDutyAlert(alert: Alert): Promise<void> {
  if (!config.pagerdutyKey) return;

  const payload = {
    routing_key: config.pagerdutyKey,
    event_action: 'trigger',
    payload: {
      summary: alert.title,
      source: 'finflux-api',
      severity: alert.severity,
      custom_details: {
        message: alert.message,
        ...alert.context
      }
    }
  };

  try {
    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('[PAGERDUTY] Alert failed:', response.status);
    }
  } catch (error) {
    console.error('[PAGERDUTY] Alert error:', error);
  }
}

function severityEmoji(severity: AlertSeverity): string {
  return {
    info: 'ℹ️',
    warning: '⚠️',
    critical: '🚨'
  }[severity];
}
```

### Task 9.2: Create Predefined Alerts
Add common alert templates.

```typescript
// Add to src/lib/alerts.ts

export const Alerts = {
  ingestionFailure(
    provider: string,
    error: string,
    consecutiveFailures: number
  ): Alert {
    return {
      title: `Data Ingestion Failed: ${provider}`,
      message: error,
      severity: consecutiveFailures >= 2 ? 'critical' : 'warning',
      context: {
        provider,
        consecutiveFailures,
        action: 'Check provider API status and logs'
      }
    };
  },

  cacheHitRateLow(hitRate: number, threshold: number): Alert {
    return {
      title: 'Cache Hit Rate Below Threshold',
      message: `Cache hit rate is ${(hitRate * 100).toFixed(1)}%, below ${threshold}% threshold`,
      severity: 'warning',
      context: {
        currentHitRate: `${(hitRate * 100).toFixed(1)}%`,
        threshold: `${threshold}%`,
        action: 'Check cache warming and invalidation'
      }
    };
  },

  serviceDown(service: string): Alert {
    return {
      title: `Service Unavailable: ${service}`,
      message: `${service} is not responding to health checks`,
      severity: 'critical',
      context: {
        service,
        action: `Check ${service} logs and infrastructure`
      }
    };
  },

  highErrorRate(endpoint: string, errorRate: number): Alert {
    return {
      title: 'High Error Rate Detected',
      message: `${endpoint} has ${(errorRate * 100).toFixed(1)}% error rate`,
      severity: errorRate > 0.1 ? 'critical' : 'warning',
      context: {
        endpoint,
        errorRate: `${(errorRate * 100).toFixed(1)}%`,
        action: 'Check endpoint logs for errors'
      }
    };
  },

  staleDataServed(symbol: string, daysOld: number): Alert {
    return {
      title: 'Stale Data Being Served',
      message: `${symbol} data is ${daysOld} days old`,
      severity: daysOld > 3 ? 'critical' : 'warning',
      context: {
        symbol,
        daysOld,
        action: 'Check ingestion for this symbol'
      }
    };
  }
};
```

### Task 9.3: Add Environment Variables
Update `.env.example` with alert configuration.

```bash
# Add to .env.example

# Alerting Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
PAGERDUTY_KEY=your-pagerduty-integration-key
ALERT_EMAIL_TO=alerts@yourcompany.com
ALERT_EMAIL_FROM=finflux-api@yourcompany.com
```

### Task 9.4: Create Alert Test Endpoint

```typescript
// Create src/app/api/admin/alerts/test/route.ts
import { NextResponse } from 'next/server';
import { sendAlert, Alerts } from '@/lib/alerts';
import { verifyAdminAuth } from '@/lib/auth';

export async function POST(request: Request) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Send test alert
  await sendAlert({
    title: 'Test Alert',
    message: 'This is a test alert from FinFlux API',
    severity: 'info',
    context: {
      triggeredBy: 'Admin test endpoint'
    }
  });

  return NextResponse.json({
    success: true,
    message: 'Test alert sent to configured channels'
  });
}
```

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/lib/alerts.ts` |
| Create | `src/app/api/admin/alerts/test/route.ts` |
| Modify | `.env.example` |

---

## Acceptance Criteria

- [ ] `sendAlert` sends to Slack webhook
- [ ] Critical alerts also go to PagerDuty
- [ ] Predefined alert templates available
- [ ] Test endpoint sends alert successfully
- [ ] Alert failures don't crash the application

---

## Testing

```bash
# Set up Slack webhook (get from Slack workspace settings)
# Add SLACK_WEBHOOK_URL to .env.local

# Test alert endpoint
curl -X POST "http://localhost:3000/api/admin/alerts/test" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Verify alert received in Slack
```

---

## Next Step
Proceed to `10-alert-integration.md`
