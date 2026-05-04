'use client';

import { EventInfo } from '@/lib/k8s/events';

interface EventListProps {
  events: EventInfo[];
  loading: boolean;
  error?: string;
}

export function EventList({
  events,
  loading,
  error,
}: EventListProps) {
  if (error) {
    return (
      <div className="p-4 bg-error/10 border border-error rounded text-error">
        {error}
      </div>
    );
  }

  if (loading) {
    return <div className="text-text-secondary">Loading events...</div>;
  }

  if (events.length === 0) {
    return (
      <div className="p-8 text-center border border-border rounded-lg">
        <p className="text-text-secondary">No events found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Time</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Namespace</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Object</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Reason</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Message</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Count</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, idx) => (
            <tr key={`${event.name}-${idx}`} className="border-b border-border hover:bg-surface/50">
              <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">
                {new Date(event.createdAt).toLocaleTimeString()}
              </td>
              <td className="px-4 py-3 text-text-secondary">{event.namespace}</td>
              <td className="px-4 py-3 text-text-secondary text-xs">{event.involvedObject}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs ${
                  event.reason === 'Failed' || event.reason === 'BackOff'
                    ? 'bg-error/20 text-error'
                    : event.reason === 'Created' || event.reason === 'Started'
                    ? 'bg-success/20 text-success'
                    : 'bg-warning/20 text-warning'
                }`}>
                  {event.reason}
                </span>
              </td>
              <td className="px-4 py-3 text-text-secondary text-xs max-w-sm truncate" title={event.message}>
                {event.message}
              </td>
              <td className="px-4 py-3 text-text-secondary">{event.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
