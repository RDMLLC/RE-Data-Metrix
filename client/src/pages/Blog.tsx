import { useEffect, useMemo } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { blogPosts } from "../data/blogPosts";

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function Blog() {
  useEffect(() => {
    document.title = "Real Estate Investing Blog | RE Data Metrix";
    const desc = "Practical guides on hard money loans, deal analysis, wholesaling, and real estate investing strategy.";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    const prev = meta.content;
    meta.content = desc;
    return () => { meta!.content = prev; };
  }, []);

  const published = useMemo(() => {
    const now = new Date();
    return blogPosts
      .filter(p => new Date(p.publishDate) <= now)
      .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
  }, []);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-10 text-center">
          <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-3" data-testid="text-blog-heading">
            Real Estate Investing Insights
          </h1>
          <p className="text-lg text-muted-foreground" data-testid="text-blog-subheading">
            Practical guides for investors who want to understand the numbers.
          </p>
        </header>

        {published.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-blog-empty">
              New posts are published every Tuesday and Thursday. Check back soon.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {published.map(post => (
              <Card key={post.slug} className="hover-elevate" data-testid={`card-post-${post.slug}`}>
                <CardHeader>
                  <p className="text-xs text-muted-foreground mb-1" data-testid={`text-post-date-${post.slug}`}>
                    {formatDate(post.publishDate)}
                  </p>
                  <CardTitle className="text-xl text-primary" data-testid={`text-post-title-${post.slug}`}>
                    {post.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/90 mb-4" data-testid={`text-post-excerpt-${post.slug}`}>
                    {post.excerpt}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map(tag => (
                      <Badge key={tag} variant="secondary" data-testid={`badge-tag-${post.slug}-${tag}`}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    data-testid={`link-read-more-${post.slug}`}
                  >
                    Read More
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
