import type { Plugin } from 'vite';
import { editRequestMockResponse } from '../src/mocks/editRequestMock';

export function mockApiPlugin(): Plugin {
  return {
    name: 'mock-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Intercept the editRequest.php endpoint
        if (req.url === '/api/editRequest.php' || req.url?.startsWith('/api/editRequest.php?')) {
          console.log('🎭 Mock API intercepted:', req.url);

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.statusCode = 200;
          res.end(JSON.stringify(editRequestMockResponse));
          return;
        }

        next();
      });
    },
  };
}
