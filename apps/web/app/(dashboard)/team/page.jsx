"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { MembersTab } from "@/components/team/MembersTab";
import { RolesTab } from "@/components/team/RolesTab";
import { SoftwareTab } from "@/components/team/SoftwareTab";

export default function TeamPage() {
  return (
    <div className="p-8 max-w-5xl">
      <PageHeader
        title="Team"
        description="Members, roles, and software seats. Drives team-cost and software-cost calculations across all estimates."
      />
      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="software">Software</TabsTrigger>
        </TabsList>
        <TabsContent value="members"><MembersTab /></TabsContent>
        <TabsContent value="roles"><RolesTab /></TabsContent>
        <TabsContent value="software"><SoftwareTab /></TabsContent>
      </Tabs>
    </div>
  );
}
