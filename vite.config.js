import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'cashfree-middleware',
      configureServer(server) {
        server.middlewares.use('/api/cashfree', (req, res) => {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            const cashfreePath = req.url || '/pg/links'
            const options = {
              hostname: 'api.cashfree.com',
              path: cashfreePath,
              method: req.method || 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'x-client-id': req.headers['x-client-id'] || '',
                'x-client-secret': req.headers['x-client-secret'] || '',
                'x-api-version': req.headers['x-api-version'] || '2022-09-01',
              },
            }
            const proxyReq = https.request(options, proxyRes => {
              let data = ''
              proxyRes.on('data', chunk => { data += chunk })
              proxyRes.on('end', () => {
                res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
                res.end(data)
              })
            })
            proxyReq.on('error', err => {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: err.message }))
            })
            proxyReq.write(body)
            proxyReq.end()
          })
        })
      },
    },
  ],
  server: {
    allowedHosts: ['bhakti.vaomi.org'],
  },
})
