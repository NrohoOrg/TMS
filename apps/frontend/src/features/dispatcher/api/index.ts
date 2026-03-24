import apiClient from "@/services/api-client";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type {
  ApiTask,
  ApiTaskListResult,
  CreateTaskPayload,
  ImportTasksResult,
  ListTasksParams,
  ApiDriver,
  CreateDriverPayload,
  UpdateDriverPayload,
  ApiAvailability,
  ListAvailabilityParams,
  UpsertAvailabilityPayload,
  ApiOptimizationJob,
  StartOptimizationPayload,
  ApiPlan,
  UpdateStopStatusPayload,
  GeocodeSearchParams,
  GeocodeResult,
} from "../types";

const TASKS = API_ENDPOINTS.TASKS;
const DRIVERS = API_ENDPOINTS.DRIVERS;
const AVAILABILITY = API_ENDPOINTS.AVAILABILITY;
const PLANNING = API_ENDPOINTS.PLANNING;
const GEOCODE = API_ENDPOINTS.GEOCODE;

// ── TASKS ───────────────────────────────────────────────────────────────

export async function listTasks(
  params?: ListTasksParams,
): Promise<ApiTaskListResult> {
  const { data } = await apiClient.get<ApiTaskListResult>(TASKS.LIST, {
    params,
  });
  return data;
}

export async function getTask(id: string): Promise<ApiTask> {
  const { data } = await apiClient.get<ApiTask>(TASKS.DETAIL(id));
  return data;
}

export async function createTask(payload: CreateTaskPayload): Promise<ApiTask> {
  const { data } = await apiClient.post<ApiTask>(TASKS.CREATE, payload);
  return data;
}

export async function updateTask(
  id: string,
  payload: Partial<CreateTaskPayload>,
): Promise<ApiTask> {
  const { data } = await apiClient.patch<ApiTask>(TASKS.UPDATE(id), payload);
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete(TASKS.DELETE(id));
}

export async function importTasks(file: File): Promise<ImportTasksResult> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<ImportTasksResult>(
    TASKS.IMPORT,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

// ── DRIVERS ─────────────────────────────────────────────────────────────

export async function listDrivers(): Promise<ApiDriver[]> {
  const { data } = await apiClient.get<ApiDriver[]>(DRIVERS.LIST);
  return data;
}

export async function createDriver(payload: CreateDriverPayload): Promise<ApiDriver> {
  const { data } = await apiClient.post<ApiDriver>(DRIVERS.CREATE, payload);
  return data;
}

export async function updateDriver(
  id: string,
  payload: UpdateDriverPayload,
): Promise<ApiDriver> {
  const { data } = await apiClient.patch<ApiDriver>(
    DRIVERS.UPDATE(id),
    payload,
  );
  return data;
}

export async function deleteDriver(id: string): Promise<void> {
  await apiClient.delete(DRIVERS.DELETE(id));
}

// ── AVAILABILITY ────────────────────────────────────────────────────────

export async function listAvailability(
  params?: ListAvailabilityParams,
): Promise<ApiAvailability[]> {
  const { data } = await apiClient.get<ApiAvailability[]>(
    AVAILABILITY.LIST,
    { params },
  );
  return data;
}

export async function upsertAvailability(
  driverId: string,
  payload: UpsertAvailabilityPayload,
): Promise<ApiAvailability> {
  const { data } = await apiClient.patch<ApiAvailability>(
    AVAILABILITY.UPDATE(driverId),
    payload,
  );
  return data;
}

// ── PLANNING / OPTIMIZATION ────────────────────────────────────────────

export async function startOptimization(
  payload: StartOptimizationPayload,
): Promise<ApiOptimizationJob> {
  const { data } = await apiClient.post<ApiOptimizationJob>(
    PLANNING.OPTIMIZE,
    payload,
  );
  return data;
}

export async function getOptimizationStatus(
  jobId: string,
): Promise<ApiOptimizationJob> {
  const { data } = await apiClient.get<ApiOptimizationJob>(
    PLANNING.STATUS(jobId),
  );
  return data;
}

export async function listPlans(): Promise<ApiPlan[]> {
  const { data } = await apiClient.get<ApiPlan[]>(PLANNING.PLANS);
  return data;
}

export async function getPlanDetail(planId: string): Promise<ApiPlan> {
  const { data } = await apiClient.get<ApiPlan>(
    PLANNING.PLAN_DETAIL(planId),
  );
  return data;
}

export async function publishPlan(
  planId: string,
): Promise<{ planId: string; notifiedDrivers: number }> {
  const { data } = await apiClient.post<{
    planId: string;
    notifiedDrivers: number;
  }>(PLANNING.PUBLISH(planId), {});
  return data;
}

export async function updateStopStatus(
  stopId: string,
  payload: UpdateStopStatusPayload,
): Promise<void> {
  await apiClient.patch(`/dispatcher/stops/${stopId}/status`, payload);
}

// ── GEOCODING ───────────────────────────────────────────────────────────

export async function geocodeSearch(
  params: GeocodeSearchParams,
): Promise<GeocodeResult[]> {
  const { data } = await apiClient.get<GeocodeResult[]>(GEOCODE.SEARCH, {
    params,
  });
  return data;
}

