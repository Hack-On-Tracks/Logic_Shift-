import { cn, priorityColor, priorityDot } from '@/lib/utils';
import { Priority } from '@/lib/types';

export default function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] uppercase tracking-wider', priorityColor(priority))}>
      <span className={cn('w-1.5 h-1.5', priorityDot(priority))} />
      {priority}
    </span>
  );
}
