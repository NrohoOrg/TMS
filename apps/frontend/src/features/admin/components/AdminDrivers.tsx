"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, AlertTriangle, Phone, MapPin } from "lucide-react";
import { MOCK_DRIVERS } from "@/lib/mock-data";

export default function AdminDrivers() {
  const [search, setSearch] = useState("");
  const filtered = MOCK_DRIVERS.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()),
  );

  const isLicenseExpiring = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    return diff < 30 * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Driver Records
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {MOCK_DRIVERS.filter((d) => d.status === "active").length} active
            drivers
          </p>
        </div>
        <Button size="sm">
          <UserPlus className="w-4 h-4 mr-2" /> Add Driver
        </Button>
      </div>

      {/* License expiry alerts */}
      {MOCK_DRIVERS.filter(
        (d) => isLicenseExpiring(d.licenseExpiry) && d.status === "active",
      ).length > 0 && (
        <Card className="border-tms-warning/30 bg-tms-warning-light">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-tms-warning shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                License Expiry Alerts
              </p>
              <p className="text-xs text-muted-foreground">
                {MOCK_DRIVERS.filter(
                  (d) =>
                    isLicenseExpiring(d.licenseExpiry) &&
                    d.status === "active",
                )
                  .map((d) => d.name)
                  .join(", ")}{" "}
                — license expiring within 30 days
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search drivers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Depot</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>On-Time %</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                        {d.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{d.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {d.phone}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-mono">{d.license}</div>
                    <div
                      className={`text-xs ${
                        isLicenseExpiring(d.licenseExpiry)
                          ? "text-tms-warning font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      Exp: {d.licenseExpiry}{" "}
                      {isLicenseExpiring(d.licenseExpiry) && "⚠️"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    {d.vehicle}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      {d.depot}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{d.shift}</TableCell>
                  <TableCell>
                    {d.performance > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              d.performance >= 90
                                ? "bg-tms-success"
                                : d.performance >= 80
                                  ? "bg-tms-warning"
                                  : "bg-tms-error"
                            }`}
                            style={{ width: `${d.performance}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">
                          {d.performance}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        d.status === "active" ? "secondary" : "outline"
                      }
                      className="text-xs capitalize"
                    >
                      {d.status}
                    </Badge>
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
