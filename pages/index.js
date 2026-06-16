// pages/index.js
// Forceux Workout Tracker — point d'entrée propre (React, plus de chaîne échappée)

import Head from 'next/head'
import ForceuxApp from '../components/ForceuxApp'
import { CSS } from '../components/forceuxStyles'

export default function Home() {
  return (
    <>
      <Head>
        <title>Forceux — Workout Tracker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <ForceuxApp />
    </>
  )
}
