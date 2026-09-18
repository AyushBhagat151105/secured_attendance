import { createFileRoute } from "@tanstack/react-router";
import { DownloadPage } from "@/features/download/download-page";

export const Route = createFileRoute("/download")({
  component: DownloadPage,
});
