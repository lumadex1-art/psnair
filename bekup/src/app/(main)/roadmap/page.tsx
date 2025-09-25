
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Zap, Clock, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const roadmapSections = [
    {
        title: 'Completed',
        badgeVariant: 'default' as const,
        badgeClass: 'bg-green-600/20 text-green-400 border-green-600/30',
        items: [
            { title: 'Initial App Launch', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
            { title: 'Daily Token Claiming', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
            { title: 'User Profile & Tiers', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
            { title: 'Referral System', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
            { title: 'AI-Generated Rewards', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
        ],
    },
    {
        title: 'In Progress',
        badgeVariant: 'default' as const,
        badgeClass: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
        items: [
            { title: 'Advanced User Analytics', icon: <Zap className="h-4 w-4 text-yellow-500" /> },
            { title: 'Community Leaderboards', icon: <Zap className="h-4 w-4 text-yellow-500" /> },
        ],
    },
    {
        title: 'Planned',
        badgeVariant: 'secondary' as const,
        badgeClass: '',
        items: [
            { title: 'NFT Integration & Marketplace', icon: <Clock className="h-4 w-4 text-primary" /> },
            { title: 'In-App Mini-Games', icon: <Clock className="h-4 w-4 text-primary" /> },
            { title: 'Staking & Governance', icon: <Clock className="h-4 w-4 text-primary" /> },
        ],
    },
];

export default function RoadmapPage() {
  return (
    <div className="relative min-h-screen space-y-8 px-4 pb-8">
       <div className="absolute top-4 left-4 z-20">
        <Link href="/claim">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div className="text-center pt-16">
        <h1 className="font-headline text-3xl font-bold">Project Roadmap</h1>
        <p className="text-muted-foreground">Our vision for the future of psnaidrop.</p>
      </div>

      {roadmapSections.map((section, index) => (
        <Card key={index} className="bg-secondary/30 border-primary/10 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>
                <Badge variant={section.badgeVariant} className={cn("text-sm", section.badgeClass)}>
                    {section.title}
                </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {section.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-center gap-3 rounded-lg bg-background p-3 text-sm">
                  {item.icon}
                  <span className="font-medium">{item.title}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
