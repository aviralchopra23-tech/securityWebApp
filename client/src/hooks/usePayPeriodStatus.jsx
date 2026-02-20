/// src/hooks/usePayPeriodStatus.js
import { useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import { calculateCurrentPayPeriod, getPrevPayPeriod } from "../api/payPeriodApi";

export default function usePayPeriodStatus() {
  const [prevUnsubmitted, setPrevUnsubmitted] = useState(false);
  const [currentSubmitted, setCurrentSubmitted] = useState(false);
  const [currentPayPeriod, setCurrentPayPeriod] = useState(null);
  const [prevPayPeriod, setPrevPayPeriod] = useState(null);
  const [activePayPeriod, setActivePayPeriod] = useState(null);
  const [activeIsPrevious, setActiveIsPrevious] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const checkStatus = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // ✅ correct backend endpoint
      const res = await api.get("/guards/status");

      const {
        prevUnsubmitted: backendPrevUnsubmitted,
        currentSubmitted: backendCurrentSubmitted,
        currentPayPeriod: backendCurrentPP,
        activePayPeriod: backendActivePP,
        activeIsPrevious: backendActiveIsPrevious,
      } = res.data;

      setPrevUnsubmitted(Boolean(backendPrevUnsubmitted));
      setCurrentSubmitted(Boolean(backendCurrentSubmitted));
      setActiveIsPrevious(Boolean(backendActiveIsPrevious));

      if (backendCurrentPP?.payPeriodStart && backendCurrentPP?.payPeriodEnd) {
        const cp = {
          payPeriodStart: new Date(backendCurrentPP.payPeriodStart),
          payPeriodEnd: new Date(backendCurrentPP.payPeriodEnd),
        };
        setCurrentPayPeriod(cp);
        // derive prev period for convenience
        setPrevPayPeriod(getPrevPayPeriod(cp));
      } else {
        // fallback just in case
        const { payPeriodStart, payPeriodEnd } = calculateCurrentPayPeriod();
        const cp = { payPeriodStart, payPeriodEnd };
        setCurrentPayPeriod(cp);
        setPrevPayPeriod(getPrevPayPeriod(cp));
      }

      if (backendActivePP?.payPeriodStart && backendActivePP?.payPeriodEnd) {
        setActivePayPeriod({
          payPeriodStart: new Date(backendActivePP.payPeriodStart),
          payPeriodEnd: new Date(backendActivePP.payPeriodEnd),
        });
      } else {
        setActivePayPeriod(null);
      }
    } catch (err) {
      console.error("Failed to fetch pay period status:", err);
      setError(
        err.response?.data?.message ||
          "Could not load pay period status. Try refreshing."
      );

      // fallback
      const { payPeriodStart, payPeriodEnd } = calculateCurrentPayPeriod();
      setCurrentPayPeriod({ payPeriodStart, payPeriodEnd });
      setPrevUnsubmitted(false);
      setCurrentSubmitted(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    prevUnsubmitted,
    currentSubmitted,
    currentPayPeriod,
    prevPayPeriod,
    activePayPeriod,
    activeIsPrevious,
    loading,
    error,
    refreshStatus: checkStatus,
  };
}

/**
 * Helper: move pay period forward/backward
 * direction = 1 -> next period, -1 -> previous period
 */
export const advancePayPeriod = (pp, direction = 1) => {
  if (!pp?.payPeriodStart || !pp?.payPeriodEnd) {
    return calculateCurrentPayPeriod(new Date());
  }

  const refDate =
    direction === 1 ? new Date(pp.payPeriodEnd) : new Date(pp.payPeriodStart);

  const targetDate = new Date(refDate.getTime() + direction * 1000);
  return calculateCurrentPayPeriod(targetDate);
};