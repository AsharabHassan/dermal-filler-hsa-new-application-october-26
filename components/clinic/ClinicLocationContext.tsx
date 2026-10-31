"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_CLINIC_LOCATION,
  getClinicLocation,
  type ClinicLocationKey,
} from "@/lib/constants";

// The route picks the starting clinic (/london, /glasgow; / starts on London
// without naming a city — `fromRoute` is false there), and the
// client can switch it before the scan with the clinic chooser. Everything that
// reads useClinicLocation() — copy, calendar, lead routing — follows the choice.
interface ClinicLocationState {
  location: ClinicLocationKey;
  /** True on /london and /glasgow; false on the shared home page. */
  fromRoute: boolean;
  setLocation: (location: ClinicLocationKey) => void;
}

const ClinicLocationContext = createContext<ClinicLocationState>({
  location: DEFAULT_CLINIC_LOCATION,
  fromRoute: false,
  setLocation: () => {},
});

export function ClinicLocationProvider({
  location,
  children,
}: {
  location?: ClinicLocationKey;
  children: ReactNode;
}) {
  const [current, setLocation] = useState<ClinicLocationKey>(
    location ?? DEFAULT_CLINIC_LOCATION,
  );
  return (
    <ClinicLocationContext.Provider
      value={{ location: current, fromRoute: location !== undefined, setLocation }}
    >
      {children}
    </ClinicLocationContext.Provider>
  );
}

export function useClinicLocation() {
  return getClinicLocation(useContext(ClinicLocationContext).location);
}

/** Whether the page itself names a city (/london, /glasgow). */
export function useClinicFromRoute() {
  return useContext(ClinicLocationContext).fromRoute;
}

export function useSetClinicLocation() {
  return useContext(ClinicLocationContext).setLocation;
}
