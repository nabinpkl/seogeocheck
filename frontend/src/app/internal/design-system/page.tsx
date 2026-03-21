import { notFound } from "next/navigation";
import { DesignSystemGallery } from "@/components/system/DesignSystemGallery";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SEOGEO Design System",
  description: "Internal-only gallery for SEOGEO design-system primitives and compositions.",
};

export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <DesignSystemGallery />;
}
