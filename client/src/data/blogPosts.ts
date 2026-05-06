export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  publishDate: string;
  tags: string[];
  content: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "turning-terms-into-returns-part-1-understand-the-variables",
    title: "Turning Terms into Returns — Part 1: Understand the Variables",
    excerpt: "Hard money loan terms vary more than most investors realize — and the differences compound. Two lenders offering the same loan on identical properties can produce dramatically different outcomes. Here's what you need to understand before you sign.",
    publishDate: "2026-05-07",
    tags: ["Hard Money", "Loan Terms", "Fix and Flip", "Turning Terms into Returns"],
    content: "<p>Placeholder content — Part 1</p>"
  }
];
