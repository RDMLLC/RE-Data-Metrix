import './_group.css';
import { Calculator, Building2, Wrench, TrendingUp, Copy, Gift, Search, CheckCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function Sidebar() {
  const items = [
    { label: 'Dashboard', active: true },
    { label: 'Deal Analysis' },
    { label: 'My Deals' },
    { label: 'Lenders' },
    { label: 'Saved Lenders' },
    { label: 'Tools & Resources' },
  ];
  return (
    <aside className="w-56 shrink-0 bg-[hsl(var(--sidebar))] border-r border-[hsl(var(--sidebar-border))] flex flex-col h-screen">
      <div className="px-4 py-4 border-b border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[hsl(var(--primary))] rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">RD</span>
          </div>
          <span className="text-sm font-semibold text-[hsl(var(--foreground))]">RE Data Metrix</span>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer ${
              item.active
                ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] font-medium'
                : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--sidebar-border))]'
            }`}
          >
            {item.label}
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[hsl(var(--primary)/0.15)] flex items-center justify-center">
            <span className="text-xs font-semibold text-[hsl(var(--primary))]">JD</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[hsl(var(--foreground))] truncate">John Doe</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">Monthly Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function ProposedDashboard() {
  return (
    <div className="flex h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <header className="px-6 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Good morning, John</p>
          </div>
          <Badge variant="outline" className="text-xs">Monthly Plan</Badge>
        </header>

        <div className="px-6 py-6 space-y-6">
          {/* Welcome card (dismissible) */}
          <Card className="border-[hsl(var(--primary)/0.2)]">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold mb-1">Welcome, John! Here's how to get started.</h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                    You're all set. The Deal Analysis tool below is the fastest way to get value — enter an address and get your numbers in minutes.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm">
                      Analyze a Deal
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                    <Button size="sm" variant="outline">Browse Lenders</Button>
                  </div>
                </div>
                <button className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] text-lg leading-none shrink-0 -mt-0.5">×</button>
              </div>
            </CardContent>
          </Card>

          {/* Dashboard grid: Deal Analysis spans 2 cols, others are 1 col */}
          <div className="grid grid-cols-3 gap-5">

            {/* ★ FEATURED: Start Deal Analysis — col-span-2 */}
            <Card className="col-span-2 cursor-pointer border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.03)]">
              <CardContent className="pt-5 pb-5 px-5">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 bg-[hsl(var(--primary)/0.1)] rounded-xl flex items-center justify-center shrink-0">
                    <Calculator className="h-6 w-6 text-[hsl(var(--primary))]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Start Deal Analysis</h3>
                      <Badge className="text-[10px] px-1.5 py-0 bg-[hsl(var(--primary))] text-white border-0">Start Here</Badge>
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
                      Enter a property address and get projected profit, ROI, max allowable offer, and matched lenders in minutes.
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-[hsl(var(--muted-foreground))] mb-4">
                      <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Automated property lookup</span>
                      <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Profit & ROI projections</span>
                      <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Lender comparison</span>
                    </div>
                    <Button size="sm">
                      Analyze a Property
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deals Analyzed */}
            <Card className="cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[hsl(var(--primary)/0.1)] rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-[hsl(var(--primary))]" />
                  </div>
                  <CardTitle className="text-sm">Deals Analyzed</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-[hsl(var(--primary))] mb-1">0</p>
                <CardDescription className="text-xs">Click to view history</CardDescription>
              </CardContent>
            </Card>

            {/* Tools & Resources */}
            <Card className="cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Wrench className="h-4 w-4 text-purple-600" />
                  </div>
                  <CardTitle className="text-sm">Tools & Resources</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">Access calculators, guides, and educational content</CardDescription>
              </CardContent>
            </Card>

            {/* Search Lenders */}
            <Card className="cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Search className="h-4 w-4 text-green-600" />
                  </div>
                  <CardTitle className="text-sm">Search Lenders</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">Find and compare financing options from our lender network</CardDescription>
              </CardContent>
            </Card>

            {/* Saved Lenders */}
            <Card className="cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[hsl(var(--accent)/0.15)] rounded-lg flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-[hsl(var(--accent))]" />
                  </div>
                  <CardTitle className="text-sm">Saved Lenders</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-[hsl(var(--accent))] mb-1">0</p>
                <CardDescription className="text-xs">Lenders you've bookmarked</CardDescription>
              </CardContent>
            </Card>

            {/* Refer a Friend */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <Gift className="h-4 w-4 text-amber-600" />
                  </div>
                  <CardTitle className="text-sm">Refer a Friend</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative mb-2">
                  <div className="flex items-center gap-2 bg-[hsl(var(--muted))] px-3 py-2 rounded-lg blur-sm pointer-events-none select-none">
                    <code className="text-base font-bold flex-1">XXXXXXXX</code>
                    <Copy className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-[hsl(var(--primary))] text-white px-2.5 py-1 rounded-md font-semibold text-xs">
                      Coming Soon
                    </div>
                  </div>
                </div>
                <CardDescription className="text-xs space-y-0.5">
                  <span className="block">Give a friend <span className="font-semibold text-green-600">1 month free</span></span>
                  <span className="block">You get <span className="font-semibold text-green-600">2 months free</span></span>
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
