"use client";

import Script from "next/script";

export default function GoogleAnalytics({ gaId }: { gaId: string }) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="lazyOnload"
      />
      <Script id="google-analytics" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          // Configure Google Analytics 4 with first-party cookies only
          // This prevents third-party cookie usage and complies with Privacy Sandbox requirements
          // Reference: https://privacysandbox.google.com/cookies/prepare/overview
          
          // Get current domain for first-party cookie configuration
          const currentDomain = window.location.hostname;
          
          gtag('config', '${gaId}', {
            // Explicitly set cookie domain to current domain (first-party only)
            // This ensures cookies are set on the same domain, not as third-party
            cookie_domain: currentDomain,
            // Set cookie path to root to ensure first-party scope
            cookie_path: '/',
            // Cookie expiration (in seconds) - 2 years for GA4 default
            cookie_expires: 63072000,
            // Update existing cookies instead of creating new ones
            cookie_update: true,
            // Use SameSite=Lax for first-party cookies (allows same-site navigation)
            // Secure flag ensures HTTPS-only cookies
            cookie_flags: 'SameSite=Lax;Secure',
            // Anonymize IP addresses for privacy compliance
            anonymize_ip: true,
            // Disable advertising features to reduce cookie usage
            allow_google_signals: false,
            allow_ad_personalization_signals: false,
            // Respect Do Not Track header
            respect_dnt: true,
            // Use first-party data collection only
            send_page_view: true,
            // Disable cross-domain tracking to prevent third-party cookie usage
            linker: {
              domains: []
            },
          });
        `}
      </Script>
    </>
  );
}
