import apiClient from "@/services/api-client";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type {
  ApiTask,
  ApiTaskListResult,
  CreateTaskPayload,
  ImportTasksResult,
  ListTasksParams,
} from "../types";

const TASKS = API_ENDPOINTS.TASKS;

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
