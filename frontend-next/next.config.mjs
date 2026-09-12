/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Empacota servidor e só as dependências usadas numa pasta própria, para a
  // imagem Docker não carregar o node_modules inteiro (centenas de MB) nem o
  // código-fonte. Sem efeito em `next dev`.
  output: 'standalone',
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
      ],
    }];
  },
};

export default nextConfig;
