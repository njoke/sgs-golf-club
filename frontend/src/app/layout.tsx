import type { Metadata } from "next";
import "./globals.css";
import { ApolloProvider } from "@/lib/apollo/ApolloProvider";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "SGS Golf Club",
  description: "SGS Golf Club Management Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ApolloProvider>{children}</ApolloProvider>
      </body>
    </html>
  );
}
