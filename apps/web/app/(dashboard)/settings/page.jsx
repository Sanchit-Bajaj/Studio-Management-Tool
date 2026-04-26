"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/hooks/useSettings";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { OverheadsTab } from "@/components/settings/OverheadsTab";

export default function SettingsPage() {
  const { data: studio, isLoading, error } = useSettings();

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="Settings" description="Studio profile, working schedule, pipeline tuning, and overheads." />

      {error ? (
        <p className="text-sm text-red-600">Failed to load settings: {error.message}</p>
      ) : (
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="overheads">Overheads</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            {isLoading ? <FormSkeleton /> : <ProfileTab studio={studio} />}
          </TabsContent>
          <TabsContent value="overheads">
            <OverheadsTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-border bg-white p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="grid sm:grid-cols-2 gap-3">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        </div>
      ))}
    </div>
  );
}
