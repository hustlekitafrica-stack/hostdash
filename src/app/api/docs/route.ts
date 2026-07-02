import { NextResponse } from 'next/server';

export async function GET() {
  const apiDocs = {
    openapi: '3.0.0',
    info: {
      title: 'HostDash API',
      description: 'Complete REST API for property management system',
      version: '1.0.0',
      contact: {
        name: 'HostDash Support',
        email: 'support@hostdash.app',
        url: 'https://hostdash.app',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
      {
        url: 'https://api.hostdash.app',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    paths: {
      '/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    fullName: { type: 'string' },
                    businessName: { type: 'string' },
                  },
                  required: ['email', 'password', 'fullName', 'businessName'],
                },
              },
            },
          },
          responses: {
            201: {
              description: 'User registered successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          email: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: 'Invalid input' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Login user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                  required: ['email', 'password'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Login successful',
            },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/properties': {
        get: {
          tags: ['Properties'],
          summary: 'List all properties',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 10 },
            },
            {
              name: 'offset',
              in: 'query',
              schema: { type: 'integer', default: 0 },
            },
          ],
          responses: {
            200: {
              description: 'List of properties',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            type: { type: 'string' },
                            location: { type: 'string' },
                          },
                        },
                      },
                      total: { type: 'integer' },
                    },
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          tags: ['Properties'],
          summary: 'Create a new property',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    description: { type: 'string' },
                    location: { type: 'string' },
                    basePrice: { type: 'number' },
                  },
                  required: ['name', 'type', 'location', 'basePrice'],
                },
              },
            },
          },
          responses: {
            201: { description: 'Property created' },
            400: { description: 'Invalid input' },
          },
        },
      },
      '/bookings': {
        get: {
          tags: ['Bookings'],
          summary: 'List all bookings',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'List of bookings' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          tags: ['Bookings'],
          summary: 'Create a new booking',
          security: [{ bearerAuth: [] }],
          responses: {
            201: { description: 'Booking created' },
            400: { description: 'Invalid input' },
          },
        },
      },
      '/payments': {
        get: {
          tags: ['Payments'],
          summary: 'List all payments',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'List of payments' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          tags: ['Payments'],
          summary: 'Record a payment',
          security: [{ bearerAuth: [] }],
          responses: {
            201: { description: 'Payment recorded' },
            400: { description: 'Invalid input' },
          },
        },
      },
    },
  };

  return NextResponse.json(apiDocs);
}
