export default function Head() {
  return (
    <>
      {/* Favicons */}
      <link rel="icon" href="/favicon/favicon.ico" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32.png" />
      <link rel="icon" type="image/png" sizes="48x48" href="/favicon/favicon-48.png" />
      <link rel="icon" type="image/png" sizes="64x64" href="/favicon/favicon-64.png" />
      <link rel="icon" type="image/png" sizes="192x192" href="/favicon/favicon-192.png" />
      <link rel="icon" type="image/png" sizes="512x512" href="/favicon/favicon-512.png" />

      {/* Apple Touch Icon for iOS */}
      <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/favicon/favicon-180.png" />

      {/* Theme Color for browser UI (Android Chrome) */}
      <meta name="theme-color" content="#0C764C" />

      {/* PWA Manifest */}
      <link rel="manifest" href="/manifest.json" />

      {/* Viewport for mobile */}
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

      {/* Status Bar Style for iOS */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="Noël en Famille 🎄" />

      {/* Microsoft Tiles */}
      <meta name="msapplication-config" content="/browserconfig.xml" />
    </>
  )
}
