import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface SavedByMember {
  id: string;
  savedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  profile: {
    fullName: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
  } | null;
}

export default function LenderSavedBy() {
  const { data: savedByMembers, isLoading } = useQuery<SavedByMember[]>({
    queryKey: ["/api/lender/saved-by"],
  });

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/lender-dashboard">
              <Button variant="ghost" className="mb-4" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-destructive/10 rounded-lg flex items-center justify-center">
                <Heart className="h-7 w-7 text-destructive fill-current" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-primary">Who Saved You</h1>
                <p className="text-muted-foreground">
                  Members who have added you to their saved lenders list
                </p>
              </div>
            </div>
            <div className="h-1 w-24 bg-accent"></div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : !savedByMembers || savedByMembers.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">No Members Yet</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                When investors save your lender profile to their favorites, they will appear here. 
                Make sure your profile is complete to attract more investors!
              </p>
              <Link href="/lender-company-info">
                <Button className="mt-6" data-testid="button-update-profile">
                  Update Your Profile
                </Button>
              </Link>
            </Card>
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between">
                <Badge variant="secondary" className="text-base px-4 py-2">
                  <Users className="h-4 w-4 mr-2" />
                  {savedByMembers.length} {savedByMembers.length === 1 ? "Investor" : "Investors"}
                </Badge>
              </div>

              <div className="space-y-4">
                {savedByMembers.map((member) => (
                  <Card key={member.id} className="p-6 hover-elevate" data-testid={`card-member-${member.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-semibold text-lg">
                            {(member.profile?.fullName || member.user.username || "U").substring(0, 1).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground" data-testid={`text-member-name-${member.id}`}>
                            {member.profile?.fullName || member.user.username}
                          </h3>
                          <div className="space-y-1 mt-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <a 
                                href={`mailto:${member.user.email}`} 
                                className="hover:text-primary transition-colors"
                                data-testid={`link-email-${member.id}`}
                              >
                                {member.user.email}
                              </a>
                            </div>
                            {member.profile?.phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <a 
                                  href={`tel:${member.profile.phone}`} 
                                  className="hover:text-primary transition-colors"
                                  data-testid={`link-phone-${member.id}`}
                                >
                                  {member.profile.phone}
                                </a>
                              </div>
                            )}
                            {(member.profile?.city || member.profile?.state) && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span>
                                  {[member.profile.city, member.profile.state].filter(Boolean).join(", ")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:text-right">
                        <Badge variant="outline" className="whitespace-nowrap">
                          <Heart className="h-3 w-3 mr-1 text-destructive fill-current" />
                          Saved {format(new Date(member.savedAt), "MMM d, yyyy")}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
