import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AffiliateCard } from "@/components/AffiliateCard";
import { GlossarySection } from "@/components/GlossarySection";
import ToolFinder from "@/components/ToolFinder";
import { affiliatePrograms, categoryInfo } from "@/data/affiliatePrograms";
import { Wrench, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import MembershipPaywall from "@/components/MembershipPaywall";

export default function Resources() {
  const { isSubscriber, isLoading: authLoading } = useAuth();
  
  const getAffiliateProgramsByCategory = (category: string) => {
    return affiliatePrograms.filter(program => 
      program.categories.includes(category)
    );
  };

  const renderAffiliateContent = (category: string, info: { name: string; description: string }) => {
    if (authLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }
    if (!isSubscriber) {
      return (
        <MembershipPaywall 
          title="Affiliate Programs"
          description="Access our curated collection of vetted affiliate programs and tools by becoming a member."
        />
      );
    }
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">{info.name}</h2>
          <p className="text-muted-foreground">{info.description}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {getAffiliateProgramsByCategory(category).map((program) => (
            <AffiliateCard key={program.id} program={program} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Wrench className="h-8 w-8 text-accent" />
            <h1 className="text-3xl font-bold">Toolbox & Resources</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Your comprehensive toolkit for real estate investment success
          </p>
        </div>

        <Tabs defaultValue="about" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-muted/50 p-2" data-testid="tabs-toolbox">
            <TabsTrigger value="about" data-testid="tab-about">About</TabsTrigger>
            <TabsTrigger value="marketplace" data-testid="tab-marketplace">Marketplace & Community</TabsTrigger>
            <TabsTrigger value="property-management" data-testid="tab-property-management">Property Management</TabsTrigger>
            <TabsTrigger value="project-management" data-testid="tab-project-management">Project Management</TabsTrigger>
            <TabsTrigger value="lead-generation" data-testid="tab-lead-generation">Lead Generation</TabsTrigger>
            <TabsTrigger value="comps" data-testid="tab-comps">Comps & Data</TabsTrigger>
            <TabsTrigger value="glossary" data-testid="tab-glossary">Glossary</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-6">
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <h2 className="text-2xl font-semibold mb-4">Your Investor Toolbox</h2>
              
              <p className="text-muted-foreground leading-relaxed">
                Success in real estate investment requires more than just capital and ambition—it demands 
                the right tools, partnerships, and knowledge. We've curated a comprehensive selection of 
                trusted platforms and services that our community of investors relies on every day.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">What You'll Find Here</h3>
              
              <div className="grid gap-4 md:grid-cols-2 not-prose">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-card border">
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Vetted Partners</h4>
                    <p className="text-sm text-muted-foreground">
                      Every platform in our toolbox has been carefully evaluated for quality, 
                      reliability, and value to real estate investors.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-card border">
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Time-Saving Solutions</h4>
                    <p className="text-sm text-muted-foreground">
                      From property management to deal analysis, these tools streamline your 
                      workflow and help you scale your business efficiently.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-card border">
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Competitive Advantage</h4>
                    <p className="text-sm text-muted-foreground">
                      Access the same professional-grade tools and data that top investors use 
                      to find deals, analyze markets, and make informed decisions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-card border">
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Educational Resources</h4>
                    <p className="text-sm text-muted-foreground">
                      Our glossary provides clear definitions of essential investing terms, 
                      helping you speak the language of real estate like a pro.
                    </p>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold mt-6 mb-3">How to Use This Toolbox</h3>
              
              <p className="text-muted-foreground leading-relaxed">
                Browse the categories above to explore platforms organized by function. Whether you're 
                looking for property management software, lead generation tools, market data, or networking 
                opportunities, we've organized everything to help you find exactly what you need.
              </p>

              <p className="text-muted-foreground leading-relaxed">
                Each tool includes a detailed description, key benefits, and a direct link to get started. 
                Many of these platforms offer free trials or introductory pricing, making it easy to test 
                what works best for your investment strategy.
              </p>

              <div className="mt-8 p-6 bg-accent/10 border-l-4 border-accent rounded-r-lg">
                <p className="font-semibold mb-2">Ready to Explore?</p>
                <p className="text-sm text-muted-foreground">
                  Click any category tab above to browse our curated selection of investment tools, 
                  or visit the Glossary to master essential real estate terminology.
                </p>
              </div>
            </div>

            {/* Tool Finder Section */}
            <div className="mt-8 pt-8 border-t">
              {authLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !isSubscriber ? (
                <MembershipPaywall 
                  title="Tool Finder"
                  description="Compare real estate software tools and find the perfect ones for your investment strategy."
                />
              ) : (
                <ToolFinder />
              )}
            </div>
          </TabsContent>

          <TabsContent value="marketplace">
            {renderAffiliateContent("marketplace", categoryInfo.marketplace)}
          </TabsContent>

          <TabsContent value="property-management">
            {renderAffiliateContent("property-management", categoryInfo["property-management"])}
          </TabsContent>

          <TabsContent value="project-management">
            {renderAffiliateContent("project-management", categoryInfo["project-management"])}
          </TabsContent>

          <TabsContent value="lead-generation">
            {renderAffiliateContent("lead-generation", categoryInfo["lead-generation"])}
          </TabsContent>

          <TabsContent value="comps">
            {renderAffiliateContent("comps", categoryInfo.comps)}
          </TabsContent>

          <TabsContent value="glossary">
            <GlossarySection />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
