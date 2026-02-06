import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Search, ChevronDown, ChevronRight, Calculator, ArrowLeft, Loader2, DollarSign, Percent, TrendingUp, Home, Wallet, PiggyBank, Building } from "lucide-react";
import { 
  calculationCategories, 
  type CalculationCategory, 
  type CalculationDefinition 
} from "@shared/data/calculationReference";

const categoryIcons: Record<string, typeof Calculator> = {
  "loan-sizing": DollarSign,
  "interest-costs": Percent,
  "carrying-costs": Wallet,
  "investment-costs": PiggyBank,
  "exit-sale": TrendingUp,
  "profit-roi": TrendingUp,
  "dscr-rental": Home,
  "cash-sale": Building,
};

function CalculationCard({ calculation, isExpanded, onToggle }: { 
  calculation: CalculationDefinition; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className="mb-3">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Calculator className="h-4 w-4 text-primary flex-shrink-0" />
                <CardTitle className="text-base truncate" data-testid={`calc-title-${calculation.id}`}>
                  {calculation.name}
                </CardTitle>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              )}
            </div>
            <CardDescription className="text-sm mt-1 line-clamp-2">
              {calculation.description}
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Formula</p>
              <code className="text-sm font-mono block" data-testid={`calc-formula-${calculation.id}`}>
                {calculation.formulaDisplay}
              </code>
            </div>
            
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Inputs</p>
              <div className="space-y-2">
                {calculation.inputs.map((input, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-1 text-sm">
                    <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs flex-shrink-0">
                      {input.name}
                    </code>
                    <span className="text-muted-foreground flex-1">
                      {input.description}
                      <span className="text-xs ml-1 italic">({input.source})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Output</p>
              <p className="text-sm">{calculation.output}</p>
            </div>
            
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-3">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">Example</p>
              <div className="space-y-1 text-sm">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(calculation.example.inputs).map(([key, value]) => (
                    <Badge key={key} variant="secondary" className="font-mono text-xs">
                      {key}: {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value.toLocaleString()}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-muted-foreground">=</span>
                  <span className="font-semibold text-green-700 dark:text-green-400">
                    {calculation.example.result}
                  </span>
                </div>
                {calculation.example.explanation && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    {calculation.example.explanation}
                  </p>
                )}
              </div>
            </div>
            
            {calculation.notes && calculation.notes.length > 0 && (
              <div className="border-l-2 border-primary/30 pl-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {calculation.notes.map((note, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function CategorySection({ category, searchQuery, expandedIds, onToggle }: { 
  category: CalculationCategory;
  searchQuery: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const Icon = categoryIcons[category.id] || Calculator;
  
  const filteredCalculations = category.calculations.filter(calc => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      calc.name.toLowerCase().includes(query) ||
      calc.description.toLowerCase().includes(query) ||
      calc.formula.toLowerCase().includes(query) ||
      calc.inputs.some(i => i.name.toLowerCase().includes(query))
    );
  });
  
  if (filteredCalculations.length === 0) return null;
  
  return (
    <div id={category.id} className="scroll-mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold" data-testid={`category-${category.id}`}>
          {category.name}
        </h2>
        <Badge variant="secondary" className="ml-auto">
          {filteredCalculations.length} calculation{filteredCalculations.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
      
      {filteredCalculations.map(calc => (
        <CalculationCard 
          key={calc.id} 
          calculation={calc}
          isExpanded={expandedIds.has(calc.id)}
          onToggle={() => onToggle(calc.id)}
        />
      ))}
    </div>
  );
}

export default function CalculationsReference() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const isAuditor = userRole === 'auditor';

  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          if (data.role !== 'admin' && data.role !== 'auditor') {
            toast({
              title: "Access Denied",
              description: "Admin privileges required.",
              variant: "destructive",
            });
            setLocation("/admin/login");
            return;
          }
          setUserRole(data.role);
        } else {
          setLocation("/admin/login");
          return;
        }
      } catch (error) {
        console.error("Failed to fetch admin info");
        setLocation("/admin/login");
        return;
      } finally {
        setIsAuthChecking(false);
      }
    };
    
    fetchAdminInfo();
  }, [setLocation, toast]);

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = calculationCategories.flatMap(cat => cat.calculations.map(c => c.id));
    setExpandedIds(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const totalCalculations = calculationCategories.reduce(
    (sum, cat) => sum + cat.calculations.length, 
    0
  );

  const filteredCategories = calculationCategories.filter(category => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return category.calculations.some(calc =>
      calc.name.toLowerCase().includes(query) ||
      calc.description.toLowerCase().includes(query) ||
      calc.formula.toLowerCase().includes(query) ||
      calc.inputs.some(i => i.name.toLowerCase().includes(query))
    );
  });

  if (isAuthChecking) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6 max-w-6xl mx-auto">
        {isAuditor && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-700 dark:text-amber-400" data-testid="banner-read-only">
            You are viewing this page in read-only mode
          </div>
        )}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-64 flex-shrink-0">
            <div className="sticky top-4 space-y-4">
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/admin/dashboard")}
                className="mb-2"
                data-testid="button-back-dashboard"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <nav className="space-y-1">
                      {calculationCategories.map(category => {
                        const Icon = categoryIcons[category.id] || Calculator;
                        return (
                          <a
                            key={category.id}
                            href={`#${category.id}`}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover-elevate text-muted-foreground hover:text-foreground"
                            data-testid={`nav-${category.id}`}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="truncate">{category.name}</span>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {category.calculations.length}
                            </Badge>
                          </a>
                        );
                      })}
                    </nav>
                  </ScrollArea>
                </CardContent>
              </Card>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={expandAll}
                  className="flex-1"
                  data-testid="button-expand-all"
                >
                  Expand All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={collapseAll}
                  className="flex-1"
                  data-testid="button-collapse-all"
                >
                  Collapse All
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2" data-testid="page-title">
                Calculations Reference
              </h1>
              <p className="text-muted-foreground">
                Complete reference of all formulas and calculations used in deal analysis.
                {' '}<Badge variant="secondary">{totalCalculations} calculations</Badge>
              </p>
            </div>
            
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search calculations by name, description, or formula..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-calculations"
              />
            </div>
            
            {filteredCategories.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No calculations found matching "{searchQuery}"</p>
                  <Button 
                    variant="ghost" 
                    onClick={() => setSearchQuery("")}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {filteredCategories.map(category => (
                  <CategorySection 
                    key={category.id} 
                    category={category}
                    searchQuery={searchQuery}
                    expandedIds={expandedIds}
                    onToggle={toggleExpanded}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
