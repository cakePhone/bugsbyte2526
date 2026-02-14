import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Geisha Gains — War Room | BugsByte 2026",
  description:
    "Brutalist intelligence-driven crypto trading simulator. AI-powered news analysis through NVIDIA NIM. Coffee Driven Development.",
  keywords: [
    "hackathon",
    "crypto",
    "trading",
    "AI",
    "NVIDIA NIM",
    "Uphold",
    "brutalism",
    "BugsByte",
    "news analysis",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/assets/logo1.ico" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
