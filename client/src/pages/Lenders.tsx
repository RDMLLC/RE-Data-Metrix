import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ExternalLink } from "lucide-react";
import lendersImg from "@assets/generated_images/Lenders_partnership_concept_image_281c2e15.png";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

const searchSchema = z.object({
  brokerOrDirectLender: z.string().optional(),
  fastestClosingTime: z.string().optional(),
  offerNonTraditionalLending: z.string().optional(),
  workWithNewInvestors: z.string().optional(),
  minCreditScore: z.string().optional(),
  offerDeferredPayment: z.string().optional(),
  offerRolledPoints: z.string().optional(),
  offer100PercentFunding: z.string().optional(),
  offerMultiUnitFinancing: z.string().optional(),
});

type SearchForm = z.infer<typeof searchSchema>;

interface SearchResult {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  referralLink: string;
  companyDescription: string;
}

export default function Lenders() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const form = useForm<SearchForm>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      brokerOrDirectLender: "any",
      fastestClosingTime: "any",
      offerNonTraditionalLending: "any",
      workWithNewInvestors: "any",
      minCreditScore: "any",
      offerDeferredPayment: "any",
      offerRolledPoints: "any",
      offer100PercentFunding: "any",
      offerMultiUnitFinancing: "any",
    },
  });

  const onSubmit = async (data: SearchForm) => {
    setIsSearching(true);
    try {
      const results = await apiRequest("POST", "/api/search-lenders", data);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-primary mb-4">Lender Network</h1>
          <div className="h-1 w-32 bg-accent mx-auto mb-8"></div>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Connect with verified lenders who specialize in real estate investment financing. Search by criteria, compare options, and submit applications directly through our platform. Creative financing solutions for every deal type.
          </p>
        </div>

        {/* Search Form */}
        <Card className="p-8 mb-12">
          <h2 className="text-2xl font-semibold text-primary mb-6">Search for Lenders</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Are you a direct lender or broker? */}
                <FormField
                  control={form.control}
                  name="brokerOrDirectLender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Direct Lender or Broker</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-broker-or-lender">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="Lender">Lender</SelectItem>
                          <SelectItem value="Broker">Broker</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* What is the fastest you can close a loan? */}
                <FormField
                  control={form.control}
                  name="fastestClosingTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Fastest Closing Time</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-closing-time">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="1-7 DAYS">1-7 DAYS</SelectItem>
                          <SelectItem value="8-14 DAYS">8-14 DAYS</SelectItem>
                          <SelectItem value="15-21 DAYS">15-21 DAYS</SelectItem>
                          <SelectItem value="22-30 DAYS">22-30 DAYS</SelectItem>
                          <SelectItem value="More than 30 days">More than 30 days</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Do you offer non-traditional / creative lending? */}
                <FormField
                  control={form.control}
                  name="offerNonTraditionalLending"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Non-Traditional Lending</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-non-traditional">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Do you work with new investors? */}
                <FormField
                  control={form.control}
                  name="workWithNewInvestors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Works with New Investors</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-new-investors">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* What is the minimum credit score you will work with? */}
                <FormField
                  control={form.control}
                  name="minCreditScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Minimum Credit Score</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-min-credit">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="Below 600">Below 600</SelectItem>
                          <SelectItem value="600-649">600-649</SelectItem>
                          <SelectItem value="650-699">650-699</SelectItem>
                          <SelectItem value="700+">700+</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Do you offer deferred payment loans? */}
                <FormField
                  control={form.control}
                  name="offerDeferredPayment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Deferred Payment Loans</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-deferred-payment">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Do you offer rolled / points on the back? */}
                <FormField
                  control={form.control}
                  name="offerRolledPoints"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Rolled Points on Back</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-rolled-points">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Do you offer 100% funding of both the purchase and the rehab? */}
                <FormField
                  control={form.control}
                  name="offer100PercentFunding"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">100% Funding</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-100-percent-funding">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Do you offer financing on multi-unit properties? (5+ units) */}
                <FormField
                  control={form.control}
                  name="offerMultiUnitFinancing"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Multi-Unit Financing (5+)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-multi-unit">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-center">
                <Button
                  type="submit"
                  className="w-full md:w-auto bg-accent text-accent-foreground hover:bg-accent/90"
                  data-testid="button-search-lenders"
                  disabled={isSearching}
                >
                  <Search className="h-4 w-4 mr-2" />
                  {isSearching ? "Searching..." : "Search Lenders"}
                </Button>
              </div>
            </form>
          </Form>
        </Card>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-primary mb-6">Search Results (Top {Math.min(searchResults.length, 3)})</h2>
            <div className="space-y-6">
              {searchResults.slice(0, 3).map((lender) => (
                <Card key={lender.id} className="p-6" data-testid={`card-lender-${lender.id}`}>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold text-primary mb-2" data-testid={`text-company-name-${lender.id}`}>
                        {lender.companyName || "Lender"}
                      </h3>
                      <div className="space-y-1 text-muted-foreground">
                        {lender.contactName && (
                          <p data-testid={`text-contact-name-${lender.id}`}>
                            <span className="font-medium">Contact:</span> {lender.contactName}
                          </p>
                        )}
                        {lender.phone && (
                          <p data-testid={`text-phone-${lender.id}`}>
                            <span className="font-medium">Phone:</span> {lender.phone}
                          </p>
                        )}
                        {lender.email && (
                          <p data-testid={`text-email-${lender.id}`}>
                            <span className="font-medium">Email:</span> {lender.email}
                          </p>
                        )}
                        {lender.website && (
                          <p data-testid={`text-website-${lender.id}`}>
                            <span className="font-medium">Website:</span>{" "}
                            <a
                              href={lender.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent hover:underline"
                            >
                              {lender.website}
                            </a>
                          </p>
                        )}
                      </div>
                      {lender.companyDescription && (
                        <p className="mt-4 text-foreground" data-testid={`text-description-${lender.id}`}>
                          {lender.companyDescription}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {lender.referralLink ? (
                        <a
                          href={lender.referralLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`button-contact-lender-${lender.id}`}
                        >
                          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                            Contact the Lender
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </Button>
                        </a>
                      ) : (
                        <Button
                          disabled
                          data-testid={`button-contact-lender-${lender.id}`}
                          className="bg-muted text-muted-foreground"
                        >
                          No Referral Link
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No Results Message */}
        {!isSearching && searchResults.length === 0 && form.formState.isSubmitted && (
          <Card className="p-8 text-center">
            <p className="text-lg text-muted-foreground">
              No lenders found matching your criteria. Try adjusting your search filters.
            </p>
          </Card>
        )}

        {/* Image Preview */}
        <div className="mb-12">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-lg">
            <img 
              src={lendersImg} 
              alt="Lender Partnership Network"
              className="w-full h-full object-cover opacity-80"
            />
          </div>
        </div>

        {/* Call to Action */}
        <Card className="p-12 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground text-center">
          <h2 className="text-3xl font-bold mb-4">Get Early Access to Our Lender Network</h2>
          <p className="text-lg text-primary-foreground/80 mb-6 max-w-2xl mx-auto">
            Be among the first to connect with our verified lenders when we launch. Lock in your discount now!
          </p>
          <Button 
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            size="lg"
            onClick={() => window.location.href = '/'}
          >
            Lock in my Discount
          </Button>
        </Card>
      </div>
    </Layout>
  );
}
