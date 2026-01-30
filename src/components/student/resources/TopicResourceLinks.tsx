import React from 'react';
import { Video, BookOpen, PenTool } from 'lucide-react';
import ResourceCard from './ResourceCard';
import type { Resource } from '@/constants/subjectsData';

interface TopicResourceLinksProps {
  resources: Resource[];
  compact?: boolean;
}

const TopicResourceLinks: React.FC<TopicResourceLinksProps> = ({ resources, compact = false }) => {
  const videos = resources.filter(r => r.type === 'video');
  const articles = resources.filter(r => r.type === 'article');
  const practice = resources.filter(r => r.type === 'practice');

  if (compact) {
    // Compact view: just show all resources in a simple list
    return (
      <div className="space-y-1.5 pl-4 border-l-2 border-primary/20">
        {resources.map((resource, idx) => (
          <ResourceCard key={idx} resource={resource} compact />
        ))}
      </div>
    );
  }

  // Full view: group by type
  return (
    <div className="space-y-4">
      {videos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Video className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-medium text-foreground">Videos</h4>
          </div>
          <div className="space-y-2">
            {videos.map((resource, idx) => (
              <ResourceCard key={idx} resource={resource} />
            ))}
          </div>
        </div>
      )}

      {practice.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <PenTool className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-medium text-foreground">Practice</h4>
          </div>
          <div className="space-y-2">
            {practice.map((resource, idx) => (
              <ResourceCard key={idx} resource={resource} />
            ))}
          </div>
        </div>
      )}

      {articles.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-medium text-foreground">Reading</h4>
          </div>
          <div className="space-y-2">
            {articles.map((resource, idx) => (
              <ResourceCard key={idx} resource={resource} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicResourceLinks;
