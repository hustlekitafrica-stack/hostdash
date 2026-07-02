'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabContent } from '@/components/ui/Tabs';
import toast from 'react-hot-toast';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  config?: Record<string, string>;
}

interface NotificationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  createdAt: string;
}

const AVAILABLE_INTEGRATIONS = [
  {
    id: 'airbnb',
    name: 'Airbnb',
    description: 'Sync bookings from Airbnb',
    icon: '🏠',
  },
  {
    id: 'booking',
    name: 'Booking.com',
    description: 'Sync bookings from Booking.com',
    icon: '📅',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept payments via Stripe',
    icon: '💳',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notifications in Slack',
    icon: '💬',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect with 5000+ apps',
    icon: '⚡',
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    description: 'Export data to Google Sheets',
    icon: '📊',
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'airbnb',
      name: 'Airbnb',
      description: 'Sync bookings from Airbnb',
      icon: '🏠',
      status: 'connected',
      lastSync: '2025-06-06 10:30',
    },
  ]);

  const [notifications, setNotifications] = useState<NotificationRule[]>([
    {
      id: '1',
      name: 'New Booking Alert',
      trigger: 'New booking received',
      action: 'Send email notification',
      enabled: true,
      createdAt: '2025-05-15',
    },
    {
      id: '2',
      name: 'Payment Reminder',
      trigger: 'Payment due in 3 days',
      action: 'Send email reminder',
      enabled: true,
      createdAt: '2025-05-20',
    },
  ]);

  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string>('');

  const [notificationForm, setNotificationForm] = useState({
    name: '',
    trigger: 'new_booking',
    action: 'email',
    enabled: true,
  });

  const handleConnectIntegration = (integrationId: string) => {
    const existing = integrations.find((i) => i.id === integrationId);
    if (existing) {
      setIntegrations(
        integrations.map((i) =>
          i.id === integrationId
            ? { ...i, status: 'disconnected' }
            : i
        )
      );
      toast.success('Integration disconnected');
    } else {
      const integration = AVAILABLE_INTEGRATIONS.find(
        (i) => i.id === integrationId
      );
      if (integration) {
        setIntegrations([
          ...integrations,
          {
            id: integration.id,
            name: integration.name,
            description: integration.description,
            icon: integration.icon,
            status: 'connected',
            lastSync: new Date().toISOString().split('T')[0],
          },
        ]);
        toast.success('Integration connected');
      }
    }
  };

  const handleAddNotification = () => {
    if (!notificationForm.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newNotification: NotificationRule = {
      id: Math.random().toString(),
      name: notificationForm.name,
      trigger: notificationForm.trigger,
      action: notificationForm.action,
      enabled: notificationForm.enabled,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setNotifications([...notifications, newNotification]);
    setShowNotificationModal(false);
    setNotificationForm({
      name: '',
      trigger: 'new_booking',
      action: 'email',
      enabled: true,
    });
    toast.success('Notification rule created');
  };

  const handleToggleNotification = (id: string) => {
    setNotifications(
      notifications.map((n) =>
        n.id === id ? { ...n, enabled: !n.enabled } : n
      )
    );
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
    toast.success('Notification rule deleted');
  };

  const integrationTabs = [
    { label: 'Integrations', value: 'integrations', icon: '🔗' },
    { label: 'Notifications', value: 'notifications', icon: '🔔' },
    { label: 'Webhooks', value: 'webhooks', icon: '🪝' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-900">Integrations</h1>
        <p className="text-surface-600 mt-2">Connect with external services and manage notifications</p>
      </div>

      <Tabs items={integrationTabs}>
        <TabContent value="integrations">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AVAILABLE_INTEGRATIONS.map((integration) => {
              const connected = integrations.find(
                (i) => i.id === integration.id
              );
              return (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span className="text-2xl">{integration.icon}</span>
                          {integration.name}
                        </CardTitle>
                        <p className="text-sm text-surface-600 mt-1">
                          {integration.description}
                        </p>
                      </div>
                      {connected && (
                        <Badge variant="success">Connected</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {connected ? (
                      <div className="space-y-3">
                        <p className="text-xs text-surface-600">
                          Last sync: {connected.lastSync}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleConnectIntegration(integration.id)
                            }
                          >
                            Disconnect
                          </Button>
                          <Button variant="outline" size="sm">
                            Settings
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() =>
                          handleConnectIntegration(integration.id)
                        }
                      >
                        Connect
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabContent>

        <TabContent value="notifications">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowNotificationModal(true)}>
                + Add Rule
              </Button>
            </div>

            {notifications.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-surface-600 mb-4">No notification rules yet</p>
                  <Button onClick={() => setShowNotificationModal(true)}>
                    Create First Rule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card key={notification.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{notification.name}</CardTitle>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notification.enabled}
                          onChange={() =>
                            handleToggleNotification(notification.id)
                          }
                          className="rounded"
                        />
                        <span className="text-sm text-surface-600">
                          {notification.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-surface-600 mb-1">Trigger</p>
                        <p className="font-medium text-surface-900 capitalize">
                          {notification.trigger.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-surface-600 mb-1">Action</p>
                        <p className="font-medium text-surface-900 capitalize">
                          {notification.action}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-surface-200">
                      <Button variant="outline" size="sm">
                        ✏️ Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDeleteNotification(notification.id)
                        }
                      >
                        🗑️ Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabContent>

        <TabContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-surface-600">
                Webhooks allow you to receive real-time notifications when events occur in your account.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  📝 Webhook URL
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value="https://api.hostdash.app/webhooks/events"
                    readOnly
                    className="flex-1 px-4 py-2 border border-blue-300 rounded-lg bg-white text-sm"
                  />
                  <Button variant="outline" size="sm">
                    📋 Copy
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-surface-900 mb-3">
                  Webhook Events
                </h3>
                <div className="space-y-2">
                  {[
                    'booking.created',
                    'booking.updated',
                    'payment.received',
                    'guest.created',
                    'property.updated',
                  ].map((event) => (
                    <label key={event} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm text-surface-900">{event}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button>Save Webhook Configuration</Button>
            </CardContent>
          </Card>
        </TabContent>
      </Tabs>

      {/* Add Notification Modal */}
      <Modal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        title="Add Notification Rule"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Rule Name *"
            placeholder="e.g., New Booking Alert"
            value={notificationForm.name}
            onChange={(e) =>
              setNotificationForm({ ...notificationForm, name: e.target.value })
            }
          />

          <div>
            <label className="block text-sm font-medium text-surface-900 mb-2">
              Trigger Event
            </label>
            <select
              value={notificationForm.trigger}
              onChange={(e) =>
                setNotificationForm({
                  ...notificationForm,
                  trigger: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="new_booking">New Booking</option>
              <option value="payment_received">Payment Received</option>
              <option value="guest_checked_in">Guest Checked In</option>
              <option value="guest_checked_out">Guest Checked Out</option>
              <option value="low_occupancy">Low Occupancy</option>
              <option value="payment_overdue">Payment Overdue</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-900 mb-2">
              Action
            </label>
            <select
              value={notificationForm.action}
              onChange={(e) =>
                setNotificationForm({
                  ...notificationForm,
                  action: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="email">Send Email</option>
              <option value="sms">Send SMS</option>
              <option value="slack">Send Slack Message</option>
              <option value="webhook">Call Webhook</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationForm.enabled}
              onChange={(e) =>
                setNotificationForm({
                  ...notificationForm,
                  enabled: e.target.checked,
                })
              }
              className="rounded"
            />
            <span className="text-sm text-surface-900">Enable this rule</span>
          </label>

          <div className="flex gap-3 justify-end pt-4 border-t border-surface-200">
            <Button
              variant="outline"
              onClick={() => setShowNotificationModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddNotification}>Create Rule</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
