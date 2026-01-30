import React from 'react';
import { ExternalLink, Video, BookOpen, PenTool } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Resource } from '@/constants/subjectsData';

interface ResourceCardProps {
  resource: Resource;
  compact?: boolean;
}

const typeIcons = {
  video: Video,
  article: BookOpen,
  practice: PenTool,
};

const typeLabels = {
  video: 'Video',
  article: 'Article',
  practice: 'Practice',
};

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, compact = false }) => {
  const Icon = typeIcons[resource.type];

  if (compact) {
    return (
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
      >
        <Icon className="h-3.5 w-3.5 text-primary/70" />
        <span className="group-hover:underline">{resource.title}</span>
        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
    );
  }

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border border-border",
        "bg-card hover:bg-accent/50 transition-colors group"
      )}
    >
      <div className="flex-shrink-0 p-2 rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
            {resource.title}
          </span>
          <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {resource.source}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {typeLabels[resource.type]}
          </span>
        </div>
      </div>
    </a>
  );
};

export default ResourceCard;
