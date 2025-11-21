import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Search } from "lucide-react";
import { glossaryCategories, type GlossaryCategory } from "@/data/glossaryTerms";

export function GlossarySection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    glossaryCategories.map(cat => cat.id)
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filterCategories = (categories: GlossaryCategory[]) => {
    if (!searchQuery.trim()) return categories;

    const query = searchQuery.toLowerCase();
    return categories
      .map(category => ({
        ...category,
        terms: category.terms.filter(
          term =>
            term.term.toLowerCase().includes(query) ||
            term.definition.toLowerCase().includes(query)
        )
      }))
      .filter(category => category.terms.length > 0);
  };

  const filteredCategories = filterCategories(glossaryCategories);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Investment Glossary</h2>
        <p className="text-muted-foreground">
          Essential terms, acronyms, and financial concepts every real estate investor should know.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search terms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-glossary-search"
        />
      </div>

      <div className="space-y-4">
        {filteredCategories.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No terms found matching "{searchQuery}"
            </CardContent>
          </Card>
        ) : (
          filteredCategories.map((category) => (
            <Collapsible
              key={category.id}
              open={expandedCategories.includes(category.id)}
              onOpenChange={() => toggleCategory(category.id)}
            >
              <Card>
                <CollapsibleTrigger className="w-full" data-testid={`button-category-${category.id}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2">
                    <div className="flex flex-col items-start gap-1">
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {category.terms.length} {category.terms.length === 1 ? 'term' : 'terms'}
                      </CardDescription>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform ${
                        expandedCategories.includes(category.id) ? 'rotate-180' : ''
                      }`}
                    />
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <dl className="space-y-4">
                      {category.terms.map((term, index) => (
                        <div
                          key={index}
                          className="border-l-2 border-accent pl-4"
                          data-testid={`term-${category.id}-${index}`}
                        >
                          <dt className="font-semibold text-foreground mb-1">
                            {term.term}
                          </dt>
                          <dd className="text-sm text-muted-foreground">
                            {term.definition}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))
        )}
      </div>
    </div>
  );
}
