import React from 'react'
import './globals.css'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Bini.js',
  alternateName: 'Bini',
  url: 'https://bini.js.org/',
}

export const document = {
  head: (
    <>
      <title>My Bini App</title>
      <meta name="description" content="Modern React application built with Bini.js" />
      <meta name="keywords" content="Bini.js, React, Vite" />
      <meta name="theme-color" content="#00CFFF" />

      <link rel="manifest" href="/site.webmanifest" />
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

      <meta property="og:site_name" content="My Bini App" />
      <meta property="og:title" content="My Bini App" />
      <meta property="og:description" content="Modern React application built with Bini.js" />
      <meta property="og:image" content="/og-image.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="My Bini App" />
      <meta name="twitter:creator" content="@binidu01" />
      <meta name="twitter:image" content="/og-image.png" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  ),
}

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal?: React.ReactNode
}) {
  return (
    <React.Fragment>
      {children}
      {modal}
    </React.Fragment>
  )
}