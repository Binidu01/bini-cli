import React from 'react';
import './globals.css';

export const metadata = {
  title      : '{{APP_NAME}}',
  description: 'Modern React application built with Bini.js',
  keywords   : ['Bini.js', 'React', 'Vite'],
  themeColor : '#00CFFF',
  manifest   : '/site.webmanifest',
  openGraph: {
    siteName   : '{{APP_NAME}}',
    title      : '{{APP_NAME}}',
    description: 'Modern React application built with Bini.js',
    images     : [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card   : 'summary_large_image',
    title  : '{{APP_NAME}}',
    creator: '@binidu01',
    images : ['/og-image.png'],
  },
  icons: {
    icon : [{ url: '/favicon.ico', type: 'image/x-icon' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};

const jsonLd = {
  '@context'   : 'https://schema.org',
  '@type'      : 'WebSite',
  name         : 'Bini.js',
  alternateName: 'Bini',
  url          : 'https://bini.js.org/',
};

export default function RootLayout({ children }) {
  return (
    <React.Fragment>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </React.Fragment>
  );
}
