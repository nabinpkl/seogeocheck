import * as React from "react";
import { notFound, redirect } from "next/navigation";
import { getAccountProject } from "@/lib/backend-server";

type ProjectDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { slug } = await params;
  const project = await getAccountProject(slug);

  if (!project) {
    notFound();
  }

  redirect(`/dashboard?project=${encodeURIComponent(project.slug)}`);
}
