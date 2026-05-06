import { useEffect } from "react";
import { Link, useParams } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { blogPosts } from "../data/blogPosts";

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogPost() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const post = blogPosts.find(p => p.slug === slug);
  const isPublished = post ? new Date(post.publishDate) <= new Date() : false;
  const visible = post && isPublished ? post : null;

  useEffect(() => {
    if (!visible) {
      document.title = "Post Not Found | RE Data Metrix";
      return;
    }
    document.title = `${visible.title} | RE Data Metrix`;
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    const prev = meta.content;
    meta.content = visible.excerpt;

    const schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": visible.title,
      "datePublished": visible.publishDate,
      "author": { "@type": "Organization", "name": "RE Data Metrix" },
      "publisher": { "@type": "Organization", "name": "RE Data Metrix", "url": "https://redatametrix.com" },
      "description": visible.excerpt,
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = `article-schema-${visible.slug}`;
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      meta!.content = prev;
      const existing = document.getElementById(`article-schema-${visible.slug}`);
      if (existing) existing.remove();
    };
  }, [visible]);

  if (!visible) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-primary mb-4" data-testid="text-not-found-title">
            Post Not Found
          </h1>
          <p className="text-muted-foreground mb-6" data-testid="text-not-found-message">
            The post you're looking for doesn't exist or hasn't been published yet.
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            data-testid="link-back-to-blog"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline mb-6"
          data-testid="link-back-to-blog-top"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-3" data-testid="text-post-title">
            {visible.title}
          </h1>
          <p className="text-sm text-muted-foreground mb-3" data-testid="text-post-date">
            {formatDate(visible.publishDate)}
          </p>
          <div className="flex flex-wrap gap-2">
            {visible.tags.map(tag => (
              <Badge key={tag} variant="secondary" data-testid={`badge-tag-${tag}`}>
                {tag}
              </Badge>
            ))}
          </div>
        </header>

        <div
          className="prose prose-slate max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: visible.content }}
          data-testid="content-post-body"
        />

        <div className="mt-10 pt-6 border-t border-border">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            data-testid="link-back-to-blog-bottom"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>
        </div>

        <Card className="mt-8 bg-muted/30" data-testid="card-related-links">
          <CardContent className="py-6">
            <h2 className="text-lg font-semibold text-primary mb-4">Keep Going</h2>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/deal-analysis"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  data-testid="link-related-deal-analysis"
                >
                  Analyze your next deal
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
              <li>
                <Link
                  href="/toolbox"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  data-testid="link-related-glossary"
                >
                  Explore the Glossary
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
      </article>
    </Layout>
  );
}
