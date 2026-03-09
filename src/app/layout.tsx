import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

const SITE_URL = "https://repo-topography.danielyj.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Repo Topography — See the shape of any codebase",
    template: "%s | Repo Topography",
  },
  description:
    "Transform any GitHub repository into an interactive 3D terrain landscape. Understand where complexity lives, what's actively changing, and how a codebase is structured — at a glance.",
  keywords: [
    "GitHub",
    "repository",
    "visualization",
    "3D",
    "terrain",
    "codebase",
    "code structure",
    "treemap",
    "developer tools",
    "open source",
  ],
  authors: [{ name: "Daniel Jeong", url: "https://danielyj.com" }],
  creator: "Daniel Jeong",
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "Repo Topography",
    description:
      "See the shape of any codebase. Structure becomes geography, activity becomes weather, languages become biomes.",
    siteName: "Repo Topography",
  },
  twitter: {
    card: "summary_large_image",
    title: "Repo Topography",
    description:
      "See the shape of any codebase as interactive 3D terrain.",
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
