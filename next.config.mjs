/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  output: 'standalone', // small self-contained build for Docker / systemd
  poweredByHeader: false,
  devIndicators: false, // hides the round "N" dev badge (only ever shown by npm run dev)
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'same-origin' },
    ] }];
  },
  // Next 16 blocks dev-mode assets (JS) when the page is opened from another machine/IP -> blank page.
  // Add the address you browse from (LAN IPs of your server or PC).
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.16.*.*', '*.local'],
};
