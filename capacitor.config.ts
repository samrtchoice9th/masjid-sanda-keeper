import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ahsanmasjid.sandakeeper',
  appName: 'masjid-sanda-keeper',
  webDir: 'dist',
  server: {
    url: 'https://08a7ce71-5295-4660-9ad7-d18f9e431cda.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
