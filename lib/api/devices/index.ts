import { fetcher } from "../fetcher";

export const devices = {
  getAll: () => fetcher("/devices"),
  getById: (id: string) => fetcher(`/devices/${id}`),
};
