import { createFileRoute } from "@tanstack/react-router";
import { IconDeviceMobile } from "@tabler/icons-react";

export const Route = createFileRoute("/download-app")({
  component: DownloadAppPage,
});

function DownloadAppPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] max-w-md mx-auto text-center p-6 space-y-6">
      <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <IconDeviceMobile className="h-12 w-12 text-primary" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Mobile App Required
      </h1>
      <p className="text-muted-foreground text-lg">
        The web dashboard is for administrators and teachers. As a student, please download the mobile app to scan attendance QR codes and view your records.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full">
        <button className="flex-1 bg-primary text-primary-foreground h-12 rounded-md font-medium flex items-center justify-center transition-colors">
          Download for Android
        </button>
      </div>
    </div>
  );
}
