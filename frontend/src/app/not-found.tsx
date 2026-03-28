import * as React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getCurrentUser } from "@/features/auth/lib/server-auth";
import { Button } from "@/components/ui/button";
import { Search, Home } from "lucide-react";

export default async function NotFound() {
  const viewer = await getCurrentUser();

  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <Navbar viewer={viewer} />
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              404
            </h1>
            <h2 className="text-2xl font-semibold tracking-tight text-muted-foreground">
              Page not found
            </h2>
            <p className="text-muted-foreground">
              Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or doesn&apos;t exist.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            {viewer && (
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
