import { subscriptionService } from "../services/subscriptionService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useCurrentSubscription() {
    return useQuery({ queryKey: ['subscription'], queryFn: subscriptionService.current });
}