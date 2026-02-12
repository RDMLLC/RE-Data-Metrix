import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Calendar, Clock, ExternalLink, Loader2 } from "lucide-react";

export default function WebinarRsvpThankYou() {
  const params = useParams<{ registrationId: string }>();
  const [location] = useLocation();
  
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const status = searchParams.get('status') || 'confirmed';

  const { data: rsvpData, isLoading } = useQuery<{
    name: string;
    email: string;
    rsvpStatus: string;
  }>({
    queryKey: [`/api/webinar/rsvp/${params.registrationId}/status`],
    enabled: !!params.registrationId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Prefer API data over URL query param when available
  const effectiveStatus = rsvpData?.rsvpStatus || status;
  const isConfirmed = effectiveStatus === 'confirmed';
  const webinarLink = 'https://meet.zoho.com/xecs-lpa-ohi';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4">
              {isConfirmed ? (
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              ) : (
                <XCircle className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isConfirmed ? "You're Confirmed!" : "We'll Miss You!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {rsvpData && (
              <p className="text-muted-foreground">
                Thanks for letting us know, {rsvpData.name}!
              </p>
            )}

            {isConfirmed ? (
              <>
                <div className="bg-muted/50 rounded-lg p-6 text-left space-y-3">
                  <h3 className="font-semibold text-lg mb-4">Event Details</h3>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>Friday, February 27, 2026</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <span>12:00 PM EST (9:00 AM PST)</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  We'll send you a reminder 30 minutes before we go live.
                </p>

                <Button asChild size="lg" className="w-full" data-testid="button-join-webinar">
                  <a href={webinarLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Save the Join Link
                  </a>
                </Button>

                <p className="text-amber-600 dark:text-amber-400 font-medium text-sm">
                  Don't forget: Stay until the end for an exclusive offer!
                </p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  We're sorry you can't make it to the webinar. We'll send you a link to the replay so you don't miss out on the valuable content.
                </p>

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    Changed your mind? You can still join us on February 27th at 12:00 PM EST.
                  </p>
                </div>

                <Button asChild variant="outline" size="lg" className="w-full" data-testid="button-save-link-anyway">
                  <a href={webinarLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Save the Link Anyway
                  </a>
                </Button>
              </>
            )}

            <div className="pt-4 border-t">
              <Button asChild variant="ghost" data-testid="link-back-home">
                <a href="/">Back to RE Data Metrix</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
