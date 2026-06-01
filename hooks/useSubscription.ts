import { useContext } from "react";
import { SubscriptionContext } from "../contexts/SubscriptionContext";

export function useSubscription() {
  return useContext(SubscriptionContext);
}
