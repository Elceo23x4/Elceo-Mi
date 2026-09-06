'use client';

import * as Sentry from '@sentry/nextjs';
import { useState } from 'react';

export function SentrySymbolicationProbe() {
  const [eventId, setEventId] = useState<string>();
  const [denied, setDenied] = useState(false);

  function captureSymbolicationProbe() {
    if (process.env.NEXT_PUBLIC_APP_ENV !== 'staging') {
      setDenied(true);
      return;
    }

    const error = new Error('ELCEO Sentry native symbolication probe');
    error.name = 'ELCEOSentryNativeSymbolicationProbeV2';
    const capturedEventId = Sentry.captureException(error, {
      tags: {
        scope: 'diagnostic.sentry-symbolication',
        category: 'diagnostic'
      }
    });
    setEventId(capturedEventId);
  }

  return (
    <div aria-live="polite">
      <button type="button" className="elceo-pill-button" onClick={captureSymbolicationProbe}>
        Capture native exception
      </button>
      {eventId ? <p>Event ID: <code>{eventId}</code></p> : null}
      {denied ? <p>Capture denied outside staging.</p> : null}
    </div>
  );
}
