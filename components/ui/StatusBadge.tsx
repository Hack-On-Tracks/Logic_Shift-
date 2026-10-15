import { cn, incidentStatusColor, taskStatusColor } from '@/lib/utils';
import { IncidentStatus, TaskStatus } from '@/lib/types';

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-[11px] uppercase tracking-wider', incidentStatusColor(status))}>
      {status}
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-[11px] uppercase tracking-wider', taskStatusColor(status))}>
      {status}
    </span>
  );
}
