import { useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Heart,
  Building2,
  Phone,
  Globe,
  Mail,
  ExternalLink,
  HeartOff
} from "lucide-react";
import type { Lender } from "@shared/schema";

interface SavedLenderWithDetails {
  id: string;
  lenderId: string;
  createdAt: string;
  lender: Lender;
}

export default function SavedLenders() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: savedLenders, isLoading } = useQuery<SavedLenderWithDetails[]>({
    queryKey: ["/api/member/saved-lenders"],
  });

  const unsaveLenderMutation = useMutation({
    mutationFn: async (lenderId: string) => {
      const response = await apiRequest("DELETE", `/api/member/saved-lenders/${lenderId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member/saved-lenders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/member/stats"] });
      toast({
        title: "Lender Removed",
        description: "Lender has been removed from your saved list.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove lender.",
        variant: "destructive",
      });
    },
  });

  const handleUnsave = (lenderId: string) => {
    unsaveLenderMutation.mutate(lenderId);
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/portal")}
              data-testid="button-back-portal"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-saved-lenders-title">
                Saved Lenders
              </h1>
              <p className="text-muted-foreground mt-1">
                {savedLenders?.length ?? 0} lenders saved
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : savedLenders && savedLenders.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savedLenders.map((saved) => (
                <Card key={saved.id} className="hover-elevate" data-testid={`card-lender-${saved.lenderId}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {saved.lender.companyName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {saved.lender.contactName}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleUnsave(saved.lenderId)}
                        data-testid={`button-unsave-${saved.lenderId}`}
                      >
                        <HeartOff className="h-5 w-5" />
                      </Button>
                    </div>

                    {saved.lender.companyDescription && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {saved.lender.companyDescription}
                      </p>
                    )}

                    <div className="space-y-2 text-sm">
                      {saved.lender.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <a href={`tel:${saved.lender.phone}`} className="hover:text-foreground">
                            {saved.lender.phone}
                          </a>
                        </div>
                      )}
                      {saved.lender.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${saved.lender.email}`} className="hover:text-foreground">
                            {saved.lender.email}
                          </a>
                        </div>
                      )}
                      {saved.lender.website && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4" />
                          <a
                            href={saved.lender.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-foreground"
                          >
                            Visit Website
                          </a>
                        </div>
                      )}
                    </div>

                    {saved.lender.referralLink && (
                      <Button
                        className="w-full mt-4"
                        onClick={() => window.open(saved.lender.referralLink!, "_blank")}
                        data-testid={`button-contact-${saved.lenderId}`}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Contact Lender
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Saved Lenders</h3>
              <p className="text-muted-foreground mb-4">
                Save lenders by clicking the heart icon when viewing lender results in your deal analysis.
              </p>
              <Button onClick={() => setLocation("/deal-analysis")} data-testid="button-start-analysis">
                Start Deal Analysis
              </Button>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
