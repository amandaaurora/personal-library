import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'MyLibrary - Personal Book Collection Manager';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#faf6fc',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Card container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            border: '3px solid #1a1a1a',
            padding: '60px 80px',
            boxShadow: '8px 8px 0 #1a1a1a',
          }}
        >
          {/* Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: '3px solid #1a1a1a',
              backgroundColor: '#ffffff',
              marginBottom: '30px',
            }}
          >
            <svg
              width="50"
              height="50"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              <path d="M12 6v7" />
              <path d="M8 9h8" />
            </svg>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: '#1a1a1a',
              marginBottom: '16px',
            }}
          >
            MyLibrary
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 28,
              color: '#666666',
              textAlign: 'center',
              maxWidth: '600px',
            }}
          >
            Your personal book collection manager
          </div>

          {/* Stats preview */}
          <div
            style={{
              display: 'flex',
              gap: '20px',
              marginTop: '40px',
            }}
          >
            {[
              { label: 'Track', color: '#e2d9f3' },
              { label: 'Organize', color: '#cce5ff' },
              { label: 'Discover', color: '#d4edda' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px 24px',
                  backgroundColor: item.color,
                  borderRadius: '8px',
                  border: '2px solid #1a1a1a',
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#1a1a1a',
                }}
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
