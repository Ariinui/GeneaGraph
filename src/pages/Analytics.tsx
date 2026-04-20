import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { computeNetworkMetrics, detectCommunities } from '@/utils/networkMetrics';
import { detectAnomalies } from '@/utils/anomalyDetection';
import { generateStoryPath, generateCrossFamilyTimeline, generateNarrative } from '@/utils/storyPaths';
import { analyzeLocations, analyzeLocationsByCentury } from '@/utils/locationAnalysis';
import type { TimelineEvent } from '@/utils/storyPaths';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Network, BookOpen, MapPin, TrendingUp, Users, AlertCircle, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import type { Anomaly } from '@/utils/anomalyDetection';

function MetricCard({ title, value, subtitle, icon: Icon, color = 'text-[#f4d03f]' }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: typeof Network;
  color?: string;
}) {
  return (
    <Card className="bg-[#16213e] border-[#2a3a5a]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
          </div>
          {Icon && <Icon className={`w-8 h-8 ${color} opacity-50`} />}
        </div>
      </CardContent>
    </Card>
  );
}

function ReliabilityGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f4d03f' : score >= 40 ? '#f97316' : '#ef4444';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Bon' : score >= 40 ? 'Moyen' : 'À améliorer';
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-16 overflow-hidden">
        <div 
          className="absolute inset-0 border-[16px] border-[#2a3a5a] rounded-t-full"
        />
        <div 
          className="absolute inset-0 border-[16px] rounded-t-full transition-all duration-500"
          style={{ 
            borderColor: color,
            clipPath: `polygon(0 100%, 100% 100%, 100% ${100 - score / 2}%, 0 ${100 - score / 2}%)`
          }}
        />
      </div>
      <p className="text-2xl font-bold mt-2" style={{ color }}>{score}%</p>
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  );
}

function AnomalyItem({ anomaly }: { anomaly: Anomaly }) {
  const severityColors = {
    high: 'border-red-500 bg-red-500/10',
    medium: 'border-yellow-500 bg-yellow-500/10',
    low: 'border-blue-500 bg-blue-500/10'
  };
  
  const severityIcons = {
    high: <XCircle className="w-5 h-5 text-red-500" />,
    medium: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    low: <AlertCircle className="w-5 h-5 text-blue-500" />
  };

  return (
    <div className={`border-l-4 rounded-lg p-3 ${severityColors[anomaly.severity]}`}>
      <div className="flex items-start gap-2">
        {severityIcons[anomaly.severity]}
        <div>
          <p className="font-medium text-white">{anomaly.message}</p>
          <p className="text-gray-400 text-sm mt-1">{anomaly.details}</p>
        </div>
      </div>
    </div>
  );
}

function TimelineView({ events }: { events: TimelineEvent[] }) {
  const eventsByDecade = useMemo(() => {
    const decades: Record<number, TimelineEvent[]> = {};
    for (const event of events) {
      if (event.year) {
        const decade = Math.floor(event.year / 10) * 10;
        if (!decades[decade]) decades[decade] = [];
        decades[decade].push(event);
      }
    }
    return Object.entries(decades).sort(([a], [b]) => Number(a) - Number(b));
  }, [events]);

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#2a3a5a]" />
      
      {eventsByDecade.map(([decade, decadeEvents]) => (
        <div key={decade} className="relative pl-10 pb-6">
          <div className="absolute left-2 w-4 h-4 bg-[#f4d03f] rounded-full border-2 border-[#1a1a2e]" />
          <p className="text-[#f4d03f] font-bold text-lg mb-2">{decade}s</p>
          
          {decadeEvents.map((event, idx) => (
            <div key={idx} className="mb-2 p-2 bg-[#16213e] rounded border border-[#2a3a5a]">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {event.type === 'birth' ? 'Naissance' : 
                   event.type === 'death' ? 'Décès' : 
                   event.type === 'marriage' ? 'Mariage' : event.type}
                </Badge>
                {event.year && <span className="text-gray-400 text-sm">{event.year}</span>}
              </div>
              <p className="text-white mt-1">{event.description}</p>
              {event.place && (
                <p className="text-gray-500 text-xs flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" /> {event.place}
                </p>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function StoryPanel({ personId }: { personId: string }) {
  const { persons, relations } = useApp();
  const person = persons.find(p => p.id === personId);
  
  const story = useMemo(() => {
    if (!person) return null;
    return generateStoryPath(person, persons, relations);
  }, [person, persons, relations]);
  
  const narrative = useMemo(() => {
    if (!person) return '';
    return generateNarrative(person, persons, relations);
  }, [person, persons, relations]);

  if (!person || !story) return null;

  return (
    <div className="space-y-4">
      <Card className="bg-[#16213e] border-[#2a3a5a]">
        <CardHeader>
          <CardTitle className="text-[#f4d03f]">{person.firstName} {person.lastName}</CardTitle>
          <CardDescription>
            {story.lifespan.birth && story.lifespan.death 
              ? `${story.lifespan.birth} - ${story.lifespan.death} (${story.lifespan.death - story.lifespan.birth} ans)`
              : story.lifespan.birth 
                ? `Né(e) en ${story.lifespan.birth}`
                : story.lifespan.death 
                  ? `Décédé(e) en ${story.lifespan.death}`
                  : 'Dates inconnues'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-invert prose-sm max-w-none">
            {narrative.split('\n\n').map((para, idx) => (
              <p key={idx} className="text-gray-300 mb-2">{para.replace(/[#*]/g, '')}</p>
            ))}
          </div>
          
          {story.locations.length > 0 && (
            <div className="mt-4">
              <p className="text-gray-400 text-sm mb-2 flex items-center gap-1">
                <MapPin className="w-4 h-4" /> Lieux
              </p>
              <div className="flex flex-wrap gap-2">
                {story.locations.map((loc, idx) => (
                  <Badge key={idx} variant="secondary">{loc}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="bg-[#16213e] border-[#2a3a5a]">
        <CardHeader>
          <CardTitle className="text-lg text-white">Événements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-[#2a3a5a]" />
            
            {story.events.map((event, idx) => (
              <div key={idx} className="relative pl-8 pb-4">
                <div className="absolute left-1.5 w-3 h-3 bg-[#4a90a4] rounded-full" />
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#f4d03f] font-medium">
                    {event.year || 'Date inconnue'}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {event.type === 'birth' ? 'Naissance' : 
                     event.type === 'death' ? 'Décès' : 
                     event.type === 'marriage' ? 'Mariage' :
                     event.type === 'child' ? 'Enfant' : event.type}
                  </Badge>
                </div>
                <p className="text-gray-300 text-sm">{event.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AnalyticsPage() {
  const { persons, relations } = useApp();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  
  const networkMetrics = useMemo(() => 
    computeNetworkMetrics(persons, relations), 
    [persons, relations]
  );
  
  const communities = useMemo(() => 
    detectCommunities(persons, relations), 
    [persons, relations]
  );
  
  const anomalyReport = useMemo(() => 
    detectAnomalies(persons, relations), 
    [persons, relations]
  );
  
  const timeline = useMemo(() => 
    generateCrossFamilyTimeline(persons, relations), 
    [persons, relations]
  );

  const locationStats = useMemo(() => 
    analyzeLocations(persons), 
    [persons]
  );

  const locationByCentury = useMemo(() => 
    analyzeLocationsByCentury(persons), 
    [persons]
  );

  const personOptions = useMemo(() => 
    persons.map(p => ({ id: p.id, name: `${p.firstName} ${p.lastName}` })).slice(0, 20),
    [persons]
  );

  return (
    <div className="h-full bg-[#1a1a2e] text-white overflow-auto">
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-[#f4d03f] mb-6">Analyse & Insights</h1>
        
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-[#16213e] border border-[#2a3a5a]">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#f4d03f] data-[state=active]:text-[#1a1a2e]">
              <TrendingUp className="w-4 h-4 mr-2" /> Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="data-[state=active]:bg-[#f4d03f] data-[state=active]:text-[#1a1a2e]">
              <AlertTriangle className="w-4 h-4 mr-2" /> Anomalies ({anomalyReport.anomalies.length})
            </TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:bg-[#f4d03f] data-[state=active]:text-[#1a1a2e]">
              <BookOpen className="w-4 h-4 mr-2" /> Timeline
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="data-[state=active]:bg-[#f4d03f] data-[state=active]:text-[#1a1a2e]">
              <MapPin className="w-4 h-4 mr-2" /> Lieux
            </TabsTrigger>
            <TabsTrigger value="stories" className="data-[state=active]:bg-[#f4d03f] data-[state=active]:text-[#1a1a2e]">
              <Users className="w-4 h-4 mr-2" /> Récits
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard 
                title="Personnes" 
                value={networkMetrics.nodeCount} 
                icon={Users}
              />
              <MetricCard 
                title="Relations" 
                value={networkMetrics.edgeCount} 
                icon={Network}
              />
              <MetricCard 
                title="Communautés" 
                value={communities.length} 
                subtitle="branches détectées"
                icon={Users}
                color="text-[#4a90a4]"
              />
              <MetricCard 
                title="Densité" 
                value={`${(networkMetrics.density * 100).toFixed(1)}%`} 
                subtitle="connexions/max"
                icon={TrendingUp}
                color="text-[#6b8e6b]"
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-[#16213e] border-[#2a3a5a]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#f4d03f]" />
                    Score de Fiabilité
                  </CardTitle>
                  <CardDescription>Basé sur la détection d'anomalies</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <ReliabilityGauge score={anomalyReport.reliabilityScore} />
                </CardContent>
              </Card>
              
              <Card className="bg-[#16213e] border-[#2a3a5a]">
                <CardHeader>
                  <CardTitle className="text-white">Statistiques</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Degré moyen</span>
                    <span className="text-white font-medium">{networkMetrics.avgDegree.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Degré max</span>
                    <span className="text-white font-medium">{networkMetrics.maxDegree}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Composantes connectées</span>
                    <span className="text-white font-medium">{networkMetrics.connectedComponents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Clustering moyen</span>
                    <span className="text-white font-medium">{(networkMetrics.avgClustering * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Problèmes critiques</span>
                    <span className="text-red-400 font-medium">{anomalyReport.stats.criticalIssues}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avertissements</span>
                    <span className="text-yellow-400 font-medium">{anomalyReport.stats.warnings}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {communities.length > 0 && (
              <Card className="bg-[#16213e] border-[#2a3a5a]">
                <CardHeader>
                  <CardTitle className="text-white">Communautés détectées</CardTitle>
                  <CardDescription>Groupes familiaux identifiés automatiquement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {communities.slice(0, 6).map((community) => (
                      <div 
                        key={community.id}
                        className="p-3 rounded-lg border border-[#2a3a5a] bg-[#1a1a2e]"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: community.color }}
                          />
                          <span className="font-medium text-white">
                            {community.memberIds.length} personnes
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">
                          Densité: {(community.density * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="anomalies" className="space-y-4">
            {anomalyReport.anomalies.length === 0 ? (
              <Card className="bg-[#16213e] border-[#2a3a5a]">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-16 h-16 text-[#22c55e] mx-auto mb-4" />
                  <p className="text-xl text-white font-medium">Aucune anomalie détectée</p>
                  <p className="text-gray-400 mt-2">Vos données généalogiques semblent cohérentes</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <Badge variant="destructive">{anomalyReport.stats.criticalIssues} critiques</Badge>
                  <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                    {anomalyReport.stats.warnings} avertissements
                  </Badge>
                </div>
                
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-3 pr-4">
                    {anomalyReport.anomalies
                      .sort((a, b) => {
                        const order = { high: 0, medium: 1, low: 2 };
                        return order[a.severity] - order[b.severity];
                      })
                      .map((anomaly) => (
                        <AnomalyItem 
                          key={anomaly.id} 
                          anomaly={anomaly}
                        />
                      ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="timeline" className="space-y-4">
            {timeline.length === 0 ? (
              <Card className="bg-[#16213e] border-[#2a3a5a]">
                <CardContent className="p-8 text-center">
                  <BookOpen className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Aucun événement à afficher</p>
                  <p className="text-gray-500 text-sm mt-2">Ajoutez des dates de naissance/décès pour voir la timeline</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[70vh]">
                <TimelineView events={timeline} />
              </ScrollArea>
            )}
          </TabsContent>
          
          <TabsContent value="heatmap" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard 
                title="Lieux uniques" 
                value={locationStats.totalLocations} 
                icon={MapPin}
              />
              <MetricCard 
                title="Lieux de naissance" 
                value={locationStats.topBirthLocations.length} 
                icon={MapPin}
                color="text-[#4a90a4]"
              />
              <MetricCard 
                title="Lieux de décès" 
                value={locationStats.topDeathLocations.length} 
                icon={MapPin}
                color="text-[#6b8e6b]"
              />
              <MetricCard 
                title="Migrations" 
                value={locationStats.migrationPaths.length} 
                subtitle="changements de lieu"
                icon={TrendingUp}
                color="text-[#c4785a]"
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-[#16213e] border-[#2a3a5a]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#4a90a4]" />
                    Top lieux de naissance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {locationStats.topBirthLocations.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">Aucun lieu renseigné</p>
                  ) : (
                    <div className="space-y-2">
                      {locationStats.topBirthLocations.map((loc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-[#1a1a2e] rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-[#f4d03f] font-mono text-sm w-6">{idx + 1}.</span>
                            <span className="text-white">{loc.name}</span>
                          </div>
                          <Badge variant="secondary">{loc.births} naissances</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="bg-[#16213e] border-[#2a3a5a]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#6b8e6b]" />
                    Top lieux de décès
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {locationStats.topDeathLocations.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">Aucun lieu renseigné</p>
                  ) : (
                    <div className="space-y-2">
                      {locationStats.topDeathLocations.map((loc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-[#1a1a2e] rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-[#f4d03f] font-mono text-sm w-6">{idx + 1}.</span>
                            <span className="text-white">{loc.name}</span>
                          </div>
                          <Badge variant="secondary">{loc.deaths} décès</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {locationStats.migrationPaths.length > 0 && (
              <Card className="bg-[#16213e] border-[#2a3a5a]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#c4785a]" />
                    Parcours de migration
                  </CardTitle>
                  <CardDescription>Personnes nées et décédées dans des lieux différents</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2 pr-4">
                      {locationStats.migrationPaths.map((path, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-[#1a1a2e] rounded border border-[#2a3a5a]">
                          <div className="flex items-center gap-2 flex-1">
                            <MapPin className="w-4 h-4 text-[#4a90a4]" />
                            <span className="text-white">{path.from}</span>
                            <ArrowRight className="w-4 h-4 text-[#f4d03f]" />
                            <MapPin className="w-4 h-4 text-[#6b8e6b]" />
                            <span className="text-white">{path.to}</span>
                          </div>
                          <Badge variant="outline">{path.count} personne{path.count > 1 ? 's' : ''}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
            
            {locationByCentury.length > 0 && (
              <Card className="bg-[#16213e] border-[#2a3a5a]">
                <CardHeader>
                  <CardTitle className="text-white">Évolution géographique par siècle</CardTitle>
                  <CardDescription>Lieu principal de naissance par période</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {locationByCentury.map((century, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[#1a1a2e] rounded">
                        <div className="flex items-center gap-3">
                          <span className="text-[#f4d03f] font-medium w-24">{century.century}</span>
                          <span className="text-white">{century.topLocation}</span>
                        </div>
                        <Badge variant="secondary">{century.topCount} naissances</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="stories" className="space-y-4">
            <Card className="bg-[#16213e] border-[#2a3a5a]">
              <CardHeader>
                <CardTitle className="text-white">Récits individuels</CardTitle>
                <CardDescription>Explorez l'histoire de chaque personne</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {personOptions.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPersonId(p.id)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selectedPersonId === p.id
                          ? 'bg-[#f4d03f] text-[#1a1a2e]'
                          : 'bg-[#2a3a5a] text-gray-300 hover:bg-[#3a4a6a]'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {selectedPersonId && <StoryPanel personId={selectedPersonId} />}
            
            {!selectedPersonId && (
              <Card className="bg-[#16213e] border-[#2a3a5a]">
                <CardContent className="p-8 text-center">
                  <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Sélectionnez une personne pour voir son récit</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
