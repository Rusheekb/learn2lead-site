import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSubjectById } from '@/constants/subjectsData';
import TopicResourceLinks from './TopicResourceLinks';

const SubjectResourcesPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const subject = subjectId ? getSubjectById(parseInt(subjectId, 10)) : undefined;

  if (!subject) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Subject not found</p>
        <Button variant="outline" onClick={() => navigate('/dashboard?tab=resources')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Resources
        </Button>
      </div>
    );
  }

  const IconComponent = subject.iconComponent;

  const filteredTopics = subject.topics.filter(topic =>
    topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.resources.some(r =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.source.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const totalResources = subject.topics.reduce((acc, t) => acc + t.resources.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard?tab=resources')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <IconComponent className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{subject.name}</h1>
              <p className="text-muted-foreground">
                {subject.topics.length} topics • {totalResources} resources
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Practice Coming Soon Banner */}
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">AI Practice Coming Soon</p>
              <p className="text-sm text-muted-foreground">
                Get unlimited AI-generated practice questions tailored to your level
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              Coming Soon
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search topics or resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Topics */}
      <div className="grid gap-4">
        {filteredTopics.map((topic, idx) => {
          const isExpanded = expandedTopic === topic.name;

          return (
            <Card key={idx}>
              <CardHeader
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setExpandedTopic(isExpanded ? null : topic.name)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{topic.name}</CardTitle>
                  <Badge variant="outline">{topic.resources.length} resources</Badge>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <TopicResourceLinks resources={topic.resources} />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {filteredTopics.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No topics found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

export default SubjectResourcesPage;
