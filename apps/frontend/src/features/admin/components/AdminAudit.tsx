"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MOCK_AUDIT_LOGS } from "@/lib/mock-data";

const ACTION_COLOR: Record<
  string,
  "secondary" | "default" | "destructive" | "outline"
> = {
  Create: "secondary",
  Update: "default",
  Delete: "destructive",
  Publish: "secondary",
  Login: "outline",
  Import: "secondary",
};

export default function AdminAudit() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filtered = MOCK_AUDIT_LOGS.filter((l) => {
    const matchSearch =
      l.desc.toLowerCase().includes(search.toLowerCase()) ||
      l.user.toLowerCase().includes(search.toLowerCase()) ||
      l.entityId.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === "all" || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {t("admin.audit.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("admin.audit.subtitle")}
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 me-2" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9 h-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {[
                  "Create",
                  "Update",
                  "Delete",
                  "Publish",
                  "Login",
                  "Import",
                ].map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.audit.tableTime")}</TableHead>
                <TableHead>{t("admin.audit.tableActor")}</TableHead>
                <TableHead>{t("admin.audit.tableAction")}</TableHead>
                <TableHead>{t("admin.audit.tableTarget")}</TableHead>
                <TableHead>{t("common.description")}</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {log.ts}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {log.user}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={ACTION_COLOR[log.action] || "secondary"}
                      className="text-xs"
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{log.entity}</div>
                    <div className="text-xs font-mono text-muted-foreground">
                      {log.entityId}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                    {log.desc}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {log.ip}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
