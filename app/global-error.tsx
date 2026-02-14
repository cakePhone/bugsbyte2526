'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ backgroundColor: '#121212', color: '#fff', fontFamily: 'monospace' }}>
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{ 
            border: '4px solid #ef4444',
            padding: '2rem',
            maxWidth: '500px'
          }}>
            <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>
              CRITICAL SYSTEM FAILURE
            </h2>
            <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
              {error.message || 'A critical error occurred'}
            </p>
            <button
              onClick={reset}
              style={{
                backgroundColor: '#ef4444',
                color: '#000',
                padding: '0.5rem 1rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              RESTART SYSTEM
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
