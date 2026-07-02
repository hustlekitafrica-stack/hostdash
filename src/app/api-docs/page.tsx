'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabContent } from '@/components/ui/Tabs';

export default function APIDocsPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState('auth-register');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const endpoints = [
    {
      id: 'auth-register',
      method: 'POST',
      path: '/api/auth/register',
      category: 'Authentication',
      description: 'Register a new user account',
      request: {
        email: 'user@example.com',
        password: 'securepassword123',
        fullName: 'John Doe',
        businessName: 'My Properties',
      },
      response: {
        message: 'User registered successfully',
        user: {
          id: 'user_123',
          email: 'user@example.com',
        },
      },
    },
    {
      id: 'auth-login',
      method: 'POST',
      path: '/api/auth/login',
      category: 'Authentication',
      description: 'Login and get authentication token',
      request: {
        email: 'user@example.com',
        password: 'securepassword123',
      },
      response: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'user_123',
          email: 'user@example.com',
        },
      },
    },
    {
      id: 'properties-list',
      method: 'GET',
      path: '/api/properties',
      category: 'Properties',
      description: 'Get list of all properties',
      request: null,
      response: {
        data: [
          {
            id: 'prop_123',
            name: 'Beach Villa',
            type: 'villa',
            location: 'Mombasa',
            basePrice: 15000,
          },
        ],
        total: 1,
      },
    },
    {
      id: 'properties-create',
      method: 'POST',
      path: '/api/properties',
      category: 'Properties',
      description: 'Create a new property',
      request: {
        name: 'Beach Villa',
        type: 'villa',
        description: 'Luxury beachfront villa',
        location: 'Mombasa',
        basePrice: 15000,
      },
      response: {
        id: 'prop_123',
        name: 'Beach Villa',
        created: '2025-06-06T10:30:00Z',
      },
    },
    {
      id: 'bookings-list',
      method: 'GET',
      path: '/api/bookings',
      category: 'Bookings',
      description: 'Get list of all bookings',
      request: null,
      response: {
        data: [
          {
            id: 'bk_123',
            guestName: 'John Doe',
            property: 'Beach Villa',
            checkIn: '2025-06-10',
            checkOut: '2025-06-15',
            amount: 75000,
          },
        ],
        total: 1,
      },
    },
    {
      id: 'payments-record',
      method: 'POST',
      path: '/api/payments',
      category: 'Payments',
      description: 'Record a payment',
      request: {
        bookingId: 'bk_123',
        amount: 75000,
        paymentMethod: 'mpesa',
        transactionId: 'MPE123456',
      },
      response: {
        id: 'pay_123',
        bookingId: 'bk_123',
        amount: 75000,
        status: 'completed',
      },
    },
  ];

  const selected = endpoints.find((e) => e.id === selectedEndpoint);

  const docsTabs = [
    { label: 'Getting Started', value: 'getting-started', icon: '🚀' },
    { label: 'Authentication', value: 'authentication', icon: '🔐' },
    { label: 'Endpoints', value: 'endpoints', icon: '📡' },
    { label: 'Examples', value: 'examples', icon: '💻' },
  ];

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-surface-900">API Documentation</h1>
          <p className="text-surface-600 mt-2">
            Complete REST API reference for HostDash
          </p>
        </div>

        <Tabs items={docsTabs}>
          <TabContent value="getting-started">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome to HostDash API</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-surface-700">
                    The HostDash API allows you to programmatically manage your property
                    bookings, payments, guests, and more. Our API is built on REST principles
                    and returns JSON responses.
                  </p>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Base URL</h3>
                    <code className="text-sm text-blue-800">
                      https://api.hostdash.app/api
                    </code>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2">Authentication</h3>
                    <p className="text-sm text-green-800 mb-2">
                      All API requests require authentication using a Bearer token.
                    </p>
                    <code className="text-sm text-green-800 block">
                      Authorization: Bearer YOUR_API_KEY
                    </code>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Start</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-surface-900 mb-2">1. Get Your API Key</h3>
                    <p className="text-sm text-surface-600 mb-3">
                      Go to Settings → API Keys to generate your API key.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-surface-900 mb-2">2. Make Your First Request</h3>
                    <pre className="bg-surface-900 text-white p-4 rounded-lg text-sm overflow-x-auto">
                      {`curl -X GET https://api.hostdash.app/api/properties \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold text-surface-900 mb-2">3. Handle Responses</h3>
                    <p className="text-sm text-surface-600">
                      All responses are JSON. Success responses return 2xx status codes, errors
                      return 4xx or 5xx.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabContent>

          <TabContent value="authentication">
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-surface-900 mb-3">API Key Authentication</h3>
                  <p className="text-sm text-surface-600 mb-4">
                    Include your API key in the Authorization header of every request:
                  </p>
                  <pre className="bg-surface-100 p-4 rounded-lg text-sm overflow-x-auto">
                    {`Authorization: Bearer sk_live_abc123def456`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold text-surface-900 mb-3">Getting Your API Key</h3>
                  <ol className="text-sm text-surface-600 space-y-2 list-decimal list-inside">
                    <li>Log in to your HostDash account</li>
                    <li>Go to Settings → API Keys</li>
                    <li>Click "Generate New Key"</li>
                    <li>Copy your key and store it securely</li>
                  </ol>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2">⚠️ Security</h3>
                  <p className="text-sm text-red-800">
                    Never share your API key. If compromised, regenerate it immediately.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-surface-900 mb-3">Rate Limiting</h3>
                  <p className="text-sm text-surface-600 mb-3">
                    API requests are rate limited to 1000 requests per hour per API key.
                  </p>
                  <div className="bg-surface-100 p-4 rounded-lg text-sm">
                    <p className="font-medium text-surface-900 mb-2">Response Headers:</p>
                    <code className="text-surface-700">
                      X-RateLimit-Limit: 1000<br />
                      X-RateLimit-Remaining: 999<br />
                      X-RateLimit-Reset: 1623000000
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabContent>

          <TabContent value="endpoints">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Endpoints</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {endpoints.map((endpoint) => (
                      <button
                        key={endpoint.id}
                        onClick={() => setSelectedEndpoint(endpoint.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedEndpoint === endpoint.id
                            ? 'bg-primary-100 border border-primary-300'
                            : 'bg-surface-100 hover:bg-surface-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              endpoint.method === 'GET'
                                ? 'info'
                                : endpoint.method === 'POST'
                                ? 'success'
                                : 'default'
                            }
                          >
                            {endpoint.method}
                          </Badge>
                        </div>
                        <p className="text-xs text-surface-600 font-mono">
                          {endpoint.path}
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {selected && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          selected.method === 'GET'
                            ? 'info'
                            : selected.method === 'POST'
                            ? 'success'
                            : 'default'
                        }
                      >
                        {selected.method}
                      </Badge>
                      <CardTitle className="text-lg">{selected.path}</CardTitle>
                    </div>
                    <p className="text-sm text-surface-600 mt-2">
                      {selected.description}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {selected.request && (
                      <div>
                        <h3 className="font-semibold text-surface-900 mb-2">Request</h3>
                        <pre className="bg-surface-100 p-4 rounded-lg text-sm overflow-x-auto">
                          {JSON.stringify(selected.request, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div>
                      <h3 className="font-semibold text-surface-900 mb-2">Response</h3>
                      <pre className="bg-surface-100 p-4 rounded-lg text-sm overflow-x-auto">
                        {JSON.stringify(selected.response, null, 2)}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabContent>

          <TabContent value="examples">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Code Examples</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-surface-900 mb-2">JavaScript/Node.js</h3>
                    <pre className="bg-surface-900 text-white p-4 rounded-lg text-sm overflow-x-auto">
                      {`const response = await fetch(
  'https://api.hostdash.app/api/properties',
  {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    }
  }
);
const data = await response.json();
console.log(data);`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold text-surface-900 mb-2">Python</h3>
                    <pre className="bg-surface-900 text-white p-4 rounded-lg text-sm overflow-x-auto">
                      {`import requests

headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
}

response = requests.get(
    'https://api.hostdash.app/api/properties',
    headers=headers
)

data = response.json()
print(data)`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold text-surface-900 mb-2">cURL</h3>
                    <pre className="bg-surface-900 text-white p-4 rounded-lg text-sm overflow-x-auto">
                      {`curl -X GET https://api.hostdash.app/api/properties \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabContent>
        </Tabs>
      </div>
    </div>
  );
}
