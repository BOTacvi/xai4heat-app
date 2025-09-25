import { fetcher } from "../fetcher";

export const scada = {
  getAll: () => fetcher("/scada_measurements"),
  getById: (id: string) => fetcher(`/scada_measurements/${id}`),
};
