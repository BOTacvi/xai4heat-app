"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAlerts } from "@/lib/contexts/AlertsContext";
import { Select } from "@/components/fields/Select";
import type { Alert, AlertSource, AlertSeverity } from "@/lib/generated/prisma";
import { AlertCard } from "./components/AlertCard";
import { STATUS_OPTIONS, SOURCE_OPTIONS, SEVERITY_OPTIONS } from "./data";
import styles from "./page.module.css";

type FilterStatus = "all" | "unread" | "unacknowledged";

function getAlertLink(alert: Alert): string {
  const measurementTime = new Date(alert.measurement_time);
  const now = new Date();

  // Check if measurement is within last 24 hours
  const oneDayAgo = new Date(now);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const isWithinLastDay = measurementTime >= oneDayAgo;

  // If within last day, use "Last Day" preset (from = 1 day ago, to = now)
  // Otherwise, use custom range from measurement time to now
  const fromISO = isWithinLastDay ? oneDayAgo.toISOString() : measurementTime.toISOString();
  const toISO = now.toISOString();

  switch (alert.source) {
    case "THERMIONIX":
      if (alert.device_id) {
        return `/dashboard/thermionix?apartment=${alert.device_id}&from=${fromISO}&to=${toISO}`;
      }
      return `/dashboard/thermionix?from=${fromISO}&to=${toISO}`;
    case "SCADA":
      if (alert.location) {
        return `/dashboard/scada?lamela=${alert.location}&from=${fromISO}&to=${toISO}`;
      }
      return `/dashboard/scada?from=${fromISO}&to=${toISO}`;
    case "WEATHERLINK":
      return `/dashboard/weatherlink?from=${fromISO}&to=${toISO}`;
    default:
      return "/dashboard/notifications";
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { alerts, isLoading, markAsRead, acknowledgeAlert, refetch } =
    useAlerts();

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterSource, setFilterSource] = useState<AlertSource | "all">("all");
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | "all">(
    "all",
  );
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (filterStatus === "unread" && alert.is_read) return false;
      if (filterStatus === "unacknowledged" && alert.is_acknowledged)
        return false;
      if (filterSource !== "all" && alert.source !== filterSource) return false;
      if (filterSeverity !== "all" && alert.severity !== filterSeverity)
        return false;
      return true;
    });
  }, [alerts, filterStatus, filterSource, filterSeverity]);

  // Only unacknowledged alerts can be selected for bulk acknowledge
  const selectableAlerts = useMemo(() => {
    return filteredAlerts.filter((alert) => !alert.is_acknowledged);
  }, [filteredAlerts]);

  const handleSelectAll = () => {
    if (selectedAlerts.size === selectableAlerts.length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(selectableAlerts.map((a) => a.id)));
    }
  };

  const handleSelectAlert = (alertId: string) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId);
    } else {
      newSelected.add(alertId);
    }
    setSelectedAlerts(newSelected);
  };

  const handleBulkAcknowledge = async () => {
    const selectedIds = Array.from(selectedAlerts);
    if (selectedIds.length === 0) return;

    try {
      const res = await fetch("/api/alerts/acknowledge-multiple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_ids: selectedIds }),
      });

      if (res.ok) {
        await refetch();
        setSelectedAlerts(new Set());
      }
    } catch (error) {
      console.error("Error acknowledging alerts:", error);
    }
  };

  const handleAlertClick = async (alert: Alert) => {
    if (!alert.is_read) {
      await markAsRead(alert.id);
    }
    router.push(getAlertLink(alert));
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Notifications</h1>
        <p className={styles.loading}>Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Notifications</h1>
        {selectableAlerts.length > 0 && (
          <div className={styles.headerActions}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={
                  selectedAlerts.size === selectableAlerts.length &&
                  selectableAlerts.length > 0
                }
                onChange={handleSelectAll}
              />
              Select All
            </label>

            <button
              onClick={handleBulkAcknowledge}
              className={styles.acknowledgeButton}
              disabled={selectedAlerts.size === 0}
            >
              Acknowledge Selected ({selectedAlerts.size})
            </button>
          </div>
        )}
      </div>

      <div className={styles.filters}>
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={filterStatus}
          onChange={(v) => setFilterStatus(v as FilterStatus)}
        />
        <Select
          label="Source"
          options={SOURCE_OPTIONS}
          value={filterSource}
          onChange={(v) => setFilterSource(v as AlertSource | "all")}
        />
        <Select
          label="Severity"
          options={SEVERITY_OPTIONS}
          value={filterSeverity}
          onChange={(v) => setFilterSeverity(v as AlertSeverity | "all")}
        />
      </div>

      <div className={styles.alertsList}>
        {filteredAlerts.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No alerts match the current filters</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isSelected={selectedAlerts.has(alert.id)}
              onSelect={handleSelectAlert}
              onClick={handleAlertClick}
              onAcknowledge={acknowledgeAlert}
            />
          ))
        )}
      </div>
    </div>
  );
}
