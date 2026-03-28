import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, Home, LayoutDashboard } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center min-h-[60vh]">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            404
          </h1>
          <h2 className="text-2xl font-semibold tracking-tight text-muted-foreground">
            Project not found
          </h2>
          <p className="text-muted-foreground">
            Sorry, we couldn&apos;t find the dashboard page or project you&apos;re looking for. It might have been moved or doesn&apos;t exist.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Back to Overview
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go to Homepage
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
