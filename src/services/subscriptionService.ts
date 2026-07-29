import { Subscription } from "../type/subscription";
import { api } from "./api";

export const subscriptionService = {
    current: () => api.get<Subscription>('/subscription').then((r) => r.data),
};